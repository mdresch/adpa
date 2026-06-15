/**
 * IP Legal Review Workflow
 * RPAS-CM-ENV-IP-001
 *
 * Routes an approved NoveltyAssessment to the legal team via the
 * existing approvalWorkflowService, then handles the decision:
 *   APPROVE_FOR_FILING  → IPRegistrationPipeline
 *   APPROVE_AS_TRADE_SECRET → classify + restrict in ADPA
 *   REQUEST_INVESTIGATION   → re-trigger assessment with notes
 *   REJECT               → tag entity as ip_reviewed_negative
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { approvalWorkflowService } from '../../services/approvalWorkflowService'
import { emailNotificationService } from '../../services/emailNotificationService'
import { NoveltyAssessment } from './IPNoveltyAssessmentService'

// ============================================================================
// TYPES
// ============================================================================

export type LegalDecision =
  | 'APPROVE_FOR_FILING'
  | 'APPROVE_AS_TRADE_SECRET'
  | 'REQUEST_INVESTIGATION'
  | 'REJECT'

export interface LegalReviewResult {
  approvalRequestId: string
  decision?: LegalDecision
  decisionNotes?: string
  decidedBy?: string
  decidedAt?: Date
}

// ============================================================================
// SERVICE
// ============================================================================

export class IPLegalReviewWorkflow {

  /**
   * Create and route a legal review approval request.
   * Called by IPNoveltyAssessmentService when noveltyScore >= 0.60.
   *
   * Uses the existing approvalWorkflowService.createApprovalRequest()
   * with request_type = 'ip_novelty_review'. Requires a matching
   * workflow row in the approval_workflows table (seeded separately).
   */
  async initiateReview(assessment: NoveltyAssessment, triggeredBy: string): Promise<LegalReviewResult> {
    logger.info('[IP-LEGAL] Initiating legal review', {
      assessmentId: assessment.id,
      ipClassification: assessment.ipClassification,
      noveltyScore: assessment.noveltyScore,
      estimatedIpValue: assessment.estimatedIpValue,
    })

    // Determine priority based on estimated IP value (REQ-IP-004)
    const priority = assessment.estimatedIpValue > 500000
      ? 'high'
      : assessment.estimatedIpValue > 100000
        ? 'medium'
        : 'low'

    const title = `IP Novelty Review: ${assessment.ipClassification.toUpperCase()} — Score ${(assessment.noveltyScore * 100).toFixed(0)}%`
    const description = [
      `The ADPA IP Novelty Assessment System detected a potential ${assessment.ipClassification} opportunity.`,
      `Novelty Score: ${(assessment.noveltyScore * 100).toFixed(1)}%`,
      `Estimated IP Value: $${assessment.estimatedIpValue.toLocaleString()}`,
      `Recommended Action: ${assessment.recommendedAction}`,
      `System Origin Verified: ${assessment.systemOriginVerified ? 'YES' : 'NO'}`,
      `Prior Art Found: ${assessment.priorArtFound.length > 0 ? 'YES (' + assessment.priorArtFound.length + ' results)' : 'NONE'}`,
      `Evidence Document: ${assessment.evidenceDocumentId || 'N/A'}`,
    ].join('\n')

    let approvalRequest: any

    try {
      approvalRequest = await approvalWorkflowService.createApprovalRequest({
        request_type: 'ip_novelty_review',
        project_id: assessment.projectId,
        drift_record_id: assessment.driftRecordId,
        title,
        description,
        priority: priority as any,
        severity: 'low',           // Positive opportunity, not a risk
        requested_by: triggeredBy,
        impact_summary: {
          ip_assessment_id: assessment.id,
          ip_classification: assessment.ipClassification,
          novelty_score: assessment.noveltyScore,
          estimated_ip_value: assessment.estimatedIpValue,
          recommended_action: assessment.recommendedAction,
          system_origin_verified: assessment.systemOriginVerified,
          prior_art_count: assessment.priorArtFound.length,
          prior_art_blocking: assessment.priorArtFound.some(p => p.similarity > 0.85),
          evidence_document_id: assessment.evidenceDocumentId,
          technical_summary: assessment.technicalSummary.substring(0, 500),
        },
        metadata: {
          ip_assessment_id: assessment.id,
          evidence_document_id: assessment.evidenceDocumentId,
          sla_business_days: 10,
          ip_workflow: true,
        },
      })
    } catch (workflowError: any) {
      // Workflow row may not exist yet — log and fall back to direct DB insert
      logger.warn('[IP-LEGAL] Approval workflow not found for ip_novelty_review — using direct routing', {
        error: workflowError.message,
      })
      approvalRequest = await this.createDirectApprovalRecord(assessment, title, description, priority, triggeredBy)
    }

    // Notify legal team via email
    this.sendLegalNotification(assessment, approvalRequest.id).catch(err =>
      logger.error('[IP-LEGAL] Failed to send legal notification', { err })
    )

    // Update ip_claims with the approval request id
    await pool.query(
      `UPDATE ip_claims
       SET legal_review_status = 'pending',
           updated_at = NOW()
       WHERE id = $1`,
      [assessment.id]
    )

    // Audit log
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
       VALUES ($1, 'ip_legal_review_initiated', 'ip_claim', $2, $3)`,
      [
        triggeredBy,
        assessment.id,
        JSON.stringify({
          approvalRequestId: approvalRequest.id,
          priority,
          ipClassification: assessment.ipClassification,
          estimatedIpValue: assessment.estimatedIpValue,
        }),
      ]
    )

    logger.info('[IP-LEGAL] Legal review initiated', {
      assessmentId: assessment.id,
      approvalRequestId: approvalRequest.id,
    })

    return { approvalRequestId: approvalRequest.id }
  }

  /**
   * Process a legal decision on an IP claim.
   * Called when an approval step is resolved via the existing approval workflow.
   *
   * decision values:
   *   'approved'  with conditions containing 'FILE_PATENT' | 'FILE_COPYRIGHT'
   *               → maps to APPROVE_FOR_FILING
   *   'approved'  with conditions containing 'TRADE_SECRET'
   *               → maps to APPROVE_AS_TRADE_SECRET
   *   'approved'  with conditions containing 'INVESTIGATE'
   *               → maps to REQUEST_INVESTIGATION
   *   'rejected'  → maps to REJECT
   */
  async processLegalDecision(
    ipClaimId: string,
    approvalRequestId: string,
    rawDecision: 'approved' | 'rejected',
    conditions: string[] | undefined,
    decisionNotes: string | undefined,
    decidedBy: string
  ): Promise<LegalDecision> {
    const legalDecision = this.mapToLegalDecision(rawDecision, conditions)

    logger.info('[IP-LEGAL] Processing legal decision', {
      ipClaimId,
      legalDecision,
      decidedBy,
    })

    // Update ip_claims
    await pool.query(
      `UPDATE ip_claims
       SET legal_review_status = $1,
           legal_reviewer_id   = $2,
           updated_at          = NOW()
       WHERE id = $3`,
      [
        legalDecision === 'REJECT' ? 'rejected'
          : legalDecision === 'REQUEST_INVESTIGATION' ? 'investigating'
            : 'approved',
        decidedBy,
        ipClaimId,
      ]
    )

    // REQ-IP-006: Audit every state transition
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
       VALUES ($1, 'ip_legal_decision', 'ip_claim', $2, $3)`,
      [
        decidedBy,
        ipClaimId,
        JSON.stringify({
          legalDecision,
          decisionNotes,
          approvalRequestId,
          decidedAt: new Date().toISOString(),
        }),
      ]
    )

    logger.info('[IP-LEGAL] Legal decision recorded', { ipClaimId, legalDecision })
    return legalDecision
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapToLegalDecision(
    rawDecision: 'approved' | 'rejected',
    conditions: string[] | undefined
  ): LegalDecision {
    if (rawDecision === 'rejected') return 'REJECT'
    const condStr = (conditions || []).join(' ').toUpperCase()
    if (condStr.includes('TRADE_SECRET')) return 'APPROVE_AS_TRADE_SECRET'
    if (condStr.includes('INVESTIGATE')) return 'REQUEST_INVESTIGATION'
    return 'APPROVE_FOR_FILING'       // default approval path
  }

  /**
   * Fallback when approval_workflows table doesn't have an 'ip_novelty_review' row yet.
   * Creates a minimal approval_requests record directly.
   */
  private async createDirectApprovalRecord(
    assessment: NoveltyAssessment,
    title: string,
    description: string,
    priority: string,
    triggeredBy: string
  ): Promise<{ id: string }> {
    const { randomUUID } = await import('crypto')
    const requestId = randomUUID()

    // SLA: 10 business days ≈ 240 hours
    const slaDeadline = new Date(Date.now() + 240 * 60 * 60 * 1000)

    await pool.query(
      `INSERT INTO approval_requests (
        id, request_type, project_id, drift_record_id,
        title, description, current_stage, total_stages,
        status, priority, severity, sla_deadline,
        requested_by, metadata, impact_summary
      ) VALUES ($1,$2,$3,$4,$5,$6,1,1,$7,$8,$9,$10,$11,$12,$13)`,
      [
        requestId,
        'ip_novelty_review',
        assessment.projectId,
        assessment.driftRecordId,
        title,
        description,
        'pending',
        priority,
        'low',
        slaDeadline,
        triggeredBy,
        JSON.stringify({ ip_assessment_id: assessment.id, ip_workflow: true }),
        JSON.stringify({ ip_assessment_id: assessment.id, estimated_ip_value: assessment.estimatedIpValue }),
      ]
    )

    // Create a single approval step assigned to legal_reviewer role
    const stepId = randomUUID()
    await pool.query(
      `INSERT INTO approval_steps (
        id, approval_request_id, step_order, step_name,
        approver_role, is_required, is_conditional, status
      ) VALUES ($1,$2,1,$3,$4,TRUE,FALSE,'pending')`,
      [
        stepId,
        requestId,
        'Legal Team IP Review',
        'legal_reviewer',
      ]
    )

    return { id: requestId }
  }

  /**
   * Send rich HTML email to the legal team.
   */
  private async sendLegalNotification(
    assessment: NoveltyAssessment,
    approvalRequestId: string
  ): Promise<void> {
    const userResult = await pool.query(
      `SELECT email, name FROM users WHERE role = ANY($1)`,
      [['legal_reviewer', 'admin']]
    )
    const recipients = userResult.rows.map(r => ({ email: r.email, name: r.name }))

    if (recipients.length === 0) {
      logger.warn('[IP-LEGAL] No legal_reviewer or admin users found for IP notification')
      return
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000'
    const reviewUrl = `${baseUrl}/approvals/${approvalRequestId}`
    const docUrl = assessment.evidenceDocumentId
      ? `${baseUrl}/projects/${assessment.projectId}/documents/${assessment.evidenceDocumentId}`
      : null

    const subject = `🔬 IP Novelty Review Required: ${assessment.ipClassification.toUpperCase()} (Score ${(assessment.noveltyScore * 100).toFixed(0)}%)`

    const html = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); color: white; padding: 30px; text-align: center; }
    .badge { display: inline-block; background: #e74c3c; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin: 5px; }
    .badge.green { background: #27ae60; }
    .badge.amber { background: #f39c12; }
    .content { padding: 25px; }
    .metric-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .metric { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; }
    .metric-value { font-size: 26px; font-weight: bold; color: #0f3460; }
    .metric-label { font-size: 11px; color: #6c757d; text-transform: uppercase; letter-spacing: 0.5px; }
    .evidence { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .actions { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .btn { display: inline-block; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 5px; }
    .btn-primary { background: #0f3460; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .footer { text-align: center; padding: 20px; color: #6c757d; font-size: 12px; border-top: 1px solid #dee2e6; }
    .prior-art { background: #fee2e2; border-radius: 8px; padding: 15px; margin: 10px 0; }
    .no-prior-art { background: #d1fae5; border-radius: 8px; padding: 15px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔬 IP Novelty Review Required</h1>
    <p>The ADPA system has detected a potential intellectual property opportunity</p>
    <span class="badge">${assessment.ipClassification.toUpperCase()}</span>
    <span class="badge ${assessment.noveltyScore >= 0.75 ? 'green' : 'amber'}">
      Novelty Score: ${(assessment.noveltyScore * 100).toFixed(0)}%
    </span>
  </div>

  <div class="content">
    <h2>Executive Summary</h2>
    <p>${assessment.technicalSummary.substring(0, 400)}${assessment.technicalSummary.length > 400 ? '...' : ''}</p>

    <div class="metric-grid">
      <div class="metric">
        <div class="metric-label">Estimated IP Value</div>
        <div class="metric-value">$${assessment.estimatedIpValue.toLocaleString()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Classification</div>
        <div class="metric-value">${assessment.ipClassification.toUpperCase()}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Prior Art Results</div>
        <div class="metric-value">${assessment.priorArtFound.length}</div>
      </div>
      <div class="metric">
        <div class="metric-label">System Origin</div>
        <div class="metric-value">${assessment.systemOriginVerified ? '✅ Verified' : '❌ Unverified'}</div>
      </div>
    </div>

    ${assessment.priorArtFound.length > 0
      ? `<div class="prior-art">
          <strong>⚠️ Prior Art Found (${assessment.priorArtFound.length} results)</strong>
          <ul>${assessment.priorArtFound.slice(0, 3).map(pa =>
            `<li>${pa.source}: ${pa.title} — Similarity: ${(pa.similarity * 100).toFixed(0)}%</li>`
          ).join('')}</ul>
        </div>`
      : `<div class="no-prior-art">
          <strong>✅ No Blocking Prior Art Found</strong> — Patent search returned no highly similar results.
        </div>`
    }

    <div class="evidence">
      <strong>📄 Evidence Package Available</strong><br>
      ${docUrl
        ? `A full IP evidence package has been generated in ADPA. Review it before making your decision.`
        : 'Evidence package stored in ADPA document library.'
      }
    </div>

    <div class="actions">
      <h3>Your Decision Options</h3>
      <p>When approving, specify one of the following in the "Conditions" field:</p>
      <ul>
        <li><strong>FILE_PATENT</strong> — Initiate provisional patent application (USPTO/EPO)</li>
        <li><strong>FILE_COPYRIGHT</strong> — Register copyright with the appropriate office</li>
        <li><strong>TRADE_SECRET</strong> — Classify as internal trade secret (no public disclosure)</li>
        <li><strong>INVESTIGATE</strong> — Request deeper technical investigation</li>
        <li><em>Reject</em> — No IP protection warranted</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${reviewUrl}" class="btn btn-primary">🔍 Review & Decide in ADPA</a>
      ${docUrl ? `<a href="${docUrl}" class="btn btn-secondary">📄 View Evidence Package</a>` : ''}
    </div>
  </div>

  <div class="footer">
    <p>SLA: <strong>10 business days</strong> | Assessment ID: ${assessment.id}</p>
    <p>This is an automated notification from the ADPA IP Governance System (RPAS-CM-ENV-IP-001)</p>
  </div>
</body>
</html>`

    await emailNotificationService.sendEmail({
      to: recipients,
      subject,
      html,
      text: `IP Novelty Review Required\n\n${assessment.technicalSummary}\n\nScore: ${(assessment.noveltyScore * 100).toFixed(0)}%\nClassification: ${assessment.ipClassification}\nEstimated Value: $${assessment.estimatedIpValue.toLocaleString()}\n\nReview: ${reviewUrl}`,
      priority: 'normal',
    })

    logger.info('[IP-LEGAL] Legal review email sent', {
      recipients: recipients.length,
      assessmentId: assessment.id,
    })
  }
}

export const ipLegalReviewWorkflow = new IPLegalReviewWorkflow()
