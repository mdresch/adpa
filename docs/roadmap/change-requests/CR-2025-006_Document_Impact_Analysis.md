# Change Request: Document Impact Analysis & Cascade Regeneration

**CR Number**: CR-2025-006  
**Title**: Document Impact Analysis & Cascade Regeneration  
**Created**: October 25, 2025  
**Author**: Menno Drescher  
**Status**: Draft  
**Priority**: High  
**Type**: Feature Enhancement  
**Estimated Effort**: 16-24 hours

---

## 1. Problem Statement

### Current Limitation
ADPA currently provides **forward traceability** (showing which source documents were used to generate a document) but lacks **reverse traceability** (showing which documents depend on a given source document).

**Impact:**
- When a source document is corrected (e.g., Scope Management Plan updated to remove ML/OCR scope), there is no automatic way to identify and update all dependent documents
- Users must manually track and update downstream documents
- Scope drift propagates and accumulates across document library
- Manual editing is time-consuming (2-4 hours per scope change) and error-prone

### Business Pain
During validation testing (Oct 25, 2025), user discovered:
- **Scope Management Plan** contained incorrect scope (ML/OCR/data extraction)
- **12+ documents** were generated using this as a source
- All 12 documents inherited the incorrect scope
- Manual correction would require 2-4 hours of work
- Risk of inconsistency across documents

---

## 2. Proposed Solution

### Feature Overview
Add **bidirectional traceability** to ADPA's document dependency system:

**Forward Tracking** (Existing):
```
Document A → Shows source documents (B, C, D)
"This document was created using..."
```

**Reverse Tracking** (NEW):
```
Document B → Shows dependent documents (A, E, F)
"This document is used as source in..."
```

**Impact Analysis** (NEW):
```
Document B updated → System alerts:
"⚠️ 3 documents depend on this and may need regeneration:
 - Document A (PMP)
 - Document E (Activity List)
 - Document F (WBS)"
 
[🔄 Regenerate All] button
```

### User Interface

#### In Document Viewer

**New Section: "Downstream Impact"**
```
┌──────────────────────────────────────────────┐
│ ⚠️ Downstream Impact                          │
│                                               │
│ This document is used as source in:          │
│                                               │
│ 📄 Project Management Plan                   │
│    Status: draft | Updated: 2 days ago       │
│    [🔄 Regenerate]                            │
│                                               │
│ 📄 Activity Duration Estimates               │
│    Status: published | Updated: 1 day ago    │
│    [🔄 Regenerate]                            │
│                                               │
│ 📄 WBS Activity                               │
│    Status: draft | Updated: 3 days ago       │
│    [🔄 Regenerate]                            │
│                                               │
│ [🔄 Regenerate All 3 Documents]              │
└──────────────────────────────────────────────┘
```

**Alert When Editing Source Document:**
```
┌──────────────────────────────────────────────┐
│ ⚠️ Impact Warning                             │
│                                               │
│ This document is referenced by 3 other       │
│ documents. Changes may require regeneration. │
│                                               │
│ [View Affected Documents] [Continue Editing] │
└──────────────────────────────────────────────┘
```

---

## 3. Technical Implementation

### Database Query (PostgreSQL)

```sql
-- Find all documents that depend on document_id
CREATE OR REPLACE FUNCTION get_dependent_documents(source_doc_id UUID)
RETURNS TABLE (
  id UUID,
  title VARCHAR,
  status VARCHAR,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  source_count INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.title,
    d.status,
    d.created_at,
    d.updated_at,
    jsonb_array_length(d.generation_metadata->'sourceDocuments')::INT as source_count
  FROM documents d
  WHERE d.generation_metadata->'sourceDocuments' @> 
        jsonb_build_array(jsonb_build_object('id', source_doc_id))
    AND d.deleted_at IS NULL
  ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Usage:
SELECT * FROM get_dependent_documents('scope-plan-uuid');
```

### API Endpoints

```typescript
// GET /api/documents/:id/dependents
// Returns list of documents that use this as source
router.get("/:id/dependents", authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  const result = await pool.query(
    'SELECT * FROM get_dependent_documents($1)',
    [id]
  );
  
  res.json({
    source_document_id: id,
    dependent_documents: result.rows,
    count: result.rows.length
  });
});

// POST /api/documents/:id/regenerate-dependents
// Queues regeneration jobs for all dependent documents
router.post("/:id/regenerate-dependents", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  // Get all dependent documents
  const dependents = await pool.query(
    'SELECT * FROM get_dependent_documents($1)',
    [id]
  );
  
  const jobIds = [];
  
  // Queue regeneration for each dependent
  for (const doc of dependents.rows) {
    // Fetch original generation parameters
    const original = await pool.query(
      'SELECT template_id, project_id, generation_metadata FROM documents WHERE id = $1',
      [doc.id]
    );
    
    const metadata = original.rows[0].generation_metadata;
    
    // Enqueue regeneration job
    const jobId = await queueService.addJob('ai-generate', {
      template_id: original.rows[0].template_id,
      project_id: original.rows[0].project_id,
      provider: metadata?.generation?.provider || 'Mistral AI',
      model: metadata?.generation?.model || 'mistral-large-latest',
      temperature: metadata?.generation?.temperature || 0.7,
      regeneration_of: doc.id,
      regeneration_reason: reason || 'Source document updated',
      use_context: true
    });
    
    jobIds.push({ documentId: doc.id, jobId });
  }
  
  res.json({
    message: `Queued ${jobIds.length} documents for regeneration`,
    jobs: jobIds
  });
});
```

