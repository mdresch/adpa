/**
 * Context Freshness Module
 * Exports all context freshness management components and types
 */

export { ContextFreshnessManager } from './contextFreshnessManager'
export { FreshnessAssessor } from './services/freshnessAssessor'
export { TimeBasedPrioritizer } from './services/timeBasedPrioritizer'
export { RefreshScheduler } from './services/refreshScheduler'
export { StalenessManager } from './services/stalenessManager'
export { FreshnessPolicyEngine } from './services/freshnessPolicyEngine'
export { FreshnessAnalyticsService } from './services/freshnessAnalytics'

export type {
  // Core service types
  ContextFreshnessManager as IContextFreshnessManager,
  IFreshnessPolicyEngine,
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
  FreshnessThreshold,
  RefreshRequirement,
  QualityRequirement,
  PolicyResult,
  PerformanceImpact,
  QualityImpact,
  PolicyEvaluation,
  PolicyEvaluationResult,
  ContextScore,

  // Analytics types
  FreshnessMetrics,
  FreshnessHealthStatus,
  StalenessReport
} from './types'
