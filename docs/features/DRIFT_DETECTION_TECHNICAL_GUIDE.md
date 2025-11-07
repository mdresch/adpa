# Automatic Drift Detection & Resolution - Technical Integration Guide

**Status**: ✅ Production-Ready  
**Last Updated**: November 4, 2025  
**For**: Developers, DevOps, System Integrators

---

## 📋 Architecture Overview

The drift detection system consists of:

1. **Backend Services** (Node.js/TypeScript)
   - DriftDetectionService
   - DriftResolutionService
   - Automatic trigger in document update route

2. **Frontend Components** (React/Next.js)
   - useDriftDetection hook
   - DriftAlertBanner
   - DriftResolutionDialog
   - SideBySideDiff

3. **Real-time Layer** (WebSocket/Socket.io)
   - drift:detected events
   - Project room subscriptions

4. **Database** (PostgreSQL)
   - project_baselines table
   - baseline_drift_detection table
   - Audit logs

---

## 🔧 Backend Implementation

### 1. Automatic Drift Detection (Document Update Route)

**Location**: `server/src/routes/documents.ts` (lines 1191-1282)

```typescript
// ⭐ AUTOMATIC DRIFT DETECTION on document save
router.put('/:id', authenticateToken, async (req, res) => {
  // ... document update logic ...
  
  // After document is updated
  const result = await pool.query('UPDATE documents ...')
  
  // Auto-detect drift if document has project_id and content was updated
  if (content && result.rows[0]?.project_id && result.rows[0]?.content) {
    try {
      const { driftDetectionService } = await import('../services/driftDetectionService')
      
      // Check for drift
      const driftResult = await driftDetectionService.checkForDrift(
        result.rows[0].project_id,
        id
      )
      
      driftRevalidation = {
        hasDrift: driftResult.hasDrift,
        severity: driftResult.severity,
        driftCount: driftResult.driftPoints.length,
        summary: driftResult.summary
      }
      
      if (driftResult.hasDrift) {
        // Get baseline ID
        const baselineResult = await pool.query(
          `SELECT id FROM project_baselines 
           WHERE project_id = $1 
           AND status IN ('approved', 'active')
           ORDER BY approved_at DESC LIMIT 1`,
          [result.rows[0].project_id]
        )
        
        if (baselineResult.rows.length > 0) {
          // Create drift record
          const driftRecord = await driftDetectionService.createDriftRecord({
            projectId: result.rows[0].project_id,
            documentId: id,
            baselineId: baselineResult.rows[0].id,
            driftPoints: driftResult.driftPoints,
            severity: driftResult.severity,
            triggeredBy: 'document_update'
          })
          
          driftRevalidation.driftRecordId = driftRecord.id
          
          // Emit WebSocket event
          io.to(`project:${result.rows[0].project_id}`).emit('drift:detected', {
            documentId: id,
            documentTitle: result.rows[0].name,
            driftRecordId: driftRecord.id,
            severity: driftResult.severity,
            driftCount: driftResult.driftPoints.length
          })
        }
      } else {
        // Mark any existing drift as resolved
        await pool.query(
          `UPDATE baseline_drift_detection 
           SET status = 'resolved',
               resolution_notes = 'Drift resolved via manual edit',
               resolved_at = CURRENT_TIMESTAMP
           WHERE source_document_id = $1 
           AND status = 'detected'`,
          [id]
        )
      }
    } catch (driftErr) {
      logger.error('[DRIFT] Drift validation failed:', driftErr)
      // Don't fail the update if drift validation fails
    }
  }
  
  return res.json({
    message: "Document updated successfully",
    document: result.rows[0],
    driftRevalidation  // Include drift info in response
  })
})
```

### 2. Drift Detection Service

**Location**: `server/src/services/driftDetectionService.ts`

