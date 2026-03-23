/**
 * Context Bundle Types
 * Defines TypeScript interfaces and types for context aggregation and organization
 */

export interface ContextBundle {
  id: string
  name: string
  description?: string
  bundle_type: ContextBundleType
  sources: ContextSource[]
  aggregated_context: AggregatedContext
  organization_strategy: OrganizationStrategy
  priority: ContextPriority
  freshness: ContextFreshness
  metadata: ContextMetadata
  created_at: Date
  updated_at: Date
  expires_at?: Date
}

export type ContextBundleType = 
  | 'project_context'
  | 'user_context'
  | 'document_context'
  | 'template_context'
  | 'framework_context'
  | 'comprehensive_context'
  | 'custom_context'

export interface ContextSource {
  id: string
  name: string
  type: ContextSourceType
  source_id: string
  source_name: string
  weight: number
  priority: ContextPriority
  freshness: ContextFreshness
  data: any
  metadata: ContextSourceMetadata
  retrieved_at: Date
  expires_at?: Date
}

export type ContextSourceType = 
  | 'project_data'
  | 'user_preferences'
  | 'document_history'
  | 'template_data'
  | 'framework_data'
  | 'external_api'
  | 'database_query'
  | 'file_content'
  | 'semantic_search'
  | 'historical_analysis'
  | 'best_practices'
  | 'pattern_data'

export interface AggregatedContext {
  structured_data: StructuredContextData
  unstructured_data: UnstructuredContextData
  semantic_data: SemanticContextData
  temporal_data: TemporalContextData
  quality_metrics: ContextQualityMetrics
  relevance_scores: ContextRelevanceScores
  confidence_scores: ContextConfidenceScores
}

export interface StructuredContextData {
  project_info: ProjectContextInfo
  user_info: UserContextInfo
  document_info: DocumentContextInfo
  template_info: TemplateContextInfo
  framework_info: FrameworkContextInfo
  stakeholder_data: StakeholderContextData[]
  requirement_data: RequirementContextData[]
  risk_data: RiskContextData[]
  constraint_data: ConstraintContextData[]
  metadata: Record<string, any>
}

export interface UnstructuredContextData {
  text_content: string
  markdown_content: string
  html_content: string
  raw_content: string
  extracted_insights: string[]
  key_phrases: string[]
  topics: string[]
  sentiment: ContextSentiment
  language: string
  content_type: string
}

export interface SemanticContextData {
  embeddings: number[][]
  semantic_similarity: number
  topic_modeling: TopicModelingData
  entity_extraction: EntityExtractionData
  relationship_mapping: RelationshipMappingData
  concept_graph: ConceptGraphData
  knowledge_graph: KnowledgeGraphData
}

export interface TemporalContextData {
  creation_timeline: TimelineData[]
  modification_timeline: TimelineData[]
  usage_timeline: TimelineData[]
  trend_data: TrendData[]
  seasonal_patterns: SeasonalPatternData[]
  temporal_relevance: number
}

export interface ContextQualityMetrics {
  completeness_score: number
  accuracy_score: number
  relevance_score: number
  freshness_score: number
  consistency_score: number
  reliability_score: number
  overall_quality_score: number
}

export interface ContextRelevanceScores {
  semantic_relevance: number
  temporal_relevance: number
  user_relevance: number
  project_relevance: number
  framework_relevance: number
  overall_relevance: number
}

export interface ContextConfidenceScores {
  data_confidence: number
  source_confidence: number
  aggregation_confidence: number
  semantic_confidence: number
  temporal_confidence: number
  overall_confidence: number
}

export interface OrganizationStrategy {
  strategy_type: OrganizationStrategyType
  grouping_criteria: GroupingCriteria[]
  sorting_criteria: SortingCriteria[]
  filtering_criteria: FilteringCriteria[]
  deduplication_strategy: DeduplicationStrategy
  prioritization_strategy: PrioritizationStrategy
  chunking_strategy: ChunkingStrategy
}

export type OrganizationStrategyType = 
  | 'hierarchical'
  | 'chronological'
  | 'semantic'
  | 'priority_based'
  | 'relevance_based'
  | 'custom'

export interface GroupingCriteria {
  field: string
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'regex'
  value: any
  weight: number
}

export interface SortingCriteria {
  field: string
  direction: 'asc' | 'desc'
  weight: number
}

