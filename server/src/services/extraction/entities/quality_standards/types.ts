/**
 * Quality Standards Entity Types
 * 
 * Represents quality standards and requirements including ISO, PMBOK, internal, industry, and regulatory standards.
 */

export interface QualityStandard {
  /** Standard title */
  title: string
  /** What this standard requires */
  description: string
  /** Category */
  category: 'process' | 'product' | 'performance' | 'compliance'
  /** Standard type */
  standard_type: 'ISO' | 'PMBOK' | 'internal' | 'industry' | 'regulatory' | 'other'
  /** Specific requirements */
  requirements?: string
  /** How compliance is measured */
  measurement_criteria?: string
  /** Compliance level */
  compliance_level?: 'mandatory' | 'recommended' | 'optional'
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

