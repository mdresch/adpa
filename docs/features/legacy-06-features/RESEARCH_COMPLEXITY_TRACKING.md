# Research Complexity Tracking

## Overview

The complexity score now includes **context research time** - the effort required to read and understand all source documents before writing. This provides a **TRUE estimate of manual effort**, not just writing time.

---

## The Problem

Previously, complexity only measured OUTPUT complexity (tables, sections, technical content). 

**Example:**
- Risk Management Plan references 5 other documents (Charter, Stakeholder Register, Requirements, Scope, Schedule)
- Old system: "Est. Manual Time: 1-2 days" ✅ (writing time only)
- **Missing**: 3-5 hours to READ those 5 documents first! ❌

---

## The Solution

### Two-Component Complexity Score

**Total Complexity = Output Complexity (60%) + Research Complexity (40%)**

```typescript
// OUTPUT COMPLEXITY (60 points max)
- Document structure (tables, hierarchy, length)
- Technical content density
- Writing difficulty

// RESEARCH COMPLEXITY (40 points max) - NEW!
- Number of source documents (0-10)
- Estimated reading time
- Context synthesis effort
```

### Reading Time Calculation

```typescript
sourceDocCount = 5 documents
estimatedWords = 5 × 1,500 = 7,500 words
readingSpeed = 250 words/minute
readingTime = 7,500 ÷ 250 ÷ 60 = 0.5 hours (30 minutes)
```

### Research Complexity Scale

| Source Docs | Research Score | Reading Time (Est.) |
|------------|----------------|---------------------|
| **0** | 0 points | N/A - No research |
| **1** | 5 points | ~6 minutes |
| **2-3** | 10 points | ~12-18 minutes |
| **4-5** | 20 points | ~24-30 minutes |
| **6-7** | 30 points | ~36-42 minutes |
| **8-10** | 40 points | ~48-60 minutes |

---

## Visual Display

### Enhanced Complexity Card

**Old Display:**
```
┌──────────────────────────────────┐
│ Complexity Level: Complex        │
│ Est. Manual Time: 1-2 days       │
└──────────────────────────────────┘
```

**New Display:**
```
┌──────────────────────────────────────────┐
│ Complexity Level: Complex                │
│ ────────────────────────────────────────│
│ 📚 Context Research:                     │
│    5 docs (~30 minutes)                  │
│ ✍️ Writing Time:                         │
│    1-2 days (8-16 hours)                 │
│ ────────────────────────────────────────│
│ Total Manual Effort:                     │
│    30 minutes + 1-2 days                 │
│ ────────────────────────────────────────│
│ ⚡ AI generated in 48 seconds            │
└──────────────────────────────────────────┘
```

---

## Example Scenarios

### Scenario 1: Project Charter (Early Phase)

**Context:**
- First major document in project
- Only 1 source document (Ideation Document)

**Complexity Breakdown:**
- Output Complexity: 45/60 (moderate structure, some tables)
- Research Complexity: 5/40 (1 document = minimal research)
- **Total: 50/100 = COMPLEX**

**Time Estimate:**
- 📚 Context Research: 1 doc (~6 minutes)
- ✍️ Writing Time: 1-2 days (8-16 hours)
- **Total Manual Effort: 6 minutes + 1-2 days**
- ⚡ AI Time: 35 seconds

**Savings:** ~1.5 days (vs. 1.5 days + 6 min)

---

### Scenario 2: Risk Management Plan (Mid Phase)

**Context:**
- Mid-lifecycle document
- 6 source documents (Charter, Stakeholder Register, Scope, Requirements, Schedule, Cost Management)

**Complexity Breakdown:**
- Output Complexity: 48/60 (many tables, technical content)
- Research Complexity: 30/40 (6 documents = heavy research)
- **Total: 78/100 = VERY COMPLEX**

