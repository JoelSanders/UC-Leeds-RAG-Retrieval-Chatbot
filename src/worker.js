/**
 * UC Oracle Chatbot - Cloudflare Worker
 * 
 * Simplified worker that handles API routes and serves static files.
 */

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
  
  // Add system prompt as first user message
  contents.push({
    role: 'user',
    parts: [{ text: systemPrompt }]
  });
  
  contents.push({
    role: 'model', 
    parts: [{ text: 'I understand. I am Oracle, the UC Leeds assistant. I will only use the provided context to answer questions.' }]
  });

  // Add conversation history
  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.slice(-6).forEach(msg => {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      });
    });
  }

  // Add current query
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

// Handle OPTIONS (CORS preflight)
function handleOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// JSON response helper
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
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
      // API Routes
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

        // Check required env vars
        if (!env.OPENAI_API_KEY || !env.PINECONE_API_KEY || !env.PINECONE_HOST || !env.GEMINI_API_KEY) {
          return jsonResponse({ 
            error: 'Server configuration error', 
            details: 'Missing required API keys. Please set OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_HOST, and GEMINI_API_KEY secrets.' 
          }, 500);
        }

        // Check cache
        const cacheKey = `${namespace}:${message.trim().toLowerCase()}`;
        if (useCache && queryCache.has(cacheKey)) {
          const cached = queryCache.get(cacheKey);
          if (Date.now() - cached.timestamp < CACHE_TTL) {
            return jsonResponse({
              ...cached.data,
              cached: true,
              responseTime: Date.now() - startTime,
            });
          }
          queryCache.delete(cacheKey);
        }

        // Generate embedding
        const embedding = await generateEmbedding(message, env);

        // Query Pinecone
        const matches = await queryPinecone(embedding, {
          topK: 15,
          namespace,
          minScore: 0.3,
        }, env);

        // Build context
        const context = matches.length > 0
          ? `<CONTEXT>\n${matches.map((m, i) => 
              `[Match ${i + 1}] (Score: ${(m.score * 100).toFixed(1)}%)\n${m.metadata?.text || ''}`
            ).join('\n\n---\n\n')}\n</CONTEXT>`
          : '<CONTEXT>No relevant information found in the knowledge base.</CONTEXT>';

        // Generate response
        const aiResponse = await generateChatResponse(message, context, conversationHistory, env);

        // Format sources
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

        // Cache result
        if (useCache && queryCache.size < CACHE_MAX_SIZE) {
          queryCache.set(cacheKey, { data: result, timestamp: Date.now() });
        }

        return jsonResponse(result);
      }

      if (path === '/api/cache/stats') {
        return jsonResponse({
          size: queryCache.size,
          maxSize: CACHE_MAX_SIZE,
          ttl: CACHE_TTL,
        });
      }

      if (path === '/api/cache/clear' && request.method === 'POST') {
        const previousSize = queryCache.size;
        queryCache.clear();
        return jsonResponse({ message: 'Cache cleared', entriesCleared: previousSize });
      }

      // Serve static files from __STATIC_CONTENT
      if (env.__STATIC_CONTENT) {
        // Determine the file to serve
        let filePath = path === '/' ? 'index.html' : path.slice(1);
        
        try {
          const asset = await env.__STATIC_CONTENT.get(filePath);
          if (asset) {
            // Determine content type
            const ext = filePath.split('.').pop();
            const contentTypes = {
              'html': 'text/html',
              'css': 'text/css',
              'js': 'application/javascript',
              'json': 'application/json',
              'png': 'image/png',
              'jpg': 'image/jpeg',
              'jpeg': 'image/jpeg',
              'svg': 'image/svg+xml',
              'ico': 'image/x-icon',
            };
            
            return new Response(asset, {
              headers: {
                'Content-Type': contentTypes[ext] || 'text/plain',
                'Cache-Control': 'public, max-age=3600',
              },
            });
          }
        } catch (e) {
          // File not found, fall through to 404
        }
        
        // Try index.html for SPA routing
        try {
          const indexHtml = await env.__STATIC_CONTENT.get('index.html');
          if (indexHtml) {
            return new Response(indexHtml, {
              headers: { 'Content-Type': 'text/html' },
            });
          }
        } catch (e) {
          // index.html not found
        }
      }

      // 404 for unmatched routes
      return jsonResponse({ error: 'Not found', path }, 404);

    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack,
      }, 500);
    }
  },
};
