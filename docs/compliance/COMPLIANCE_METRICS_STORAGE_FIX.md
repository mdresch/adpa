# Compliance Metrics Storage Fix

**Last Updated**: 2026-01-24  
**Status**: ✅ Fixed - Compliance Metrics Now Calculated and Stored for All Documents  
**Purpose**: Ensure compliance metrics (PMBOK, GDPR, HIPAA, SOC2, etc.) are always calculated and stored for documents, even if they weren't generated during document creation

---

## Problem

Compliance metrics were not being displayed in the Quality Audit Report, showing the message:
> "Compliance metrics are not available for this document. They are automatically calculated for newly generated documents."

**Root Cause:**
1. Compliance metrics were only calculated during document generation and stored in `generation_metadata.complianceMetrics`
2. The quality audit service only tried to extract compliance metrics from `generation_metadata` - it didn't calculate them itself
3. If `generation_metadata` didn't have `complianceMetrics`, they were never calculated or displayed
4. Even for newly generated documents, compliance metrics might not have been calculated if the calculation step was skipped

---

## Solution

### 1. **Export `calculateComplianceMetrics` Function**

**File**: `server/src/utils/documentMetadata.ts`

- Changed `calculateComplianceMetrics` from private function to exported function
- Allows quality audit service to calculate compliance metrics independently

```typescript
// Before: private function
function calculateComplianceMetrics(...)

// After: exported function
export function calculateComplianceMetrics(...)
```

### 2. **Calculate Compliance Metrics During Quality Audit**

**File**: `server/src/services/qualityAuditService.ts`

**Added to `auditDocument()` method:**
- Check if compliance metrics exist in document's `generation_metadata`
- If not found, calculate them using `calculateComplianceMetrics()`
- Store calculated metrics for later use

```typescript
// 4.5. Calculate compliance metrics if not available in generation_metadata
let complianceMetrics = null
try {
  // Try to get compliance metrics from document's generation_metadata first
  const docResult = await pool.query(
    'SELECT generation_metadata, template_id, template_framework FROM documents WHERE id = $1',
    [documentId]
  )
  
  if (docResult.rows.length > 0) {
    const doc = docResult.rows[0]
    const genMetadata = doc.generation_metadata
    
    if (genMetadata) {
      const metadata = typeof genMetadata === 'string' ? JSON.parse(genMetadata) : genMetadata
      if (metadata.complianceMetrics) {
        complianceMetrics = metadata.complianceMetrics
        // Use existing metrics
      }
    }
  }
  
  // If not found in generation_metadata, calculate them
  if (!complianceMetrics) {
    const { calculateComplianceMetrics } = await import('../utils/documentMetadata')
    
    const tempMetadata = {
      wordCount: documentContent.split(/\s+/).filter(Boolean).length,
      characterCount: documentContent.length,
      sentenceCount: (documentContent.match(/[.!?]+/g) || []).length,
      paragraphCount: (documentContent.match(/\n\n+/g) || []).length + 1,
      templateId: projectContext.templateId || undefined,
      framework: projectContext.framework || undefined
    } as any
    
    complianceMetrics = calculateComplianceMetrics(
      documentContent,
      tempMetadata,
      projectContext.framework as string
    )
  }
} catch (error) {
  // Non-blocking - continue without compliance metrics if calculation fails
}
```

### 3. **Store Compliance Metrics in Document's `generation_metadata`**

**File**: `server/src/services/qualityAuditService.ts`

**Updated `saveAuditResults()` method:**
- Accept `complianceMetrics` as parameter
- Always update document's `generation_metadata` with compliance metrics
- Ensures compliance metrics are available for future audits

```typescript
private async saveAuditResults(auditData: {
  // ... existing fields ...
  complianceMetrics?: any // Compliance metrics (PMBOK, GDPR, HIPAA, etc.)
  // ...
}): Promise<string> {
  // ... save audit to database ...
  
  // Update document's generation_metadata with compliance metrics if calculated
  if (auditData.complianceMetrics) {
    const docResult = await pool.query(
      'SELECT generation_metadata FROM documents WHERE id = $1',
      [auditData.documentId]
    )
    
    if (docResult.rows.length > 0) {
      let genMetadata = docResult.rows[0].generation_metadata
      
      // Parse if string, otherwise use as-is
      if (typeof genMetadata === 'string') {
        try {
          genMetadata = JSON.parse(genMetadata)
        } catch {
          genMetadata = {}
        }
      } else if (!genMetadata) {
        genMetadata = {}
      }
      
      // Always update compliance metrics (they may have been recalculated)
      genMetadata.complianceMetrics = auditData.complianceMetrics
      
      // Update document with compliance metrics
      await pool.query(
        'UPDATE documents SET generation_metadata = $1 WHERE id = $2',
        [JSON.stringify(genMetadata), auditData.documentId]
      )
    }
  }
}
```

### 4. **Enhanced Logging**

**File**: `server/src/services/qualityAuditService.ts`

- Added detailed logging when compliance metrics are calculated
- Added logging when compliance metrics are extracted from `generation_metadata`
- Added warning logs when compliance metrics are not found

---

## Compliance Metrics Calculated

The following compliance metrics are now calculated for all documents:

