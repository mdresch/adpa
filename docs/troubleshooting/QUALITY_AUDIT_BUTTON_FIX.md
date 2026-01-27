# Quality Audit Button Root Cause Analysis & Remediation

**Issue**: "Run Quality Audit" button in document metadata Quick Actions is not working  
**Date**: 2026-01-24  
**Status**: Root Cause Identified - Remediation Plan Ready

---

## Root Cause Analysis

### 1. **Code Flow Investigation**

#### Frontend (✅ Working)
- **Location**: `app/projects/[id]/documents/[docId]/page.tsx` (line 494-559)
- **Button**: "Run Quality Audit" in Quick Actions section (line 1114-1131)
- **Handler**: `handleRunQualityAudit()` function
- **API Call**: `POST /api/quality-audits/trigger` with `{ documentId: docId }`

#### Backend Route (⚠️ Potential Issue)
- **Location**: `server/src/routes/qualityAuditRoutes.ts` (line 150-299)
- **Endpoint**: `POST /api/quality-audits/trigger`
- **Registration**: ✅ Registered in `server/src/server.ts` (line 307)

#### Service Implementation (⚠️ Synchronous Execution)
- **Location**: `server/src/services/qualityAuditService.ts` (line 53-239)
- **Method**: `auditDocument()` - **runs synchronously**

### 2. **Root Causes Identified**

#### **Primary Issue: Synchronous Execution with No Timeout Handling**

The `/trigger` endpoint calls `qualityAuditService.auditDocument()` **synchronously** and waits for completion:

```typescript
// qualityAuditRoutes.ts line 280-286
const auditResult = await qualityAuditService.auditDocument(
  documentId,
  document.content,
  document.document_type || document.title || 'Document',
  projectResult.rows[0],
  userId
)
```

**Problems**:
1. **Long-running operation** - Quality audit involves AI analysis which can take 10-30+ seconds
2. **No timeout protection** - HTTP request may timeout before completion
3. **Blocking operation** - Server thread blocked during audit
4. **Inconsistent with other implementations** - Other places use async queue (see `projects.ts` line 2252)

#### **Secondary Issue: Error Handling Gaps**

1. **Frontend error handling** may not catch all error types
2. **Backend error responses** may not be properly formatted
3. **Service errors** may be thrown but not logged clearly

#### **Tertiary Issue: Document Content Validation**

The service validates document content (line 63-70), but:
- If `document.content` is null/empty, audit fails
- Error message may not be user-friendly
- Frontend doesn't validate content before triggering

### 3. **Evidence from Codebase**

**Inconsistent Pattern**: Other quality audit triggers use **async queue**:

```typescript
// projects.ts line 2252 - CORRECT PATTERN
getQueueService().addJob('quality-audit', {
  jobId: auditJobId,
  documentId,
  documentContent: content,
  documentType: updatedDoc.type || 'unknown',
  projectContext: { id: projectId, name: 'Project' },
  userId
})
```

**But `/trigger` endpoint uses synchronous call**:

```typescript
// qualityAuditRoutes.ts line 280 - PROBLEMATIC PATTERN
const auditResult = await qualityAuditService.auditDocument(...)
```

---

## Remediation Plan

### Phase 1: Immediate Fix - Add Proper Error Handling & Validation

**Goal**: Ensure errors are caught, logged, and returned to frontend properly

#### Step 1.1: Enhance Frontend Error Handling

**File**: `app/projects/[id]/documents/[docId]/page.tsx`

**Changes**:
1. Add validation before API call
2. Improve error message extraction
3. Add network error handling
4. Add timeout handling