export interface FilteringCriteria {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains'
  value: any
  weight: number
}

export interface DeduplicationStrategy {
  enabled: boolean
  method: 'exact_match' | 'semantic_similarity' | 'fuzzy_match' | 'hash_based'
  threshold: number
  preserve_metadata: boolean
}

export interface PrioritizationStrategy {
  enabled: boolean
  method: 'weight_based' | 'relevance_based' | 'freshness_based' | 'confidence_based'
  criteria: PrioritizationCriteria[]
}

export interface PrioritizationCriteria {
  field: string
  weight: number
  direction: 'asc' | 'desc'
}

export interface ChunkingStrategy {
  enabled: boolean
  method: 'fixed_size' | 'semantic' | 'sentence_based' | 'paragraph_based'
  chunk_size: number
  overlap: number
  preserve_structure: boolean
}

export type ContextPriority = 'low' | 'medium' | 'high' | 'critical'

export interface ContextFreshness {
  last_updated: Date
  update_frequency: UpdateFrequency
  staleness_threshold: number
  freshness_score: number
  auto_refresh: boolean
  refresh_interval?: number
}

export type UpdateFrequency = 'real_time' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'manual'

export interface ContextMetadata {
  version: string
  schema_version: string
  created_by: string
  tags: string[]
  categories: string[]
  framework: string
  methodology: string
  compliance_level: string
  security_level: string
  access_control: AccessControlMetadata
  audit_trail: AuditTrailEntry[]
  performance_metrics: PerformanceMetrics
}

export interface ContextSourceMetadata {
  source_version: string
  source_schema: string
  extraction_method: string
  transformation_applied: string[]
  validation_status: 'valid' | 'invalid' | 'pending'
  quality_score: number
  reliability_score: number
  last_verified: Date
}

export interface ProjectContextInfo {
  project_id: string
  project_name: string
  project_description: string
  project_status: string
  project_phase: string
  project_manager: string
  team_members: string[]
  stakeholders: string[]
  objectives: string[]
  scope: string
  timeline: string
  budget: string
  risks: string[]
  constraints: string[]
}

export interface UserContextInfo {
  user_id: string
  username: string
  email: string
  role: string
  department: string
  expertise_areas: string[]
  preferences: UserPreferences
  writing_style: WritingStyle
  collaboration_preferences: CollaborationPreferences
  domain_knowledge: DomainKnowledge[]
}

export interface DocumentContextInfo {
  document_id: string
  document_name: string
  document_type: string
  document_category: string
  framework: string
  methodology: string
  template_id: string
  template_name: string
  content_structure: string
  quality_metrics: DocumentQualityMetrics
  usage_patterns: UsagePatterns
  revision_history: RevisionHistory[]
}

export interface TemplateContextInfo {
  template_id: string
  template_name: string
  template_description: string
  framework: string
  category: string
  variables: TemplateVariable[]
  sections: TemplateSection[]
  ai_enhancements: AIEnhancements
  usage_statistics: UsageStatistics
  quality_metrics: TemplateQualityMetrics
}

export interface FrameworkContextInfo {
  framework_name: string
  framework_version: string
  methodology: string
  best_practices: BestPractice[]
  patterns: FrameworkPattern[]
  compliance_requirements: ComplianceRequirement[]
  quality_standards: QualityStandard[]
  guidelines: Guideline[]
}

export interface StakeholderContextData {
  stakeholder_id: string
  name: string
  role: string
  influence: number
  interest: number
  requirements: string[]
  concerns: string[]
  communication_preferences: string[]
}

export interface RequirementContextData {
  requirement_id: string
  title: string
  description: string
  type: string
  priority: string
  status: string
  source: string
  acceptance_criteria: string[]
  dependencies: string[]
}

export interface RiskContextData {
  risk_id: string
  title: string
  description: string
  probability: number
  impact: number
  risk_level: string
  mitigation_strategies: string[]
  owner: string
  status: string
}

export interface ConstraintContextData {
  constraint_id: string
  title: string
  description: string
  type: string
  impact: string
  flexibility: string
  owner: string
  status: string
}

export interface TopicModelingData {
  topics: Topic[]
  topic_distribution: number[]
  topic_coherence: number
  topic_diversity: number
}

