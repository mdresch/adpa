/**
 * IP Registration Pipeline
 * RPAS-CM-ENV-IP-001
 *
 * After legal team approves an IP claim, this service:
 *   1. Generates a formatted draft filing document using the ADPA document engine
 *   2. Tracks the filing lifecycle (DRAFT → FILED → PENDING → GRANTED/REJECTED)
 *   3. Schedules maintenance renewal reminders for granted patents
 *   4. Handles trade secret classification (restrict access in ADPA)
 *
 * REQ-IP-005: initiateRegistration() MUST NOT be callable unless
 *             legal_review_status = 'approved'
 */

import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import { randomUUID } from 'crypto'
import { LegalDecision } from './IPLegalReviewWorkflow'

// ============================================================================
// TYPES
// ============================================================================

export type FilingAgency = 'USPTO' | 'EPO' | 'WIPO' | 'COPYRIGHT' | 'INTERNAL'

export type FilingStatus =
  | 'draft'
  | 'filed'
  | 'pending_examination'
  | 'granted'
  | 'rejected'
  | 'appealed'
  | 'trade_secret_registered'

export interface IPFilingRecord {
  ipClaimId: string
  filingDocumentId: string
  targetAgency: FilingAgency
  filingStatus: FilingStatus
  agencyReferenceNumber?: string
  filedAt?: Date
  grantedAt?: Date
  nextMaintenanceDue?: Date
}

// ============================================================================
// SERVICE
// ============================================================================

export class IPRegistrationPipeline {

  /**
   * Initiate registration after legal approval.
   * REQ-IP-005: Guards against calling without approved status.
   */
  async initiateRegistration(
    ipClaimId: string,
    legalDecision: LegalDecision,
    approvedBy: string
  ): Promise<IPFilingRecord> {

    // REQ-IP-005: Verify legal_review_status = 'approved' before proceeding
    const claimResult = await pool.query(
      `SELECT * FROM ip_claims WHERE id = $1`,
      [ipClaimId]
    )

    if (claimResult.rows.length === 0) {
      throw new Error(`IP claim not found: ${ipClaimId}`)
    }

    const claim = claimResult.rows[0]

    if (claim.legal_review_status !== 'approved') {
      throw new Error(
        `[IP-REGISTRATION] REQ-IP-005 violated: Cannot initiate registration for claim ${ipClaimId} — legal_review_status is '${claim.legal_review_status}', must be 'approved'`
      )
    }

    logger.info('[IP-REGISTRATION] Initiating registration', {
      ipClaimId,
      legalDecision,
      ipClassification: claim.ip_classification,
    })

    // Determine target agency and filing approach
    const { targetAgency, filingType } = this.resolveTargetAgency(legalDecision, claim.ip_classification)

    if (legalDecision === 'APPROVE_AS_TRADE_SECRET') {
      return this.registerTradeSecret(ipClaimId, claim, approvedBy)
    }

    // Generate draft filing document
    const filingDocumentId = await this.generateFilingDocument(
      ipClaimId,
      claim,
      targetAgency,
      filingType,
      approvedBy
    )

    // Update ip_claims with filing info
    await pool.query(
      `UPDATE ip_claims
       SET filing_status       = 'draft',
           target_agency       = $1,
           filing_document_id  = $2,
           updated_at          = NOW()
       WHERE id = $3`,
      [targetAgency, filingDocumentId, ipClaimId]
    )

    // REQ-IP-006: Audit every state transition
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
       VALUES ($1, 'ip_registration_initiated', 'ip_claim', $2, $3)`,
      [
        approvedBy,
        ipClaimId,
        JSON.stringify({
          targetAgency,
          filingType,
          filingDocumentId,
          legalDecision,
          filingStatus: 'draft',
        }),
      ]
    )

    logger.info('[IP-REGISTRATION] Draft filing document created', {
      ipClaimId,
      targetAgency,
      filingDocumentId,
    })

    return {
      ipClaimId,
      filingDocumentId,
      targetAgency,
      filingStatus: 'draft',
    }
  }

  /**
   * Update filing status after external submission / examination result.
   * Called manually (or via a future webhook integration with patent agencies).
   */
  async updateFilingStatus(
    ipClaimId: string,
    newStatus: FilingStatus,
    agencyReferenceNumber: string | undefined,
    updatedBy: string
  ): Promise<void> {
    const updates: any = {
      filing_status: newStatus,
      updated_at: 'NOW()',
    }

    if (agencyReferenceNumber) updates.agency_reference_number = agencyReferenceNumber
    if (newStatus === 'filed') updates.filed_at = new Date()
    if (newStatus === 'granted') {
      updates.granted_at = new Date()
      // Schedule first USPTO maintenance (3.5 years from filing)
      const maintenanceDate = new Date()
      maintenanceDate.setFullYear(maintenanceDate.getFullYear() + 3, maintenanceDate.getMonth() + 6)
      updates.next_maintenance_due = maintenanceDate
    }

    const setClauses = Object.entries(updates)
      .filter(([, v]) => v !== 'NOW()')
      .map(([k], i) => `${k} = $${i + 2}`)
      .join(', ')

    const values = Object.entries(updates)
      .filter(([, v]) => v !== 'NOW()')
      .map(([, v]) => v)

    await pool.query(
      `UPDATE ip_claims
       SET ${setClauses}${setClauses ? ', ' : ''}updated_at = NOW(), filing_status = $${values.length + 2}
       WHERE id = $1`,
      [ipClaimId, ...values, newStatus]
    )

    // REQ-IP-006: Audit
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
       VALUES ($1, 'ip_filing_status_updated', 'ip_claim', $2, $3)`,
      [
        updatedBy,
        ipClaimId,
        JSON.stringify({ newStatus, agencyReferenceNumber, updatedAt: new Date().toISOString() }),
      ]
    )

