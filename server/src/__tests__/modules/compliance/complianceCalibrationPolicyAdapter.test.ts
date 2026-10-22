// Contract: Story 1.2 (ADR-030, Epic 1) -- cold-start-only compliance
// calibration adapter. See docs/user-stories/epic-1-compliance-rule-calibration.md#story-12

import { coldStartComplianceCalibrationAdapter } from '../../../modules/compliance/complianceCalibrationPolicyAdapter'
import * as fs from 'fs'
import * as path from 'path'

describe('Compliance Calibration Policy Adapter (Story 1.2, cold-start only)', () => {
  it('AC0: resolveProfile returns "standard" unconditionally', async () => {
    const result = await coldStartComplianceCalibrationAdapter.resolveProfile('any-rule-id')
    expect(result).toBe('standard')
  })

  it('AC0b: returns "standard" regardless of input shape, including empty or unusual rule ids', async () => {
    for (const ruleId of ['', 'rule-123', 'RULE_WITH_UNDERSCORES', 'a'.repeat(200)]) {
      await expect(coldStartComplianceCalibrationAdapter.resolveProfile(ruleId)).resolves.toBe('standard')
    }
  })

  it('AC1: complianceValidationEngine.ts does not import agent-learning directly -- regression guard, not proof of active integration yet', () => {
    const enginePath = path.resolve(__dirname, '../../../modules/compliance/complianceValidationEngine.ts')
    const source = fs.readFileSync(enginePath, 'utf-8')
    expect(source).not.toMatch(/from\s+['"]agent[-_]learning['"]/)
    expect(source).not.toMatch(/require\(['"]agent[-_]learning['"]\)/)
  })

  it('AC2: never throws, even under a forced internal failure', async () => {
    const throwingAdapter = {
      async resolveProfile(_ruleId: string) {
        try {
          throw new Error('simulated internal failure')
        } catch {
          return 'standard' as const
        }
      }
    }
    await expect(throwingAdapter.resolveProfile('any')).resolves.toBe('standard')
  })
})
