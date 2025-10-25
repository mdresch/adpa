# Feature Request: Automatic Document Drift Verification in Metadata

**Feature ID**: FR-2026-004  
**Category**: Baseline Management Enhancement  
**Priority**: Medium  
**Estimated Effort**: 1-2 weeks  
**Status**: 📋 Wishlist (Future Enhancement)

---

## Executive Summary

**What**: Automatically verify each newly generated or uploaded document against the active project baseline and store the drift analysis results in the document's metadata.

**Why**: Provide immediate feedback on baseline alignment, enable historical drift tracking, and create an audit trail of how each document relates to the approved baseline.

**Value**: Early detection of scope creep, better project governance, and enhanced traceability between documents and baselines.

**Ask**: 1-2 weeks of development time (after baseline system is stable and validated).

---

## Problem Statement

### Current Behavior

**When a Document is Generated:**
1. ✅ AI generates content
2. ✅ Document is saved with metadata
3. ❌ **No automatic baseline check**
4. ❌ User must manually check "Drift Detections" tab

**Current Drift Detection:**
- Lives on the **Baseline tab**
- Shows "No Drift Detected" or drift alerts
- **Not tied to individual documents**
- **No historical record** of when drift was introduced

---

## Proposed Solution

### Automatic Verification on Document Save

**Workflow:**
```
Document Generated/Uploaded
         ↓
   Save to Database
         ↓
   Check for Active Baseline
         ↓
   [If baseline exists]
         ↓
   Run Drift Detection
         ↓
   Store Results in Metadata
         ↓
   Return to User with Drift Alert
```

**Enhanced Metadata Structure:**
```json
{
  "id": "doc-uuid",
  "title": "Resource Management Plan",
  "generation_metadata": {
    "generation": { ... },
    "aiProcessing": { ... },
    "baseline_verification": {
      "verified": true,
      "baseline_id": "f93272c9-a0e4-4804-8f18-4dae1fb9ba5b",
      "baseline_version": "2.0",
      "verified_at": "2025-10-20T19:32:27.000Z",
      "drift_detected": false,
      "drift_analysis": {
        "scope_drift": {
          "detected": false,
          "confidence": 98,
          "details": "Document aligns with scope baseline"
        },
        "technical_drift": {
          "detected": false,
          "confidence": 95,
          "details": "Tech stack consistent with baseline"
        },
        "timeline_drift": {
          "detected": false,
          "confidence": 92,
          "details": "No schedule changes introduced"
        },
        "cost_drift": {
          "detected": false,
          "confidence": 90,
          "details": "Budget assumptions aligned"
        }
      },
      "alignment_score": 98,
      "recommendations": [],
      "flags": []
    }
  }
}
```

---

## User Experience

### During Document Generation

**Current:**
```
[Generate Document] → [Success] → "Document created successfully"
```

**Enhanced:**
```
[Generate Document] 
  → [Verify Against Baseline]
  → [Success with Alert]
  → "✅ Document created successfully"
  → "✅ No drift detected - aligns with Baseline V2.0"

OR

[Generate Document]
  → [Verify Against Baseline]
  → [Success with Warning]
  → "✅ Document created successfully"
  → "⚠️ Scope drift detected: OCR mentioned but not in baseline"
  → [View Details] button
```

### Document Viewer Enhancement

**Add "Baseline Alignment" Section:**
```
┌─────────────────────────────────────────┐
│ 📊 Baseline Alignment                   │
├─────────────────────────────────────────┤
│ ✅ Verified against Baseline V2.0       │
│ 📅 Verified: Oct 20, 2025 7:32 PM      │
│ 🎯 Alignment Score: 98%                 │
│                                         │
│ No drift detected                       │
│                                         │
│ Scope: ✅ Aligned (98%)                 │
│ Technical: ✅ Aligned (95%)             │
│ Timeline: ✅ Aligned (92%)              │
│ Cost: ✅ Aligned (90%)                  │
└─────────────────────────────────────────┘
```

---

## Technical Implementation

