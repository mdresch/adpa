# Source Documents Tracking & Display

**Date**: October 19, 2025  
**Status**: ✅ **IMPLEMENTED AND LIVE**  
**Feature**: Track and display which documents were used as context during generation

---

## Overview

When you generate a new document, the system now **automatically tracks** which existing documents were used as context and displays them in the document viewer under **"Source Documents"**.

This creates a **visible, auditable trail** of document dependencies and relationships.

---

## What Was Implemented

### 1. Source Documents Metadata Tracking

**Location**: `app/projects/[id]/page.tsx` (lines 802-815)

When generating a document, the system now:

```typescript
// Build source documents metadata from context
const sourceDocuments = relevantDocs.map(doc => ({
  id: doc.id,
  title: doc.name,
  type: doc.template_name || 'Document',
  template_id: doc.template_id,
  status: doc.status,
  url: `/projects/${projectId}/documents/${doc.id}/view`
}))
```

**Saved in**: `document.metadata.source_documents[]`

### 2. Context Statistics Tracking

**Also saved in metadata**:

```typescript
context_stats: {
  total_documents_available: 8,        // How many docs in project
  documents_used_as_context: 3,        // How many used
  stakeholders_available: 12,          // Stakeholders count
  custom_settings_count: 2,            // Custom settings
  custom_metadata_count: 3,            // Custom metadata
  estimated_context_tokens: 12125      // Token estimate
}
```

### 3. Document Viewer Display

**Location**: `app/projects/[id]/documents/[docId]/view/page.tsx`

**Two new sections added**:

#### A. Context Statistics Card
Shows what context was available during generation:
- Documents in Project
- Used as Context
- Stakeholders Available
- Custom Settings
- Custom Metadata
- Context Tokens

#### B. Enhanced Source Documents Card
- Lists all documents used as context
- Shows document status badges
- **Clickable links** to view each source document
- Empty state message if no context was used

---

## User Experience

### When Viewing a Document

#### Scenario 1: First Document (No Context)
```
┌─────────────────────────────────┐
│ 📚 Source Documents             │
│                                 │
│ No source documents - this was │
│ the first document generated   │
│ or no context was available.   │
└─────────────────────────────────┘
```

#### Scenario 2: Document with Context
```
┌──────────────────────────────────────────────┐
│ 📊 Context Statistics                        │
│                                              │
│ Documents in Project:          8            │
│ Used as Context:               3            │
│ Stakeholders Available:        12           │
│ Custom Settings:               2            │
│ Custom Metadata:               3            │
│ ────────────────────────────────────        │
│ Context Tokens:                ~12,125      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 📚 Source Documents                          │
│ Documents used as context during generation  │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ Project Charter      [approved] [👁] │    │
│ │ Charter Template                     │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ Stakeholder Register [final]    [👁] │    │
│ │ Stakeholder Template                 │    │
│ └──────────────────────────────────────┘    │
│                                              │
│ ┌──────────────────────────────────────┐    │
│ │ Scope Management Plan [draft]   [👁] │    │
│ │ Scope Management Template            │    │
│ └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

**Click the [👁] button** → Navigate to that source document!

---

## Example: Document Dependency Chain

### Generation Sequence

```
Step 1: Generate Project Charter
  └─ Source Documents: (none - first document)

Step 2: Generate Stakeholder Register
  └─ Source Documents:
      ✓ Project Charter (used as context)

Step 3: Generate Risk Management Plan
  └─ Source Documents:
      ✓ Project Charter (highest priority)
      ✓ Stakeholder Register (2nd priority)
      ✓ Scope Management Plan (3rd priority if exists)

Step 4: Generate Communication Plan
  └─ Source Documents:
      ✓ Stakeholder Register (highest priority)
      ✓ Project Charter (2nd priority)
```

### Visual Dependency Graph

```
Project Charter (foundation)
    ├─→ Stakeholder Register
    │       ├─→ Communication Plan
    │       └─→ Risk Management Plan
    ├─→ Scope Management Plan
    │       ├─→ Requirements Document
    │       ├─→ Quality Management Plan
    │       └─→ Risk Management Plan
    └─→ Risk Management Plan
            └─→ Quality Management Plan
```

Each arrow (→) represents a **documented source relationship** now visible in the UI!

---

## Benefits

### For Users 👤
- 🔍 **Transparency**: See exactly which documents influenced the generation
- 🔗 **Traceability**: Click to view source documents instantly
- 📊 **Insight**: Understand what context was available
- ✅ **Confidence**: Verify the AI had proper context

### For Project Managers 📋
- 🎯 **Quality Assurance**: Verify documents build on each other properly
- 📈 **Audit Trail**: Show auditors the document lineage
- 🔄 **Impact Analysis**: If you update a Charter, see which docs reference it
- 💡 **Gap Analysis**: Identify documents that lack context

### For Compliance & Audits 📑
- ✅ **Traceability**: Complete audit trail of document relationships
- 📊 **Evidence**: Proof that documents are interconnected
- 🔒 **Governance**: Demonstrate structured document management
- 📋 **Standards**: Show adherence to project management frameworks

---

## Console Output Examples

### During Generation
```
📚 [CONTEXT-1/3] Document Library Analysis:
  Total documents in project: 4
  Template being generated: Stakeholder Management Plan
  Prioritized documents selected: 1
  Selected documents: Project Charter

