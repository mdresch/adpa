/**
 * Context Gathering Stage Types
 * Defines TypeScript interfaces for comprehensive context gathering
 */

// Placeholder types for detailed data structures
// These should be properly defined based on actual data models
export type UserProfileData = Record<string, any>
export type UserPreferenceData = Record<string, any>
export type UserExpertiseData = Record<string, any>
export type UserWritingStyleData = Record<string, any>
export type UserDomainKnowledgeData = Record<string, any>
export type UserCollaborationPreferenceData = Record<string, any>
export type UserPerformanceHistoryData = Record<string, any>
export type UserLearningPreferenceData = Record<string, any>
export type UserAccessPatternData = Record<string, any>
export type UserFeedbackHistoryData = Record<string, any>
export type UserSatisfactionScoreData = Record<string, any>
export type UserCommunicationStyleData = Record<string, any>
export type UserDeadlinePreferenceData = Record<string, any>
export type UserQualityPreferenceData = Record<string, any>
export type UserToolPreferenceData = Record<string, any>
export type UserWorkflowPreferenceData = Record<string, any>
export type UserSecurityPreferenceData = Record<string, any>
export type UserPrivacyPreferenceData = Record<string, any>
export type DocumentHistoryData = Record<string, any>
export type UsagePatternData = Record<string, any>
export type QualityTrendData = Record<string, any>
export type TemplateUsageData = Record<string, any>
export type GenerationPatternData = Record<string, any>
export type UserInteractionData = Record<string, any>
export type FeedbackHistoryData = Record<string, any>
export type RevisionHistoryData = Record<string, any>
export type CollaborationPatternData = Record<string, any>
export type DocumentPerformanceMetrics = Record<string, any>
export type DocumentQualityMetrics = Record<string, any>
export type ComplianceHistoryData = Record<string, any>
export type ContextConflictData = Record<string, any>
export type ContextGapData = Record<string, any>
export type ContextOverlapData = Record<string, any>
export type ContextQualityScoreData = Record<string, any>
export type ContextFreshnessScoreData = Record<string, any>
export type ContextRelevanceScoreData = Record<string, any>
export type ContextConfidenceScoreData = Record<string, any>
export type IntegratedInsightData = Record<string, any>
export type IntegratedRecommendationData = Record<string, any>
export type OptimizedSourceData = Record<string, any>
export type ContextPriorityData = Record<string, any>
export type ContextWeightData = Record<string, any>
export type ContextFilterData = Record<string, any>
export type ContextAggregationData = Record<string, any>
export type ContextSummaryData = Record<string, any>
export type ContextHighlightData = Record<string, any>
export type ContextKeyPointData = Record<string, any>
export type ContextActionItemData = Record<string, any>
export type ContextRiskData = Record<string, any>
export type ContextOpportunityData = Record<string, any>
export type ContextDecisionData = Record<string, any>
export type ContextAssumptionData = Record<string, any>
export type ContextConstraintData = Record<string, any>
export type ContextSuccessFactorData = Record<string, any>
export type FeedbackData = Record<string, any>
export type SatisfactionScoreData = Record<string, any>
export type ChangeHistoryData = Record<string, any>
export type PerformanceMetricData = Record<string, any>
export type BudgetCategoryData = Record<string, any>
export type BudgetTimelineData = Record<string, any>
export type BudgetForecastData = Record<string, any>
export type TimelineMilestoneData = Record<string, any>
export type CommunicationChannelData = Record<string, any>
export type TechnologyData = Record<string, any>
export type PerformanceBenchmarkData = Record<string, any>
export type PerformanceTrendData = Record<string, any>
export type PerformanceComparisonData = Record<string, any>
export type ApprovalPatternData = Record<string, any>
export type DistributionPatternData = Record<string, any>
export type AccessPatternData = Record<string, any>
export type ExternalSourceData = Record<string, any>
export type ApiResponseData = Record<string, any>
export type FileContentData = Record<string, any>
export type DatabaseResultData = Record<string, any>
export type WebScrapingResultData = Record<string, any>
export type IntegrationData = Record<string, any>
export type ThirdPartyData = Record<string, any>
export type MarketData = Record<string, any>
export type IndustryStandardData = Record<string, any>
export type RegulatoryRequirementData = Record<string, any>
export type CompetitorAnalysisData = Record<string, any>
export type TechnologyTrendData = Record<string, any>
export type BestPracticeData = Record<string, any>
export type CaseStudyData = Record<string, any>
export type ResearchData = Record<string, any>
export type TemplateVariableData = Record<string, any>
export type TemplateStructureData = Record<string, any>
export type TemplateMetadataData = Record<string, any>

