# 🎯 Interactive Suggestion Tiles

## Overview

The RAG Chatbot now features **Interactive Suggestion Tiles** - beautiful, clickable UI elements that appear when Oracle detects ambiguous queries. Instead of just text-based suggestions, students can now **click tiles** to instantly select their choice and continue the conversation.

## 🎨 What It Looks Like

### Visual Example

When a student asks: **"What's the deadline for Academic Research?"**

Oracle's response appears with **clickable tiles below**:

```
┌─────────────────────────────────────────────────────────────┐
│ 🤖 Oracle                                                    │
│                                                              │
│ I found 2 modules matching 'Academic Research':             │
│                                                              │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ 💡 Choose an option:                                   ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                              │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ → Academic Research and Study Skills          [CLICK] ┃ │
│ ┃   📅 Year 1  📆 Semester 1  🔖 W_HTH4C042R-2025.26   ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                              │
│ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│ ┃ → Advanced Academic Research                  [CLICK] ┃ │
│ ┃   📅 Year 2  📆 Semester 2  🔖 W_HTH5C043R-2025.26   ┃ │
│ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
└─────────────────────────────────────────────────────────────┘
```

**Interaction:**
- Student **clicks** on a tile
- Tile animates with visual feedback
- Query is automatically sent
- Conversation continues seamlessly

## ✨ Features

### 1. **Beautiful Design**
- Glass-morphism style matching your UI
- Smooth hover animations
- Left border accent on hover
- Staggered entrance animations
- Responsive design for mobile

### 2. **Rich Information**
- **Title** - Module/course/assessment name
- **Icons** - Visual indicators (📅 📆 🔖 👤 ⏰)
- **Details** - Year, semester, module code, tutor, deadline
- **Score** - Based on embeddings similarity (used for ranking)

### 3. **Accessibility**
- Keyboard navigation (Tab + Enter/Space)
- ARIA roles and labels
- Focus indicators
- Screen reader friendly

### 4. **Smart Behavior**
- Only shows when ambiguity detected
- Maximum 5 tiles (top matches)
- Automatically ranked by relevance
- Disappears after print mode

## 🔧 Technical Implementation

### Backend (`server.js`)

#### 1. Extract Structured Suggestions

**Function:** `extractSuggestionsFromMatches(matches, matchAnalysis, query)`

**Purpose:** Converts embeddings matches into structured tile data

**Output:**
```javascript
[
  {
    id: "module-academic-research-1",
    title: "Academic Research and Study Skills",
    details: [
      { icon: "📅", label: "Year 1" },
      { icon: "📆", label: "Semester 1" },
      { icon: "🔖", label: "W_HTH4C042R-2025.26" }
    ],
    query: "Tell me more about Academic Research and Study Skills in Year 1 Semester 1",
    score: 0.873,
    type: "module"
  },
  // ... more suggestions
]
```

#### 2. Include in API Response

```javascript
{
  response: "AI generated text...",
  sources: [...],
  suggestions: [...],  // ← New field for tiles
  responseTime: 1243,
  cached: false
}
```

### Frontend (`app.js`)

#### 1. Create Suggestion Tiles

**Function:** `createSuggestionTiles(suggestions)`

**Creates:**
- Container with header
- Individual tiles with title and details
- Click and keyboard handlers
- Animated elements

#### 2. Handle Tile Clicks

**Function:** `handleSuggestionClick(query, tileElement)`

**Behavior:**
1. Visual feedback (scale + opacity change)
2. Set query in input field
3. Automatically send the message
4. Tiles disappear as new messages appear

### Styles (`styles.css`)

#### Key Classes

**`.suggestion-tiles`**
- Container for all tiles
- Flexbox column layout
- Top border separator
- Slide-in animation

**`.suggestion-tile`**
- Individual clickable tile
- Glass-morphism background
- Hover effects (transform, border, shadow)
- Left accent bar on hover
- Staggered entrance animations

**`.suggestion-tile-title`**
- Bold text with arrow (→)
- Arrow animates on hover

**`.suggestion-tile-details`**
- Icon + label pairs
- Flex wrap for responsiveness
- Muted color

## 🎯 User Experience Flow

### 1. Student Asks Ambiguous Question
```
Student: "When is my essay due?"
```

### 2. Oracle Detects Ambiguity
```
- Embeddings return 3 similar assessments
- Match analysis detects ambiguity
- Backend creates structured tiles
```