```typescript
const handleRunQualityAudit = async () => {
  if (!document) {
    toast.error("Document not loaded")
    return
  }

  // ✅ NEW: Validate document has content
  if (!document.content || document.content.trim().length === 0) {
    toast.error("Document has no content to audit. Please ensure the document has been generated.")
    return
  }

  // Clear any existing timeout
  if (qualityAuditTimeoutRef.current) {
    clearTimeout(qualityAuditTimeoutRef.current)
    qualityAuditTimeoutRef.current = null
  }

  try {
    setRunningQualityAudit(true)
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
    const authToken = token || localStorage.getItem('auth_token') || localStorage.getItem('token')
    
    if (!authToken) {
      toast.error("Authentication required. Please log in again.")
      setRunningQualityAudit(false)
      return
    }

    // ✅ NEW: Add timeout to fetch request
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

    try {
      const response = await fetch(`${API_BASE_URL}/quality-audits/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentId: docId
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // ✅ NEW: Better error handling for non-JSON responses
      let data
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 200)}`)
      }

      if (!response.ok) {
        // ✅ NEW: Extract error message from various response formats
        const errorMessage = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`
        throw new Error(errorMessage)
      }

      // ✅ NEW: Validate response structure
      if (!data || !data.success) {
        throw new Error(data?.error || 'Quality audit response was invalid')
      }

      toast.success(data.message || "Quality audit started successfully!")
      
      setRunningQualityAudit(false)
      
      // Refresh audit data after delay
      qualityAuditTimeoutRef.current = setTimeout(async () => {
        await fetchQualityAudit()
        setShowQualityAuditModal(true)
        qualityAuditTimeoutRef.current = null
      }, 3000)
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      // ✅ NEW: Handle specific error types
      if (fetchError.name === 'AbortError') {
        throw new Error('Quality audit request timed out. The audit may still be processing. Please check back in a moment.')
      } else if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.')
      } else {
        throw fetchError
      }
    }
  } catch (error) {
    console.error("Failed to run quality audit:", error)
    
    // ✅ NEW: More descriptive error messages
    let errorMessage = "Failed to run quality audit"
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    }
    
    toast.error(errorMessage)
    setRunningQualityAudit(false)
    
    // Clear timeout if it was set
    if (qualityAuditTimeoutRef.current) {
      clearTimeout(qualityAuditTimeoutRef.current)
      qualityAuditTimeoutRef.current = null
    }
  }
}
```

#### Step 1.2: Enhance Backend Error Handling

**File**: `server/src/routes/qualityAuditRoutes.ts`

**Changes**:
1. Add input validation
2. Improve error logging
3. Return consistent error format
4. Add document content validation

```typescript
router.post(
  '/trigger',
  authenticateToken,
  validate(triggerAuditSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.body
      const userId = (req as any).user?.id

      // ✅ NEW: Enhanced logging
      logger.info('[QUALITY-AUDIT-API] Manual audit triggered', {
        documentId,
        userId,
        timestamp: new Date().toISOString()
      })

      // ... existing access check code ...

      // ✅ NEW: Validate document exists and has content
      const docResult = await pool.query(
        `SELECT d.content, d.title, d.project_id, t.name as document_type
         FROM documents d
         LEFT JOIN templates t ON d.template_id = t.id
         WHERE d.id = $1`,
        [documentId]
      )

      if (docResult.rows.length === 0) {
        logger.warn('[QUALITY-AUDIT-API] Document not found', { documentId })
        return res.status(404).json({
          success: false,
          error: 'Document not found'
        })
      }

      const document = docResult.rows[0]

      // ✅ NEW: Validate document has content
      if (!document.content || typeof document.content !== 'string' || document.content.trim().length === 0) {
        logger.warn('[QUALITY-AUDIT-API] Document has no content', { documentId })
        return res.status(400).json({
          success: false,
          error: 'Document has no content to audit. Please ensure the document has been generated.'
        })
      }

      // Get project context
      const projectResult = await pool.query(
        'SELECT * FROM projects WHERE id = $1',
        [document.project_id]
      )

      if (projectResult.rows.length === 0) {
        logger.warn('[QUALITY-AUDIT-API] Project not found', { 
          documentId, 
          projectId: document.project_id 
        })
        return res.status(404).json({
          success: false,
          error: 'Project not found for this document'
        })
      }

      // ✅ NEW: Wrap audit in try-catch for better error handling
      let auditResult
      try {
        auditResult = await qualityAuditService.auditDocument(
          documentId,
          document.content,
          document.document_type || document.title || 'Document',
          projectResult.rows[0],
          userId
        )
      } catch (auditError: any) {
        logger.error('[QUALITY-AUDIT-API] Audit service failed', {
          documentId,
          userId,
          error: auditError.message,
          stack: auditError.stack
        })
        
        // ✅ NEW: Return user-friendly error message
        return res.status(500).json({
          success: false,
          error: auditError.message || 'Quality audit failed. Please try again or contact support if the issue persists.'
        })
      }

      logger.info('[QUALITY-AUDIT-API] Audit completed successfully', {
        documentId,
        userId,
        overallScore: auditResult.overallScore,
        overallGrade: auditResult.overallGrade
      })

      res.json({
        success: true,
        audit: auditResult,
        message: 'Quality audit completed successfully'
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to trigger audit', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      next(error)
    }
  }
)
```

---

### Phase 2: Long-Term Fix - Migrate to Async Queue Pattern

**Goal**: Make quality audit non-blocking and consistent with other implementations

#### Step 2.1: Update `/trigger` Endpoint to Use Queue

**File**: `server/src/routes/qualityAuditRoutes.ts`

**Changes**: Replace synchronous call with async queue job

```typescript
router.post(
  '/trigger',
  authenticateToken,
  validate(triggerAuditSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { documentId } = req.body
      const userId = (req as any).user?.id

      // ... existing access check and validation code ...

      // ✅ NEW: Use async queue instead of synchronous call
      const { getQueueService } = await import('../services/queueService')
      const { v4: uuidv4 } = await import('uuid')
      
      const auditJobId = uuidv4()
      
      logger.info('[QUALITY-AUDIT-API] Enqueuing quality audit job', {
        documentId,
        userId,
        jobId: auditJobId
      })

      // Enqueue job (non-blocking)
      await getQueueService().addJob('quality-audit', {
        jobId: auditJobId,
        documentId,
        documentContent: document.content,
        documentType: document.document_type || document.title || 'Document',
        projectContext: projectResult.rows[0],
        userId
      })

      // ✅ NEW: Return job ID for tracking
      res.json({
        success: true,
        jobId: auditJobId,
        message: 'Quality audit job queued successfully. Results will be available shortly.',
        status: 'queued'
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to trigger audit', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)
```

#### Step 2.2: Update Frontend to Poll for Results

**File**: `app/projects/[id]/documents/[docId]/page.tsx`

**Changes**: Poll for audit results after job is queued

```typescript
const handleRunQualityAudit = async () => {
  // ... existing validation ...

  try {
    setRunningQualityAudit(true)
    
    // ... existing API call setup ...

    const response = await fetch(`${API_BASE_URL}/quality-audits/trigger`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        documentId: docId
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to trigger quality audit')
    }

    // ✅ NEW: Handle async job response
    if (data.status === 'queued' && data.jobId) {
      toast.success("Quality audit queued successfully! Checking results...")
      
      // Poll for results
      let attempts = 0
      const maxAttempts = 30 // 30 attempts = 30 seconds
      
      const pollInterval = setInterval(async () => {
        attempts++
        
        try {
          await fetchQualityAudit()
          
          // Check if audit is complete
          if (qualityAudit && qualityAudit.audited_at) {
            clearInterval(pollInterval)
            setRunningQualityAudit(false)
            setShowQualityAuditModal(true)
            toast.success("Quality audit completed!")
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            setRunningQualityAudit(false)
            toast.warning("Quality audit is taking longer than expected. Please check back in a moment.")
          }
        } catch (error) {
          // Continue polling on error
          if (attempts >= maxAttempts) {
            clearInterval(pollInterval)
            setRunningQualityAudit(false)
            toast.error("Failed to retrieve audit results. Please refresh the page.")
          }
        }
      }, 1000) // Poll every second
      
      // Store interval ID for cleanup
      qualityAuditTimeoutRef.current = setTimeout(() => {
        clearInterval(pollInterval)
        qualityAuditTimeoutRef.current = null
      }, 30000)
    } else {
      // ✅ FALLBACK: Handle immediate response (if audit completed quickly)
      toast.success(data.message || "Quality audit completed successfully!")
      setRunningQualityAudit(false)
      
      qualityAuditTimeoutRef.current = setTimeout(async () => {
        await fetchQualityAudit()
        setShowQualityAuditModal(true)
        qualityAuditTimeoutRef.current = null
      }, 1000)
    }
  } catch (error) {
    // ... existing error handling ...
  }
}
```

---

### Phase 3: Additional Improvements

#### Step 3.1: Add Job Status Endpoint

**New Endpoint**: `GET /api/quality-audits/job/:jobId/status`

**Purpose**: Allow frontend to check job status

```typescript
router.get(
  '/job/:jobId/status',
  authenticateToken,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobId } = req.params
      const { getQueueService } = await import('../services/queueService')
      
      const job = await getQueueService().getJob('quality-audit', jobId)
      
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
        })
      }
      
      res.json({
        success: true,
        job: {
          id: job.id,
          status: job.status,
          progress: job.progress || 0,
          result: job.result || null,
          error: job.failedReason || null
        }
      })
    } catch (error: unknown) {
      logger.error('[QUALITY-AUDIT-API] Failed to get job status', {
        error: error instanceof Error ? error.message : String(error)
      })
      next(error)
    }
  }
)
```

#### Step 3.2: Add Loading States

**Enhancement**: Show better loading feedback during audit

- Add progress indicator
- Show estimated time remaining
- Display current audit step

---

## Implementation Checklist

### Phase 1: Immediate Fix (Priority: HIGH)
- [ ] **Step 1.1**: Enhance frontend error handling
  - [ ] Add document content validation
  - [ ] Add timeout handling
  - [ ] Improve error message extraction
  - [ ] Add network error handling
- [ ] **Step 1.2**: Enhance backend error handling
  - [ ] Add document content validation
  - [ ] Improve error logging
  - [ ] Return consistent error format
  - [ ] Add project validation

### Phase 2: Long-Term Fix (Priority: MEDIUM)
- [ ] **Step 2.1**: Migrate to async queue pattern
  - [ ] Update `/trigger` endpoint to use queue
  - [ ] Return job ID in response
  - [ ] Update error handling for queue operations
- [ ] **Step 2.2**: Update frontend polling
  - [ ] Implement polling mechanism
  - [ ] Handle job status updates
  - [ ] Add timeout for polling

### Phase 3: Additional Improvements (Priority: LOW)
- [ ] **Step 3.1**: Add job status endpoint
- [ ] **Step 3.2**: Add loading states and progress indicators

---

## Testing Plan

### Manual Testing
1. **Test with valid document**:
   - Click "Run Quality Audit" button
   - Verify audit completes successfully
   - Verify results appear in modal

2. **Test with empty document**:
   - Try to audit document with no content
   - Verify error message is shown
   - Verify button is re-enabled

3. **Test with network error**:
   - Disconnect network
   - Click "Run Quality Audit"
   - Verify error message is shown

4. **Test with timeout**:
   - Simulate slow API response
   - Verify timeout handling works
   - Verify user-friendly error message

### Automated Testing
- [ ] Unit tests for error handling
- [ ] Integration tests for API endpoint
- [ ] E2E tests for button functionality

---

## Rollback Plan

If issues occur after deployment:

1. **Phase 1 changes**: Low risk - only error handling improvements
2. **Phase 2 changes**: Medium risk - can rollback by reverting to synchronous call
3. **Keep Phase 1 improvements** even if Phase 2 is rolled back

---

## Success Criteria

✅ **Phase 1 Complete When**:
- Button shows clear error messages for all failure scenarios
- Document content validation prevents invalid audits
- All errors are logged properly

✅ **Phase 2 Complete When**:
- Quality audit runs asynchronously
- Frontend polls for results successfully
- No HTTP timeouts occur
- Consistent with other quality audit implementations

---

## Related Files

- `app/projects/[id]/documents/[docId]/page.tsx` - Frontend button implementation
- `server/src/routes/qualityAuditRoutes.ts` - Backend API endpoint
- `server/src/services/qualityAuditService.ts` - Audit service
- `server/src/services/queueService.ts` - Queue service (for Phase 2)

---

**Last Updated**: 2026-01-24  
**Status**: Root Cause Identified - Ready for Implementation  
**Next Step**: Implement Phase 1 fixes (immediate error handling improvements)
