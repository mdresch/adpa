/**
 * Variable Resolution Engine Types
 * Defines TypeScript interfaces for intelligent template variable resolution
 */

export interface VariableResolutionEngine {
  // Main resolution methods
  resolveVariables(request: VariableResolutionRequest): Promise<VariableResolutionResult>
  resolveVariable(variable: TemplateVariable, context: ResolutionContext): Promise<VariableResolution>
  resolveVariableBatch(variables: TemplateVariable[], context: ResolutionContext): Promise<VariableResolution[]>
  
  // Variable analysis
  analyzeVariables(template: DocumentTemplate): Promise<VariableAnalysis>
  detectVariablePatterns(variables: TemplateVariable[]): Promise<VariablePattern[]>
  validateVariableDefinitions(variables: TemplateVariable[]): Promise<ValidationResult>
  
  // Context integration
  enrichContext(context: ResolutionContext, variables: TemplateVariable[]): Promise<EnrichedContext>
  optimizeResolutionStrategy(variables: TemplateVariable[], context: ResolutionContext): Promise<ResolutionStrategy>
  
  // Performance and caching
  cacheVariableResolution(variable: TemplateVariable, resolution: VariableResolution): Promise<void>
  getCachedResolution(variable: TemplateVariable): Promise<VariableResolution | null>
  clearResolutionCache(pattern?: string): Promise<void>
  
  // Metrics and monitoring
  getResolutionMetrics(): Promise<ResolutionMetrics>
  getVariableUsageStats(variableName: string): Promise<VariableUsageStats>
}

export interface VariableResolutionRequest {
  request_id: string
  template_id: string
  variables: TemplateVariable[]
  context: ResolutionContext
  resolution_config: VariableResolutionConfig
  metadata?: Record<string, any>
}

export interface VariableResolutionConfig {
  enable_ai_generation: boolean
  enable_context_extraction: boolean
  enable_user_profile_integration: boolean
  enable_external_api_calls: boolean
  enable_caching: boolean
  max_resolution_time: number
  retry_attempts: number
  quality_threshold: number
  resolution_strategies: ResolutionStrategy[]
  fallback_strategies: FallbackStrategy[]
}

export interface ResolutionStrategy {
  strategy_id: string
  strategy_name: string
  strategy_type: ResolutionStrategyType
  priority: number
  enabled: boolean
  config: Record<string, any>
  conditions?: ResolutionCondition[]
}

export type ResolutionStrategyType = 
  | 'context_extraction'
  | 'user_profile'
  | 'ai_generation'
  | 'default_value'
  | 'template_inheritance'
  | 'external_api'
  | 'database_query'
  | 'file_content'
  | 'computed_value'
  | 'conditional_logic'

export interface ResolutionCondition {
  condition_id: string
  condition_type: 'variable_exists' | 'context_has_data' | 'user_has_permission' | 'custom'
  condition_expression: string
  condition_value: any
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than'
}

export interface FallbackStrategy {
  strategy_id: string
  strategy_name: string
  strategy_type: ResolutionStrategyType
  fallback_order: number
  enabled: boolean
  config: Record<string, any>
}

export interface TemplateVariable {
  variable_id: string
  variable_name: string
  variable_type: VariableType
  variable_definition: VariableDefinition
  validation_rules: ValidationRule[]
  resolution_hints: ResolutionHint[]
  metadata: VariableMetadata
}

export type VariableType = 
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'markdown'
  | 'html'
  | 'json'
  | 'computed'
  | 'conditional'

export interface VariableDefinition {
  description: string
  default_value?: any
  required: boolean
  format?: string
  constraints?: VariableConstraint[]
  examples?: any[]
  documentation?: string
}

export interface VariableConstraint {
  constraint_type: 'min_length' | 'max_length' | 'min_value' | 'max_value' | 'pattern' | 'enum' | 'custom'
  constraint_value: any
  error_message: string
}

export interface ValidationRule {
  rule_id: string
  rule_type: ValidationRuleType
  rule_expression: string
  error_message: string
  severity: 'error' | 'warning' | 'info'
}

export type ValidationRuleType = 
  | 'required'
  | 'format'
  | 'length'
  | 'range'
  | 'pattern'
  | 'custom'
  | 'business_logic'

export interface ResolutionHint {
  hint_id: string
  hint_type: ResolutionHintType
  hint_value: any
  confidence: number
  source: string
}

