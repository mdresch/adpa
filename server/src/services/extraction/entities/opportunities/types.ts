/**
 * Opportunities Entity Types
 * 
 * Represents opportunities (positive risks) that can benefit the project.
 */

export interface Opportunity {
  /** Opportunity name/title */
  title: string
  /** Markdown description of the opportunity */
  description?: string
  /** Category (Strategic, Technical, Market, etc.) */
  category?: string
  /** Probability of occurrence */
  probability?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  /** Level of benefit if realized */
  benefit_level?: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  /** Plan to realize the opportunity */
  exploitation_strategy?: string
  /** Person or role responsible */
  owner?: string
  /** Current status of the opportunity */
  status?: 'identified' | 'planned' | 'exploiting' | 'realized' | 'missed'
  /** Expected benefit value (numeric, e.g., $200k) */
  expected_benefit?: number | null
  /** Conditions that trigger action on this opportunity */
  trigger_conditions?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

