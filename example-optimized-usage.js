/**
 * Example: Using Optimized RAG Chatbot Features
 * Demonstrates best practices for fast retrieval with large databases
 */

const API_URL = 'http://localhost:3000';

// ============================================================================
// EXAMPLE 1: Upload Documents with Namespaces and Rich Metadata
// ============================================================================

async function uploadOptimizedDocuments() {
  console.log('📤 Uploading documents with optimization features...\n');

  // Strategy: Organize by course namespace with rich metadata
  const courseDocs = [
    {
      id: 'cs101-overview',
      text: 'Computer Science 101 is an introductory course covering programming fundamentals, data structures, and algorithms...',
      metadata: {
        course: 'CS101',
        courseTitle: 'Introduction to Computer Science',
        year: '1',
        semester: '1',
        type: 'overview',
        credits: '15',
        department: 'Computing'
      }
    },
    {
      id: 'cs101-module-python',
      text: 'Python Programming module covers: Variables, Data types, Control structures, Functions, Object-oriented programming...',
      metadata: {
        course: 'CS101',
        year: '1',
        semester: '1',
        type: 'module',
        moduleName: 'Python Programming',
        week: '1-5',
        topic: 'Programming'
      }
    },
    {
      id: 'cs101-assessment-midterm',
      text: 'Midterm Assessment: Week 8, Friday 12:00PM. Topics covered: Python basics, data structures, algorithms. Weight: 40%',
      metadata: {
        course: 'CS101',
        year: '1',
        semester: '1',
        type: 'assessment',
        assessmentType: 'midterm',
        week: '8',
        weight: '40'
      }
    }
  ];

  try {
    const response = await fetch(`${API_URL}/api/upload`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documents: courseDocs,
        namespace: 'cs-101' // Key optimization: Use namespace
      })
    });

    const result = await response.json();
    console.log('✅ Upload result:', result);
    console.log('✨ Benefits: Data isolated in namespace, rich metadata for filtering\n');
  } catch (error) {
    console.error('❌ Upload error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 2: Query with Namespace (Faster Search)
// ============================================================================

async function queryWithNamespace() {
  console.log('🔍 Querying with namespace filter...\n');

  const message = 'What are the modules in this course?';

  try {
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        namespace: 'cs-101', // Only search CS101 data
        useCache: true
      })
    });

    const result = await response.json();
    console.log(`📝 Question: ${message}`);
    console.log(`⚡ Response time: ${result.responseTime}ms`);
    console.log(`💾 From cache: ${result.cached ? 'Yes' : 'No'}`);
    console.log(`📊 Sources found: ${result.sources.length}`);
    console.log(`💬 Answer: ${result.response.substring(0, 150)}...\n`);
  } catch (error) {
    console.error('❌ Query error:', error.message);
  }
}

// ============================================================================
// EXAMPLE 3: Demonstrate Cache Performance
// ============================================================================

async function demonstrateCaching() {
  console.log('⚡ Demonstrating cache performance...\n');

  const message = 'Tell me about CS101 course';

  // First query - not cached
  console.log('🔄 First query (not cached):');
  const start1 = Date.now();
  const response1 = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, namespace: 'cs-101' })
  });
  const result1 = await response1.json();
  const time1 = Date.now() - start1;
  console.log(`   Response time: ${time1}ms`);
  console.log(`   Cached: ${result1.cached}\n`);

  // Second query - cached
  console.log('🔄 Second query (cached):');
  const start2 = Date.now();
  const response2 = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, namespace: 'cs-101' })
  });
  const result2 = await response2.json();
  const time2 = Date.now() - start2;
  console.log(`   Response time: ${time2}ms`);
  console.log(`   Cached: ${result2.cached}`);
  console.log(`   🚀 Speed improvement: ${(time1 / time2).toFixed(2)}x faster!\n`);
}

// ============================================================================
// EXAMPLE 4: Upload Multiple Namespaces for Better Organization
// ============================================================================

