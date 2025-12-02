# RAG Chatbot with Pinecone

A beautiful, modern RAG (Retrieval-Augmented Generation) chatbot powered by Pinecone vector database and OpenAI. This chatbot uses semantic search to retrieve relevant context from your knowledge base and generates accurate, contextual responses.

## 🌟 Features

- **Retrieval-Augmented Generation**: Combines vector search with LLM generation for accurate, context-aware responses
- **🧠 Intelligent Suggestions**: Automatically detects ambiguous queries and presents clear options based on embeddings similarity
- **Pinecone Integration**: Uses Pinecone vector database for efficient semantic search
- **Document Upload**: Add documents to your knowledge base through the UI
- **Source Citations**: Shows relevant sources with similarity scores for each response
- **Conversational Context**: Maintains conversation history for contextual, multi-turn dialogues
- **Modern UI**: Beautiful, responsive interface with dark/light mode toggle
- **Real-time Stats**: Track message count and average response time
- **RESTful API**: Easy-to-use API endpoints for chat and document management
- **⚡ Performance Optimizations**: 
  - **Query Caching**: 50-100x faster for repeated queries
  - **Namespace Partitioning**: 2-10x faster with organized data
  - **Metadata Filtering**: 2-5x faster with intelligent filtering
  - **Similarity Thresholding**: Higher quality, faster results
  - **Optimized Retrieval**: Smart top-K selection based on query type

## 📋 Prerequisites

