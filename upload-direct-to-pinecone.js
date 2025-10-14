require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Configuration
const NAMESPACE = 'ucl-courses';
const BATCH_SIZE = 100; // Pinecone's upsert limit

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

// Initialize clients
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error(`${colors.red}Error generating embedding:${colors.reset}`, error.message);
    throw error;
  }
}

/**
 * Upload documents in batches to Pinecone
 */
async function uploadBatchToPinecone(index, vectors, namespace) {
  try {
    await index.namespace(namespace).upsert(vectors);
    return true;
  } catch (error) {
    console.error(`${colors.red}Error uploading to Pinecone:${colors.reset}`, error.message);
    return false;
  }
}

/**
 * Process and upload all documents
 */
async function uploadDirectToPinecone() {
  try {
    console.log(`${colors.cyan}╔════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║   Direct Upload to Pinecone - Course Data        ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════════════════╝${colors.reset}\n`);

    // Initialize Pinecone index
    console.log(`${colors.yellow}Connecting to Pinecone...${colors.reset}`);
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    console.log(`${colors.green}✓ Connected to index: ${process.env.PINECONE_INDEX_NAME}${colors.reset}\n`);

    // Load JSON files
    console.log(`${colors.yellow}Loading course data...${colors.reset}`);
    const year1Data = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'uc-course-data.json'), 'utf-8')
    );
    const year2Data = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'uc-course-data-year2.json'), 'utf-8')
    );

    // Flatten nested arrays and combine all documents
    const flattenArray = (arr) => {
      return arr.reduce((acc, item) => {
        if (Array.isArray(item)) {
          return acc.concat(flattenArray(item));
        }
        // Skip empty objects
        if (item && item.id && item.text) {
          acc.push(item);
        }
        return acc;
      }, []);
    };

    const allDocuments = [
      ...flattenArray(Array.isArray(year1Data) ? year1Data : year1Data.documents || []),
      ...flattenArray(Array.isArray(year2Data) ? year2Data : year2Data.documents || [])
    ];

    console.log(`${colors.green}✓ Loaded ${allDocuments.length} documents${colors.reset}\n`);

    // Process documents and generate embeddings
    console.log(`${colors.cyan}Generating embeddings and preparing vectors...${colors.reset}`);
    const vectors = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allDocuments.length; i++) {
      const doc = allDocuments[i];
      const progress = `[${i + 1}/${allDocuments.length}]`;
      
      try {
        process.stdout.write(`${progress} Processing: ${doc.id}... `);

        // Generate embedding
        const embedding = await generateEmbedding(doc.text);

        // Prepare vector for Pinecone
        const vector = {
          id: doc.id,
          values: embedding,
          metadata: {
            ...doc.metadata,
            text: doc.text, // Store original text in metadata
            uploadTimestamp: new Date().toISOString(),
            namespace: NAMESPACE
          }
        };

        vectors.push(vector);
        console.log(`${colors.green}✓${colors.reset}`);
        successCount++;

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`${colors.red}✗ Failed: ${error.message}${colors.reset}`);
        errorCount++;
      }
    }

    // Upload vectors in batches
    console.log(`\n${colors.cyan}Uploading vectors to Pinecone...${colors.reset}`);
    let uploadCount = 0;
    let uploadErrors = 0;

    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(vectors.length / BATCH_SIZE);
      
      process.stdout.write(`Batch ${batchNum}/${totalBatches} (${batch.length} vectors)... `);
      
      const success = await uploadBatchToPinecone(index, batch, NAMESPACE);
      
      if (success) {
        console.log(`${colors.green}✓ Uploaded${colors.reset}`);
        uploadCount += batch.length;
      } else {
        console.log(`${colors.red}✗ Failed${colors.reset}`);
        uploadErrors += batch.length;
      }
    }

    // Final summary
    console.log('\n' + '═'.repeat(60));
    console.log(`${colors.cyan}📊 Upload Summary${colors.reset}`);
    console.log('═'.repeat(60));
    console.log(`Total documents:           ${allDocuments.length}`);
    console.log(`${colors.green}Embeddings generated:      ${successCount}${colors.reset}`);
    console.log(`${colors.green}Vectors uploaded:          ${uploadCount}${colors.reset}`);
    if (errorCount > 0 || uploadErrors > 0) {
      console.log(`${colors.red}Errors:                    ${errorCount + uploadErrors}${colors.reset}`);
    }
    console.log(`Namespace:                 ${NAMESPACE}`);
    console.log(`Index:                     ${process.env.PINECONE_INDEX_NAME}`);
    console.log('═'.repeat(60) + '\n');

    if (uploadCount === allDocuments.length) {
      console.log(`${colors.green}✓ SUCCESS! All course data uploaded to Pinecone${colors.reset}`);
      console.log(`${colors.cyan}You can now query this data through your chatbot!${colors.reset}\n`);
      
      console.log(`${colors.cyan}Try these queries:${colors.reset}`);
      console.log('  • "What modules are in Year 1?"');
      console.log('  • "When is the Professional Development deadline?"');
      console.log('  • "Who teaches Alternative Physical Activity?"');
      console.log('  • "Tell me about the academic calendar"\n');
    } else {
      console.log(`${colors.yellow}⚠ Upload completed with some errors${colors.reset}`);
      console.log(`${colors.yellow}Check the logs above for details${colors.reset}\n`);
    }

    // Get index stats
    try {
      const stats = await index.describeIndexStats();
      console.log(`${colors.cyan}Index Statistics:${colors.reset}`);
      console.log(`Total vectors: ${stats.totalRecordCount || 'N/A'}`);
      console.log(`Dimension: ${stats.dimension || 'N/A'}`);
      if (stats.namespaces && stats.namespaces[NAMESPACE]) {
        console.log(`Vectors in '${NAMESPACE}': ${stats.namespaces[NAMESPACE].recordCount}\n`);
      }
    } catch (error) {
      console.log(`${colors.yellow}Could not fetch index stats${colors.reset}\n`);
    }

  } catch (error) {
    console.error(`\n${colors.red}✗ Fatal error:${colors.reset}`, error.message);
    console.error(error);
    process.exit(1);
  }
}

/**
 * Verify environment variables
 */
function verifyEnvironment() {
  const required = [
    'PINECONE_API_KEY',
    'PINECONE_INDEX_NAME',
    'OPENAI_API_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error(`${colors.red}✗ Missing required environment variables:${colors.reset}`);
    missing.forEach(key => console.error(`  - ${key}`));
    console.error(`\n${colors.yellow}Please set these in your .env file${colors.reset}\n`);
    process.exit(1);
  }

  console.log(`${colors.green}✓ Environment variables verified${colors.reset}\n`);
}

// Main execution
console.log('\n');
verifyEnvironment();
uploadDirectToPinecone();

