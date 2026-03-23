/**
 * Multi-Stage Document Processor Types
 * Defines TypeScript interfaces and types for the 6-stage document processing pipeline
 */

export interface MultiStageDocumentProcessor {
  // Main processing pipeline
  processDocument(request: DocumentProcessingRequest): Promise<DocumentProcessingResult>
  processDocumentAsync(request: DocumentProcessingRequest): Promise<DocumentProcessingJob>
  getProcessingStatus(jobId: string): Promise<ProcessingStatus>
  cancelProcessing(jobId: string): Promise<void>
  
  // Stage management
  executeStage(stageId: string, input: StageInput): Promise<StageOutput>
  executeStageAsync(stageId: string, input: StageInput): Promise<StageJob>
  getStageStatus(jobId: string): Promise<StageStatus>
  
  // Pipeline configuration
  configurePipeline(config: PipelineConfig): Promise<void>
  getPipelineConfig(): Promise<PipelineConfig>
  validatePipelineConfig(config: PipelineConfig): Promise<ValidationResult>
  
  // Monitoring and analytics
  getProcessingMetrics(timeframe: string): Promise<ProcessingMetrics>
  getStageMetrics(stageId: string, timeframe: string): Promise<StageMetrics>
  getProcessingHistory(filters?: ProcessingHistoryFilters): Promise<ProcessingHistory[]>
}

export interface DocumentProcessingRequest {
  request_id: string
  template_id: string
  project_id: string
  user_id: string
  processing_config: ProcessingConfig
  context_config?: ContextConfig
  quality_config?: QualityConfig
  output_config?: OutputConfig
  metadata?: Record<string, any>
}

export interface ProcessingConfig {
  enable_parallel_processing: boolean
  enable_quality_gates: boolean
  enable_refinement: boolean
  enable_personalization: boolean
  max_processing_time: number
  retry_attempts: number
  quality_thresholds: QualityThresholds
  stage_configs: StageConfig[]
}

export interface QualityThresholds {
  content_quality: number
  methodology_compliance: number
  stakeholder_satisfaction: number
  technical_accuracy: number
  overall_quality: number
}

export interface StageConfig {
  stage_id: string
  stage_type: StageType
  enabled: boolean
  timeout: number
  retry_attempts: number
  quality_threshold: number
  fail_on_error?: boolean
  config: Record<string, any>
}

export type StageType = 
  | 'context_gathering'
  | 'template_processing'
  | 'ai_generation'
  | 'context_injection'
  | 'quality_assurance'
  | 'output_formatting'

export interface ContextConfig {
  context_sources: ContextSource[]
  injection_strategy: InjectionStrategy
  max_context_length: number
  context_priority: ContextPriority
  enable_semantic_search: boolean
  enable_historical_analysis: boolean
}

export interface ContextSource {
  source_id: string
  source_type: ContextSourceType
  enabled: boolean
  priority: number
  config: Record<string, any>
}

export type ContextSourceType = 
  | 'project_data'
  | 'user_profile'
  | 'document_history'
  | 'stakeholder_input'
  | 'external_api'
  | 'best_practices'
  | 'semantic_search'
  | 'historical_analysis'

export type InjectionStrategy = 
  | 'prepend'
  | 'append'
  | 'interleave'
  | 'structured'
  | 'adaptive'

export type ContextPriority = 
  | 'high'
  | 'medium'
  | 'low'

export interface QualityConfig {
  enable_content_quality_check: boolean
  enable_methodology_compliance_check: boolean
  enable_stakeholder_validation: boolean
  enable_technical_accuracy_check: boolean
  quality_gates: QualityGate[]
  assessment_criteria: AssessmentCriteria
}

export interface QualityGate {
  gate_id: string
  gate_name: string
  stage_id: string
  criteria: QualityCriteria[]
  threshold: number
  action_on_failure: 'stop' | 'warn' | 'continue'
}

export interface QualityCriteria {
  criterion_id: string
  criterion_name: string
  metric: string
  threshold: number
  weight: number
}

