/**
 * Constraints Entity Types
 * 
 * Represents project constraints including budget, time, resource, technical, and regulatory constraints.
 */

export interface Constraint {
  /** Constraint title */
  title: string
  /** Detailed description */
  description: string
  /** Constraint type */
  type: 'scope' | 'time' | 'cost' | 'quality' | 'resource' | 'technical' | 'regulatory'
  /** Severity level */
  severity?: 'high' | 'medium' | 'low'
  /** Which area of the project is affected */
  impact_area?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