**Time Estimate:**
- 📚 Context Research: 6 docs (~36 minutes)
- ✍️ Writing Time: 2-4 days (16-32 hours)
- **Total Manual Effort: 36 minutes + 2-4 days**
- ⚡ AI Time: 52 seconds

**Savings:** ~3 days (vs. 3 days + 36 min)

---

### Scenario 3: Integration Management Plan (Late Phase)

**Context:**
- Late-lifecycle comprehensive document
- 10 source documents (all management plans)

**Complexity Breakdown:**
- Output Complexity: 54/60 (very comprehensive, many references)
- Research Complexity: 40/40 (10 documents = extensive research)
- **Total: 94/100 = VERY COMPLEX**

**Time Estimate:**
- 📚 Context Research: 10 docs (~1 hour)
- ✍️ Writing Time: 2-4 days (16-32 hours)
- **Total Manual Effort: 1 hour + 2-4 days**
- ⚡ AI Time: 1 minute 8 seconds

**Savings:** ~3.5 days (vs. 4 days total)

---

## Technical Implementation

### Backend Changes

#### 1. Updated `calculateDocumentMetadata` Function

**File:** `server/src/utils/documentMetadata.ts`

```typescript
// NEW: Accept source documents
export function calculateDocumentMetadata(
  content: string,
  aiResponse: any,
  generationStart: Date,
  generationEnd: Date,
  options: {
    // ... existing options ...
    sourceDocuments?: any[]  // NEW
    contextStats?: any       // NEW
  }
): DocumentGenerationMetadata
```

#### 2. Research Complexity Calculation

**File:** `server/src/utils/documentMetadata.ts` (lines 328-350)

```typescript
// CONTEXT RESEARCH COMPLEXITY (40 points max)
const sourceDocCount = metadata.context?.documents_used || 0
const sourceDocWordEstimate = sourceDocCount * 1500 // Avg 1500 words per doc
const readingTimeHours = sourceDocWordEstimate / 250 / 60 // 250 words/min

const researchComplexity =
  (sourceDocCount === 0 ? 0 :       // No research needed
   sourceDocCount === 1 ? 5 :        // Minimal research (1 doc)
   sourceDocCount <= 3 ? 10 :        // Light research (2-3 docs)
   sourceDocCount <= 5 ? 20 :        // Moderate research (4-5 docs)
   sourceDocCount <= 7 ? 30 :        // Heavy research (6-7 docs)
   40)                               // Extensive research (8-10 docs)

metrics.complexityScore = Math.min(100, outputComplexity + researchComplexity)

// Store for display
metadata.researchComplexity = {
  sourceDocuments: sourceDocCount,
  estimatedReadingTimeHours: Math.round(readingTimeHours * 10) / 10,
  researchScore: researchComplexity,
  outputScore: outputComplexity
}
```

#### 3. Pass Source Documents from API

**File:** `server/src/routes/ai.ts` (lines 122-142)

```typescript
const metadata = calculateDocumentMetadata(
  content,
  result,
  generationStart,
  generationEnd,
  {
    // ... existing options ...
    sourceDocuments: req.body.source_documents || [],  // NEW
    contextStats: req.body.context_stats || null       // NEW
  }
)
```

### Frontend Changes

#### 1. Metadata Page Display

**File:** `app/projects/[id]/documents/[docId]/page.tsx` (lines 1226-1304)

```typescript
const research = document?.generation_metadata?.researchComplexity
const sourceDocCount = research?.sourceDocuments || 0
const readingTimeHours = research?.estimatedReadingTimeHours || 0

// Display breakdown:
// 📚 Context Research: 5 docs (~30 minutes)
// ✍️ Writing Time: 1-2 days
// Total Manual Effort: 30 minutes + 1-2 days
// ⚡ AI generated in 48 seconds
```

#### 2. Document View Page Display

**File:** `app/projects/[id]/documents/[docId]/view/page.tsx` (lines 1382-1454)