export interface Topic {
  id: string
  name: string
  keywords: string[]
  weight: number
  coherence: number
}

export interface EntityExtractionData {
  entities: Entity[]
  entity_relationships: EntityRelationship[]
  entity_coverage: number
}

export interface Entity {
  id: string
  text: string
  type: string
  confidence: number
  start_index: number
  end_index: number
}

export interface EntityRelationship {
  source_entity: string
  target_entity: string
  relationship_type: string
  confidence: number
}

export interface RelationshipMappingData {
  relationships: Relationship[]
  relationship_strength: number
  network_density: number
}

export interface Relationship {
  id: string
  source: string
  target: string
  type: string
  strength: number
  confidence: number
}

export interface ConceptGraphData {
  concepts: Concept[]
  concept_relationships: ConceptRelationship[]
  graph_density: number
}

export interface Concept {
  id: string
  name: string
  definition: string
  frequency: number
  importance: number
}

export interface ConceptRelationship {
  source_concept: string
  target_concept: string
  relationship_type: string
  strength: number
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  edges: KnowledgeEdge[]
  graph_metrics: GraphMetrics
}

export interface KnowledgeNode {
  id: string
  label: string
  type: string
  properties: Record<string, any>
  importance: number
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  type: string
  weight: number
  properties: Record<string, any>
}

export interface GraphMetrics {
  node_count: number
  edge_count: number
  density: number
  clustering_coefficient: number
  average_path_length: number
}

export interface TimelineData {
  timestamp: Date
  event_type: string
  event_description: string
  actor: string
  impact: string
  metadata: Record<string, any>
}

export interface TrendData {
  metric_name: string
  time_series: TimeSeriesPoint[]
  trend_direction: 'increasing' | 'decreasing' | 'stable'
  trend_strength: number
  seasonality: boolean
  forecast: ForecastData
}

export interface TimeSeriesPoint {
  timestamp: Date
  value: number
  confidence: number
}

export interface ForecastData {
  next_value: number
  confidence_interval: [number, number]
  forecast_horizon: number
  accuracy: number
}

export interface SeasonalPatternData {
  pattern_type: string
  frequency: string
  amplitude: number
  phase: number
  significance: number
}

export interface ContextSentiment {
  overall_sentiment: 'positive' | 'negative' | 'neutral'
  sentiment_score: number
  emotion_scores: Record<string, number>
  confidence: number
}

export interface UserPreferences {
  language: string
  timezone: string
  notification_preferences: NotificationPreferences
  display_preferences: DisplayPreferences
  collaboration_preferences: CollaborationPreferences
  quality_preferences: QualityPreferences
}

export interface NotificationPreferences {
  email_notifications: boolean
  push_notifications: boolean
  frequency: string
  types: string[]
}

export interface DisplayPreferences {
  theme: string
  font_size: string
  layout: string
  color_scheme: string
}

export interface CollaborationPreferences {
  communication_style: string
  feedback_preferences: string
  meeting_preferences: string
  document_sharing: string
}

export interface QualityPreferences {
  quality_threshold: number
  review_requirements: string[]
  approval_workflow: string
  quality_metrics: string[]
}

export interface WritingStyle {
  formality_level: string
  tone: string
  structure_preference: string
  length_preference: string
  citation_style: string
  language_preferences: string[]
}

export interface DomainKnowledge {
  domain: string
  expertise_level: number
  years_of_experience: number
  certifications: string[]
  specializations: string[]
}

export interface DocumentQualityMetrics {
  completeness: number
  accuracy: number
  clarity: number
  consistency: number
  readability: number
  overall_score: number
}

export interface ContextAggregator {
  aggregate(sources: ContextSource[]): Promise<AggregatedContext>
}

export interface ContextOrganizer {
  organize(context: AggregatedContext): Promise<AggregatedContext>
}

export interface ContextValidator {
  validate(context: AggregatedContext): Promise<boolean>
}

export interface ContextOptimizer {
  optimize(context: AggregatedContext): Promise<AggregatedContext>
}

export interface UsagePatterns {
  access_frequency: number
  modification_frequency: number
  sharing_frequency: number
  collaboration_level: number
  user_engagement: number
}

export interface RevisionHistory {
  revision_id: string
  timestamp: Date
  author: string
  changes: string[]
  version: string
  comments: string
}

