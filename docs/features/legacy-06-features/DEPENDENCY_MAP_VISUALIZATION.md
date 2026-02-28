# Dependency Map Visualization

## Overview

The **Dependency Map** is a visual representation of source documents grouped by their importance/relevance to the generated document. It appears on the document metadata page, providing instant insight into the document's context.

---

## Location

**Document Metadata Page** → Source Documents Section → Top of card

**Path:** `/projects/[id]/documents/[docId]`

---

## Visual Structure

### Layout

```
┌─────────────────────────────────────────────────────┐
│ 📊 Dependency Map                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🔴 CRITICAL Dependencies (Level 5)          │   │
│ │ ─────────────────────────────────────────── │   │
│ │ Project Charter                    approved │   │
│ │ Stakeholder Register                  final │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🟠 HIGH Dependencies (Level 3)              │   │
│ │ ─────────────────────────────────────────── │   │
│ │ Stakeholder Management Plan           draft │   │
│ │ Communications Management Plan        draft │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ 🟡 MEDIUM Dependencies (Level 2)            │   │
│ │ ─────────────────────────────────────────── │   │
│ │ Business Case                        approved│   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ 💡 Dependency strength based on relevance,         │
│    lifecycle phase, and document status            │
└─────────────────────────────────────────────────────┘
```

---

## Color Coding

### Red (Critical) - Level 4-5

**Background:** Light red (`bg-red-50` / `dark:bg-red-950`)  
**Text:** Red (`text-red-600` / `dark:text-red-400`)  
**Indicator:** 🔴 CRITICAL

**Meaning:** Essential foundational documents that must be referenced  
**Score Range:** 80-100+  
**Examples:** Project Charter, Business Case, Stakeholder Register

---

### Orange (High) - Level 3

**Background:** Light orange (`bg-orange-50` / `dark:bg-orange-950`)  
**Text:** Orange (`text-orange-600` / `dark:text-orange-400`)  
**Indicator:** 🟠 HIGH

**Meaning:** Highly relevant supporting documents  
**Score Range:** 60-79  
**Examples:** Related management plans, Requirements specifications

---

### Yellow (Medium) - Level 2

**Background:** Light yellow (`bg-yellow-50` / `dark:bg-yellow-950`)  
**Text:** Yellow (`text-yellow-600` / `dark:text-yellow-400`)  
**Indicator:** 🟡 MEDIUM

**Meaning:** Useful contextual information  
**Score Range:** 40-59  
**Examples:** Supporting documents, Related analyses

---

### Green (Low) - Level 1

**Background:** Light green (`bg-green-50` / `dark:bg-green-950`)  
**Text:** Green (`text-green-600` / `dark:text-green-400`)  
**Indicator:** 🟢 LOW

**Meaning:** Optional reference material  
**Score Range:** 20-39  
**Examples:** Tangentially related documents

---

## Scoring Algorithm

Documents are scored based on three factors:

### 1. Keyword Match (Highest Weight)
```typescript
priorityKeywords.forEach((keyword, index) => {
  const priority = priorityKeywords.length - index
  if (docName.includes(keyword)) {
    score += priority * 10
  }
})
```