Same enhanced display as metadata page.

---

## Benefits

### For Users

✅ **Accurate Effort Estimates**: True manual effort including research time
✅ **Transparent ROI**: See exactly how much time AI saves (research + writing)
✅ **Better Planning**: Understand why some documents take longer
✅ **Context Awareness**: Visualize the knowledge synthesis happening behind the scenes

### For Project Management

✅ **Resource Planning**: Better estimates for manual document creation
✅ **Dependency Tracking**: See research effort scaled with document count
✅ **Productivity Metrics**: Quantify AI time savings more accurately
✅ **Training Insights**: Understand time required to onboard new team members

### For ROI Calculation

**Example: Risk Management Plan**

| Metric | Manual | AI | Savings |
|--------|--------|-----|---------|
| Context Research | 36 min | 0 sec* | 36 min |
| Writing Time | 16-32 hours | 52 sec | ~24 hours |
| **Total** | **~3 days** | **52 sec** | **~3 days** |

*AI reads and synthesizes context instantly

**ROI:** 99.98% time savings (3 days → 52 seconds)

---

## Configuration

### Adjust Reading Speed

Default: 250 words/minute (average professional)

```typescript
// server/src/utils/documentMetadata.ts, line 332
const readingTimeHours = sourceDocWordEstimate / 250 / 60

// For faster readers (300 wpm):
const readingTimeHours = sourceDocWordEstimate / 300 / 60

// For slower/detailed reading (200 wpm):
const readingTimeHours = sourceDocWordEstimate / 200 / 60
```

### Adjust Average Document Length

Default: 1,500 words per document

```typescript
// server/src/utils/documentMetadata.ts, line 331
const sourceDocWordEstimate = sourceDocCount * 1500

// For longer documents (2,000 words avg):
const sourceDocWordEstimate = sourceDocCount * 2000

// For shorter documents (1,000 words avg):
const sourceDocWordEstimate = sourceDocCount * 1000
```

### Adjust Research Weight

Default: Research = 40%, Output = 60%

```typescript
// To increase research importance (50/50 split):
const outputComplexity = ... // max 50 points
const researchComplexity = ... // max 50 points

// To decrease research importance (30/70 split):
const outputComplexity = ... // max 70 points
const researchComplexity = ... // max 30 points
```

---

## Future Enhancements

### Planned

- [ ] **Actual Word Count**: Use real source document word counts instead of estimates
- [ ] **Reading Difficulty Adjustment**: Factor in technical complexity of source docs
- [ ] **Comprehension Time**: Add synthesis/note-taking overhead
- [ ] **Learning Curve**: Factor in unfamiliar frameworks/domains

### Under Consideration

- [ ] **Domain Expertise Modifier**: Experts read faster, juniors slower
- [ ] **Document Freshness**: Recently read documents take less time
- [ ] **Cross-Reference Density**: More interconnected docs = higher research effort
- [ ] **Multi-language Penalty**: Translation overhead for non-native languages

---

## Related Documentation

- [Complex Document Dependencies](./COMPLEX_DOCUMENT_DEPENDENCIES.md)
- [10-Dimension Quality System](./10_DIMENSION_QUALITY_SYSTEM.md)
- [Source Documents Tracking](./SOURCE_DOCUMENTS_TRACKING.md)
- [Document Lifecycle Order System](./DOCUMENT_LIFECYCLE_ORDER_SYSTEM.md)

---

## Summary

**Research Complexity Tracking** ensures the complexity score reflects **TRUE manual effort**:

- ✅ **Context Research Time** (reading all source documents)
- ✅ **Writing Time** (creating the new document)
- ✅ **Total Manual Effort** = Research + Writing
- ✅ **Transparent Breakdown** in UI with visual time estimates
- ✅ **Accurate ROI** showing complete AI time savings

This feature transforms complexity from a "writing difficulty" metric into a comprehensive "total manual effort" metric, providing users with realistic time estimates and demonstrating the full value of AI-powered document generation.



