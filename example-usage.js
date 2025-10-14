/**
 * Example Usage Script for RAG Chatbot
 * 
 * This script demonstrates how to interact with the RAG Chatbot API
 * programmatically. You can use this as a reference for building
 * integrations or testing the API.
 */

const API_BASE_URL = 'http://localhost:3000/api';

// Example: Upload sample documents
async function uploadSampleDocuments() {
  const sampleDocuments = [
    {
      id: 'doc-1',
      text: 'Pinecone is a vector database that allows you to store and search high-dimensional vectors efficiently. It is optimized for machine learning applications and supports features like metadata filtering and hybrid search.',
      metadata: {
        topic: 'Pinecone',
        category: 'Database'
      }
    },
    {
      id: 'doc-2',
      text: 'OpenAI provides powerful language models like GPT-4 and GPT-3.5 that can understand and generate human-like text. These models are trained on vast amounts of data and can be fine-tuned for specific tasks.',
      metadata: {
        topic: 'OpenAI',
        category: 'AI Models'
      }
    },
    {
      id: 'doc-3',
      text: 'Retrieval-Augmented Generation (RAG) is a technique that combines information retrieval with text generation. It retrieves relevant documents from a knowledge base and uses them to generate more accurate and contextual responses.',
      metadata: {
        topic: 'RAG',
        category: 'AI Techniques'
      }
    },
    {
      id: 'doc-4',
      text: 'Vector embeddings are numerical representations of text that capture semantic meaning. Similar texts have similar embeddings, which allows for semantic search. Common embedding models include OpenAI\'s text-embedding models and sentence transformers.',
      metadata: {
        topic: 'Embeddings',
        category: 'Machine Learning'
      }
    },
    {
      id: 'doc-5',
      text: 'The cosine similarity metric measures the similarity between two vectors by computing the cosine of the angle between them. It is commonly used in vector databases for finding similar documents.',
      metadata: {
        topic: 'Similarity Metrics',
        category: 'Mathematics'
      }
    }
  ];

  try {
    console.log('📤 Uploading sample documents...');
    
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documents: sampleDocuments }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success:', result.message);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Failed to upload documents:', error.message);
  }
}

// Example: Send a chat message
async function sendChatMessage(message) {
  try {
    console.log(`\n💬 Sending message: "${message}"`);
    
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('\n🤖 Response:', result.response);
      console.log('\n📚 Sources:');
      result.sources.forEach(source => {
        console.log(`  [${source.id}] Score: ${(source.score * 100).toFixed(1)}%`);
        console.log(`      ${source.text}\n`);
      });
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
  }
}

// Example: Check server health
async function checkHealth() {
  try {
    console.log('🏥 Checking server health...');
    
    const response = await fetch(`${API_BASE_URL}/health`);
    const result = await response.json();
    
    console.log('Status:', result.status);
    console.log('Pinecone Connected:', result.pineconeConnected);
  } catch (error) {
    console.error('❌ Server is offline:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 RAG Chatbot Example Usage\n');
  console.log('=' .repeat(50));
  
  // Check if server is running
  await checkHealth();
  console.log('\n' + '='.repeat(50));
  
  // Upload sample documents
  await uploadSampleDocuments();
  console.log('\n' + '='.repeat(50));
  
  // Wait a moment for indexing
  console.log('\n⏳ Waiting for indexing to complete...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test queries
  const queries = [
    'What is Pinecone?',
    'How does RAG work?',
    'Explain vector embeddings'
  ];
  
  for (const query of queries) {
    await sendChatMessage(query);
    console.log('='.repeat(50));
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  uploadSampleDocuments,
  sendChatMessage,
  checkHealth
};




