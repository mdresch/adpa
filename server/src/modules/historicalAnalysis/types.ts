/**
 * Historical Document Analysis Types
 * Defines TypeScript interfaces and types for pattern recognition and best practices
 */

export interface DocumentPattern {
  id: string
  pattern_type: DocumentPatternType
  pattern_name: string
  description: string
  framework: string
  category: string
  frequency: number
  confidence: number
  effectiveness_score: number
  examples: string[]
  implementation_guidance: string
  success_metrics: string[]
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export type DocumentPatternType = 
  | 'structure_pattern'
  | 'content_pattern'
  | 'language_pattern'
  | 'formatting_pattern'
  | 'section_pattern'
  | 'variable_pattern'
  | 'quality_pattern'
  | 'compliance_pattern'

export interface BestPractice {
  id: string
  name: string
  description: string
  framework: string
  category: string
  practice_type: BestPracticeType
  effectiveness_score: number
  usage_frequency: number
  success_rate: number
  examples: string[]
  implementation_guidance: string
  success_metrics: string[]
  prerequisites: string[]
  related_practices: string[]
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export type BestPracticeType = 
  | 'structure'
  | 'content'
  | 'process'
  | 'quality'
  | 'compliance'
  | 'collaboration'
  | 'review'
  | 'approval'

export interface DocumentAnalysis {
  document_id: string
  analysis_type: AnalysisType
  patterns_detected: DocumentPattern[]
  best_practices_applied: BestPractice[]
  quality_metrics: QualityMetrics
  compliance_score: number
  improvement_suggestions: ImprovementSuggestion[]
  metadata: Record<string, any>
  analyzed_at: Date
}

export type AnalysisType = 
  | 'structure_analysis'
  | 'content_analysis'
  | 'quality_analysis'
  | 'compliance_analysis'
  | 'pattern_analysis'
  | 'comprehensive_analysis'

export interface QualityMetrics {
  completeness_score: number
  clarity_score: number
  accuracy_score: number
  consistency_score: number
  readability_score: number
  structure_score: number
  overall_score: number
  assessment_criteria: AssessmentCriteria[]
  feedback: string[]
}

export interface AssessmentCriteria {
  criterion: string
  score: number
  weight: number
  feedback: string
  examples: string[]
}

export interface ImprovementSuggestion {
  id: string
  type: SuggestionType
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  current_state: string
  suggested_improvement: string
  expected_benefit: string
  implementation_effort: 'low' | 'medium' | 'high'
  related_patterns: string[]
  related_practices: string[]
  examples: string[]
}

export type SuggestionType = 
  | 'structure_improvement'
  | 'content_enhancement'
  | 'quality_improvement'
  | 'compliance_fix'
  | 'formatting_improvement'
  | 'language_improvement'
  | 'process_optimization'

export interface PatternRecognitionResult {
  document_id: string
  patterns_found: PatternMatch[]
  pattern_confidence: number
  pattern_coverage: number
  missing_patterns: string[]
  anomalous_patterns: string[]
  metadata: Record<string, any>
  analyzed_at: Date
}

export interface PatternMatch {
  pattern_id: string
  pattern_name: string
  pattern_type: DocumentPatternType
  confidence: number
  match_score: number
  location: PatternLocation
  context: string
  variations: string[]
}

export interface PatternLocation {
  section: string
  paragraph_index: number
  sentence_index: number
  character_range: {
    start: number
    end: number
  }
}

export interface HistoricalTrend {
  timeframe: string
  metric_name: string
  metric_value: number
  trend_direction: 'improving' | 'declining' | 'stable'
  change_percentage: number
  data_points: number
  confidence: number
  metadata: Record<string, any>
}

export interface FrameworkAnalysis {
  framework: string
  total_documents: number
  average_quality_score: number
  common_patterns: DocumentPattern[]
  best_practices: BestPractice[]
  quality_trends: HistoricalTrend[]
  improvement_areas: string[]
  strengths: string[]
  recommendations: string[]
  analyzed_at: Date
}

export interface UserAnalysis {
  user_id: string
  total_documents: number
  average_quality_score: number
  writing_patterns: DocumentPattern[]
  improvement_areas: string[]
  strengths: string[]
  recommendations: string[]
  quality_trends: HistoricalTrend[]
  analyzed_at: Date
}

export interface ProjectAnalysis {
  project_id: string
  total_documents: number
  average_quality_score: number
  document_types: string[]
  quality_distribution: Record<string, number>
  common_issues: string[]
  best_practices_applied: BestPractice[]
  improvement_opportunities: string[]
  analyzed_at: Date
}

export interface HistoricalAnalysisService {
  // Pattern recognition
  analyzeDocumentPatterns(documentId: string): Promise<PatternRecognitionResult>
  detectPatterns(content: string, framework: string): Promise<DocumentPattern[]>
  identifyBestPractices(documentId: string): Promise<BestPractice[]>
  compareWithHistoricalData(documentId: string): Promise<DocumentAnalysis>
  
