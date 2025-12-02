# 🧠 Intelligent Suggestions Feature

## Overview

The RAG Chatbot now includes **Intelligent Suggestions** powered by semantic search and embeddings. When a student's query matches multiple similar items in the knowledge base, Oracle (the AI assistant) will automatically detect the ambiguity and present clear options for the student to choose from.

## How It Works

### 1. **Embeddings-Based Matching**
When a student asks a question:
- The query is converted to a vector embedding using OpenAI's `text-embedding-3-small` model
- Pinecone performs semantic search to find the top-k most similar items (typically 10-15 results)
- Each match includes a similarity score (0-1) indicating relevance

### 2. **Ambiguity Detection**
The system analyzes the top-k matches to identify potential ambiguities:
- **Groups matches by type** (module, assessment, course, etc.)
- **Identifies similar-scoring items** within 0.15 similarity threshold
- **Detects when 2+ items could match** the student's query

### 3. **Intelligent Presentation**
When ambiguity is detected, Oracle:
- **Recognizes the multiple matches** from the embeddings results
- **Presents clear options** using distinguishing metadata (year, semester, module code, etc.)
- **Ranks by relevance** based on similarity scores from the embeddings model
- **Invites clarification** from the student

## Example Scenarios

### Scenario 1: Similar Module Names

**Student Query:**
```
"What's the deadline for Academic Research?"
```

**Embeddings Return:**
- Match 1: "Academic Research and Study Skills" (Year 1) - 87.3% similarity
- Match 2: "Advanced Academic Research" (Year 2) - 85.1% similarity

**Oracle Response:**
```
I found 2 modules matching 'Academic Research':

1. **Academic Research and Study Skills** (Year 1, Semester 1, Module Code: W_HTH4C042R-2025.26)
2. **Advanced Academic Research** (Year 2, Semester 2, Module Code: W_HTH5C043R-2025.26)

Which module are you asking about?
```

### Scenario 2: Multiple Assessments

**Student Query:**
```
"When is the deadline for my essay?"
```

**Embeddings Return:**
- Match 1: Essay assessment for Module A (Week 10) - 89.2% similarity
- Match 2: Essay assessment for Module B (Week 12) - 88.7% similarity  
- Match 3: Essay assessment for Module C (Week 15) - 86.1% similarity

**Oracle Response:**
```
I found 3 essay assessments with upcoming deadlines. Which one are you asking about?

• **Professional Development Essay** (Year 1, Module: W_HTH4C042R) - Week 10 (Friday 14/11/2025)
• **Psychology of Sport Essay** (Year 1, Module: W_SPT4C045R) - Week 12 (Friday 28/11/2025)
• **Training and Fitness Essay** (Year 2, Module: W_SPT5C046R) - Week 15 (Friday 19/12/2025)

Let me know which module you need the deadline for!
```

### Scenario 3: Tutor Queries

**Student Query:**
```
"Who teaches Psychology?"
```

**Embeddings Return:**
- Match 1: "Psychology of Sport and Exercise" (Year 1, Tutor: Callum Lister) - 91.5% similarity
- Match 2: "Sport Psychology" (Year 2, Tutor: Dr. Sarah Jones) - 89.3% similarity

**Oracle Response:**
```
I see multiple Psychology modules. Which one do you mean?

• **Psychology of Sport and Exercise** (Year 1) - Tutor: [Callum Lister](mailto:callum.lister@ucleeds.ac.uk)
• **Sport Psychology** (Year 2) - Tutor: [Dr. Sarah Jones](mailto:sarah.jones@ucleeds.ac.uk)

Let me know which one you need information about!
```

## Technical Implementation

### Key Components

#### 1. **Enhanced System Prompt**
Located in `server.js` → `generateChatResponse()`

The system prompt now includes:
- **Core Logic for Intelligent Suggestions** - Instructions on when and how to present options
- **Example Scenarios** - Concrete examples of proper suggestion formatting
- **Metadata Usage Guidelines** - How to use year, semester, codes to differentiate items
- **Ranking Instructions** - Priority given to higher-scoring matches

#### 2. **Match Analysis Function**
Located in `server.js` → `analyzeMatchesForSuggestions()`