export type ResolutionHintType = 
  | 'context_path'
  | 'user_profile_field'
  | 'external_api_endpoint'
  | 'database_table'
  | 'file_path'
  | 'computation_expression'
  | 'ai_prompt'

export interface VariableMetadata {
  created_at: Date
  updated_at: Date
  created_by: string
  tags: string[]
  category: string
  usage_count: number
  last_used?: Date
  performance_metrics: VariablePerformanceMetrics
}

export interface VariablePerformanceMetrics {
  average_resolution_time: number
  success_rate: number
  cache_hit_rate: number
  quality_score: number
  user_satisfaction: number
}

export interface ResolutionContext {
  context_id: string
  project_context: ProjectContext
  user_context: UserContext
  template_context: TemplateContext
  historical_context: HistoricalContext
  external_context: ExternalContext
  metadata: ContextMetadata
}

export interface ProjectContext {
  project_id: string
  project_name: string
  project_description: string
  project_type: string
  stakeholders: Stakeholder[]
  requirements: Requirement[]
  constraints: Constraint[]
  risks: Risk[]
  milestones: Milestone[]
  phases: Phase[]
  metadata: Record<string, any>
}

export interface UserContext {
  user_id: string
  user_profile: UserProfile
  user_preferences: UserPreference[]
  user_expertise: UserExpertise[]
  user_writing_style: UserWritingStyle
  user_domain_knowledge: UserDomainKnowledge[]
  user_collaboration_preferences: UserCollaborationPreference[]
  metadata: Record<string, any>
}

export interface TemplateContext {
  template_id: string
  template_name: string
  template_framework: string
  template_category: string
  template_variables: TemplateVariable[]
  template_structure: TemplateStructure
  template_metadata: Record<string, any>
}

export interface HistoricalContext {
  document_history: DocumentHistory[]
  usage_patterns: UsagePattern[]
  quality_trends: QualityTrend[]
  best_practices: BestPractice[]
  lessons_learned: LessonLearned[]
}

export interface ExternalContext {
  external_sources: ExternalSource[]
  api_responses: ApiResponse[]
  file_contents: FileContent[]
  database_results: DatabaseResult[]
}

export interface ContextMetadata {
  context_quality: number
  context_freshness: number
  context_completeness: number
  context_relevance: number
  context_confidence: number
  last_updated: Date
  update_frequency: string
}

export interface VariableResolutionResult {
  result_id: string
  request_id: string
  resolved_variables: VariableResolution[]
  unresolved_variables: UnresolvedVariable[]
  resolution_metrics: ResolutionMetrics
  quality_assessment: QualityAssessment
  recommendations: ResolutionRecommendation[]
  metadata: Record<string, any>
}

export interface VariableResolution {
  resolution_id: string
  variable_id: string
  variable_name: string
  resolved_value: any
  resolution_strategy: string
  resolution_confidence: number
  resolution_quality: number
  resolution_source: string
  resolution_timestamp: Date
  resolution_duration: number
  validation_result: ValidationResult
  metadata: ResolutionMetadata
}

export interface UnresolvedVariable {
  variable_id: string
  variable_name: string
  resolution_attempts: ResolutionAttempt[]
  failure_reasons: string[]
  suggested_strategies: string[]
  fallback_options: any[]
}

export interface ResolutionAttempt {
  attempt_id: string
  strategy_used: string
  attempt_timestamp: Date
  attempt_duration: number
  error_message: string
  error_code: string
  context_used: Record<string, any>
}

export interface ResolutionMetrics {
  total_variables: number
  resolved_variables: number
  unresolved_variables: number
  resolution_success_rate: number
  average_resolution_time: number
  total_resolution_time: number
  cache_hits: number
  cache_misses: number
  cache_hit_rate: number
  quality_scores: QualityScore[]
  performance_metrics: PerformanceMetric[]
}

export interface QualityScore {
  metric_name: string
  score: number
  weight: number
  description: string
}

export interface PerformanceMetric {
  metric_name: string
  value: number
  unit: string
  timestamp: Date
}

export interface QualityAssessment {
  overall_quality: number
  resolution_quality: number
  context_quality: number
  strategy_effectiveness: number
  user_satisfaction: number
  quality_factors: QualityFactor[]
  quality_issues: QualityIssue[]
}

export interface QualityFactor {
  factor_name: string
  factor_score: number
  factor_weight: number
  factor_description: string
}