### 3. Tiles Appear with Response
```
Oracle: "You have 3 essay assessments:"

[Tile 1] Professional Development Essay
         📅 Year 1  ⏰ Week 10 (14/11/2025)

[Tile 2] Psychology Essay
         📅 Year 1  ⏰ Week 12 (28/11/2025)

[Tile 3] Sport Performance Essay
         📅 Year 2  ⏰ Week 15 (19/12/2025)
```

### 4. Student Clicks a Tile
```
- Tile animates (visual feedback)
- Query: "Tell me more about Professional Development Essay"
- Message sent automatically
- New response appears
```

### 5. Conversation Continues
```
Oracle: "The Professional Development Essay is worth 60% 
         and has a 1800 word limit. The deadline is..."
```

## 📱 Responsive Design

### Desktop (> 768px)
- Full-width tiles with all details
- Large text and spacing
- Smooth hover effects

### Mobile (≤ 768px)
- Compact tiles with smaller padding
- Reduced font sizes
- Touch-optimized tap targets
- Details wrap to multiple lines

### Tablet
- Balanced sizing
- Comfortable tap targets
- Readable text

## 🎨 Customization

### Change Tile Colors

In `styles.css`:

```css
.suggestion-tile {
    background: var(--glass-bg);           /* Tile background */
    border: 1.5px solid var(--glass-border); /* Border color */
}

.suggestion-tile:hover {
    border-color: var(--primary-blue);     /* Hover border */
    box-shadow: 0 4px 16px rgba(0, 189, 238, 0.2); /* Hover shadow */
}
```

### Change Accent Bar Color

```css
.suggestion-tile::before {
    background: var(--primary-blue);  /* Left accent bar */
}
```

### Adjust Animation Speed

```css
.suggestion-tile {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    /* Change 0.3s to adjust hover speed */
}

@keyframes tileSlideIn {
    /* Animation for tiles appearing */
    duration: 0.4s;  /* Change entrance speed */
}
```

### Modify Stagger Delays

```css
.suggestion-tile:nth-child(2) { animation-delay: 0.05s; }
.suggestion-tile:nth-child(3) { animation-delay: 0.1s; }
.suggestion-tile:nth-child(4) { animation-delay: 0.15s; }
/* Increase/decrease for slower/faster stagger */
```

### Change Maximum Number of Tiles

In `server.js`:

```javascript
// Line ~262
return suggestions.slice(0, 5);  // Change 5 to your preference
```

### Customize Icons

In `server.js` → `extractSuggestionsFromMatches()`:

```javascript
if (metadata.year) {
  details.push({
    icon: '🎓',  // Change icon here
    label: `Year ${metadata.year}`
  });
}
```

**Available Icons:**
- 📅 Calendar (year)
- 📆 Calendar (semester)
- 🔖 Bookmark (code)
- 👤 Person (tutor)
- ⏰ Clock (deadline)
- 🎓 Graduation cap (education)
- 📚 Books (course)
- 📝 Memo (assessment)
- 🏫 School (department)

## 🧪 Testing

### Manual Testing

1. **Start the server:**
```bash
npm start
```

2. **Try ambiguous queries:**
- "What's the deadline for Academic Research?"
- "Tell me about the Psychology module"
- "When is my essay due?"

3. **Verify tile appearance:**
- ✅ Tiles appear below Oracle's message
- ✅ Hover effects work smoothly
- ✅ Click sends the query
- ✅ Stagger animation plays

4. **Test keyboard navigation:**
- Tab through tiles
- Press Enter or Space to select
- Focus indicators visible

### Automated Testing

```bash
npm run test:suggestions
```

The test suite will:
- Send ambiguous queries
- Check for `suggestions` in API response
- Verify tile data structure
- Count detected suggestions

### Interactive Testing

```bash
npm run test:suggestions:interactive
```

Then try your own queries and watch the console for:
```
📊 Extracted N structured suggestions for UI tiles
```

## 🐛 Troubleshooting

### Problem: Tiles don't appear

**Check:**
1. Server logs show: `📊 Extracted N structured suggestions`
2. Browser console for `data.suggestions` in response
3. Match analysis detected ambiguity

**Solution:**
- Verify metadata in your course data
- Check similarity threshold (0.15 default)
- Ensure matches have rich metadata

### Problem: Tiles appear but don't animate

**Check:**
1. CSS loaded correctly
2. Browser supports CSS animations
3. No CSS conflicts

