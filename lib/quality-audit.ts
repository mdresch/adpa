/**
 * Shared helpers for quality audit display and aggregation eligibility.
 */

export const QUALITY_AUDIT_NOT_GRADE = 'N/A'
export const QUALITY_AUDIT_NOT_LEVEL = 'Not Audited'

export type QualityAuditLike = {
  audit_performed?: boolean | null
  auditPerformed?: boolean | null
  overall_score?: number | null
  overallScore?: number | null
  ai_provider?: string | null
  ai_model?: string | null
  findings?: Record<string, string> | string | null
}

export function isQualityAuditPerformed(audit: QualityAuditLike | null | undefined): boolean {
  if (!audit) return false

  const explicit = audit.audit_performed ?? audit.auditPerformed
  if (explicit === false) return false
  if (explicit === true) return true

  if (audit.ai_provider === 'none' || audit.ai_model === 'none') return false

  const score = audit.overall_score ?? audit.overallScore
  if (score === null || score === undefined) return false

  const findings = parseFindings(audit.findings)
  const completenessFinding = findings?.completeness ?? ''
  if (
    typeof completenessFinding === 'string' &&
    (completenessFinding.includes('AI analysis unavailable') ||
      completenessFinding.includes('no audit performed'))
  ) {
    return false
  }

  return true
}

export function formatQualityScore(score: number | null | undefined): string {
  return score != null ? `${score}%` : QUALITY_AUDIT_NOT_GRADE
}

/** Dedupes concurrent auto-triggers (e.g. React Strict Mode double mount). */
const qualityAuditTriggerInFlight = new Map<string, Promise<Response>>()

export async function postQualityAuditTrigger(
  apiBaseUrl: string,
  documentId: string,
  authToken: string,
  options?: { force?: boolean; signal?: AbortSignal }
): Promise<Response> {
  const force = options?.force ?? false

  if (!force) {
    const inFlight = qualityAuditTriggerInFlight.get(documentId)
    if (inFlight) {
      return inFlight
    }
  }

  const request = fetch(`${apiBaseUrl}/quality-audits/trigger`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ documentId, force }),
    signal: options?.signal,
  }).finally(() => {
    if (!force) {
      qualityAuditTriggerInFlight.delete(documentId)
    }
  })

  if (!force) {
    qualityAuditTriggerInFlight.set(documentId, request)
  }

  return request
}

function parseFindings(
  findings: Record<string, string> | string | null | undefined
): Record<string, string> | null {
  if (!findings) return null
  if (typeof findings === 'string') {
    try {
      return JSON.parse(findings) as Record<string, string>
    } catch {
      return null
    }
  }
  return findings
}
