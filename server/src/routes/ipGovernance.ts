/**
 * IP Governance API Router
 * RPAS-CM-ENV-IP-001
 *
 * Exposes IP claim management endpoints. All routes require authentication.
 *
 * GET  /api/v1/ip-governance/projects/:projectId/claims     — list project claims
 * GET  /api/v1/ip-governance/claims/:claimId                — get single claim
 * POST /api/v1/ip-governance/claims/:claimId/file           — initiate registration (post-approval)
 * PUT  /api/v1/ip-governance/claims/:claimId/status         — update filing status
 */

import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger'
import { ipRegistrationPipeline } from '../modules/ip-governance/IPRegistrationPipeline'
import { ipLegalReviewWorkflow, LegalDecision } from '../modules/ip-governance/IPLegalReviewWorkflow'
import { pool } from '../database/connection'

const router = Router()

// ─── GET /projects/:projectId/claims ─────────────────────────────────────────

router.get('/projects/:projectId/claims', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params
    const claims = await ipRegistrationPipeline.getProjectIPClaims(projectId)

    res.json({
      success: true,
      data: claims,
      count: claims.length,
    })
  } catch (error: any) {
    logger.error('[IP-GOVERNANCE-API] Error fetching claims', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── GET /claims/:claimId ─────────────────────────────────────────────────────

router.get('/claims/:claimId', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params
    const result = await pool.query(
      `SELECT
         ic.*,
         d_ev.name AS evidence_document_name,
         d_fi.name AS filing_document_name,
         p.name    AS project_name
       FROM ip_claims ic
       LEFT JOIN documents d_ev ON d_ev.id = ic.evidence_document_id
       LEFT JOIN documents d_fi ON d_fi.id = ic.filing_document_id
       LEFT JOIN projects  p   ON p.id     = ic.project_id
       WHERE ic.id = $1`,
      [claimId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'IP claim not found' })
    }

    res.json({ success: true, data: result.rows[0] })
  } catch (error: any) {
    logger.error('[IP-GOVERNANCE-API] Error fetching claim', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── POST /claims/:claimId/file ───────────────────────────────────────────────

router.post('/claims/:claimId/file', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params
    const { legalDecision } = req.body as { legalDecision: LegalDecision }
    const userId = (req as any).user?.id || 'system'

    if (!legalDecision) {
      return res.status(400).json({
        success: false,
        error: 'legalDecision is required (APPROVE_FOR_FILING | APPROVE_AS_TRADE_SECRET)',
      })
    }

    const filing = await ipRegistrationPipeline.initiateRegistration(claimId, legalDecision, userId)

    res.json({ success: true, data: filing })
  } catch (error: any) {
    logger.error('[IP-GOVERNANCE-API] Error initiating registration', { error: error.message })
    // REQ-IP-005 violation surfaces here
    const status = error.message.includes('REQ-IP-005') ? 403 : 500
    res.status(status).json({ success: false, error: error.message })
  }
})

// ─── PUT /claims/:claimId/status ─────────────────────────────────────────────

router.put('/claims/:claimId/status', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params
    const { status, agencyReferenceNumber } = req.body
    const userId = (req as any).user?.id || 'system'

    const validStatuses = ['draft', 'filed', 'pending_examination', 'granted', 'rejected', 'appealed']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      })
    }

    await ipRegistrationPipeline.updateFilingStatus(claimId, status, agencyReferenceNumber, userId)
    res.json({ success: true, message: `Filing status updated to: ${status}` })
  } catch (error: any) {
    logger.error('[IP-GOVERNANCE-API] Error updating filing status', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

// ─── GET /claims/:claimId/legal-decision ─────────────────────────────────────
// Process legal decision webhook — called by approval system on final decision

router.post('/claims/:claimId/legal-decision', async (req: Request, res: Response) => {
  try {
    const { claimId } = req.params
    const { approvalRequestId, rawDecision, conditions, decisionNotes } = req.body
    const userId = (req as any).user?.id || 'system'

    const legalDecision = await ipLegalReviewWorkflow.processLegalDecision(
      claimId,
      approvalRequestId,
      rawDecision,
      conditions,
      decisionNotes,
      userId
    )

    // Auto-trigger registration if approved
    if (legalDecision === 'APPROVE_FOR_FILING' || legalDecision === 'APPROVE_AS_TRADE_SECRET') {
      ipRegistrationPipeline.initiateRegistration(claimId, legalDecision, userId)
        .then(filing => {
          logger.info('[IP-GOVERNANCE-API] Auto-registration triggered', {
            claimId,
            legalDecision,
            filingDocumentId: filing.filingDocumentId,
          })
        })
        .catch(err => {
          logger.error('[IP-GOVERNANCE-API] Auto-registration failed', { err })
        })
    }

    res.json({ success: true, data: { legalDecision } })
  } catch (error: any) {
    logger.error('[IP-GOVERNANCE-API] Error processing legal decision', { error: error.message })
    res.status(500).json({ success: false, error: error.message })
  }
})

export default router
