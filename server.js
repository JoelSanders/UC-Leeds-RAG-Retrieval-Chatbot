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

// Helper function: Normalize module codes (remove brackets and extra characters)
function normalizeModuleCode(code) {
  if (!code) return code;
  // Remove brackets and trim whitespace
  return code.replace(/[\[\]]/g, '').trim();
}

// Helper function: Fetch hierarchically related items from Pinecone
// Hierarchy: Course (course_code) -> Module (linked by course_code) -> Assessment (linked by module_code)
async function fetchHierarchicalRelatedItems(matches, query, namespace = '') {
  const relatedItems = [];
  const fetchedIds = new Set(matches.map(m => m.id));
  const queryLower = query.toLowerCase();
  
  // Detect what the user is asking about - be more inclusive
  const wantsAssessments = /assessment|deadline|due|submit|exam|coursework|essay|presentation|weight|assignment|task|brief/i.test(query);
  const wantsModules = /module|unit|subject|what modules|list modules|course content/i.test(query);
  const mentionsModule = matches.some(m => m.metadata?.type === 'module');
  
  // ALWAYS fetch assessments if we found a module (even if not explicitly asked)
  const shouldFetchAssessments = wantsAssessments || mentionsModule;
  
  console.log(`🔗 Checking hierarchy - wantsAssessments: ${wantsAssessments}, wantsModules: ${wantsModules}, mentionsModule: ${mentionsModule}`);
  
  // Extract course_codes and module_codes from current matches
  const courseCodes = new Set();
  const moduleCodes = new Set();
  const normalizedModuleCodes = new Set(); // Track both original and normalized
  
  matches.forEach(match => {
    const metadata = match.metadata || {};
    
    // Collect course codes
    if (metadata.course_code) {
      courseCodes.add(metadata.course_code);
    }
    
    // Collect module codes - normalize to handle bracket variations
    if (metadata.module_code) {
      const original = metadata.module_code;
      const normalized = normalizeModuleCode(original);
      moduleCodes.add(original);
      normalizedModuleCodes.add(normalized);
      if (original !== normalized) {
        moduleCodes.add(normalized); // Also try normalized version
      }
    }
  });
  
  console.log(`🔗 Found course_codes: [${Array.from(courseCodes).join(', ')}]`);
  console.log(`🔗 Found module_codes: [${Array.from(moduleCodes).join(', ')}]`);
  
  // If we should fetch assessments and we have module codes, fetch all assessments for those modules
  if (shouldFetchAssessments && moduleCodes.size > 0) {
    console.log(`📝 Fetching assessments for ${moduleCodes.size} module(s)...`);
    
    for (const moduleCode of moduleCodes) {
      try {
        // Try multiple search strategies to find assessments
        
        // Strategy 1: Direct filter by module_code
        const assessmentEmbedding = await generateEmbedding(`assessments deadlines for module ${moduleCode}`);
        let assessmentMatches = await queryPinecone(assessmentEmbedding, {
          topK: 15,
          namespace: namespace,
          filter: { 
            type: 'assessment',
            module_code: moduleCode 
          },
          minScore: 0.15
        });
        
        // Strategy 2: If no results, try with normalized code
        if (assessmentMatches.length === 0) {
          const normalizedCode = normalizeModuleCode(moduleCode);
          if (normalizedCode !== moduleCode) {
            assessmentMatches = await queryPinecone(assessmentEmbedding, {
              topK: 15,
              namespace: namespace,
              filter: { 
                type: 'assessment',
                module_code: normalizedCode 
              },
              minScore: 0.15
            });
          }
        }
        
        // Strategy 3: If still no results, try broader search with just type filter
        if (assessmentMatches.length === 0) {
          const broadMatches = await queryPinecone(assessmentEmbedding, {
            topK: 20,
            namespace: namespace,
            filter: { type: 'assessment' },
            minScore: 0.3
          });
          
          // Filter manually for module code matches (handles bracket variations)
          const normalizedTarget = normalizeModuleCode(moduleCode);
          assessmentMatches = broadMatches.filter(m => {
            const matchCode = normalizeModuleCode(m.metadata?.module_code);
            return matchCode === normalizedTarget;
          });
        }
        
        // Add non-duplicate matches
        assessmentMatches.forEach(match => {
          if (!fetchedIds.has(match.id)) {
            fetchedIds.add(match.id);
            match._hierarchySource = `assessment for module ${moduleCode}`;
            relatedItems.push(match);
          }
        });
        
        console.log(`   📝 Module ${moduleCode}: found ${assessmentMatches.length} assessments`);
      } catch (error) {
        console.error(`   ❌ Error fetching assessments for ${moduleCode}:`, error.message);
      }
    }
  }
  
  // If user wants modules and we have course codes, fetch all modules for those courses
  if (wantsModules && courseCodes.size > 0) {
    console.log(`📚 Fetching modules for ${courseCodes.size} course(s)...`);
    
    for (const courseCode of courseCodes) {
      try {
        // Query Pinecone with filter for modules matching this course_code
        const moduleEmbedding = await generateEmbedding(`modules for course ${courseCode}`);
        const moduleMatches = await queryPinecone(moduleEmbedding, {
          topK: 20, // Courses can have many modules
          namespace: namespace,
          filter: { 
            type: 'module',
            course_code: courseCode 
          },
          minScore: 0.15
        });
        
        // Add non-duplicate matches
        moduleMatches.forEach(match => {
          if (!fetchedIds.has(match.id)) {
            fetchedIds.add(match.id);
            match._hierarchySource = `module in course ${courseCode}`;
            relatedItems.push(match);
          }
        });
        
        console.log(`   📚 Course ${courseCode}: found ${moduleMatches.length} modules`);
      } catch (error) {
        console.error(`   ❌ Error fetching modules for ${courseCode}:`, error.message);
      }
    }
  }
  
  // If we found a module, also check if there's a related course to add context
  if (courseCodes.size > 0) {
    for (const courseCode of courseCodes) {
      // Check if we already have the course overview
      const hasCourseOverview = matches.some(m => 
        m.metadata?.type === 'course_overview' && m.metadata?.course_code === courseCode
      );
      
      if (!hasCourseOverview) {
        try {
          const courseEmbedding = await generateEmbedding(`course overview ${courseCode}`);
          const courseMatches = await queryPinecone(courseEmbedding, {
            topK: 1,
            namespace: namespace,
            filter: { 
              type: 'course_overview',
              course_code: courseCode 
            },
            minScore: 0.2
          });
          
          courseMatches.forEach(match => {
            if (!fetchedIds.has(match.id)) {
              fetchedIds.add(match.id);
              match._hierarchySource = `parent course for ${courseCode}`;
              relatedItems.push(match);
            }
          });
        } catch (error) {
          console.error(`   ❌ Error fetching course overview:`, error.message);
        }
      }
    }
  }
  
  console.log(`🔗 Hierarchy search complete: found ${relatedItems.length} additional related items`);
  return relatedItems;
}

