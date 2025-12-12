/**
 * Team Agreements Entity Types
 * 
 * Represents team agreements aligned with PMBOK 8 Team Performance Domain.
 */

export interface TeamAgreement {
  /** Agreement title */
  title: string
  /** Summary of the agreement in Markdown */
  description?: string
  /** Category */
  category:
    | 'working_hours'
    | 'communication'
    | 'decision_making'
    | 'conflict_resolution'
    | 'quality_standards'
    | 'meeting_norms'
    | 'code_of_conduct'
    | 'collaboration_tools'
    | 'response_times'
    | 'knowledge_sharing'
    | 'other'
  /** Who agreed to this */
  agreed_by?: string[]
  /** Who facilitated this agreement */
  facilitated_by?: string
  /** Effective date (YYYY-MM-DD or null) */
  effective_date?: string
  /** Review frequency */
  review_frequency?: 'weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed' | null
  /** Next review date (YYYY-MM-DD or null) */
  next_review_date?: string
  /** Status */
  status?: 'draft' | 'active' | 'under_review' | 'revised' | 'deprecated'
  /** Adherence score (0-10) */
  adherence_score?: number
  /** Violations count */
  violations_count?: number
  /** Last violation date (YYYY-MM-DD or null) */
  last_violation_date?: string
  /** Additional context */
  notes?: string
  /** Source document title (for resolution) */
  source_document?: string
  /** Resolved source document ID */
  source_document_id?: string
}