    logger.info('[IP-REGISTRATION] Filing status updated', {
      ipClaimId,
      newStatus,
      agencyReferenceNumber,
    })
  }

  /**
   * Get all IP claims for a project (for the dashboard).
   */
  async getProjectIPClaims(projectId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT
         ic.*,
         d_ev.name  AS evidence_document_name,
         d_fi.name  AS filing_document_name
       FROM ip_claims ic
       LEFT JOIN documents d_ev ON d_ev.id = ic.evidence_document_id
       LEFT JOIN documents d_fi ON d_fi.id = ic.filing_document_id
       WHERE ic.project_id = $1
       ORDER BY ic.created_at DESC`,
      [projectId]
    )
    return result.rows
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private resolveTargetAgency(
    legalDecision: LegalDecision,
    ipClassification: string
  ): { targetAgency: FilingAgency; filingType: string } {
    if (legalDecision === 'APPROVE_AS_TRADE_SECRET') {
      return { targetAgency: 'INTERNAL', filingType: 'trade_secret' }
    }
    if (legalDecision === 'APPROVE_FOR_FILING') {
      if (ipClassification === 'patent') {
        return { targetAgency: 'USPTO', filingType: 'provisional_patent_application' }
      }
      if (ipClassification === 'copyright') {
        return { targetAgency: 'COPYRIGHT', filingType: 'form_tx_literary_work' }
      }
    }
    return { targetAgency: 'INTERNAL', filingType: 'none' }
  }

  private async registerTradeSecret(
    ipClaimId: string,
    claim: any,
    approvedBy: string
  ): Promise<IPFilingRecord> {
    const filingDocumentId = randomUUID()

    const content = `# Trade Secret Registration

**Date**: ${new Date().toISOString().split('T')[0]}  
**IP Claim ID**: ${ipClaimId}  
**Classification**: CONFIDENTIAL — TRADE SECRET  
**Approved By**: ${approvedBy}  

## Description

${claim.ip_classification} artifact identified as a trade secret by the ADPA IP Governance System.
System Origin Verified: ${claim.system_origin_verified ? 'YES' : 'NO'}  
Novelty Score: ${(claim.novelty_score * 100).toFixed(1)}%  

## Protection Instructions

1. This artifact is classified as a proprietary trade secret of the organization.
2. Access is restricted to authorized personnel only.
3. Do not disclose externally without explicit legal counsel approval.
4. Maintain confidentiality obligations for all team members with access.

## Maintenance

Review annually to ensure continued trade secret protection is appropriate.

---
_Registered by ADPA IP Registration Pipeline (RPAS-CM-ENV-IP-001)_
`

    await pool.query(
      `INSERT INTO documents (
        id, project_id, name, content, status,
        created_by, updated_by, metadata, word_count, character_count,
        version, semantic_version
      ) VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,1,'1.0.0')`,
      [
        filingDocumentId,
        claim.project_id,
        `Trade Secret Registration — ${new Date().toISOString().split('T')[0]}`,
        content,
        'approved',
        approvedBy,
        JSON.stringify({
          document_type: 'trade_secret_registration',
          ip_claim_id: ipClaimId,
          classification: 'CONFIDENTIAL',
        }),
        content.split(/\s+/).filter(Boolean).length,
        content.length,
      ]
    )

    await pool.query(
      `UPDATE ip_claims
       SET filing_status      = 'trade_secret_registered',
           target_agency      = 'INTERNAL',
           filing_document_id = $1,
           updated_at         = NOW()
       WHERE id = $2`,
      [filingDocumentId, ipClaimId]
    )

    await pool.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, new_values)
       VALUES ($1, 'ip_trade_secret_registered', 'ip_claim', $2, $3)`,
      [approvedBy, ipClaimId, JSON.stringify({ filingDocumentId, targetAgency: 'INTERNAL' })]
    )

    return {
      ipClaimId,
      filingDocumentId,
      targetAgency: 'INTERNAL',
      filingStatus: 'trade_secret_registered',
    }
  }

  private async generateFilingDocument(
    ipClaimId: string,
    claim: any,
    targetAgency: FilingAgency,
    filingType: string,
    approvedBy: string
  ): Promise<string> {
    const docId = randomUUID()
    const content = this.buildFilingDocumentContent(ipClaimId, claim, targetAgency, filingType)

    await pool.query(
      `INSERT INTO documents (
        id, project_id, name, content, status,
        created_by, updated_by, metadata, word_count, character_count,
        version, semantic_version
      ) VALUES ($1,$2,$3,$4,$5,$6,$6,$7,$8,$9,1,'1.0.0')`,
      [
        docId,
        claim.project_id,
        `${targetAgency} ${filingType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} — Draft`,
        content,
        'draft',
        approvedBy,
        JSON.stringify({
          document_type: 'ip_filing_draft',
          ip_claim_id: ipClaimId,
          target_agency: targetAgency,
          filing_type: filingType,
        }),
        content.split(/\s+/).filter(Boolean).length,
        content.length,
      ]
    )

    return docId
  }

  private buildFilingDocumentContent(
    ipClaimId: string,
    claim: any,
    targetAgency: FilingAgency,
    filingType: string
  ): string {
    const today = new Date().toISOString().split('T')[0]

    if (targetAgency === 'USPTO' && filingType === 'provisional_patent_application') {
      return `# Provisional Patent Application (PPA)
## United States Patent and Trademark Office

**Filing Date**: ${today}  
**Application Type**: Provisional Patent Application  
**IP Claim Reference**: ${ipClaimId}  
**Classification**: Utility Patent  

---

## Title of Invention

[INSERT FORMAL TITLE — Derived from: ${claim.ip_classification} artifact detected by ADPA System]

## Field of the Invention

The present invention relates to [FIELD] and more specifically to methods and systems for [SPECIFIC APPLICATION] as implemented within AI-assisted project management platforms.

## Background

Prior to this invention, [DESCRIBE PROBLEM]. Existing solutions failed to address [SPECIFIC GAP].

## Summary of the Invention

The invention provides a novel method comprising:

1. [STEP 1 — Derived from drift point description]
2. [STEP 2 — Derived from entity extraction pipeline]
3. [STEP 3 — Derived from ADPA governance workflow]

## Detailed Description

[Legal counsel to expand from ADPA Evidence Package — IP Claim: ${ipClaimId}]

**Novelty Score at Time of Detection**: ${(claim.novelty_score * 100).toFixed(1)}%  
**System Origin**: Verified ADPA AI Generation Engine  
**Evidence Package**: Available in ADPA Document Library  

## Claims

1. A computer-implemented method comprising: [TO BE FORMALIZED BY PATENT COUNSEL]
2. The method of claim 1, further comprising: [...]
3. A system for: [...]

## Abstract

[200-word abstract — to be drafted by patent counsel based on ADPA evidence package]

---

> ⚠️ **DRAFT — Review and finalize with registered patent attorney before filing.**  
> This document was generated by the ADPA IP Registration Pipeline.  
> Reference: RPAS-CM-ENV-IP-001 | Filing Type: Provisional Patent Application

`
    }

    if (targetAgency === 'COPYRIGHT') {
      return `# Copyright Registration Application
## U.S. Copyright Office — Form TX (Literary Work)

**Date**: ${today}  
**IP Claim Reference**: ${ipClaimId}  
**Work Type**: Literary Work (AI-assisted governance documentation)  

---

## Title of Work

[INSERT TITLE]

## Date of Creation

${today}

## Author Information

Organization: [COMPANY NAME]  
Nature of Authorship: AI-assisted generation with human oversight and governance  

## Nature of Work

This work comprises project management documentation generated by the ADPA (AI-assisted Document and Project Administration) system, incorporating novel governance frameworks and structured analysis outputs.

## Copyright Claimant

[COMPANY NAME]  
[ADDRESS]

## Certification

[To be certified by authorized organizational representative]

---

> ⚠️ **DRAFT — Review with legal counsel before submitting to the U.S. Copyright Office.**  
> Reference: RPAS-CM-ENV-IP-001 | IP Claim: ${ipClaimId}

`
    }

    return `# IP Filing Draft

**Agency**: ${targetAgency}  
**Filing Type**: ${filingType}  
**IP Claim ID**: ${ipClaimId}  
**Date**: ${today}  

[Draft content — to be completed by legal counsel based on ADPA Evidence Package]

Reference: RPAS-CM-ENV-IP-001
`
  }
}

export const ipRegistrationPipeline = new IPRegistrationPipeline()
