/**
 * Knowledge Base Module Types
 * Defines TypeScript interfaces and types for knowledge base functionality
 */

export type EntryType =
  | 'efficiency_improvement'
  | 'cost_reduction'
  | 'timeline_acceleration'
  | 'quality_improvement'
  | 'innovation'
  | 'best_practice'
  | 'lessons_learned'
  | 'process_improvement'
  | 'technology_innovation'
  | 'methodology_advancement'

export type EntryCategory =
  | 'scope_management'
  | 'technical_approach'
  | 'timeline_management'
  | 'cost_management'
  | 'resource_management'
  | 'quality_management'
  | 'risk_management'
  | 'stakeholder_management'
  | 'integration_management'
  | 'ai_optimization'
  | 'tool_selection'
  | 'architecture'
  | 'other'

export type EntryStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'published'
  | 'archived'
  | 'superseded'

export type ApplicationStatus =
  | 'planned'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'abandoned'

export type ApplicationOutcome =
  | 'successful'
  | 'partially_successful'
  | 'unsuccessful'
  | null

export type ReviewType =
  | 'approval_review'
  | 'peer_review'
  | 'application_feedback'
  | 'update_review'

export type ReviewRecommendation =
  | 'approve'
  | 'request_changes'
  | 'reject'
  | 'needs_more_info'

export interface BaselineApproach {
  description: string
  cost?: number
  timeline?: number
  quality?: string
  challenges?: string[]
}

export interface ImprovedApproach {
  description: string
  implementation_details: string
  tools_used?: string[]
  techniques?: string[]
}

export interface ValueMetrics {
  cost_savings?: number
  time_saved?: number
  quality_improvement?: number
  efficiency_gain?: number
}

export interface ReplicationGuide {
  steps: string[]
  prerequisites?: string[]
  resources_needed?: string[]
  estimated_effort?: string
  risks?: string[]
}

export interface KnowledgeBaseEntry {
  id: string
  project_id: string
  baseline_id?: string | null
  drift_detection_id?: string | null
  innovation_opportunity_id?: string | null
  
  entry_type: EntryType
  category: EntryCategory
  
  title: string
  description: string // Markdown format
  
  baseline_approach?: BaselineApproach | null
  improved_approach: ImprovedApproach
  value_metrics?: ValueMetrics | null
  replication_guide: ReplicationGuide
  applicable_contexts?: string[] | null
  similar_project_ids?: string[]
  
  ai_confidence: number
  novelty_score: number
  replication_potential: number
  ai_processing_metadata?: any | null
  
  tags?: string[]
  keywords?: string[]
  
  status: EntryStatus
  
  created_by: string
  created_at: Date
  reviewed_by?: string | null
  reviewed_at?: Date | null
  approved_by?: string | null
  approved_at?: Date | null
  published_at?: Date | null
  superseded_by?: string | null
  superseded_at?: Date | null
  
  view_count: number
  application_count: number
  success_rate: number
  
  updated_at: Date
  notes?: string | null
}

export interface CreateKnowledgeBaseEntryRequest {
  project_id: string
  baseline_id?: string
  drift_detection_id?: string
  innovation_opportunity_id?: string
  
  entry_type: EntryType
  category: EntryCategory
  
  title: string
  description: string
  
  baseline_approach?: BaselineApproach
  improved_approach: ImprovedApproach
  value_metrics?: ValueMetrics
  replication_guide: ReplicationGuide
  applicable_contexts?: string[]
  similar_project_ids?: string[]
  
  tags?: string[]
  keywords?: string[]
  
  notes?: string
}

export interface UpdateKnowledgeBaseEntryRequest {
  entry_type?: EntryType
  category?: EntryCategory
  title?: string
  description?: string
  baseline_approach?: BaselineApproach
  improved_approach?: ImprovedApproach
  value_metrics?: ValueMetrics
  replication_guide?: ReplicationGuide
  applicable_contexts?: string[]
  similar_project_ids?: string[]
  tags?: string[]
  keywords?: string[]
  status?: EntryStatus
  notes?: string
}

export interface KnowledgeBaseApplication {
  id: string
  knowledge_base_entry_id: string
  target_project_id: string
  
  applied_by: string
  applied_at: Date
  
  implementation_notes?: string | null
  adaptation_required: boolean
  adaptations?: any | null
  
  status: ApplicationStatus
  outcome?: ApplicationOutcome | null
  
  expected_value?: ValueMetrics | null
  actual_value?: ValueMetrics | null
  variance_analysis?: any | null
  
  feedback?: string | null
  lessons_learned?: string | null
  
  completed_at?: Date | null
  updated_at: Date
}

export interface CreateKnowledgeBaseApplicationRequest {
  knowledge_base_entry_id: string
  target_project_id: string
  implementation_notes?: string
  adaptation_required?: boolean
  adaptations?: any
  expected_value?: ValueMetrics
}

export interface UpdateKnowledgeBaseApplicationRequest {
  implementation_notes?: string
  adaptation_required?: boolean
  adaptations?: any
  status?: ApplicationStatus
  outcome?: ApplicationOutcome
  actual_value?: ValueMetrics
  variance_analysis?: any
  feedback?: string
  lessons_learned?: string
}

export interface KnowledgeBaseReview {
  id: string
  knowledge_base_entry_id: string
  reviewer_id: string
  reviewed_at: Date
  rating?: number | null
  review_text?: string | null
  review_type: ReviewType
  recommendation?: ReviewRecommendation | null
  suggested_changes?: any | null
  updated_at: Date
}

export interface CreateKnowledgeBaseReviewRequest {
  knowledge_base_entry_id: string
  rating?: number
  review_text?: string
  review_type: ReviewType
  recommendation?: ReviewRecommendation
  suggested_changes?: any
}

export interface KnowledgeBaseSearchFilters {
  entry_type?: EntryType | EntryType[]
  category?: EntryCategory | EntryCategory[]
  status?: EntryStatus | EntryStatus[]
  project_id?: string
  tags?: string[]
  search_query?: string
  min_novelty_score?: number
  min_replication_potential?: number
  created_after?: Date
  created_before?: Date
}

export interface KnowledgeBaseStats {
  total_entries: number
  entries_by_type: Record<string, number>
  entries_by_category: Record<string, number>
  entries_by_status: Record<string, number>
  total_applications: number
  successful_applications: number
  average_success_rate: number
  total_cost_savings: number
  total_time_saved: number
}
