const axios = require('axios');
const fs = require('fs');

const SERVER_URL = 'http://localhost:3000';
const NAMESPACE = 'ucl-courses';

async function uploadDocuments() {
  try {
    const data = JSON.parse(fs.readFileSync('uc-course-data.json', 'utf-8'));
    
    // Convert to the format expected by the server
    const documents = data.map(doc => ({
      id: doc.id,
      text: doc.text,
      metadata: doc.metadata
    }));
    
    console.log(`📤 Uploading ${documents.length} documents to Pinecone...`);
    
    const response = await axios.post(`${SERVER_URL}/api/upload`, {
      documents: documents,
      namespace: NAMESPACE
    });
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\n✅ Upload complete!');
  } catch (error) {
    console.error('Fatal error:', error.response?.data || error.message);
  }
}

uploadDocuments();