// Helper function: Extract structured suggestions from matches for UI tiles
// IMPROVED: Only show suggestions AFTER user has provided enough context
function extractSuggestionsFromMatches(matches, matchAnalysis, query, conversationHistory = []) {
  const queryLower = query.toLowerCase();
  
  // Extract context from conversation history AND current query
  const conversationContext = extractConversationContext(conversationHistory, query);
  
  // Check if user has provided enough context to show suggestions
  // Suggestions should ONLY appear after a course, module, or assessment is identified
  const hasEnoughContext = (
    conversationContext.hasSpecificCourse ||
    conversationContext.hasSpecificModule ||
    conversationContext.hasSpecificAssessment ||
    conversationContext.hasSpecificYear
  );
  
  // If not enough context, don't show suggestions - let AI ask clarifying questions first
  if (!hasEnoughContext) {
    console.log(`📊 Suggestions suppressed: Not enough context yet (need course/module/assessment/year)`);
    return [];
  }
  
  // Only show suggestions when there's genuine ambiguity AND we have context
  if (!matchAnalysis.hasSuggestions) {
    return []; // No ambiguity = no suggestions needed
  }
  
  // Detect what type of information the user is asking about
  const queryContext = {
    wantsDeadline: /deadline|due|submit|when|date/i.test(query),
    wantsAssessment: /assessment|essay|exam|coursework|assignment|portfolio|presentation|report|task/i.test(query),
    wantsModule: /module|unit|subject|course content|learning|teach/i.test(query),
    wantsCourse: /course|programme|program|degree|qualification/i.test(query),
    wantsTutor: /tutor|teacher|lecturer|who teaches|contact/i.test(query),
    wantsCredits: /credit|points|weighting/i.test(query),
    // Context from conversation
    knownCourse: conversationContext.course,
    knownModule: conversationContext.module,
    knownYear: conversationContext.year
  };
  
  // Get unique items from the ambiguous matches, prioritizing by hierarchy relevance
  const seenTitles = new Set();
  const candidateSuggestions = [];
  
  matchAnalysis.suggestions.forEach(suggestionGroup => {
    suggestionGroup.items.forEach(item => {
      const metadata = item.metadata || {};
      const type = metadata.type;
      
      // Create a unique key to avoid duplicates
      const uniqueKey = `${type}-${metadata.module_title || metadata.course_title || metadata.assessment_type}`;
      
      if (seenTitles.has(uniqueKey)) return;
      seenTitles.add(uniqueKey);
      
      // Filter by context - only show relevant suggestions based on what we know
      let isRelevant = true;
      let relevanceScore = 0;
      
      // If we know the course from conversation, prioritize matching course
      if (queryContext.knownCourse && metadata.course_code) {
        if (metadata.course_code.toLowerCase().includes(queryContext.knownCourse.toLowerCase())) {
          relevanceScore += 0.3;
        } else {
          isRelevant = false; // Filter out non-matching courses
        }
      }
      
      // If we know the year from conversation, prioritize matching year
      if (queryContext.knownYear && metadata.year) {
        if (metadata.year === queryContext.knownYear) {
          relevanceScore += 0.2;
        } else {
          isRelevant = false; // Filter out non-matching years
        }
      }
      
      // If we know the module from conversation, prioritize matching module
      if (queryContext.knownModule && metadata.module_title) {
        if (metadata.module_title.toLowerCase().includes(queryContext.knownModule.toLowerCase())) {
          relevanceScore += 0.3;
        }
      }
      
      if (!isRelevant) return;
      
      // Prioritize based on what user is asking
      let priority = item.score + relevanceScore;
      
      if (queryContext.wantsAssessment && type === 'assessment') priority += 0.3;
      if (queryContext.wantsModule && type === 'module') priority += 0.3;
      if (queryContext.wantsCourse && type === 'course_overview') priority += 0.3;
      if (queryContext.wantsDeadline && type === 'assessment') priority += 0.2;
      
      const suggestionData = buildSuggestionFromMatch(item, queryContext);
      if (suggestionData) {
        suggestionData.priority = priority;
        candidateSuggestions.push(suggestionData);
      }
    });
  });
  
  // Sort by priority and limit to TOP 3 only
  console.log(`📊 Generating ${Math.min(candidateSuggestions.length, 3)} suggestions (context: course=${conversationContext.course || 'none'}, module=${conversationContext.module || 'none'}, year=${conversationContext.year || 'none'})`);
  
  return candidateSuggestions
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
}

