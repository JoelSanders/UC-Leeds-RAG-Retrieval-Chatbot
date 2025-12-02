const fs = require('fs');
require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  });
  return response.data[0].embedding;
}

async function uploadDocuments() {
  const index = pinecone.index('chatbot-documents');
  const data = JSON.parse(fs.readFileSync('uc-course-data.json', 'utf-8'));
  
  console.log(`Uploading ${data.length} documents to Pinecone...`);
  
  for (const doc of data) {
    try {
      const embedding = await generateEmbedding(doc.text);
      
      await index.namespace('ucl-courses').upsert([{
        id: doc.id,
        values: embedding,
        metadata: {
          ...doc.metadata,
          text: doc.text
        }
      }]);
      
      console.log(`✓ Uploaded: ${doc.id}`);
    } catch (error) {
      console.error(`✗ Failed: ${doc.id}`, error.message);
    }
  }
  
  console.log('\\nUpload complete!');
}

uploadDocuments().catch(console.error);
