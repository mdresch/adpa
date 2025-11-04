# Automatic Drift Detection & Resolution

**Status**: 🔵 Planned  
**Priority**: 🔴 **HIGH** (P0)  
**Related CR**: CR-2026-001 (Baseline Drift Detection)  
**Estimated Effort**: Medium-Large (5-7 days)  
**Dependencies**: 
- Baseline System (✅ Completed)
- Baseline Drift Detection (✅ Completed)
- AI Document Generation (✅ Completed)  
**Target Release**: Q1 2026

---

## 📋 Feature Overview

Automatically detect baseline drift when documents are modified and provide **one-click resolution** using AI to adjust the document back into alignment with the approved baseline.

---

## 🎯 Problem Statement

**Current State:**
- ✅ Baseline extraction works (approved baselines stored)
- ✅ Drift detection works (identifies when documents diverge)
- ❌ **No automatic resolution** - users must manually fix drift
- ❌ **Time-consuming** to realign documents with baseline

**User Pain Points:**
- Document edited → Drift detected → **Now what?**
- Manual process: Read baseline, read document, find differences, rewrite sections
- Time-consuming: 30-60 minutes per drift incident
- Error-prone: May not catch all drift points

**Business Impact:**
- ⚠️ **Drift persists** because manual resolution is tedious
- ⚠️ **Documents fall out of compliance** with approved baselines
- ⚠️ **Stakeholder frustration** when docs don't match agreements
- ⚠️ **Audit failures** due to baseline-document misalignment

---

## ✨ Proposed Solution

### Two-Part System

#### Part 1: Automatic Drift Detection on Document Version Change

**Trigger**: Every time a document is saved/updated

**Process**:
```
1. Document updated (new version created)
   ↓
2. Check if project has approved baseline
   ↓
3. If YES → Run drift detection automatically
   ↓
4. If drift detected → Show alert with "Resolve Drift" button
   ↓
5. Store drift analysis for later resolution
```

#### Part 2: AI-Powered Drift Resolution

**Trigger**: User clicks "Resolve Drift" button

**Process**:
```
1. Fetch approved baseline entities
   ↓
2. Fetch current document content
   ↓
3. Analyze drift points (what changed, why it drifted)
   ↓
4. Use AI to regenerate drifted sections aligned with baseline
   ↓
5. Show preview of changes
   ↓
6. User approves → Document updated, drift resolved
   ↓
7. Create audit log of resolution
```

---

## 🎨 UI/UX Design

### Drift Detection Alert (Automatic)

```
┌────────────────────────────────────────────────────────────┐
│  Document Editor: Risk Management Plan                     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  [Edit] [Preview] [Metadata] [History]                     │
│                                                              │
│  ⚠️ BASELINE DRIFT DETECTED                    ⭐ AUTOMATIC │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔍 Drift Analysis                                      │  │
│  │                                                        │  │
│  │ This document has drifted from the approved baseline: │  │
│  │                                                        │  │
│  │ 📊 Drift Summary:                                      │  │
│  │ ├─ 3 stakeholders added (not in baseline)            │  │
│  │ ├─ 2 risks removed (were in baseline)                │  │
│  │ ├─ 1 milestone date changed (Mar 15 → Apr 2)         │  │
│  │ └─ 1 budget constraint modified ($500K → $650K)      │  │
│  │                                                        │  │
│  │ Drift Severity: Medium (34% entity variance)          │  │
│  │ Detected: Just now (on save)                          │  │
│  │                                                        │  │
│  │ ⚡ Quick Actions:                                       │  │
│  │ [Resolve Drift with AI] ⭐ ONE-CLICK                   │  │
│  │ [Submit for Approval] (if drift is intentional)       │  │
│  │ [View Detailed Comparison]                            │  │
│  │ [Dismiss]                                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  [Document content below...]                                │
└────────────────────────────────────────────────────────────┘
```

### Drift Resolution Dialog

