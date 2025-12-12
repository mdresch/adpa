/**
 * Success Criteria Entity Types
 * 
 * Represents project success criteria, KPIs, acceptance criteria, and quality gates.
 */

export interface SuccessCriterion {
  /** Success criterion title */
  title: string
  /** What defines success */
  description: string
  /** The measurable metric */
  metric: string
  /** The target value to achieve */
  target_value: string
  /** How this will be measured */
  measurement_method: string
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

