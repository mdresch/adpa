/**
 * Context Freshness Management Types
 * Defines TypeScript interfaces and types for time-based prioritization and freshness management
 */

export interface ContextFreshnessManager {
  // Freshness assessment
  assessFreshness(contextId: string): Promise<FreshnessAssessment>
  assessBatchFreshness(contextIds: string[]): Promise<FreshnessAssessment[]>
  calculateFreshnessScore(context: ContextItem): Promise<number>
  calculateDecayRate(context: ContextItem): Promise<number>
  
  // Time-based prioritization
  prioritizeByFreshness(contexts: ContextItem[]): Promise<PrioritizedContext[]>
  prioritizeByTimeDecay(contexts: ContextItem[]): Promise<PrioritizedContext[]>
  prioritizeByUpdateFrequency(contexts: ContextItem[]): Promise<PrioritizedContext[]>
  prioritizeByAccessPattern(contexts: ContextItem[]): Promise<PrioritizedContext[]>
  
  // Freshness management
  refreshContext(contextId: string): Promise<RefreshResult>
  refreshBatchContexts(contextIds: string[]): Promise<RefreshResult[]>
  scheduleRefresh(contextId: string, schedule: RefreshSchedule): Promise<void>
  cancelScheduledRefresh(contextId: string): Promise<void>
  
  // Staleness management
  identifyStaleContexts(threshold?: number): Promise<StaleContext[]>
  markAsStale(contextId: string, reason: string): Promise<void>
  markAsFresh(contextId: string): Promise<void>
  cleanupStaleContexts(threshold?: number): Promise<CleanupResult>
  
  // Freshness policies
  applyFreshnessPolicy(contextId: string, policy: FreshnessPolicy): Promise<PolicyResult>
  evaluateFreshnessPolicy(policy: FreshnessPolicy, contexts: ContextItem[]): Promise<PolicyEvaluation>
  updateFreshnessPolicy(policyId: string, updates: Partial<FreshnessPolicy>): Promise<FreshnessPolicy>
  
  // Analytics and monitoring
  getFreshnessMetrics(timeframe: string): Promise<FreshnessMetrics>
  getFreshnessTrends(contextId: string, timeframe: string): Promise<FreshnessTrend[]>
  getStalenessReport(): Promise<StalenessReport>
  monitorFreshnessHealth(): Promise<FreshnessHealthStatus>
}

export interface ContextItem {
  id: string
  type: ContextType
  source: string
  content: any
  metadata: ContextMetadata
  freshness: FreshnessInfo
  access_pattern: AccessPattern
  update_history: UpdateHistory[]
  created_at: Date
  updated_at: Date
  last_accessed_at?: Date
  expires_at?: Date
}

export type ContextType = 
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

export interface ContextMetadata {
  version: string
  schema_version: string
  source_reliability: number
  data_quality: number
  importance_level: 'low' | 'medium' | 'high' | 'critical'
  category: string
  tags: string[]
  dependencies: string[]
  related_contexts: string[]
}

export interface FreshnessInfo {
  freshness_score: number
  last_updated: Date
  update_frequency: UpdateFrequency
  staleness_threshold: number
  decay_rate: number
  freshness_policy: string
  auto_refresh: boolean
  refresh_interval?: number
  next_refresh_at?: Date
  freshness_history: FreshnessHistoryEntry[]
}

export type UpdateFrequency = 
  | 'real_time'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'manual'
  | 'event_driven'

export interface AccessPattern {
  access_frequency: number
  last_access: Date
  access_trend: 'increasing' | 'decreasing' | 'stable'
  peak_access_times: Date[]
  access_distribution: AccessDistribution
  user_access_patterns: UserAccessPattern[]
}

export interface AccessDistribution {
  hourly: number[]
  daily: number[]
  weekly: number[]
  monthly: number[]
}

export interface UserAccessPattern {
  user_id: string
  access_frequency: number
  last_access: Date
  access_duration: number
  access_type: 'read' | 'write' | 'update' | 'delete'
}

export interface UpdateHistory {
  timestamp: Date
  version: string
  changes: string[]
  user_id: string
  change_type: 'create' | 'update' | 'delete' | 'refresh'
  impact_level: 'low' | 'medium' | 'high'
  validation_status: 'valid' | 'invalid' | 'pending'
}