  // Trend analysis
  analyzeQualityTrends(timeframe: string, filters?: TrendFilters): Promise<HistoricalTrend[]>
  analyzeFrameworkTrends(framework: string, timeframe: string): Promise<FrameworkAnalysis>
  analyzeUserTrends(userId: string, timeframe: string): Promise<UserAnalysis>
  analyzeProjectTrends(projectId: string, timeframe: string): Promise<ProjectAnalysis>
  
  // Best practices
  extractBestPractices(framework: string, category?: string): Promise<BestPractice[]>
  identifyImprovementOpportunities(documentId: string): Promise<ImprovementSuggestion[]>
  generateRecommendations(context: RecommendationContext): Promise<ImprovementSuggestion[]>
  
  // Pattern learning
  learnFromDocument(documentId: string): Promise<void>
  updatePatternDatabase(): Promise<void>
  validatePatterns(): Promise<PatternValidationResult[]>
}

export interface TrendFilters {
  framework?: string[]
  category?: string[]
  user_id?: string
  project_id?: string
  quality_score_min?: number
  quality_score_max?: number
  date_range?: {
    from: Date
    to: Date
  }
}

export interface RecommendationContext {
  user_id: string
  project_id?: string
  template_id?: string
  framework: string
  category?: string
  current_quality_score?: number
  target_quality_score?: number
  improvement_areas?: string[]
}

export interface PatternValidationResult {
  pattern_id: string
  validation_status: 'valid' | 'invalid' | 'needs_review'
  confidence_score: number
  validation_errors: string[]
  suggestions: string[]
  validated_at: Date
}

export interface DocumentAnalyzer {
  // Content analysis
  analyzeStructure(content: string): Promise<StructureAnalysis>
  analyzeContent(content: string): Promise<ContentAnalysis>
  analyzeLanguage(content: string): Promise<LanguageAnalysis>
  analyzeFormatting(content: string): Promise<FormattingAnalysis>
  
  // Quality assessment
  assessQuality(content: string, framework: string): Promise<QualityMetrics>
  assessCompliance(content: string, framework: string): Promise<ComplianceAssessment>
  assessReadability(content: string): Promise<ReadabilityAssessment>
  
  // Pattern detection
  detectStructurePatterns(content: string): Promise<StructurePattern[]>
  detectContentPatterns(content: string): Promise<ContentPattern[]>
  detectLanguagePatterns(content: string): Promise<LanguagePattern[]>
}

export interface StructureAnalysis {
  sections: DocumentSection[]
  hierarchy_level: number
  structure_score: number
  missing_sections: string[]
  recommended_sections: string[]
  structure_patterns: StructurePattern[]
}

export interface ContentAnalysis {
  content_length: number
  word_count: number
  sentence_count: number
  paragraph_count: number
  content_density: number
  topic_coverage: string[]
  content_gaps: string[]
  content_patterns: ContentPattern[]
}

export interface LanguageAnalysis {
  readability_score: number
  complexity_score: number
  tone: string
  formality_level: string
  language_patterns: LanguagePattern[]
  grammar_issues: string[]
  style_issues: string[]
}

export interface FormattingAnalysis {
  formatting_consistency: number
  formatting_issues: string[]
  formatting_patterns: FormattingPattern[]
  recommended_formatting: string[]
}

export interface StructurePattern {
  pattern_name: string
  pattern_type: string
  frequency: number
  confidence: number
  examples: string[]
  effectiveness: number
}

export interface ContentPattern {
  pattern_name: string
  pattern_type: string
  frequency: number
  confidence: number
  examples: string[]
  effectiveness: number
}

export interface LanguagePattern {
  pattern_name: string
  pattern_type: string
  frequency: number
  confidence: number
  examples: string[]
  effectiveness: number
}

export interface FormattingPattern {
  pattern_name: string
  pattern_type: string
  frequency: number
  confidence: number
  examples: string[]
  effectiveness: number
}

export interface DocumentSection {
  name: string
  level: number
  content: string
  word_count: number
  quality_score: number
  patterns: string[]
}

export interface ComplianceAssessment {
  compliance_score: number
  framework_compliance: Record<string, number>
  missing_requirements: string[]
  compliance_issues: string[]
  recommendations: string[]
}

export interface ReadabilityAssessment {
  readability_score: number
  reading_level: string
  complexity_metrics: {
    average_sentence_length: number
    average_word_length: number
    syllable_count: number
  }
  readability_issues: string[]
  recommendations: string[]
}