```typescript
export class DriftDetectionService {
  /**
   * Check for drift after document update
   */
  async checkForDrift(
    projectId: string,
    documentId: string
  ): Promise<DriftDetectionResult> {
    // 1. Get approved baseline
    const baseline = await this.getApprovedBaseline(projectId)
    
    if (!baseline) {
      return {
        hasDrift: false,
        severity: 'low',
        driftPoints: [],
        summary: 'No baseline exists for comparison'
      }
    }
    
    // 2. Extract current entities from document
    const currentEntities = await this.extractEntitiesFromDocument(documentId)
    
    // 3. Compare with baseline
    const driftPoints = this.compareWithBaseline(baseline, currentEntities)
    
    // 4. Calculate severity
    const severity = this.calculateDriftSeverity(driftPoints)
    
    // 5. Generate summary
    const summary = this.generateDriftSummary(driftPoints)
    
    return {
      hasDrift: driftPoints.length > 0,
      severity,
      driftPoints,
      summary
    }
  }
  
  /**
   * Compare current entities with baseline
   */
  private compareWithBaseline(
    baseline: Baseline,
    currentEntities: ExtractedEntities
  ): DriftPoint[] {
    const driftPoints: DriftPoint[] = []
    
    // Check all 14 entity types
    driftPoints.push(...this.detectStakeholderDrift(baseline.stakeholders, currentEntities.stakeholders))
    driftPoints.push(...this.detectRiskDrift(baseline.risks, currentEntities.risks))
    driftPoints.push(...this.detectMilestoneDrift(baseline.milestones, currentEntities.milestones))
    // ... (continue for all 14 entity types)
    
    return driftPoints
  }
}
```

### 3. Drift Resolution Service

**Location**: `server/src/services/driftResolutionService.ts`

```typescript
export class DriftResolutionService {
  /**
   * Resolve drift using AI
   */
  async resolveDrift(
    documentId: string,
    driftRecordId: string,
    userId: string,
    strategy: 'conservative' | 'balanced' | 'permissive' = 'balanced'
  ): Promise<ResolutionResult> {
    // 1. Get drift record with all drift points
    const driftRecord = await this.getDriftRecord(driftRecordId)
    
    // 2. Get approved baseline
    const baseline = await this.getBaseline(driftRecord.baseline_id)
    
    // 3. Get current document content
    const document = await this.getDocument(documentId)
    
    // 4. Parse drift points from metadata
    const driftPoints = driftRecord.ai_processing_metadata?.drift_points || []
    
    // 5. Build resolution prompt
    const prompt = this.buildResolutionPrompt(
      document,
      baseline,
      driftPoints,
      strategy
    )
    
    // 6. Call AI to generate resolved version
    const aiResponse = await aiService.generate({
      prompt,
      provider: 'openai',
      model: 'gpt-4-turbo-preview',
      temperature: 0.2, // Low temp for consistent, accurate resolution
      max_tokens: 8000
    })
    
    // 7. Parse resolved content
    const resolvedContent = this.parseResolvedContent(aiResponse.content)
    
    // 8. Identify major changes (require approval)
    const majorChanges = this.identifyMajorChanges(driftPoints)
    
    // 9. Prepare result
    return {
      resolvedContent,
      originalContent: document.content,
      driftPoints,
      majorChanges,
      requiresApproval: majorChanges.length > 0,
      strategy,
      previewHtml: await this.generateDiffPreview(document.content, resolvedContent)
    }
  }
  
  /**
   * Apply resolution to document
   */
  async applyResolution(
    documentId: string,
    resolvedContent: string,
    driftRecordId: string,
    userId: string
  ): Promise<ApplyResolutionResult> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Update document with resolved content
      await client.query(
        `UPDATE documents 
         SET content = $1, updated_at = NOW()
         WHERE id = $2`,
        [resolvedContent, documentId]
      )
      
      // 2. Mark drift as resolved
      await client.query(
        `UPDATE baseline_drift_detection
         SET status = 'resolved', 
             resolved_at = NOW(), 
             assigned_to = $1
         WHERE id = $2`,
        [userId, driftRecordId]
      )
      
      // 3. Create audit log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, details
        ) VALUES ($1, 'drift_resolved', 'document', $2, $3)`,
        [userId, documentId, JSON.stringify({
          driftRecordId,
          method: 'ai_assisted',
          timestamp: new Date()
        })]
      )
      
      await client.query('COMMIT')
      
      return {}
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
```

### 4. API Routes

**Location**: `server/src/routes/drift.ts`

```typescript
import express from 'express'
import { authenticateToken, requirePermission } from '../middleware/auth'
import { driftDetectionService } from '../services/driftDetectionService'
import { driftResolutionService } from '../services/driftResolutionService'

const router = express.Router()

/**
 * POST /api/drift/check
 * Manually trigger drift detection
 */