async function uploadMultipleNamespaces() {
  console.log('📚 Uploading to multiple namespaces for organization...\n');

  // Year 1 documents
  await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documents: [
        {
          id: 'year1-overview',
          text: 'Year 1 includes 8 core modules focusing on fundamentals...',
          metadata: { year: '1', type: 'overview' }
        }
      ],
      namespace: 'year-1'
    })
  });
  console.log('✅ Uploaded to namespace: year-1');

  // Year 2 documents
  await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documents: [
        {
          id: 'year2-overview',
          text: 'Year 2 includes advanced topics and specialization options...',
          metadata: { year: '2', type: 'overview' }
        }
      ],
      namespace: 'year-2'
    })
  });
  console.log('✅ Uploaded to namespace: year-2');

  // Assessment documents (separate namespace)
  await fetch(`${API_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documents: [
        {
          id: 'assessment-policy',
          text: 'Assessment policy: All deadlines are Fridays at 12:00PM...',
          metadata: { type: 'policy', category: 'assessment' }
        }
      ],
      namespace: 'policies'
    })
  });
  console.log('✅ Uploaded to namespace: policies\n');
}

// ============================================================================
// EXAMPLE 5: Check Cache Statistics
// ============================================================================

async function checkCacheStats() {
  console.log('📊 Checking cache statistics...\n');

  try {
    const response = await fetch(`${API_URL}/api/cache/stats`);
    const stats = await response.json();

    console.log(`📦 Cache size: ${stats.size}/${stats.maxSize}`);
    console.log(`⏰ TTL: ${stats.ttl / 1000 / 60} minutes`);
    console.log(`🔑 Cached queries:`);
    stats.keys.slice(0, 5).forEach((key, idx) => {
      console.log(`   ${idx + 1}. ${key}`);
    });
    if (stats.keys.length > 5) {
      console.log(`   ... and ${stats.keys.length - 5} more\n`);
    }
  } catch (error) {
    console.error('❌ Error fetching cache stats:', error.message);
  }
}

// ============================================================================
// EXAMPLE 6: Clear Cache (When Data Changes)
// ============================================================================

async function clearCache() {
  console.log('🗑️  Clearing cache...\n');

  try {
    const response = await fetch(`${API_URL}/api/cache/clear`, {
      method: 'POST'
    });
    const result = await response.json();
    console.log(`✅ ${result.message}`);
    console.log(`   Entries cleared: ${result.entriesCleared}\n`);
  } catch (error) {
    console.error('❌ Error clearing cache:', error.message);
  }
}

// ============================================================================
// EXAMPLE 7: Performance Comparison - With vs Without Namespace
// ============================================================================

async function comparePerformance() {
  console.log('⚖️  Comparing performance: With vs Without Namespace\n');

  const message = 'What are the course modules?';

  // Query WITHOUT namespace (searches all data)
  console.log('🔍 Query 1: WITHOUT namespace (searches all data)');
  const start1 = Date.now();
  const response1 = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, useCache: false })
  });
  const result1 = await response1.json();
  const time1 = Date.now() - start1;
  console.log(`   Response time: ${time1}ms\n`);

  // Small delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Query WITH namespace (searches subset)
  console.log('🔍 Query 2: WITH namespace (searches cs-101 only)');
  const start2 = Date.now();
  const response2 = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, namespace: 'cs-101', useCache: false })
  });
  const result2 = await response2.json();
  const time2 = Date.now() - start2;
  console.log(`   Response time: ${time2}ms\n`);

  console.log(`📊 Performance improvement: ${((time1 - time2) / time1 * 100).toFixed(1)}%`);
  console.log(`🚀 Speed-up: ${(time1 / time2).toFixed(2)}x faster with namespace\n`);
}

// ============================================================================
// EXAMPLE 8: Query with Conversation History (Context Aware)
// ============================================================================

async function queryWithHistory() {
  console.log('💬 Demonstrating conversation history...\n');

  // First question
  const query1 = 'What is CS101 about?';
  console.log(`User: ${query1}`);
  
  const response1 = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: query1,
      namespace: 'cs-101',
      conversationHistory: []
    })
  });
  const result1 = await response1.json();
  console.log(`AI: ${result1.response.substring(0, 150)}...\n`);

  // Follow-up question (uses history)
  const query2 = 'What are the modules in it?';
  console.log(`User: ${query2}`);
  
  const response2 = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: query2,
      namespace: 'cs-101',
      conversationHistory: [
        { role: 'user', content: query1 },
        { role: 'assistant', content: result1.response }
      ]
    })
  });
  const result2 = await response2.json();
  console.log(`AI: ${result2.response.substring(0, 150)}...\n`);
  console.log('✨ The AI understood "it" refers to CS101 from conversation context\n');
}

// ============================================================================
// Run All Examples
// ============================================================================

async function runAllExamples() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 RAG CHATBOT OPTIMIZATION EXAMPLES');
  console.log('='.repeat(70) + '\n');

  try {
    // Example 1: Upload with optimization
    await uploadOptimizedDocuments();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Example 2: Query with namespace
    await queryWithNamespace();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Example 3: Cache demonstration
    await demonstrateCaching();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Example 4: Multiple namespaces
    await uploadMultipleNamespaces();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Example 5: Cache stats
    await checkCacheStats();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Example 6: Clear cache
    await clearCache();
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Example 7: Performance comparison
    // Uncomment if you have substantial data in multiple namespaces
    // await comparePerformance();
    // await new Promise(resolve => setTimeout(resolve, 1000));

    // Example 8: Conversation history
    await queryWithHistory();

    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL EXAMPLES COMPLETED');
    console.log('='.repeat(70) + '\n');

    console.log('💡 Key Takeaways:');
    console.log('   1. Use namespaces to organize data and speed up queries');
    console.log('   2. Add rich metadata for better filtering');
    console.log('   3. Cache automatically speeds up repeated queries');
    console.log('   4. Monitor cache stats to understand usage patterns');
    console.log('   5. Clear cache after uploading new documents\n');

  } catch (error) {
    console.error('\n❌ Error running examples:', error.message);
  }
}

// ============================================================================
// Run individual examples or all
// ============================================================================

// Run all examples
runAllExamples();

// Or run individual examples:
// uploadOptimizedDocuments();
// queryWithNamespace();
// demonstrateCaching();
// checkCacheStats();

