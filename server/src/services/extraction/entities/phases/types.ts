/**
 * Phases Entity Types
 * 
 * Represents project phases (Initiation, Planning, Execution, Monitoring, Closing, etc.).
 */

export interface Phase {
  /** Phase name */
  name: string
  /** What happens in this phase */
  description: string
  /** Start date (YYYY-MM-DD or relative date) */
  start_date?: string
  /** End date (YYYY-MM-DD or relative date) */
  end_date?: string
  /** Current status */
  status: 'planned' | 'active' | 'completed' | 'on_hold'
  /** Deliverables for this phase */
  deliverables?: string[]
  /** Key activities in this phase */
  key_activities?: string[]
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

