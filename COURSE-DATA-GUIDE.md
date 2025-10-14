# University Centre Leeds Course Data - Quick Reference Guide

## 📋 Overview

This guide explains how to use the pre-structured University Centre Leeds Sport course data with your RAG chatbot for optimal responses about courses, modules, assessments, and schedules.

## 🗂️ Files Created

### JSON Data Files
1. **`uc-course-data.json`** - Year 1 modules and assessments
   - 6 modules (Alternative Physical Activity, Training and Fitness, Professional Development, etc.)
   - Academic calendar for 2025-2026
   - Course overview for FD Sport Performance and Exercise

2. **`uc-course-data-year2.json`** - Year 2 modules and assessments
   - 7 modules (Independent Study, Work Related Learning, Leadership and Management, etc.)
   - Advanced level courses and assessments

### Upload Script
**`upload-course-data.js`** - Automated upload tool
- Uploads all course data to Pinecone
- Uses the `ucl-courses` namespace for organization
- Provides progress tracking and error handling
- Includes testing functionality

## 🚀 How to Upload Course Data

### Step 1: Start the Server
```bash
node server.js
```

The server should start on `http://localhost:3000`

### Step 2: Upload the Data
```bash
node upload-course-data.js
```

You'll see:
- Progress bar showing upload status
- Success/failure for each document
- Summary statistics at the end
- Total upload time

**Expected Output:**
```
Starting University Centre Leeds Course Data Upload...

Loading Year 1 course data...
Loading Year 2 course data...
Total documents to upload: 29

[1/29] Uploading: academic_calendar - academic-calendar-2025-26
✓ Successfully uploaded

[2/29] Uploading: course_overview - FD Sport Performance and Exercise
✓ Successfully uploaded

...

============================================================
Upload Summary:
Total documents: 29
Successful: 29
Failed: 0
============================================================

✓ Course data uploaded successfully!
Namespace: ucl-courses
```

### Step 3: Test the Chatbot (Optional)
```bash
node upload-course-data.js --test
```

This will run 5 sample queries to verify the upload was successful.

## 💬 Sample Queries

Once uploaded, you can ask the chatbot questions like:

### About Modules
- "What modules are available in Year 1?"
- "Tell me about the Alternative Physical Activity module"
- "Who teaches Training and Fitness?"
- "How many credits is Psychology of Sport and Exercise?"
- "What modules are in Semester 2?"

### About Assessments
- "What are the assessment deadlines for Professional Development?"
- "Tell me about the report assessment for Lifestyle Management"
- "What is due in Week 10?"
- "What assessments does Ruth Tolson mark?"
- "What are the learning outcomes for the Training and Fitness presentation?"

### About the Course
- "What is the FD Sport Performance and Exercise course about?"
- "How long is the course?"
- "What department is the Sport course in?"

### About the Calendar
- "When does the academic year start?"
- "When are the reading weeks?"
- "When is the Christmas holiday?"
- "When does Week 1 commence?"

### About Tutors
- "Who is Callum Lister?"
- "What modules does James Thwaite teach?"
- "Who can I contact about Independent Study?"

## 📊 Data Structure

### Document Types
Each document in the JSON has a `type` field in metadata:

1. **`academic_calendar`** - Academic year dates and exclusions
2. **`course_overview`** - Course description and details
3. **`module`** - Module information, learning outcomes, descriptions
4. **`assessment`** - Assessment requirements, deadlines, briefs

### Metadata Fields

**Common Fields:**
- `type`: Document type
- `university`: "University Centre Leeds"
- `uploadTimestamp`: When the document was uploaded
- `namespace`: "ucl-courses"

**Module-Specific:**
- `module_code`: e.g., "W_SPT4C024R-2025.26"
- `module_title`: e.g., "Alternative Physical Activity"
- `tutor`: Module tutor name
- `credits`: Number of credits
- `year`: "1" or "2"
- `semester`: "1" or "2"
- `course_code`: Parent course code
- `department`: "Sport"

**Assessment-Specific:**
- `assessment_type`: "Report", "Presentation", "Practical", etc.
- `weight`: "50%", "100%", etc.
- `word_count`: Expected word count
- `deadline`: Week number or specific date
- `deadline_time`: If applicable (e.g., "12:00PM")
- `duration`: For practical/presentation assessments

## 🔍 Advanced Querying

The chatbot uses the optimized server with:

### Metadata Filtering
The server can automatically extract and filter by:
- Year (1 or 2)
- Semester (1 or 2)
- Module codes
- Assessment types
- Tutors

### Namespace Organization
All course data is in the `ucl-courses` namespace, keeping it separate from other documents.

### Query Caching
Repeated queries are cached for 99% faster responses on subsequent asks.

## 🛠️ Troubleshooting

### Server Not Running
```
✗ Server is not running on http://localhost:3000
Please start the server first: node server.js
```
**Solution:** Start the server with `node server.js` in another terminal

### Upload Failures
If some documents fail to upload:
1. Check your Pinecone API key in `.env`
2. Verify your index exists and has correct dimensions (1536)
3. Check your internet connection
4. Review the error messages for specific issues

### No Results from Queries
1. Verify the data was uploaded: Check the Pinecone dashboard
2. Ensure you're using the correct namespace: `ucl-courses`
3. Try clearing the cache: `POST http://localhost:3000/api/cache/clear`

## 📈 Performance Tips

1. **Use Specific Queries**: Instead of "Tell me about modules", ask "What modules are in Year 1 Semester 1?"

2. **Include Context**: "When is the deadline for the Professional Development portfolio?" is better than "When is the deadline?"

3. **Leverage Metadata**: The system automatically filters by year, semester, tutor, etc.

4. **Cache Warming**: Run common queries after upload to populate the cache

## 🎯 Next Steps

After uploading the course data:

1. **Test the chatbot** with various queries from the examples above
2. **Add more documents** using the UI or API
3. **Customize the upload script** for your own data formats
4. **Monitor performance** using the `/api/health` and `/api/cache/stats` endpoints

## 📝 Modifying the Data

To add or modify course data:

1. **Edit the JSON files**: `uc-course-data.json` or `uc-course-data-year2.json`
2. **Follow the existing structure**: Keep the same metadata fields
3. **Re-run the upload**: `node upload-course-data.js`
4. **Verify changes**: Test with relevant queries

### Adding a New Module

```json
{
  "id": "module-your-module-name",
  "text": "Module: Your Module Name\nModule Code: CODE\nModule Tutor: Name\n...",
  "metadata": {
    "type": "module",
    "module_code": "CODE",
    "module_title": "Your Module Name",
    "tutor": "Tutor Name",
    "credits": "20",
    "year": "1",
    "semester": "1",
    "course_code": "W_FD1099FR",
    "department": "Sport"
  }
}
```

## 🤝 Support

For issues or questions:
1. Check the main `README.md` for general setup
2. Review `OPTIMIZATION_GUIDE.md` for performance tuning
3. Check server logs for error details
4. Verify Pinecone dashboard for data status

---

**Happy querying! 🎓**

