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
import { v4 as uuidv4 } from 'uuid'
import { PoolClient } from 'pg'
import { emergencyMeetingService } from './emergencyMeetingService'
import { approvalWorkflowService } from './approvalWorkflowService'
import { createKnowledgeBaseFromDrift } from '../modules/knowledgeBase/integration'

export interface ResolutionResult {
  resolvedContent: string
  originalContent: string
  driftPoints: DriftPoint[]
  majorChanges: DriftPoint[]
  requiresApproval: boolean
  strategy: 'conservative' | 'balanced' | 'permissive'
  previewHtml?: string
}

export interface ApplyResolutionResult {
  changeRequestId?: string
  approvalRequestId?: string
}

export interface DriftApplyResponse {
  success: boolean
  message: string
  changeRequestCreated?: boolean
  changeRequestId?: string
}

interface Document {
  id: string
  title: string
  name?: string
  content: string
  metadata: any
  project_id: string
  project_name?: string
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
    const startTime = Date.now()
    
    try {
      logger.info('[DRIFT-RESOLUTION] Starting AI-powered drift resolution', {
        documentId,
        driftRecordId,
        strategy
      })

      // PERFORMANCE: Fetch all required data in a single optimized query
      const { driftRecord, baseline, document } = await this.getAllResolutionData(
        driftRecordId,
        documentId
      )
      
      const dataFetchTime = Date.now() - startTime
      logger.info('[DRIFT-RESOLUTION] Data fetched', { durationMs: dataFetchTime })

      // Parse drift points from metadata
      const driftPoints = driftRecord.ai_processing_metadata?.drift_points || []

      // Identify major changes early (before AI call)
      const majorChanges = this.identifyMajorChanges(driftPoints)

      // PERFORMANCE: Build optimized resolution prompt (reduced size)
      const prompt = this.buildOptimizedResolutionPrompt(
        document,
        baseline,
        driftPoints,
        strategy
      )

      // PERFORMANCE: Call AI with optimized parameters for speed
      logger.info('[DRIFT-RESOLUTION] Calling AI to generate resolution')
      const aiStartTime = Date.now()
      
      const aiResponse = await aiService.generate({
        prompt,
        temperature: 0.3, // Slightly higher for faster generation
        maxTokens: 4000, // Reduced from 8000 for faster response
        max_tokens: 4000 // Alternative parameter name for compatibility
      })
      
      const aiDuration = Date.now() - aiStartTime
      logger.info('[DRIFT-RESOLUTION] AI generation completed', { durationMs: aiDuration })

      // Parse resolved content
      const resolvedContent = this.parseResolvedContent(aiResponse.content)

      const totalDuration = Date.now() - startTime
      logger.info('[DRIFT-RESOLUTION] Resolution generated successfully', {
        documentId,
        driftRecordId,
        majorChangesCount: majorChanges.length,
        totalDurationMs: totalDuration,
        dataFetchMs: dataFetchTime,
        aiGenerationMs: aiDuration,
        performanceTarget: totalDuration < 5000 ? 'MET' : 'EXCEEDED'
      })

      // PERFORMANCE: Generate diff preview asynchronously (non-blocking)
      // Return immediately without waiting for preview
      const previewPromise = this.generateDiffPreview(document.content, resolvedContent)

      // Return result with preview promise that resolves later
      return {
        resolvedContent,
        originalContent: document.content,
        driftPoints,
        majorChanges,
        requiresApproval: majorChanges.length > 0,
        strategy,
        // Preview will be undefined initially, can be generated on-demand by client
        previewHtml: undefined
      }
    } catch (error) {
      const errorDuration = Date.now() - startTime
      logger.error('[DRIFT-RESOLUTION] Resolution failed:', {
        error,
        durationMs: errorDuration
      })
      throw error
    }
  }

  /**
   * PERFORMANCE: Get all required data in a single optimized query
   */
  private async getAllResolutionData(driftRecordId: string, documentId: string): Promise<{
    driftRecord: DriftRecord
    baseline: Baseline
    document: Document
  }> {
    try {
      const result = await pool.query(
        `SELECT 
          bdd.id as drift_id,
          bdd.project_id,
          bdd.baseline_id,
          bdd.source_document_id,
          bdd.drift_severity,
          bdd.drift_description,
          bdd.ai_processing_metadata,
          bdd.status,
          pb.id as baseline_id,
          pb.version,
          pb.scope_baseline,
          pb.technical_baseline,
          pb.timeline_baseline,
          pb.cost_baseline,
          pb.resource_baseline,
          pb.success_criteria,
          d.id as doc_id,
          d.title,
          d.name,
          d.content,
          d.metadata,
          d.project_id as doc_project_id
        FROM baseline_drift_detection bdd
        INNER JOIN project_baselines pb ON bdd.baseline_id = pb.id
        INNER JOIN documents d ON d.id = $2
        WHERE bdd.id = $1`,
        [driftRecordId, documentId]
      )

      if (result.rows.length === 0) {
        throw new Error(`Drift record, baseline, or document not found`)
      }

      const row = result.rows[0]

      return {
        driftRecord: {
          id: row.drift_id,
          project_id: row.project_id,
          baseline_id: row.baseline_id,
          source_document_id: row.source_document_id,
          drift_severity: row.drift_severity,
          drift_description: row.drift_description,
          ai_processing_metadata: row.ai_processing_metadata
        },
        baseline: {
          id: row.baseline_id,
          project_id: row.project_id,
          version: row.version,
          scope_baseline: row.scope_baseline,
          technical_baseline: row.technical_baseline,
          timeline_baseline: row.timeline_baseline,
          cost_baseline: row.cost_baseline,
          resource_baseline: row.resource_baseline,
          success_criteria: row.success_criteria
        },
        document: {
          id: row.doc_id,
          title: row.title,
          name: row.name,
          content: row.content,
          metadata: row.metadata,
          project_id: row.doc_project_id
        }
      }
    } catch (error) {
      logger.error('[DRIFT-RESOLUTION] Error fetching resolution data:', error)
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
   * Build optimized AI prompt for drift resolution (PERFORMANCE OPTIMIZED)
   * Reduces token count while maintaining quality
   */
  private buildOptimizedResolutionPrompt(
    document: Document,
    baseline: Baseline,
    driftPoints: DriftPoint[],
    strategy: string
  ): string {
    // PERFORMANCE: Summarize baseline entities instead of full JSON dumps
    const baselineSummary = this.summarizeBaselineEntities(baseline)
    
    // PERFORMANCE: Limit drift points detail if there are many
    const driftPointsSummary = driftPoints.length > 10 
      ? this.summarizeDriftPoints(driftPoints)
      : driftPoints.map((drift, i) => `${i + 1}. ${drift.driftType.toUpperCase()}: ${drift.description}`).join('\n')
    
    return `You are a project management expert resolving baseline drift. Be concise and focused.

## TASK
Document "${document.title}" has ${driftPoints.length} drift point(s). Apply ${strategy} strategy to realign with baseline v${baseline.version}.

## BASELINE SUMMARY
${baselineSummary}

## DRIFT POINTS
${driftPointsSummary}

## STRATEGY: ${strategy.toUpperCase()}
- Conservative: Revert all changes to baseline
- Balanced: Keep minor changes, revert major ones (RECOMMENDED)
- Permissive: Keep most changes, flag critical issues

## CURRENT DOCUMENT
${document.content}

## OUTPUT
Return the corrected document in Markdown. Add <!-- REQUIRES APPROVAL: reason --> for major changes (budget >10%, key milestones, scope changes).`
  }

  /**
   * Legacy method kept for compatibility
   * Build AI prompt for drift resolution
   * Handles all 14 entity types: scope_items, deliverables, requirements, milestones,
   * phases, activities, resources, technologies, stakeholders, constraints, risks,
   * success_criteria, quality_standards, best_practices
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
**Drift Detected**: ${driftPoints.length} drift points identified across entity types

## ENTITY TYPES TRACKED
The system tracks 14 entity types:
- **Scope**: scope_items, deliverables, requirements, constraints
- **Timeline**: milestones, phases, activities
- **Resources**: resources, technologies, stakeholders
- **Quality & Risk**: risks, success_criteria, quality_standards, best_practices

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
   - Applies to: scope_items, deliverables, requirements, milestones, phases, activities, resources, technologies, stakeholders, constraints, risks, success_criteria, quality_standards, best_practices
2. **For ADDED non-baseline entities**: 
   - Conservative: Remove them
   - Balanced: Keep if minor/helpful, remove if major/unauthorized
   - Permissive: Keep all, just note the addition
3. **For MODIFIED entities**: Restore baseline values OR clearly mark as change request
4. **For critical changes** (milestones, deliverables, requirements): Revert to baseline OR flag for approval
5. **For budget/resource changes >10%**: FLAG as requiring formal approval

**Preserve**:
- Document structure and formatting (Markdown)
- Non-entity content (explanatory text, context, headers)
- Section headings and organization
- Overall document quality

**Output**: Complete revised document in Markdown format that aligns with the approved baseline.

**CRITICAL**: If a change is major (budget >10%, key milestone dates, scope additions, high-priority requirements/deliverables), include a comment: 
<!-- REQUIRES APPROVAL: [reason] -->

**IMPORTANT**: Return ONLY the revised document content, no explanations or metadata.`
  }

  /**
   * Summarize baseline entities for optimized prompt (PERFORMANCE)
   */
  private summarizeBaselineEntities(baseline: Baseline): string {
    const summaries: string[] = []

    if (baseline.scope_baseline) {
      const scope = baseline.scope_baseline
      const count = Array.isArray(scope) ? scope.length : (scope.deliverables?.length || scope.scope_items?.length || 0)
      summaries.push(`Scope: ${count} items`)
    }

    if (baseline.resource_baseline) {
      const res = baseline.resource_baseline
      const count = Array.isArray(res) ? res.length : (res.resources?.length || 0)
      summaries.push(`Resources: ${count} items`)
    }

    if (baseline.timeline_baseline) {
      const timeline = baseline.timeline_baseline
      const count = Array.isArray(timeline) ? timeline.length : (timeline.milestones?.length || timeline.phases?.length || 0)
      summaries.push(`Timeline: ${count} milestones/phases`)
    }

    if (baseline.cost_baseline) {
      const cost = baseline.cost_baseline
      const budget = cost.total_budget || cost.budget || 'N/A'
      summaries.push(`Budget: ${budget}`)
    }

    if (baseline.technical_baseline) {
      const tech = baseline.technical_baseline
      const count = Array.isArray(tech) ? tech.length : (tech.technologies?.length || 0)
      summaries.push(`Technical: ${count} items`)
    }

    return summaries.join(', ') || 'No baseline data'
  }

  /**
   * Summarize drift points concisely (PERFORMANCE)
   */
  private summarizeDriftPoints(driftPoints: DriftPoint[]): string {
    const byType: Record<string, number> = {}
    
    driftPoints.forEach(drift => {
      const key = `${drift.entityType}:${drift.driftType}`
      byType[key] = (byType[key] || 0) + 1
    })

    const summary = Object.entries(byType)
      .map(([key, count]) => `${count}x ${key}`)
      .join(', ')

    return `Total: ${driftPoints.length} (${summary})`
  }

  /**
   * Format baseline entities for prompt (legacy, detailed version)
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
    userId: string,
    majorChanges?: DriftPoint[]
  ): Promise<ApplyResolutionResult> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      logger.info('[DRIFT-RESOLUTION] Applying resolution', {
        documentId,
        driftRecordId,
        userId,
        hasMajorChanges: !!majorChanges && majorChanges.length > 0
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

      // 4. ⭐ Create change request for major changes requiring approval
      let changeRequestId: string | undefined
      let approvalRequestId: string | undefined
      if (majorChanges && majorChanges.length > 0) {
        changeRequestId = await this.createChangeRequestForMajorChanges(
          client,
          documentId,
          driftRecordId,
          majorChanges,
          userId
        )

        logger.info('[DRIFT-RESOLUTION] Change request created for major changes', {
          changeRequestId,
          majorChangesCount: majorChanges.length
        })

        // 4a. ⭐ Create approval workflow for the change request
        approvalRequestId = await this.createApprovalWorkflow(
          client,
          changeRequestId,
          driftRecordId,
          documentId,
          majorChanges,
          userId
        )

        logger.info('[DRIFT-RESOLUTION] Approval workflow created', {
          changeRequestId,
          approvalRequestId
        })

        // 5. ⭐ Auto-schedule emergency meeting for critical budget overruns
        await this.checkAndScheduleEmergencyMeeting(
          client,
          driftRecordId,
          majorChanges,
          changeRequestId,
          userId
        )
      }

      await client.query('COMMIT')

      logger.info('[DRIFT-RESOLUTION] Drift resolved successfully', {
        documentId,
        driftRecordId,
        userId,
        changeRequestId,
        approvalRequestId
      })

      // Create a knowledge-base entry from the drift detection asynchronously.
      // Do this after the DB transaction commits so KB creation doesn't affect the primary flow.
      try {
        const driftRes = await pool.query('SELECT * FROM baseline_drift_detection WHERE id = $1', [driftRecordId])
        if (driftRes.rows.length > 0) {
          const driftRow = driftRes.rows[0]
          // Call KB integration but do not fail the main flow if it errors.
          createKnowledgeBaseFromDrift(
            {
              id: driftRow.id,
              project_id: driftRow.project_id,
              baseline_id: driftRow.baseline_id,
              detection_type: driftRow.detection_type || driftRow.drift_type || 'unknown',
              drift_description: driftRow.drift_description || driftRow.description || '',
              drift_impact: driftRow.drift_impact || null,
              ai_confidence: driftRow.ai_confidence || 0,
              ai_processing_metadata: driftRow.ai_processing_metadata || driftRow.ai_processing || null
            },
            userId,
            {
              similar_project_ids: []
            }
          ).catch((kbErr) => {
            logger.error('[DRIFT-RESOLUTION] Failed to create knowledge base entry from drift:', kbErr)
          })
        }
      } catch (kbQueryErr) {
        logger.error('[DRIFT-RESOLUTION] Error querying drift record for KB integration:', kbQueryErr)
      }

      return { changeRequestId, approvalRequestId }
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('[DRIFT-RESOLUTION] Error applying resolution:', error)
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Create a change request document for major changes requiring approval
   */
  private async createChangeRequestForMajorChanges(
    client: PoolClient,
    documentId: string,
    driftRecordId: string,
    majorChanges: DriftPoint[],
    userId: string
  ): Promise<string> {
    // Get document and project info
    const docResult = await client.query(
      `SELECT d.*, p.name as project_name 
       FROM documents d 
       LEFT JOIN projects p ON d.project_id = p.id
       WHERE d.id = $1`,
      [documentId]
    )

    if (docResult.rows.length === 0) {
      throw new Error(`Document not found: ${documentId}`)
    }

    const document = docResult.rows[0] as Document

    // Build change request content
    const changeRequestContent = this.buildChangeRequestContent(
      document,
      driftRecordId,
      majorChanges
    )

    // Create change request as a document
    const changeRequestId = uuidv4()
    const changeRequestName = `Change Request: Major Drift Changes - ${document.name || document.title || 'Unnamed Document'}`

    await client.query(
      `INSERT INTO documents (
        id, project_id, name, content, status, type, created_by, updated_by,
        metadata, word_count, character_count, version, semantic_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, 1, '1.0.0')`,
      [
        changeRequestId,
        document.project_id,
        changeRequestName,
        changeRequestContent,
        'pending_approval',
        'change_request',
        userId,
        JSON.stringify({
          change_request_type: 'drift_resolution',
          source_document_id: documentId,
          drift_record_id: driftRecordId,
          major_changes: majorChanges,
          created_from: 'automatic_drift_resolution',
          requires_approval: true
        }),
        changeRequestContent.split(/\s+/).filter(Boolean).length, // word count
        changeRequestContent.length, // character count
      ]
    )

    // Create entry in cr_document_updates table to track the update
    const updateTaskId = uuidv4()
    await client.query(
      `INSERT INTO cr_document_updates (
        id, change_request_id, target_document_id, status, 
        assigned_to, created_by, update_description
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        updateTaskId,
        changeRequestId,
        documentId,
        'pending',
        userId,
        userId,
        `Drift resolution with ${majorChanges.length} major change(s) requiring approval`
      ]
    )

    logger.info('[DRIFT-RESOLUTION] Change request document created', {
      changeRequestId,
      documentId,
      majorChangesCount: majorChanges.length
    })

    return changeRequestId
  }

  /**
   * Build change request document content
   */
  private buildChangeRequestContent(
    document: Document,
    driftRecordId: string,
    majorChanges: DriftPoint[]
  ): string {
    const now = new Date()
    const timestamp = now.toISOString()
    const dateFormatted = now.toLocaleDateString()
    
    return `# Change Request: Major Drift Changes

**Document**: ${document.name || document.title || 'Unnamed Document'}
**Project**: ${document.project_name || 'Unknown'}
**Date**: ${dateFormatted}
**Status**: Pending Approval
**Type**: Drift Resolution - Major Changes

---

## Summary

This change request was automatically created following AI-powered drift resolution. The drift resolution process identified **${majorChanges.length} major change(s)** that require stakeholder approval before they can be finalized.

**Drift Record ID**: ${driftRecordId}
**Source Document ID**: ${document.id}

---

## Major Changes Requiring Approval

${majorChanges.map((change, index) => `
### ${index + 1}. ${change.entityType.toUpperCase()}: ${change.driftType.toUpperCase()}

**Description**: ${change.description}

**Baseline Value**:
\`\`\`
${JSON.stringify(change.baselineValue, null, 2)}
\`\`\`

**Current/Proposed Value**:
\`\`\`
${JSON.stringify(change.currentValue, null, 2)}
\`\`\`

${change.variance ? `**Variance**: ${change.variance}%` : ''}

**Impact**: This change ${change.requiresApproval ? 'requires formal approval' : 'may impact the baseline'}

---
`).join('\n')}

## Approval Required

These changes have been flagged as **major changes** based on the following criteria:

- Budget changes exceeding 10%
- Critical milestone additions/removals
- High-influence stakeholder changes
- Scope modifications requiring authorization

## Recommended Actions

1. **Review** the proposed changes above
2. **Assess** the impact on project baseline and objectives
3. **Approve** or **Reject** this change request
4. **Document** the rationale for the decision

## Metadata

- **Created**: ${timestamp}
- **Created By**: Automatic Drift Resolution System
- **Drift Record**: ${driftRecordId}
- **Source Document**: ${document.id}
- **Change Type**: Major Drift Changes

---

*This change request was automatically generated by the ADPA Drift Resolution System*
`
  }

  /**
   * Check if emergency meeting should be scheduled for budget overrun
   */
  private async checkAndScheduleEmergencyMeeting(
    client: PoolClient,
    driftRecordId: string,
    majorChanges: DriftPoint[],
    changeRequestId: string,
    userId: string
  ): Promise<void> {
    try {
      // Check if any major changes involve budget overrun
      const budgetChanges = majorChanges.filter(change => 
        change.entityType === 'budget' && change.variance !== undefined
      )

      if (budgetChanges.length === 0) {
        logger.info('[DRIFT-RESOLUTION] No budget changes detected, skipping emergency meeting')
        return
      }

      // Get the largest budget variance
      const maxVariance = Math.max(...budgetChanges.map(c => Math.abs(c.variance || 0)))

      // Only schedule meeting if overrun is >= 10% (critical or emergency)
      if (maxVariance < 10) {
        logger.info('[DRIFT-RESOLUTION] Budget variance below threshold', {
          variance: maxVariance,
          threshold: 10
        })
        return
      }

      // Get drift record details
      const driftResult = await client.query(
        `SELECT 
          bdd.*, 
          p.id as project_id,
          p.name as project_name,
          pb.cost_baseline
         FROM baseline_drift_detection bdd
         JOIN projects p ON bdd.project_id = p.id
         LEFT JOIN project_baselines pb ON bdd.baseline_id = pb.id
         WHERE bdd.id = $1`,
        [driftRecordId]
      )

      if (driftResult.rows.length === 0) {
        logger.warn('[DRIFT-RESOLUTION] Drift record not found', { driftRecordId })
        return
      }

      const drift = driftResult.rows[0]
      const costBaseline = drift.cost_baseline || {}
      
      // Extract budget information from baseline and changes
      const approvedBudget = costBaseline.total_budget || costBaseline.budget || 0
      
      if (!approvedBudget || approvedBudget === 0) {
        logger.warn('[DRIFT-RESOLUTION] No approved budget in baseline', { driftRecordId })
        return
      }

      // Calculate projected cost based on variance
      const projectedCost = approvedBudget * (1 + maxVariance / 100)
      const overrunAmount = projectedCost - approvedBudget
      const overrunPercentage = maxVariance

      logger.info('[DRIFT-RESOLUTION] Budget overrun detected, scheduling emergency meeting', {
        approvedBudget,
        projectedCost,
        overrunAmount,
        overrunPercentage
      })

      // Schedule emergency meeting
      const meetingResult = await emergencyMeetingService.scheduleBudgetOverrunMeeting(
        {
          projectId: drift.project_id,
          projectName: drift.project_name,
          driftRecordId,
          approvedBudget,
          projectedCost,
          overrunAmount,
          overrunPercentage,
          rootCause: drift.drift_description,
          changeRequestId
        },
        userId
      )

      logger.info('[DRIFT-RESOLUTION] Emergency meeting scheduled successfully', {
        meetingId: meetingResult.meeting.meetingId,
        severity: meetingResult.meeting.severity,
        scheduledDate: meetingResult.meeting.scheduledDate
      })
    } catch (error) {
      // Don't fail the whole transaction if meeting scheduling fails
      logger.error('[DRIFT-RESOLUTION] Failed to schedule emergency meeting:', error)
    }
  }

  /**
   * Create approval workflow for change request
   */
  private async createApprovalWorkflow(
    client: PoolClient,
    changeRequestId: string,
    driftRecordId: string,
    documentId: string,
    majorChanges: DriftPoint[],
    userId: string
  ): Promise<string> {
    try {
      // Get drift record details to determine workflow type
      const driftResult = await client.query(
        `SELECT * FROM baseline_drift_detection WHERE id = $1`,
        [driftRecordId]
      )

      if (driftResult.rows.length === 0) {
        throw new Error(`Drift record not found: ${driftRecordId}`)
      }

      const driftRecord = driftResult.rows[0]

      // Get document details
      const docResult = await client.query(
        `SELECT d.*, p.name as project_name 
         FROM documents d 
         LEFT JOIN projects p ON d.project_id = p.id
         WHERE d.id = $1`,
        [documentId]
      )

      const document = docResult.rows[0]

      // Determine request type and priority based on drift severity and changes
      let requestType = 'negative_drift'
      let priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency' = 'medium'
      let severity: 'low' | 'medium' | 'high' | 'critical' = driftRecord.drift_severity || 'medium'

      // Check for budget overrun
      const hasBudgetOverrun = majorChanges.some(
        change => change.entityType === 'budget' && change.variance && Math.abs(change.variance) > 10
      )

      if (hasBudgetOverrun) {
        requestType = 'budget_overrun'
        const maxBudgetVariance = Math.max(
          ...majorChanges
            .filter(c => c.entityType === 'budget' && c.variance)
            .map(c => Math.abs(c.variance || 0))
        )

        if (maxBudgetVariance >= 25) {
          priority = 'emergency'
          severity = 'critical'
        } else if (maxBudgetVariance >= 10) {
          priority = 'critical'
          severity = 'high'
        } else {
          priority = 'high'
          severity = 'medium'
        }
      } else if (driftRecord.drift_severity === 'critical') {
        priority = 'critical'
      } else if (driftRecord.drift_severity === 'high') {
        priority = 'high'
      }

      // Build impact summary
      const impactSummary = {
        drift_severity: driftRecord.drift_severity,
        major_changes_count: majorChanges.length,
        entity_types_affected: [...new Set(majorChanges.map(c => c.entityType))],
        budget_impact: majorChanges
          .filter(c => c.entityType === 'budget' && c.variance)
          .map(c => ({ variance: c.variance, description: c.description })),
        requires_approval: true
      }

      // Create approval request through the approval workflow service
      // Note: Approval workflow service manages its own transaction
      const approvalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: requestType,
        change_request_id: changeRequestId,
        drift_record_id: driftRecordId,
        project_id: document.project_id,
        title: `Approval Required: ${document.name || document.title}`,
        description: `${majorChanges.length} major change(s) detected requiring approval`,
        impact_summary: impactSummary,
        priority,
        severity,
        requested_by: userId,
        metadata: {
          source: 'automatic_drift_resolution',
          drift_severity: driftRecord.drift_severity,
          major_changes: majorChanges
        }
      })

      logger.info('[DRIFT-RESOLUTION] Approval workflow created', {
        approval_request_id: approvalRequest.id,
        change_request_id: changeRequestId,
        priority,
        request_type: requestType
      })

      return approvalRequest.id
    } catch (error) {
      logger.error('[DRIFT-RESOLUTION] Error creating approval workflow:', error)
      // If approval workflow creation fails, log but don't fail the transaction
      // The change request will still exist and can be manually routed for approval
      return ''
    }
  }
}

// Export singleton instance
export const driftResolutionService = new DriftResolutionService()