// Extract context from conversation history AND current query for smarter suggestions
function extractConversationContext(conversationHistory = [], currentQuery = '') {
  const context = {
    course: null,
    module: null,
    year: null,
    semester: null,
    assessment: null,
    // Flags to indicate if we have SPECIFIC context
    hasSpecificCourse: false,
    hasSpecificModule: false,
    hasSpecificAssessment: false,
    hasSpecificYear: false
  };
  
  // Combine conversation history with current query for analysis
  const allContent = [
    ...conversationHistory.slice(-6).map(msg => msg.content || ''),
    currentQuery
  ];
  
  for (const content of allContent) {
    const contentLower = content.toLowerCase();
    
    // Detect SPECIFIC course type (FD or BSc)
    if (contentLower.includes('fd ') || contentLower.includes('foundation degree') || contentLower.includes('fd-')) {
      context.course = 'FD';
      context.hasSpecificCourse = true;
    } else if (contentLower.includes('bsc') || contentLower.includes('bachelor') || contentLower.includes('top-up') || contentLower.includes('top up')) {
      context.course = 'BSc';
      context.hasSpecificCourse = true;
    }
    
    // Detect SPECIFIC year (Year 1, Year 2, Year 3)
    const yearMatch = contentLower.match(/year\s*(\d)|(\d)(?:st|nd|rd|th)\s+year/i);
    if (yearMatch) {
      context.year = yearMatch[1] || yearMatch[2];
      context.hasSpecificYear = true;
    }
    
    // Detect semester
    const semMatch = contentLower.match(/semester\s*(\d)/i);
    if (semMatch) {
      context.semester = semMatch[1];
    }
    
    // Detect SPECIFIC module mentions (look for actual module names)
    const specificModulePatterns = [
      // Named modules
      /(?:psychology|anatomy|physiology|training|fitness|nutrition|sport|professional|research|academic|health|wellbeing|leadership|management|injury|rehabilitation|independent|study|performance|analysis)/i,
      // "the X module" pattern
      /(?:the\s+)?([a-z][a-z\s]{3,30})\s+module/i,
      // "module: X" or "about X"
      /(?:module[:\s]+|about\s+(?:the\s+)?)([a-z][a-z\s]{3,30})(?:\s+module)?/i,
    ];
    
    for (const pattern of specificModulePatterns) {
      const match = contentLower.match(pattern);
      if (match) {
        const moduleName = match[1] || match[0];
        // Filter out generic words
        const genericWords = ['the', 'a', 'an', 'my', 'your', 'this', 'that', 'what', 'which', 'assessments', 'deadlines', 'modules'];
        if (moduleName && moduleName.length > 4 && !genericWords.includes(moduleName.trim())) {
          context.module = moduleName.trim();
          context.hasSpecificModule = true;
        }
      }
    }
    
    // Detect SPECIFIC assessment types
    const assessmentPatterns = /(?:essay|presentation|portfolio|exam|coursework|report|practical|case study|project|dissertation)/i;
    if (assessmentPatterns.test(contentLower)) {
      const match = contentLower.match(assessmentPatterns);
      if (match) {
        context.assessment = match[0];
        context.hasSpecificAssessment = true;
      }
    }
  }
  
  return context;
}