export interface AssessmentCriteria {
  content_quality: ContentQualityCriteria
  methodology_compliance: MethodologyComplianceCriteria
  stakeholder_requirements: StakeholderRequirementCriteria
  technical_accuracy: TechnicalAccuracyCriteria
}

export interface ContentQualityCriteria {
  completeness: CompletenessCriteria
  clarity: ClarityCriteria
  consistency: ConsistencyCriteria
  readability: ReadabilityCriteria
}

export interface CompletenessCriteria {
  required_sections: string[]
  minimum_content_length: number
  required_variables: string[]
  coverage_threshold: number
}

export interface ClarityCriteria {
  readability_score: number
  sentence_complexity: number
  terminology_consistency: boolean
  structure_clarity: number
}

export interface ConsistencyCriteria {
  terminology_consistency: boolean
  formatting_consistency: boolean
  style_consistency: boolean
  reference_consistency: boolean
}

export interface ReadabilityCriteria {
  flesch_reading_ease: number
  flesch_kincaid_grade: number
  gunning_fog_index: number
  automated_readability_index: number
}

export interface MethodologyComplianceCriteria {
  framework_requirements: FrameworkRequirement[]
  best_practices: BestPractice[]
  compliance_threshold: number
}

export interface FrameworkRequirement {
  requirement_id: string
  requirement_name: string
  framework: string
  mandatory: boolean
  weight: number
}

export interface BestPractice {
  practice_id: string
  practice_name: string
  category: string
  importance: 'high' | 'medium' | 'low'
  weight: number
}

export interface StakeholderRequirementCriteria {
  stakeholder_requirements: StakeholderRequirement[]
  validation_method: 'automated' | 'manual' | 'hybrid'
  satisfaction_threshold: number
}

export interface StakeholderRequirement {
  requirement_id: string
  stakeholder_id: string
  requirement_type: string
  description: string
  priority: 'high' | 'medium' | 'low'
  weight: number
}

export interface TechnicalAccuracyCriteria {
  fact_checking: boolean
  reference_validation: boolean
  data_accuracy: boolean
  technical_correctness: boolean
}

export interface OutputConfig {
  primary_format: OutputFormat
  secondary_formats: OutputFormat[]
  delivery_options: DeliveryOption[]
  metadata_inclusion: boolean
  quality_report_inclusion: boolean
}

export type OutputFormat = 
  | 'pdf'
  | 'docx'
  | 'markdown'
  | 'html'
  | 'json'
  | 'xml'

export interface DeliveryOption {
  delivery_method: DeliveryMethod
  destination: string
  format: OutputFormat
  metadata: Record<string, any>
}

export type DeliveryMethod = 
  | 'download'
  | 'email'
  | 'storage'
  | 'api'
  | 'webhook'

export interface DocumentProcessingResult {
  result_id: string
  request_id: string
  status: ProcessingStatus
  stages: StageResult[]
  final_document: ProcessedDocument
  quality_report: QualityReport
  processing_metrics: ProcessingMetrics
  metadata: Record<string, any>
}

export interface ProcessedDocument {
  document_id: string
  template_id: string
  project_id: string
  user_id: string
  content: DocumentContent
  formats: Record<OutputFormat, FormattedContent>
  metadata: DocumentMetadata
  quality_scores: QualityScores
  created_at: Date
  updated_at: Date
}

export interface DocumentContent {
  sections: Record<string, DocumentSection>
  variables: Record<string, any>
  context: ContextData
  personalization: PersonalizationData
}

export interface DocumentSection {
  section_id: string
  section_name: string
  content: string
  format: string
  metadata: Record<string, any>
}

export interface GkgContextData {
  markdown: string
  unitsCount: number
  documentsCount: number
  entityTypes: string[]
}

export interface ContextData {
  project_context: ProjectContext
  user_context: UserContext
  historical_context: HistoricalContext
  external_context: ExternalContext
  stakeholder_context?: StakeholderContext
  business_context?: BusinessContext
  organization_context?: OrganizationContext
  /** GKG semantic units for LLM context (from template gkg_context_strategy). */
  gkg_context?: GkgContextData
}

