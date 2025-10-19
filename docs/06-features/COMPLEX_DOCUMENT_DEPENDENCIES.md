# Complex Document Dependencies System

## Overview

The ADPA platform now supports **complex reference dependencies** between documents, allowing AI generation to intelligently reference up to **10 source documents** with automatic dependency level tracking and visualization.

---

## Key Features

### 1. **Increased Document Limit: 5 → 10**

Previously limited to 5 source documents, the system now supports:
- ✅ **10 source documents** for complex project contexts
- ✅ Dynamic prioritization based on relevance scores
- ✅ Automatic dependency level calculation
- ✅ Visual dependency mapping in console and UI

### 2. **Dependency Level System**

Documents are automatically categorized into 4 dependency levels based on their relevance score:

| Level | Strength | Score Range | Meaning |
|-------|----------|-------------|---------|
| **4+** | 🔴 **CRITICAL** | 80-100+ | **Must** reference - foundational documents (e.g., Project Charter) |
| **3** | 🟠 **HIGH** | 60-79 | **Should** reference - highly relevant context |
| **2** | 🟡 **MEDIUM** | 40-59 | **May** reference - useful supporting info |
| **1** | 🟢 **LOW** | 20-39 | **Optional** - tangential relevance |

### 3. **Dependency Scoring Algorithm**

Each document gets a relevance score based on:

```typescript
score = 
  (keyword_match * 10 * priority_weight) +  // Highest weight
  (lifecycle_bonus * 3) +                    // Moderate weight (earlier = better)
  (status_boost)                             // Quality indicator
  
// Status boosts:
- Approved: +10
- Final: +7
- Draft: +2

// Lifecycle bonus: (16 - phase_number) * 3
// Earlier documents (lower phase numbers) get higher bonuses
```

