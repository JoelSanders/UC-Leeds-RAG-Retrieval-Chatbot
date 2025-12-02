/**
 * Test Script for Intelligent Suggestions Feature
 * 
 * This script demonstrates how the RAG Chatbot handles ambiguous queries
 * by presenting intelligent suggestions based on embeddings similarity.
 * 
 * Prerequisites:
 * - Server must be running (node server.js)
 * - Course data must be uploaded to Pinecone
 * 
 * Usage:
 *   node test-intelligent-suggestions.js
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000/api';

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// Helper function to format console output
function log(message, color = 'white') {
  console.log(colors[color] + message + colors.reset);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'bright');
  console.log('='.repeat(80) + '\n');
}

function logQuery(query) {
  log(`👤 Student Query: "${query}"`, 'cyan');
}

function logResponse(response) {
  log('\n🤖 Oracle Response:', 'green');
  console.log(response);
}

function logMatchInfo(sources) {
  if (sources && sources.length > 0) {
    log('\n📊 Top Matches from Embeddings:', 'yellow');
    sources.slice(0, 5).forEach((source, idx) => {
      const score = (source.score * 100).toFixed(1);
      const metadata = source.metadata || {};
      const title = metadata.module_title || metadata.course_title || 'Unknown';
      const type = metadata.type || 'unknown';
      const year = metadata.year ? `Year ${metadata.year}` : '';
      const semester = metadata.semester ? `Sem ${metadata.semester}` : '';
      
      console.log(`  ${idx + 1}. [${score}%] ${title} (${type}) ${year} ${semester}`.trim());
    });
  }
}

function logStats(responseTime, cached) {
  const cacheStatus = cached ? '⚡ (cached)' : '';
  log(`\n⏱️  Response time: ${responseTime}ms ${cacheStatus}`, 'dim');
}

// Test queries designed to trigger intelligent suggestions
const testQueries = [
  {
    category: 'Ambiguous Module Names',
    queries: [
      "What's the deadline for Academic Research?",
      "Tell me about the Psychology module",
      "Who teaches the Professional Development module?"
    ]
  },
  {
    category: 'Vague Assessment Queries',
    queries: [
      "When is my essay due?",
      "What's the deadline for the presentation?",
      "Tell me about the portfolio assessment"
    ]
  },
  {
    category: 'General Course Queries',
    queries: [
      "What modules are in Year 1?",
      "Show me all Year 1 Semester 1 modules",
      "What assessments are due in Week 10?"
    ]
  },
  {
    category: 'Specific Queries (No Ambiguity Expected)',
    queries: [
      "Who is the tutor for Alternative Physical Activity?",
      "What's the deadline for Training and Fitness essay?",
      "Tell me about module W_HTH4C042R-2025.26"
    ]
  }
];

// Function to send a chat query
async function sendQuery(query, conversationHistory = []) {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat`, {
      message: query,
      conversationHistory: conversationHistory,
      namespace: 'ucl-courses',
      useCache: false // Disable cache for testing to see real results
    });
    
    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(`API Error: ${error.response.data.error || error.response.statusText}`);
    } else if (error.request) {
      throw new Error('Server is not responding. Make sure it\'s running on http://localhost:3000');
    } else {
      throw new Error(error.message);
    }
  }
}

// Function to check server health
async function checkServerHealth() {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    throw new Error('Server health check failed. Make sure the server is running.');
  }
}

// Main test function
async function runTests() {
  logSection('🧠 INTELLIGENT SUGGESTIONS FEATURE TEST');
  
  log('This script tests the RAG Chatbot\'s ability to handle ambiguous queries', 'dim');
  log('by presenting intelligent suggestions based on embeddings similarity.\n', 'dim');
  
  // Check server health
  try {
    log('Checking server health...', 'yellow');
    const health = await checkServerHealth();
    
    if (health.status === 'ok' && health.pineconeConnected) {
      log('✅ Server is healthy and connected to Pinecone\n', 'green');
      log(`   Index: ${health.indexName}`, 'dim');
      log(`   Total vectors: ${health.indexStats?.totalRecordCount || 'Unknown'}\n`, 'dim');
    } else {
      log('⚠️  Server is running but Pinecone connection failed\n', 'yellow');
      return;
    }
  } catch (error) {
    log(`❌ ${error.message}`, 'red');
    log('\nPlease start the server first:', 'yellow');
    log('  node server.js\n', 'cyan');
    return;
  }
  
  // Run test queries
  let totalQueries = 0;
  let totalTime = 0;
  let ambiguousQueries = 0;
  
  for (const testGroup of testQueries) {
    logSection(`📝 ${testGroup.category}`);
    
    for (const query of testGroup.queries) {
      try {
        logQuery(query);
        
        const result = await sendQuery(query);
        
        logMatchInfo(result.sources);
        logResponse(result.response);
        logStats(result.responseTime, result.cached);
        
        // Check if response contains suggestion indicators
        const hasSuggestions = 
          result.response.includes('found') ||
          result.response.includes('Which one') ||
          result.response.includes('are you looking for') ||
          result.response.includes('•') ||
          result.response.match(/\d+\./); // Numbered lists
        
        if (hasSuggestions) {
          log('✅ Intelligent suggestions detected!', 'green');
          ambiguousQueries++;
        }
        
        totalQueries++;
        totalTime += result.responseTime;
        
        // Add delay between queries to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
    }
  }
  
  // Summary
  logSection('📊 TEST SUMMARY');
  
  log(`Total queries tested: ${totalQueries}`, 'white');
  log(`Queries with suggestions: ${ambiguousQueries}`, 'green');
  log(`Average response time: ${(totalTime / totalQueries).toFixed(0)}ms`, 'yellow');
  
  const suggestionRate = (ambiguousQueries / totalQueries * 100).toFixed(1);
  log(`Suggestion rate: ${suggestionRate}%\n`, 'cyan');
  
  // Recommendations
  if (ambiguousQueries > 0) {
    log('✅ Intelligent suggestions feature is working!', 'green');
    log('   The system successfully detected ambiguous queries and presented options.\n', 'dim');
  } else {
    log('⚠️  No suggestions were detected in this test run.', 'yellow');
    log('   This could mean:', 'dim');
    log('   - Your course data doesn\'t have similar items', 'dim');
    log('   - The queries were too specific', 'dim');
    log('   - The similarity threshold needs adjustment\n', 'dim');
  }
  
  log('💡 Tips:', 'cyan');
  log('   - Try queries with partial module names for better ambiguity', 'dim');
  log('   - Upload more course data with similar names', 'dim');
  log('   - Adjust similarity threshold in analyzeMatchesForSuggestions()', 'dim');
  log('   - Review INTELLIGENT-SUGGESTIONS.md for detailed guidance\n', 'dim');
}

// Interactive mode: Send custom queries
async function interactiveMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  logSection('💬 INTERACTIVE MODE');
  log('Type your queries to test intelligent suggestions.', 'dim');
  log('Type "exit" to quit.\n', 'dim');
  
  const conversationHistory = [];
  
  const askQuestion = () => {
    rl.question(colors.cyan + '👤 Your query: ' + colors.reset, async (query) => {
      if (query.toLowerCase() === 'exit') {
        log('\nGoodbye! 👋\n', 'green');
        rl.close();
        return;
      }
      
      if (!query.trim()) {
        askQuestion();
        return;
      }
      
      try {
        const result = await sendQuery(query, conversationHistory);
        
        logMatchInfo(result.sources);
        logResponse(result.response);
        logStats(result.responseTime, result.cached);
        
        // Update conversation history
        conversationHistory.push({
          role: 'user',
          content: query
        });
        conversationHistory.push({
          role: 'assistant',
          content: result.response
        });
        
        // Keep only last 10 messages
        if (conversationHistory.length > 10) {
          conversationHistory.splice(0, conversationHistory.length - 10);
        }
        
      } catch (error) {
        log(`\n❌ Error: ${error.message}`, 'red');
      }
      
      console.log('\n' + '-'.repeat(80) + '\n');
      askQuestion();
    });
  };
  
  askQuestion();
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--interactive') || args.includes('-i')) {
  // Run in interactive mode
  checkServerHealth()
    .then(() => interactiveMode())
    .catch(error => {
      log(`❌ ${error.message}`, 'red');
      log('\nPlease start the server first:', 'yellow');
      log('  node server.js\n', 'cyan');
      process.exit(1);
    });
} else {
  // Run automated tests
  runTests()
    .then(() => {
      log('\n💡 Want to try your own queries?', 'cyan');
      log('   Run: node test-intelligent-suggestions.js --interactive\n', 'dim');
      process.exit(0);
    })
    .catch(error => {
      log(`\n❌ Unexpected error: ${error.message}`, 'red');
      process.exit(1);
    });
}


