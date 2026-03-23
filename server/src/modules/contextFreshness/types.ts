/**
 * Context Freshness Management Types
 * Defines TypeScript interfaces and types for time-based prioritization and freshness management
 */

export interface IFreshnessPolicyEngine {
  evaluatePolicy(policyId: string, contextData: any): Promise<PolicyEvaluationResult>
  evaluateAllPolicies(contextData: any): Promise<PolicyEvaluationResult[]>
  createPolicy(policy: FreshnessPolicy): Promise<FreshnessPolicy>
  updatePolicy(policyId: string, updates: Partial<FreshnessPolicy>): Promise<FreshnessPolicy>
  deletePolicy(policyId: string): Promise<boolean>
  getPolicy(policyId: string): Promise<FreshnessPolicy | null>
  listPolicies(): Promise<FreshnessPolicy[]>
  optimizePolicy(policyId: string, metrics: FreshnessMetrics): Promise<FreshnessPolicy>
  getPolicyMetrics(policyId: string): Promise<FreshnessMetrics>
  getPolicyHealthStatus(policyId: string): Promise<FreshnessHealthStatus>
}

export interface FreshnessThreshold {
  context_type: string
  max_age_hours: number
  threshold_description?: string
}

export interface RefreshRequirement {
  context_type: string
  refresh_interval_hours: number
  refresh_method: 'automatic' | 'manual'
  refresh_priority: 'low' | 'medium' | 'high' | 'critical'
}

export interface QualityRequirement {
  context_type: string
  min_quality_score: number
  quality_factors: string[]
}

export interface FreshnessPolicy {
  policy_id: string
  policy_name: string
  policy_type: string
  policy_description: string
  policy_version?: string
  policy_priority: number
  policy_enabled: boolean
  freshness_thresholds?: FreshnessThreshold[]
  refresh_requirements?: RefreshRequirement[]
  quality_requirements?: QualityRequirement[]
  policy_conditions?: any[]
  policy_actions?: any[]
  created_at: Date
  updated_at: Date
  created_by?: string
  policy_metadata: Record<string, any>
  // Legacy fields for compatibility
  freshness_threshold?: number
  refresh_frequency?: number
  priority?: 'low' | 'medium' | 'high'
  is_active?: boolean
  metadata?: Record<string, any>
}

export interface TimeBasedPrioritizer {
  prioritizeByFreshness(contexts: ContextItem[]): Promise<PrioritizedContext[]>
  prioritizeByTimeDecay(contexts: ContextItem[]): Promise<PrioritizedContext[]>
}

export interface StalenessManager {
  identifyStaleContexts(threshold?: number): Promise<StaleContext[]>
  cleanupStaleContexts(threshold?: number): Promise<CleanupResult>
}

export interface RefreshScheduler {
  scheduleRefresh(contextId: string, schedule: RefreshSchedule): Promise<void>
  cancelScheduledRefresh(contextId: string): Promise<void>
}

export interface FreshnessAssessor {
  assess(context: ContextItem): Promise<FreshnessAssessment>
  calculateFreshnessScore(context: ContextItem): Promise<number>
  calculateDecayRate(context: ContextItem): Promise<number>
}

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
  context_id?: string
  trend_data?: any[]
  trend_direction?: string
  trend_strength?: number
  seasonality?: boolean
  forecast?: any
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

export interface PolicyResult {
  policy_id: string
  context_id: string
  applied_at: Date
  success: boolean
  actions_taken: any[]
  performance_impact: PerformanceImpact
  quality_impact: QualityImpact
  error_message?: string
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
  actions_recommended: any[]
  actions_executed: any[]
  success_rate: number
  evaluation_score?: number
  performance_impact: PerformanceImpact
  quality_impact: QualityImpact
  cost_benefit_analysis: any
  recommendations: any[]
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
  freshness_distribution: any
  staleness_trends: any[]
  refresh_statistics: any
  performance_metrics: any
}

export interface FreshnessHealthStatus {
  health_id?: string
  policy_id?: string
  overall_health?: string
  health_score: number
  health_status?: 'healthy' | 'warning' | 'critical'
  health_factors?: string[]
  health_metrics?: FreshnessMetrics
  health_timestamp?: Date
  health_metadata?: Record<string, any>
}

export interface StalenessReport {
  generated_at: Date
  timeframe: string
  total_contexts: number
  stale_contexts: number
  staleness_distribution: any
  impact_analysis: any
  recommendations: any[]
  action_items: any[]
  trends: any[]
}

export interface PolicyEvaluationResult {
  evaluation_id: string
  policy_id: string
  evaluation_status: 'completed' | 'failed' | 'pending'
  overall_score: number
  evaluation_score?: number
  success_rate?: number
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
