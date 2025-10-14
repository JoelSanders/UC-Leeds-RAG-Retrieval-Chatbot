require('dotenv').config();
const { Pinecone } = require('@pinecone-database/pinecone');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

async function verifyData() {
  try {
    console.log(`\n${colors.cyan}Checking Pinecone Index...${colors.reset}\n`);

    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY
    });

    const index = pinecone.index(process.env.PINECONE_INDEX_NAME);
    
    // Get index statistics
    const stats = await index.describeIndexStats();
    
    console.log(`${colors.cyan}Index: ${process.env.PINECONE_INDEX_NAME}${colors.reset}`);
    console.log(`${colors.cyan}Total Vectors: ${stats.totalRecordCount || 0}${colors.reset}`);
    console.log(`${colors.cyan}Dimension: ${stats.dimension}${colors.reset}\n`);

    if (stats.namespaces) {
      console.log(`${colors.cyan}Namespaces:${colors.reset}`);
      console.log('─'.repeat(50));
      
      for (const [namespace, data] of Object.entries(stats.namespaces)) {
        const displayName = namespace || '(default/empty)';
        console.log(`  ${colors.green}${displayName}${colors.reset}: ${data.recordCount} vectors`);
      }
      console.log('─'.repeat(50) + '\n');

      // Check for ucl-courses namespace
      if (stats.namespaces['ucl-courses']) {
        console.log(`${colors.green}✓ Found 'ucl-courses' namespace with ${stats.namespaces['ucl-courses'].recordCount} vectors${colors.reset}`);
        console.log(`${colors.yellow}⚠ Your chat needs to query the 'ucl-courses' namespace!${colors.reset}\n`);
      } else {
        console.log(`${colors.red}✗ 'ucl-courses' namespace not found${colors.reset}`);
        console.log(`${colors.yellow}Run: npm run upload:direct${colors.reset}\n`);
      }

      // Check for default namespace
      if (stats.namespaces[''] || stats.namespaces[undefined]) {
        const count = (stats.namespaces[''] || stats.namespaces[undefined]).recordCount;
        console.log(`${colors.cyan}Default namespace has ${count} vectors${colors.reset}\n`);
      }
    } else {
      console.log(`${colors.red}No namespaces found or index is empty${colors.reset}\n`);
    }

    // Test query in ucl-courses namespace
    console.log(`${colors.cyan}Testing query in 'ucl-courses' namespace...${colors.reset}`);
    try {
      const testVector = Array(1536).fill(0.1); // Dummy vector
      const queryResult = await index.namespace('ucl-courses').query({
        vector: testVector,
        topK: 1,
        includeMetadata: true
      });

      if (queryResult.matches && queryResult.matches.length > 0) {
        console.log(`${colors.green}✓ Successfully queried 'ucl-courses' namespace${colors.reset}`);
        console.log(`${colors.cyan}Sample document ID: ${queryResult.matches[0].id}${colors.reset}\n`);
      } else {
        console.log(`${colors.yellow}⚠ Query returned no results (namespace might be empty)${colors.reset}\n`);
      }
    } catch (error) {
      console.log(`${colors.red}✗ Query failed: ${error.message}${colors.reset}\n`);
    }

    console.log(`${colors.cyan}═`.repeat(50) + `${colors.reset}`);
    console.log(`${colors.cyan}Solution:${colors.reset}`);
    console.log(`The chat interface needs to specify namespace: 'ucl-courses'`);
    console.log(`I'll update the frontend to fix this.\n`);

  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error.message);
  }
}

verifyData();