```
┌────────────────────────────────────────────────────────────┐
│  Resolve Baseline Drift                             [X]     │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  🔍 Analyzing drift and preparing resolution...              │
│  ████████████████████████████░░░░ 80%                      │
│                                                              │
│  [Analysis complete in 3 seconds...]                        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  📊 Drift Points Identified: 7                               │
│                                                              │
│  1. ⚠️ Stakeholders Added (3 new)                           │
│     Baseline: 12 stakeholders                               │
│     Current: 15 stakeholders                                │
│     → AI Action: Remove 3 unauthorized stakeholders         │
│                                                              │
│  2. ⚠️ Risks Removed (2 missing)                            │
│     Baseline: 18 risks                                      │
│     Current: 16 risks                                       │
│     → AI Action: Re-add 2 baseline risks:                   │
│       - "Vendor delivery delay" (High probability/impact)   │
│       - "Skills gap in React" (Medium/Medium)              │
│                                                              │
│  3. ⚠️ Milestone Date Changed                               │
│     Baseline: Testing Complete - March 15                   │
│     Current: Testing Complete - April 2                     │
│     → AI Action: Revert to March 15 OR flag for approval   │
│                                                              │
│  4. ⚠️ Budget Modified                                       │
│     Baseline: $500,000                                      │
│     Current: $650,000 (30% increase)                        │
│     → AI Action: Restore $500K OR require change request   │
│                                                              │
│  ... (3 more drift points)                                  │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  🤖 AI Resolution Strategy:                                  │
│                                                              │
│  ○ Conservative: Revert ALL changes to baseline (strict)   │
│  ● Balanced: Keep valid changes, revert unauthorized ✅     │
│  ○ Permissive: Keep most changes, flag major drifts        │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  📄 Preview Changes:                 [Show Side-by-Side ▼] │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ ## Risks (Section 4.3)                                 │  │
│  │                                                        │  │
│  │ - [Existing risk 1]                                   │  │
│  │ - [Existing risk 2]                                   │  │
│  │ + Vendor delivery delay risk (RESTORED) ⭐             │  │
│  │ + Skills gap in React risk (RESTORED) ⭐               │  │
│  │ - [Existing risk 3]                                   │  │
│  │                                                        │  │
│  │ ## Milestones (Section 3.2)                           │  │
│  │                                                        │  │
│  │ - Testing Complete: ~~April 2~~ March 15 (REVERTED) ⭐│  │
│  │                                                        │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ⚠️ Major Changes Requiring Approval:                       │
│  • Budget increase: $500K → $650K (30%)                    │
│  → This will be flagged for change request approval        │
│                                                              │
│  [Cancel] [Preview Full Document] [Apply Resolution] ⭐    │
└────────────────────────────────────────────────────────────┘
```

### After Resolution Applied

