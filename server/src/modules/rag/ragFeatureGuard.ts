/**
 * Self-healing guard: Feature 2 must not run unless Feature 1 contract passes.
 */

import { validateContextInjectionContract } from './ragContextInjection'

export interface RagFeatureGuardReport {
  feature1: boolean
  feature2Ready: boolean
  errors: string[]
  remediation: string[]
  healed: boolean
}

const REMEDIATION_HINTS = [
  'Run: npx jest --config jest.config.unit.js --testPathPattern=ragContextInjection',
  'Verify document_chunks.project_id and document_id are populated (ragService.ingestDocument).',
  'Ensure sourceDocumentIds are passed from AIGenerationJobService → documentGenerationService.',
]

export function assertFeature1Healthy(): void {
  const contract = validateContextInjectionContract()
  if (!contract.ok) {
    throw new Error(
      `Feature 1 (adpa-rag-context-injection) unhealthy: ${contract.errors.join('; ')}`
    )
  }
}

export async function runRagFeatureGuard(): Promise<RagFeatureGuardReport> {
  const contract = validateContextInjectionContract()
  const feature1 = contract.ok

  if (!feature1) {
    return {
      feature1: false,
      feature2Ready: false,
      errors: contract.errors,
      remediation: REMEDIATION_HINTS,
      healed: false,
    }
  }

  return {
    feature1: true,
    feature2Ready: true,
    errors: [],
    remediation: [],
    healed: false,
  }
}
