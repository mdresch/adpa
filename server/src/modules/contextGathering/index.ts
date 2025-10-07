/**
 * Context Gathering Module
 * Exports for the context gathering stage implementation
 */

// Main context gathering stage
export { ContextGatheringStage } from './contextGatheringStage'

// Analyzers
export { ProjectContextAnalyzer } from './analyzers/projectContextAnalyzer'
export { UserProfileAnalyzer } from './analyzers/userProfileAnalyzer'
export { DocumentHistoryAnalyzer } from './analyzers/documentHistoryAnalyzer'
export { ExternalContextAnalyzer } from './analyzers/externalContextAnalyzer'
export { TemplateContextAnalyzer } from './analyzers/templateContextAnalyzer'

// Integrators
export { ContextIntegrator } from './integrators/contextIntegrator'

// Optimizers
export { ContextOptimizer } from './optimizers/contextOptimizer'

// Validators
export { ContextValidator } from './validators/contextValidator'

// Assessors
export { ContextQualityAssessor } from './assessors/contextQualityAssessor'

// Types
export type {
  IContextGatheringStage,
  ContextGatheringRequest,
  ContextGatheringResult,
  ContextData,
  ContextQualityAnalysis,
  ContextGap,
  ContextSourcePriority,
  ContextGatheringConfig,
  ContextSource,
  ContextSourceType,
  ContextPriorityFilter,
  ProjectContextData,
  UserProfileContextData,
  DocumentHistoryContextData,
  ExternalContextData,
  TemplateContextData,
  IntegratedContextData,
  OptimizedContextData,
  ContextMetadata,
  ContextQualityDimension,
  ContextQualityFactor,
  ContextQualityMetric,
  ContextQualityTrend,
  ContextQualityIssue,
  ContextQualityBenchmark,
  ContextQualityImprovement,
  ContextQualityAssessment,
  ContextQualityRecommendation,
  ContextGapType,
  ContextGapSolution,
  ContextPriorityFactor,
  ContextGatheringMetrics,
  ContextGatheringPerformanceMetric,
  ContextGatheringQualityMetric,
  ContextGatheringErrorMetric,
  ContextRecommendation,
  ContextRecommendationType,
  ContextValidationResult,
  ContextValidationError,
  ContextValidationWarning,
  ContextValidationSuggestion,
  StakeholderData,
  RequirementData,
  ConstraintData,
  RiskData,
  MilestoneData,
  PhaseData,
  TeamMemberData,
  BudgetData,
  TimelineData,
  SuccessCriteriaData,
  ProjectGoalData,
  DependencyData,
  DeliverableData,
  CommunicationPlanData,
  QualityStandardData,
  ComplianceRequirementData,
  TechnologyStackData,
  MethodologyData,
  LessonLearnedData,
  BestPracticeData,
  ProjectPerformanceMetrics,
  ContextGatheringError,
  ContextGatheringWarning
} from './types'