```javascript
function analyzeMatchesForSuggestions(matches, query) {
  // Groups matches by type (module, assessment, course)
  // Identifies items with similar scores (within 0.15 threshold)
  // Returns analysis with suggestion recommendations
}
```

**Output:**
```javascript
{
  hasSuggestions: true,
  suggestions: [
    {
      type: 'module',
      count: 2,
      items: [...],
      avgScore: 0.862
    }
  ],
  totalMatches: 10
}
```

#### 3. **Enhanced Context Formatting**
The context sent to Gemini now includes:

- **Similarity scores** for each match (as percentages)
- **Metadata** for differentiation (year, semester, module code, etc.)
- **Ambiguity warnings** when similar items are detected
- **Suggested actions** for the AI to take

**Example Context:**
```
<CONTEXT>
The following are the top 10 most relevant items from the knowledge base.
Each item includes a relevance score and metadata.

⚠️ AMBIGUITY DETECTED: The search found multiple similar items:
- 2 modules with similar relevance (avg: 86.2%)
  • Match 1: Academic Research and Study Skills (Year 1, Semester 1) - 87.3%
  • Match 2: Advanced Academic Research (Year 2, Semester 2) - 85.1%

**ACTION REQUIRED**: Present these as options to the student.

[Match 1] (Relevance: 87.3%) [type: module, year: 1, semester: 1]
Module: Academic Research and Study Skills...

---

[Match 2] (Relevance: 85.1%) [type: module, year: 2, semester: 2]
Module: Advanced Academic Research...

</CONTEXT>
```

## Configuration

### Adjusting Similarity Threshold

In `server.js` → `analyzeMatchesForSuggestions()`:

```javascript
// Current: Items within 0.15 (15%) of top score are considered similar
const similarItems = items.filter(item => (topScore - item.score) < 0.15);

// Make it more strict (fewer suggestions):
const similarItems = items.filter(item => (topScore - item.score) < 0.10);

// Make it more lenient (more suggestions):
const similarItems = items.filter(item => (topScore - item.score) < 0.20);
```

### Adjusting Top-K Results

In `server.js` → `/api/chat` endpoint:

```javascript
// Current settings
const isAssessmentQuery = message.toLowerCase().match(/assessment|deadline|exam/);
const topKValue = isAssessmentQuery ? 15 : 10;

// Increase for more comprehensive suggestions:
const topKValue = isAssessmentQuery ? 20 : 15;

// Decrease for faster performance:
const topKValue = isAssessmentQuery ? 10 : 5;
```

### Minimum Suggestion Count

In `server.js` → `analyzeMatchesForSuggestions()`:

```javascript
// Current: Only suggest when 2+ similar items exist
if (similarItems.length >= 2) {
  suggestions.push(...);
}

// Require 3+ similar items:
if (similarItems.length >= 3) {
  suggestions.push(...);
}
```

## Best Practices

### 1. **Rich Metadata in Your Data**
Ensure your course data includes comprehensive metadata:

```json
{
  "id": "module-academic-research",
  "text": "Module: Academic Research and Study Skills...",
  "metadata": {
    "type": "module",
    "module_code": "W_HTH4C042R-2025.26",
    "module_title": "Academic Research and Study Skills",
    "year": "1",
    "semester": "1",
    "tutor": "Shelley Sanderson",
    "credits": "20",
    "course_code": "FD-HAP-25/26"
  }
}
```

**Why this matters:**
- Enables intelligent filtering and grouping
- Helps Oracle differentiate between similar items
- Provides context for better suggestions

### 2. **Consistent Naming Conventions**
Use consistent naming for similar items:
- ✅ "Psychology of Sport and Exercise" vs "Sport Psychology"
- ✅ "Academic Research and Study Skills" vs "Advanced Academic Research"
- ❌ "Psych Module 1" vs "Psychology Thing Year 2" (too vague)

### 3. **Namespace Organization**
Organize your Pinecone data by namespaces:
```
ucl-courses/           # All course data
  ├── fd-sport/        # Foundation Degree Sport modules
  ├── bsc-sport/       # BSc Sport (Year 3) modules
  └── health/          # Health courses
```

Benefits:
- Faster queries (smaller search space)
- Better context isolation
- Easier data management

## Testing Intelligent Suggestions

### Test Queries to Try

Once you've uploaded course data, try these queries:

