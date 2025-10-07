/**
 * Context Bundle Module
 * Exports all context bundle components and types
 */

export { ContextBundleService } from './contextBundle'
export { ContextAggregator } from './services/contextAggregator'
export { ContextOrganizer } from './services/contextOrganizer'
export { ContextValidator } from './services/contextValidator'
export { ContextOptimizer } from './services/contextOptimizer'

export type {
  // Core service types
  ContextBundleService as IContextBundleService,
  ContextAggregator as IContextAggregator,
  ContextOrganizer as IContextOrganizer,
  ContextValidator as IContextValidator,
  ContextOptimizer as IContextOptimizer,

  // Main bundle types
  ContextBundle,
  ContextBundleType,
  ContextBundleConfig,
  ContextSource,
  ContextSourceType,

  // Aggregated context types
  AggregatedContext,
  StructuredContextData,
  UnstructuredContextData,
  SemanticContextData,
  TemporalContextData,

  // Quality and metrics types
  ContextQualityMetrics,
  ContextRelevanceScores,
  ContextConfidenceScores,

  // Organization strategy types
  OrganizationStrategy,
  OrganizationStrategyType,
  GroupingCriteria,
  SortingCriteria,
  FilteringCriteria,
  DeduplicationStrategy,
  PrioritizationStrategy,
  ChunkingStrategy,

  // Priority and freshness types
  ContextPriority,
  ContextFreshness,
  UpdateFrequency,

  // Metadata types
  ContextMetadata,
  ContextSourceMetadata,
  AccessControlMetadata,
  AuditTrailEntry,
  PerformanceMetrics,

  // Structured data types
  ProjectContextInfo,
  UserContextInfo,
  DocumentContextInfo,
  TemplateContextInfo,
  FrameworkContextInfo,
  StakeholderContextData,
  RequirementContextData,
  RiskContextData,
  ConstraintContextData,

  // Unstructured data types
  ContextSentiment,
  UserPreferences,
  NotificationPreferences,
  DisplayPreferences,
  CollaborationPreferences,
  QualityPreferences,
  WritingStyle,
  DomainKnowledge,

  // Document context types
  DocumentQualityMetrics,
  UsagePatterns,
  RevisionHistory,

  // Template context types
  TemplateVariable,
  TemplateSection,
  AIEnhancements,
  UsageStatistics,
  TemplateQualityMetrics,

  // Framework context types
  BestPractice,
  FrameworkPattern,
  ComplianceRequirement,
  QualityStandard,
  Guideline,

  // Semantic data types
  TopicModelingData,
  Topic,
  EntityExtractionData,
  Entity,
  EntityRelationship,
  RelationshipMappingData,
  Relationship,
  ConceptGraphData,
  Concept,
  ConceptRelationship,
  KnowledgeGraphData,
  KnowledgeNode,
  KnowledgeEdge,
  GraphMetrics,

  // Temporal data types
  TimelineData,
  TrendData,
  TimeSeriesPoint,
  ForecastData,
  SeasonalPatternData,

  // Processing and validation types
  ProcessedContext,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  OptimizationResult,
  OptimizationImprovement,
  PerformanceGains,
  QualityImprovements,

  // Filter and search types
  BundleFilters,
  ContextFilters,

  // Analytics types
  UsageAnalytics,
  QualityAnalytics,
  PerformanceAnalytics,
  ContextInsights,
  KeyInsight,
  Recommendation,
  Trend,
  Anomaly,
  Opportunity,

  // Quality analytics types
  QualityTrend,
  QualityDistribution,

  // Performance analytics types
  MemoryUsagePattern,
  CpuUsagePattern,
  NetworkUsagePattern,
  PerformanceBottleneck
} from './types'
