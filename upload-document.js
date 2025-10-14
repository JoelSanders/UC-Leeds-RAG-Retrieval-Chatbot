/**
 * Upload Document Script
 * 
 * Use this script to upload your comprehensive document to the Pinecone database.
 * 
 * Usage:
 *   1. Replace the text in the 'documentText' variable below with your content
 *   2. Run: node upload-document.js
 */

require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Initialize Pinecone
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

// Generate embedding using OpenAI
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
}

// Upload document
async function uploadDocument() {
  try {
    console.log('📤 Starting document upload...\n');
    
    // ============================================
    // REPLACE THIS WITH YOUR DOCUMENT CONTENT
    // ============================================
    const documentText = `
Replace this text with your comprehensive document content.

You can include multiple paragraphs, sections, and information.

The chatbot will use this content to answer questions.
    `.trim();
    
    // ============================================
    
    if (documentText.includes('Replace this text')) {
      console.log('❌ Error: Please replace the documentText variable with your actual content!');
      return;
    }
    
    console.log('📝 Document length:', documentText.length, 'characters');
    console.log('🔢 Generating embedding...');
    
    const embedding = await generateEmbedding(documentText);
    console.log('✅ Embedding generated:', embedding.length, 'dimensions');
    
    console.log('☁️  Uploading to Pinecone...');
    
    await index.upsert([
      {
        id: `doc-${Date.now()}`,
        values: embedding,
        metadata: {
          text: documentText,
          uploadedAt: new Date().toISOString(),
          source: 'manual-upload'
        }
      }
    ]);
    
    console.log('✅ Document uploaded successfully!\n');
    console.log('💬 You can now query the chatbot about this content.\n');
    
  } catch (error) {
    console.error('❌ Error uploading document:', error.message);
  }
}

// Run the upload
uploadDocument();