router.post('/check', authenticateToken, requirePermission('documents.update'),
  async (req, res) => {
    const { projectId, documentId } = req.body
    
    const result = await driftDetectionService.checkForDrift(projectId, documentId)
    
    res.json({
      success: true,
      driftDetected: result.hasDrift,
      severity: result.severity,
      driftCount: result.driftPoints.length,
      summary: result.summary,
      driftPoints: result.driftPoints
    })
  }
)

/**
 * POST /api/drift/resolve
 * Generate AI-powered resolution
 */
router.post('/resolve', authenticateToken, requirePermission('documents.update'),
  async (req, res) => {
    const { documentId, driftRecordId, strategy } = req.body
    const userId = req.user?.id
    
    const result = await driftResolutionService.resolveDrift(
      documentId,
      driftRecordId,
      userId!,
      strategy || 'balanced'
    )
    
    res.json({
      success: true,
      resolvedContent: result.resolvedContent,
      originalContent: result.originalContent,
      driftPoints: result.driftPoints,
      majorChanges: result.majorChanges,
      requiresApproval: result.requiresApproval,
      strategy: result.strategy
    })
  }
)

/**
 * POST /api/drift/apply
 * Apply AI-generated resolution
 */
router.post('/apply', authenticateToken, requirePermission('documents.update'),
  async (req, res) => {
    const { documentId, driftRecordId, resolvedContent } = req.body
    const userId = req.user?.id
    
    const result = await driftResolutionService.applyResolution(
      documentId,
      resolvedContent,
      driftRecordId,
      userId!
    )
    
    res.json({
      success: true,
      message: 'Drift resolved successfully',
      changeRequestCreated: !!result.changeRequestId,
      changeRequestId: result.changeRequestId
    })
  }
)

export default router
```

---

## 🎨 Frontend Implementation

### 1. Drift Detection Hook

**Location**: `hooks/use-drift-detection.ts`

```typescript
import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

export function useDriftDetection(documentId: string, projectId?: string) {
  const { socket, joinRoom, on, off } = useWebSocket()
  const [driftAlert, setDriftAlert] = useState<DriftAlert | null>(null)
  const [resolutionPreview, setResolutionPreview] = useState<ResolutionPreview | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Join project room for drift notifications
  useEffect(() => {
    if (projectId && socket) {
      joinRoom(`project:${projectId}`)
    }
  }, [projectId, socket, joinRoom])

  // Listen for drift detection events
  useEffect(() => {
    if (!socket) return

    const handleDriftDetected = (data: any) => {
      if (data.documentId === documentId) {
        setDriftAlert({
          driftRecordId: data.driftRecordId,
          severity: data.severity,
          driftCount: data.driftCount,
          summary: `${data.driftCount} drift point${data.driftCount > 1 ? 's' : ''} detected`
        })

        toast.warning(
          `Baseline drift detected: ${data.driftCount} change${data.driftCount > 1 ? 's' : ''}`,
          { duration: 8000 }
        )
      }
    }

    on('drift:detected', handleDriftDetected)

    return () => {
      off('drift:detected', handleDriftDetected)
    }
  }, [socket, documentId, on, off])

  // Handle "Resolve Drift" button click
  const handleResolveDrift = useCallback(async (
    strategy: 'conservative' | 'balanced' | 'permissive' = 'balanced'
  ) => {
    if (!driftAlert) return

    setIsResolving(true)

    try {
      const response = await apiClient.post('/api/drift/resolve', {
        documentId,
        driftRecordId: driftAlert.driftRecordId,
        strategy
      })

      setResolutionPreview(response.data)
      toast.success('Resolution prepared! Review changes before applying.')
    } catch (error: any) {
      toast.error('Failed to prepare drift resolution: ' + (error.message || 'Unknown error'))
    } finally {
      setIsResolving(false)
    }
  }, [driftAlert, documentId])

  // Apply AI-generated resolution
  const handleApplyResolution = useCallback(async () => {
    if (!resolutionPreview || !driftAlert) return

    setIsApplying(true)

    try {
      await apiClient.post('/api/drift/apply', {
        documentId,
        driftRecordId: driftAlert.driftRecordId,
        resolvedContent: resolutionPreview.resolvedContent
      })

      setDriftAlert(null)
      setResolutionPreview(null)

      toast.success('✅ Drift resolved! Document realigned with baseline.')

      if (resolutionPreview.requiresApproval) {
        toast.info('Change request created for major changes requiring approval')
      }

      return true
    } catch (error: any) {
      toast.error('Failed to apply drift resolution: ' + (error.message || 'Unknown error'))
      return false
    } finally {
      setIsApplying(false)
    }
  }, [resolutionPreview, driftAlert, documentId])

  return {
    driftAlert,
    resolutionPreview,
    isResolving,
    isApplying,
    handleResolveDrift,
    handleApplyResolution,
    dismissDriftAlert: () => {
      setDriftAlert(null)
      setResolutionPreview(null)
    }
  }
}
```

### 2. Integration in Document Viewer

**Location**: `app/documents/[id]/view/page.tsx`

```typescript
'use client'

