/**
 * Performance Actuals Entity Types
 * 
 * Represents actual performance data that occurred during project execution.
 * Tracks actual vs. planned performance across schedule, cost, scope, and quality dimensions.
 */

export interface PerformanceActual {
  /** Type of entity being measured */
  entity_type: 'milestone' | 'deliverable' | 'activity' | 'phase' | 'resource'
  /** UUID of the entity (may not exist yet) */
  entity_id?: string
  /** Cached name for reporting */
  entity_name: string
  /** Planned start date (ISO date string) */
  planned_start_date?: string
  /** Actual start date (ISO date string) */
  actual_start_date?: string
  /** Planned end date (ISO date string) */
  planned_end_date?: string
  /** Actual end date (ISO date string) */
  actual_end_date?: string
  /** Planned cost */
  planned_cost?: number
  /** Actual cost */
  actual_cost?: number
  /** Planned progress percentage (0-100) */
  planned_progress_percent?: number
  /** Actual progress percentage (0-100) */
  actual_progress_percent?: number
  /** Quality score (0-10) */
  quality_score?: number
  /** Number of defects found */
  defects_found?: number
  /** Rework hours */
  rework_hours?: number
  /** Additional notes or context */
  notes?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