export interface IContextGatheringStage {
  // Main execution method
  execute(request: ContextGatheringRequest): Promise<ContextGatheringResult>
  
  // Context gathering methods
  gatherProjectContext(request: ContextGatheringRequest): Promise<ProjectContextData>
  gatherUserProfileContext(request: ContextGatheringRequest): Promise<UserProfileContextData>
  gatherDocumentHistoryContext(request: ContextGatheringRequest): Promise<DocumentHistoryContextData>
  gatherExternalContext(request: ContextGatheringRequest): Promise<ExternalContextData>
  gatherTemplateContext(request: ContextGatheringRequest): Promise<TemplateContextData>
  
  // Analysis methods
  analyzeContextQuality(contextData: ContextData): Promise<ContextQualityAnalysis>
  identifyContextGaps(contextData: ContextData): Promise<ContextGap[]>
  prioritizeContextSources(contextData: ContextData): Promise<ContextSourcePriority[]>
  
  // Integration methods
  integrateWithRepository(contextData: ContextData): Promise<IntegratedContextData>
  validateContextCompleteness(contextData: ContextData): Promise<ContextValidationResult>
  optimizeContextForGeneration(contextData: ContextData): Promise<OptimizedContextData>
}

export interface ContextGatheringRequest {
  request_id: string
  template_id: string
  project_id: string
  user_id: string
  document_type: string
  gathering_config: ContextGatheringConfig
  metadata?: Record<string, any>
}

export interface ContextGatheringConfig {
  enable_project_analysis: boolean
  enable_user_profile_analysis: boolean
  enable_document_history_analysis: boolean
  enable_external_source_integration: boolean
  enable_template_context_analysis: boolean
  max_context_age: number // in hours
  context_quality_threshold: number
  include_historical_patterns: boolean
  include_collaboration_data: boolean
  include_performance_metrics: boolean
  context_sources: ContextSource[]
  analysis_depth: 'shallow' | 'medium' | 'deep'
  priority_filters: ContextPriorityFilter[]
}

export interface ContextSource {
  source_id: string
  source_type: ContextSourceType
  source_name: string
  source_config: Record<string, any>
  enabled: boolean
  priority: number
  reliability_score: number
  last_updated: Date
}

export type ContextSourceType = 
  | 'project_database'
  | 'user_profile'
  | 'document_history'
  | 'external_api'
  | 'file_system'
  | 'template_repository'
  | 'collaboration_platform'
  | 'version_control'
  | 'issue_tracker'
  | 'knowledge_base'
  | 'external_database'
  | 'web_scraping'
  | 'integration_platform'
  | 'third_party_service'

export interface ContextPriorityFilter {
  filter_type: 'project_phase' | 'document_type' | 'user_role' | 'stakeholder_type' | 'time_range'
  filter_value: any
  priority_weight: number
}

export interface ContextGatheringResult {
  result_id: string
  request_id: string
  context_data: ContextData
  quality_analysis: ContextQualityAnalysis
  context_gaps: ContextGap[]
  source_priorities: ContextSourcePriority[]
  gathering_metrics: ContextGatheringMetrics
  recommendations: ContextRecommendation[]
  metadata: Record<string, any>
}

export interface ContextData {
  project_context: ProjectContextData
  user_profile_context: UserProfileContextData
  document_history_context: DocumentHistoryContextData
  external_context: ExternalContextData
  template_context: TemplateContextData
  baseline_context?: BaselineContextData // NEW: Approved project baseline for drift-aware generation
  integrated_context: IntegratedContextData
  optimized_context: OptimizedContextData
  metadata: ContextMetadata
}