export interface FreshnessHistoryEntry {
  timestamp: Date
  freshness_score: number
  decay_rate: number
  update_frequency: UpdateFrequency
  access_count: number
  quality_score: number
}

export interface FreshnessAssessment {
  context_id: string
  assessed_at: Date
  freshness_score: number
  staleness_level: StalenessLevel
  decay_rate: number
  time_since_update: number
  time_since_access: number
  freshness_trend: FreshnessTrend
  recommendations: FreshnessRecommendation[]
  next_assessment_at: Date
}

export type StalenessLevel = 
  | 'fresh'
  | 'slightly_stale'
  | 'moderately_stale'
  | 'very_stale'
  | 'extremely_stale'
  | 'expired'

export interface FreshnessTrend {
  direction: 'improving' | 'declining' | 'stable'
  rate: number
  confidence: number
  timeframe: string
  data_points: number
}

export interface FreshnessRecommendation {
  type: RecommendationType
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  action: string
  expected_impact: number
  implementation_effort: 'low' | 'medium' | 'high'
  timeframe: string
}

export type RecommendationType = 
  | 'refresh_immediately'
  | 'schedule_refresh'
  | 'update_frequency'
  | 'improve_quality'
  | 'optimize_access'
  | 'cleanup_stale'
  | 'adjust_policy'

export interface PrioritizedContext {
  context: ContextItem
  priority_score: number
  freshness_score: number
  time_decay_score: number
  access_pattern_score: number
  importance_score: number
  combined_score: number
  ranking: number
  prioritization_reason: string
}

export interface RefreshResult {
  context_id: string
  refreshed_at: Date
  refresh_duration: number
  success: boolean
  new_freshness_score: number
  changes_detected: boolean
  change_summary: string[]
  error_message?: string
  performance_metrics: RefreshPerformanceMetrics
}

export interface RefreshPerformanceMetrics {
  data_retrieval_time: number
  processing_time: number
  validation_time: number
  storage_time: number
  total_time: number
  memory_usage: number
  cpu_usage: number
  network_usage: number
}

export interface RefreshSchedule {
  schedule_id: string
  context_id: string
  schedule_type: ScheduleType
  frequency: string
  start_time: Date
  end_time?: Date
  timezone: string
  enabled: boolean
  last_execution?: Date
  next_execution: Date
  execution_count: number
  success_count: number
  failure_count: number
  metadata: Record<string, any>
}

export type ScheduleType = 
  | 'immediate'
  | 'scheduled'
  | 'recurring'
  | 'event_driven'
  | 'conditional'

export interface StaleContext {
  context_id: string
  staleness_level: StalenessLevel
  freshness_score: number
  time_since_update: number
  time_since_access: number
  impact_assessment: ImpactAssessment
  cleanup_recommendation: CleanupRecommendation
  last_assessment: Date
}

export interface ImpactAssessment {
  user_impact: 'low' | 'medium' | 'high'
  system_impact: 'low' | 'medium' | 'high'
  business_impact: 'low' | 'medium' | 'high'
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  affected_users: number
  affected_processes: string[]
}

export interface CleanupRecommendation {
  action: CleanupAction
  priority: 'low' | 'medium' | 'high' | 'critical'
  reason: string
  expected_benefit: string
  implementation_effort: 'low' | 'medium' | 'high'
  timeframe: string
  dependencies: string[]
}

export type CleanupAction = 
  | 'refresh'
  | 'archive'
  | 'delete'
  | 'merge'
  | 'consolidate'
  | 'update_policy'

export interface CleanupResult {
  cleanup_id: string
  started_at: Date
  completed_at: Date
  duration: number
  contexts_processed: number
  contexts_cleaned: number
  contexts_refreshed: number
  contexts_archived: number
  contexts_deleted: number
  storage_freed: number
  performance_improvement: number
  errors: CleanupError[]
  summary: CleanupSummary
}

export interface CleanupError {
  context_id: string
  error_type: string
  error_message: string
  timestamp: Date
}

export interface CleanupSummary {
  total_contexts: number
  stale_contexts: number
  cleaned_contexts: number
  storage_saved: number
  performance_gain: number
  quality_improvement: number
}

export interface FreshnessPolicy {
  policy_id: string
  policy_name: string
  policy_type: string
  policy_description: string
  freshness_threshold: number
  refresh_frequency: number
  priority: 'low' | 'medium' | 'high'
  is_active: boolean
  created_at: Date
  updated_at: Date
  metadata: Record<string, any>
}

