import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { unifiedPdfService } from '../../services/pdfService';

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
import fs from 'fs';
const DEBUG_LOG = '../../logs/adjudication_debug.log';

const logDebug = (msg: string) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(path.resolve(__dirname, DEBUG_LOG), line);
  console.log(msg);
};

router.post('/ledger/:auditId/adjudicate', async (req: Request, res: Response) => {
  const { auditId } = req.params;
  logger.info(`🔥 START Adjudication for audit: ${auditId}`);

  try {
    logger.info(`📦 Body: ${JSON.stringify(req.body)}`);
    const body = CouncilAdjudicationSchema.parse(req.body);
    logger.info('✅ Body parsed');
    
    // 1. Fetch the audit record to ensure it exists and is PENDING
    logger.info('🔍 Querying audit ledger...');
    const auditRes = await pool.query('SELECT * FROM governance_audit_ledger WHERE audit_id = $1', [auditId]);
    
    if (auditRes.rows.length === 0) {
      logger.info('❌ Audit record not found');
      return res.status(404).json({ error: 'Audit record not found' });
    }

    const auditRecord = auditRes.rows[0];
    logger.info(`📄 Record found. Status: ${auditRecord.decision_status}`);

    if (auditRecord.decision_status !== 'PENDING') {
      logger.warn(`⚠️ Record already resolved as ${auditRecord.decision_status}`);
      return res.status(400).json({ error: `Record already resolved as ${auditRecord.decision_status}` });
    }

    if (body.action === 'REJECT') {
      logger.info('⛔ Processing REJECTION...');
      await pool.query(`
        UPDATE governance_audit_ledger
        SET 
          decision_status = 'REJECTED',
          reviewed_by = $1,
          resolved_at = NOW(),
          arbitrator_verdict = arbitrator_verdict || jsonb_build_object('human_override_notes', $2::text)
        WHERE audit_id = $3
      `, [body.auditorId, body.overrideRationale, auditId]);

      logger.info('✅ REJECTED updated in DB');
      return res.json({ status: 'REJECTED', auditId });
    }

    // Logic for APPROVE: Execute atomic promotion to policy_library
    logger.info('🟢 Processing APPROVAL...');
    const client = await pool.connect();
    logger.info('🔌 DB Client acquired');

    try {
      logger.info('⚡ BEGIN Transaction');
      await client.query('BEGIN');

      // A. Update the ledger status
      logger.info('📝 Updating ledger to APPROVED');
      await client.query(`
        UPDATE governance_audit_ledger
        SET 
          decision_status = 'APPROVED',
          reviewed_by = $1,
          resolved_at = NOW(),
          arbitrator_verdict = arbitrator_verdict || jsonb_build_object('human_override_notes', $2::text)
        WHERE audit_id = $3
      `, [body.auditorId, body.overrideRationale, auditId]);

      // B. Promote the patch to policy_library
      let description = auditRecord.final_patch_payload?.description;
      let thresholds = auditRecord.final_patch_payload?.thresholds;
      
      if (!description && auditRecord.arbitrator_verdict?.proposedDescriptionUpdate) {
        logger.info('💡 Fallback: Using Arbitrator description');
        description = auditRecord.arbitrator_verdict.proposedDescriptionUpdate;
      }

      if (!thresholds && auditRecord.arbitrator_verdict?.proposedThresholdAdjustment) {
        logger.info('💡 Fallback: Using Arbitrator threshold');
        thresholds = auditRecord.arbitrator_verdict.proposedThresholdAdjustment;
      }

      if (!description) {
        throw new Error(`Critical: No valid patch description found for promotion on audit ${auditId}.`);
      }

      logger.info(`🚀 Promoting rule: ${auditRecord.rule_code}`);
      
      const policyUpdate = await client.query(`
        UPDATE policy_library
        SET 
          description = $1,
          control_effectiveness_status = 'PARTIALLY_EFFECTIVE',
          updated_at = NOW()
        WHERE rule_code = $2
        RETURNING rule_code
      `, [description, auditRecord.rule_code]);

      if (policyUpdate.rows.length === 0) {
        throw new Error(`Critical: Rule code ${auditRecord.rule_code} not found in policy_library.`);
      }

      // C. Optional: Promote threshold adjustments into execution_schema
      if (thresholds) {
        logger.info('🧬 Injecting threshold adjustments');
        await client.query(`
          UPDATE policy_library
          SET execution_schema = COALESCE(execution_schema, '{}'::jsonb) || jsonb_build_object(
            'dampening_notes', $1::text,
            'last_adjudication_id', $2::text
          )
          WHERE rule_code = $3
        `, [thresholds, auditId, auditRecord.rule_code]);
      }

      logger.info('🏁 COMMIT Transaction');
      await client.query('COMMIT');
      logger.info('🏆 Transaction SUCCESSFUL');
      
      res.json({ status: 'APPROVED', auditId, ruleCode: auditRecord.rule_code });

    } catch (txError: any) {
      logger.error(`💥 Transaction FAILED: ${txError.message}`, txError);
      await client.query('ROLLBACK');
      throw txError;
    } finally {
      client.release();
      logger.info('🔌 Client released');
    }

  } catch (error: any) {
    logger.error(`💀 FATAL EXCEPTION: ${error.message}`, error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation Failed', details: error.errors });
    }
    
    res.status(500).json({ 
      error: 'Internal Server Error during adjudication', 
      details: error.message,
      stack: error.stack
    });
  }
});

