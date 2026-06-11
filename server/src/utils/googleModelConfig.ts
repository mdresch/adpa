export const GOOGLE_PRIMARY_MODEL = 'gemini-2.5-flash'
export const GOOGLE_LOW_COST_MODEL = 'gemini-3.1-flash-lite'
/** Quality audits: separate quota pool from doc-gen (2.5 Flash) */
export const GOOGLE_QUALITY_AUDIT_MODEL = GOOGLE_LOW_COST_MODEL

export function getQualityAuditGoogleModel(): string {
  const envOverride = process.env.QUALITY_AUDIT_GOOGLE_MODEL?.trim()
  if (envOverride) {
    return normalizeGoogleModelId(envOverride)
  }
  return GOOGLE_QUALITY_AUDIT_MODEL
}

export const GOOGLE_SUPPORTED_MODELS = [
  GOOGLE_PRIMARY_MODEL,
  GOOGLE_LOW_COST_MODEL,
  'gemini-2.5-flash-lite',
  'gemini-1.5-pro-latest',
  'gemini-2.0-flash-exp',
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.1-flash-live-preview'
]

const GOOGLE_MODEL_ALIASES: Record<string, string> = {
  'gemini-pro': GOOGLE_PRIMARY_MODEL,
  'gemini-pro-vision': GOOGLE_PRIMARY_MODEL,
  'gemini-1.0-pro': GOOGLE_PRIMARY_MODEL,
  'gemini-1.0-pro-vision': GOOGLE_PRIMARY_MODEL,
  'gemini-1.5-flash': GOOGLE_PRIMARY_MODEL,
  'gemini-flash-latest': GOOGLE_PRIMARY_MODEL,
  'gemini-pro-latest': GOOGLE_PRIMARY_MODEL,
  'gemini-1.5-flash-latest': GOOGLE_PRIMARY_MODEL,
  'gemini-1.5-pro': 'gemini-1.5-pro-latest',
  'gemini-2.5-flash': GOOGLE_PRIMARY_MODEL,
  'gemini-3.1-flash-lite': GOOGLE_LOW_COST_MODEL,
  'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
  'gemini-3-flash-preview': 'gemini-3-flash-preview',
  'gemini-3.5-flash': 'gemini-3.5-flash',
  'gemini-3-flash': 'gemini-3-flash-preview',
  'gemini-3.1-flash-live-preview': 'gemini-3.1-flash-live-preview'
}

export function normalizeGoogleModelId(model?: string): string {
  if (!model) {
    return GOOGLE_PRIMARY_MODEL
  }

  const normalized = GOOGLE_MODEL_ALIASES[model] || model

  if (GOOGLE_SUPPORTED_MODELS.includes(normalized)) {
    return normalized
  }

  return GOOGLE_PRIMARY_MODEL
}
