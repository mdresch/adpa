/**
 * Performance Measurements Entity Types
 * 
 * Represents actual performance measurements for success criteria / KPIs.
 */

export interface PerformanceMeasurement {
  /** Name of the success criterion being measured (must match existing success criterion name) */
  success_criterion_name: string
  /** Date when measurement was taken (YYYY-MM-DD, REQUIRED) */
  measurement_date: string
  /** Actual measured value */
  actual_value?: number | null
  /** Target/planned value */
  target_value?: number | null
  /** Units of measurement (%, days, USD, etc.) */
  units?: string | null
  /** Variance between actual and target */
  variance?: number | null
  /** Variance as percentage */
  variance_percentage?: number | null
  /** Trend direction */
  trend?: 'improving' | 'stable' | 'declining' | null
  /** Status of the measurement */
  status?: 'on_track' | 'at_risk' | 'off_track'
  /** Additional notes or context */
  notes?: string | null
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

