# 🎯 Context Service Optimization - Analysis & Recommendations

**Date**: October 27, 2025  
**Priority**: Medium (not blocking, but could improve efficiency)  
**Status**: Identified

---

## 🔍 **Issue Discovered**

User noticed that AI generation requests are sending **excessive context**:

### **Example from Recent Generation:**
```
Documents included: 9
- User Personas (appears 3 times - DUPLICATE!)
- Business Case (full document, very large)
- Ideation Documents (full document, very large)
- Project Summary
- User Stories
- Persona Assess Motivation (appears 2 times!)
- Template
- User info

Total context: ~3,650 tokens
Issue: Duplicates + irrelevant sections included
```

---

## ⚠️ **Problems Identified**

### **1. Duplicate Documents** 🔴
```typescript
// Current behavior:
Context includes:
- User Personas (draft, version 1)
- User Personas (draft, version 1) AGAIN!
- User Personas (published, version 1)

// Should be:
Context includes:
- User Personas (published version only, most recent)
```

### **2. Full Document Inclusion** 🟡
```typescript
// Current behavior:
Includes ENTIRE Ideation Document (~5000 words)
Includes ENTIRE Business Case (~4000 words)

// Should be:
Include SUMMARIES or relevant sections only
Use "Summary" field if available
Truncate to most relevant paragraphs
```

### **3. No Relevance Filtering** 🟡
```typescript
// Current behavior:
Includes ALL project documents

// Should be:
Filter by template type
Include only docs relevant to current task
Use semantic similarity
```

### **4. Not Using Document Summaries** 🟡
```typescript
// Context service sends:
Content: Full 4000-word document

// Should send:
Summary: 200-word summary field
+ Link to full document if needed
```

---

## 📊 **Impact Analysis**

### **Current State:**
- **Tokens used**: 3,650 (acceptable but wasteful)
- **Request time**: Longer due to large payload
- **Provider load**: Higher (contributing to rate limits)
- **Cost**: Higher (more tokens = more cost)
- **Clarity**: Too much context confuses AI

### **Optimized State** (Potential):
- **Tokens used**: ~1,500 (60% reduction)
- **Request time**: Faster
- **Provider load**: Lower
- **Cost**: 60% less
- **Clarity**: Better - focused context

---

## 🎯 **Recommended Fixes**

### **Priority 1: Remove Duplicates** 🔴
```typescript
// File: server/src/modules/context/extractor.ts

// BEFORE:
const documents = await getAllProjectDocuments(project_id)

// AFTER:
const documents = await getAllProjectDocuments(project_id)
const uniqueDocuments = removeDuplicates(documents, ['title', 'template_id'])
```

### **Priority 2: Use Summaries** 🟡
```typescript
// File: server/src/modules/context/extractor.ts

// BEFORE:
content: document.content  // Full content

// AFTER:
content: document.summary || truncate(document.content, 500)
```

### **Priority 3: Relevance Filtering** 🟡
```typescript
// File: server/src/modules/context/prioritizer.ts

// Add template-based filtering:
function filterRelevantDocuments(documents, currentTemplate) {
  // If generating "User Personas", prioritize:
  // - Other persona documents
  // - User stories
  // - Project summary
  // SKIP:
  // - Technical specs
  // - Risk registers (unless relevant)
}
```

### **Priority 4: Smart Truncation** 🟢
```typescript
// File: server/src/modules/context/token-manager.ts

// Instead of truncating at character limit:
// - Keep document structure (headers)
// - Keep first and last paragraphs
// - Summarize middle sections
// - Preserve key data (tables, lists)
```

---

## 🔨 **Implementation Plan**

### **Phase 1: Quick Wins** (1 hour)
```typescript
1. Add duplicate detection
   - Hash documents by (id, version)
   - Keep most recent version only
   
2. Prefer summaries over content
   - Check if document.summary exists
   - Use summary if available
   - Truncate content intelligently
```

### **Phase 2: Smart Filtering** (2 hours)
```typescript
3. Template-based relevance
   - Map templates to relevant doc types
   - Filter by relationship
   
4. Semantic similarity (optional)
   - Calculate similarity score
   - Include only relevant docs
```

### **Phase 3: Advanced** (Future)
```typescript
5. Hierarchical context
   - Show summaries first
   - Expand on demand
   - Progressive enhancement
   
6. User preferences
   - Let users control context depth
   - Save preferred settings
```

---

## 📝 **Code Changes Needed**

### **1. Duplicate Removal**

**File**: `server/src/modules/context/extractor.ts`

```typescript
// Add after line ~200
private static removeDuplicateDocuments(documents: any[]): any[] {
  const seen = new Map<string, any>();
  
  for (const doc of documents) {
    const key = `${doc.id || doc.title}-${doc.template_id}`;
    const existing = seen.get(key);
    
    // Keep the most recent or published version
    if (!existing || 
        doc.status === 'published' && existing.status !== 'published' ||
        new Date(doc.updated_at || doc.created_at) > new Date(existing.updated_at || existing.created_at)) {
      seen.set(key, doc);
    }
  }
  
  return Array.from(seen.values());
}
```

### **2. Prefer Summaries**

**File**: `server/src/modules/context/extractor.ts`