export interface FreshnessRule {
  rule_id: string
  name: string
  description: string
  condition: FreshnessCondition
  action: FreshnessAction
  priority: number
  enabled: boolean
}

export interface FreshnessCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'not_contains' | 'in' | 'not_in'
  value: any
  logical_operator?: 'and' | 'or'
  nested_conditions?: FreshnessCondition[]
}

export interface FreshnessAction {
  type: ActionType
  parameters: Record<string, any>
  schedule?: RefreshSchedule
  notification?: NotificationConfig
}

export type ActionType = 
  | 'refresh'
  | 'mark_stale'
  | 'schedule_refresh'
  | 'send_notification'
  | 'escalate'
  | 'cleanup'

export interface NotificationConfig {
  channels: NotificationChannel[]
  recipients: string[]
  template: string
  frequency: 'immediate' | 'daily' | 'weekly'
  conditions: NotificationCondition[]
}

export type NotificationChannel = 'email' | 'slack' | 'teams' | 'webhook' | 'sms'

export interface NotificationCondition {
  field: string
  operator: string
  value: any
}

export interface StalenessThreshold {
  context_type: ContextType
  threshold_level: StalenessLevel
  time_threshold: number
  freshness_threshold: number
  access_threshold: number
  quality_threshold: number
}

export interface RefreshStrategy {
  strategy_id: string
  name: string
  description: string
  context_types: ContextType[]
  refresh_method: RefreshMethod
  scheduling: SchedulingConfig
  performance_optimization: PerformanceOptimization
  error_handling: ErrorHandlingConfig
}

export type RefreshMethod = 
  | 'full_refresh'
  | 'incremental_refresh'
  | 'delta_refresh'
  | 'smart_refresh'
  | 'lazy_refresh'

export interface SchedulingConfig {
  frequency: UpdateFrequency
  time_window: TimeWindow
  priority: number
  dependencies: string[]
  constraints: SchedulingConstraint[]
}

export interface TimeWindow {
  start_time: string
  end_time: string
  timezone: string
  days_of_week: number[]
  exclude_holidays: boolean
}

export interface SchedulingConstraint {
  type: 'resource' | 'dependency' | 'business_hours' | 'maintenance_window'
  condition: string
  impact: 'blocking' | 'delaying' | 'warning'
}

export interface PerformanceOptimization {
  parallel_processing: boolean
  batch_size: number
  timeout: number
  retry_attempts: number
  cache_strategy: CacheStrategy
  resource_limits: ResourceLimits
}

export interface CacheStrategy {
  enabled: boolean
  ttl: number
  max_size: number
  eviction_policy: 'lru' | 'lfu' | 'fifo' | 'ttl'
}

export interface ResourceLimits {
  max_memory: number
  max_cpu: number
  max_network: number
  max_concurrent: number
}

export interface ErrorHandlingConfig {
  retry_policy: RetryPolicy
  fallback_strategy: FallbackStrategy
  error_notification: ErrorNotification
  logging: LoggingConfig
}

export interface RetryPolicy {
  max_attempts: number
  backoff_strategy: 'linear' | 'exponential' | 'fixed'
  initial_delay: number
  max_delay: number
  retryable_errors: string[]
}

export interface FallbackStrategy {
  enabled: boolean
  strategy: 'use_cached' | 'use_stale' | 'skip' | 'notify'
  conditions: FallbackCondition[]
}

export interface FallbackCondition {
  error_type: string
  error_count: number
  time_window: number
}

export interface ErrorNotification {
  enabled: boolean
  channels: NotificationChannel[]
  recipients: string[]
  threshold: number
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  format: 'json' | 'text'
  include_metadata: boolean
  include_performance: boolean
}

export interface CleanupRule {
  rule_id: string
  name: string
  description: string
  condition: CleanupCondition
  action: CleanupAction
  schedule: CleanupSchedule
  safety_checks: SafetyCheck[]
}

export interface CleanupCondition {
  staleness_level: StalenessLevel
  time_threshold: number
  access_threshold: number
  quality_threshold: number
  logical_operator: 'and' | 'or'
}

export interface CleanupSchedule {
  frequency: UpdateFrequency
  time_window: TimeWindow
  batch_size: number
  dry_run: boolean
}