// Build a suggestion object from a match item - IMPROVED: More concise
function buildSuggestionFromMatch(item, queryContext) {
  const metadata = item.metadata || {};
  const type = metadata.type || 'unknown';
  
  // Build title based on type - keep it concise
  let title = '';
  let typeIcon = '📄';
  
  switch (type) {
    case 'module':
      title = metadata.module_title || 'Unknown Module';
      typeIcon = '📚';
      break;
    case 'assessment':
      // For assessments, show the module name with assessment type
      if (metadata.module_title) {
        title = metadata.module_title;
        if (metadata.assessment_type) {
          title += ` (${metadata.assessment_type})`;
        }
      } else {
        title = metadata.assessment_type || 'Assessment';
      }
      typeIcon = '📝';
      break;
    case 'course_overview':
    case 'course':
      title = metadata.course_title || 'Unknown Course';
      typeIcon = '🎓';
      break;
    default:
      title = metadata.module_title || metadata.course_title || metadata.assessment_type || 'Information';
  }
  
  // Build CONCISE details - max 2-3 key details only
  const details = [];
  
  // For modules: Year + Semester
  if (type === 'module') {
    if (metadata.year && metadata.semester) {
      details.push({
        icon: '📅',
        label: `Y${metadata.year} S${metadata.semester}`
      });
    } else if (metadata.year) {
      details.push({
        icon: '📅',
        label: `Year ${metadata.year}`
      });
    }
  }
  
  // For assessments: Deadline is most important
  if (type === 'assessment') {
    if (metadata.deadline) {
      details.push({
        icon: '⏰',
        label: metadata.deadline
      });
    }
    if (metadata.weight) {
      details.push({
        icon: '⚖️',
        label: metadata.weight
      });
    }
  }
  
  // For courses: Level only
  if (type === 'course_overview' || type === 'course') {
    if (metadata.level) {
      details.push({
        icon: '📊',
        label: metadata.level
      });
    }
  }
  
  // Build concise, contextual click query
  let clickQuery = '';
  const moduleName = metadata.module_title || title;
  const courseName = metadata.course_title || title;
  
  switch (type) {
    case 'module':
      // Follow hierarchy: If asking about module, next logical step is assessments
      clickQuery = `What are the assessments and deadlines for ${moduleName}?`;
      break;
      
    case 'assessment':
      // Be specific about the assessment
      clickQuery = `Tell me about the ${metadata.assessment_type || 'assessment'} in ${metadata.module_title || 'this module'}`;
      break;
      
    case 'course_overview':
    case 'course':
      // Follow hierarchy: If asking about course, next logical step is modules
      clickQuery = `What modules are in ${courseName}?`;
      break;
      
    default:
      clickQuery = `Tell me more about ${title}`;
  }
  
  return {
    id: item.match?.id || `suggestion-${Date.now()}-${Math.random()}`,
    title: title,
    details: details.slice(0, 3), // Max 3 details for cleaner UI
    query: clickQuery,
    score: item.score,
    type: type,
    icon: typeIcon
  };
}

