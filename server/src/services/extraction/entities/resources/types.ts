/**
 * Resources Entity Types
 * 
 * Represents project resources including human resources, equipment, materials, and financial resources.
 */

export interface Resource {
  /** Resource name or role */
  name: string
  /** Resource type */
  type: 'human' | 'equipment' | 'material' | 'financial' | 'software' | 'facility' | 'budget'
  /** Their role (for human resources) */
  role?: string
  /** Allocation (Full-time, Part-time, or percentage) */
  allocation?: string
  /** Availability (when they are available) */
  availability?: string
  /** Cost */
  cost?: number
  /** Skills array */
  skills?: string[]
  /** Competency level */
  competency_level?: 'junior' | 'intermediate' | 'senior' | 'expert'
  /** Certifications array */
  certifications?: string[]
  /** Training needs array */
  training_needs?: string[]
  /** Team assignment */
  team_assignment?: string
  /** Performance rating (0-10) */
  performance_rating?: number
  /** Development plan */
  development_plan?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