**Solution:**
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Check browser console for CSS errors
- Verify no ad-blockers interfering

### Problem: Click doesn't send message

**Check:**
1. `handleSuggestionClick` function called
2. Query appears in input field
3. `sendMessage()` triggered

**Solution:**
- Check browser console for JavaScript errors
- Verify event listeners attached
- Test with different browsers

### Problem: Tiles look broken on mobile

**Check:**
1. Responsive CSS media queries
2. Viewport meta tag present
3. Touch events working

**Solution:**
- Test on actual device, not just browser resize
- Check CSS `@media (max-width: 768px)`
- Verify tap targets are large enough (min 44x44px)

## 🚀 Performance

### Metrics

| Metric | Impact |
|--------|--------|
| Additional Backend Processing | +10-20ms |
| Additional Data Transferred | ~2-5KB per response |
| Frontend Rendering | <5ms |
| Animation Performance | 60fps |
| Memory Usage | Negligible |

### Optimization Tips

1. **Limit tile count:**
```javascript
return suggestions.slice(0, 3);  // Reduce from 5 to 3
```

2. **Simplify animations:**
```css
.suggestion-tile {
    transition: all 0.2s ease;  /* Simpler, faster */
}
```

3. **Reduce details:**
```javascript
// Only show most important details
if (metadata.year && metadata.semester) {
    details.push({ icon: '📅', label: `Y${metadata.year} S${metadata.semester}` });
}
```

## 📊 Analytics Potential

### Track User Behavior

**What to track:**
- Which tiles get clicked most
- Time to decision (how long before click)
- Abandoned suggestions (no click)
- Tile position preference (top vs. bottom)

**Implementation:**
```javascript
tile.addEventListener('click', () => {
    // Track analytics
    console.log(`Tile clicked: ${suggestion.title} (score: ${suggestion.score})`);
    
    // Send to analytics service
    // trackEvent('suggestion_click', { title, score, position: index });
    
    handleSuggestionClick(suggestion.query, tile);
});
```

## 🎓 Best Practices

### 1. Keep Tiles Focused
- Show only relevant information
- Don't overload with details
- Prioritize distinguishing characteristics

### 2. Use Clear Language
- Descriptive titles
- Consistent terminology
- Avoid jargon in labels

### 3. Ensure Visual Hierarchy
- Most relevant tile first (highest score)
- Clear header above tiles
- Adequate spacing between tiles

### 4. Test Accessibility
- Keyboard navigation works
- Screen reader announces tiles properly
- Focus indicators visible
- Color contrast sufficient

### 5. Mobile-First Design
- Touch targets large enough
- Text readable without zoom
- Tiles stack nicely
- No horizontal scroll

## 🌟 Future Enhancements

### Potential Improvements

1. **Multi-Select Tiles**
   - Allow selecting multiple options
   - "Compare" feature for similar items
   - Batch information display

2. **Preview on Hover**
   - Quick preview of full information
   - Tooltip with additional details
   - Image thumbnails (if available)

3. **Smart Reordering**
   - Learn from user selections
   - Personalized tile ordering
   - Contextual prioritization

4. **Rich Content Tiles**
   - Embedded media (images, icons)
   - Progress bars (for deadlines)
   - Status indicators (completed, upcoming)

5. **Tile Categories**
   - Group similar tiles
   - Color-coded by type
   - Collapsible sections

6. **Voice Selection**
   - "Select option 1"
   - Voice-activated tiles
   - Audio feedback

## 📚 Related Documentation

- `INTELLIGENT-SUGGESTIONS.md` - Core suggestion logic
- `QUICK-START-SUGGESTIONS.md` - Setup guide
- `README.md` - General documentation
- `IMPLEMENTATION-SUMMARY.md` - Technical details

## 🎉 Summary

Interactive Suggestion Tiles transform the chatbot from a text-based interface into a **modern, intuitive conversational UI**. Students can:

✅ **See options visually** - No need to read long lists  
✅ **Click to select** - One tap/click to continue  
✅ **Get instant feedback** - Smooth animations confirm action  
✅ **Navigate naturally** - Keyboard and mouse support  
✅ **Enjoy beautiful design** - Matches your brand aesthetic  

This creates a **delightful user experience** that reduces friction and makes finding information **fast and enjoyable**.

---

**Built with ❤️ using modern web technologies, semantic search, and thoughtful UX design**