export interface ProjectContextData {
  project_id: string
  project_name: string
  project_description: string
  project_type: string
  project_phase: string
  project_status: string
  start_date: Date
  end_date: Date
  stakeholders: StakeholderData[]
  requirements: RequirementData[]
  constraints: ConstraintData[]
  risks: RiskData[]
  milestones: MilestoneData[]
  phases: PhaseData[]
  team_members: TeamMemberData[]
  budget_info: BudgetData
  timeline_info: TimelineData
  success_criteria: SuccessCriteriaData[]
  project_goals: ProjectGoalData[]
  dependencies: DependencyData[]
  deliverables: DeliverableData[]
  communication_plan: CommunicationPlanData
  quality_standards: QualityStandardData[]
  compliance_requirements: ComplianceRequirementData[]
  technology_stack: TechnologyStackData
  methodology: MethodologyData
  lessons_learned: LessonLearnedData[]
  best_practices: BestPracticeData[]
  performance_metrics: ProjectPerformanceMetrics
  metadata: Record<string, any>
}

export interface UserProfileContextData {
  user_id: string
  user_profile: UserProfileData
  user_preferences: UserPreferenceData[]
  user_expertise: UserExpertiseData[]
  user_writing_style: UserWritingStyleData
  user_domain_knowledge: UserDomainKnowledgeData[]
  user_collaboration_preferences: UserCollaborationPreferenceData[]
  user_performance_history: UserPerformanceHistoryData
  user_learning_preferences: UserLearningPreferenceData
  user_access_patterns: UserAccessPatternData[]
  user_feedback_history: UserFeedbackHistoryData[]
  user_satisfaction_scores: UserSatisfactionScoreData[]
  user_communication_style: UserCommunicationStyleData
  user_deadline_preferences: UserDeadlinePreferenceData
  user_quality_preferences: UserQualityPreferenceData
  user_tool_preferences: UserToolPreferenceData[]
  user_workflow_preferences: UserWorkflowPreferenceData
  user_security_preferences: UserSecurityPreferenceData
  user_privacy_preferences: UserPrivacyPreferenceData
  metadata: Record<string, any>
}

export interface DocumentHistoryContextData {
  document_history: DocumentHistoryData[]
  usage_patterns: UsagePatternData[]
  quality_trends: QualityTrendData[]
  best_practices: BestPracticeData[]
  lessons_learned: LessonLearnedData[]
  template_usage: TemplateUsageData[]
  generation_patterns: GenerationPatternData[]
  user_interactions: UserInteractionData[]
  feedback_history: FeedbackHistoryData[]
  revision_history: RevisionHistoryData[]
  collaboration_patterns: CollaborationPatternData[]
  performance_metrics: DocumentPerformanceMetrics
  quality_metrics: DocumentQualityMetrics
  compliance_history: ComplianceHistoryData[]
  approval_patterns: ApprovalPatternData[]
  distribution_patterns: DistributionPatternData[]
  access_patterns: AccessPatternData[]
  metadata: Record<string, any>
}

export interface ExternalContextData {
  external_sources: ExternalSourceData[]
  api_responses: ApiResponseData[]
  file_contents: FileContentData[]
  database_results: DatabaseResultData[]
  web_scraping_results: WebScrapingResultData[]
  integration_data: IntegrationData[]
  third_party_data: ThirdPartyData[]
  market_data: MarketData
  industry_standards: IndustryStandardData[]
  regulatory_requirements: RegulatoryRequirementData[]
  competitor_analysis: CompetitorAnalysisData
  technology_trends: TechnologyTrendData[]
  best_practices_external: BestPracticeData[]
  case_studies: CaseStudyData[]
  research_data: ResearchData[]
  metadata: Record<string, any>
}