export interface QualityIssue {
  issue_id: string
  issue_type: string
  issue_description: string
  issue_severity: 'low' | 'medium' | 'high' | 'critical'
  issue_location: string
  suggested_fix: string
}

export interface ResolutionRecommendation {
  recommendation_id: string
  recommendation_type: RecommendationType
  recommendation_title: string
  recommendation_description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  implementation: string
  expected_impact: number
  effort_required: 'low' | 'medium' | 'high'
}

export type RecommendationType = 
  | 'strategy_optimization'
  | 'context_enhancement'
  | 'variable_definition_improvement'
  | 'performance_optimization'
  | 'quality_improvement'
  | 'user_experience'

export interface ResolutionMetadata {
  resolution_version: string
  resolution_engine: string
  resolution_config: Record<string, any>
  context_sources: string[]
  strategy_sequence: string[]
  performance_data: Record<string, any>
}

export interface VariableAnalysis {
  analysis_id: string
  template_id: string
  total_variables: number
  variable_types: VariableTypeAnalysis[]
  complexity_analysis: ComplexityAnalysis
  dependency_analysis: DependencyAnalysis
  quality_analysis: QualityAnalysis
  recommendations: AnalysisRecommendation[]
}

export interface VariableTypeAnalysis {
  variable_type: VariableType
  count: number
  percentage: number
  complexity_score: number
  resolution_difficulty: 'low' | 'medium' | 'high'
}

export interface ComplexityAnalysis {
  overall_complexity: number
  complexity_factors: ComplexityFactor[]
  complexity_score: number
  complexity_level: 'low' | 'medium' | 'high' | 'very_high'
}

export interface ComplexityFactor {
  factor_name: string
  factor_score: number
  factor_weight: number
  factor_description: string
}

export interface DependencyAnalysis {
  variable_dependencies: VariableDependency[]
  dependency_graph: DependencyGraph
  circular_dependencies: CircularDependency[]
  resolution_order: string[]
}

export interface VariableDependency {
  variable_id: string
  depends_on: string[]
  depended_by: string[]
  dependency_type: 'direct' | 'indirect' | 'conditional'
}

export interface DependencyGraph {
  nodes: DependencyNode[]
  edges: DependencyEdge[]
  cycles: string[][]
}

export interface DependencyNode {
  node_id: string
  variable_id: string
  node_type: 'variable' | 'computation' | 'external'
  properties: Record<string, any>
}

export interface DependencyEdge {
  edge_id: string
  source_node: string
  target_node: string
  edge_type: 'depends_on' | 'computed_from' | 'conditional'
  properties: Record<string, any>
}

export interface CircularDependency {
  cycle_id: string
  variables_involved: string[]
  cycle_length: number
  severity: 'low' | 'medium' | 'high'
  resolution_strategy: string
}

export interface QualityAnalysis {
  overall_quality: number
  quality_dimensions: QualityDimension[]
  quality_issues: QualityIssue[]
  quality_trends: QualityTrend[]
}

export interface QualityDimension {
  dimension_name: string
  dimension_score: number
  dimension_weight: number
  dimension_description: string
}

export interface AnalysisRecommendation {
  recommendation_id: string
  recommendation_type: string
  recommendation_title: string
  recommendation_description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  implementation: string
  expected_impact: number
}

export interface VariablePattern {
  pattern_id: string
  pattern_name: string
  pattern_type: PatternType
  pattern_expression: string
  pattern_confidence: number
  pattern_frequency: number
  pattern_examples: string[]
  pattern_metadata: Record<string, any>
}

export type PatternType = 
  | 'naming_convention'
  | 'value_pattern'
  | 'dependency_pattern'
  | 'usage_pattern'
  | 'resolution_pattern'
  | 'quality_pattern'

export interface EnrichedContext {
  original_context: ResolutionContext
  enriched_data: Record<string, any>
  enrichment_sources: string[]
  enrichment_confidence: number
  enrichment_metadata: Record<string, any>
}

export interface VariableUsageStats {
  variable_name: string
  total_usage_count: number
  successful_resolutions: number
  failed_resolutions: number
  success_rate: number
  average_resolution_time: number
  most_used_strategies: string[]
  quality_trends: QualityTrend[]
  performance_trends: PerformanceTrend[]
}

export interface PerformanceTrend {
  metric_name: string
  trend_data: TrendDataPoint[]
  trend_direction: 'improving' | 'declining' | 'stable'
  trend_confidence: number
}

