import db from '../src/lib/db';
import { v4 as uuidv4 } from 'uuid';

async function seedGovernanceData() {
  console.log('🌱 Seeding sample governance audit data...');
  
  try {
    await db.initDb();

    // 1. A PENDING Draco Candidate (Unanimous)
    await db.query(`
      INSERT INTO governance_audit_ledger (
        audit_id, rule_code, document_type, event_type, decision_status, consensus_achieved,
        evidence_validation_report, purist_verdict, realist_verdict, arbitrator_verdict,
        final_patch_payload, template_gate_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      uuidv4(),
      'CTRL-SEC-AUTH-01',
      'TECHNICAL_SPEC',
      'DRACO_CANDIDATE',
      'PENDING',
      true,
      JSON.stringify({ isValid: true, findings: 'Telemetry signatures verified. No tampering detected.', confidenceScore: 98 }),
      JSON.stringify({ approved: true, rationale: 'The current auth prompt allows legacy MD5 hashing. This violates ISO27001 Annex A. Proposed fix enforces SHA-256.' }),
      JSON.stringify({ approved: true, rationale: 'MD5 is causing build warnings in the latest security scanner. Upgrading is better for maintenance velocity.' }),
      JSON.stringify({ approved: true, rationale: 'Synthesizing: Enforce SHA-256 for all new tokens while maintaining 30-day backward compatibility for existing sessions.', proposedDescriptionUpdate: 'Enforce mandatory SHA-256 token hashing for all generation blocks. Maintain fallback for session-id v2.' }),
      JSON.stringify({ description: 'Enforce mandatory SHA-256 token hashing for all generation blocks. Maintain fallback for session-id v2.', thresholds: '85%' }),
      JSON.stringify({ minimumRequiredScore: 95, mandatoryKeywords: ['SHA-256', 'ISO27001'] })
    ]);

    // 2. A PENDING Council Deadlock (Dissent)
    await db.query(`
      INSERT INTO governance_audit_ledger (
        audit_id, rule_code, document_type, event_type, decision_status, consensus_achieved,
        evidence_validation_report, purist_verdict, realist_verdict, arbitrator_verdict,
        final_patch_payload, template_gate_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      uuidv4(),
      'CTRL-OPS-PERF-05',
      'OPERATIONAL_PLAYBOOK',
      'COUNCIL_DEADLOCK',
      'PENDING',
      false,
      JSON.stringify({ isValid: true, findings: 'Performance logs authentic.', confidenceScore: 92 }),
      JSON.stringify({ approved: false, rationale: 'The proposed "Fast Path" skips the mandatory impact assessment validation. I VETO this as it violates COBIT MEA01.' }),
      JSON.stringify({ approved: true, rationale: 'Impact assessments take 4 minutes per run. This is killing dev velocity. We need the async skip.' }),
      JSON.stringify({ approved: true, rationale: 'Arbitrator proposes async validation: Run document generation and assessment in parallel, but flag as "DRAFT" until validation clears.' }),
      null,
      JSON.stringify({ minimumRequiredScore: 70, mandatoryKeywords: ['VELOCITY'] })
    ]);

    // 3. A Data Integrity Failure
    await db.query(`
      INSERT INTO governance_audit_ledger (
        audit_id, rule_code, document_type, event_type, decision_status, consensus_achieved,
        evidence_validation_report, purist_verdict, realist_verdict, arbitrator_verdict,
        final_patch_payload, template_gate_context
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      uuidv4(),
      'CTRL-SYS-LOG-09',
      'STRATEGIC_CHARTER',
      'DATA_INTEGRITY_FAILURE',
      'PENDING',
      false,
      JSON.stringify({ isValid: false, findings: 'CRITICAL: Historical drift data contains non-sequential timestamps and NaN override rates. Potential database corruption or tampering.', confidenceScore: 12 }),
      JSON.stringify({}),
      JSON.stringify({}),
      JSON.stringify({}),
      null,
      JSON.stringify({ minimumRequiredScore: 80 })
    ]);

    // 4. An APPROVED Candidate (History)
    await db.query(`
      INSERT INTO governance_audit_ledger (
        audit_id, rule_code, document_type, event_type, decision_status, consensus_achieved,
        evidence_validation_report, purist_verdict, realist_verdict, arbitrator_verdict,
        final_patch_payload, template_gate_context, reviewed_by, resolved_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      uuidv4(),
      'CTRL-QA-GATES-02',
      'TECHNICAL_SPEC',
      'DRACO_CANDIDATE',
      'APPROVED',
      true,
      JSON.stringify({ isValid: true, findings: 'Verified.', confidenceScore: 100 }),
      JSON.stringify({ approved: true, rationale: 'Approved.' }),
      JSON.stringify({ approved: true, rationale: 'Approved.' }),
      JSON.stringify({ approved: true, rationale: 'Approved.', proposedDescriptionUpdate: 'Updated QA Gate Thresholds for v3 components.' }),
      JSON.stringify({ description: 'Updated QA Gate Thresholds for v3 components.' }),
      JSON.stringify({ minimumRequiredScore: 90 }),
      'Marcus Vance',
      new Date().toISOString()
    ]);

    console.log('✅ Successfully seeded 4 governance audit records.');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
  } finally {
    await db.end();
  }
}

seedGovernanceData();