## Overview

The complexity score now includes **context research time** - the effort required to read and understand all source documents before writing. This provides a **TRUE estimate of manual effort**, not just writing time.

---

## The Problem

Previously, complexity only measured OUTPUT complexity (tables, sections, technical content). 

**Example:**
- Risk Management Plan references 5 other documents (Charter, Stakeholder Register, Requirements, Scope, Schedule)
- Old system: "Est. Manual Time: 1-2 days" ✅ (writing time only)
- **Missing**: 3-5 hours to READ those 5 documents first! ❌

---

## The Solution

### Two-Component Complexity Score

**Total Complexity = Output Complexity (60%) + Research Complexity (40%)**

```typescript
// OUTPUT COMPLEXITY (60 points max)
- Document structure (tables, hierarchy, length)
- Technical content density
- Writing difficulty

// RESEARCH COMPLEXITY (40 points max) - NEW!
- Number of source documents (0-10)
- Estimated reading time
- Context synthesis effort
```

### Reading Time Calculation

```typescript
sourceDocCount = 5 documents
estimatedWords = 5 × 1,500 = 7,500 words
readingSpeed = 250 words/minute
readingTime = 7,500 ÷ 250 ÷ 60 = 0.5 hours (30 minutes)
```

### Research Complexity Scale

| Source Docs | Research Score | Reading Time (Est.) |
|------------|----------------|---------------------|
| **0** | 0 points | N/A - No research |
| **1** | 5 points | ~6 minutes |
| **2-3** | 10 points | ~12-18 minutes |
| **4-5** | 20 points | ~24-30 minutes |
| **6-7** | 30 points | ~36-42 minutes |
| **8-10** | 40 points | ~48-60 minutes |

---

## Visual Display

### Enhanced Complexity Card

**Old Display:**
```
┌──────────────────────────────────┐
│ Complexity Level: Complex        │
│ Est. Manual Time: 1-2 days       │
└──────────────────────────────────┘
```

**New Display:**
```
┌──────────────────────────────────────────┐
│ Complexity Level: Complex                │
│ ────────────────────────────────────────│
│ 📚 Context Research:                     │
│    5 docs (~30 minutes)                  │
│ ✍️ Writing Time:                         │
│    1-2 days (8-16 hours)                 │
│ ────────────────────────────────────────│
│ Total Manual Effort:                     │
│    30 minutes + 1-2 days                 │
│ ────────────────────────────────────────│
│ ⚡ AI generated in 48 seconds            │
└──────────────────────────────────────────┘
```

---

## Example Scenarios

### Scenario 1: Project Charter (Early Phase)

**Context:**
- First major document in project
- Only 1 source document (Ideation Document)

**Complexity Breakdown:**
- Output Complexity: 45/60 (moderate structure, some tables)
- Research Complexity: 5/40 (1 document = minimal research)
- **Total: 50/100 = COMPLEX**

**Time Estimate:**
- 📚 Context Research: 1 doc (~6 minutes)
- ✍️ Writing Time: 1-2 days (8-16 hours)
- **Total Manual Effort: 6 minutes + 1-2 days**
- ⚡ AI Time: 35 seconds

**Savings:** ~1.5 days (vs. 1.5 days + 6 min)

---

### Scenario 2: Risk Management Plan (Mid Phase)

**Context:**
- Mid-lifecycle document
- 6 source documents (Charter, Stakeholder Register, Scope, Requirements, Schedule, Cost Management)

**Complexity Breakdown:**
- Output Complexity: 48/60 (many tables, technical content)
- Research Complexity: 30/40 (6 documents = heavy research)
- **Total: 78/100 = VERY COMPLEX**

**Time Estimate:**
- 📚 Context Research: 6 docs (~36 minutes)
- ✍️ Writing Time: 2-4 days (16-32 hours)
- **Total Manual Effort: 36 minutes + 2-4 days**
- ⚡ AI Time: 52 seconds