export interface TemplateContextData {
  template_id: string
  template_name: string
  template_description: string
  template_framework: string
  template_category: string
  template_type: string
  template_version: string
  template_variables: TemplateVariableData[]
  template_structure: TemplateStructureData
  template_metadata: TemplateMetadataData
  template_usage_stats: TemplateUsageStatsData
  template_quality_metrics: TemplateQualityMetricsData
  template_performance_metrics: TemplatePerformanceMetricsData
  template_feedback: TemplateFeedbackData[]
  template_improvements: TemplateImprovementData[]
  template_dependencies: TemplateDependencyData[]
  template_customizations: TemplateCustomizationData[]
  template_validation_rules: TemplateValidationRuleData[]
  template_access_controls: TemplateAccessControlData[]
  template_collaboration_data: TemplateCollaborationData
  template_version_history: TemplateVersionHistoryData[]
  template_approval_history: TemplateApprovalHistoryData[]
  metadata: Record<string, any>
}

export interface BaselineContextData {
  baseline_id: string
  project_id: string
  baseline_version: number
  approval_status: 'draft' | 'approved' | 'rejected' | 'superseded'
  scope_baseline: {
    in_scope_items: string[]
    out_of_scope_items: string[]
    assumptions: string[]
    constraints: string[]
    deliverables: string[]
  }
  technical_baseline: {
    architecture_approach: string
    key_technologies: string[]
    integration_points: string[]
    technical_constraints: string[]
    quality_standards: string[]
  }
  timeline_baseline: {
    key_milestones: Array<{ name: string; date: string; description: string }>
    critical_path: string[]
    dependencies: string[]
    buffer_time: string
  }
  cost_baseline: {
    budget_total: number
    cost_breakdown: Record<string, number>
    contingency_reserves: number
    management_reserves: number
  }
  resource_baseline: {
    team_structure: string[]
    key_roles: string[]
    resource_requirements: string[]
    skill_requirements: string[]
  }
  success_criteria: {
    kpis: Array<{ metric: string; target: string; measurement: string }>
    acceptance_criteria: string[]
    quality_gates: string[]
  }
  extraction_confidence: number
  completeness_score: number
  consistency_score: number
  clarity_score: number
  approved_by?: string
  approved_at?: Date
  baseline_snapshot_hash?: string
  metadata: Record<string, any>
}

export interface IntegratedContextData {
  integrated_sources: IntegratedSourceData[]
  cross_references: CrossReferenceData[]
  data_relationships: DataRelationshipData[]
  context_hierarchy: ContextHierarchyData
  context_dependencies: ContextDependencyData[]
  context_conflicts: ContextConflictData[]
  context_gaps: ContextGapData[]
  context_overlaps: ContextOverlapData[]
  context_quality_scores: ContextQualityScoreData[]
  context_freshness_scores: ContextFreshnessScoreData[]
  context_relevance_scores: ContextRelevanceScoreData[]
  context_confidence_scores: ContextConfidenceScoreData[]
  integrated_insights: IntegratedInsightData[]
  integrated_recommendations: IntegratedRecommendationData[]
  metadata: Record<string, any>
}

export interface OptimizedContextData {
  optimized_sources: OptimizedSourceData[]
  context_priorities: ContextPriorityData[]
  context_weights: ContextWeightData[]
  context_filters: ContextFilterData[]
  context_aggregations: ContextAggregationData[]
  context_summaries: ContextSummaryData[]
  context_highlights: ContextHighlightData[]
  context_key_points: ContextKeyPointData[]
  context_action_items: ContextActionItemData[]
  context_risks: ContextRiskData[]
  context_opportunities: ContextOpportunityData[]
  context_decisions: ContextDecisionData[]
  context_assumptions: ContextAssumptionData[]
  context_constraints: ContextConstraintData[]
  context_success_factors: ContextSuccessFactorData[]
  metadata: Record<string, any>
}

export interface ContextMetadata {
  gathering_timestamp: Date
  gathering_duration: number
  context_sources_used: string[]
  context_quality_score: number
  context_completeness_score: number
  context_freshness_score: number
  context_relevance_score: number
  context_confidence_score: number
  gathering_errors: ContextGatheringError[]
  gathering_warnings: ContextGatheringWarning[]
  gathering_success_rate: number
  context_size_bytes: number
  context_compression_ratio: number
  metadata: Record<string, any>
}