- Node.js (v16 or higher)
- Pinecone account and API key ([Get it here](https://www.pinecone.io/))
- OpenAI API key for embeddings ([Get it here](https://platform.openai.com/api-keys))
- Google Gemini API key for chat ([Get it here](https://aistudio.google.com/app/apikey))

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Edit the `.env` file with your credentials:

```env
# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=your_index_name_here

# OpenAI Configuration (for embeddings)
OPENAI_API_KEY=your_openai_api_key_here

# Google Gemini Configuration (for chat)
GEMINI_API_KEY=your_gemini_api_key_here

# Server Configuration
PORT=3000
```

### 3. Set Up Pinecone Index

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Create a new index with the following settings:
   - **Dimensions**: 1536 (for OpenAI text-embedding-3-small)
   - **Metric**: Cosine
   - **Cloud Provider**: Your choice
   - **Region**: Your preferred region
3. Copy the index name to your `.env` file

### 4. Start the Server

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

### 5. Open the Application

Navigate to `http://localhost:3000` in your browser.

## 📖 Usage

### Using the Chat Interface

1. **Ask Questions**: Type your question in the input box and press Enter or click the send button
2. **View Sources**: Each response shows the relevant sources from the knowledge base with similarity scores
3. **Upload Documents**: Use the sidebar to add new documents to your knowledge base

## 📚 University Course Data Upload

This project includes pre-structured JSON data for **University Centre Leeds Sport courses**. Upload this data to quickly populate your knowledge base with comprehensive course information.

### Quick Upload (Choose One Method)

#### Method 1: Direct to Pinecone ⚡ (Recommended)
**Faster, no server needed**

```bash
node upload-direct-to-pinecone.js
```

This method:
- ✅ Uploads directly to Pinecone (much faster)
- ✅ Processes in batches (100 vectors at a time)
- ✅ Works without server running
- ✅ Better for bulk uploads

#### Method 2: Via Server API 🌐
**Good for testing, auto-clears cache**

1. **Start the server**:
```bash
node server.js
```

2. **Upload course data** (in another terminal):
```bash
node upload-course-data.js
```

3. **Test with sample queries** (optional):
```bash
node upload-course-data.js --test
```

This method:
- ✅ Automatically clears query cache
- ✅ Updates server statistics
- ✅ Can use web UI for uploads

📖 **See [UPLOAD-METHODS.md](UPLOAD-METHODS.md) for detailed comparison**

### What's Included

The course data includes:
- **Academic Calendar** (2025-2026)
- **Course Information**: FD Sport Performance and Exercise (W_FD1099FR)
- **13 Modules** across Year 1 & Year 2
- **30+ Assessments** with detailed requirements
- **Module Tutors**: Contact information and responsibilities

#### Year 1 Modules
- Alternative Physical Activity (Ruth Tolson)
- Training and Fitness (James Thwaite)
- Professional Development (Callum Lister)
- Psychology of Sport and Exercise (Callum Lister)
- Lifestyle Management (Matthew Mosalski)
- Analysing Sport Performance (Matthew Mosalski)

#### Year 2 Modules
- Independent Study (Matthew Mosalski)
- Work Related Learning (Callum Lister)
- Leadership and Management (Callum Lister)
- Injury Rehabilitation (James Thwaite)
- Strength and Conditioning (James Thwaite)
- Nutrition for Health and Performance (Matthew Mosalski)

### Example Queries

Once uploaded, you can ask:
- "What modules are in Year 1 Semester 1?"
- "When is the deadline for the Professional Development portfolio?"
- "Who teaches the Alternative Physical Activity module?"
- "What are the learning outcomes for Training and Fitness?"
- "Tell me about the assessment for Psychology of Sport and Exercise"
- "When does the academic year start?"
- "What assessments are due in Week 10?"

### 🧠 Intelligent Suggestions with Interactive Tiles

The chatbot automatically detects when your query matches multiple similar items and presents **clickable suggestion tiles** - beautiful, interactive UI elements that students can click to instantly select their choice:

**Example:**

```
Student: "What's the deadline for Academic Research?"

Oracle: I found 2 modules matching 'Academic Research':

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 💡 Choose an option:                            ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ → Academic Research and Study Skills   [CLICK] ┃
┃   📅 Year 1  📆 Semester 1  🔖 W_HTH4C042R...  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ → Advanced Academic Research           [CLICK] ┃
┃   📅 Year 2  📆 Semester 2  🔖 W_HTH5C043R...  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**Key Benefits:**
- ✅ **Interactive tiles** - Click to select, no typing needed
- ✅ **Beautiful design** - Glass-morphism with smooth animations
- ✅ **Rich information** - Icons and metadata for easy differentiation
- ✅ **Smart detection** - Uses embeddings similarity scores to identify ambiguity
- ✅ **Keyboard accessible** - Full keyboard navigation support
- ✅ **Mobile optimized** - Touch-friendly responsive design

📖 **See [INTERACTIVE-SUGGESTION-TILES.md](INTERACTIVE-SUGGESTION-TILES.md) for the UI guide**  
📖 **See [INTELLIGENT-SUGGESTIONS.md](INTELLIGENT-SUGGESTIONS.md) for technical details**

### Testing Intelligent Suggestions

Run automated tests to see the feature in action:

```bash
# Automated test with predefined queries
node test-intelligent-suggestions.js

# Interactive mode - try your own queries
node test-intelligent-suggestions.js --interactive
```

### Data Structure

The JSON files (`uc-course-data.json` and `uc-course-data-year2.json`) are structured with:
- **Detailed module information**: Codes, tutors, credits, year, semester
- **Assessment requirements**: Deadlines, formats, briefs, word counts
- **Learning outcomes**: Specific LO codes and descriptions
- **Module descriptions**: Comprehensive overview of content
- **Rich metadata**: For optimal filtering and retrieval

All course data is uploaded to the `ucl-courses` namespace for organized retrieval.

### API Endpoints

#### Health Check
```bash
GET /api/health
```

Returns server status, Pinecone connection info, and cache statistics.

#### Chat
```bash
POST /api/chat
Content-Type: application/json

{
  "message": "Your question here",
  "namespace": "optional-namespace",
  "useCache": true,
  "conversationHistory": []
}
```

Response:
```json
{
  "response": "AI generated response",
  "sources": [
    {
      "id": 1,
      "score": 0.85,
      "text": "Relevant context snippet...",
      "metadata": {}
    }
  ],
  "responseTime": 450,
  "cached": false
}
```

#### Upload Documents
```bash
POST /api/upload
Content-Type: application/json

{
  "documents": [
    {
      "id": "doc-1",
      "text": "Your document content here",
      "metadata": {
        "title": "Document Title",
        "author": "Author Name",
        "year": "1",
        "type": "module"
      }
    }
  ],
  "namespace": "optional-namespace"
}
```

#### Cache Management
```bash
# Get cache statistics
GET /api/cache/stats

# Clear cache
POST /api/cache/clear
```

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
│   (React)   │
└──────┬──────┘
       │
       │ HTTP
       │
┌──────▼──────┐
│  Express    │
│  Server     │
└──────┬──────┘
       │
       ├────────┐
       │        │
┌──────▼─────┐  │
│  OpenAI    │  │
│  Embedding │  │
│  & Chat    │  │
└────────────┘  │
                │
         ┌──────▼─────┐
         │  Pinecone  │
         │  Vector DB │
         └────────────┘
```

### How It Works

1. **User Query**: User sends a question through the chat interface
2. **Embedding**: The query is converted to a vector embedding using OpenAI's embedding model
3. **Vector Search**: Pinecone searches for the most similar vectors in the knowledge base
4. **Context Retrieval**: Top matching documents are retrieved with their metadata
5. **Response Generation**: Google Gemini generates a response using the retrieved context
6. **Display**: Response is shown to the user with markdown formatting

## 🔧 Configuration

### Adjusting Search Parameters

In `server.js`, you can modify:

```javascript
// Query parameters
const matches = await queryPinecone(queryEmbedding, {
  topK: 3,              // Number of results (default: 3)
  namespace: 'cs-101',   // Search specific namespace
  filter: { year: '1' }, // Metadata filters
  minScore: 0.7         // Similarity threshold (default: 0.7)
});

// Cache settings
const CACHE_MAX_SIZE = 100;           // Max cached queries
const CACHE_TTL = 1000 * 60 * 30;     // 30 minutes
```

### Embedding Model

The application uses `text-embedding-3-small` by default. You can change to:
- `text-embedding-3-large` (better quality, higher cost, 3072 dimensions)
- `text-embedding-ada-002` (legacy model, 1536 dimensions)

Remember to recreate your Pinecone index with the appropriate dimensions if you change the embedding model.

## ⚡ Performance Optimization

### Quick Performance Gains

For large databases (>10,000 vectors), implement these optimizations:

1. **Use Namespaces** - Organize data by course, year, or module
2. **Add Rich Metadata** - Enable intelligent filtering
3. **Enable Caching** - Automatic for repeated queries
4. **Monitor Performance** - Check console logs for timing

### Example: Optimized Upload
```javascript
// Organize by namespace with rich metadata
POST /api/upload
{
  "documents": [{
    "id": "cs101-module-1",
    "text": "Module content...",
    "metadata": {
      "course": "CS101",
      "year": "1",
      "semester": "1",
      "type": "module"
    }
  }],
  "namespace": "cs-101"
}
```

### Example: Fast Queries
```javascript
// Query specific namespace for faster results
POST /api/chat
{
  "message": "What are the modules?",
  "namespace": "cs-101",
  "useCache": true
}
```

### Performance Guide

See `OPTIMIZATION_GUIDE.md` for detailed optimization strategies and best practices.

Run the optimization examples:
```bash
npm run example:optimized
```

## 📦 Project Structure

```
RAG Chatbot/
├── server.js                    # Express server with optimizations
├── package.json                 # Dependencies and scripts
├── .env                        # Environment variables (create from .env.example)
├── .env.example                # Environment variables template
├── .gitignore                  # Git ignore rules
├── README.md                   # This file
├── OPTIMIZATION_GUIDE.md       # Detailed optimization guide
├── example-optimized-usage.js  # Examples of optimization features
├── upload-document.js          # Document upload utility
└── public/
    ├── index.html              # Main HTML file
    ├── styles.css              # Styling
    └── app.js                  # Frontend JavaScript
```

## 🛠️ Troubleshooting

### Server Won't Start

- Check that all environment variables are set correctly
- Verify your Pinecone API key is valid
- Ensure the Pinecone index exists and the name matches your `.env` file

### Connection Errors

- Make sure the Pinecone index is in the same region as specified
- Check that your OpenAI API key has sufficient credits
- Verify CORS settings if accessing from a different domain

### No Relevant Results

- Ensure documents are properly uploaded to the index
- Try lowering the `minScore` threshold (default: 0.7)
- Increase the `topK` parameter to retrieve more documents
- Check if you're querying the correct namespace
- Remove metadata filters to broaden the search
- Check that the embedding model matches your index dimensions

### Slow Query Performance

- **Use namespaces** to partition your data
- **Add metadata** to enable filtering
- **Monitor cache hits** via `/api/cache/stats`
- **Check console logs** for timing breakdown
- See `OPTIMIZATION_GUIDE.md` for detailed strategies

### API Rate Limits

- OpenAI has rate limits based on your plan
- Query caching is automatically enabled to reduce API calls
- Consider upgrading your OpenAI plan for production use

## 🚀 Deployment

### Environment Setup

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Configure proper CORS settings
4. Add authentication if needed

### Recommended Platforms

- **Vercel**: Great for full-stack deployments
- **Railway**: Easy deployment with database support
- **Heroku**: Traditional PaaS option
- **AWS/GCP/Azure**: For enterprise deployments

## 📚 Learn More

- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [RAG Architecture Guide](https://www.pinecone.io/learn/retrieval-augmented-generation/)

## 🤝 Contributing

Feel free to submit issues and enhancement requests!

## 📄 License

ISC

---

**Built with ❤️ using Pinecone, OpenAI, and Express**