**Savings:** ~3 days (vs. 3 days + 36 min)

---

### Scenario 3: Integration Management Plan (Late Phase)

**Context:**
- Late-lifecycle comprehensive document
- 10 source documents (all management plans)

**Complexity Breakdown:**
- Output Complexity: 54/60 (very comprehensive, many references)
- Research Complexity: 40/40 (10 documents = extensive research)
- **Total: 94/100 = VERY COMPLEX**

**Time Estimate:**
- 📚 Context Research: 10 docs (~1 hour)
- ✍️ Writing Time: 2-4 days (16-32 hours)
- **Total Manual Effort: 1 hour + 2-4 days**
- ⚡ AI Time: 1 minute 8 seconds

**Savings:** ~3.5 days (vs. 4 days total)

---

## Technical Implementation

### Backend Changes

#### 1. Updated `calculateDocumentMetadata` Function

**File:** `server/src/utils/documentMetadata.ts`

```typescript
// NEW: Accept source documents
export function calculateDocumentMetadata(
  content: string,
  aiResponse: any,
  generationStart: Date,
  generationEnd: Date,
  options: {
    // ... existing options ...
    sourceDocuments?: any[]  // NEW
    contextStats?: any       // NEW
  }
): DocumentGenerationMetadata
```

#### 2. Research Complexity Calculation

**File:** `server/src/utils/documentMetadata.ts` (lines 328-350)

```typescript
// CONTEXT RESEARCH COMPLEXITY (40 points max)
const sourceDocCount = metadata.context?.documents_used || 0
const sourceDocWordEstimate = sourceDocCount * 1500 // Avg 1500 words per doc
const readingTimeHours = sourceDocWordEstimate / 250 / 60 // 250 words/min

const researchComplexity =
  (sourceDocCount === 0 ? 0 :       // No research needed
   sourceDocCount === 1 ? 5 :        // Minimal research (1 doc)
   sourceDocCount <= 3 ? 10 :        // Light research (2-3 docs)
   sourceDocCount <= 5 ? 20 :        // Moderate research (4-5 docs)
   sourceDocCount <= 7 ? 30 :        // Heavy research (6-7 docs)
   40)                               // Extensive research (8-10 docs)

metrics.complexityScore = Math.min(100, outputComplexity + researchComplexity)

// Store for display
metadata.researchComplexity = {
  sourceDocuments: sourceDocCount,
  estimatedReadingTimeHours: Math.round(readingTimeHours * 10) / 10,
  researchScore: researchComplexity,
  outputScore: outputComplexity
}
```

#### 3. Pass Source Documents from API

**File:** `server/src/routes/ai.ts` (lines 122-142)

```typescript
const metadata = calculateDocumentMetadata(
  content,
  result,
  generationStart,
  generationEnd,
  {
    // ... existing options ...
    sourceDocuments: req.body.source_documents || [],  // NEW
    contextStats: req.body.context_stats || null       // NEW
  }
)
```

### Frontend Changes

#### 1. Metadata Page Display

**File:** `app/projects/[id]/documents/[docId]/page.tsx` (lines 1226-1304)

```typescript
const research = document?.generation_metadata?.researchComplexity
const sourceDocCount = research?.sourceDocuments || 0
const readingTimeHours = research?.estimatedReadingTimeHours || 0

// Display breakdown:
// 📚 Context Research: 5 docs (~30 minutes)
// ✍️ Writing Time: 1-2 days
// Total Manual Effort: 30 minutes + 1-2 days
// ⚡ AI generated in 48 seconds
```

#### 2. Document View Page Display

**File:** `app/projects/[id]/documents/[docId]/view/page.tsx` (lines 1382-1454)

Same enhanced display as metadata page.

---

## Benefits

### For Users

