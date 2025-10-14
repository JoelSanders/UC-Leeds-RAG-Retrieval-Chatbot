const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const SERVER_URL = 'http://localhost:3000';
const NAMESPACE = 'ucl-courses'; // Organize course data in its own namespace

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

/**
 * Upload course data to the RAG chatbot
 */
async function uploadCourseData() {
  try {
    console.log(`${colors.cyan}Starting University Centre Leeds Course Data Upload...${colors.reset}\n`);

    // Load Year 1 data
    console.log(`${colors.yellow}Loading Year 1 course data...${colors.reset}`);
    const year1Data = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'uc-course-data.json'), 'utf-8')
    );

    // Load Year 2 data
    console.log(`${colors.yellow}Loading Year 2 course data...${colors.reset}`);
    const year2Data = JSON.parse(
      fs.readFileSync(path.join(__dirname, 'uc-course-data-year2.json'), 'utf-8')
    );

    // Combine all documents
    const allDocuments = [
      ...year1Data.documents,
      ...year2Data.documents
    ];

    console.log(`${colors.cyan}Total documents to upload: ${allDocuments.length}${colors.reset}\n`);

    // Upload each document
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < allDocuments.length; i++) {
      const doc = allDocuments[i];
      const progress = `[${i + 1}/${allDocuments.length}]`;
      
      try {
        console.log(`${progress} Uploading: ${doc.metadata.type} - ${doc.metadata.module_title || doc.metadata.course_title || doc.id}`);
        
        // Prepare the upload data
        const uploadData = {
          text: doc.text,
          metadata: {
            ...doc.metadata,
            university: year1Data.university,
            uploadTimestamp: new Date().toISOString(),
            namespace: NAMESPACE
          },
          namespace: NAMESPACE
        };

        // Upload to server
        const response = await axios.post(`${SERVER_URL}/api/upload`, uploadData);
        
        if (response.data.success) {
          console.log(`${colors.green}✓ Successfully uploaded${colors.reset}\n`);
          successCount++;
        } else {
          throw new Error(response.data.message || 'Upload failed');
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.log(`${colors.red}✗ Failed to upload${colors.reset}`);
        console.log(`${colors.red}Error: ${error.message}${colors.reset}\n`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.cyan}Upload Summary:${colors.reset}`);
    console.log(`Total documents: ${allDocuments.length}`);
    console.log(`${colors.green}Successful: ${successCount}${colors.reset}`);
    console.log(`${colors.red}Failed: ${errorCount}${colors.reset}`);
    console.log('='.repeat(60) + '\n');

    if (successCount > 0) {
      console.log(`${colors.green}✓ Course data uploaded successfully!${colors.reset}`);
      console.log(`${colors.cyan}Namespace: ${NAMESPACE}${colors.reset}`);
      console.log(`${colors.cyan}You can now ask questions about:${colors.reset}`);
      console.log('  • Course information (FD Sport Performance and Exercise)');
      console.log('  • Module details and descriptions');
      console.log('  • Assessment requirements and deadlines');
      console.log('  • Module tutors and credits');
      console.log('  • Academic calendar and important dates\n');
    }

  } catch (error) {
    console.error(`${colors.red}✗ Fatal error during upload:${colors.reset}`, error.message);
    process.exit(1);
  }
}

/**
 * Test the chatbot with sample queries
 */
async function testChatbot() {
  const testQueries = [
    "What modules are in Year 1 Semester 1?",
    "When is the academic calendar for 2025-2026?",
    "Who is the tutor for the Alternative Physical Activity module?",
    "What are the assessment deadlines for Professional Development?",
    "Tell me about the Psychology of Sport and Exercise module"
  ];

  console.log(`${colors.cyan}Testing chatbot with sample queries...${colors.reset}\n`);

  for (const query of testQueries) {
    try {
      console.log(`${colors.yellow}Q: ${query}${colors.reset}`);
      
      const response = await axios.post(`${SERVER_URL}/api/chat`, {
        message: query,
        namespace: NAMESPACE
      });

      console.log(`${colors.green}A: ${response.data.response}${colors.reset}\n`);
      
      // Small delay between queries
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`${colors.red}Error: ${error.message}${colors.reset}\n`);
    }
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    await testChatbot();
  } else {
    await uploadCourseData();
    
    // Ask if user wants to run tests
    console.log(`${colors.cyan}To test the chatbot with sample queries, run:${colors.reset}`);
    console.log(`node upload-course-data.js --test\n`);
  }
}

// Check if server is running
axios.get(`${SERVER_URL}/api/health`)
  .then(() => {
    console.log(`${colors.green}✓ Server is running${colors.reset}\n`);
    main();
  })
  .catch(() => {
    console.error(`${colors.red}✗ Server is not running on ${SERVER_URL}${colors.reset}`);
    console.error(`${colors.yellow}Please start the server first:${colors.reset} node server.js\n`);
    process.exit(1);
  });