export interface ProjectContext {
  project_data: Record<string, any>
  stakeholders?: Stakeholder[]
  requirements?: Requirement[]
  constraints?: Constraint[]
  risks?: Risk[]
  project_id?: string
  project_name?: string
  project_description?: string
  project_status?: string
  start_date?: Date | string
  end_date?: Date | string
  budget?: number
  priority?: string
  owner?: {
    name?: string
    email?: string
  }
  metadata?: Record<string, any>
  created_at?: Date | string
  updated_at?: Date | string
  industry_terms?: TerminologyPreference[]
}

export interface UserContext {
  user_profile: UserProfile
  preferences: UserPreferences
  expertise: UserExpertise
  writing_style: WritingStyle
}

export interface HistoricalContext {
  similar_documents: Document[]
  best_practices: BestPractice[]
  patterns: Pattern[]
  trends: Trend[]
}

export interface ExternalContext {
  external_data: Record<string, any>
  api_responses: Record<string, any>
  integrations: Integration[]
}

export interface StakeholderContext {
  stakeholders?: StakeholderProfile[]
  total_stakeholders?: number
  high_influence?: number
  high_interest?: number
  preferred_terminology?: TerminologyPreference[]
}

export interface StakeholderProfile {
  id?: string
  stakeholder_id?: string
  name?: string
  role?: string
  organization?: string
  email?: string
  phone?: string
  interest_level?: string
  influence_level?: string
  engagement_strategy?: string
  communication_preferences?: Record<string, any>
  expectations?: Record<string, any>
  concerns?: Record<string, any>
  metadata?: Record<string, any>
}

export interface TerminologyPreference {
  generic_term: string
  preferred_term: string
  context?: string
}

export interface BusinessContext {
  industry?: string
  company_profile?: Record<string, any>
  objectives?: string[]
  strategy?: string
  metadata?: Record<string, any>
}

export interface OrganizationContext {
  terminology?: TerminologyPreference[]
  values?: string[]
  culture?: string
  metadata?: Record<string, any>
}

export interface PersonalizationData {
  writing_style_applied: WritingStyle
  terminology_applied: Terminology
  complexity_level: ComplexityLevel
  cultural_considerations: CulturalConsiderations
}

export interface FormattedContent {
  format: OutputFormat
  content: string | Buffer
  metadata: Record<string, any>
  size: number
  generated_at: Date
}

export interface DocumentMetadata {
  template_info: TemplateInfo
  processing_info: ProcessingInfo
  quality_info: QualityInfo
  context_info: ContextInfo
}

export interface TemplateInfo {
  template_id: string
  template_name: string
  framework: string
  version: string
  created_by: string
}

export interface ProcessingInfo {
  processing_id: string
  stages_completed: string[]
  processing_time: number
  quality_gates_passed: string[]
  refinements_applied: string[]
}

export interface QualityInfo {
  overall_score: number
  content_quality_score: number
  methodology_compliance_score: number
  stakeholder_satisfaction_score: number
  technical_accuracy_score: number
}

export interface ContextInfo {
  context_sources_used: string[]
  context_quality_score: number
  context_relevance_score: number
  context_freshness_score: number
}

export interface QualityScores {
  overall: number
  content_quality: number
  methodology_compliance: number
  stakeholder_satisfaction: number
  technical_accuracy: number
  readability: number
  completeness: number
  consistency: number
}

export interface QualityReport {
  report_id: string
  document_id: string
  overall_score: number
  assessments: QualityAssessment[]
  recommendations: QualityRecommendation[]
  issues: QualityIssue[]
  metadata: Record<string, any>
}

export interface QualityAssessment {
  assessment_id: string
  assessment_type: string
  score: number
  criteria: QualityCriteria[]
  findings: QualityFinding[]
  recommendations: QualityRecommendation[]
}

