import { z } from 'zod';
import { unifiedAIService } from '../unifiedAIService';
import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';

/**
 * Draco Agent Verdict Schema
 * Enforces a strict, typed structure for the debating personas.
 */
export const DracoAgentVerdictSchema = z.object({
  approved: z.boolean().describe("Set to true ONLY if the proposed compromise fully satisfies your core philosophical directive."),
  rationale: z.string().describe("Detail your precise argument, citing telemetry drift or framework rules."),
  proposedDescriptionUpdate: z.string().describe("Your specific textual revision to the governance control prompt."),
  proposedThresholdAdjustment: z.string().describe("Mathematical or parameter adjustment to low-sample dampening filters.")
});

export type DracoAgentVerdict = z.infer<typeof DracoAgentVerdictSchema>;

/**
 * Evidence Validator Schema
 * Agent 4: Data Sanity Check (Precondition Gate)
 */
export const EvidenceValidatorSchema = z.object({
  isValid: z.boolean().describe("True if the provided telemetry and trend data is consistent and uncorrupted."),
  findings: z.string().describe("Details of any data anomalies or a clean bill of health."),
  confidenceScore: z.number().min(0).max(100).describe("Confidence in the data integrity.")
});

export type EvidenceValidatorVerdict = z.infer<typeof EvidenceValidatorSchema>;

export interface DebateOutcome {
  consensusAchieved: boolean;
  finalStatus: 'DRACO_CANDIDATE' | 'COUNCIL_DEADLOCK' | 'DATA_INTEGRITY_FAILURE';
  patchPayload: {
    description: string;
    thresholds: string;
  } | null;
  auditId: string;
}

/**
 * Draco Debate Engine
 * 
 * Orchestrates a deterministic 4-agent tribunal.
 * Layer 1: Data Integrity Precondition Gate
 * Layer 2: 3-Agent Adversarial Debate
 */