### **Frontend Component**

```typescript
// app/projects/[id]/documents/[docId]/page.tsx

// Add state for dependent documents
const [dependentDocs, setDependentDocs] = useState<any[]>([]);
const [showImpactWarning, setShowImpactWarning] = useState(false);

// Fetch dependents
useEffect(() => {
  async function loadDependents() {
    try {
      const response = await apiClient.get(`/documents/${documentId}/dependents`);
      setDependentDocs(response.dependent_documents || []);
    } catch (error) {
      console.error('Failed to load dependent documents:', error);
    }
  }
  
  if (documentId) {
    loadDependents();
  }
}, [documentId]);

// Show warning when editing if has dependents
const handleEdit = () => {
  if (dependentDocs.length > 0) {
    setShowImpactWarning(true);
  } else {
    startEditing();
  }
};

// Regenerate all dependents
const handleRegenerateAll = async () => {
  try {
    const response = await apiClient.post(
      `/documents/${documentId}/regenerate-dependents`,
      { reason: 'Source document updated by user' }
    );
    
    toast.success(`Regenerating ${response.jobs.length} documents...`);
    
    // Refresh UI after delay
    setTimeout(() => {
      router.reload();
    }, 3000);
  } catch (error) {
    toast.error('Failed to start regeneration');
  }
};
```

---

## 🎯 **USE CASE WALKTHROUGH:**

```
Scenario: Fix Scope Management Plan

Step 1: User Opens Scope Plan
├─ UI shows: "⚠️ 12 documents depend on this"
├─ List shows: PMP, Activity List, WBS, Risk Register...
└─ User proceeds with edit

Step 2: User Edits Content
├─ Removes: "ML, OCR, data extraction"
├─ Adds: "Document generation, AI APIs"
├─ Saves changes
└─ System detects: Source doc modified

Step 3: System Prompts
├─ Dialog: "This change affects 12 documents. Regenerate them?"
├─ Options:
│   ├─ [Regenerate All] → Queues 12 jobs
│   ├─ [Select Specific] → Choose which to update
│   └─ [Skip] → Manual updates later
└─ User clicks: "Regenerate All"

Step 4: Automatic Cascade
├─ Job 1: PMP regenerated with new Scope Plan ✅
├─ Job 2: Activity List regenerated ✅
├─ Job 3: WBS regenerated ✅
├─ ...
├─ Job 12: Risk Register regenerated ✅
└─ 10 minutes later: All docs have correct scope! 🎉

Step 5: New Baseline
├─ All documents now consistent
├─ Scope drift eliminated
├─ Baseline updated automatically
└─ Audit trail preserved (version history)
```

---

## 💰 **BUSINESS VALUE:**

```
Time Savings:
├─ Manual update: 2-4 hours per scope change
├─ Automated cascade: 5 minutes + AI time
├─ Per project: 10-20 scope changes typical
├─ Annual savings: 20-80 hours per project
└─ Value: $2K-$8K per project

Quality Improvements:
├─ Consistency: 100% (all docs use same updated source)
├─ Human error: Eliminated (no manual editing)
├─ Audit trail: Complete (regeneration tracked)
└─ Baseline integrity: Maintained automatically

Strategic Value:
├─ Differentiator: Competitors don't have this
├─ User delight: "It just fixed everything!"
├─ Scope control: Prevents drift accumulation
└─ Monday demo: Show this to Microsoft! 💎
```

---

## 📋 **IMPLEMENTATION PLAN:**

```
Phase 1: Backend (8 hours)
├─ Create get_dependent_documents() SQL function
├─ Add /documents/:id/dependents endpoint
├─ Add /documents/:id/regenerate-dependents endpoint
└─ Test with current project data

Phase 2: Frontend (8 hours)
├─ Add "Downstream Impact" card to document viewer
├─ Add impact warning on edit
├─ Add "Regenerate All" functionality
├─ Show real-time regeneration progress

Phase 3: Testing & Polish (4 hours)
├─ Test cascade regeneration
├─ Validate version history
├─ Test with various dependency depths
└─ Polish UI/UX

Total: 20 hours
ROI: Saves 20-80 hours per project
Payback: First project! ✅
```

---

## ✅ **RECOMMENDATION:**

**YES - Build this feature for Phase 1!**

```
Priority Justification:
├─ HIGH user value (eliminates manual work)
├─ LOW implementation effort (20 hours)
├─ Immediate ROI (first scope change pays for itself)
├─ Differentiator (unique feature)
├─ Enables proper baseline management
└─ Solves the exact problem you discovered tonight! 💎
```

**Should I:**
1. Create this CR officially (save to change-requests folder)?
2. Add to Phase 1 scope?
3. Implement now (20 hours work)?

**This is a HIGH-VALUE feature you just discovered through validation!** 🏆✨
