/**
 * Activities Entity Types
 * 
 * Represents project activities, tasks, and work packages with timelines, assignments, and dependencies.
 */

export interface Activity {
  /** Activity name */
  name: string
  /** What this activity involves */
  description: string
  /** Category (development, testing, planning, etc.) */
  category?: string
  /** Which phase it belongs to */
  phase?: string
  /** Start date (YYYY-MM-DD or relative date) */
  start_date?: string
  /** End date (YYYY-MM-DD or relative date) */
  end_date?: string
  /** Duration value */
  duration?: number
  /** Duration unit */
  duration_unit?: 'days' | 'weeks' | 'months'
  /** Current status */
  status: 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
  /** Who is responsible */
  assigned_to?: string
  /** Dependencies (other activities) */
  dependencies?: string[]
  /** Related deliverable */
  deliverable?: string
  /** Effort estimate value */
  effort_estimate?: number
  /** Effort unit */
  effort_unit?: 'hours' | 'days' | 'story_points'
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

