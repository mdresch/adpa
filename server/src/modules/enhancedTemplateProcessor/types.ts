/**
 * Enhanced Template Processor Types
 * Defines TypeScript interfaces for AI-enhanced template processing
 */

export interface EnhancedTemplateProcessor {
  // Main processing
  processTemplate(request: TemplateProcessingRequest): Promise<EnhancedTemplateResult>
  processTemplateAsync(request: TemplateProcessingRequest): Promise<TemplateProcessingJob>
  getProcessingStatus(jobId: string): Promise<TemplateProcessingStatus>
  
  // AI enhancement
  enhanceWithAIInsights(template: DocumentTemplate, context: ContextBundle): Promise<AIEnhancedTemplate>
  applyMethodologyAlignment(template: DocumentTemplate, framework: string): Promise<MethodologyAlignedTemplate>
  generateTemplateRecommendations(template: DocumentTemplate): Promise<TemplateRecommendation[]>
  
  // Quality assessment
  assessTemplateQuality(template: DocumentTemplate): Promise<TemplateQualityAssessment>
  validateTemplateStructure(template: DocumentTemplate): Promise<ValidationResult>
  optimizeTemplatePerformance(template: DocumentTemplate): Promise<TemplateOptimization>
}

export interface TemplateProcessingRequest {
  request_id: string
  template_id: string
  context_bundle: ContextBundle
  processing_config: TemplateProcessingConfig
  enhancement_config: TemplateEnhancementConfig
  quality_config: TemplateQualityConfig
  metadata?: Record<string, any>
}

export interface TemplateProcessingConfig {
  enable_ai_enhancement: boolean
  enable_methodology_alignment: boolean
  enable_quality_optimization: boolean
  enable_performance_optimization: boolean
  max_processing_time: number
  retry_attempts: number
  quality_thresholds: TemplateQualityThresholds
}

export interface TemplateQualityThresholds {
  structure_quality: number
  content_quality: number
  methodology_compliance: number
  ai_enhancement_quality: number
  overall_quality: number
}

export interface TemplateEnhancementConfig {
  ai_insights_enabled: boolean
  methodology_alignment_enabled: boolean
  content_enhancement_enabled: boolean
  variable_optimization_enabled: boolean
  structure_optimization_enabled: boolean
  enhancement_strategies: EnhancementStrategy[]
}

export interface EnhancementStrategy {
  strategy_id: string
  strategy_name: string
  strategy_type: EnhancementStrategyType
  enabled: boolean
  priority: number
  config: Record<string, any>
}

export type EnhancementStrategyType = 
  | 'ai_insights'
  | 'methodology_alignment'
  | 'content_enhancement'
  | 'variable_optimization'
  | 'structure_optimization'
  | 'quality_optimization'
  | 'performance_optimization'

export interface TemplateQualityConfig {
  enable_structure_validation: boolean
  enable_content_validation: boolean
  enable_methodology_validation: boolean
  enable_ai_validation: boolean
  quality_gates: TemplateQualityGate[]
  validation_criteria: TemplateValidationCriteria
}

export interface TemplateQualityGate {
  gate_id: string
  gate_name: string
  validation_type: TemplateValidationType
  criteria: TemplateQualityCriteria[]
  threshold: number
  action_on_failure: 'stop' | 'warn' | 'continue'
}

export type TemplateValidationType = 
  | 'structure_validation'
  | 'content_validation'
  | 'methodology_validation'
  | 'ai_validation'
  | 'performance_validation'

export interface TemplateQualityCriteria {
  criterion_id: string
  criterion_name: string
  metric: string
  threshold: number
  weight: number
  description: string
}

export interface TemplateValidationCriteria {
  structure_criteria: StructureValidationCriteria
  content_criteria: ContentValidationCriteria
  methodology_criteria: MethodologyValidationCriteria
  ai_criteria: AIValidationCriteria
}

export interface StructureValidationCriteria {
  required_sections: string[]
  section_order: string[]
  variable_requirements: VariableRequirement[]
  formatting_requirements: FormattingRequirement[]
}

export interface ContentValidationCriteria {
  content_length_requirements: ContentLengthRequirement[]
  content_quality_requirements: ContentQualityRequirement[]
  terminology_requirements: TerminologyRequirement[]
  style_requirements: StyleRequirement[]
}

export interface MethodologyValidationCriteria {
  framework_requirements: FrameworkRequirement[]
  best_practices: BestPractice[]
  compliance_requirements: ComplianceRequirement[]
}