1. **Ambiguous Module Names:**
   - "Tell me about the Psychology module"
   - "What's in the Research module?"
   - "Who teaches Sport Performance?"

2. **Vague Assessment Queries:**
   - "When is my essay due?"
   - "What's the deadline for the presentation?"
   - "Tell me about the practical assessment"

3. **General Course Queries:**
   - "What modules are available?"
   - "Tell me about Year 1"
   - "What assessments do I have?"

### Expected Behavior

✅ **Good Response:**
- Identifies multiple matches
- Lists options with distinguishing details
- Uses bullet points or numbered lists
- Invites clarification

❌ **Poor Response:**
- Picks one arbitrarily without mentioning others
- Lists all details without clear options
- Provides info for wrong item
- Doesn't ask for clarification

## Monitoring and Debugging

### Console Logs

The system logs useful debugging information:

```bash
💬 Query: "What's the deadline for Academic Research?"
📊 Applying metadata filter: { year: '1' }
🔢 Embedding generated in 145ms
🔍 Retrieved 10 matches above threshold 0.3
📊 Match analysis: Found 1 ambiguous groups
🤖 LLM response generated in 1243ms
✅ Total response time: 1456ms
```

### Cache Statistics

Check if suggestions are being cached properly:

```bash
GET http://localhost:3000/api/cache/stats
```

Response:
```json
{
  "size": 42,
  "maxSize": 1000,
  "ttl": 1800000,
  "keys": [
    "ucl-courses:what's the deadline for academic research",
    "ucl-courses:who teaches psychology",
    ...
  ]
}
```

## Performance Impact

### Before Intelligent Suggestions
- Query time: ~500-800ms
- Context size: ~3-5 matches
- Disambiguation: Manual, required multiple queries

### After Intelligent Suggestions
- Query time: ~600-900ms (+100-200ms for analysis)
- Context size: ~10-15 matches (more comprehensive)
- Disambiguation: Automatic, single query

**Trade-off:** Slightly longer response time for much better user experience and fewer total queries.

## Future Enhancements

Potential improvements to consider:

1. **Conversational Context Tracking**
   - Remember previously discussed modules
   - Auto-filter based on student's course
   - Track semester context

2. **Fuzzy String Matching**
   - Handle typos better ("Psycology" → "Psychology")
   - Abbreviation expansion ("Phys Ed" → "Physical Education")

3. **User Preference Learning**
   - Remember student's year/semester
   - Prioritize frequently accessed modules
   - Personalize suggestion ordering

4. **Visual Differentiation**
   - Color-coding by year/semester
   - Icons for different types (📚 module, 📝 assessment, 🎓 course)
   - Timeline visualization for deadlines

## Troubleshooting

### Problem: Oracle doesn't suggest options, picks one arbitrarily

**Solution:**
- Check if multiple matches exist: Look at console logs for "Match analysis"
- Verify similarity threshold: Ensure items are within 0.15 of each other
- Review system prompt: Make sure it wasn't accidentally modified

### Problem: Too many suggestions, overwhelming the student

**Solution:**
- Increase similarity threshold in `analyzeMatchesForSuggestions()` (0.15 → 0.10)
- Decrease top-K value (15 → 10)
- Add more metadata filters to narrow results

### Problem: Suggestions missing key differentiating details

**Solution:**
- Enrich metadata in your course data JSON files
- Add more fields: year, semester, module_code, tutor, etc.
- Verify metadata is being uploaded correctly to Pinecone

### Problem: Same suggestions repeated for similar queries

**Solution:**
- This is expected behavior (caching is working!)
- Cache TTL is 30 minutes by default
- Clear cache if you've updated course data: `POST /api/cache/clear`

## Summary

The Intelligent Suggestions feature transforms the RAG Chatbot from a simple Q&A system into a proactive assistant that:

✅ **Detects ambiguity** automatically using embeddings similarity scores  
✅ **Presents clear options** with distinguishing metadata  
✅ **Reduces back-and-forth** by handling disambiguation in one query  
✅ **Improves user experience** with contextual, helpful responses  
✅ **Scales efficiently** using Pinecone's semantic search capabilities  

This creates a natural, conversational experience where students feel guided rather than frustrated by ambiguous information.

---

**Built with ❤️ using Pinecone Embeddings, OpenAI, and Google Gemini**


