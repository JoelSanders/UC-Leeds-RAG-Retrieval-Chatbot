/**
 * UC Oracle Chatbot - Cloudflare Worker
 * 
 * Handles API routes and serves static files from the public folder.
 */

import { getAssetFromKV } from '@cloudflare/kv-asset-handler';
import manifestJSON from '__STATIC_CONTENT_MANIFEST';

const assetManifest = JSON.parse(manifestJSON);

// In-memory cache
const queryCache = new Map();
const CACHE_MAX_SIZE = 50;
const CACHE_TTL = 1000 * 60 * 15; // 15 minutes

// Helper: Generate embedding using OpenAI
async function generateEmbedding(text, env) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Helper: Query Pinecone
async function queryPinecone(embedding, options, env) {
  const { topK = 10, namespace = '', filter = {}, minScore = 0.3 } = options;
  
  const body = {
    vector: embedding,
    topK,
    includeMetadata: true,
    includeValues: false,
  };

  if (namespace) body.namespace = namespace;
  if (Object.keys(filter).length > 0) body.filter = filter;

  const response = await fetch(`https://${env.PINECONE_HOST}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.PINECONE_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinecone API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return (data.matches || []).filter(match => match.score >= minScore);
}

// Helper: Generate chat response using Gemini
async function generateChatResponse(query, context, conversationHistory, env) {
  const systemPrompt = `You are Oracle, a specialized AI assistant for University Centre Leeds. Your primary role is to answer student questions by strictly using the information provided in the <CONTEXT> section.

You must NOT use any external knowledge or make up information. Your purpose is to accurately present and guide students through the provided data.

### DATA HIERARCHY
The data follows a strict hierarchy: COURSE → MODULE → ASSESSMENT
- Assessments link to Modules via module_code
- Modules link to Courses via course_code

### Persona & Tone
- Friendly & Conversational: Your name is Oracle. Be helpful and approachable.
- Proactive Guide: Guide users step-by-step.
- If information is not in context, say so and offer to help with something else.

${context}`;

  const contents = [];
  
  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt }]
  });
  
  contents.push({
    role: 'model', 
    parts: [{ text: 'I understand. I am Oracle, the UC Leeds assistant. I will only use the provided context to answer questions.' }]
  });

  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.slice(-6).forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: query }],
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response.';
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function handleOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return handleOptions();
    }

    try {
      // ============ API Routes ============
      
      if (path === '/api/health') {
        return jsonResponse({
          status: 'ok',
          timestamp: new Date().toISOString(),
          platform: 'cloudflare-workers',
          cache: { size: queryCache.size, maxSize: CACHE_MAX_SIZE },
        });
      }

      if (path === '/api/chat' && request.method === 'POST') {
        const startTime = Date.now();
        const body = await request.json();
        const { message, conversationHistory = [], namespace = 'ucl-courses', useCache = true } = body;

        if (!message) {
          return jsonResponse({ error: 'Message is required' }, 400);
        }

        if (!env.OPENAI_API_KEY || !env.PINECONE_API_KEY || !env.PINECONE_HOST || !env.GEMINI_API_KEY) {
          return jsonResponse({ 
            error: 'Server configuration error', 
            details: 'Missing required API keys.' 
          }, 500);
        }

        const cacheKey = `${namespace}:${message.trim().toLowerCase()}`;
        if (useCache && queryCache.has(cacheKey)) {
          const cached = queryCache.get(cacheKey);
          if (Date.now() - cached.timestamp < CACHE_TTL) {
            return jsonResponse({ ...cached.data, cached: true, responseTime: Date.now() - startTime });
          }
          queryCache.delete(cacheKey);
        }

        // Parallel: Generate embedding while preparing cache key
        const embeddingPromise = generateEmbedding(message, env);
        
        const embedding = await embeddingPromise;
        // Reduced topK for faster queries (was 15)
        const matches = await queryPinecone(embedding, { topK: 8, namespace, minScore: 0.35 }, env);

        const context = matches.length > 0
          ? `<CONTEXT>\n${matches.map((m, i) => 
              `[Match ${i + 1}] (Score: ${(m.score * 100).toFixed(1)}%)\n${m.metadata?.text || ''}`
            ).join('\n\n---\n\n')}\n</CONTEXT>`
          : '<CONTEXT>No relevant information found.</CONTEXT>';

        const aiResponse = await generateChatResponse(message, context, conversationHistory, env);

        const sources = matches.slice(0, 5).map((match, idx) => ({
          id: idx + 1,
          score: match.score,
          text: (match.metadata?.text || '').substring(0, 300) + '...',
          metadata: {
            type: match.metadata?.type,
            module_title: match.metadata?.module_title,
            course_title: match.metadata?.course_title,
            year: match.metadata?.year,
            semester: match.metadata?.semester,
          },
        }));

        const result = {
          response: aiResponse,
          sources,
          suggestions: [],
          responseTime: Date.now() - startTime,
          cached: false,
        };

        if (useCache && queryCache.size < CACHE_MAX_SIZE) {
          queryCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }

        return jsonResponse(result);
      }

      if (path === '/api/cache/stats') {
        return jsonResponse({ size: queryCache.size, maxSize: CACHE_MAX_SIZE, ttl: CACHE_TTL });
      }

      if (path === '/api/cache/clear' && request.method === 'POST') {
        const previousSize = queryCache.size;
        queryCache.clear();
        return jsonResponse({ message: 'Cache cleared', entriesCleared: previousSize });
      }

      // ============ Static Assets ============
      
      try {
        return await getAssetFromKV(
          { request, waitUntil: ctx.waitUntil.bind(ctx) },
          {
            ASSET_NAMESPACE: env.__STATIC_CONTENT,
            ASSET_MANIFEST: assetManifest,
            mapRequestToAsset: (req) => {
              const url = new URL(req.url);
              // Serve index.html for root path
              if (url.pathname === '/' || url.pathname === '') {
                url.pathname = '/index.html';
              }
              return new Request(url.toString(), req);
            },
          }
        );
      } catch (e) {
        // If asset not found, try serving index.html (SPA fallback)
        try {
          const notFoundRequest = new Request(new URL('/index.html', request.url).toString(), request);
          return await getAssetFromKV(
            { request: notFoundRequest, waitUntil: ctx.waitUntil.bind(ctx) },
            {
              ASSET_NAMESPACE: env.__STATIC_CONTENT,
              ASSET_MANIFEST: assetManifest,
            }
          );
        } catch (e2) {
          return jsonResponse({ error: 'Not found', path, details: e.message }, 404);
        }
      }

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({
        error: 'Internal server error',
        message: error.message,
      }, 500);
    }
  },
};