**Example:**
- Document matches "stakeholder" (priority keyword #2) → **20 points**
- Document is in Phase 3, current template is Phase 12 → **lifecycle bonus = (16-3)*3 = 39 points**
- Document status is "approved" → **+10 points**
- **Total Score: 69 → 🟠 HIGH dependency (Level 3)**

---

## Visual Output

### Console Dependency Map

When generating a document, the console now displays:

```
📚 [CONTEXT-1/3] Document Library Analysis:
  Total documents in project: 8
  Template being generated: Risk Management Plan (Phase 11)
  Prioritized documents selected: 5 (LIMIT: 10 for complex dependencies)
  
  📊 DOCUMENT DEPENDENCY MAP:
  ═══════════════════════════════════════════════════════
  
  🔴 CRITICAL Dependency (Level 4):
    ⬅️ Project Charter
       Status: approved | Phase 3 | Score: 89
    ⬅️ Stakeholder Register
       Status: final | Phase 4 | Score: 82
  
  🟠 HIGH Dependency (Level 3):
    ⬅️ Stakeholder Management Plan
       Status: draft | Phase 4 | Score: 67
    ⬅️ Communications Management Plan
       Status: draft | Phase 12 | Score: 61
  
  🟡 MEDIUM Dependency (Level 2):
    ⬅️ Business Case
       Status: approved | Phase 2 | Score: 55
  
  ⬅️ = Earlier phase (foundation) | ➡️ = Same phase | ⬇️ = Later phase
  🔴 = Must reference | 🟠 = Should reference | 🟡 = May reference | 🟢 = Optional
```

### UI Badges

In the **Document Metadata Page → Source Documents**, each referenced document now shows:

```
┌─────────────────────────────────────────────────────┐
│  1  📄 Project Charter                              │
│     [draft] [🔴 Critical]                           │
│     Phase 3: Charter • Project Charter • Score: 89  │
└─────────────────────────────────────────────────────┘
```

- **Rank badge (blue circle)**: Priority order (#1, #2, etc.)
- **Status badge**: draft | approved | final
- **Dependency badge**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- **Score**: Raw relevance score for transparency

---

## Use Cases

### 1. **Integration Management Plan**
Requires context from multiple areas:
- 🔴 **Critical**: Project Charter, Scope Management Plan
- 🟠 **High**: Risk Management Plan, Communications Plan, Quality Plan
- 🟡 **Medium**: Stakeholder Register, Cost Management Plan
- **Total: 7 source documents**

### 2. **Project Closure Document**
Needs comprehensive project history:
- 🔴 **Critical**: All management plans (8-10 documents)
- 🟠 **High**: Lessons Learned, Final Reports
- 🟡 **Medium**: Meeting Minutes, Change Logs
- **Total: Up to 10 source documents**

### 3. **Business Case (Early Phase)**
Limited dependencies (early in lifecycle):
- 🔴 **Critical**: Ideation Document (if exists)
- 🟡 **Medium**: Any feasibility studies
- **Total: 1-2 source documents**

---

## Technical Implementation

### Frontend (app/projects/[id]/page.tsx)

```typescript
.slice(0, 10) // Increased from 5
.map(item => ({ 
  ...item.doc, 
  priority_rank: item.score,
  dependency_level: Math.ceil(item.score / 20) // 1-5 levels
}))
```

### Dependency Level Calculation

```typescript
dependency_level = Math.ceil(score / 20)

// Examples:
- Score 89 → Level 5 (89/20 = 4.45, ceil = 5) → 🔴 Critical
- Score 67 → Level 4 (67/20 = 3.35, ceil = 4) → 🔴 Critical
- Score 55 → Level 3 (55/20 = 2.75, ceil = 3) → 🟠 High
- Score 35 → Level 2 (35/20 = 1.75, ceil = 2) → 🟡 Medium
- Score 15 → Level 1 (15/20 = 0.75, ceil = 1) → 🟢 Low
```

### Metadata Storage

```typescript
// Stored in document.generation_metadata.source_documents
{
  id: "doc-uuid",
  name: "Project Charter",
  status: "approved",
  phase_name: "Phase 3: Charter",
  type: "Project Charter",
  priority_rank: 89,          // Raw score
  dependency_level: 5          // Calculated level (1-5)
}
```

---

## Benefits

### For Users
- ✅ **Transparency**: See exactly which documents influenced AI generation
- ✅ **Quality Assurance**: High-score dependencies = consistent, well-informed output
- ✅ **Traceability**: Click through to source documents from metadata page
- ✅ **Context Confidence**: Visual indicators show strength of references

### For AI Generation
- ✅ **Rich Context**: Up to 10 documents (vs. 5) = more comprehensive prompts
- ✅ **Prioritized Information**: Most relevant content first
- ✅ **Consistency**: References approved/final documents where available
- ✅ **Lifecycle Awareness**: Automatically references foundational documents

### For Project Management
- ✅ **Dependency Visualization**: Understand document relationships at a glance
- ✅ **Impact Analysis**: See which documents are critical to others
- ✅ **Quality Metrics**: Dependency strength indicates document importance
- ✅ **Audit Trail**: Full provenance of generated content

---

## Configuration

### Adjust Document Limit

To change the maximum source documents:

```typescript
// app/projects/[id]/page.tsx, line 532
.slice(0, 10) // Change 10 to desired limit (e.g., 15)
```

### Adjust Dependency Thresholds

To change dependency level calculations:

```typescript
// Current: Level = ceil(score / 20)
// For more granular levels:
dependency_level: Math.ceil(item.score / 15) // Creates 1-7 levels

// For fewer levels:
dependency_level: Math.ceil(item.score / 25) // Creates 1-4 levels
```

### Customize Dependency Colors

In `app/projects/[id]/documents/[docId]/page.tsx`:

```typescript
source.dependency_level >= 4 ? 'bg-red-100 text-red-700' :
source.dependency_level === 3 ? 'bg-orange-100 text-orange-700' :
source.dependency_level === 2 ? 'bg-yellow-100 text-yellow-700' :
'bg-green-100 text-green-700'
```

---

## Best Practices

### 1. **Create Foundational Documents First**
- Start with Ideation → Business Case → Project Charter
- These become 🔴 Critical dependencies for all later documents

### 2. **Approve Key Documents**
- Approved/Final status boosts dependency scores
- Ensures AI references high-quality content

### 3. **Use Descriptive Names**
- Template-aligned names improve keyword matching
- "Stakeholder Management Plan" > "Document 1"

### 4. **Review Dependency Maps**
- Check console output to verify expected documents are included
- Missing expected dependency? May need better keywords or earlier phase

### 5. **Balance Document Count**
- More isn't always better - 10 high-quality docs > 15 mediocre ones
- System automatically filters by relevance (score > 0)

---

## Troubleshooting

### Issue: "Expected document not in dependency map"

**Possible Causes:**
1. Document name doesn't match priority keywords
2. Document is too late in lifecycle (later phase than current template)
3. Score too low (filtered out)

**Solutions:**
- Rename document to include relevant keywords
- Check document status (draft < final < approved)
- Review lifecycle phase alignment

### Issue: "All dependencies showing as LOW (🟢)"

**Cause:** Low relevance scores across all documents

**Solutions:**
- Improve document naming with framework keywords
- Ensure earlier lifecycle documents exist
- Check template name alignment with priority keywords

### Issue: "Only 3 documents when expecting 10"

**Cause:** Only 3 documents have score > 0 (relevant)

**Solutions:**
- This is expected behavior - system only includes relevant documents
- Add more documents in earlier lifecycle phases
- Verify document content includes relevant keywords

---

## Future Enhancements

### Planned
- [ ] **Explicit Dependencies**: Manually mark document relationships
- [ ] **Dependency Graph Visualization**: Interactive UI graph showing document connections
- [ ] **Circular Dependency Detection**: Warn when A→B→C→A
- [ ] **Version-Aware Dependencies**: Reference specific document versions
- [ ] **Smart Templates**: Pre-define dependency rules per template type

### Under Consideration
- [ ] **Dependency Strength Tuning**: User-adjustable weights for scoring factors
- [ ] **Template-Specific Limits**: E.g., closure docs get 15, charters get 3
- [ ] **AI-Suggested Dependencies**: "You may also want to reference..."
- [ ] **Dependency Impact Report**: "This document is referenced by 12 others"

---

## Related Documentation

- [Source Documents Tracking](./SOURCE_DOCUMENTS_TRACKING.md)
- [Document Lifecycle Order System](./DOCUMENT_LIFECYCLE_ORDER_SYSTEM.md)
- [Intelligent Document Context System](./INTELLIGENT_DOCUMENT_CONTEXT_SYSTEM.md)
- [10-Dimension Quality System](./10_DIMENSION_QUALITY_SYSTEM.md)

---

## Summary

The **Complex Document Dependencies System** enables:
- ✅ Up to **10 source documents** (doubled from 5)
- ✅ **4-level dependency classification** (Critical → Low)
- ✅ **Visual dependency mapping** in console and UI
- ✅ **Automatic scoring** based on relevance, lifecycle, and status
- ✅ **Transparent provenance** for all AI-generated content

This system ensures AI-generated documents are **contextually rich**, **internally consistent**, and **fully traceable** to their source material.



## Overview

The ADPA platform now supports **complex reference dependencies** between documents, allowing AI generation to intelligently reference up to **10 source documents** with automatic dependency level tracking and visualization.

---

## Key Features

### 1. **Increased Document Limit: 5 → 10**

Previously limited to 5 source documents, the system now supports:
- ✅ **10 source documents** for complex project contexts
- ✅ Dynamic prioritization based on relevance scores
- ✅ Automatic dependency level calculation
- ✅ Visual dependency mapping in console and UI

### 2. **Dependency Level System**

Documents are automatically categorized into 4 dependency levels based on their relevance score:

| Level | Strength | Score Range | Meaning |
|-------|----------|-------------|---------|
| **4+** | 🔴 **CRITICAL** | 80-100+ | **Must** reference - foundational documents (e.g., Project Charter) |
| **3** | 🟠 **HIGH** | 60-79 | **Should** reference - highly relevant context |
| **2** | 🟡 **MEDIUM** | 40-59 | **May** reference - useful supporting info |
| **1** | 🟢 **LOW** | 20-39 | **Optional** - tangential relevance |

### 3. **Dependency Scoring Algorithm**

Each document gets a relevance score based on:

```typescript
score = 
  (keyword_match * 10 * priority_weight) +  // Highest weight
  (lifecycle_bonus * 3) +                    // Moderate weight (earlier = better)
  (status_boost)                             // Quality indicator
  
// Status boosts:
- Approved: +10
- Final: +7
- Draft: +2

// Lifecycle bonus: (16 - phase_number) * 3
// Earlier documents (lower phase numbers) get higher bonuses
```

**Example:**
- Document matches "stakeholder" (priority keyword #2) → **20 points**
- Document is in Phase 3, current template is Phase 12 → **lifecycle bonus = (16-3)*3 = 39 points**
- Document status is "approved" → **+10 points**
- **Total Score: 69 → 🟠 HIGH dependency (Level 3)**

---

## Visual Output

### Console Dependency Map

When generating a document, the console now displays:

```
📚 [CONTEXT-1/3] Document Library Analysis:
  Total documents in project: 8
  Template being generated: Risk Management Plan (Phase 11)
  Prioritized documents selected: 5 (LIMIT: 10 for complex dependencies)
  
  📊 DOCUMENT DEPENDENCY MAP:
  ═══════════════════════════════════════════════════════
  
  🔴 CRITICAL Dependency (Level 4):
    ⬅️ Project Charter
       Status: approved | Phase 3 | Score: 89
    ⬅️ Stakeholder Register
       Status: final | Phase 4 | Score: 82
  
  🟠 HIGH Dependency (Level 3):
    ⬅️ Stakeholder Management Plan
       Status: draft | Phase 4 | Score: 67
    ⬅️ Communications Management Plan
       Status: draft | Phase 12 | Score: 61
  
  🟡 MEDIUM Dependency (Level 2):
    ⬅️ Business Case
       Status: approved | Phase 2 | Score: 55
  
  ⬅️ = Earlier phase (foundation) | ➡️ = Same phase | ⬇️ = Later phase
  🔴 = Must reference | 🟠 = Should reference | 🟡 = May reference | 🟢 = Optional
```

### UI Badges

In the **Document Metadata Page → Source Documents**, each referenced document now shows:

```
┌─────────────────────────────────────────────────────┐
│  1  📄 Project Charter                              │
│     [draft] [🔴 Critical]                           │
│     Phase 3: Charter • Project Charter • Score: 89  │
└─────────────────────────────────────────────────────┘
```

- **Rank badge (blue circle)**: Priority order (#1, #2, etc.)
- **Status badge**: draft | approved | final
- **Dependency badge**: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low
- **Score**: Raw relevance score for transparency

---

## Use Cases

### 1. **Integration Management Plan**
Requires context from multiple areas:
- 🔴 **Critical**: Project Charter, Scope Management Plan
- 🟠 **High**: Risk Management Plan, Communications Plan, Quality Plan
- 🟡 **Medium**: Stakeholder Register, Cost Management Plan
- **Total: 7 source documents**

### 2. **Project Closure Document**
Needs comprehensive project history:
- 🔴 **Critical**: All management plans (8-10 documents)
- 🟠 **High**: Lessons Learned, Final Reports
- 🟡 **Medium**: Meeting Minutes, Change Logs
- **Total: Up to 10 source documents**

### 3. **Business Case (Early Phase)**
Limited dependencies (early in lifecycle):
- 🔴 **Critical**: Ideation Document (if exists)
- 🟡 **Medium**: Any feasibility studies
- **Total: 1-2 source documents**

---

## Technical Implementation

### Frontend (app/projects/[id]/page.tsx)

```typescript
.slice(0, 10) // Increased from 5
.map(item => ({ 
  ...item.doc, 
  priority_rank: item.score,
  dependency_level: Math.ceil(item.score / 20) // 1-5 levels
}))
```

### Dependency Level Calculation

```typescript
dependency_level = Math.ceil(score / 20)

// Examples:
- Score 89 → Level 5 (89/20 = 4.45, ceil = 5) → 🔴 Critical
- Score 67 → Level 4 (67/20 = 3.35, ceil = 4) → 🔴 Critical
- Score 55 → Level 3 (55/20 = 2.75, ceil = 3) → 🟠 High
- Score 35 → Level 2 (35/20 = 1.75, ceil = 2) → 🟡 Medium
- Score 15 → Level 1 (15/20 = 0.75, ceil = 1) → 🟢 Low
```

### Metadata Storage

```typescript
// Stored in document.generation_metadata.source_documents
{
  id: "doc-uuid",
  name: "Project Charter",
  status: "approved",
  phase_name: "Phase 3: Charter",
  type: "Project Charter",
  priority_rank: 89,          // Raw score
  dependency_level: 5          // Calculated level (1-5)
}
```

---

## Benefits

### For Users
- ✅ **Transparency**: See exactly which documents influenced AI generation
- ✅ **Quality Assurance**: High-score dependencies = consistent, well-informed output
- ✅ **Traceability**: Click through to source documents from metadata page
- ✅ **Context Confidence**: Visual indicators show strength of references

### For AI Generation
- ✅ **Rich Context**: Up to 10 documents (vs. 5) = more comprehensive prompts
- ✅ **Prioritized Information**: Most relevant content first
- ✅ **Consistency**: References approved/final documents where available
- ✅ **Lifecycle Awareness**: Automatically references foundational documents

### For Project Management
- ✅ **Dependency Visualization**: Understand document relationships at a glance
- ✅ **Impact Analysis**: See which documents are critical to others
- ✅ **Quality Metrics**: Dependency strength indicates document importance
- ✅ **Audit Trail**: Full provenance of generated content

---

## Configuration

### Adjust Document Limit

To change the maximum source documents:

```typescript
// app/projects/[id]/page.tsx, line 532
.slice(0, 10) // Change 10 to desired limit (e.g., 15)
```

### Adjust Dependency Thresholds

To change dependency level calculations:

```typescript
// Current: Level = ceil(score / 20)
// For more granular levels:
dependency_level: Math.ceil(item.score / 15) // Creates 1-7 levels

// For fewer levels:
dependency_level: Math.ceil(item.score / 25) // Creates 1-4 levels
```

### Customize Dependency Colors

In `app/projects/[id]/documents/[docId]/page.tsx`:

```typescript
source.dependency_level >= 4 ? 'bg-red-100 text-red-700' :
source.dependency_level === 3 ? 'bg-orange-100 text-orange-700' :
source.dependency_level === 2 ? 'bg-yellow-100 text-yellow-700' :
'bg-green-100 text-green-700'
```

---

## Best Practices

### 1. **Create Foundational Documents First**
- Start with Ideation → Business Case → Project Charter
- These become 🔴 Critical dependencies for all later documents

### 2. **Approve Key Documents**
- Approved/Final status boosts dependency scores
- Ensures AI references high-quality content

### 3. **Use Descriptive Names**
- Template-aligned names improve keyword matching
- "Stakeholder Management Plan" > "Document 1"

### 4. **Review Dependency Maps**
- Check console output to verify expected documents are included
- Missing expected dependency? May need better keywords or earlier phase

### 5. **Balance Document Count**
- More isn't always better - 10 high-quality docs > 15 mediocre ones
- System automatically filters by relevance (score > 0)

---

## Troubleshooting

### Issue: "Expected document not in dependency map"

**Possible Causes:**
1. Document name doesn't match priority keywords
2. Document is too late in lifecycle (later phase than current template)
3. Score too low (filtered out)

**Solutions:**
- Rename document to include relevant keywords
- Check document status (draft < final < approved)
- Review lifecycle phase alignment

### Issue: "All dependencies showing as LOW (🟢)"

**Cause:** Low relevance scores across all documents

**Solutions:**
- Improve document naming with framework keywords
- Ensure earlier lifecycle documents exist
- Check template name alignment with priority keywords

### Issue: "Only 3 documents when expecting 10"

**Cause:** Only 3 documents have score > 0 (relevant)

**Solutions:**
- This is expected behavior - system only includes relevant documents
- Add more documents in earlier lifecycle phases
- Verify document content includes relevant keywords

---

## Future Enhancements

### Planned
- [ ] **Explicit Dependencies**: Manually mark document relationships
- [ ] **Dependency Graph Visualization**: Interactive UI graph showing document connections
- [ ] **Circular Dependency Detection**: Warn when A→B→C→A
- [ ] **Version-Aware Dependencies**: Reference specific document versions
- [ ] **Smart Templates**: Pre-define dependency rules per template type

### Under Consideration
- [ ] **Dependency Strength Tuning**: User-adjustable weights for scoring factors
- [ ] **Template-Specific Limits**: E.g., closure docs get 15, charters get 3
- [ ] **AI-Suggested Dependencies**: "You may also want to reference..."
- [ ] **Dependency Impact Report**: "This document is referenced by 12 others"

---

## Related Documentation

- [Source Documents Tracking](./SOURCE_DOCUMENTS_TRACKING.md)
- [Document Lifecycle Order System](./DOCUMENT_LIFECYCLE_ORDER_SYSTEM.md)
- [Intelligent Document Context System](./INTELLIGENT_DOCUMENT_CONTEXT_SYSTEM.md)
- [10-Dimension Quality System](./10_DIMENSION_QUALITY_SYSTEM.md)

---

## Summary

The **Complex Document Dependencies System** enables:
- ✅ Up to **10 source documents** (doubled from 5)
- ✅ **4-level dependency classification** (Critical → Low)
- ✅ **Visual dependency mapping** in console and UI
- ✅ **Automatic scoring** based on relevance, lifecycle, and status
- ✅ **Transparent provenance** for all AI-generated content

This system ensures AI-generated documents are **contextually rich**, **internally consistent**, and **fully traceable** to their source material.