📚 [SAVE-1.5/6] Source documents tracked: 1 documents
  Source document names: Project Charter
```

### When Viewing Document
```
📚 Source documents found in metadata: 1
  Source documents: Project Charter
```

---

## Data Structure

### Stored in Document Metadata

```json
{
  "generation_metadata": {
    "source_documents": [
      {
        "id": "abc-123-def-456",
        "title": "Project Charter",
        "type": "Charter Template",
        "template_id": "template-uuid",
        "status": "approved",
        "url": "/projects/proj-id/documents/abc-123-def-456/view"
      },
      {
        "id": "def-456-ghi-789",
        "title": "Stakeholder Register",
        "type": "Stakeholder Template",
        "template_id": "template-uuid-2",
        "status": "final",
        "url": "/projects/proj-id/documents/def-456-ghi-789/view"
      }
    ],
    "context_stats": {
      "total_documents_available": 8,
      "documents_used_as_context": 3,
      "stakeholders_available": 12,
      "custom_settings_count": 2,
      "custom_metadata_count": 3,
      "estimated_context_tokens": 12125
    }
  }
}
```

---

## API Integration

### Document Creation Payload

**Before**:
```json
{
  "name": "Risk Management Plan",
  "content": "# Risk Management Plan...",
  "template_id": "template-uuid",
  "status": "draft"
}
```

**After**:
```json
{
  "name": "Risk Management Plan",
  "content": "# Risk Management Plan...",
  "template_id": "template-uuid",
  "status": "draft",
  "generation_metadata": {
    "source_documents": [...],
    "context_stats": {...},
    "quality": {...}
  }
}
```

**Backend**: Stores this in `documents.metadata` JSONB column automatically.

---

## Testing Checklist

### Test 1: First Document (No Sources)
- [ ] Generate Project Charter in empty project
- [ ] View the Charter
- [ ] Verify: "Source Documents" shows "No source documents - this was the first document..."
- [ ] Verify: "Context Statistics" section not displayed (no context_stats)

### Test 2: Second Document (With Sources)
- [ ] Generate Stakeholder Register (after Charter exists)
- [ ] Check console: Should show "Selected documents: Project Charter"
- [ ] View the Stakeholder Register
- [ ] Verify: "Source Documents" lists "Project Charter"
- [ ] Verify: "Context Statistics" shows usage stats
- [ ] Click eye icon on Project Charter → Should navigate to Charter

### Test 3: Complex Document (Multiple Sources)
- [ ] Generate Risk Management Plan (after Charter, Stakeholder, Scope exist)
- [ ] Check console: Should show 3+ selected documents
- [ ] View the Risk Plan
- [ ] Verify: All source documents listed
- [ ] Verify: Can click to navigate to each one
- [ ] Verify: Status badges displayed correctly

---

## UI Enhancements

### Source Documents Card Features

✅ **Clickable Links**: Eye icon button navigates to source document  
✅ **Status Badges**: Shows document status (approved, final, draft)  
✅ **Document Type**: Displays template name  
✅ **Hover Effect**: Visual feedback on hover  
✅ **Empty State**: Clear message when no sources  

### Context Statistics Card Features

✅ **Conditional Display**: Only shows if context_stats exist  
✅ **Color Coding**: Primary color for "Used as Context" count  
✅ **Token Estimate**: Shows estimated context tokens with formatting  
✅ **Separator**: Visual separation between counts and tokens  

---

## Future Enhancements

### Phase 1: Reverse Lookup (Planned)
Show which **downstream documents** were generated using this document as context:

```
┌──────────────────────────────────────────────┐
│ 📚 Referenced By                             │
│                                              │
│ This document was used as context for:       │
│ • Risk Management Plan                       │
│ • Communication Plan                         │
│ • Quality Management Plan                    │
└──────────────────────────────────────────────┘
```

### Phase 2: Document Graph Visualization
Interactive visual of document relationships:
```
[Charter] ──┬──> [Stakeholder Register]
            │       └──> [Communication Plan]
            ├──> [Scope Plan]
            │       └──> [Risk Plan]
            └──> [Cost Plan]
```

### Phase 3: Impact Analysis
When updating a document, show:
```
⚠️ Warning: 5 documents reference this Charter.
   Updating it may affect:
   • Stakeholder Register
   • Risk Management Plan
   • Communication Plan
   • Scope Management Plan
   • Quality Management Plan
```

---

## Summary

**What Changed**:
1. ✅ Source documents now tracked during generation
2. ✅ Stored in `metadata.source_documents` array
3. ✅ Displayed in document viewer with clickable links
4. ✅ Context statistics visible for transparency
5. ✅ Complete audit trail of document relationships

**Impact**:
- 🔍 Full transparency on document dependencies
- 🔗 Easy navigation between related documents
- 📊 Insight into context quality
- ✅ Audit-ready document lineage

**Status**: ✅ **Live and operational!**

---

## Try It Now!

1. Go to: `http://localhost:3000/projects/ce14bf1d-fe9c-4616-b729-1b22630f5644`
2. Generate a new document (e.g., Risk Management Plan)
3. Check console for source documents logging
4. View the generated document
5. Scroll to **"Context Statistics"** and **"Source Documents"** sections
6. Click the eye icon to navigate to source documents!

**Your document relationships are now visible and traceable!** 🎯

