/**
 * UC Oracle Chatbot - Cloudflare Worker
 * 
 * This is the Cloudflare Workers version of the RAG Chatbot.
 * Uses Hono for routing and native fetch for API calls.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/cloudflare-workers';

const app = new Hono();

// Enable CORS
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// In-memory cache (Note: Workers have limited memory, consider KV for production)
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
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

// Helper: Query Pinecone
async function queryPinecone(embedding, options, env) {
  const { topK = 10, namespace = '', filter = {}, minScore = 0.3 } = options;
  
  const indexHost = env.PINECONE_HOST || `${env.PINECONE_INDEX_NAME}-${env.PINECONE_PROJECT_ID}.svc.${env.PINECONE_ENVIRONMENT}.pinecone.io`;
  
  const body = {
    vector: embedding,
    topK,
    includeMetadata: true,
    includeValues: false,
  };

  if (namespace) body.namespace = namespace;
  if (Object.keys(filter).length > 0) body.filter = filter;

  const response = await fetch(`https://${indexHost}/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Api-Key': env.PINECONE_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Pinecone API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.matches || []).filter(match => match.score >= minScore);
}

// Helper: Generate chat response using Gemini
async function generateChatResponse(query, context, conversationHistory, env) {
  const systemPrompt = `You are Oracle, a specialized AI assistant for University Centre Leeds. Your primary role is to answer student questions by strictly using the information provided in the <CONTEXT> section.

You must NOT use any external knowledge or make up information. Your purpose is to accurately present and guide students through the provided data.

### DATA HIERARCHY (CRITICAL)
The data follows a strict hierarchy linked by IDs:
- COURSE (course_code) → MODULE (linked by course_code) → ASSESSMENT (linked by module_code)

### Persona & Tone
- Friendly & Conversational: Your name is Oracle. Be helpful and approachable.
- Proactive Guide: Guide users step-by-step.
- Greeting Policy: Greet only on first turn.

### When Data Not Found
If the context doesn't have information, ask clarifying questions or suggest what you can help with.

${context}`;

  const messages = [
    { role: 'user', parts: [{ text: systemPrompt }] },
  ];

  // Add conversation history
  conversationHistory.slice(-6).forEach(msg => {
    messages.push({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    });
  });

  // Add current query
  messages.push({
    role: 'user',
    parts: [{ text: `<QUERY>${query}</QUERY>` }],
  });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${env.GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'I apologize, but I could not generate a response.';
}

// Health check endpoint
app.get('/api/health', async (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    platform: 'cloudflare-workers',
    cache: {
      size: queryCache.size,
      maxSize: CACHE_MAX_SIZE,
    },
  });
});

// Chat endpoint
app.post('/api/chat', async (c) => {
  const startTime = Date.now();
  const env = c.env;

  try {
    const { message, conversationHistory = [], namespace = 'ucl-courses', useCache = true } = await c.req.json();

    if (!message) {
      return c.json({ error: 'Message is required' }, 400);
    }

    // Check cache
    const cacheKey = `${namespace}:${message.trim().toLowerCase()}`;
    if (useCache && queryCache.has(cacheKey)) {
      const cached = queryCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return c.json({
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
          `[${i + 1}] ${m.metadata?.text || ''}`
        ).join('\n\n')}\n</CONTEXT>`
      : '<CONTEXT>No relevant information found.</CONTEXT>';

    // Generate response
    const aiResponse = await generateChatResponse(message, context, conversationHistory, env);

    // Format sources
    const sources = matches.map((match, idx) => ({
      id: idx + 1,
      score: match.score,
      text: match.metadata?.text?.substring(0, 200) + '...',
      metadata: match.metadata || {},
    }));

    const result = {
      response: aiResponse,
      sources,
      suggestions: [], // Simplified for Workers
      responseTime: Date.now() - startTime,
      cached: false,
    };

    // Cache result
    if (useCache && queryCache.size < CACHE_MAX_SIZE) {
      queryCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });
    }

    return c.json(result);

  } catch (error) {
    console.error('Chat error:', error);
    return c.json({
      error: 'An error occurred processing your request',
      details: error.message,
    }, 500);
  }
});

// Cache management
app.get('/api/cache/stats', (c) => {
  return c.json({
    size: queryCache.size,
    maxSize: CACHE_MAX_SIZE,
    ttl: CACHE_TTL,
  });
});

app.post('/api/cache/clear', (c) => {
  const previousSize = queryCache.size;
  queryCache.clear();
  return c.json({
    message: 'Cache cleared',
    entriesCleared: previousSize,
  });
});

// Serve static files
app.get('/*', serveStatic({ root: './' }));

export default app;