export async function executeDracoDebate(
  ruleCode: string,
  documentType: string,
  templateGates: { minimumRequiredScore: number; mandatoryKeywords: string[] },
  trendData: any,
  failureLogs: any
): Promise<DebateOutcome> {
  logger.info(`[DRACO-DEBATE] Initiating governance tribunal for rule: ${ruleCode}`, { documentType });

  const contextPayload = {
    ruleCode,
    documentType,
    qualityGates: templateGates,
    historicalTrend: trendData,
    recentErrors: failureLogs
  };

  const contextString = JSON.stringify(contextPayload, null, 2);

  // ─── STEP 1: EXECUTE THE EVIDENCE VALIDATOR PRECONDITION GATE ─────────────────
  const validatorPrompt = `You are the ADPA Evidence Validator. Your job is to perform a strict Data Sanity Check.
Context: ${contextString}
Cross-reference the provided historicalTrend and recentErrors against the known schema for ${ruleCode}. 
Reject if: Missing fields, inconsistent timestamps, or schema mismatches. 
Your approval is a hard prerequisite. If you report isValid: false, the debate is aborted.`;

  const validatorRes = await unifiedAIService.generateStructuredObject({
    prompt: validatorPrompt,
    provider: 'default',
    schema: EvidenceValidatorSchema,
    traceName: 'draco-evidence-validator'
  });

  const validatorVerdict = validatorRes.object as EvidenceValidatorVerdict;

  if (!validatorVerdict.isValid) {
    logger.error(`[DRACO-DEBATE] 🛑 DATA INTEGRITY FAILURE for ${ruleCode}. Aborting debate.`, { validatorVerdict });
    
    const auditId = await logLedgerEntry(
      ruleCode, 
      documentType, 
      'DATA_INTEGRITY_FAILURE', 
      false, 
      null, 
      validatorVerdict, 
      null, 
      null, 
      null, 
      templateGates
    );

    return {
      consensusAchieved: false,
      finalStatus: 'DATA_INTEGRITY_FAILURE',
      patchPayload: null,
      auditId
    };
  }

  // ─── STEP 2: ORCHESTRATE ADVERSARIAL DEBATE (ONLY RUNS IF DATA IS VALID) ──────
  
  // Persona Bias Calibration
  const puristBias = documentType === 'TECHNICAL_SPEC' 
    ? "This is a TECHNICAL_SPEC; you must be uncompromising on structural standards. Veto power: PURIST." 
    : "Even for operational docs, security is non-negotiable.";
  
  const realistBias = documentType === 'OPERATIONAL_PLAYBOOK'
    ? "This is an OPERATIONAL_PLAYBOOK; any friction here directly blocks the business. Fight for simplicity."
    : "Complexity in specs leads to implementation bugs. Argue for leaner logic.";

  // Agent Prompts
  const puristPrompt = `You are the ADPA Regulatory Purist. Your bias is zero-tolerance, literal enforcement of COBIT 2019 (specifically MEA01/DSS05) and ISO 27001 boundaries. 
Context: ${contextString}
${puristBias}
You look for structural gaps. Do not agree to text updates that relax security postures unless a perfect mitigating technical control is provided.`;

  const realistPrompt = `You are the ADPA Operational Realist. Your bias is developer velocity, system performance, and reducing operational friction. 
Context: ${contextString}
${realistBias}
You analyze the 30-day historical drift data. If this rule causes excessive user overrides, you argue it is broken code.`;

  const arbitratorPrompt = `You are the Governance Arbitrator. You are objective, running on a high-context window. 
Context: ${contextString}
Read the conflict between the Purist and the Realist, analyze the telemetry, and draft a textual compromise.
Protect organizational safety without causing developer lockout loops. Ensure your proposal aligns with ${documentType} requirements.`;

  try {
    const [puristRes, realistRes, arbitratorRes] = await Promise.all([
      unifiedAIService.generateStructuredObject({
        prompt: puristPrompt,
        provider: 'default',
        schema: DracoAgentVerdictSchema,
        traceName: 'draco-debate-purist'
      }),
      unifiedAIService.generateStructuredObject({
        prompt: realistPrompt,
        provider: 'default',
        schema: DracoAgentVerdictSchema,
        traceName: 'draco-debate-realist'
      }),
      unifiedAIService.generateStructuredObject({
        prompt: arbitratorPrompt,
        provider: 'default',
        schema: DracoAgentVerdictSchema,
        traceName: 'draco-debate-arbitrator'
      })
    ]);

    const puristVerdict = puristRes.object as DracoAgentVerdict;
    const realistVerdict = realistRes.object as DracoAgentVerdict;
    const arbitratorVerdict = arbitratorRes.object as DracoAgentVerdict;

    // Strict 3/3 Unanimity Gate
    const consensusAchieved = puristVerdict.approved && realistVerdict.approved && arbitratorVerdict.approved;
    const finalStatus = consensusAchieved ? 'DRACO_CANDIDATE' : 'COUNCIL_DEADLOCK';
    
    const patchPayload = consensusAchieved ? {
      description: arbitratorVerdict.proposedDescriptionUpdate,
      thresholds: arbitratorVerdict.proposedThresholdAdjustment
    } : null;

    const auditId = await logLedgerEntry(
      ruleCode,
      documentType,
      finalStatus,
      consensusAchieved,
      patchPayload,
      validatorVerdict,
      puristVerdict,
      realistVerdict,
      arbitratorVerdict,
      templateGates
    );

    if (consensusAchieved) {
      logger.info(`[DRACO-DEBATE] ✅ Unanimous consensus achieved for ${ruleCode}. Candidate patch recorded.`, { auditId });
    } else {
      logger.warn(`[DRACO-DEBATE] ❌ Council Deadlocked for ${ruleCode}. Human intervention required.`, { auditId });
    }

    return {
      consensusAchieved,
      finalStatus,
      patchPayload,
      auditId
    };

  } catch (error) {
    logger.error(`[DRACO-DEBATE] Tribunal execution failed for ${ruleCode}`, error);
    throw error;
  }
}

async function logLedgerEntry(
  ruleCode: string, 
  docType: string, 
  status: string, 
  consensus: boolean, 
  patch: any, 
  val: any, 
  p: any, 
  r: any, 
  a: any, 
  gates: any
): Promise<string> {
  const auditRes = await pool.query(`
    INSERT INTO governance_audit_ledger (
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
      template_gate_context
    ) VALUES ($1, $2, $3, 'PENDING', $4, $5, $6, $7, $8, $9, $10)
    RETURNING audit_id
  `, [
    ruleCode,
    docType,
    status,
    consensus,
    JSON.stringify(val),
    p ? JSON.stringify(p) : '{}',
    r ? JSON.stringify(r) : '{}',
    a ? JSON.stringify(a) : '{}',
    patch ? JSON.stringify(patch) : null,
    JSON.stringify(gates)
  ]);

  return auditRes.rows[0].audit_id;
}