```typescript
// Modify document content extraction (around line ~150)
private static formatDocument(doc: any): string {
  const title = doc.title || 'Untitled';
  const status = doc.status || 'unknown';
  const framework = doc.framework || 'null';
  
  // CHANGE THIS:
  // const content = doc.content || 'No content';
  
  // TO THIS:
  const content = doc.summary || 
                  (doc.content ? TokenManager.truncateToTokenLimit(doc.content, 500) : 'No content');
  
  return `[DOCUMENT] (${framework ? `Framework: ${framework}, ` : ''}Status: ${status}):
Document: ${title}
Framework: ${framework}
Status: ${status}
Version: ${doc.version || 1}
Content:
${content}

`;
}
```

### **3. Template-Based Filtering**

**File**: `server/src/modules/context/prioritizer.ts`

```typescript
// Add new method (around line ~300)
static filterByTemplateRelevance(
  documents: any[],
  currentTemplate: string
): any[] {
  const relevanceMap: Record<string, string[]> = {
    'User Persona': ['User Stories', 'Persona', 'Business Case', 'Project Summary'],
    'Technical Spec': ['Architecture', 'Design', 'Requirements'],
    'Risk Register': ['Risk', 'Issue', 'RAID'],
    // ... add more mappings
  };
  
  const relevantTypes = relevanceMap[currentTemplate] || [];
  
  return documents.filter(doc => 
    !currentTemplate || // Include all if no template
    relevantTypes.length === 0 || // Include all if no mapping
    relevantTypes.some(type => 
      doc.title?.includes(type) || 
      doc.template_name?.includes(type)
    )
  );
}
```

---

## 🧪 **Testing Plan**

### **Test Cases:**

1. **Duplicate Detection**
   ```
   Input: 3 versions of "User Personas"
   Expected: 1 version (published or most recent)
   ```

2. **Summary Preference**
   ```
   Input: Document with 5000-word content + 200-word summary
   Expected: Summary used in context
   ```

3. **Token Reduction**
   ```
   Input: Context with 9 documents
   Expected: Reduced to 4-5 most relevant
   Token reduction: 50-70%
   ```

4. **Template Filtering**
   ```
   Input: Generating "User Persona" doc
   Expected: Include persona/stories, exclude technical specs
   ```

---

## 📈 **Expected Improvements**

### **Metrics:**

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Avg Context Tokens** | 3,500 | 1,500 | -57% |
| **Duplicate Docs** | 2-3 per request | 0 | -100% |
| **Request Time** | 3-5 sec | 2-3 sec | -40% |
| **Token Cost** | $0.01/req | $0.004/req | -60% |
| **Provider Load** | High | Medium | Better |
| **AI Quality** | Good | Better | Focused context |

---

## 🚀 **Rollout Plan**

### **Week 1: Quick Fixes**
- ✅ Implement duplicate detection
- ✅ Implement summary preference
- ✅ Add context optimization flag (opt-in)
- ✅ Monitor impact

### **Week 2: Validation**
- ✅ A/B test with users
- ✅ Measure quality impact
- ✅ Adjust thresholds

### **Week 3: Full Rollout**
- ✅ Enable by default
- ✅ Add user controls
- ✅ Update documentation

---

## 🔍 **Monitoring**

### **Metrics to Track:**

```sql
-- Context efficiency query
SELECT 
  DATE_TRUNC('day', created_at) as date,
  AVG(COALESCE((response_metadata->'context'->>'tokens')::int, 0)) as avg_context_tokens,
  AVG(total_tokens) as avg_total_tokens,
  AVG(response_time_ms) as avg_response_time,
  COUNT(*) as requests
FROM ai_usage_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
```

---

## 💡 **Quick Workaround (Until Fixed)**

### **Option 1: Manual Context Reduction**
Users can reduce context by:
- Archiving old document versions
- Removing draft duplicates
- Using more specific generation requests

### **Option 2: Use Higher-Capacity Models**
- **Google Gemini 1.5**: 1M tokens (vs Mistral 32K)
- **GPT-4 Turbo**: 128K tokens
- Current context will be negligible

### **Option 3: Disable Context (Temporary)**
```typescript
// In generation request:
{
  include_context: false,  // Skip automatic context
  prompt: "..." // Manually craft prompt
}
```

---

## 🎓 **Lessons Learned**

1. **More Context ≠ Better Results**
   - Quality > Quantity
   - Focused context helps AI focus
   - Duplicates confuse models

2. **Token Limits Matter**
   - Even with large limits, less is better
   - Faster requests, lower cost
   - Reduces provider load

3. **Smart Defaults**
   - Use summaries when available
   - Filter by relevance automatically
   - Deduplicate always

4. **User Control**
   - Some users want full context
   - Others want minimal
   - Provide options

---

## 📚 **References**

- Context Service: `server/src/modules/context/`
- Token Manager: `server/src/modules/context/token-manager.ts`
- Prioritizer: `server/src/modules/context/prioritizer.ts`
- Extractor: `server/src/modules/context/extractor.ts`

---

## ✅ **Action Items**

- [ ] Implement duplicate detection (Priority 1)
- [ ] Implement summary preference (Priority 1)
- [ ] Add template-based filtering (Priority 2)
- [ ] Add user controls for context depth (Priority 3)
- [ ] Monitor context efficiency metrics (Ongoing)
- [ ] Document best practices (Priority 2)

---

**Status**: 🟡 **Analysis Complete - Ready for Implementation**  
**Impact**: Medium (improves efficiency, not critical)  
**Effort**: Low to Medium (1-2 days)  
**Dependencies**: None

---

*Created: October 27, 2025*  
*Issue Reporter: User observation during document generation*  
*Related: AI analytics system, provider optimization*