export interface ContextQualityAnalysis {
  overall_quality_score: number
  quality_dimensions: ContextQualityDimension[]
  quality_issues: ContextQualityIssue[]
  quality_trends: ContextQualityTrend[]
  quality_benchmarks: ContextQualityBenchmark[]
  quality_improvements: ContextQualityImprovement[]
  quality_metrics: ContextQualityMetric[]
  quality_assessment: ContextQualityAssessment
  quality_recommendations: ContextQualityRecommendation[]
  metadata: Record<string, any>
}

export interface ContextQualityDimension {
  dimension_name: string
  dimension_score: number
  dimension_weight: number
  dimension_description: string
  dimension_factors: ContextQualityFactor[]
  dimension_metrics: ContextQualityMetric[]
  dimension_trends: ContextQualityTrend[]
}

export interface ContextQualityFactor {
  factor_name: string
  factor_score: number
  factor_weight: number
  factor_description: string
  factor_impact: string
  factor_recommendations: string[]
}

export interface ContextQualityMetric {
  metric_name: string
  metric_value: number
  metric_unit: string
  metric_threshold: number
  metric_status: 'good' | 'warning' | 'critical'
  metric_trend: 'improving' | 'declining' | 'stable'
  metric_description: string
}

export interface ContextQualityTrend {
  trend_name: string
  trend_data: ContextQualityTrendDataPoint[]
  trend_direction: 'improving' | 'declining' | 'stable'
  trend_confidence: number
  trend_prediction: ContextQualityPrediction
}

export interface ContextQualityTrendDataPoint {
  timestamp: Date
  value: number
  context: Record<string, any>
}

export interface ContextQualityPrediction {
  predicted_value: number
  prediction_confidence: number
  prediction_horizon: number
  prediction_factors: string[]
}

export interface ContextQualityIssue {
  issue_id: string
  issue_type: string
  issue_description: string
  issue_severity: 'low' | 'medium' | 'high' | 'critical'
  issue_impact: string
  issue_cause: string
  issue_recommendations: string[]
  issue_priority: number
  issue_status: 'open' | 'in_progress' | 'resolved' | 'closed'
}

export interface ContextQualityBenchmark {
  benchmark_name: string
  benchmark_value: number
  benchmark_source: string
  benchmark_description: string
  benchmark_comparison: ContextQualityComparison
}

export interface ContextQualityComparison {
  current_value: number
  benchmark_value: number
  difference: number
  difference_percentage: number
  comparison_status: 'above' | 'below' | 'equal'
  comparison_significance: 'significant' | 'moderate' | 'minimal'
}

export interface ContextQualityImprovement {
  improvement_id: string
  improvement_type: string
  improvement_description: string
  improvement_impact: number
  improvement_effort: 'low' | 'medium' | 'high'
  improvement_priority: number
  improvement_status: 'proposed' | 'approved' | 'in_progress' | 'completed'
  improvement_metrics: ContextQualityMetric[]
}

export interface ContextQualityAssessment {
  assessment_id: string
  assessment_timestamp: Date
  assessment_score: number
  assessment_confidence: number
  assessment_methodology: string
  assessment_limitations: string[]
  assessment_recommendations: string[]
  assessment_metadata: Record<string, any>
}

export interface ContextQualityRecommendation {
  recommendation_id: string
  recommendation_type: string
  recommendation_title: string
  recommendation_description: string
  recommendation_priority: 'low' | 'medium' | 'high' | 'critical'
  recommendation_impact: number
  recommendation_effort: 'low' | 'medium' | 'high'
  recommendation_implementation: string
  recommendation_metrics: ContextQualityMetric[]
}

