/**
 * Variable Resolution Engine Module
 * Exports all components for intelligent template variable resolution
 */

// Main engine
export { VariableResolutionEngine } from './variableResolutionEngine'
export type { VariableResolutionEngineConfig } from './variableResolutionEngine'

// Resolution strategies
export { ContextExtractionStrategy } from './strategies/contextExtractionStrategy'
export { UserProfileStrategy } from './strategies/userProfileStrategy'
export { AIGenerationStrategy } from './strategies/aiGenerationStrategy'
export { DefaultValueStrategy } from './strategies/defaultValueStrategy'
export { TemplateInheritanceStrategy } from './strategies/templateInheritanceStrategy'
export { ExternalApiStrategy } from './strategies/externalApiStrategy'
export { DatabaseQueryStrategy } from './strategies/databaseQueryStrategy'
export { FileContentStrategy } from './strategies/fileContentStrategy'
export { ComputedValueStrategy } from './strategies/computedValueStrategy'
export { ConditionalLogicStrategy } from './strategies/conditionalLogicStrategy'

// Supporting components
export { VariableAnalyzer } from './analyzers/variableAnalyzer'
export { ContextEnricher } from './enrichers/contextEnricher'
export { ResolutionCache } from './cache/resolutionCache'
export { ResolutionValidator } from './validators/resolutionValidator'
export { ResolutionMetricsCollector } from './metrics/resolutionMetricsCollector'

// Types
export type {
  VariableResolutionEngine as IVariableResolutionEngine,
  VariableResolutionRequest,
  VariableResolutionResult,
  VariableResolution,
  TemplateVariable,
  ResolutionContext,
  VariableAnalysis,
  VariablePattern,
  ValidationResult,
  EnrichedContext,
  ResolutionStrategy,
  ResolutionMetrics,
  VariableUsageStats,
  VariableResolutionConfig,
  ResolutionStrategyType,
  ResolutionCondition,
  FallbackStrategy,
  VariableType,
  VariableDefinition,
  VariableConstraint,
  ValidationRule,
  ValidationRuleType,
  ResolutionHint,
  ResolutionHintType,
  VariableMetadata,
  VariablePerformanceMetrics,
  ProjectContext,
  UserContext,
  TemplateContext,
  HistoricalContext,
  ExternalContext,
  ContextMetadata,
  UnresolvedVariable,
  ResolutionAttempt,
  QualityScore,
  PerformanceMetric,
  QualityAssessment,
  QualityFactor,
  QualityIssue,
  ResolutionRecommendation,
  RecommendationType,
  ResolutionMetadata,
  VariableTypeAnalysis,
  ComplexityAnalysis,
  ComplexityFactor,
  DependencyAnalysis,
  VariableDependency,
  DependencyGraph,
  DependencyNode,
  DependencyEdge,
  CircularDependency,
  QualityAnalysis,
  QualityDimension,
  AnalysisRecommendation,
  PatternType,
  VariableUsageStats as IVariableUsageStats,
  PerformanceTrend,
  TrendDataPoint,
  Stakeholder,
  Requirement,
  Constraint,
  Risk,
  Milestone,
  Phase,
  UserProfile,
  UserPreference,
  UserExpertise,
  UserWritingStyle,
  UserDomainKnowledge,
  UserCollaborationPreference,
  TemplateStructure,
  TemplateSection,
  StructureHierarchy,
  SectionRelationship,
  DocumentHistory,
  UsagePattern,
  QualityTrend,
  BestPractice,
  LessonLearned,
  ExternalSource,
  ApiResponse,
  FileContent,
  DatabaseResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,
  DocumentTemplate
} from './types'

// Strategy result types
export type { ContextExtractionResult } from './strategies/contextExtractionStrategy'
export type { UserProfileResult } from './strategies/userProfileStrategy'
export type { AIGenerationResult } from './strategies/aiGenerationStrategy'
export type { DefaultValueResult } from './strategies/defaultValueStrategy'
export type { TemplateInheritanceResult } from './strategies/templateInheritanceStrategy'
export type { ExternalApiResult } from './strategies/externalApiStrategy'
export type { DatabaseQueryResult } from './strategies/databaseQueryStrategy'
export type { FileContentResult } from './strategies/fileContentStrategy'
export type { ComputedValueResult } from './strategies/computedValueStrategy'
export type { ConditionalLogicResult } from './strategies/conditionalLogicStrategy'