✅ **Accurate Effort Estimates**: True manual effort including research time
✅ **Transparent ROI**: See exactly how much time AI saves (research + writing)
✅ **Better Planning**: Understand why some documents take longer
✅ **Context Awareness**: Visualize the knowledge synthesis happening behind the scenes

### For Project Management

✅ **Resource Planning**: Better estimates for manual document creation
✅ **Dependency Tracking**: See research effort scaled with document count
✅ **Productivity Metrics**: Quantify AI time savings more accurately
✅ **Training Insights**: Understand time required to onboard new team members

### For ROI Calculation

**Example: Risk Management Plan**

| Metric | Manual | AI | Savings |
|--------|--------|-----|---------|
| Context Research | 36 min | 0 sec* | 36 min |
| Writing Time | 16-32 hours | 52 sec | ~24 hours |
| **Total** | **~3 days** | **52 sec** | **~3 days** |

*AI reads and synthesizes context instantly

**ROI:** 99.98% time savings (3 days → 52 seconds)

---

## Configuration

### Adjust Reading Speed

Default: 250 words/minute (average professional)

```typescript
// server/src/utils/documentMetadata.ts, line 332
const readingTimeHours = sourceDocWordEstimate / 250 / 60

// For faster readers (300 wpm):
const readingTimeHours = sourceDocWordEstimate / 300 / 60

// For slower/detailed reading (200 wpm):
const readingTimeHours = sourceDocWordEstimate / 200 / 60
```

### Adjust Average Document Length

Default: 1,500 words per document

```typescript
// server/src/utils/documentMetadata.ts, line 331
const sourceDocWordEstimate = sourceDocCount * 1500

// For longer documents (2,000 words avg):
const sourceDocWordEstimate = sourceDocCount * 2000

// For shorter documents (1,000 words avg):
const sourceDocWordEstimate = sourceDocCount * 1000
```

### Adjust Research Weight

Default: Research = 40%, Output = 60%

```typescript
// To increase research importance (50/50 split):
const outputComplexity = ... // max 50 points
const researchComplexity = ... // max 50 points

// To decrease research importance (30/70 split):
const outputComplexity = ... // max 70 points
const researchComplexity = ... // max 30 points
```

---

## Future Enhancements

### Planned

- [ ] **Actual Word Count**: Use real source document word counts instead of estimates
- [ ] **Reading Difficulty Adjustment**: Factor in technical complexity of source docs
- [ ] **Comprehension Time**: Add synthesis/note-taking overhead
- [ ] **Learning Curve**: Factor in unfamiliar frameworks/domains

### Under Consideration

- [ ] **Domain Expertise Modifier**: Experts read faster, juniors slower
- [ ] **Document Freshness**: Recently read documents take less time
- [ ] **Cross-Reference Density**: More interconnected docs = higher research effort
- [ ] **Multi-language Penalty**: Translation overhead for non-native languages

---

## Related Documentation

- [Complex Document Dependencies](./COMPLEX_DOCUMENT_DEPENDENCIES.md)
- [10-Dimension Quality System](./10_DIMENSION_QUALITY_SYSTEM.md)
- [Source Documents Tracking](./SOURCE_DOCUMENTS_TRACKING.md)
- [Document Lifecycle Order System](./DOCUMENT_LIFECYCLE_ORDER_SYSTEM.md)

---

## Summary

**Research Complexity Tracking** ensures the complexity score reflects **TRUE manual effort**:

- ✅ **Context Research Time** (reading all source documents)
- ✅ **Writing Time** (creating the new document)
- ✅ **Total Manual Effort** = Research + Writing
- ✅ **Transparent Breakdown** in UI with visual time estimates
- ✅ **Accurate ROI** showing complete AI time savings

This feature transforms complexity from a "writing difficulty" metric into a comprehensive "total manual effort" metric, providing users with realistic time estimates and demonstrating the full value of AI-powered document generation.