export interface AIValidationCriteria {
  ai_enhancement_requirements: AIEnhancementRequirement[]
  quality_requirements: QualityRequirement[]
  performance_requirements: PerformanceRequirement[]
}

export interface VariableRequirement {
  variable_name: string
  variable_type: string
  required: boolean
  description: string
  validation_rules: ValidationRule[]
}

export interface ValidationRule {
  rule_type: string
  rule_value: any
  error_message: string
}

export interface FormattingRequirement {
  section_name: string
  format_type: string
  format_specification: string
  required: boolean
}

export interface ContentLengthRequirement {
  section_name: string
  min_length: number
  max_length: number
  recommended_length: number
}

export interface ContentQualityRequirement {
  quality_metric: string
  threshold: number
  description: string
}

export interface TerminologyRequirement {
  domain: string
  required_terms: string[]
  prohibited_terms: string[]
  preferred_terms: Record<string, string>
}

export interface StyleRequirement {
  style_type: string
  style_specification: string
  required: boolean
}

export interface FrameworkRequirement {
  framework: string
  requirement_name: string
  requirement_description: string
  mandatory: boolean
  weight: number
}

export interface BestPractice {
  practice_name: string
  practice_description: string
  category: string
  importance: 'high' | 'medium' | 'low'
  weight: number
}

export interface ComplianceRequirement {
  compliance_framework: string
  requirement_name: string
  requirement_description: string
  mandatory: boolean
  weight: number
}

export interface AIEnhancementRequirement {
  enhancement_type: string
  quality_threshold: number
  performance_threshold: number
  description: string
}

export interface QualityRequirement {
  quality_metric: string
  threshold: number
  description: string
}

export interface PerformanceRequirement {
  performance_metric: string
  threshold: number
  description: string
}

export interface EnhancedTemplateResult {
  result_id: string
  request_id: string
  enhanced_template: EnhancedTemplate
  processing_metrics: TemplateProcessingMetrics
  quality_assessment: TemplateQualityAssessment
  recommendations: TemplateRecommendation[]
  metadata: Record<string, any>
}

export interface EnhancedTemplate {
  template_id: string
  original_template: DocumentTemplate
  enhanced_content: EnhancedContent
  ai_insights: AIInsight[]
  methodology_enhancements: MethodologyEnhancement[]
  variable_resolutions: VariableResolution[]
  quality_improvements: QualityImprovement[]
  performance_optimizations: PerformanceOptimization[]
  enhancement_metadata: EnhancementMetadata
}

export interface EnhancedContent {
  sections: Record<string, EnhancedSection>
  variables: Record<string, EnhancedVariable>
  structure: EnhancedStructure
  formatting: EnhancedFormatting
  metadata: ContentMetadata
}

export interface EnhancedSection {
  section_id: string
  section_name: string
  original_content: any
  enhanced_content: any
  ai_enhancements: AIEnhancement[]
  methodology_enhancements: MethodologyEnhancement[]
  quality_improvements: QualityImprovement[]
  enhancement_confidence: number
  enhancement_reasoning: string
}

export interface EnhancedVariable {
  variable_name: string
  variable_type: string
  original_definition: any
  enhanced_definition: any
  resolution_strategy: string
  resolution_confidence: number
  resolution_source: string
}

export interface EnhancedStructure {
  original_structure: any
  enhanced_structure: any
  structure_improvements: StructureImprovement[]
  optimization_recommendations: string[]
}

export interface EnhancedFormatting {
  original_formatting: any
  enhanced_formatting: any
  formatting_improvements: FormattingImprovement[]
  style_enhancements: StyleEnhancement[]
}

export interface AIInsight {
  insight_id: string
  insight_type: AIInsightType
  insight_title: string
  insight_description: string
  confidence_score: number
  relevance_score: number
  implementation_suggestion: string
  expected_impact: number
}

export type AIInsightType = 
  | 'content_improvement'
  | 'structure_optimization'
  | 'methodology_alignment'
  | 'quality_enhancement'
  | 'performance_optimization'
  | 'user_experience'
  | 'best_practices'

export interface AIEnhancement {
  enhancement_id: string
  enhancement_type: string
  enhancement_description: string
  original_content: string
  enhanced_content: string
  confidence_score: number
  reasoning: string
}

