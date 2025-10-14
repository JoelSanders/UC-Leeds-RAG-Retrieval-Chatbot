# Upload Methods Comparison

This guide explains the two methods for uploading your course data to Pinecone and when to use each one.

## 📊 Quick Comparison

| Feature | Direct to Pinecone | Via Server API |
|---------|-------------------|----------------|
| **Server Required** | ❌ No | ✅ Yes |
| **Speed** | ⚡ Faster (parallel) | 🐢 Slower (sequential) |
| **Best For** | Bulk uploads, initial setup | Testing, small updates |
| **Cache** | ❌ Doesn't clear cache | ✅ Automatically clears |
| **Dependencies** | OpenAI + Pinecone | Just axios |
| **Error Handling** | Batch-level | Document-level |
| **Progress Tracking** | ✅ Detailed | ✅ Detailed |

## Method 1: Direct Upload to Pinecone ⚡ (RECOMMENDED)

### When to Use
- ✅ **Initial bulk upload** of all course data
- ✅ **Large datasets** (100+ documents)
- ✅ **Server is not running** or not needed
- ✅ **Faster uploads** are priority
- ✅ **Production deployments**

### How to Use

```bash
node upload-direct-to-pinecone.js
```

### What It Does
1. Reads JSON files directly
2. Generates embeddings using OpenAI API
3. Uploads vectors to Pinecone in batches (100 at a time)
4. Shows detailed progress and statistics
5. **Does NOT require the server to be running**

### Advantages
- ⚡ **Much faster** - processes documents in parallel batches
- 🎯 **More reliable** - batch uploads reduce network errors
- 💰 **Cost effective** - fewer API calls
- 🔧 **More control** - direct Pinecone SDK access
- 📊 **Better for large datasets**

### Disadvantages
- ❌ Doesn't automatically clear query cache (do manually if needed)
- ❌ Requires both OpenAI and Pinecone API keys

### Example Output
```
╔════════════════════════════════════════════════════╗
║   Direct Upload to Pinecone - Course Data        ║
╚════════════════════════════════════════════════════╝

✓ Environment variables verified
✓ Connected to index: your-index-name
✓ Loaded 29 documents

Generating embeddings and preparing vectors...
[1/29] Processing: academic-calendar-2025-26... ✓
[2/29] Processing: course-fd-sport-performance... ✓
...

Uploading vectors to Pinecone...
Batch 1/1 (29 vectors)... ✓ Uploaded

════════════════════════════════════════════════════════
📊 Upload Summary
════════════════════════════════════════════════════════
Total documents:           29
Embeddings generated:      29
Vectors uploaded:          29
Namespace:                 ucl-courses
Index:                     your-index-name
════════════════════════════════════════════════════════

✓ SUCCESS! All course data uploaded to Pinecone
```

## Method 2: Upload via Server API 🌐

### When to Use
- ✅ **Small updates** (1-10 documents)
- ✅ **Testing new documents** before bulk upload
- ✅ **Server is already running**
- ✅ **Need cache to be cleared** automatically
- ✅ **UI-based uploads** (using the web interface)

### How to Use

**Option A: Command Line**
```bash
# Start server first
node server.js

# Then upload in another terminal
node upload-course-data.js
```

**Option B: Web Interface**
1. Start server: `node server.js`
2. Open `http://localhost:3000`
3. Use the "Upload Document" sidebar

### What It Does
1. Sends documents to your Express server
2. Server generates embeddings
3. Server uploads to Pinecone
4. Automatically clears query cache
5. Updates server statistics

### Advantages
- ✅ **Automatic cache clearing** - keeps responses fresh
- ✅ **Integrates with server** - updates stats and logs
- ✅ **Simpler setup** - only needs server running
- ✅ **UI available** - can upload via web interface

### Disadvantages
- 🐢 **Slower** - sequential uploads
- 📉 **Less efficient** for bulk data
- ⚠️ **Requires server** to be running

## 🎯 Recommended Workflow

### For Initial Setup (First Time)
```bash
# Use Direct Upload (faster, no server needed)
node upload-direct-to-pinecone.js
```