**Example:** For a "Risk Management Plan":
- Matches "risk" (priority keyword #1) = **30 points**
- Matches "stakeholder" (priority keyword #3) = **10 points**

### 2. Lifecycle Order Bonus
```typescript
const lifecycleBonus = Math.max(0, 16 - docLifecyclePhase) * 3
```

**Example:**
- Document is Phase 3 (Charter), current is Phase 11 (Risk) = **(16-3)×3 = 39 points**
- Document is Phase 13 (Procurement), current is Phase 11 = **(16-13)×3 = 9 points**

### 3. Status Boost
```typescript
if (doc.status === 'approved') score += 10
if (doc.status === 'final') score += 7
if (doc.status === 'draft') score += 2
```

**Total Score = Keywords + Lifecycle Bonus + Status**

**Dependency Level = Math.ceil(score / 20)**

---

## Real-World Example

### Scenario: Risk Management Plan Generation

**Project has 7 documents:**
1. Ideation Document (Phase 1, draft)
2. Business Case (Phase 2, approved)
3. Project Charter (Phase 3, approved)
4. Stakeholder Register (Phase 4, final)
5. Scope Management Plan (Phase 5, draft)
6. Requirements Document (Phase 6, draft)
7. Schedule Management Plan (Phase 8, draft)

**Template being generated:** Risk Management Plan (Phase 11)

**Scoring:**

| Document | Keyword Match | Lifecycle Bonus | Status | Total | Level |
|----------|--------------|----------------|--------|-------|-------|
| Project Charter | 20 (charter) | 39 (16-3)×3 | +10 (approved) | **69** | 🟠 **3 (HIGH)** |
| Stakeholder Register | 30 (stakeholder) | 36 (16-4)×3 | +7 (final) | **73** | 🟠 **3 (HIGH)** |
| Business Case | 10 (case) | 42 (16-2)×3 | +10 (approved) | **62** | 🟠 **3 (HIGH)** |
| Schedule Management | 5 (schedule) | 24 (16-8)×3 | +2 (draft) | **31** | 🟡 **2 (MEDIUM)** |
| Scope Management | 0 | 33 (16-5)×3 | +2 (draft) | **35** | 🟡 **2 (MEDIUM)** |
| Requirements Doc | 0 | 30 (16-6)×3 | +2 (draft) | **32** | 🟡 **2 (MEDIUM)** |
| Ideation Document | 0 | 45 (16-1)×3 | +2 (draft) | **47** | 🟡 **2 (MEDIUM)** |

**Resulting Dependency Map:**

```
🟠 HIGH Dependencies (Level 3):
  ├─ Stakeholder Register (final) - 73 pts
  ├─ Project Charter (approved) - 69 pts
  └─ Business Case (approved) - 62 pts

🟡 MEDIUM Dependencies (Level 2):
  ├─ Ideation Document (draft) - 47 pts
  ├─ Scope Management Plan (draft) - 35 pts
  ├─ Requirements Document (draft) - 32 pts
  └─ Schedule Management Plan (draft) - 31 pts
```

---

## User Experience Flow

### 1. Generate Document
- User selects template and clicks "Generate"
- AI reads source documents and creates content
- Dependency levels calculated during generation

### 2. View Metadata Page
- User navigates to document metadata
- **Dependency Map** appears at top of Source Documents section
- Grouped by color-coded levels (Critical → Low)

### 3. Understand Context
- See which documents were most influential (Critical/High)
- Understand why certain documents were prioritized
- Click on individual documents for details

### 4. Audit Trail
- Full transparency into AI's decision-making
- See exact scores and dependency levels
- Verify expected documents were used

---

## Benefits

### For Users
✅ **Instant Overview**: See dependency hierarchy at a glance  
✅ **Visual Clarity**: Color coding makes priority obvious  
✅ **Context Understanding**: Know which documents influenced AI most  
✅ **Click-Through**: Navigate to source documents easily

### For Project Managers
✅ **Dependency Tracking**: Understand document relationships  
✅ **Quality Assurance**: Verify critical documents were referenced  
✅ **Impact Analysis**: See which documents are foundational  
✅ **Audit Compliance**: Full traceability of content sources

### For Documentation Teams
✅ **Consistency Checks**: Ensure related docs are connected  
✅ **Gap Identification**: Spot missing dependencies  
✅ **Lifecycle Awareness**: See project progression visually  
✅ **Status Validation**: Verify approved docs are prioritized

---

## Technical Implementation

### Component Location
**File:** `app/projects/[id]/documents/[docId]/page.tsx`  
**Lines:** 1330-1386

### Key Logic

```typescript
// Group documents by dependency level
const dependencyGroups: { [key: number]: any[] } = {}
document.generation_metadata.source_documents.forEach((doc: any) => {
  const level = doc.dependency_level || 1
  if (!dependencyGroups[level]) dependencyGroups[level] = []
  dependencyGroups[level].push(doc)
})

// Display from highest to lowest level
const maxLevel = Math.max(...Object.keys(dependencyGroups).map(Number))
[...Array(maxLevel)].map((_, i) => {
  const level = maxLevel - i
  // Render color-coded card for this level
})
```

### Styling

```typescript
const strength = level >= 4 
  ? { label: '🔴 CRITICAL', color: 'text-red-600', bg: 'bg-red-50' }
  : level === 3 
    ? { label: '🟠 HIGH', color: 'text-orange-600', bg: 'bg-orange-50' }
    : level === 2 
      ? { label: '🟡 MEDIUM', color: 'text-yellow-600', bg: 'bg-yellow-50' }
      : { label: '🟢 LOW', color: 'text-green-600', bg: 'bg-green-50' }
```

---

## Accessibility

✅ **Color + Icons**: Color-blind friendly with emoji indicators  
✅ **Semantic HTML**: Proper heading hierarchy  
✅ **Keyboard Navigation**: All elements focusable  
✅ **Screen Reader**: Descriptive labels and ARIA attributes  
✅ **Dark Mode**: Full support with inverted colors

---

## Related Features

- [Complex Document Dependencies](./COMPLEX_DOCUMENT_DEPENDENCIES.md)
- [Source Documents Tracking](./SOURCE_DOCUMENTS_TRACKING.md)
- [Document Lifecycle Order System](./DOCUMENT_LIFECYCLE_ORDER_SYSTEM.md)
- [Intelligent Document Context System](./INTELLIGENT_DOCUMENT_CONTEXT_SYSTEM.md)

---

## Summary

The **Dependency Map Visualization** transforms raw dependency data into an intuitive, color-coded visual hierarchy. Users can instantly see:

- 🔴 **Which documents are critical** to understanding the generated content
- 🟠 **Which documents provide important context**
- 🟡 **Which documents offer useful reference**
- 🟢 **Which documents are tangentially related**

This feature provides **complete transparency** into the AI's decision-making process and enables users to **audit** and **verify** the quality of generated documents.