export interface TemplateVariable {
  name: string
  type: string
  description: string
  required: boolean
  default_value: any
  validation_rules: string[]
}

export interface TemplateSection {
  name: string
  type: string
  content: string
  required: boolean
  order: number
  variables: string[]
}

export interface AIEnhancements {
  system_prompt: string
  context_injection_config: any
  prompt_build_up: any
  ai_capabilities: string[]
}

export interface UsageStatistics {
  total_usage: number
  recent_usage: number
  success_rate: number
  average_quality: number
  user_satisfaction: number
}

export interface TemplateQualityMetrics {
  completeness: number
  clarity: number
  usability: number
  effectiveness: number
  overall_score: number
}

export interface BestPractice {
  id: string
  name: string
  description: string
  category: string
  effectiveness: number
  applicability: number
}

export interface FrameworkPattern {
  id: string
  name: string
  description: string
  type: string
  frequency: number
  effectiveness: number
}

export interface ComplianceRequirement {
  id: string
  name: string
  description: string
  level: string
  mandatory: boolean
  validation_criteria: string[]
}

export interface QualityStandard {
  id: string
  name: string
  description: string
  criteria: string[]
  measurement_method: string
}

export interface Guideline {
  id: string
  name: string
  description: string
  category: string
  priority: string
  implementation_notes: string
}

export interface AccessControlMetadata {
  owner: string
  permissions: Permission[]
  sharing_settings: SharingSettings
  privacy_level: string
}

export interface Permission {
  user_id: string
  role: string
  actions: string[]
  granted_at: Date
  expires_at?: Date
}

export interface SharingSettings {
  public: boolean
  shared_with: string[]
  sharing_level: string
  expiration_date?: Date
}

export interface AuditTrailEntry {
  id: string
  timestamp: Date
  user_id: string
  action: string
  resource: string
  details: string
  ip_address: string
  user_agent: string
}

export interface PerformanceMetrics {
  creation_time: number
  aggregation_time: number
  processing_time: number
  memory_usage: number
  cpu_usage: number
  network_usage: number
}

export interface ContextBundleService {
  // Bundle management
  createBundle(config: ContextBundleConfig): Promise<ContextBundle>
  updateBundle(bundleId: string, updates: Partial<ContextBundle>): Promise<ContextBundle>
  deleteBundle(bundleId: string): Promise<void>
  getBundle(bundleId: string): Promise<ContextBundle | null>
  listBundles(filters?: BundleFilters): Promise<ContextBundle[]>
  
  // Context aggregation
  aggregateContext(sources: ContextSource[]): Promise<AggregatedContext>
  organizeContext(context: AggregatedContext, strategy: OrganizationStrategy): Promise<AggregatedContext>
  prioritizeContext(context: AggregatedContext, strategy: PrioritizationStrategy): Promise<AggregatedContext>
  deduplicateContext(context: AggregatedContext, strategy: DeduplicationStrategy): Promise<AggregatedContext>
  
  // Context processing
  processContext(bundleId: string): Promise<ProcessedContext>
  refreshContext(bundleId: string): Promise<ContextBundle>
  validateContext(bundleId: string): Promise<ValidationResult>
  optimizeContext(bundleId: string): Promise<OptimizationResult>
  
  // Context retrieval
  getContextByType(type: ContextBundleType, filters?: ContextFilters): Promise<ContextBundle[]>
  getContextBySource(sourceType: ContextSourceType, sourceId: string): Promise<ContextBundle[]>
  getContextByPriority(priority: ContextPriority): Promise<ContextBundle[]>
  getContextByFreshness(freshnessThreshold: number): Promise<ContextBundle[]>
  
  // Context analytics
  analyzeContextUsage(bundleId: string): Promise<UsageAnalytics>
  analyzeContextQuality(bundleId: string): Promise<QualityAnalytics>
  analyzeContextPerformance(bundleId: string): Promise<PerformanceAnalytics>
  generateContextInsights(bundleId: string): Promise<ContextInsights>
}

export interface ContextBundleConfig {
  name: string
  description?: string
  bundle_type: ContextBundleType
  sources: ContextSourceConfig[]
  organization_strategy: OrganizationStrategy
  priority: ContextPriority
  freshness: ContextFreshness
  metadata: ContextMetadata
  expires_at?: Date
}