export interface SafetyCheck {
  type: 'backup' | 'validation' | 'approval' | 'notification'
  enabled: boolean
  parameters: Record<string, any>
}

export interface PriorityRule {
  rule_id: string
  name: string
  description: string
  factors: PriorityFactor[]
  weights: PriorityWeights
  calculation_method: 'weighted_sum' | 'multiplicative' | 'custom'
}

export interface PriorityFactor {
  factor: 'freshness' | 'importance' | 'access_frequency' | 'quality' | 'dependencies'
  weight: number
  normalization: 'linear' | 'logarithmic' | 'exponential'
  range: [number, number]
}

export interface PriorityWeights {
  freshness: number
  importance: number
  access_frequency: number
  quality: number
  dependencies: number
  time_decay: number
}

export interface PolicyResult {
  policy_id: string
  context_id: string
  applied_at: Date
  success: boolean
  actions_taken: PolicyAction[]
  performance_impact: PerformanceImpact
  quality_impact: QualityImpact
  error_message?: string
}

export interface PolicyAction {
  type: ActionType
  parameters: Record<string, any>
  executed_at: Date
  success: boolean
  duration: number
  result: any
}

export interface PerformanceImpact {
  processing_time_change: number
  memory_usage_change: number
  cpu_usage_change: number
  network_usage_change: number
  storage_usage_change: number
}

export interface QualityImpact {
  freshness_improvement: number
  accuracy_improvement: number
  completeness_improvement: number
  consistency_improvement: number
  reliability_improvement: number
}

export interface PolicyEvaluation {
  policy_id: string
  evaluated_at: Date
  contexts_evaluated: number
  actions_recommended: number
  actions_executed: number
  success_rate: number
  performance_impact: PerformanceImpact
  quality_impact: QualityImpact
  cost_benefit_analysis: CostBenefitAnalysis
  recommendations: PolicyRecommendation[]
}

export interface CostBenefitAnalysis {
  implementation_cost: number
  operational_cost: number
  quality_benefit: number
  performance_benefit: number
  user_satisfaction_benefit: number
  roi: number
  payback_period: number
}

export interface PolicyRecommendation {
  type: 'optimize' | 'simplify' | 'enhance' | 'remove'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expected_impact: number
  implementation_effort: 'low' | 'medium' | 'high'
  timeframe: string
}

export interface FreshnessMetrics {
  timeframe: string
  total_contexts: number
  fresh_contexts: number
  stale_contexts: number
  expired_contexts: number
  average_freshness_score: number
  average_quality_score?: number
  refresh_success_rate?: number
  policy_compliance_rate?: number
  freshness_distribution: FreshnessDistribution
  staleness_trends: StalenessTrend[]
  refresh_statistics: RefreshStatistics
  performance_metrics: FreshnessPerformanceMetrics
}

export interface FreshnessDistribution {
  fresh: number
  slightly_stale: number
  moderately_stale: number
  very_stale: number
  extremely_stale: number
  expired: number
}

export interface StalenessTrend {
  date: Date
  stale_count: number
  freshness_score: number
  trend_direction: 'improving' | 'declining' | 'stable'
}

export interface RefreshStatistics {
  total_refreshes: number
  successful_refreshes: number
  failed_refreshes: number
  average_refresh_time: number
  refresh_frequency: Record<UpdateFrequency, number>
}

export interface FreshnessPerformanceMetrics {
  assessment_time: number
  prioritization_time: number
  refresh_time: number
  cleanup_time: number
  policy_evaluation_time: number
  memory_usage: number
  cpu_usage: number
  network_usage: number
}

export interface FreshnessTrend {
  context_id: string
  timeframe: string
  trend_data: TrendDataPoint[]
  trend_direction: 'improving' | 'declining' | 'stable'
  trend_strength: number
  seasonality: boolean
  forecast: FreshnessForecast
}

export interface TrendDataPoint {
  timestamp: Date
  freshness_score: number
  access_count: number
  update_count: number
  quality_score: number
}

export interface FreshnessForecast {
  next_freshness_score: number
  confidence_interval: [number, number]
  forecast_horizon: number
  accuracy: number
  factors: ForecastFactor[]
}

export interface ForecastFactor {
  factor: string
  impact: number
  confidence: number
  trend: 'increasing' | 'decreasing' | 'stable'
}

