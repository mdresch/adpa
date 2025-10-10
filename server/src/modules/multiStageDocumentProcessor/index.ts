/**
 * Multi-Stage Document Processor Module
 * Exports all multi-stage document processor components and types
 */

export { MultiStageDocumentProcessor } from './multiStageDocumentProcessor'
export { PipelineOrchestrator } from './services/pipelineOrchestrator'
export { JobManager } from './services/jobManager'
export { MetricsCollector } from './services/metricsCollector'

// Stage implementations
export { ContextGatheringStage } from './stages/contextGatheringStage'
export { TemplateProcessingStage } from './stages/templateProcessingStage'
export { AIGenerationStage } from './stages/aiGenerationStage'
export { ContextInjectionStage } from './stages/contextInjectionStage'
export { QualityAssuranceStage } from './stages/qualityAssuranceStage'
export { OutputFormattingStage } from './stages/outputFormattingStage'

// Format conversion engines
export { MultiFormatOutputEngine } from './engines/multiFormatOutputEngine'
export type { FormatConversionOptions, ConversionResult } from './engines/multiFormatOutputEngine'

// AI Generation Services
export { MultiModelAIGenerationService } from '../../services/multiModelAIGenerationService'
export { DocumentRefinementEngine } from '../../services/documentRefinementEngine'

// Context Injection Services
export { ContextInjectionEngine } from '../../services/contextInjectionEngine'
export { PersonalizationEngine } from '../../services/personalizationEngine'

export type {
  // Main service types
  MultiStageDocumentProcessor as IMultiStageDocumentProcessor,
  PipelineOrchestrator as IPipelineOrchestrator,
  JobManager as IJobManager,
  MetricsCollector as IMetricsCollector,

  // Stage types
  ContextGatheringStage as IContextGatheringStage,
  TemplateProcessingStage as ITemplateProcessingStage,
  AIGenerationStage as IAIGenerationStage,
  ContextInjectionStage as IContextInjectionStage,
  QualityAssuranceStage as IQualityAssuranceStage,
  OutputFormattingStage as IOutputFormattingStage,

  // Format conversion types
  FormatConversionOptions,
  ConversionResult,

  // Main processing types
  DocumentProcessingRequest,
  DocumentProcessingResult,
  DocumentProcessingJob,
  ProcessingStatus,
  StageInput,
  StageOutput,
  StageJob,
  StageResult,

  // Configuration types
  ProcessingConfig,
  QualityThresholds,
  StageConfig,
  StageType,
  ContextConfig,
  ContextSource,
  ContextSourceType,
  InjectionStrategy,
  ContextPriority,
  QualityConfig,
  QualityGate,
  QualityCriteria,
  AssessmentCriteria,
  ContentQualityCriteria,
  CompletenessCriteria,
  ClarityCriteria,
  ConsistencyCriteria,
  ReadabilityCriteria,
  MethodologyComplianceCriteria,
  FrameworkRequirement,
  BestPractice,
  StakeholderRequirementCriteria,
  StakeholderRequirement,
  TechnicalAccuracyCriteria,
  OutputConfig,
  OutputFormat,
  DeliveryOption,
  DeliveryMethod,

  // Document types
  ProcessedDocument,
  DocumentContent,
  DocumentSection,
  ContextData,
  ProjectContext,
  UserContext,
  HistoricalContext,
  ExternalContext,
  PersonalizationData,
  FormattedContent,
  DocumentMetadata,
  TemplateInfo,
  ProcessingInfo,
  QualityInfo,
  ContextInfo,
  QualityScores,

  // Quality types
  QualityReport,
  QualityAssessment,
  QualityFinding,
  QualityRecommendation,
  QualityIssue,

  // Metrics types
  ProcessingMetrics,
  StageMetrics,
  QualityMetrics,
  PerformanceMetrics,
  ResourceUtilization,
  ErrorRates,
  Trend,
  TrendDataPoint,

  // Pipeline types
  PipelineConfig,
  PipelineStage,
  GlobalConfig,
  MonitoringConfig,
  AlertThreshold,

  // Validation types
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationSuggestion,

  // History types
  ProcessingHistory,
  ProcessingHistoryFilters,

  // Supporting types
  Stakeholder,
  Requirement,
  Constraint,
  Risk,
  UserProfile,
  UserPreferences,
  UserExpertise,
  WritingStyle,
  Terminology,
  ComplexityLevel,
  CulturalConsiderations,
  Document,
  Pattern,
  Integration
} from './types'