export interface ContextSourceConfig {
  name: string
  type: ContextSourceType
  source_id: string
  source_name: string
  weight: number
  priority: ContextPriority
  freshness: ContextFreshness
  parameters?: Record<string, any>
}

export interface BundleFilters {
  bundle_type?: ContextBundleType
  priority?: ContextPriority
  created_by?: string
  created_after?: Date
  created_before?: Date
  tags?: string[]
  framework?: string
}

export interface ContextFilters {
  source_type?: ContextSourceType
  priority?: ContextPriority
  freshness_threshold?: number
  quality_threshold?: number
  relevance_threshold?: number
}

export interface ProcessedContext {
  bundle_id: string
  processed_at: Date
  processing_time: number
  context_size: number
  quality_metrics: ContextQualityMetrics
  performance_metrics: PerformanceMetrics
  insights: ContextInsights
}

export interface ValidationResult {
  bundle_id: string
  validated_at: Date
  is_valid: boolean
  validation_errors: ValidationError[]
  validation_warnings: ValidationWarning[]
  quality_score: number
}

export interface ValidationError {
  field: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationWarning {
  field: string
  message: string
  suggestion: string
}

export interface OptimizationResult {
  bundle_id: string
  optimized_at: Date
  optimization_time: number
  improvements: OptimizationImprovement[]
  performance_gains: PerformanceGains
  quality_improvements: QualityImprovements
}

export interface OptimizationImprovement {
  type: string
  description: string
  impact: number
  implementation: string
}

export interface PerformanceGains {
  processing_time_improvement: number
  memory_usage_improvement: number
  cpu_usage_improvement: number
  network_usage_improvement: number
}

export interface QualityImprovements {
  completeness_improvement: number
  accuracy_improvement: number
  relevance_improvement: number
  freshness_improvement: number
  consistency_improvement: number
}

export interface UsageAnalytics {
  bundle_id: string
  usage_count: number
  unique_users: number
  average_session_duration: number
  peak_usage_times: Date[]
  usage_patterns: UsagePatterns[]
  user_satisfaction: number
}

export interface QualityAnalytics {
  bundle_id: string
  overall_quality_score: number
  quality_trends: QualityTrend[]
  quality_distribution: QualityDistribution
  improvement_areas: string[]
  strengths: string[]
}

export interface QualityTrend {
  metric: string
  trend_direction: 'improving' | 'declining' | 'stable'
  change_rate: number
  confidence: number
}

export interface QualityDistribution {
  excellent: number
  good: number
  average: number
  poor: number
}

export interface PerformanceAnalytics {
  bundle_id: string
  average_processing_time: number
  memory_usage_patterns: MemoryUsagePattern[]
  cpu_usage_patterns: CpuUsagePattern[]
  network_usage_patterns: NetworkUsagePattern[]
  performance_bottlenecks: PerformanceBottleneck[]
}

export interface MemoryUsagePattern {
  timestamp: Date
  usage: number
  peak: boolean
}

export interface CpuUsagePattern {
  timestamp: Date
  usage: number
  peak: boolean
}

export interface NetworkUsagePattern {
  timestamp: Date
  usage: number
  peak: boolean
}

export interface PerformanceBottleneck {
  type: string
  description: string
  impact: number
  frequency: number
}

export interface ContextInsights {
  bundle_id: string
  generated_at: Date
  key_insights: KeyInsight[]
  recommendations: Recommendation[]
  trends: Trend[]
  anomalies: Anomaly[]
  opportunities: Opportunity[]
}

export interface KeyInsight {
  type: string
  title: string
  description: string
  confidence: number
  impact: number
  evidence: string[]
}

export interface Recommendation {
  type: string
  title: string
  description: string
  priority: ContextPriority
  implementation_effort: 'low' | 'medium' | 'high'
  expected_benefit: string
  steps: string[]
}

export interface Trend {
  metric: string
  direction: 'increasing' | 'decreasing' | 'stable'
  strength: number
  timeframe: string
  significance: number
}

export interface Anomaly {
  type: string
  description: string
  severity: 'low' | 'medium' | 'high'
  detected_at: Date
  impact: string
  recommended_action: string
}

export interface Opportunity {
  type: string
  title: string
  description: string
  potential_impact: number
  implementation_complexity: 'low' | 'medium' | 'high'
  timeframe: string
  resources_required: string[]
}