export interface StalenessReport {
  generated_at: Date
  timeframe: string
  total_contexts: number
  stale_contexts: number
  staleness_distribution: StalenessDistribution
  impact_analysis: ImpactAnalysis
  recommendations: StalenessRecommendation[]
  action_items: ActionItem[]
  trends: StalenessTrend[]
}

export interface StalenessDistribution {
  by_context_type: Record<ContextType, number>
  by_staleness_level: Record<StalenessLevel, number>
  by_importance: Record<string, number>
  by_category: Record<string, number>
}

export interface ImpactAnalysis {
  user_impact: ImpactMetrics
  system_impact: ImpactMetrics
  business_impact: ImpactMetrics
  risk_assessment: RiskAssessment
}

export interface ImpactMetrics {
  affected_count: number
  severity_level: 'low' | 'medium' | 'high' | 'critical'
  impact_score: number
  trend: 'improving' | 'declining' | 'stable'
}

export interface RiskAssessment {
  overall_risk: 'low' | 'medium' | 'high' | 'critical'
  risk_factors: RiskFactor[]
  mitigation_strategies: MitigationStrategy[]
  monitoring_requirements: MonitoringRequirement[]
}

export interface RiskFactor {
  factor: string
  risk_level: 'low' | 'medium' | 'high' | 'critical'
  probability: number
  impact: number
  description: string
}

export interface MitigationStrategy {
  strategy: string
  effectiveness: number
  implementation_effort: 'low' | 'medium' | 'high'
  timeframe: string
  dependencies: string[]
}

export interface MonitoringRequirement {
  metric: string
  threshold: number
  frequency: UpdateFrequency
  alert_conditions: AlertCondition[]
}

export interface AlertCondition {
  condition: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  action: string
}

export interface StalenessRecommendation {
  type: RecommendationType
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expected_impact: number
  implementation_effort: 'low' | 'medium' | 'high'
  timeframe: string
  resources_required: string[]
  dependencies: string[]
}

export interface ActionItem {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  assigned_to: string
  due_date: Date
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  progress: number
  dependencies: string[]
  resources: string[]
}

export interface FreshnessHealthStatus {
  health_id?: string
  policy_id?: string
  overall_health?: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  health_score: number
  health_status?: 'healthy' | 'warning' | 'critical'
  health_factors?: string[]
  health_metrics?: FreshnessMetrics
  health_timestamp?: Date
  health_metadata?: Record<string, any>
  component_health?: ComponentHealth[]
  alerts?: HealthAlert[]
  recommendations?: HealthRecommendation[]
  last_assessment?: Date
  next_assessment?: Date
}

export interface ComponentHealth {
  component: string
  health_status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  health_score: number
  issues: HealthIssue[]
  metrics: HealthMetrics
}

export interface HealthIssue {
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  impact: string
  resolution: string
  detected_at: Date
}

export interface HealthMetrics {
  freshness_score: number
  staleness_rate: number
  refresh_success_rate: number
  cleanup_efficiency: number
  policy_compliance: number
}

export interface HealthAlert {
  id: string
  type: 'warning' | 'error' | 'critical'
  title: string
  description: string
  component: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  created_at: Date
  acknowledged: boolean
  resolved: boolean
}

export interface HealthRecommendation {
  type: 'optimize' | 'fix' | 'enhance' | 'monitor'
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  expected_impact: number
  implementation_effort: 'low' | 'medium' | 'high'
  timeframe: string
}

// Additional types for FreshnessPolicyEngine
export interface PolicyApplicationResult {
  application_id: string
  context_id: string
  policy_id: string
  application_status: 'applied' | 'failed' | 'pending'
  freshness_score: number
  policy_impact: number
  application_timestamp: Date
  metadata: {
    policy_type: string
    policy_priority: string
    application_duration: number
  }
}

export interface PolicyEvaluationResult {
  evaluation_id: string
  policy_id: string
  evaluation_status: 'completed' | 'failed' | 'pending'
  overall_score: number
  context_scores: ContextScore[]
  evaluation_timestamp: Date
  metadata: {
    contexts_evaluated: number
    policy_type: string
    evaluation_duration: number
  }
}

export interface ContextScore {
  context_id: string
  freshness_score: number
  compliance_score: number
  recommendation: string
}