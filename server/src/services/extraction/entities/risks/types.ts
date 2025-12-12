/**
 * Risks Entity Types
 * 
 * Represents project risks with probability, impact, mitigation strategies, and contingency plans.
 */

export interface Risk {
  /** Risk title */
  title: string
  /** Detailed description of the risk */
  description: string
  /** Risk category */
  category: 'technical' | 'schedule' | 'budget' | 'resource' | 'external' | 'quality'
  /** Probability of occurrence */
  probability: 'high' | 'medium' | 'low'
  /** Impact if risk occurs */
  impact: 'high' | 'medium' | 'low'
  /** Mitigation strategy */
  mitigation_strategy?: string
  /** Contingency plan */
  contingency_plan?: string
  /** Risk owner */
  owner?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

