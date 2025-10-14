/**
 * Test Script - Verify Pinecone and OpenAI Connections
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

async function testConnections() {
  console.log('🧪 Testing API Connections...\n');
  console.log('=' .repeat(50));
  
  // Test Environment Variables
  console.log('\n📋 Environment Variables:');
  console.log('✓ PINECONE_API_KEY:', process.env.PINECONE_API_KEY ? `${process.env.PINECONE_API_KEY.substring(0, 15)}...` : '❌ MISSING');
  console.log('✓ PINECONE_INDEX_NAME:', process.env.PINECONE_INDEX_NAME || '❌ MISSING');
  console.log('✓ OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 15)}...` : '❌ MISSING');
  
  // Test Pinecone Connection
  console.log('\n' + '='.repeat(50));
  console.log('\n🔌 Testing Pinecone Connection...');
  try {
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });
    
    console.log('✅ Pinecone client initialized');
    
    // List indexes
    const indexes = await pinecone.listIndexes();
    console.log('\n📊 Available Indexes:');
    if (indexes.indexes && indexes.indexes.length > 0) {
      indexes.indexes.forEach(index => {
        console.log(`  - ${index.name} (${index.dimension} dimensions, ${index.metric} metric)`);
        if (index.name === process.env.PINECONE_INDEX_NAME) {
          console.log('    ✅ This is your configured index!');
          if (index.dimension !== 1536) {
            console.log(`    ⚠️  WARNING: Dimension is ${index.dimension}, but OpenAI embedding needs 1536`);
          }
        }
      });
    } else {
      console.log('  ⚠️  No indexes found. You need to create one!');
    }
    
    // Try to access the configured index
    console.log(`\n🎯 Testing index: "${process.env.PINECONE_INDEX_NAME}"`);
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    const stats = await index.describeIndexStats();
    console.log('✅ Index accessible!');
    console.log(`   Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`   Namespaces: ${Object.keys(stats.namespaces || {}).length || 0}`);
    
  } catch (error) {
    console.error('❌ Pinecone Error:', error.message);
    if (error.message.includes('API key')) {
      console.log('\n💡 Fix: Check your PINECONE_API_KEY in .env file');
      console.log('   Get it from: https://app.pinecone.io → API Keys');
    }
    if (error.message.includes('not found')) {
      console.log('\n💡 Fix: The index does not exist');
      console.log('   Create it at: https://app.pinecone.io → Create Index');
      console.log('   Settings: 1536 dimensions, cosine metric');
    }
  }
  
  // Test OpenAI Connection
  console.log('\n' + '='.repeat(50));
  console.log('\n🤖 Testing OpenAI Connection...');
  try {
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Test embedding
    console.log('Testing embedding generation...');
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: "test",
    });
    
    console.log('✅ OpenAI API working!');
    console.log(`   Embedding dimension: ${response.data[0].embedding.length}`);
    
  } catch (error) {
    console.error('❌ OpenAI Error:', error.message);
    if (error.message.includes('API key')) {
      console.log('\n💡 Fix: Check your OPENAI_API_KEY in .env file');
      console.log('   Get it from: https://platform.openai.com/api-keys');
    }
    if (error.message.includes('quota') || error.message.includes('insufficient_quota')) {
      console.log('\n💡 Fix: Your OpenAI account needs credits');
      console.log('   Add billing at: https://platform.openai.com/account/billing');
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Test Complete!\n');
}

testConnections().catch(console.error);




