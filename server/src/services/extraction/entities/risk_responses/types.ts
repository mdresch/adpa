/**
 * Risk Responses Entity Types
 * 
 * Represents risk response actions taken to address project risks.
 */

export interface RiskResponse {
  /** Name of the risk being addressed */
  risk_title?: string
  /** Date when response was taken (YYYY-MM-DD) */
  response_date?: string
  /** Markdown summary of response actions */
  action_taken?: string
  /** Effectiveness of the response */
  effectiveness?: 'effective' | 'partially_effective' | 'ineffective'
  /** Cost of implementing the response */
  cost_of_response?: number | null
  /** Residual risk level after response */
  residual_risk_level?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  /** Person or role responsible */
  owner?: string
  /** Additional context */
  notes?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

