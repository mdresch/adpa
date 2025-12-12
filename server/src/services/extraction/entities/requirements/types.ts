/**
 * Requirements Entity Types
 * 
 * Represents project requirements including functional, non-functional, business, and technical requirements.
 */

export interface Requirement {
  /** Requirement title */
  title: string
  /** Detailed description */
  description: string
  /** Requirement type */
  type: 'functional' | 'non-functional' | 'business' | 'technical'
  /** Priority level */
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** Current status */
  status: 'proposed' | 'approved' | 'in_progress' | 'completed' | 'deferred'
  /** Acceptance criteria (string or array) */
  acceptance_criteria?: string | string[]
  /** Source reference */
  source?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

