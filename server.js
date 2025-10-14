/**
 * RAG Chatbot Server
 * Express server with Pinecone vector database and OpenAI integration
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Initialize Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Query cache for frequently asked questions (in-memory cache)
const queryCache = new Map();
const CACHE_MAX_SIZE = 1000; // Maximum number of cached queries
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes TTL

// Initialize Pinecone
let pinecone;
let index;
try {
  pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
  });
  index = pinecone.index(process.env.PINECONE_INDEX_NAME);
  console.log('✅ Pinecone initialized');
} catch (error) {
  console.error('❌ Pinecone initialization error:', error.message);
}

// Initialize OpenAI (for embeddings only)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
console.log('✅ OpenAI initialized (for embeddings)');

// Initialize Gemini
let genAI;
let geminiModel;
try {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  // Use the available Gemini 2.5 Flash model
  geminiModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite-preview-09-2025" });
  console.log('✅ Gemini initialized (for chat)');
} catch (error) {
  console.error('❌ Gemini initialization error:', error.message);
}

// Helper function: Chunk large text into smaller pieces
function chunkText(text, maxChunkSize = 6000) {
  // Rough estimate: 1 token ≈ 4 characters for English text
    const maxChars = maxChunkSize * 4;
  
  if (text.length <= maxChars) {
    return [text];
  }
  
  const chunks = [];
    const paragraphs = text.split(/\n\n+/);
  let currentChunk = '';
  
    for (const paragraph of paragraphs) {
    // If a single paragraph is too large, split by sentences
        if (paragraph.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      
            const sentences = paragraph.match(/[^.!?]+[.!?]+/g) || [paragraph];
            for (const sentence of sentences) {
                if ((currentChunk + sentence).length > maxChars) {
          if (currentChunk) {
            chunks.push(currentChunk.trim());
          }
                    currentChunk = sentence;
        } else {
          currentChunk += sentence;
        }
      }
    } else {
      // If adding this paragraph exceeds limit, save current chunk and start new one
            if ((currentChunk + '\n\n' + paragraph).length > maxChars) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }
    }
  }
  
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  
    return chunks.length > 0 ? chunks : [text];
}

// Helper function: Generate embeddings
async function generateEmbedding(text) {
    try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });
        return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error.message);
    throw error;
  }
}

// Helper function: Query Pinecone with optimizations
async function queryPinecone(embedding, options = {}) {
  try {
    const {
      topK = 5, // Default to 5 results
      namespace = '', // Support for namespace filtering
      filter = {}, // Metadata filtering
      minScore = 0.3 // Similarity threshold (0.3 is good for course data)
    } = options;

    const queryRequest = {
      vector: embedding,
      topK: topK,
      includeMetadata: true,
    };

    // Add metadata filter if specified (significantly reduces search space)
    if (filter && Object.keys(filter).length > 0) {
      queryRequest.filter = filter;
    }

    // Query with namespace support (Pinecone v2 API)
    let queryResponse;
    if (namespace) {
      console.log(`🔍 Querying namespace: "${namespace}"`);
      queryResponse = await index.namespace(namespace).query(queryRequest);
    } else {
      queryResponse = await index.query(queryRequest);
    }
    
    // Filter by similarity score threshold
    const matches = (queryResponse.matches || []).filter(match => match.score >= minScore);
    
    console.log(`🔍 Retrieved ${matches.length} matches (out of ${queryResponse.matches?.length || 0}) above threshold ${minScore}`);
    
    return matches;
  } catch (error) {
    console.error('Error querying Pinecone:', error.message);
    throw error;
  }
}

// Helper function: Get cached query result
function getCachedQuery(queryKey) {
    const cached = queryCache.get(queryKey);
  if (!cached) return null;
  
  // Check if cache entry is still valid
  if (Date.now() - cached.timestamp > CACHE_TTL) {
    queryCache.delete(queryKey);
        return null;
    }
  
    return cached.data;
}

// Helper function: Cache query result
function cacheQuery(queryKey, data) {
  // Implement LRU cache eviction
    if (queryCache.size >= CACHE_MAX_SIZE) {
    // Remove oldest entry
    const firstKey = queryCache.keys().next().value;
    queryCache.delete(firstKey);
  }
  
  queryCache.set(queryKey, {
    data,
    timestamp: Date.now()
  });
}

// Helper function: Extract metadata filters from query (with conversation history context)
function extractQueryMetadata(query, conversationHistory = []) {
  const metadata = {};
  const queryLower = query.toLowerCase();
  
  // Check conversation history for course context (BSc vs FD)
  let courseContext = '';
  for (let i = conversationHistory.length - 1; i >= 0; i--) {
    const msg = conversationHistory[i];
    const msgLower = (msg.content || '').toLowerCase();
    
    if (msgLower.includes('bsc') || msgLower.includes('bachelor') || msgLower.includes('honours') || msgLower.includes('hons')) {
      courseContext = 'BSc';
      break;
    } else if (msgLower.includes('fd') || msgLower.includes('foundation')) {
      courseContext = 'FD';
      break;
    }
  }
  
  // Check current query for course type (overrides history)
  if (queryLower.includes('bsc') || queryLower.includes('bachelor') || queryLower.includes('honours') || queryLower.includes('hons') || queryLower.includes('top-up') || queryLower.includes('top up')) {
    courseContext = 'BSc';
  } else if (queryLower.includes('fd') || queryLower.includes('foundation')) {
    courseContext = 'FD';
  }
  
  // Extract year information
  const yearMatch = queryLower.match(/year\s+(\d+)|(\d+)(?:st|nd|rd|th)\s+year/);
  if (yearMatch) {
    metadata.year = yearMatch[1] || yearMatch[2];
  }
  
  // IMPORTANT: If BSc is mentioned WITHOUT a specific year, default to Year 3
  // because BSc courses are Year 3 top-ups only
  if (courseContext === 'BSc' && !metadata.year) {
    metadata.year = '3';
    console.log(`🎓 BSc detected without year specified - defaulting to Year 3 (BSc top-up)`);
  }
  
  // Store course context for logging
  if (courseContext) {
    console.log(`🎓 Detected course context: ${courseContext}`);
    metadata._courseContext = courseContext;
  }
  
  return metadata;
}

// Helper function: Generate chat response using Gemini
async function generateChatResponse(query, context, conversationHistory = []) {
  try {
    const systemPrompt = `You are Oracle, a specialized AI assistant for University Centre Leeds. Your primary role is to answer student questions by strictly using the information provided in the <CONTEXT> section.

You must NOT use any external knowledge or make up information. Your purpose is to accurately present and guide students through the provided data. The data follows a hierarchy: Course -> Module -> Assessment.

### Persona & Tone
Friendly & Conversational: Your name is Oracle. Be helpful and approachable, not robotic.

Proactive Guide: Guide users step-by-step. Don't just answer; anticipate their next question.

Greeting Policy: Greet the user only on the first turn of a conversation. For all follow-up messages, get straight to the point.

Identity: You are Oracle, an assistant for University Centre Leeds students. Do not refer to yourself as a chatbot, AI, or language model.

### Core Logic: Handling Vague Queries
When a user's query (<QUERY>) is vague (e.g., "what's the deadline?", "who is my tutor?"), you must ask clarifying questions to narrow down their intent. Follow this process:

Acknowledge and Identify Ambiguity: Start with a helpful phrase like, "I can certainly help with that! To find the correct information for you..."

Check Conversation History for Context: Has the user already mentioned a specific course or module in a previous turn? If so, use that context.

Ask Hierarchical Clarifying Questions:

If Course is unknown: Ask for the course first.

Example: "Which course are you studying?"

If Course is known but Module is unknown: Ask for the module.

Example: "Great, for the FD Sport course, which module are you asking about?"

If Module is known but Assessment is unknown (and there are multiple): Ask for the specific assessment.

Example: "Okay, for the 'Anatomy and Physiology' module, are you asking about the presentation or the written exam?"

Exception for Single Items: If the context provides only one possible option (e.g., the user asks about an assessment in a module that only has one assessment), you can provide the answer directly and state your assumption.

Example: "The deadline for the only assessment in that module, the 'Practical Skills Observation', is..."

### Data Not Found Logic
If the <CONTEXT> does not contain information for the requested course, module, or assessment, state that you do not have information for that specific item yet.

Follow up by being helpful. Suggest similar items you do have information on, or state: "My information is always growing as more course data is added. Is there another course or module I can help you with?"

NEVER invent information.

### Critical Rules & Formatting
1. Course Structure (FD vs. BSc)
FD (Foundation Degree): Refers to Year 1 and Year 2 modules ONLY.

BSc (Bachelor of Science): Refers to the Year 3 top-up ONLY.

If a user asks about "FD modules," you MUST ask if they want Year 1 or Year 2.

If a user asks about "BSc modules," provide the Year 3 modules directly.

2. Responding to Query Types
General Course Info: Provide only the overall course description, duration, etc. from the context. DO NOT list modules. End by asking: "Would you like to know about the modules for this course?"

Module Info: Provide module names, codes, and descriptions for the specified year. Format as a clear list. DO NOT include credit information unless the student specifically asks for it (e.g., "how many credits", "what are the credits").

3. Academic Week & Date Calculation (CRITICAL)
When the <CONTEXT> specifies a deadline as "Academic Week X", you must calculate and display the real-world date.

Academic Year Start: Monday, 15/09/2025. This is the start of Week 1.

Exclusion Periods (do not count these weeks):

Christmas: 22/12/2025 to 05/01/2026

Reading Week 1: 27/10/2025 to 03/11/2025

Reading Week 2: 17/02/2026 to 21/02/2026

Easter: 07/04/2026 to 14/04/2026

Deadline Calculation: All deadlines are Friday at 12:00 PM (noon) of the calculated academic week.

Response Format: State the week number and the calculated date. DO NOT show your calculation steps.

Example:

Input from <CONTEXT>: Deadline: Academic Week 15

Your Output: The deadline is in Week 15, which is **Friday 31/01/2026 at 12:00 PM**.

4. Tutor & Staff Contact Information
When providing contact information, you must generate a clickable mailto link.

Email Format: firstname.lastname@ucleeds.ac.uk (all lowercase). Handle hyphens and multiple names correctly (e.g., mary-jane.wilson@ucleeds.ac.uk).

Link Format: [Name](mailto:email@address.com)

Retain Titles: Keep titles like "Dr." or "Professor" if they are present in the context.

Example:

Input from <CONTEXT>: Module Leader: Dr John Smith

Your Output: The Module Leader is [Dr. John Smith](mailto:john.smith@ucleeds.ac.uk).

### Safety & Constraints
You cannot help with writing assessments, provide answers to assignments, or engage in any activity that violates academic integrity.

You must operate within the bounds of university policy as described in the provided context.

Pay close attention to the conversation history to maintain context throughout the user's session.
${context}`;

    // Build the full prompt with conversation history
    let fullPrompt = systemPrompt + '\n\n**Conversation History:**\n';
    
    // Add previous messages for context (limit to last 10 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-10);
    if (recentHistory.length > 0) {
      recentHistory.forEach(msg => {
      fullPrompt += `\n${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`;
    });
    } else {
      fullPrompt += '\n(No previous messages)';
    }
    
    fullPrompt += `\n\n**Current User Question:** ${query}\n\nPlease provide a clear, well-formatted answer following the guidelines above and taking into account the conversation history.`;

    const result = await geminiModel.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Error generating chat response with Gemini:', error.message);
    throw error;
  }
}

// Routes

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check Pinecone connection
    let pineconeConnected = false;
    let indexStats = null;
    try {
      indexStats = await index.describeIndexStats();
      pineconeConnected = true;
    } catch (error) {
      console.error('Pinecone health check failed:', error.message);
    }

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      pineconeConnected,
      indexName: process.env.PINECONE_INDEX_NAME,
      indexStats: indexStats,
      cache: {
        size: queryCache.size,
        maxSize: CACHE_MAX_SIZE,
        ttl: CACHE_TTL
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Cache management endpoints
app.get('/api/cache/stats', (req, res) => {
  res.json({
    size: queryCache.size,
    maxSize: CACHE_MAX_SIZE,
    ttl: CACHE_TTL,
    keys: Array.from(queryCache.keys())
  });
});

app.post('/api/cache/clear', (req, res) => {
  const previousSize = queryCache.size;
  queryCache.clear();
  console.log(`🗑️  Cache cleared (${previousSize} entries removed)`);
  res.json({
    message: 'Cache cleared successfully',
    entriesCleared: previousSize
  });
});

// Chat endpoint with optimizations
app.post('/api/chat', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message, conversationHistory = [], namespace = '', useCache = true } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    console.log(`💬 Query: "${message}" (with ${conversationHistory.length} previous messages)`);

    // Generate a cache key based on the message and namespace
    const cacheKey = `${namespace}:${message.trim().toLowerCase()}`;
    
    // Check cache first (if enabled)
    if (useCache) {
      const cachedResult = getCachedQuery(cacheKey);
      if (cachedResult) {
        console.log(`⚡ Cache hit! Response time: ${Date.now() - startTime}ms`);
        return res.json({
          ...cachedResult,
          cached: true,
          responseTime: Date.now() - startTime
        });
      }
    }

    // 1. Extract metadata filters from query for faster search (with conversation context)
    const extractedMetadata = extractQueryMetadata(message, conversationHistory);
    const metadataFilter = Object.keys(extractedMetadata).length > 0 ? extractedMetadata : {};
    
    // Remove internal context tracking from filter (used for logging only)
    if (metadataFilter._courseContext) {
      delete metadataFilter._courseContext;
    }
    
    if (Object.keys(metadataFilter).length > 0) {
      console.log(`📊 Applying metadata filter:`, metadataFilter);
    }

    // 2. Generate embedding for the query (with course context if available)
    const embeddingStartTime = Date.now();
    let enhancedQuery = message;
    
    // Add course context to query for better semantic matching
    const courseContext = extractedMetadata._courseContext;
    if (courseContext && !message.toLowerCase().includes('bsc') && !message.toLowerCase().includes('foundation')) {
      // If BSc context, also add Year 3 for better matching
      if (courseContext === 'BSc') {
        enhancedQuery = `${courseContext} course Year 3: ${message}`;
      } else {
        enhancedQuery = `${courseContext} course: ${message}`;
      }
      console.log(`🎓 Enhanced query with course context: "${enhancedQuery}"`);
    } else if (message.toLowerCase().includes('bsc') && !message.toLowerCase().includes('year')) {
      // If BSc is mentioned but no year specified, add Year 3
      enhancedQuery = `BSc Year 3: ${message}`;
      console.log(`🎓 Enhanced query for BSc (Year 3): "${enhancedQuery}"`);
    }
    
    const queryEmbedding = await generateEmbedding(enhancedQuery);
    console.log(`🔢 Embedding generated in ${Date.now() - embeddingStartTime}ms`);

    // 3. Search Pinecone with optimizations
    const searchStartTime = Date.now();
    
    // Check if query is about assessments - if so, fetch more results
    const isAssessmentQuery = message.toLowerCase().match(/assessment|deadline|exam|coursework|submission|weighting|grade|due date/);
    const topKValue = isAssessmentQuery ? 15 : 10; // Increased from 5 to ensure we get assessment docs
    
    const matches = await queryPinecone(queryEmbedding, {
      topK: topKValue,
      namespace: namespace,
      filter: metadataFilter,
      minScore: 0.3 // Lower threshold for better recall (0.3-0.5 is good for course data)
    });
    console.log(`🔍 Pinecone search completed in ${Date.now() - searchStartTime}ms`);
    console.log(`📊 Namespace used: "${namespace}", Matches found: ${matches.length}, TopK: ${topKValue}${isAssessmentQuery ? ' (assessment query)' : ''}`);
    
    if (matches.length === 0) {
      // Try again with relaxed threshold if no results
      console.log(`⚠️  No matches found, retrying with lower threshold...`);
      const relaxedMatches = await queryPinecone(queryEmbedding, {
        topK: topKValue, // Use same topK as before
        namespace: namespace,
        filter: {}, // Remove metadata filters on retry
        minScore: 0.2 // Very low threshold for retry
      });
      
      if (relaxedMatches.length === 0) {
        // No matches found - generate a helpful response asking for clarification
        console.log(`❌ No matches found even with relaxed threshold`);
        console.log(`   Namespace: "${namespace}"`);
        console.log(`   Query: "${message}"`);
        
        // Generate helpful response even without context
        const helpfulResponse = await generateChatResponse(
          message, 
          "No specific information found. Available information includes: University Centre Leeds Sport courses for FD Sport Performance and Exercise (W_FD1099FR), including modules for Year 1 and Year 2, assessments, deadlines, tutors (Ruth Tolson, James Thwaite, Callum Lister, Matthew Mosalski), and academic calendar 2025-2026.",
          conversationHistory
        );
        
        return res.json({
          response: helpfulResponse,
          sources: [],
          responseTime: Date.now() - startTime,
          noMatches: true
        });
      }
      
      matches.push(...relaxedMatches);
    }

    // 3.5. If query mentions assessments/deadlines/weeks, also fetch academic calendar
    const needsCalendar = /assessment|deadline|due|week \d+|academic week|calendar|start date|end date|holiday|break/i.test(message);
    if (needsCalendar) {
      console.log(`📅 Query mentions dates/assessments - fetching academic calendar...`);
      
      // Search specifically for academic calendar
      const calendarEmbedding = await generateEmbedding("academic calendar 2025-2026 start date end date holidays breaks exclusion dates");
      const calendarMatches = await queryPinecone(calendarEmbedding, {
        topK: 2,
        namespace: namespace,
        filter: { type: 'academic_calendar' },
        minScore: 0.2
      });
      
      if (calendarMatches.length > 0) {
        console.log(`📅 Added ${calendarMatches.length} calendar documents to context`);
        // Add calendar matches at the beginning so AI sees them first
        matches.unshift(...calendarMatches);
      }
    }

    // 3.6. If query specifically asks for assessments, do a secondary search for assessment documents
    if (isAssessmentQuery) {
      console.log(`📝 Assessment query detected - performing secondary search for assessment documents...`);
      
      // Create an enhanced assessment-specific query
      const assessmentSearchQuery = `${enhancedQuery} assessment exam coursework submission deadline weighting`;
      const assessmentEmbedding = await generateEmbedding(assessmentSearchQuery);
      
      const assessmentMatches = await queryPinecone(assessmentEmbedding, {
        topK: 10,
        namespace: namespace,
        filter: { type: 'assessment' }, // Filter specifically for assessment type
        minScore: 0.25 // Slightly lower threshold for assessments
      });
      
      if (assessmentMatches.length > 0) {
        console.log(`📝 Found ${assessmentMatches.length} additional assessment documents`);
        
        // Add assessment matches, avoiding duplicates
        const existingIds = new Set(matches.map(m => m.id));
        const newAssessments = assessmentMatches.filter(a => !existingIds.has(a.id));
        
        if (newAssessments.length > 0) {
          console.log(`📝 Adding ${newAssessments.length} new assessment documents to context`);
          // Add assessments near the beginning (after calendar if present)
          matches.splice(needsCalendar ? 1 : 0, 0, ...newAssessments);
        }
      }
    }

    // 4. Prepare context from matches
    const context = matches
      .map((match, idx) => `[${idx + 1}] ${match.metadata?.text || ''}`)
      .join('\n\n');

    // 5. Generate response using Gemini with conversation history
    const llmStartTime = Date.now();
    const aiResponse = await generateChatResponse(message, context, conversationHistory);
    console.log(`🤖 LLM response generated in ${Date.now() - llmStartTime}ms`);

    // 6. Format sources
    const sources = matches.map((match, idx) => ({
      id: idx + 1,
      score: match.score,
      text: match.metadata?.text || '',
      metadata: match.metadata || {}
    }));

    const responseTime = Date.now() - startTime;
    console.log(`✅ Total response time: ${responseTime}ms`);

    const result = {
      response: aiResponse,
      sources,
      responseTime,
      cached: false
    };

    // Cache the result (without conversation history to keep cache key simple)
    if (useCache) {
      cacheQuery(cacheKey, result);
    }

    res.json(result);

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to process chat message',
      details: error.message
    });
  }
});

// Upload documents endpoint with namespace support
app.post('/api/upload', async (req, res) => {
  try {
    const { documents, namespace = '' } = req.body;

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({ error: 'Documents array is required' });
    }

    console.log(`📤 Uploading ${documents.length} documents${namespace ? ` to namespace "${namespace}"` : ''}...`);

    // Process each document
    const vectors = [];
    let totalChunks = 0;
    
    for (const doc of documents) {
      if (!doc.text) {
        console.warn(`⚠️  Skipping document ${doc.id}: missing text`);
        continue;
      }

      // Chunk the document if it's too large
      const chunks = chunkText(doc.text);
      
      if (chunks.length > 1) {
        console.log(`📄 Document "${doc.id}" split into ${chunks.length} chunks`);
      }

      // Generate embeddings for each chunk
      for (let i = 0; i < chunks.length; i++) {
        const chunkText = chunks[i];
        const embedding = await generateEmbedding(chunkText);

        const baseId = doc.id || `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const chunkId = chunks.length > 1 ? `${baseId}-chunk-${i + 1}` : baseId;

        // Prepare vector for upsert with enhanced metadata
        vectors.push({
          id: chunkId,
          values: embedding,
          metadata: {
            text: chunkText,
            originalDocId: doc.id,
            chunkIndex: i + 1,
            totalChunks: chunks.length,
            namespace: namespace, // Store namespace in metadata for reference
            uploadTimestamp: Date.now(),
            ...doc.metadata
          }
        });
        
        totalChunks++;
      }
    }

    // Upsert to Pinecone with namespace
    if (vectors.length > 0) {
      const upsertOptions = { vectors };
      if (namespace) {
        // Upsert to specific namespace
        await index.namespace(namespace).upsert(vectors);
      } else {
        // Upsert to default namespace
        await index.upsert(vectors);
      }
      
      const message = totalChunks > documents.length 
        ? `✅ Successfully uploaded ${documents.length} documents (${totalChunks} chunks)${namespace ? ` to namespace "${namespace}"` : ''}`
        : `✅ Successfully uploaded ${vectors.length} documents${namespace ? ` to namespace "${namespace}"` : ''}`;
      console.log(message);
      
      // Clear cache when new documents are uploaded
      queryCache.clear();
      console.log(`🗑️  Cache cleared after upload`);
      
      res.json({
        message: message,
        documentsCount: documents.length,
        chunksCount: totalChunks,
        namespace: namespace
      });
    } else {
      res.status(400).json({ error: 'No valid documents to upload' });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Failed to upload documents',
      details: error.message
    });
  }
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🎓 UC Oracle - Intelligent Course Assistant');
  console.log('='.repeat(60));
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🔌 Pinecone Index: ${process.env.PINECONE_INDEX_NAME}`);
  console.log(`🤖 Chat Model: Gemini 2.5 Flash Lite Preview`);
  console.log(`📊 Embedding Model: OpenAI text-embedding-3-small`);
  console.log('='.repeat(60) + '\n');
  console.log('💡 Oracle is ready! Open http://localhost:3000 in your browser\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