/**
 * GET /api/v1/governance/ledger/:auditId/export
 * Generates a structured plain-text compliance manifest for the adversarial tribunal.
 */
router.get('/ledger/:auditId/export', async (req: Request, res: Response) => {
  const { auditId } = req.params;
  
  try {
    // 1. Ingest the deep forensic row from the active Postgres ledger pool
    const result = await pool.query('SELECT * FROM governance_audit_ledger WHERE audit_id = $1', [auditId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Audit record not found inside ledger registry.' });
    }

    const audit = result.rows[0];

    // 2. Format a high-density, regulator-ready compliance layout string
    const reportContent = `
================================================================================
🏛️ ADPA FORENSIC RUNTIME COMPLIANCE REPORT
================================================================================
Generated On: ${new Date().toISOString().split('T')[0]}
System Status: CONSTITUTIONAL_AUDIT_LOG_ENTRY

[1. PRIMARY IDENTIFIER DATA]
- Audit Event ID:     ${audit.audit_id}
- Bound Rule Code:    ${audit.rule_code}
- Target Asset Tier:  ${audit.document_type || 'TECHNICAL_SPEC'}
- Internal Event Type: ${audit.event_type}
- Decision Status:    ${audit.decision_status}

[2. LAYER 1: EVIDENCE VALIDATOR VERDICT]
- Validation Findings:
  "${audit.evidence_validation_report?.findings || 'No validation text captured.'}"

[3. ADVERSARIAL POOL DISCREPANCIES]
- Regulatory Purist Verdict:
  "${audit.purist_verdict?.rationale || 'Dissent brief omitted or short-circuited.'}"
  
- Operational Realist Verdict:
  "${audit.realist_verdict?.rationale || 'Velocity brief omitted or short-circuited.'}"

[4. PROPOSED POLICY PROMOTION PATCH]
- Arbitrator Resolution Payload:
  "${audit.arbitrator_verdict?.proposedDescriptionUpdate || 'NO PATCH PAYLOAD GENERATED - MANUAL INTERVENTION REQUIRED.'}"

================================================================================
END OF FORENSIC LOG RECORD // ADPA GOVERNANCE SYSTEM COMPLIANCE RETENTION CORE
================================================================================
`;

    // 3. Switch the download headers from a faux binary PDF over to a clean Text Attachment
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ADPA_COMPLIANCE_REPORT_${audit.rule_code}_${auditId.split('-')[0]}.txt"`);

    // 4. Flush the complete text string layout cleanly down the response channel
    return res.status(200).send(reportContent);

  } catch (err) {
    logger.error('Exception generated processing compliance export stream:', err);
    return res.status(500).json({ error: 'Failed to synthesize audit compliance manifest stream.' });
  }
});

export default router;
