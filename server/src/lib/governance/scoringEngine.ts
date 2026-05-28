export interface TelemetryMetrics {
  userOverrideCount: number;
  totalInvocations: number;
  successfulPatches: number;
  averageComplianceScore: number;
}

export interface ScoringResult {
  score: number;
  overrideRate: number;
  patchSuccessRate: number;
}

export function calculateEffectiveness(metrics: TelemetryMetrics): ScoringResult {
  const { userOverrideCount, totalInvocations, successfulPatches, averageComplianceScore } = metrics;

  // Cold Start Guard
  if (totalInvocations === 0) {
    return { score: 1.000, overrideRate: 0, patchSuccessRate: 1.000 };
  }

  const overrideRate = userOverrideCount / totalInvocations;

  // Remediation Success Guard
  const patchSuccessRate = userOverrideCount === 0 
    ? 1.000 
    : Math.min(successfulPatches / userOverrideCount, 1.000);

  // Weights formalization (COBIT 2019 aligned)
  const w1 = 0.4; // Weight of operational alignment (User acceptance)
  const w2 = 0.3; // Weight of autonomous remediation (Patch effectiveness)
  const w3 = 0.3; // Weight of structural quality (AI Auditor evaluation)

  let rawScore = w1 * (1 - overrideRate) + w2 * patchSuccessRate + w3 * averageComplianceScore;
  
  // Low-Sample Dampening Factor (< 5 Invocations)
  if (totalInvocations < 5) {
    const baselineMaturity = 0.85; 
    const confidenceWeight = totalInvocations / 5;
    rawScore = (rawScore * confidenceWeight) + (baselineMaturity * (1 - confidenceWeight));
  }

  return {
    score: Number(Math.max(0, Math.min(rawScore, 1)).toFixed(3)),
    overrideRate: Number(overrideRate.toFixed(4)),
    patchSuccessRate: Number(patchSuccessRate.toFixed(4))
  };
}

export function classifyEffectiveness(score: number): "HIGHLY_EFFECTIVE" | "EFFECTIVE" | "PARTIALLY_EFFECTIVE" | "INEFFECTIVE" {
  if (score >= 0.90) return "HIGHLY_EFFECTIVE";
  if (score >= 0.75) return "EFFECTIVE";
  if (score >= 0.60) return "PARTIALLY_EFFECTIVE";
  return "INEFFECTIVE";
}
