/**
 * Stakeholders Entity Types
 * 
 * Represents project stakeholders with their roles, interest, influence, and expectations.
 */

export interface Stakeholder {
  /** Stakeholder name or role */
  name: string
  /** Their role in the project */
  role: string
  /** Email address (optional) */
  email?: string
  /** Interest level in the project */
  interest_level: 'high' | 'medium' | 'low'
  /** Influence level on the project */
  influence_level: 'high' | 'medium' | 'low'
  /** Communication preference */
  communication_preference?: string
  /** What they expect from the project */
  expectations?: string
  /** Any concerns they have */
  concerns?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