```
┌────────────────────────────────────────────────────────────┐
│  ✅ Drift Resolved Successfully                             │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  🎉 Document realigned with approved baseline               │
│                                                              │
│  📊 Changes Applied:                                         │
│  ✅ Removed 3 unauthorized stakeholders                     │
│  ✅ Restored 2 baseline risks                               │
│  ✅ Reverted milestone date to baseline (March 15)          │
│  ✅ Updated 4 other sections                                │
│                                                              │
│  ⚠️ Items Requiring Approval:                               │
│  📋 Change Request Created: Budget Increase ($500K→$650K)  │
│  Status: Pending sponsor approval                          │
│                                                              │
│  📝 Audit Trail:                                             │
│  • Drift detected: Oct 31, 10:23am                         │
│  • Resolution applied: Oct 31, 10:25am                     │
│  • Applied by: Sarah Chen (PM)                             │
│  • Method: AI-assisted (balanced strategy)                 │
│                                                              │
│  [View Audit Log] [View Change Request] [Close]            │
└────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### 1. Automatic Drift Detection on Save

```typescript
// server/src/routes/documents.ts

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params
  const { content, title } = req.body
  
  try {
    // 1. Update document
    const updatedDoc = await pool.query(`
      UPDATE documents 
      SET content = $1, title = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [content, title, id])
    
    const document = updatedDoc.rows[0]
    
    // 2. ⭐ AUTOMATIC DRIFT DETECTION
    const driftResult = await checkForDrift(document.project_id, id)
    
    // 3. If drift detected, create drift record
    if (driftResult.hasDrift) {
      const driftRecord = await createDriftRecord({
        projectId: document.project_id,
        documentId: id,
        driftPoints: driftResult.driftPoints,
        severity: driftResult.severity,
        triggeredBy: 'document_update',
        detectedAt: new Date()
      })
      
      // 4. Emit WebSocket event
      io.to(`project:${document.project_id}`).emit('drift:detected', {
        documentId: id,
        documentTitle: document.title,
        driftRecordId: driftRecord.id,
        severity: driftResult.severity,
        driftCount: driftResult.driftPoints.length
      })
      
      // 5. Return with drift warning
      return res.json({
        success: true,
        document: document,
        driftDetected: true,
        driftRecord: {
          id: driftRecord.id,
          severity: driftResult.severity,
          driftPoints: driftResult.driftPoints
        }
      })
    }
    
    // No drift - normal response
    res.json({ success: true, document: document })
    
  } catch (error) {
    logger.error('Document update failed:', error)
    res.status(500).json({ error: 'Failed to update document' })
  }
})
```

### 2. Drift Detection Service

```typescript
// server/src/services/driftDetectionService.ts

interface DriftDetectionResult {
  hasDrift: boolean
  severity: 'low' | 'medium' | 'high' | 'critical'
  driftPoints: DriftPoint[]
  summary: string
}

interface DriftPoint {
  entityType: string                   // 'stakeholder', 'risk', 'milestone', etc.
  driftType: 'added' | 'removed' | 'modified'
  baselineValue: any
  currentValue: any
  variance?: number
  description: string
  requiresApproval: boolean            // Major changes need approval
}

export class DriftDetectionService {
  /**
   * Check for drift after document update
   */
  async checkForDrift(
    projectId: string, 
    documentId: string
  ): Promise<DriftDetectionResult> {
    try {
      // 1. Get approved baseline
      const baseline = await this.getApprovedBaseline(projectId)
      
      if (!baseline) {
        return { hasDrift: false, severity: 'low', driftPoints: [], summary: 'No baseline' }
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
      
    } catch (error) {
      logger.error('[DRIFT] Detection failed:', error)
      throw error
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
    
    // Check stakeholders
    const stakeholderDrift = this.detectStakeholderDrift(
      baseline.stakeholders,
      currentEntities.stakeholders
    )
    driftPoints.push(...stakeholderDrift)
    
    // Check risks
    const riskDrift = this.detectRiskDrift(
      baseline.risks,
      currentEntities.risks
    )
    driftPoints.push(...riskDrift)
    
    // Check milestones
    const milestoneDrift = this.detectMilestoneDrift(
      baseline.milestones,
      currentEntities.milestones
    )
    driftPoints.push(...milestoneDrift)
    
    // ... check all 14 entity types (scope_items, deliverables, requirements, milestones, 
    // phases, activities, resources, technologies, stakeholders, constraints, risks, 
    // success_criteria, quality_standards, best_practices)
    
    return driftPoints
  }
  
  /**
   * Detect stakeholder drift
   */
  private detectStakeholderDrift(
    baselineStakeholders: Stakeholder[],
    currentStakeholders: Stakeholder[]
  ): DriftPoint[] {
    const drift: DriftPoint[] = []
    
    // Check for removed stakeholders
    for (const baseline of baselineStakeholders) {
      const found = currentStakeholders.find(s => 
        this.normalizeString(s.name) === this.normalizeString(baseline.name)
      )
      
      if (!found) {
        drift.push({
          entityType: 'stakeholder',
          driftType: 'removed',
          baselineValue: baseline,
          currentValue: null,
          description: `Stakeholder "${baseline.name}" removed from document`,
          requiresApproval: baseline.influence_level === 'high' // High influence = needs approval
        })
      }
    }
    
    // Check for added stakeholders
    for (const current of currentStakeholders) {
      const found = baselineStakeholders.find(s => 
        this.normalizeString(s.name) === this.normalizeString(current.name)
      )
      
      if (!found) {
        drift.push({
          entityType: 'stakeholder',
          driftType: 'added',
          baselineValue: null,
          currentValue: current,
          description: `New stakeholder "${current.name}" added to document`,
          requiresApproval: current.influence_level === 'high'
        })
      }
    }
    
    // Check for modifications
    for (const current of currentStakeholders) {
      const baseline = baselineStakeholders.find(s => 
        this.normalizeString(s.name) === this.normalizeString(current.name)
      )
      
      if (baseline && this.hasStakeholderChanged(baseline, current)) {
        drift.push({
          entityType: 'stakeholder',
          driftType: 'modified',
          baselineValue: baseline,
          currentValue: current,
          description: `Stakeholder "${current.name}" details modified`,
          requiresApproval: false
        })
      }
    }
    
    return drift
  }
  
  /**
   * Calculate drift severity
   */
  private calculateDriftSeverity(driftPoints: DriftPoint[]): 'low' | 'medium' | 'high' | 'critical' {
    if (driftPoints.length === 0) return 'low'
    
    // Critical: Any drift requiring approval
    if (driftPoints.some(d => d.requiresApproval)) return 'critical'
    
    // High: 10+ drift points
    if (driftPoints.length >= 10) return 'high'
    
    // Medium: 5-9 drift points
    if (driftPoints.length >= 5) return 'medium'
    
    // Low: 1-4 drift points
    return 'low'
  }
}
```

### 3. AI-Powered Resolution Service

```typescript
// server/src/services/driftResolutionService.ts

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
    try {
      logger.info('[DRIFT-RESOLUTION] Starting AI-powered drift resolution', {
        documentId,
        driftRecordId,
        strategy
      })
      
      // 1. Get drift record with all drift points
      const driftRecord = await this.getDriftRecord(driftRecordId)
      
      // 2. Get approved baseline
      const baseline = await this.getApprovedBaseline(driftRecord.project_id)
      
      // 3. Get current document content
      const document = await this.getDocument(documentId)
      
      // 4. Build resolution prompt
      const prompt = this.buildResolutionPrompt(
        document,
        baseline,
        driftRecord.driftPoints,
        strategy
      )
      
      // 5. Call AI to generate resolved version
      const aiResponse = await aiService.generate({
        prompt,
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        temperature: 0.2, // Low temp for consistent, accurate resolution
        max_tokens: 8000
      })
      
      // 6. Parse resolved content
      const resolvedContent = this.parseResolvedContent(aiResponse.content)
      
      // 7. Identify major changes (require approval)
      const majorChanges = this.identifyMajorChanges(driftRecord.driftPoints)
      
      // 8. Prepare result
      return {
        resolvedContent,
        originalContent: document.content,
        driftPoints: driftRecord.driftPoints,
        majorChanges,
        requiresApproval: majorChanges.length > 0,
        strategy,
        previewHtml: await this.generateDiffPreview(document.content, resolvedContent)
      }
      
    } catch (error) {
      logger.error('[DRIFT-RESOLUTION] Resolution failed:', error)
      throw error
    }
  }
  
  /**
   * Build AI prompt for drift resolution
   */
  private buildResolutionPrompt(
    document: Document,
    baseline: Baseline,
    driftPoints: DriftPoint[],
    strategy: string
  ): string {
    return `
You are a project management expert tasked with resolving baseline drift in a project document.

## CONTEXT

**Document**: ${document.title}
**Approved Baseline**: Contains ${baseline.stakeholders?.length || 0} stakeholders, ${baseline.risks?.length || 0} risks, ${baseline.milestones?.length || 0} milestones, etc.

**Drift Detected**: ${driftPoints.length} drift points identified

## BASELINE ENTITIES (APPROVED - AUTHORITATIVE)

${this.formatBaselineEntities(baseline)}

## CURRENT DOCUMENT CONTENT (DRIFTED)

${document.content}

## DRIFT POINTS TO RESOLVE

${driftPoints.map((drift, i) => `
${i + 1}. ${drift.driftType.toUpperCase()}: ${drift.description}
   - Baseline: ${JSON.stringify(drift.baselineValue)}
   - Current: ${JSON.stringify(drift.currentValue)}
   - Requires Approval: ${drift.requiresApproval ? 'YES' : 'NO'}
`).join('\n')}

## RESOLUTION STRATEGY: ${strategy.toUpperCase()}

**Conservative**: Revert ALL changes to match baseline exactly
**Balanced**: Keep valid updates, revert unauthorized changes, flag major changes
**Permissive**: Keep most changes, only revert critical baseline violations

## YOUR TASK

Generate a REVISED version of the document that resolves the drift:

1. **For REMOVED baseline entities**: Re-add them to the document in appropriate sections
2. **For ADDED non-baseline entities**: 
   - Conservative: Remove them
   - Balanced: Keep if minor, remove if major
   - Permissive: Keep all, just note the addition
3. **For MODIFIED entities**: Restore baseline values OR clearly mark as change request
4. **For date changes**: Revert to baseline dates OR flag for approval
5. **For budget changes >10%**: FLAG as requiring formal approval

**Preserve**:
- Document structure and formatting
- Non-entity content (explanatory text, context)
- Section headings and organization

**Output**: Complete revised document in Markdown format that aligns with the approved baseline.

**CRITICAL**: If a change is major (budget >10%, key milestone dates, scope additions), include a comment: 
<!-- REQUIRES APPROVAL: [reason] -->
`
  }
  
  /**
   * Apply resolution to document
   */
  async applyResolution(
    documentId: string,
    resolvedContent: string,
    driftRecordId: string,
    userId: string
  ): Promise<void> {
    const client = await pool.connect()
    
    try {
      await client.query('BEGIN')
      
      // 1. Update document with resolved content
      await client.query(`
        UPDATE documents 
        SET content = $1, updated_at = NOW()
        WHERE id = $2
      `, [resolvedContent, documentId])
      
      // 2. Mark drift as resolved
      await client.query(`
        UPDATE drift_records
        SET status = 'resolved', resolved_at = NOW(), resolved_by = $1
        WHERE id = $2
      `, [userId, driftRecordId])
      
      // 3. Create audit log
      await client.query(`
        INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, details
        ) VALUES ($1, 'drift_resolved', 'document', $2, $3)
      `, [
        userId,
        documentId,
        JSON.stringify({
          driftRecordId,
          method: 'ai_assisted',
          timestamp: new Date()
        })
      ])
      
      await client.query('COMMIT')
      
      logger.info('[DRIFT-RESOLUTION] Drift resolved successfully', {
        documentId,
        driftRecordId,
        userId
      })
      
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}
```

### 4. Frontend Integration

```typescript
// app/documents/[id]/view/page.tsx

export default function DocumentViewerPage() {
  const [driftAlert, setDriftAlert] = useState<DriftAlert | null>(null)
  const [showResolutionDialog, setShowResolutionDialog] = useState(false)
  const [resolutionPreview, setResolutionPreview] = useState<ResolutionResult | null>(null)
  const [resolvingDrift, setResolvingDrift] = useState(false)
  
  // Listen for drift detection events
  useEffect(() => {
    socket.on('drift:detected', (data) => {
      if (data.documentId === documentId) {
        setDriftAlert({
          driftRecordId: data.driftRecordId,
          severity: data.severity,
          driftCount: data.driftCount
        })
        toast.warning(
          `Baseline drift detected: ${data.driftCount} changes`,
          { duration: 10000 }
        )
      }
    })
    
    return () => socket.off('drift:detected')
  }, [documentId])
  
  /**
   * Handle "Resolve Drift" button click
   */
  const handleResolveDrift = async () => {
    setResolvingDrift(true)
    setShowResolutionDialog(true)
    
    try {
      // Call AI to analyze and prepare resolution
      const response = await fetch(`/api/drift/resolve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId,
          driftRecordId: driftAlert.driftRecordId,
          strategy: 'balanced' // User can select conservative/balanced/permissive
        })
      })
      
      const result = await response.json()
      setResolutionPreview(result)
      
      toast.success('Resolution prepared! Review changes before applying.')
      
    } catch (error) {
      toast.error('Failed to prepare drift resolution')
    } finally {
      setResolvingDrift(false)
    }
  }
  
  /**
   * Apply AI-generated resolution
   */
  const handleApplyResolution = async () => {
    if (!resolutionPreview) return
    
    try {
      await fetch(`/api/drift/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          documentId,
          driftRecordId: driftAlert.driftRecordId,
          resolvedContent: resolutionPreview.resolvedContent
        })
      })
      
      // Refresh document
      await fetchDocument()
      
      // Clear drift alert
      setDriftAlert(null)
      setShowResolutionDialog(false)
      
      toast.success('✅ Drift resolved! Document realigned with baseline.')
      
      // If major changes, show change request notification
      if (resolutionPreview.requiresApproval) {
        toast.info('Change request created for major changes requiring approval')
      }
      
    } catch (error) {
      toast.error('Failed to apply drift resolution')
    }
  }
  
  return (
    <div>
      {/* Drift Alert Banner */}
      {driftAlert && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>⚠️ Baseline Drift Detected</AlertTitle>
          <AlertDescription>
            This document has {driftAlert.driftCount} changes that deviate from the approved baseline.
            <div className="mt-2 flex gap-2">
              <Button 
                size="sm" 
                onClick={handleResolveDrift}
                disabled={resolvingDrift}
              >
                {resolvingDrift ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-2" />
                    Resolve Drift with AI ⭐
                  </>
                )}
              </Button>
              <Button size="sm" variant="outline" onClick={() => {/* View details */}}>
                View Drift Details
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDriftAlert(null)}>
                Dismiss
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Document content */}
      {/* ... */}
      
      {/* Resolution Dialog */}
      <DriftResolutionDialog
        open={showResolutionDialog}
        onClose={() => setShowResolutionDialog(false)}
        resolutionPreview={resolutionPreview}
        onApply={handleApplyResolution}
      />
    </div>
  )
}
```

---

## 🎯 Resolution Strategies

### Conservative Strategy (Strict Baseline Adherence)
**Use When**: Regulated industries, formal governance

**Behavior**:
- ✅ Revert ALL changes to baseline
- ✅ Remove ALL added entities
- ✅ Restore ALL removed entities
- ✅ Flag EVERY change for approval

**Example**:
```
Baseline: 12 stakeholders
Current: 15 stakeholders (3 added)
Resolution: Remove all 3 new stakeholders, restore exact baseline list
```

---

### Balanced Strategy (Intelligent Adaptation) ⭐ RECOMMENDED
**Use When**: Most projects, reasonable governance

**Behavior**:
- ✅ Keep minor, valid updates
- ✅ Revert unauthorized major changes
- ✅ Flag significant changes for approval
- ✅ Apply common-sense logic

**Example**:
```
Baseline: 12 stakeholders
Current: 15 stakeholders (3 added)
Resolution: 
- Keep 2 new stakeholders (low influence, valid additions)
- Flag 1 new stakeholder (high influence - needs approval)
- Keep updated contact emails (minor changes)
```

---

### Permissive Strategy (Flexible Adaptation)
**Use When**: Agile projects, high trust, minimal governance

**Behavior**:
- ✅ Keep most changes
- ✅ Only revert critical baseline violations
- ✅ Flag only budget/scope >20% changes
- ✅ Trust team judgment

**Example**:
```
Baseline: 12 stakeholders
Current: 15 stakeholders (3 added)
Resolution: Keep all 15, just note the additions in change log
```

---

## 📊 Business Value

### Time Savings
- **Manual drift resolution**: 30-60 minutes per incident
- **AI-powered resolution**: 2-3 minutes (review + apply)
- **Savings**: 25-55 minutes per drift incident
- **Annual savings** (50 drift incidents): 20-45 hours = $1,000-$3,600

### Quality Improvements
- ✅ **100% baseline compliance** (vs 60-70% manual)
- ✅ **Faster stakeholder trust** (documents match agreements)
- ✅ **Audit readiness** (automatic alignment)
- ✅ **Reduced rework** (catch drift immediately)

### Risk Reduction
- ✅ **Prevent scope creep** (auto-detect unauthorized additions)
- ✅ **Maintain stakeholder trust** (baselines enforced)
- ✅ **Compliance assurance** (always aligned)

### Strategic Value
- 🏆 **Unique feature** (no competitors have AI drift resolution)
- 🎯 **Enterprise-ready** (governance + flexibility)
- 💰 **ROI**: 300-500% in first year

---

## 🧪 Testing Plan

### Unit Tests
- ✅ Drift detection on document save
- ✅ Stakeholder drift identification
- ✅ Risk drift identification
- ✅ Milestone drift identification
- ✅ Severity calculation
- ✅ AI resolution prompt generation

### Integration Tests
- ✅ End-to-end: Edit doc → Detect drift → Resolve with AI → Apply
- ✅ Conservative strategy: Reverts all changes
- ✅ Balanced strategy: Keeps minor, flags major
- ✅ Permissive strategy: Keeps most changes
- ✅ Change request creation for major changes

### Manual Testing
- [ ] Create baseline
- [ ] Edit document (add stakeholder, remove risk)
- [ ] Save → Drift detected automatically
- [ ] Click "Resolve Drift" → Preview changes
- [ ] Apply resolution → Document updated
- [ ] Verify drift resolved
- [ ] Test all 14 entity types (scope_items, deliverables, requirements, milestones, phases, activities, resources, technologies, stakeholders, constraints, risks, success_criteria, quality_standards, best_practices)
- [ ] Test all 3 strategies

---

## 🚀 Rollout Plan

### Phase 1: Backend (Days 1-3)
- Automatic drift detection on save
- Drift comparison logic for all 14 entity types
- AI resolution service
- Resolution strategies

### Phase 2: Frontend (Days 4-5)
- Drift alert component
- Resolution dialog
- Diff preview
- Strategy selection

### Phase 3: Testing (Days 6-7)
- Comprehensive testing
- Performance optimization
- User acceptance testing
- Production deployment

---

## ✅ Acceptance Criteria

- [ ] Drift detected automatically on every document save
- [ ] Drift alert appears immediately with drift count
- [ ] "Resolve Drift" button triggers AI analysis
- [ ] Resolution preview shows all changes clearly
- [ ] Side-by-side diff available
- [ ] All 3 strategies (conservative/balanced/permissive) work
- [ ] Major changes flagged for approval
- [ ] Applied resolution updates document successfully
- [ ] Drift record marked as resolved
- [ ] Audit log created
- [ ] WebSocket notifications sent
- [ ] Works for all 14 entity types
- [ ] Performance: Resolution generated in < 5 seconds

---

## 🔗 Integration with Existing Features

### 1. Baseline System (CR-2026-001)
- Uses approved baseline as source of truth
- Drift detection builds on baseline extraction

### 2. Change Request Workflow
- Major drifts auto-create change requests
- Approval workflow triggered for significant changes

### 3. Audit Logging
- Every resolution logged
- Compliance trail maintained

### 4. RAG Context
- Drift resolution outcomes feed into RAG
- AI learns from resolution patterns

---

## 📚 Related Documentation

- **Baseline Integration**: `/docs/roadmap/entity-baseline-integration.md`
- **Baseline Drift Detection**: `/docs/roadmap/change-requests/CR-2026-001_Baseline_Drift_Detection.md`
- **PMBOK 8 Coverage**: `/docs/roadmap/PMBOK8_EXTRACTION_COVERAGE_ANALYSIS.md`

---

**Created**: October 31, 2025  
**Status**: 🔵 Ready for Implementation  
**Next Steps**: Review with team, prioritize in Q1 2026 sprint

---

## 🎊 The Vision

**User Experience**:
```
1. Edit document, save changes
2. Alert: "Drift detected - 5 changes"
3. Click: "Resolve Drift with AI"
4. Preview: See what will change
5. Click: "Apply Resolution"
6. Done: Document back in baseline compliance (2 minutes total)
```

**Result**: Baseline governance without manual burden! 🚀