export interface QualityFinding {
  finding_id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: string
  suggestion: string
}

export interface QualityRecommendation {
  recommendation_id: string
  type: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  implementation: string
  expected_impact: number
}

export interface QualityIssue {
  issue_id: string
  type: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  location: string
  resolution: string
  status: 'open' | 'resolved' | 'ignored'
}

export interface ProcessingMetrics {
  total_requests: number
  successful_requests: number
  failed_requests: number
  average_processing_time: number
  stage_metrics: Record<StageType, StageMetrics>
  quality_metrics: QualityMetrics
  performance_metrics: PerformanceMetrics
}

export interface StageMetrics {
  stage_id: string
  stage_type: StageType
  total_executions: number
  successful_executions: number
  failed_executions: number
  average_execution_time: number
  quality_scores: number[]
  error_rates: number[]
}

export interface QualityMetrics {
  average_quality_score: number
  quality_distribution: Record<string, number>
  improvement_trends: Trend[]
  common_issues: QualityIssue[]
}

export interface PerformanceMetrics {
  average_response_time: number
  throughput: number
  resource_utilization: ResourceUtilization
  error_rates: ErrorRates
}

export interface ResourceUtilization {
  cpu_usage: number
  memory_usage: number
  disk_usage: number
  network_usage: number
}

export interface ErrorRates {
  total_errors: number
  error_rate: number
  error_types: Record<string, number>
  error_trends: Trend[]
}

export interface Trend {
  metric: string
  timeframe: string
  data_points: TrendDataPoint[]
  trend_direction: 'increasing' | 'decreasing' | 'stable'
}

export interface TrendDataPoint {
  timestamp: Date
  value: number
  metadata: Record<string, any>
}

export interface DocumentProcessingJob {
  job_id: string
  request_id: string
  status: ProcessingStatus
  created_at: Date
  started_at?: Date
  completed_at?: Date
  progress: number
  current_stage?: string
  stages: StageJob[]
  metadata: Record<string, any>
}

export interface StageJob {
  job_id: string
  stage_id: string
  stage_type: StageType
  status: StageStatus
  created_at: Date
  started_at?: Date
  completed_at?: Date
  progress: number
  input: StageInput
  output?: StageOutput
  error?: ProcessingError
  metadata: Record<string, any>
}

export interface StageInput {
  stage_id: string
  stage_type: StageType
  input_data: any
  context: ContextData
  config: StageConfig
  metadata: Record<string, any>
}

export interface StageOutput {
  stage_id: string
  stage_type: StageType
  output_data: any
  quality_score: number
  processing_time: number
  metadata: Record<string, any>
}

export interface ProcessingStatus {
  job_id?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  started_at?: Date
  completed_at?: Date
  current_stage?: string
  stages_completed: string[]
  stages_remaining: string[]
  estimated_completion?: Date
  error?: ProcessingError
  metadata?: Record<string, any>
}

export interface StageStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  started_at?: Date
  completed_at?: Date
  error?: ProcessingError
}

export interface ProcessingError {
  error_id: string
  error_type: string
  error_message: string
  error_code: string
  stage_id?: string
  timestamp: Date
  stack_trace?: string
  context: Record<string, any>
}

export interface StageResult {
  stage_id: string
  stage_type: StageType
  status: 'completed' | 'failed' | 'skipped'
  execution_time: number
  quality_score: number
  output: StageOutput
  input?: any
  startedAt?: Date
  completedAt?: Date
  error?: ProcessingError
  metadata: Record<string, any>
}

export interface PipelineConfig {
  pipeline_id: string
  pipeline_name: string
  description: string
  stages: PipelineStage[]
  global_config: GlobalConfig
  quality_gates: QualityGate[]
  monitoring_config: MonitoringConfig
  created_at: Date
  updated_at: Date
}

export interface PipelineStage {
  stage_id: string
  stage_type: StageType
  name: string
  description: string
  order: number
  enabled: boolean
  config: StageConfig
  dependencies: string[]
  timeout: number
  retry_attempts: number
}