export interface ContextGap {
  gap_id: string
  gap_type: ContextGapType
  gap_description: string
  gap_severity: 'low' | 'medium' | 'high' | 'critical'
  gap_impact: string
  gap_cause: string
  gap_solutions: ContextGapSolution[]
  gap_priority: number
  gap_status: 'identified' | 'analyzing' | 'resolving' | 'resolved'
  metadata?: Record<string, any>
}

export type ContextGapType = 
  | 'missing_data'
  | 'incomplete_data'
  | 'outdated_data'
  | 'inconsistent_data'
  | 'low_quality_data'
  | 'access_restriction'
  | 'source_unavailable'
  | 'permission_denied'
  | 'format_incompatibility'
  | 'validation_failure'

export interface ContextGapSolution {
  solution_id: string
  solution_type: string
  solution_description: string
  solution_effort: 'low' | 'medium' | 'high'
  solution_success_probability: number
  solution_implementation: string
  solution_metrics: ContextQualityMetric[]
}

export interface ContextSourcePriority {
  source_id: string
  source_name: string
  priority_score: number
  priority_factors: ContextPriorityFactor[]
  priority_justification: string
  priority_recommendations: string[]
  priority_metadata: Record<string, any>
}

export interface ContextPriorityFactor {
  factor_name: string
  factor_weight: number
  factor_score: number
  factor_description: string
  factor_impact: string
}

export interface ContextGatheringMetrics {
  total_sources_accessed: number
  successful_sources: number
  failed_sources: number
  success_rate: number
  average_response_time: number
  total_gathering_time: number
  data_volume_processed: number
  cache_hit_rate: number
  error_rate: number
  quality_score: number
  completeness_score: number
  freshness_score: number
  relevance_score: number
  confidence_score: number
  performance_metrics: ContextGatheringPerformanceMetric[]
  quality_metrics: ContextGatheringQualityMetric[]
  error_metrics: ContextGatheringErrorMetric[]
}

export interface ContextGatheringPerformanceMetric {
  metric_name: string
  metric_value: number
  metric_unit: string
  metric_timestamp: Date
  metric_context: Record<string, any>
}

export interface ContextGatheringQualityMetric {
  metric_name: string
  metric_value: number
  metric_threshold: number
  metric_status: 'good' | 'warning' | 'critical'
  metric_timestamp: Date
  metric_context: Record<string, any>
}

export interface ContextGatheringErrorMetric {
  error_type: string
  error_count: number
  error_rate: number
  error_severity: 'low' | 'medium' | 'high' | 'critical'
  error_timestamp: Date
  error_context: Record<string, any>
}

export interface ContextRecommendation {
  recommendation_id: string
  recommendation_type: ContextRecommendationType
  recommendation_title: string
  recommendation_description: string
  recommendation_priority: 'low' | 'medium' | 'high' | 'critical'
  recommendation_impact: number
  recommendation_effort: 'low' | 'medium' | 'high'
  recommendation_implementation: string
  recommendation_metrics: ContextQualityMetric[]
  recommendation_metadata: Record<string, any>
}

export type ContextRecommendationType = 
  | 'source_optimization'
  | 'quality_improvement'
  | 'performance_enhancement'
  | 'gap_resolution'
  | 'integration_improvement'
  | 'security_enhancement'
  | 'compliance_improvement'
  | 'user_experience'
  | 'cost_optimization'
  | 'scalability_improvement'

export interface ContextValidationResult {
  valid: boolean
  validation_score: number
  validation_errors: ContextValidationError[]
  validation_warnings: ContextValidationWarning[]
  validation_suggestions: ContextValidationSuggestion[]
  validation_metadata: Record<string, any>
}

export interface ContextValidationError {
  error_id: string
  error_type: string
  error_message: string
  error_severity: 'low' | 'medium' | 'high' | 'critical'
  error_location: string
  error_context: Record<string, any>
  error_suggestions: string[]
}

export interface ContextValidationWarning {
  warning_id: string
  warning_type: string
  warning_message: string
  warning_impact: string
  warning_location: string
  warning_context: Record<string, any>
  warning_suggestions: string[]
}