### For Testing/Development
```bash
# Start server
node server.js

# Use web interface at http://localhost:3000
# Upload individual documents via UI
```

### For Updates (Adding New Modules)
```bash
# Option 1: Add to JSON and re-run direct upload
node upload-direct-to-pinecone.js

# Option 2: Use server API for small additions
node server.js  # in one terminal
node upload-course-data.js  # in another
```

### For Production Deployment
```bash
# Use direct upload in your deployment script
node upload-direct-to-pinecone.js

# This ensures data is loaded before server starts
```

## 📝 Environment Variables Required

### Direct Upload
```env
PINECONE_API_KEY=your_key_here
PINECONE_INDEX_NAME=your_index_name
OPENAI_API_KEY=your_openai_key_here
```

### Server Upload
```env
PINECONE_API_KEY=your_key_here
PINECONE_INDEX_NAME=your_index_name
OPENAI_API_KEY=your_openai_key_here
GEMINI_API_KEY=your_gemini_key_here  # Only needed for chat
```

## 🔧 Clearing the Cache

### If Using Direct Upload
After direct upload, clear the cache via API:

```bash
# Method 1: Using curl
curl -X POST http://localhost:3000/api/cache/clear

# Method 2: Using the web interface
# Navigate to settings (if available)

# Method 3: Restart the server
# Simply stop and restart: node server.js
```

### If Using Server Upload
Cache is automatically cleared - no action needed!

## 📊 Performance Comparison

**Test Setup:** 29 documents (course data)

| Metric | Direct Upload | Server API |
|--------|--------------|------------|
| **Upload Time** | ~15-20 seconds | ~30-40 seconds |
| **API Calls** | 29 (OpenAI) + 1 (Pinecone batch) | 29 (OpenAI) + 29 (Pinecone individual) |
| **Network Efficiency** | High (batched) | Lower (individual) |
| **Error Recovery** | Batch-level | Document-level |

## 🚨 Troubleshooting

### Direct Upload Issues

**Error: "Missing required environment variables"**
```bash
# Make sure .env file exists and contains:
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=...
OPENAI_API_KEY=...
```

**Error: "Failed to generate embedding"**
- Check OpenAI API key is valid
- Verify you have credits in OpenAI account
- Check network connection

**Error: "Failed to upload to Pinecone"**
- Verify Pinecone API key
- Ensure index exists and dimensions are correct (1536)
- Check Pinecone service status

### Server Upload Issues

**Error: "Server is not running"**
```bash
# Start the server first
node server.js
```

**Error: "Connection refused"**
- Verify server is running on correct port (3000)
- Check firewall settings
- Try `http://localhost:3000/api/health`

## 💡 Pro Tips

1. **First Time Setup:** Use direct upload for speed
2. **Development:** Keep server running and use web UI
3. **Large Updates:** Use direct upload and restart server
4. **Small Changes:** Use server API or web UI
5. **CI/CD Pipelines:** Use direct upload in deployment scripts

## 🎓 Example Use Cases

### Use Case 1: New Semester Data
You need to add 50 new modules for next semester.

**Recommended:** Direct Upload
```bash
# 1. Add new data to uc-course-data.json
# 2. Run direct upload
node upload-direct-to-pinecone.js
# 3. Restart server to clear cache
```

### Use Case 2: Fix One Deadline
A single assessment deadline changed.

**Recommended:** Server Upload or Web UI
```bash
# Option A: Edit JSON and use server
node server.js
node upload-course-data.js

# Option B: Use web interface
# 1. Open http://localhost:3000
# 2. Upload single document via UI
```

### Use Case 3: Production Deployment
Deploying to cloud for the first time.

**Recommended:** Direct Upload in deploy script
```bash
# In your deployment script:
npm install
node upload-direct-to-pinecone.js
node server.js
```

---

## 📚 Related Files

- `upload-direct-to-pinecone.js` - Direct upload script
- `upload-course-data.js` - Server API upload script
- `uc-course-data.json` - Year 1 course data
- `uc-course-data-year2.json` - Year 2 course data
- `COURSE-DATA-GUIDE.md` - Course data reference
- `README.md` - Main documentation

---

**Choose the method that best fits your workflow! 🚀**

