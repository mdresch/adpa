/**
 * Deliverables Entity Types
 * 
 * Represents project deliverables including documents, software, hardware, services, and reports.
 */

export interface Deliverable {
  /** Deliverable name */
  name: string
  /** What this deliverable is */
  description: string
  /** Deliverable type */
  type: 'document' | 'software' | 'hardware' | 'service' | 'report' | 'other'
  /** Due date (YYYY-MM-DD or relative date) */
  due_date?: string
  /** Current status */
  status: 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  /** Who is responsible */
  owner?: string
  /** Dependencies (other deliverables) */
  dependencies?: string[]
  /** Acceptance criteria */
  acceptance_criteria?: string
  /** Which phase it belongs to */
  phase?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