import { useDriftDetection } from '@/hooks/use-drift-detection'
import { DriftAlertBanner } from '@/components/drift/DriftAlertBanner'
import { DriftResolutionDialog } from '@/components/drift/DriftResolutionDialog'

export default function DocumentViewerPage() {
  const params = useParams()
  const documentId = params.id as string
  const [document, setDocument] = useState<DocumentData | null>(null)
  
  // Drift detection hook
  const {
    driftAlert,
    resolutionPreview,
    isResolving,
    isApplying,
    handleResolveDrift,
    handleApplyResolution,
    dismissDriftAlert
  } = useDriftDetection(documentId, document?.project_id)

  return (
    <div>
      {/* Drift Alert Banner */}
      {driftAlert && (
        <DriftAlertBanner
          driftRecordId={driftAlert.driftRecordId}
          severity={driftAlert.severity}
          driftCount={driftAlert.driftCount}
          summary={driftAlert.summary}
          onResolve={() => handleResolveDrift('balanced')}
          onDismiss={dismissDriftAlert}
          onViewDetails={() => {/* Open details modal */}}
          isResolving={isResolving}
        />
      )}
      
      {/* Document content */}
      {/* ... */}
      
      {/* Drift Resolution Dialog */}
      <DriftResolutionDialog
        open={!!resolutionPreview}
        onClose={() => setResolutionPreview(null)}
        resolutionPreview={resolutionPreview}
        onApply={async () => {
          const success = await handleApplyResolution()
          if (success) {
            // Refresh document
            await fetchDocument()
          }
        }}
        isApplying={isApplying}
      />
    </div>
  )
}
```

---

## 🗄️ Database Schema

### Tables

#### project_baselines
```sql
CREATE TABLE project_baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft',
  approved_at TIMESTAMP,
  approved_by UUID REFERENCES users(id),
  scope_baseline JSONB,
  technical_baseline JSONB,
  timeline_baseline JSONB,
  cost_baseline JSONB,
  resource_baseline JSONB,
  success_criteria JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_baselines_project_status 
  ON project_baselines(project_id, status);
```

#### baseline_drift_detection
```sql
CREATE TABLE baseline_drift_detection (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  baseline_id UUID NOT NULL REFERENCES project_baselines(id),
  source_document_id UUID REFERENCES documents(id),
  drift_severity VARCHAR(20) CHECK (drift_severity IN ('low', 'medium', 'high', 'critical')),
  drift_description TEXT,
  ai_processing_metadata JSONB,
  status VARCHAR(50) DEFAULT 'detected',
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_drift_project_status 
  ON baseline_drift_detection(project_id, status);
CREATE INDEX idx_drift_document 
  ON baseline_drift_detection(source_document_id);
```

---

## 🚀 Deployment Configuration

### Environment Variables

```bash
# AI Provider Configuration (required for resolution)
OPENAI_API_KEY=sk-...
GOOGLE_AI_API_KEY=...

# Database (required)
DATABASE_URL=postgresql://...

# Redis (required for WebSocket)
REDIS_URL=redis://...

# WebSocket Configuration
FRONTEND_URL=http://localhost:3000

# Feature Flags (optional)
ENABLE_DRIFT_DETECTION=true
DRIFT_DETECTION_AUTO_RUN=true
DRIFT_RESOLUTION_AI_PROVIDER=openai
```

### Server Configuration

Add drift routes to server:

```typescript
// server/src/server.ts
import driftRoutes from './routes/drift'

app.use('/api/drift', driftRoutes)
```

### WebSocket Setup

Ensure Socket.io is configured:

```typescript
// server/src/server.ts
import { Server } from 'socket.io'

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
})

