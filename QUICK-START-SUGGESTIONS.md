# 🚀 Quick Start: Interactive Suggestion Tiles

This guide will help you get the **interactive suggestion tiles** feature up and running in 5 minutes. When students ask ambiguous questions, Oracle will present **beautiful, clickable tiles** they can tap to continue the conversation.

## ✅ Prerequisites Checklist

- [ ] Node.js installed (v16+)
- [ ] Pinecone account and API key
- [ ] OpenAI API key
- [ ] Google Gemini API key
- [ ] `.env` file configured

## 📝 Step-by-Step Setup

### 1. Install Dependencies

If you haven't already, install the required packages:

```bash
cd "RAG Chatbot"
npm install
```

This will install the new `axios` dependency needed for testing.

### 2. Verify Your Environment

Make sure your `.env` file has all required keys:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
OPENAI_API_KEY=your_openai_api_key
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

### 3. Start the Server

```bash
npm start
```

You should see:
```
🎓 UC Oracle - Intelligent Course Assistant
📍 Server: http://localhost:3000
🔌 Pinecone Index: your-index-name
🤖 Chat Model: Gemini 2.5 Flash Lite Preview
📊 Embedding Model: OpenAI text-embedding-3-small
```

### 4. Upload Course Data (First Time Only)

If you haven't uploaded course data yet:

```bash
# In a new terminal window
npm run upload:direct
```

This uploads your course data to Pinecone with rich metadata needed for intelligent suggestions.

### 5. Test Intelligent Suggestions

Run the automated test suite:

```bash
npm run test:suggestions
```

This will test various ambiguous queries and show you how Oracle responds with intelligent suggestions.

### 6. Try Interactive Mode

For hands-on testing:

```bash
npm run test:suggestions:interactive
```

Then try queries like:
- "What's the deadline for Academic Research?"
- "Tell me about the Psychology module"
- "Who teaches Professional Development?"

### 7. Use the Web Interface

Open your browser to `http://localhost:3000` and try these queries:

**Ambiguous Queries (expect multiple suggestions):**
- "What modules are in Year 1?"
- "When is my essay due?"
- "Tell me about the Research module"

**Specific Queries (expect direct answers):**
- "Who is the tutor for Alternative Physical Activity?"
- "What's the deadline for Training and Fitness essay?"
- "Tell me about module W_HTH4C042R-2025.26"

## 🎯 What to Expect

### ✅ Good Response (With Interactive Tiles)

When you ask: **"What's the deadline for Academic Research?"**

Oracle should respond with **clickable tiles**:

```
I found 2 modules matching 'Academic Research':

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 💡 Choose an option:                          ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ → Academic Research and Study Skills [CLICK] ┃
┃   📅 Year 1  📆 Semester 1                   ┃
┃   🔖 W_HTH4C042R-2025.26                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ → Advanced Academic Research          [CLICK] ┃
┃   📅 Year 2  📆 Semester 2                   ┃
┃   🔖 W_HTH5C043R-2025.26                      ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

**What happens:**
1. Tiles appear below Oracle's message
2. Student hovers → Tile animates (border glows, transforms)
3. Student clicks → Visual feedback, query sent automatically
4. Conversation continues with selected option
```

### ✅ Good Response (Direct Answer)

When you ask: **"Who teaches Alternative Physical Activity?"**

Oracle should respond with:
```
The tutor for Alternative Physical Activity is Ruth Tolson.
You can contact her at ruth.tolson@ucleeds.ac.uk
```

## 🔍 Understanding the Console Output

When the server processes a query, you'll see:

```bash
💬 Query: "What's the deadline for Academic Research?"
📊 Applying metadata filter: {}
🔢 Embedding generated in 145ms
🔍 Retrieved 10 matches above threshold 0.3
📊 Match analysis: Found 1 ambiguous groups    ← Ambiguity detected!
🤖 LLM response generated in 1243ms
✅ Total response time: 1456ms
```

The key line is **"Match analysis: Found 1 ambiguous groups"** - this means Oracle detected similar items and will present options.

## 🛠️ Troubleshooting

### Problem: No suggestions, only direct answers

**Possible causes:**
1. Your course data doesn't have similar items
2. Queries are too specific (include module codes)
3. Similarity threshold is too strict

**Solution:**
- Try more ambiguous queries
- Check console for "Match analysis: No ambiguities detected"
- Review `INTELLIGENT-SUGGESTIONS.md` for threshold adjustment

### Problem: "Server is not responding"

**Solution:**
```bash
# Make sure server is running
npm start

# In another terminal, run tests
npm run test:suggestions
```

### Problem: Too many suggestions

**Solution:**
Adjust the similarity threshold in `server.js`:

```javascript
// Line ~220 in analyzeMatchesForSuggestions()
const similarItems = items.filter(item => (topScore - item.score) < 0.10);
// Changed from 0.15 to 0.10 for stricter matching
```

### Problem: Missing distinguishing details

**Solution:**
Enrich your course data with more metadata:

```json
{
  "metadata": {
    "type": "module",
    "module_title": "Academic Research and Study Skills",
    "module_code": "W_HTH4C042R-2025.26",
    "year": "1",
    "semester": "1",
    "tutor": "Shelley Sanderson"
  }
}
```

## 📚 Next Steps

1. **Read the full documentation:** `INTELLIGENT-SUGGESTIONS.md`
2. **Customize the system:** Adjust prompts and thresholds
3. **Add more data:** Upload additional courses with similar names
4. **Monitor performance:** Check cache stats at `/api/cache/stats`
5. **Share feedback:** Test with real student queries

## 🎓 Example Use Cases

### Use Case 1: Student Doesn't Remember Exact Module Name

**Query:** "What's the deadline for that sport psychology thing?"

**Oracle:** 
```
I found these modules related to sport psychology:

• Psychology of Sport and Exercise (Year 1, Semester 2)
• Sport Psychology (Year 2, Semester 1)

Which one are you asking about?
```

### Use Case 2: Multiple Assessments with Similar Names

**Query:** "When is the essay due?"

**Oracle:**
```
You have 3 essay assessments:

1. Professional Development Essay - Week 10 (14/11/2025)
2. Psychology Essay - Week 12 (28/11/2025)
3. Sport Performance Essay - Week 15 (19/12/2025)

Which essay deadline do you need?
```

### Use Case 3: Follow-up Question

**First Query:** "Tell me about the modules in Year 1"

**Oracle:** *Lists all Year 1 modules*

**Follow-up Query:** "What's the deadline for Academic Research?"

**Oracle:** *(Uses conversation context to know you're in Year 1)*
```
For the Academic Research and Study Skills module (Year 1), 
there are two assessments:

1. Essay - Week 10 (Friday 14/11/2025 at 12:00 PM)
2. Presentation - Week 15 (Friday 09/01/2026 at 12:00 PM)

Which deadline are you asking about?
```

## 💡 Pro Tips

1. **Use ambiguous queries** to test suggestions
2. **Check console logs** to see how matches are analyzed
3. **Conversation context matters** - Oracle remembers previous questions
4. **Rich metadata** = better suggestions
5. **Test in interactive mode** for quick iteration

## 🎉 You're Ready!

The intelligent suggestions feature is now fully operational. Try it out with your own queries and see how Oracle helps students navigate ambiguous information!

---

**Need help?** Check:
- `INTELLIGENT-SUGGESTIONS.md` - Full feature documentation
- `README.md` - General setup and usage
- `OPTIMIZATION_GUIDE.md` - Performance tuning

**Questions or issues?** Review the troubleshooting section above or examine the console logs for diagnostic information.


