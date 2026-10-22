/**
 * Anti-corruption layer between complianceValidationEngine.ts and the
 * agent-learning TaskPolicy mechanism, per ADR-030 §4.5. The validation
 * engine must never import agent-learning directly -- only this adapter.
 *
 * Cold-start only (Story 1.2): always resolves to "standard". Stage 1's
 * real calibration logic (Story 1.3) is blocked on ADR-030 §4.3's data
 * prerequisite (tracked as GOV-EX-001, Audit-Register.md) and is not
 * implemented here.
 */

export type ComplianceThresholdProfile = 'strict' | 'standard' | 'lenient'

export interface ComplianceCalibrationPolicyAdapter {
  resolveProfile(ruleId: string): Promise<ComplianceThresholdProfile>
}

/**
 * Cold-start implementation: deterministically returns "standard" for
 * every input, per ADR-030 §4.5's fallback requirement. Never throws --
 * any internal failure is swallowed and the safe default returned, so a
 * calibration problem can never block a compliance run.
 */
export const coldStartComplianceCalibrationAdapter: ComplianceCalibrationPolicyAdapter = {
  async resolveProfile(_ruleId: string): Promise<ComplianceThresholdProfile> {
    try {
      return 'standard'
    } catch {
      return 'standard'
    }
  }
}