export interface MethodologyEnhancement {
  enhancement_id: string
  framework: string
  enhancement_type: string
  enhancement_description: string
  original_content: any
  enhanced_content: any
  compliance_score: number
  best_practices_applied: string[]
}

export interface QualityImprovement {
  improvement_id: string
  improvement_type: string
  improvement_description: string
  original_quality: number
  improved_quality: number
  improvement_impact: number
  implementation: string
}

export interface PerformanceOptimization {
  optimization_id: string
  optimization_type: string
  optimization_description: string
  original_performance: number
  optimized_performance: number
  optimization_impact: number
  implementation: string
}

export interface StructureImprovement {
  improvement_id: string
  improvement_type: string
  improvement_description: string
  original_structure: any
  improved_structure: any
  improvement_impact: number
}

export interface FormattingImprovement {
  improvement_id: string
  improvement_type: string
  improvement_description: string
  original_formatting: any
  improved_formatting: any
  improvement_impact: number
}

export interface StyleEnhancement {
  enhancement_id: string
  style_type: string
  enhancement_description: string
  original_style: any
  enhanced_style: any
  enhancement_impact: number
}

export interface ContentMetadata {
  content_type: string
  content_length: number
  content_complexity: number
  content_quality: number
  enhancement_applied: boolean
  enhancement_timestamp: Date
}

export interface EnhancementMetadata {
  enhancement_id: string
  enhancement_timestamp: Date
  enhancement_duration: number
  enhancement_strategies: string[]
  enhancement_confidence: number
  enhancement_impact: number
  quality_improvement: number
  performance_improvement: number
}

export interface VariableResolution {
  variable_name: string
  resolution_strategy: VariableResolutionStrategy
  resolved_value: any
  resolution_confidence: number
  resolution_source: string
  resolution_timestamp: Date
}

export type VariableResolutionStrategy = 
  | 'context_extraction'
  | 'user_profile'
  | 'ai_generation'
  | 'default_value'
  | 'template_inheritance'
  | 'external_api'

export interface TemplateRecommendation {
  recommendation_id: string
  recommendation_type: RecommendationType
  recommendation_title: string
  recommendation_description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  implementation: string
  expected_impact: number
  effort_required: 'low' | 'medium' | 'high'
  timeframe: string
}

export type RecommendationType = 
  | 'structure_improvement'
  | 'content_enhancement'
  | 'methodology_alignment'
  | 'quality_improvement'
  | 'performance_optimization'
  | 'user_experience'
  | 'best_practices'

export interface TemplateQualityAssessment {
  assessment_id: string
  template_id: string
  overall_score: number
  structure_quality: number
  content_quality: number
  methodology_compliance: number
  ai_enhancement_quality: number
  performance_quality: number
  assessments: QualityAssessment[]
  issues: QualityIssue[]
  recommendations: QualityRecommendation[]
  assessment_timestamp: Date
}

export interface QualityAssessment {
  assessment_type: string
  score: number
  criteria: QualityCriteria[]
  findings: QualityFinding[]
  recommendations: QualityRecommendation[]
}

export interface QualityCriteria {
  criterion_id: string
  criterion_name: string
  criterion_description: string
  score: number
  weight: number
  status: 'pass' | 'fail' | 'warning'
}

export interface QualityFinding {
  finding_id: string
  finding_type: string
  finding_description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  location: string
  suggestion: string
}

export interface QualityRecommendation {
  recommendation_id: string
  recommendation_type: string
  recommendation_title: string
  recommendation_description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  implementation: string
  expected_impact: number
}

export interface QualityIssue {
  issue_id: string
  issue_type: string
  issue_description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  location: string
  resolution: string
  status: 'open' | 'resolved' | 'ignored'
}

export interface TemplateOptimization {
  optimization_id: string
  template_id: string
  optimization_type: OptimizationType
  original_metrics: TemplateMetrics
  optimized_metrics: TemplateMetrics
  optimizations_applied: Optimization[]
  optimization_impact: number
  optimization_timestamp: Date
}

export type OptimizationType = 
  | 'structure_optimization'
  | 'content_optimization'
  | 'performance_optimization'
  | 'quality_optimization'
  | 'user_experience_optimization'

export interface TemplateMetrics {
  processing_time: number
  quality_score: number
  user_satisfaction: number
  error_rate: number
  completion_rate: number
  performance_score: number
}

