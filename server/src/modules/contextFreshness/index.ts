/**
 * Context Freshness Module
 * Exports all context freshness management components and types
 */

export { ContextFreshnessManager } from './contextFreshnessManager'
export { FreshnessAssessor } from './services/freshnessAssessor'
export { TimeBasedPrioritizer } from './services/timeBasedPrioritizer'
export { RefreshScheduler } from './services/refreshScheduler'
export { StalenessManager } from './services/stalenessManager'

export type {
  // Core service types
  ContextFreshnessManager as IContextFreshnessManager,
  FreshnessAssessor as IFreshnessAssessor,
  TimeBasedPrioritizer as ITimeBasedPrioritizer,
  RefreshScheduler as IRefreshScheduler,
  StalenessManager as IStalenessManager,

  // Main context types
  ContextItem,
  ContextType,
  ContextMetadata,
  FreshnessInfo,
  UpdateFrequency,
  AccessPattern,
  AccessDistribution,
  UserAccessPattern,
  UpdateHistory,
  FreshnessHistoryEntry,

  // Assessment types
  FreshnessAssessment,
  StalenessLevel,
  FreshnessTrend,
  FreshnessRecommendation,
  RecommendationType,

  // Prioritization types
  PrioritizedContext,

  // Refresh types
  RefreshResult,
  RefreshPerformanceMetrics,
  RefreshSchedule,
  ScheduleType,

  // Staleness types
  StaleContext,
  ImpactAssessment,
  CleanupRecommendation,
  CleanupAction,
  CleanupResult,
  CleanupError,
  CleanupSummary,

  // Policy types
  FreshnessPolicy,
  FreshnessRule,
  FreshnessCondition,
  FreshnessAction,
  ActionType,
  NotificationConfig,
  NotificationChannel,
  NotificationCondition,
  StalenessThreshold,
  RefreshStrategy,
  RefreshMethod,
  SchedulingConfig,
  TimeWindow,
  SchedulingConstraint,
  PerformanceOptimization,
  CacheStrategy,
  ResourceLimits,
  ErrorHandlingConfig,
  RetryPolicy,
  FallbackStrategy,
  FallbackCondition,
  ErrorNotification,
  LoggingConfig,
  CleanupRule,
  CleanupCondition,
  CleanupSchedule,
  SafetyCheck,
  PriorityRule,
  PriorityFactor,
  PriorityWeights,

  // Policy result types
  PolicyResult,
  PolicyAction,
  PerformanceImpact,
  QualityImpact,
  PolicyEvaluation,
  CostBenefitAnalysis,
  PolicyRecommendation,

  // Analytics types
  FreshnessMetrics,
  FreshnessDistribution,
  StalenessTrend,
  RefreshStatistics,
  FreshnessPerformanceMetrics,
  FreshnessTrend as FreshnessTrendData,
  TrendDataPoint,
  FreshnessForecast,
  ForecastFactor,
  StalenessReport,
  StalenessDistribution,
  ImpactAnalysis,
  ImpactMetrics,
  RiskAssessment,
  RiskFactor,
  MitigationStrategy,
  MonitoringRequirement,
  AlertCondition,
  StalenessRecommendation,
  ActionItem,
  FreshnessHealthStatus,
  ComponentHealth,
  HealthIssue,
  HealthMetrics,
  HealthAlert,
  HealthRecommendation
} from './types'
