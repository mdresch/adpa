import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * Council Adjudication Schema
 * Enforces mandatory human-written rationale and valid action states.
 */
export const CouncilAdjudicationSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  auditorId: z.string().min(1).describe("The unique identifier of the council member (e.g., Marcus Vance)."),
  overrideRationale: z.string().min(10).describe("Mandatory human-written audit log explaining why the AI patch was accepted or denied.")
});

export type CouncilAdjudication = z.infer<typeof CouncilAdjudicationSchema>;

/**
 * GET /api/v1/governance/ledger
 * Returns the list of all adversarial tribunal debates and their current decision status.
 */
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        audit_id,
        timestamp,
        rule_code,
        document_type,
        event_type,
        decision_status,
        consensus_achieved,
        evidence_validation_report,
        purist_verdict,
        realist_verdict,
        arbitrator_verdict,
        final_patch_payload,
        template_gate_context,
        reviewed_by,
        resolved_at
      FROM governance_audit_ledger
      ORDER BY timestamp DESC
    `);

    res.json(result.rows);
  } catch (error) {
    logger.error('[COUNCIL-API] Failed to fetch audit ledger:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * GET /api/v1/governance/ledger/:auditId
 * Returns a single forensic audit entry for deep analysis.
 */
router.get('/ledger/:auditId', async (req: Request, res: Response) => {
  try {
    const { auditId } = req.params;
    const result = await pool.query('SELECT * FROM governance_audit_ledger WHERE audit_id = $1', [auditId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit record not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    logger.error('[COUNCIL-API] Failed to fetch audit record:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/v1/governance/ledger/:auditId/adjudicate
 * Executes the Human Sovereignty Layer decision.
 */
router.post('/ledger/:auditId/adjudicate', async (req: Request, res: Response) => {
  const { auditId } = req.params;

  try {
    const body = CouncilAdjudicationSchema.parse(req.body);
    
    // 1. Fetch the audit record to ensure it exists and is PENDING
    const auditRes = await pool.query('SELECT * FROM governance_audit_ledger WHERE audit_id = $1', [auditId]);
    
    if (auditRes.rows.length === 0) {
      return res.status(404).json({ error: 'Audit record not found' });
    }

    const auditRecord = auditRes.rows[0];

    if (auditRecord.decision_status !== 'PENDING') {
      return res.status(400).json({ error: `Record already resolved as ${auditRecord.decision_status}` });
    }

    if (body.action === 'REJECT') {
      // Logic for REJECT: Simply close the record, maintaining the generation block.
      await pool.query(`
        UPDATE governance_audit_ledger
        SET 
          decision_status = 'REJECTED',
          reviewed_by = $1,
          resolved_at = NOW(),
          arbitrator_verdict = arbitrator_verdict || jsonb_build_object('human_override_notes', $2)
        WHERE audit_id = $3
      `, [body.auditorId, body.overrideRationale, auditId]);

      logger.warn(`[COUNCIL-API] Audit ${auditId} REJECTED by ${body.auditorId}`);
      return res.json({ status: 'REJECTED', auditId });
    }

    // Logic for APPROVE: Execute atomic promotion to policy_library
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // A. Update the ledger status
      await client.query(`
        UPDATE governance_audit_ledger
        SET 
          decision_status = 'APPROVED',
          reviewed_by = $1,
          resolved_at = NOW(),
          arbitrator_verdict = arbitrator_verdict || jsonb_build_object('human_override_notes', $2)
        WHERE audit_id = $3
      `, [body.auditorId, body.overrideRationale, auditId]);

      // B. Promote the patch to policy_library
      const patch = auditRecord.final_patch_payload;
      if (!patch || !patch.description) {
        throw new Error('Cannot approve record without a valid patch payload');
      }

      await client.query(`
        UPDATE policy_library
        SET 
          description = $1,
          control_effectiveness_status = 'PARTIALLY_EFFECTIVE',
          updated_at = NOW()
        WHERE rule_code = $2
      `, [patch.description, auditRecord.rule_code]);

      await client.query('COMMIT');
      
      logger.info(`[COUNCIL-API] Audit ${auditId} APPROVED and PROMOTED by ${body.auditorId}. Control ${auditRecord.rule_code} reset to PARTIALLY_EFFECTIVE.`);
      
      res.json({ status: 'APPROVED', auditId, ruleCode: auditRecord.rule_code });

    } catch (txError) {
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Failed', details: error.errors });
    }
    logger.error('[COUNCIL-API] Adjudication failed:', error);
    res.status(500).json({ error: 'Internal Server Error during adjudication' });
  }
});

router.get('/ledger/:auditId/export', async (req, res) => {
  const { auditId } = req.params;
  
  try {
    const result = await pool.query('SELECT * FROM governance_audit_ledger WHERE audit_id = $1', [auditId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit record not found inside ledger registry.' });
    }

    const audit = result.rows[0];

    // Mock PDF Byte stream header declaration
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=ADPA_COMPLIANCE_REPORT_${auditId}.pdf`);

    // Write structured data summary mimicking file bytes
    res.status(200).send(Buffer.from(`%PDF-1.4\n%% ADPA Forensic Report for ID: ${auditId}\nStatus: ${audit.decision_status}\nRule Code: ${audit.rule_code}\nTranscript Payload: ${JSON.stringify(audit.purist_verdict)}`));
  } catch (err) {
    res.status(500).json({ error: 'Failed to synthesize audit compliance stream.' });
  }
});

export default router;
