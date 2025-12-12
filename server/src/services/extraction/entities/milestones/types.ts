/**
 * Milestones Entity Types
 * 
 * Represents project milestones - zero-duration checkpoints marking completion of major deliverables or phases.
 */

export interface Milestone {
  /** Milestone name */
  name: string
  /** What this milestone represents (major checkpoint or deliverable completion) */
  description: string
  /** Due date (YYYY-MM-DD or Quarter/Year) */
  due_date: string
  /** Current status */
  status: 'pending' | 'in_progress' | 'completed' | 'delayed'
  /** Deliverables associated with this milestone */
  deliverables?: string[]
  /** Dependencies (other milestones) */
  dependencies?: string[]
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