export interface TrendDataPoint {
  timestamp: Date
  value: number
  context: Record<string, any>
}

// Supporting types
export interface Stakeholder {
  stakeholder_id: string
  name: string
  role: string
  contact_info: string
  influence: 'low' | 'medium' | 'high'
  interest: 'low' | 'medium' | 'high'
}

export interface Requirement {
  requirement_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'draft' | 'approved' | 'implemented' | 'verified'
}

export interface Constraint {
  constraint_id: string
  title: string
  description: string
  type: 'technical' | 'business' | 'regulatory' | 'resource'
  impact: 'low' | 'medium' | 'high'
}

export interface Risk {
  risk_id: string
  title: string
  description: string
  probability: 'low' | 'medium' | 'high'
  impact: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface Milestone {
  milestone_id: string
  title: string
  description: string
  due_date: Date
  status: 'planned' | 'in_progress' | 'completed' | 'delayed'
}

export interface Phase {
  phase_id: string
  title: string
  description: string
  start_date: Date
  end_date: Date
  status: 'planned' | 'active' | 'completed'
}

export interface UserProfile {
  user_id: string
  name: string
  email: string
  role: string
  department: string
  expertise_areas: string[]
  preferences: Record<string, any>
}

export interface UserPreference {
  preference_id: string
  preference_type: string
  preference_value: any
  preference_priority: number
}

export interface UserExpertise {
  expertise_id: string
  domain: string
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years_of_experience: number
  certifications: string[]
}

export interface UserWritingStyle {
  style_id: string
  tone: string
  formality: 'casual' | 'professional' | 'formal'
  structure_preference: string
  length_preference: 'short' | 'medium' | 'long'
}

export interface UserDomainKnowledge {
  knowledge_id: string
  domain: string
  knowledge_level: 'basic' | 'intermediate' | 'advanced' | 'expert'
  knowledge_areas: string[]
}

export interface UserCollaborationPreference {
  preference_id: string
  collaboration_type: string
  preference_value: any
  preference_priority: number
}

export interface TemplateStructure {
  structure_id: string
  sections: TemplateSection[]
  hierarchy: StructureHierarchy
  metadata: Record<string, any>
}

export interface TemplateSection {
  section_id: string
  section_name: string
  section_type: string
  section_content: any
  section_variables: string[]
}

export interface StructureHierarchy {
  root_section: string
  section_relationships: SectionRelationship[]
}

export interface SectionRelationship {
  parent_section: string
  child_section: string
  relationship_type: 'contains' | 'depends_on' | 'related_to'
}

export interface DocumentHistory {
  document_id: string
  document_name: string
  document_type: string
  created_at: Date
  updated_at: Date
  created_by: string
  usage_count: number
  quality_score: number
}

export interface UsagePattern {
  pattern_id: string
  pattern_type: string
  pattern_description: string
  pattern_frequency: number
  pattern_confidence: number
}

export interface QualityTrend {
  trend_id: string
  metric_name: string
  trend_data: TrendDataPoint[]
  trend_direction: 'improving' | 'declining' | 'stable'
}

export interface BestPractice {
  practice_id: string
  practice_name: string
  practice_description: string
  practice_category: string
  practice_effectiveness: number
}

export interface LessonLearned {
  lesson_id: string
  lesson_title: string
  lesson_description: string
  lesson_category: string
  lesson_impact: 'low' | 'medium' | 'high'
}

export interface ExternalSource {
  source_id: string
  source_type: string
  source_name: string
  source_url: string
  source_credentials: Record<string, any>
}

export interface ApiResponse {
  response_id: string
  api_endpoint: string
  response_data: any
  response_status: number
  response_timestamp: Date
}

export interface FileContent {
  file_id: string
  file_path: string
  file_content: any
  file_type: string
  file_size: number
}

export interface DatabaseResult {
  result_id: string
  query: string
  result_data: any
  result_count: number
  execution_time: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
}

export interface ValidationError {
  field: string
  error_code: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationWarning {
  field: string
  warning_code: string
  message: string
  impact: string
}

export interface ValidationSuggestion {
  field: string
  suggestion: string
  reason: string
  impact: string
}

export interface DocumentTemplate {
  id: string
  name: string
  description: string
  framework: string
  category: string
  content: any
  variables: TemplateVariable[]
  metadata: Record<string, any>
}