// Helper function: Analyze matches to identify similar items that should be presented as options
// Now analyzes modules, assessments, AND courses for intelligent suggestions
function analyzeMatchesForSuggestions(matches, query) {
  const queryLower = query.toLowerCase();
  
  // Group matches by type (module, assessment, course, etc.)
  const typeGroups = {};
  
  matches.forEach((match, idx) => {
    const type = match.metadata?.type || 'unknown';
    if (!typeGroups[type]) {
      typeGroups[type] = [];
    }
    typeGroups[type].push({
      index: idx + 1,
      score: match.score,
      metadata: match.metadata,
      match: match
    });
  });
  
  const suggestions = [];
  
  // Analyze each type group for potential suggestions
  Object.entries(typeGroups).forEach(([type, items]) => {
    // For assessments: show suggestions if multiple assessments match
    if (type === 'assessment' && items.length >= 2) {
      const topScore = items[0].score;
      const similarItems = items.filter(item => (topScore - item.score) < 0.20); // Wider threshold for assessments
      
      if (similarItems.length >= 2) {
        suggestions.push({
          type: type,
          count: similarItems.length,
          items: similarItems,
          avgScore: similarItems.reduce((sum, item) => sum + item.score, 0) / similarItems.length
        });
      }
    }
    
    // For modules: show suggestions if multiple modules match
    if (type === 'module' && items.length >= 2) {
      const topScore = items[0].score;
      const similarItems = items.filter(item => (topScore - item.score) < 0.15);
      
      if (similarItems.length >= 2) {
        suggestions.push({
          type: type,
          count: similarItems.length,
          items: similarItems,
          avgScore: similarItems.reduce((sum, item) => sum + item.score, 0) / similarItems.length
        });
      }
    }
    
    // For courses: show suggestions if multiple courses match
    if ((type === 'course_overview' || type === 'course') && items.length >= 2) {
      const topScore = items[0].score;
      const similarItems = items.filter(item => (topScore - item.score) < 0.15);
      
      if (similarItems.length >= 2) {
        suggestions.push({
          type: type,
          count: similarItems.length,
          items: similarItems,
          avgScore: similarItems.reduce((sum, item) => sum + item.score, 0) / similarItems.length
        });
      }
    }
  });
  
  // CROSS-TYPE SUGGESTIONS: If query could relate to multiple types, suggest all
  // E.g., "deadlines" could mean assessment deadlines or module information
  const hasDeadlineQuery = /deadline|due|submit|when/i.test(query);
  const hasGeneralQuery = /tell me|what|show|list|information/i.test(query);
  
  if (hasDeadlineQuery || hasGeneralQuery) {
    // Check if we have high-scoring items across different types
    const topItems = matches
      .filter(m => m.score >= 0.4)
      .slice(0, 8);
    
    const topTypes = new Set(topItems.map(m => m.metadata?.type));
    
    // If multiple types are relevant, create a mixed suggestion
    if (topTypes.size >= 2 && suggestions.length === 0) {
      const mixedItems = topItems.map((match, idx) => ({
        index: idx + 1,
        score: match.score,
        metadata: match.metadata,
        match: match
      }));
      
      suggestions.push({
        type: 'mixed',
        count: mixedItems.length,
        items: mixedItems,
        avgScore: mixedItems.reduce((sum, item) => sum + item.score, 0) / mixedItems.length
      });
    }
  }
  
  // Sort suggestions by average score
  suggestions.sort((a, b) => b.avgScore - a.avgScore);
  
  return {
    hasSuggestions: suggestions.length > 0,
    suggestions: suggestions,
    totalMatches: matches.length,
    typeBreakdown: Object.fromEntries(
      Object.entries(typeGroups).map(([type, items]) => [type, items.length])
    )
  };
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
async function generateChatResponse(query, context, conversationHistory = [], matches = []) {
  try {
    const systemPrompt = `You are Oracle, a specialized AI assistant for University Centre Leeds. Your primary role is to answer student questions by strictly using the information provided in the <CONTEXT> section.

You must NOT use any external knowledge or make up information. Your purpose is to accurately present and guide students through the provided data.

### DATA HIERARCHY (CRITICAL)
The data follows a strict hierarchy linked by IDs:

**COURSE** (top level)
  └── Identified by: \`course_code\` (e.g., "FD-HAP-25/26")
  └── Type: \`course_overview\`
  
  **MODULE** (belongs to a course)
    └── Identified by: \`module_code\` (e.g., "W_HTH4C042R-2025.26")
    └── Links to course via: \`course_code\` field in metadata
    └── Type: \`module\`
    
    **ASSESSMENT** (belongs to a module)
      └── Links to module via: \`module_code\` field in metadata
      └── Type: \`assessment\`
      └── Contains: deadline, weight, word_count, assessment_type

**IMPORTANT RULES FOR HIERARCHY:**
1. To find assessments for a module, look for documents where \`module_code\` matches the module's code
2. To find modules for a course, look for documents where \`course_code\` matches the course's code
3. When a student asks about a module's assessments, ALL documents with matching \`module_code\` and type \`assessment\` are the assessments for that module
4. When a student asks about a course's modules, ALL documents with matching \`course_code\` and type \`module\` are the modules for that course
5. NEVER say a module has no assessments unless you've checked all items in the <CONTEXT> with matching module_code
6. Multiple assessments can exist for a single module (e.g., Essay 60%, Presentation 40%)

### Persona & Tone
Friendly & Conversational: Your name is Oracle. Be helpful and approachable, not robotic.

Proactive Guide: Guide users step-by-step. Don't just answer; anticipate their next question.

Greeting Policy: Greet the user only on the first turn of a conversation. For all follow-up messages, get straight to the point.

Identity: You are Oracle, an assistant for University Centre Leeds students. Do not refer to yourself as a chatbot, AI, or language model.

### Core Logic: Intelligent Suggestions Based on Top-K Matches
**CRITICAL**: The embeddings model has returned multiple relevant matches from the vector database. Each match has a similarity score indicating relevance. You MUST intelligently use these matches to help disambiguate user queries.

When multiple similar items exist in the <CONTEXT> (indicated by multiple entries with similar types but different details):

1. **Recognize Ambiguity**: Identify when there are 2+ similar items that could match the user's query (e.g., multiple modules with similar names, multiple assessments, multiple courses).

2. **Present Clear Options**: Format suggestions in a friendly, clear way:
   - "I found [X] items that match your query. Which one are you looking for?"
   - List each option with distinguishing details (year, semester, module code, course name, etc.)
   - Use bullet points or numbered lists for clarity
   
3. **Use Metadata to Differentiate**: Each match includes metadata (year, semester, module_code, course_code, type, etc.). Use these to help the student distinguish between similar items:
   - Example: "Are you asking about:
     • **Academic Research and Study Skills** (Year 1, Semester 1, Module Code: W_HTH4C042R-2025.26)
     • **Academic Research Methods** (Year 2, Semester 2, Module Code: W_HTH5C043R-2025.26)"

4. **Rank by Relevance**: The matches are ordered by similarity score. When presenting options, prioritize higher-scoring matches first (they appear earlier in the context).

5. **Smart Filtering**: If the user's query contains contextual clues (year, semester, course code), filter the suggestions accordingly before presenting them.

6. **Follow-up Guidance**: After presenting options, invite the user to specify: "Please let me know which one you'd like to know more about!"

**Example Scenarios**:

Scenario 1: Student asks "What's the deadline for Academic Research?"
- Context contains: Academic Research and Study Skills (Year 1) AND Advanced Academic Research (Year 2)
- Response: "I found 2 modules matching 'Academic Research':
  1. **Academic Research and Study Skills** (Year 1, Semester 1)
  2. **Advanced Academic Research** (Year 2, Semester 2)
  
  Which module are you asking about?"

Scenario 2: Student asks "Who is the tutor for Psychology?"
- Context contains: Psychology of Sport (Year 1) AND Sport Psychology (Year 2) with different tutors
- Response: "I see multiple Psychology modules. Which one do you mean?
  • **Psychology of Sport and Exercise** (Year 1) - Tutor: Callum Lister
  • **Sport Psychology** (Year 2) - Tutor: Dr. Sarah Jones
  
  Let me know which one you need information about!"

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
          "<CONTEXT>No specific information found. Available information includes: University Centre Leeds Sport courses for FD Sport Performance and Exercise (W_FD1099FR), including modules for Year 1 and Year 2, assessments, deadlines, tutors (Ruth Tolson, James Thwaite, Callum Lister, Matthew Mosalski), and academic calendar 2025-2026.</CONTEXT>",
          conversationHistory,
          []
        );
        
        return res.json({
          response: helpfulResponse,
          sources: [],
          suggestions: [], // No suggestions when no matches found
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

    // 3.6. HIERARCHICAL SEARCH: Fetch related items based on course/module/assessment hierarchy
    // This ensures that when a module is found, its assessments are also fetched
    // And when a course is found, its modules are also fetched
    console.log(`🔗 Starting hierarchical search based on initial matches...`);
    const hierarchicalItems = await fetchHierarchicalRelatedItems(matches, message, namespace);
    
    if (hierarchicalItems.length > 0) {
      console.log(`🔗 Adding ${hierarchicalItems.length} hierarchically related items to context`);
      
      // Add hierarchical items to matches (avoiding duplicates)
      const existingIds = new Set(matches.map(m => m.id));
      const newItems = hierarchicalItems.filter(item => !existingIds.has(item.id));
      
      // Group by type for better organization
      const assessments = newItems.filter(i => i.metadata?.type === 'assessment');
      const modules = newItems.filter(i => i.metadata?.type === 'module');
      const courses = newItems.filter(i => i.metadata?.type === 'course_overview');
      
      // Add in order: courses first, then modules, then assessments
      matches.push(...courses, ...modules, ...assessments);
      
      console.log(`   📊 Added: ${courses.length} courses, ${modules.length} modules, ${assessments.length} assessments`);
    }

    // 3.7. If query specifically asks for assessments, also do a generic secondary search
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

    // 4. Analyze matches to identify potential ambiguities
    const matchAnalysis = analyzeMatchesForSuggestions(matches, message);
    console.log(`📊 Match analysis: ${matchAnalysis.hasSuggestions ? `Found ${matchAnalysis.suggestions.length} ambiguous groups` : 'No ambiguities detected'}`);
    
    // 4.5. Prepare enhanced context from matches with similarity scores and metadata
    // Organize by hierarchy for clearer context
    const courseMatches = matches.filter(m => m.metadata?.type === 'course_overview');
    const moduleMatches = matches.filter(m => m.metadata?.type === 'module');
    const assessmentMatches = matches.filter(m => m.metadata?.type === 'assessment');
    const otherMatches = matches.filter(m => !['course_overview', 'module', 'assessment'].includes(m.metadata?.type));
    
    // Reorder matches: courses -> modules -> assessments -> other
    const organizedMatches = [...courseMatches, ...moduleMatches, ...assessmentMatches, ...otherMatches];
    
    // Build hierarchy summary for AI
    const hierarchySummary = [];
    if (courseMatches.length > 0) {
      const courseCodes = [...new Set(courseMatches.map(m => m.metadata?.course_code).filter(Boolean))];
      hierarchySummary.push(`COURSES: ${courseCodes.join(', ')}`);
    }
    if (moduleMatches.length > 0) {
      const moduleCodes = [...new Set(moduleMatches.map(m => m.metadata?.module_code).filter(Boolean))];
      hierarchySummary.push(`MODULES: ${moduleCodes.join(', ')}`);
    }
    if (assessmentMatches.length > 0) {
      const assessmentInfo = assessmentMatches.map(m => `${m.metadata?.assessment_type || 'Assessment'} (${m.metadata?.module_code})`);
      hierarchySummary.push(`ASSESSMENTS: ${assessmentInfo.join(', ')}`);
    }
    
    console.log(`📊 Context hierarchy: ${courseMatches.length} courses, ${moduleMatches.length} modules, ${assessmentMatches.length} assessments, ${otherMatches.length} other`);
    
    const contextParts = organizedMatches.map((match, idx) => {
      const score = (match.score * 100).toFixed(1);
      const metadata = match.metadata || {};
      
      // Highlight hierarchy links in metadata
      const metadataEntries = Object.entries(metadata)
        .filter(([key]) => key !== 'text' && key !== 'uploadTimestamp' && key !== 'namespace');
      
      // Prioritize hierarchy-relevant fields
      const priorityFields = ['type', 'course_code', 'module_code', 'course_title', 'module_title', 'assessment_type'];
      metadataEntries.sort((a, b) => {
        const aIdx = priorityFields.indexOf(a[0]);
        const bIdx = priorityFields.indexOf(b[0]);
        if (aIdx === -1 && bIdx === -1) return 0;
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
      
      const metadataStr = metadataEntries
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      
      return `[Match ${idx + 1}] (Relevance: ${score}%)${metadataStr ? ` [${metadataStr}]` : ''}
${match.metadata?.text || ''}`;
    });
    
    // Build context with ambiguity analysis
    let context = `<CONTEXT>
The following are the top ${organizedMatches.length} most relevant items from the knowledge base, organized by hierarchy (Courses -> Modules -> Assessments).
Each item includes a relevance score (higher = more relevant) and metadata to help you differentiate between similar items.

📊 HIERARCHY OVERVIEW:
${hierarchySummary.length > 0 ? hierarchySummary.join('\n') : 'No structured hierarchy data found.'}

🔗 HIERARCHY LINKS (use these to find related items):
- Assessments link to Modules via: module_code
- Modules link to Courses via: course_code
- When asked about assessments for a module, look for ALL items with type=assessment AND matching module_code
- When asked about modules for a course, look for ALL items with type=module AND matching course_code
`;

    // Add ambiguity warning if multiple similar items detected
    if (matchAnalysis.hasSuggestions) {
      context += `\n⚠️ AMBIGUITY DETECTED: The search found multiple similar items that could match the student's query:\n`;
      matchAnalysis.suggestions.forEach(suggestion => {
        const typeLabel = suggestion.type === 'assessment' ? 'assessments' : 
                         suggestion.type === 'module' ? 'modules' : 
                         suggestion.type === 'course_overview' ? 'courses' : `${suggestion.type}s`;
        context += `- ${suggestion.count} ${typeLabel} with similar relevance (avg: ${(suggestion.avgScore * 100).toFixed(1)}%)\n`;
        suggestion.items.forEach(item => {
          const title = item.metadata?.module_title || item.metadata?.course_title || item.metadata?.assessment_type || item.metadata?.type || 'Unknown';
          const details = [];
          if (item.metadata?.year) details.push(`Year ${item.metadata.year}`);
          if (item.metadata?.semester) details.push(`Semester ${item.metadata.semester}`);
          if (item.metadata?.module_code) details.push(`Module: ${item.metadata.module_code}`);
          if (item.metadata?.course_code) details.push(`Course: ${item.metadata.course_code}`);
          if (item.metadata?.deadline) details.push(`Deadline: ${item.metadata.deadline}`);
          context += `  • Match ${item.index}: ${title}${details.length ? ` (${details.join(', ')})` : ''} - ${(item.score * 100).toFixed(1)}%\n`;
        });
      });
      context += `\n**ACTION REQUIRED**: Present these as options to the student for clarification.\n`;
    }

    context += `\n--- DOCUMENTS ---\n\n${contextParts.join('\n\n---\n\n')}\n</CONTEXT>`;

    // 5. Generate response using Gemini with conversation history and match information
    const llmStartTime = Date.now();
    const aiResponse = await generateChatResponse(message, context, conversationHistory, matches);
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

    // Extract structured suggestions if detected (now with conversation context)
    const suggestions = extractSuggestionsFromMatches(matches, matchAnalysis, message, conversationHistory);
    console.log(`📊 Extracted ${suggestions.length} structured suggestions for UI tiles (max 3, context-aware)`);

    const result = {
      response: aiResponse,
      sources,
      suggestions, // Add structured suggestions for UI tiles
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