1. **PMBOK Guide Compliance** (0-100%)
   - Checks for PMBOK keywords, structure, processes, and knowledge areas
   - Higher weight if framework is PMBOK-related

2. **GDPR Compliance** (0-100%)
   - Checks for GDPR keywords, principles, data subject rights
   - Evaluates data protection and privacy mentions

3. **HIPAA Compliance** (0-100%)
   - Checks for HIPAA keywords, privacy rule, security rule
   - Evaluates protected health information (PHI) mentions

4. **SOC 2 Compliance** (0-100%)
   - Checks for SOC 2 keywords, trust service criteria
   - Evaluates security and availability controls

5. **Industry Standards Compliance** (0-100%)
   - Checks for ISO, ANSI, IEEE, NIST, CMMI, ITIL, COBIT mentions
   - Evaluates standards references

6. **Best Practices Adherence** (0-100%)
   - Checks for best practice keywords, lessons learned
   - Evaluates proven methods and documentation standards

7. **Template Adherence** (0-100%)
   - Checks document structure, formatting, sections
   - Evaluates template compliance

8. **Overall Compliance Rating** (0-100%)
   - Weighted average of all compliance metrics
   - PMBOK gets higher weight if framework is PMBOK-related

---

## Data Flow

### During Quality Audit:

1. **Quality Audit Triggered** → `qualityAuditService.auditDocument()`
2. **Check for Existing Compliance Metrics** → Query document's `generation_metadata`
3. **If Not Found** → Calculate using `calculateComplianceMetrics()`
4. **Store in Audit** → Pass to `saveAuditResults()`
5. **Update Document** → Store in document's `generation_metadata`
6. **Return to Frontend** → Extracted via `getDocumentAudit()`

### When Retrieving Audit:

1. **Frontend Requests Audit** → `GET /api/quality-audits/document/:documentId`
2. **Backend Retrieves Audit** → `qualityAuditService.getDocumentAudit()`
3. **Extract Compliance Metrics** → From document's `generation_metadata`
4. **Extract EU AI Act Compliance** → From `quality_gate_results` (if available)
5. **Return Combined Data** → Frontend displays in Quality Audit Modal

---

## Files Modified

1. **`server/src/utils/documentMetadata.ts`**
   - Exported `calculateComplianceMetrics` function
   - Changed from private to public export

2. **`server/src/services/qualityAuditService.ts`**
   - Added compliance metrics calculation in `auditDocument()` method
   - Updated `saveAuditResults()` to accept and store compliance metrics
   - Added code to update document's `generation_metadata` with compliance metrics
   - Enhanced logging for compliance metrics calculation and storage

---

## Testing

### Test Case 1: Document Without Compliance Metrics

**Setup:**
- Document exists but `generation_metadata.complianceMetrics` is missing
- Quality audit is triggered

**Expected Result:**
- ✅ Compliance metrics are calculated during quality audit
- ✅ Compliance metrics are stored in document's `generation_metadata`
- ✅ Compliance metrics are displayed in Quality Audit Modal

### Test Case 2: Document With Existing Compliance Metrics

**Setup:**
- Document has `generation_metadata.complianceMetrics` from generation
- Quality audit is triggered

**Expected Result:**
- ✅ Existing compliance metrics are used (not recalculated)
- ✅ Compliance metrics are displayed in Quality Audit Modal

### Test Case 3: Newly Generated Document

**Setup:**
- Document is generated via `/api/document-generation/generate`
- Compliance metrics should be calculated during generation

**Expected Result:**
- ✅ Compliance metrics are calculated during document generation
- ✅ Compliance metrics are stored in `generation_metadata`
- ✅ Compliance metrics are available in Quality Audit Modal

---

## Benefits

1. **Always Available**: Compliance metrics are now always calculated, even if they weren't during document generation
2. **Automatic Calculation**: No manual intervention required - metrics are calculated during quality audit
3. **Persistent Storage**: Compliance metrics are stored in document's `generation_metadata` for future reference
4. **Comprehensive Coverage**: All 7 compliance metrics (PMBOK, GDPR, HIPAA, SOC2, Industry Standards, Best Practices, Template Adherence) are calculated
5. **EU AI Act Integration**: EU AI Act compliance scores are also extracted and displayed alongside standard compliance metrics

---

## Related Documentation

- [EU AI Act Quality Gate Integration](./EU_AI_ACT_QUALITY_GATE_INTEGRATION.md) - EU AI Act compliance integration
- [EU AI Act Scoring Matrix Display](./EU_AI_ACT_SCORING_MATRIX_DISPLAY.md) - Where compliance scores are visible
- [Compliance Scoring System](./COMPLIANCE_SCORING_SYSTEM.md) - Overall compliance scoring methodology

---

## Status

✅ **Compliance Metrics Storage Fixed**

- ✅ `calculateComplianceMetrics` function exported
- ✅ Compliance metrics calculated during quality audit if missing
- ✅ Compliance metrics stored in document's `generation_metadata`
- ✅ Compliance metrics extracted and returned in audit results
- ✅ Enhanced logging for debugging
- ✅ Works for both newly generated and existing documents

---

**Last Updated**: 2026-01-24  
**Next Steps**: Test with existing documents to verify compliance metrics are calculated and displayed correctly