export interface GlobalConfig {
  enable_parallel_processing: boolean
  enable_quality_gates: boolean
  enable_monitoring: boolean
  max_processing_time: number
  default_retry_attempts: number
  quality_thresholds: QualityThresholds
}

export interface MonitoringConfig {
  enable_metrics_collection: boolean
  enable_error_tracking: boolean
  enable_performance_monitoring: boolean
  metrics_retention_period: number
  alert_thresholds: AlertThreshold[]
}

export interface AlertThreshold {
  metric: string
  threshold: number
  condition: 'greater_than' | 'less_than' | 'equals'
  severity: 'low' | 'medium' | 'high' | 'critical'
  notification_channels: string[]
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

export interface ProcessingHistoryFilters {
  user_id?: string
  project_id?: string
  template_id?: string
  status?: string
  date_from?: Date
  date_to?: Date
  limit?: number
  offset?: number
}

export interface ProcessingHistory {
  history_id: string
  request_id: string
  user_id: string
  project_id: string
  template_id: string
  status: string
  created_at: Date
  completed_at?: Date
  processing_time?: number
  quality_score?: number
  stages_completed: string[]
  error?: ProcessingError
}

// Additional supporting types
export interface Stakeholder {
  stakeholder_id: string
  name: string
  role: string
  email: string
  influence: 'high' | 'medium' | 'low'
  interest: 'high' | 'medium' | 'low'
  requirements: Requirement[]
}

export interface Requirement {
  requirement_id: string
  title: string
  description: string
  type: string
  priority: 'high' | 'medium' | 'low'
  status: 'open' | 'in_progress' | 'completed' | 'cancelled'
  stakeholder_id: string
}

export interface Constraint {
  constraint_id: string
  title: string
  description: string
  type: string
  impact: 'high' | 'medium' | 'low'
  status: 'active' | 'resolved' | 'mitigated'
}

export interface Risk {
  risk_id: string
  title: string
  description: string
  probability: 'high' | 'medium' | 'low'
  impact: 'high' | 'medium' | 'low'
  mitigation: string
  status: 'open' | 'mitigated' | 'accepted'
}

export interface UserProfile {
  user_id: string
  name: string
  email: string
  role: string
  department: string
  expertise_areas: string[]
  experience_level: 'junior' | 'mid' | 'senior' | 'expert'
}

export interface UserPreferences {
  language: string
  timezone: string
  date_format: string
  number_format: string
  currency: string
  units: string
}

export interface UserExpertise {
  domain_expertise: string[]
  technical_skills: string[]
  certifications: string[]
  experience_years: number
  proficiency_level: Record<string, 'beginner' | 'intermediate' | 'advanced' | 'expert'>
}

export interface WritingStyle {
  tone: 'formal' | 'informal' | 'professional' | 'casual'
  voice: 'first_person' | 'second_person' | 'third_person'
  complexity: 'simple' | 'moderate' | 'complex'
  length_preference: 'concise' | 'detailed' | 'comprehensive'
}

export interface Terminology {
  preferred_terms: Record<string, string>
  avoided_terms: string[]
  domain_specific: Record<string, string>
  acronyms: Record<string, string>
}

export interface ComplexityLevel {
  target_audience: 'general' | 'technical' | 'expert'
  detail_level: 'high_level' | 'detailed' | 'comprehensive'
  technical_depth: 'basic' | 'intermediate' | 'advanced'
}

export interface CulturalConsiderations {
  cultural_context: string
  language_preferences: string[]
  communication_style: string
  cultural_sensitivity: boolean
}

export interface Document {
  document_id: string
  title: string
  type: string
  content: string
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export interface Pattern {
  pattern_id: string
  pattern_name: string
  pattern_type: string
  description: string
  frequency: number
  confidence: number
}

export interface Integration {
  integration_id: string
  integration_type: string
  source: string
  destination: string
  config: Record<string, any>
  status: 'active' | 'inactive' | 'error'
}