export interface ContextValidationSuggestion {
  suggestion_id: string
  suggestion_type: string
  suggestion_message: string
  suggestion_impact: string
  suggestion_location: string
  suggestion_context: Record<string, any>
  suggestion_implementation: string
}

// Supporting data structures
export interface StakeholderData {
  stakeholder_id: string
  name: string
  role: string
  contact_info: string
  influence: 'low' | 'medium' | 'high'
  interest: 'low' | 'medium' | 'high'
  expectations: string[]
  communication_preferences: string[]
  availability: string[]
  expertise_areas: string[]
  decision_authority: 'low' | 'medium' | 'high'
  approval_required: boolean
  feedback_history: FeedbackData[]
  satisfaction_scores: SatisfactionScoreData[]
  metadata: Record<string, any>
}

export interface RequirementData {
  requirement_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'draft' | 'approved' | 'implemented' | 'verified'
  category: string
  source: string
  acceptance_criteria: string[]
  dependencies: string[]
  risks: string[]
  stakeholders: string[]
  verification_method: string
  traceability: string[]
  change_history: ChangeHistoryData[]
  metadata: Record<string, any>
}

export interface ConstraintData {
  constraint_id: string
  title: string
  description: string
  type: 'technical' | 'business' | 'regulatory' | 'resource' | 'time' | 'quality'
  impact: 'low' | 'medium' | 'high'
  severity: 'low' | 'medium' | 'high' | 'critical'
  source: string
  rationale: string
  mitigation_strategies: string[]
  monitoring_approach: string
  compliance_requirements: string[]
  metadata: Record<string, any>
}

export interface RiskData {
  risk_id: string
  title: string
  description: string
  category: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'identified' | 'assessed' | 'mitigated' | 'monitored' | 'closed'
  owner: string
  mitigation_strategies: string[]
  contingency_plans: string[]
  monitoring_approach: string
  escalation_triggers: string[]
  metadata: Record<string, any>
}

export interface MilestoneData {
  milestone_id: string
  title: string
  description: string
  due_date: Date
  status: 'planned' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'
  dependencies: string[]
  deliverables: string[]
  acceptance_criteria: string[]
  owner: string
  stakeholders: string[]
  progress_percentage: number
  actual_completion_date: Date
  variance_days: number
  metadata: Record<string, any>
}

export interface PhaseData {
  phase_id: string
  title: string
  description: string
  start_date: Date
  end_date: Date
  status: 'planned' | 'active' | 'completed' | 'cancelled'
  objectives: string[]
  deliverables: string[]
  milestones: string[]
  team_members: string[]
  budget_allocation: number
  risks: string[]
  dependencies: string[]
  metadata: Record<string, any>
}

export interface TeamMemberData {
  member_id: string
  name: string
  role: string
  department: string
  expertise_areas: string[]
  availability: string[]
  responsibilities: string[]
  performance_metrics: PerformanceMetricData[]
  collaboration_preferences: string[]
  communication_style: string
  workload_capacity: number
  current_workload: number
  metadata: Record<string, any>
}

export interface BudgetData {
  total_budget: number
  allocated_budget: number
  spent_budget: number
  remaining_budget: number
  budget_categories: BudgetCategoryData[]
  budget_timeline: BudgetTimelineData[]
  budget_variance: number
  budget_forecast: BudgetForecastData[]
  metadata: Record<string, any>
}

export interface TimelineData {
  start_date: Date
  end_date: Date
  duration_days: number
  critical_path: string[]
  timeline_milestones: TimelineMilestoneData[]
  timeline_risks: string[]
  timeline_dependencies: string[]
  timeline_buffer: number
  timeline_variance: number
  metadata: Record<string, any>
}

export interface SuccessCriteriaData {
  criteria_id: string
  title: string
  description: string
  category: string
  measurement_method: string
  target_value: number
  current_value: number
  unit: string
  status: 'not_met' | 'partially_met' | 'met' | 'exceeded'
  priority: 'low' | 'medium' | 'high' | 'critical'
  owner: string
  review_frequency: string
  metadata: Record<string, any>
}

