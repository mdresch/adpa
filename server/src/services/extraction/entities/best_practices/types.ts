/**
 * Best Practices Entity Types
 * 
 * Represents best practices, lessons learned, and recommendations from project documents.
 */

export interface BestPractice {
  /** Best practice title */
  title: string
  /** Detailed description */
  description: string
  /** Category (e.g., Development, Testing, Communication) */
  category: string
  /** When/where this applies */
  applicability?: string
  /** Source reference */
  source?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

