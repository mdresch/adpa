/**
 * Drift Resolution Service
 * CR-2026-001: AI-Powered Drift Resolution
 * 
 * Resolves baseline drift using AI to realign documents with approved baselines
 */

import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { aiService } from './aiService'
import { DriftPoint } from './driftDetectionService'

export interface ResolutionResult {
  resolvedContent: string
  originalContent: string
  driftPoints: DriftPoint[]
  majorChanges: DriftPoint[]
  requiresApproval: boolean
  strategy: 'conservative' | 'balanced' | 'permissive'
  previewHtml?: string
}

interface Document {
  id: string
  title: string
  content: string
  metadata: any
  project_id: string
}

interface Baseline {
  id: string
  project_id: string
  version: string
  scope_baseline: any
  technical_baseline: any
  timeline_baseline: any
  cost_baseline: any
  resource_baseline: any
  success_criteria: any
}

interface DriftRecord {
  id: string
  project_id: string
  baseline_id: string
  source_document_id: string
  drift_severity: string
  drift_description: string
  ai_processing_metadata: any
}

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
      logger.info('[DRIFT-RESOLUTION] Calling AI to generate resolution')
      const aiResponse = await aiService.generate({
        prompt,
        temperature: 0.2, // Low temp for consistent, accurate resolution
        maxTokens: 8000
      })

      // 7. Parse resolved content
      const resolvedContent = this.parseResolvedContent(aiResponse.content)

      // 8. Identify major changes (require approval)
      const majorChanges = this.identifyMajorChanges(driftPoints)

      logger.info('[DRIFT-RESOLUTION] Resolution generated successfully', {
        documentId,
        driftRecordId,
        majorChangesCount: majorChanges.length
      })

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
    } catch (error) {
      logger.error('[DRIFT-RESOLUTION] Resolution failed:', error)
      throw error
    }
  }

  /**
   * Get drift record from database
   */
  private async getDriftRecord(driftRecordId: string): Promise<DriftRecord> {
    try {
      const result = await pool.query(
        `SELECT * FROM baseline_drift_detection WHERE id = $1`,
        [driftRecordId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Drift record not found: ${driftRecordId}`)
      }

      return result.rows[0]
    } catch (error) {
      logger.error('[DRIFT-RESOLUTION] Error fetching drift record:', error)
      throw error
    }
  }

  /**
   * Get baseline from database
   */
  private async getBaseline(baselineId: string): Promise<Baseline> {
    try {
      const result = await pool.query(
        `SELECT * FROM project_baselines WHERE id = $1`,
        [baselineId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Baseline not found: ${baselineId}`)
      }

      return result.rows[0]
    } catch (error) {
      logger.error('[DRIFT-RESOLUTION] Error fetching baseline:', error)
      throw error
    }
  }

  /**
   * Get document from database
   */
  private async getDocument(documentId: string): Promise<Document> {
    try {
      const result = await pool.query(
        `SELECT * FROM documents WHERE id = $1`,
        [documentId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Document not found: ${documentId}`)
      }

      return result.rows[0]
    } catch (error) {
      logger.error('[DRIFT-RESOLUTION] Error fetching document:', error)
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
    return `You are a project management expert tasked with resolving baseline drift in a project document.

## CONTEXT

**Document**: ${document.title}
**Approved Baseline**: Version ${baseline.version}
**Drift Detected**: ${driftPoints.length} drift points identified

## BASELINE ENTITIES (APPROVED - AUTHORITATIVE)

${this.formatBaselineEntities(baseline)}

## CURRENT DOCUMENT CONTENT (DRIFTED)

${document.content}

## DRIFT POINTS TO RESOLVE

${driftPoints.map((drift, i) => `
${i + 1}. ${drift.driftType.toUpperCase()}: ${drift.description}
   - Entity Type: ${drift.entityType}
   - Baseline: ${JSON.stringify(drift.baselineValue)}
   - Current: ${JSON.stringify(drift.currentValue)}
   - Requires Approval: ${drift.requiresApproval ? 'YES' : 'NO'}
`).join('\n')}

## RESOLUTION STRATEGY: ${strategy.toUpperCase()}

**Conservative**: Revert ALL changes to match baseline exactly
**Balanced**: Keep valid updates, revert unauthorized changes, flag major changes (RECOMMENDED)
**Permissive**: Keep most changes, only revert critical baseline violations

## YOUR TASK

Generate a REVISED version of the document that resolves the drift:

1. **For REMOVED baseline entities**: Re-add them to the document in appropriate sections
2. **For ADDED non-baseline entities**: 
   - Conservative: Remove them
   - Balanced: Keep if minor/helpful, remove if major/unauthorized
   - Permissive: Keep all, just note the addition
3. **For MODIFIED entities**: Restore baseline values OR clearly mark as change request
4. **For date changes**: Revert to baseline dates OR flag for approval
5. **For budget changes >10%**: FLAG as requiring formal approval

**Preserve**:
- Document structure and formatting (Markdown)
- Non-entity content (explanatory text, context, headers)
- Section headings and organization
- Overall document quality

**Output**: Complete revised document in Markdown format that aligns with the approved baseline.

**CRITICAL**: If a change is major (budget >10%, key milestone dates, scope additions), include a comment: 
<!-- REQUIRES APPROVAL: [reason] -->

**IMPORTANT**: Return ONLY the revised document content, no explanations or metadata.`
  }

  /**
   * Format baseline entities for prompt
   */
  private formatBaselineEntities(baseline: Baseline): string {
    const sections: string[] = []

    if (baseline.scope_baseline) {
      sections.push(`### Scope Baseline\n${JSON.stringify(baseline.scope_baseline, null, 2)}`)
    }

    if (baseline.resource_baseline) {
      sections.push(`### Resource Baseline\n${JSON.stringify(baseline.resource_baseline, null, 2)}`)
    }

    if (baseline.timeline_baseline) {
      sections.push(`### Timeline Baseline\n${JSON.stringify(baseline.timeline_baseline, null, 2)}`)
    }

    if (baseline.cost_baseline) {
      sections.push(`### Cost Baseline\n${JSON.stringify(baseline.cost_baseline, null, 2)}`)
    }

    if (baseline.technical_baseline) {
      sections.push(`### Technical Baseline\n${JSON.stringify(baseline.technical_baseline, null, 2)}`)
    }

    if (baseline.success_criteria) {
      sections.push(`### Success Criteria\n${JSON.stringify(baseline.success_criteria, null, 2)}`)
    }

    return sections.join('\n\n')
  }

  /**
   * Parse resolved content from AI response
   */
  private parseResolvedContent(aiContent: string): string {
    // Remove any markdown code blocks if present
    let content = aiContent.trim()
    
    // Remove leading/trailing markdown code fence
    if (content.startsWith('```markdown')) {
      content = content.replace(/^```markdown\n/, '').replace(/\n```$/, '')
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '')
    }

    return content.trim()
  }

  /**
   * Identify major changes requiring approval
   */
  private identifyMajorChanges(driftPoints: DriftPoint[]): DriftPoint[] {
    return driftPoints.filter(drift => {
      // Budget changes >10%
      if (drift.entityType === 'budget' && drift.variance && Math.abs(drift.variance) > 10) {
        return true
      }

      // Any drift requiring approval
      if (drift.requiresApproval) {
        return true
      }

      // Milestone removals/additions
      if (drift.entityType === 'milestone' && drift.driftType !== 'modified') {
        return true
      }

      return false
    })
  }

  /**
   * Generate diff preview HTML (simple version)
   */
  private async generateDiffPreview(originalContent: string, resolvedContent: string): Promise<string> {
    // Simple line-by-line diff
    const originalLines = originalContent.split('\n')
    const resolvedLines = resolvedContent.split('\n')
    
    const diffLines: string[] = []
    const maxLines = Math.max(originalLines.length, resolvedLines.length)

    for (let i = 0; i < maxLines; i++) {
      const origLine = originalLines[i] || ''
      const newLine = resolvedLines[i] || ''

      if (origLine !== newLine) {
        if (origLine) {
          diffLines.push(`- ${origLine}`)
        }
        if (newLine) {
          diffLines.push(`+ ${newLine}`)
        }
      } else {
        diffLines.push(`  ${origLine}`)
      }
    }

    return diffLines.join('\n')
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

      logger.info('[DRIFT-RESOLUTION] Applying resolution', {
        documentId,
        driftRecordId,
        userId
      })

      // 1. Update document with resolved content
      await client.query(
        `UPDATE documents 
         SET content = $1, 
             updated_at = NOW(),
             updated_by = $2
         WHERE id = $3`,
        [resolvedContent, userId, documentId]
      )

      // 2. Mark drift as resolved
      await client.query(
        `UPDATE baseline_drift_detection
         SET status = 'resolved', 
             resolved_at = NOW(),
             assigned_to = $1,
             resolution_notes = 'AI-assisted drift resolution applied'
         WHERE id = $2`,
        [userId, driftRecordId]
      )

      // 3. Create audit log
      await client.query(
        `INSERT INTO audit_logs (
          user_id, action, resource_type, resource_id, details
        ) VALUES ($1, 'drift_resolved', 'document', $2, $3)`,
        [
          userId,
          documentId,
          JSON.stringify({
            driftRecordId,
            method: 'ai_assisted',
            timestamp: new Date().toISOString()
          })
        ]
      )

      await client.query('COMMIT')

      logger.info('[DRIFT-RESOLUTION] Drift resolved successfully', {
        documentId,
        driftRecordId,
        userId
      })
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[DRIFT-RESOLUTION] Error applying resolution:', error)
      throw error
    } finally {
      client.release()
    }
  }
}

// Export singleton instance
export const driftResolutionService = new DriftResolutionService()