export interface Optimization {
  optimization_id: string
  optimization_type: string
  optimization_description: string
  original_value: number
  optimized_value: number
  improvement_percentage: number
  implementation: string
}

export interface TemplateProcessingJob {
  job_id: string
  request_id: string
  status: TemplateProcessingStatus
  created_at: Date
  started_at?: Date
  completed_at?: Date
  progress: number
  current_stage?: string
  metadata: Record<string, any>
}

export interface TemplateProcessingStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  current_stage?: string
  stages_completed: string[]
  stages_remaining: string[]
  estimated_completion?: Date
  error?: ProcessingError
}

export interface ProcessingError {
  error_id: string
  error_type: string
  error_message: string
  error_code: string
  timestamp: Date
  context: Record<string, any>
}

export interface TemplateProcessingMetrics {
  processing_time: number
  enhancement_time: number
  quality_assessment_time: number
  optimization_time: number
  total_stages: number
  completed_stages: number
  failed_stages: number
  quality_score: number
  performance_score: number
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  suggestions: ValidationSuggestion[]
}

export interface ValidationError {
  field: string
  error_code: string
  message: string
  severity: 'error' | 'warning' | 'info'
}

export interface ValidationWarning {
  field: string
  warning_code: string
  message: string
  impact: string
}

export interface ValidationSuggestion {
  field: string
  suggestion: string
  reason: string
  impact: string
}

// Supporting types
export interface DocumentTemplate {
  id: string
  name: string
  description: string
  framework: string
  category: string
  content: any
  variables: any[]
  system_prompt?: string
  context_injection_config?: any
  prompt_build_up?: any
  metadata: Record<string, any>
}

export interface ContextBundle {
  bundle_id: string
  context_data: any
  quality_assessment: any
  metadata: Record<string, any>
}

// Additional types for engines
export interface AIInsight {
  insight_id: string
  insight_type: string
  insight_title: string
  insight_description: string
  confidence_score: number
  impact_score: number
  recommendations: AIInsightRecommendation[]
  metadata: {
    generated_at: Date
    source: string
    version: string
  }
}

export interface AIInsightRecommendation {
  recommendation: string
  priority: string
  effort: string
}

export interface MethodologyEnhancement {
  enhancement_id: string
  framework: string
  enhancement_type: string
  enhancement_description: string
  enhancement_impact: number
  enhancement_confidence: number
  applied_at: Date
  metadata: {
    template_id: string
    framework_version: string
    alignment_score: number
  }
}

export interface MethodologyComplianceValidation {
  validation_id: string
  framework: string
  compliance_score: number
  compliance_level: string
  validation_results: ComplianceValidationResult[]
  validation_timestamp: Date
  metadata: {
    template_id: string
    framework_version: string
    validation_method: string
  }
}

export interface ComplianceValidationResult {
  requirement_id: string
  requirement_name: string
  compliance_status: string
  compliance_score: number
  validation_details: string
}

export interface TemplateQualityAssessment {
  assessment_id: string
  template_id: string
  overall_score: number
  quality_dimensions: {
    structure_quality: number
    content_quality: number
    methodology_compliance: number
    usability_quality: number
    performance_quality: number
  }
  assessments: QualityAssessmentDetail[]
  assessment_timestamp: Date
  metadata: {
    assessment_method: string
    assessment_version: string
  }
}

export interface QualityAssessmentDetail {
  assessment_type: string
  assessment_score: number
  assessment_details: string
  recommendations: QualityRecommendation[]
}

export interface QualityRecommendation {
  recommendation: string
  priority: string
  effort: string
}

export interface TemplateOptimization {
  optimization_id: string
  template_id: string
  optimization_impact: number
  optimization_score: number
  optimizations_applied: OptimizationDetail[]
  performance_improvements: {
    processing_time_reduction: number
    memory_usage_reduction: number
    output_quality_improvement: number
  }
  optimization_timestamp: Date
  metadata: {
    optimization_method: string
    optimization_version: string
  }
}

export interface OptimizationDetail {
  optimization_type: string
  optimization_description: string
  optimization_impact: number
  optimization_confidence: number
  applied_at: Date
  metadata: {
    optimization_category: string
    optimization_method: string
  }
}

export interface VariableResolution {
  variable_id: string
  variable_name: string
  variable_type: string
  resolved_value: any
  resolution_confidence: number
  resolution_source: string
  resolution_timestamp: Date
  metadata: {
    resolution_method: string
    resolution_context: any
  }
}