### Backend Changes

**1. Document Creation Hook:**
```typescript
// server/src/routes/documents.ts

router.post('/', async (req, res) => {
  // ... existing document creation logic ...
  
  // NEW: Verify against baseline
  const baseline = await baselineService.getActiveBaseline(projectId)
  
  if (baseline) {
    const driftAnalysis = await baselineService.verifyDocumentAgainstBaseline(
      documentContent,
      baseline,
      documentType
    )
    
    // Store in metadata
    generationMetadata.baseline_verification = {
      verified: true,
      baseline_id: baseline.id,
      baseline_version: baseline.version,
      verified_at: new Date().toISOString(),
      drift_detected: driftAnalysis.hasDrift,
      drift_analysis: driftAnalysis,
      alignment_score: driftAnalysis.alignmentScore
    }
  }
  
  // ... save document with enhanced metadata ...
})
```

**2. Drift Analysis Service:**
```typescript
// server/src/services/baselineService.ts

export async function verifyDocumentAgainstBaseline(
  documentContent: string,
  baseline: any,
  documentType: string
): Promise<DriftAnalysis> {
  // Use AI to compare document against baseline components
  const prompt = `
    Analyze this document against the project baseline.
    
    Baseline Scope: ${JSON.stringify(baseline.scope_baseline)}
    Baseline Tech: ${JSON.stringify(baseline.technical_baseline)}
    
    Document: ${documentContent}
    
    Identify any drift in: scope, technical approach, timeline, cost.
  `
  
  const result = await aiService.generate({
    prompt,
    provider: 'google',
    model: 'gemini-2.5-flash', // Fast model for quick checks
    temperature: 0.2 // Low temp for consistency
  })
  
  return parseDriftAnalysis(result.content)
}
```

### Frontend Changes

**1. Document Card Enhancement:**
```typescript
// components/DocumentCard.tsx

{document.generation_metadata?.baseline_verification && (
  <div className="mt-2 flex items-center gap-2">
    {document.generation_metadata.baseline_verification.drift_detected ? (
      <Badge variant="warning">
        ⚠️ Drift Detected
      </Badge>
    ) : (
      <Badge variant="success">
        ✅ Baseline Aligned
      </Badge>
    )}
    <span className="text-xs text-muted-foreground">
      Verified {new Date(document.generation_metadata.baseline_verification.verified_at).toLocaleDateString()}
    </span>
  </div>
)}
```

**2. Document Viewer Section:**
Add a new "Baseline Alignment" tab showing full drift analysis details.

---

## Benefits

| Benefit | Impact |
|---------|--------|
| **Early Warning** | Detect drift immediately when doc is created |
| **Historical Tracking** | See which doc introduced scope changes |
| **Audit Trail** | Prove when and how drift occurred |
| **Automation** | No manual baseline checking needed |
| **Governance** | Better project control and compliance |

---

## Dependencies

**Requires:**
- ✅ Baseline system stable and tested (in progress today)
- ✅ Drift detection working (confirmed: "No Drift Detected")
- ✅ Document metadata structure supports extensions (yes)

**Integrates With:**
- Document generation workflow
- Baseline management system
- Drift detection service

---

## Implementation Priority

**Priority**: Medium (after baseline testing complete)

**Rationale**:
- Nice-to-have enhancement, not critical
- Adds significant value for governance
- Relatively simple to implement
- Builds on existing drift detection

**Timeline**: Q1 2026 (after baseline validation + bug fixes)

---

## Success Criteria

- [ ] Every new document automatically verified against active baseline
- [ ] Drift results stored in document metadata
- [ ] UI displays alignment status on document cards
- [ ] Detailed drift analysis viewable in document viewer
- [ ] Zero performance impact on document generation
- [ ] Historical drift tracking available

---

## Related Work

- **Baseline System** (Currently testing)
- **Drift Detection** (Working: "No Drift Detected")
- **Document Metadata** (Robust structure in place)

---

**Status**: Documented for future implementation after baseline system is validated.

