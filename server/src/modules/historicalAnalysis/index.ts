/**
 * Historical Analysis Module
 * Exports all historical analysis components and types
 */

export { HistoricalAnalysisService } from './historicalAnalysisService'
export { DocumentAnalyzer } from './services/documentAnalyzer'
export { PatternRecognitionService } from './services/patternRecognitionService'

export type {
  // Core service types
  HistoricalAnalysisService as IHistoricalAnalysisService,
  DocumentAnalyzer as IDocumentAnalyzer,
  PatternRecognitionService as IPatternRecognitionService,

  // Analysis types
  DocumentAnalysis,
  PatternRecognitionResult,
  PatternMatch,
  PatternLocation,
  DocumentPattern,
  DocumentPatternType,
  BestPractice,
  BestPracticeType,
  ImprovementSuggestion,
  SuggestionType,

  // Trend analysis types
  HistoricalTrend,
  FrameworkAnalysis,
  UserAnalysis,
  ProjectAnalysis,
  TrendFilters,

  // Quality and compliance types
  QualityMetrics,
  AssessmentCriteria,
  ComplianceAssessment,
  ReadabilityAssessment,

  // Document analysis types
  StructureAnalysis,
  ContentAnalysis,
  LanguageAnalysis,
  FormattingAnalysis,
  DocumentSection,

  // Pattern types
  StructurePattern,
  ContentPattern,
  LanguagePattern,
  FormattingPattern,

  // Recommendation types
  RecommendationContext,
  PatternValidationResult,

  // Analysis configuration types
  AnalysisType
} from './types'