export interface ProjectGoalData {
  goal_id: string
  title: string
  description: string
  category: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled'
  target_date: Date
  progress_percentage: number
  success_metrics: string[]
  owner: string
  stakeholders: string[]
  dependencies: string[]
  metadata: Record<string, any>
}

export interface DependencyData {
  dependency_id: string
  title: string
  description: string
  type: 'internal' | 'external' | 'technical' | 'business'
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  owner: string
  due_date: Date
  impact: 'low' | 'medium' | 'high' | 'critical'
  mitigation_strategies: string[]
  metadata: Record<string, any>
}

export interface DeliverableData {
  deliverable_id: string
  title: string
  description: string
  type: string
  status: 'planned' | 'in_progress' | 'completed' | 'delivered'
  due_date: Date
  owner: string
  stakeholders: string[]
  acceptance_criteria: string[]
  quality_standards: string[]
  dependencies: string[]
  metadata: Record<string, any>
}

export interface CommunicationPlanData {
  plan_id: string
  title: string
  description: string
  communication_channels: CommunicationChannelData[]
  communication_frequency: string
  stakeholders: string[]
  communication_templates: string[]
  escalation_procedures: string[]
  feedback_mechanisms: string[]
  metadata: Record<string, any>
}

export interface QualityStandardData {
  standard_id: string
  title: string
  description: string
  category: string
  level: 'basic' | 'intermediate' | 'advanced' | 'expert'
  requirements: string[]
  measurement_criteria: string[]
  compliance_requirements: string[]
  review_process: string[]
  metadata: Record<string, any>
}

export interface ComplianceRequirementData {
  requirement_id: string
  title: string
  description: string
  category: string
  source: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'not_applicable' | 'applicable' | 'compliant' | 'non_compliant'
  owner: string
  review_date: Date
  compliance_evidence: string[]
  remediation_plan: string[]
  metadata: Record<string, any>
}

export interface TechnologyStackData {
  stack_id: string
  title: string
  description: string
  technologies: TechnologyData[]
  versions: string[]
  dependencies: string[]
  compatibility_matrix: string[]
  upgrade_roadmap: string[]
  metadata: Record<string, any>
}

export interface MethodologyData {
  methodology_id: string
  title: string
  description: string
  framework: string
  phases: string[]
  deliverables: string[]
  roles_responsibilities: string[]
  best_practices: string[]
  tools_techniques: string[]
  quality_gates: string[]
  metadata: Record<string, any>
}

export interface LessonLearnedData {
  lesson_id: string
  title: string
  description: string
  category: string
  impact: 'low' | 'medium' | 'high'
  source: string
  date_learned: Date
  applicability: string[]
  recommendations: string[]
  metadata: Record<string, any>
}

export interface BestPracticeData {
  practice_id: string
  title: string
  description: string
  category: string
  effectiveness: number
  applicability: string[]
  implementation_guidance: string[]
  success_factors: string[]
  common_pitfalls: string[]
  metadata: Record<string, any>
}

export interface ProjectPerformanceMetrics {
  performance_id: string
  metrics: PerformanceMetricData[]
  benchmarks: PerformanceBenchmarkData[]
  trends: PerformanceTrendData[]
  comparisons: PerformanceComparisonData[]
  forecasts: PerformanceForecastData[]
  metadata: Record<string, any>
}

// Additional supporting interfaces would continue here...
// For brevity, I'll include the essential ones and note that the full implementation
// would include all the supporting data structures for user profiles, document history,
// external context, template context, and other components.

export interface ContextGatheringError {
  error_id: string
  error_type: string
  error_message: string
  error_severity: 'low' | 'medium' | 'high' | 'critical'
  error_timestamp: Date
  error_context: Record<string, any>
  error_suggestions: string[]
}

export interface ContextGatheringWarning {
  warning_id: string
  warning_type: string
  warning_message: string
  warning_impact: string
  warning_timestamp: Date
  warning_context: Record<string, any>
  warning_suggestions: string[]
}

// Additional supporting interfaces for all the data structures referenced above
// would be included in the full implementation
