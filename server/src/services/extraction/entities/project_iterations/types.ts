/**
 * Project Iterations Entity Types
 * 
 * Represents project iterations, sprints, releases, and program increments.
 */

export interface ProjectIteration {
  /** Iteration / Sprint name */
  name: string
  /** Iteration type */
  iteration_type?: 'sprint' | 'iteration' | 'program_increment' | 'release' | 'phase'
  /** Sequence number */
  sequence_number?: number
  /** Start date (YYYY-MM-DD or null) */
  start_date?: string
  /** End date (YYYY-MM-DD or null) */
  end_date?: string
  /** Goals array */
  goals?: string[]
  /** Planned story points */
  planned_story_points?: number
  /** Completed story points */
  completed_story_points?: number
  /** Velocity */
  velocity?: number
  /** Status */
  status?: 'planned' | 'active' | 'completed' | 'cancelled'
  /** Retrospective summary */
  retrospective_summary?: string
  /** Impediments array */
  impediments?: string[]
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