export { io }
```

---

## 🧪 Testing

### Unit Tests

```bash
# Run drift detection tests
cd server
npm test drift-detection-entity-types.test.ts

# Run resolution tests
npm test drift-resolution-change-request.test.ts
```

### Integration Tests

```typescript
describe('Drift Detection E2E', () => {
  it('should detect drift on document save', async () => {
    // 1. Create baseline
    const baseline = await createTestBaseline(projectId)
    
    // 2. Create document
    const doc = await createDocument(projectId)
    
    // 3. Edit document (add stakeholder)
    await updateDocument(doc.id, {
      content: addStakeholder(doc.content, 'New Stakeholder')
    })
    
    // 4. Verify drift detected
    const driftRecords = await getDriftRecords(projectId)
    expect(driftRecords).toHaveLength(1)
    expect(driftRecords[0].drift_severity).toBe('low')
  })
  
  it('should resolve drift with AI', async () => {
    // 1. Get drift record
    const driftRecord = await getDriftRecord(driftRecordId)
    
    // 2. Generate resolution
    const resolution = await driftResolutionService.resolveDrift(
      documentId,
      driftRecord.id,
      userId,
      'balanced'
    )
    
    // 3. Verify resolution
    expect(resolution.resolvedContent).toBeDefined()
    expect(resolution.driftPoints.length).toBeGreaterThan(0)
    
    // 4. Apply resolution
    await driftResolutionService.applyResolution(
      documentId,
      resolution.resolvedContent,
      driftRecord.id,
      userId
    )
    
    // 5. Verify drift resolved
    const updatedRecord = await getDriftRecord(driftRecordId)
    expect(updatedRecord.status).toBe('resolved')
  })
})
```

---

## 📊 Monitoring & Metrics

### Key Metrics to Track

```typescript
// Track drift detection rate
SELECT 
  DATE(created_at) as date,
  COUNT(*) as drift_detections,
  AVG(CASE 
    WHEN drift_severity = 'low' THEN 1
    WHEN drift_severity = 'medium' THEN 2
    WHEN drift_severity = 'high' THEN 3
    WHEN drift_severity = 'critical' THEN 4
  END) as avg_severity
FROM baseline_drift_detection
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

// Track resolution success rate
SELECT 
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM baseline_drift_detection
GROUP BY status;

// Track average time to resolution
SELECT 
  AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_minutes_to_resolve
FROM baseline_drift_detection
WHERE status = 'resolved'
AND created_at >= NOW() - INTERVAL '30 days';
```

### Logging

```typescript
// server/src/services/driftDetectionService.ts
logger.info('[DRIFT] Checking for drift', { projectId, documentId })
logger.warn('[DRIFT] Detected drift after document update', {
  documentId,
  severity,
  driftCount
})
logger.error('[DRIFT] Drift validation failed:', error)
```

---

## 🔐 Security Considerations

### Access Control

- ✅ All drift endpoints require authentication
- ✅ `documents.update` permission required for resolution
- ✅ Drift records are project-scoped
- ✅ WebSocket events only sent to project members

### Data Privacy

- ✅ Drift records contain document IDs, not content
- ✅ AI prompts include only necessary context
- ✅ Resolution content not cached by AI provider
- ✅ Audit logs track all drift resolutions

### Rate Limiting

```typescript
// Limit drift resolution requests
import rateLimit from 'express-rate-limit'

const driftResolutionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 resolutions per 15 minutes
  message: 'Too many drift resolution requests'
})

router.post('/resolve', driftResolutionLimiter, ...)
```

---

## 📚 Additional Resources

- [User Guide](./DRIFT_DETECTION_USER_GUIDE.md)
- [Feature Spec](../roadmap/DRIFT_AUTO_RESOLUTION_FEATURE.md)
- [API Documentation](./API_REFERENCE.md)
- [WebSocket Events](./WEBSOCKET_EVENTS.md)

---

## 🐛 Troubleshooting

### Common Issues

1. **Drift not detected automatically**
   - Check if baseline exists and is approved
   - Verify document has project_id
   - Check server logs for errors

2. **WebSocket events not received**
   - Verify client is connected to Socket.io
   - Check project room subscription
   - Review WebSocket middleware

3. **AI resolution failing**
   - Verify AI provider credentials
   - Check token limits
   - Review AI service logs

---

**For questions or issues, contact the development team.**
