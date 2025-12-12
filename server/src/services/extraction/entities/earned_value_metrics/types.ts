/**
 * Earned Value Metrics Entity Types
 * 
 * Represents Earned Value Management (EVM) metrics for project performance tracking.
 */

export interface EarnedValueMetric {
  /** Date when metrics were measured (YYYY-MM-DD, REQUIRED) */
  measurement_date: string
  /** Planned Value (PV) - budgeted cost of work scheduled */
  planned_value?: number | null
  /** Earned Value (EV) - budgeted cost of work performed */
  earned_value?: number | null
  /** Actual Cost (AC) - actual cost of work performed */
  actual_cost?: number | null
  /** Schedule Variance (SV = EV - PV) */
  schedule_variance?: number | null
  /** Cost Variance (CV = EV - AC) */
  cost_variance?: number | null
  /** Schedule Performance Index (SPI = EV / PV) */
  schedule_performance_index?: number | null
  /** Cost Performance Index (CPI = EV / AC) */
  cost_performance_index?: number | null
  /** Estimate at Completion (EAC) */
  estimate_at_completion?: number | null
  /** Estimate to Complete (ETC) */
  estimate_to_complete?: number | null
  /** Additional notes or commentary */
  notes?: string | null
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

