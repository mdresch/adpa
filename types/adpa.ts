export interface Feedback {
  id: string
  user: string
  comment: string
  rating: number
  timestamp: string
}

export interface AIProcessing {
  provider?: string
  model?: string
  processingTime?: string
  processingTimeMs?: number
  tokens?: {
    prompt: number
    completion: number
    total: number
    cost?: string | number
  }
}

export interface ContentMetrics {
  words?: string | number
  characters?: string | number
  sentences?: string | number
  paragraphs?: string | number
  avgWordsPerSentence?: string | number
  readingTime?: number
}

export interface QualityMetrics {
  overallQuality?: number
  completeness?: number
  structureScore?: number
  formattingScore?: number
  contentDepth?: number
  accuracy?: number
  consistency?: number
  contextRelevance?: number
  professionalQuality?: number
  standardsCompliance?: number
}

export interface QualityGateCriterion {
  criterion_id: string
  criterion_name?: string
  passed: boolean
  score?: number
}

export interface QualityGate {
  gate_id: string
  gate_name?: string
  passed: boolean
  score?: number
  message?: string
  criteria_results?: QualityGateCriterion[]
}

export interface ContextStats {
  documents_used?: number | string
  documents_used_as_context?: number | string
  total_documents?: number | string
  total_documents_available?: number | string
  project_context_used?: boolean
  stakeholders_included?: number | string
  estimated_context_tokens?: number | string
  stakeholders_available?: number | string
  custom_settings_count?: number | string
  custom_metadata_count?: number | string
  // Legacy aliases
  project_context_included?: boolean
  custom_settings_included?: number | string
  custom_metadata_included?: number | string
}

export interface GenerationMetadata {
  aiProcessing?: AIProcessing
  contentMetrics?: ContentMetrics
  qualityMetrics?: QualityMetrics | any
  quality_gate_results?: QualityGate[]
  quality_gates?: QualityGate[]
  source_documentDatas?: any[]
  sourceDocuments?: any[]
  source_documents?: any[]
  context_stats?: ContextStats
  framework?: string
  wordCount?: number
  characterCount?: number
  template?: {
    framework?: string
  }
  generation?: {
    durationFormatted?: string
    duration?: number
  }
  provider?: string
  model?: string
  temperature?: number
  prompt?: string
}

export interface DocumentVersion {
  id: string
  document_id: string
  version_number: number
  version: string // semantic version as string for display
  content: any
  author?: string
  changes?: string
  created_by: string
  created_at: string
  semantic_version?: string
  is_current?: boolean
  change_description?: string
  metadata?: any
  word_count?: number
}

export interface ADPADocument {
  id: string
  name: string
  content?: any
  template_id?: string
  template_name?: string
  project_id?: string
  status: string
  version: number
  author?: string
  created_by: string
  updated_by: string
  created_by_name?: string
  updated_by_name?: string
  created_at: string
  updated_at: string
  title?: string
  framework?: string
  word_count?: number
  character_count?: number
  sentence_count?: number
  paragraph_count?: number
  file_size?: number
  mime_type?: string
  tags?: string[]
  project_name?: string
  semantic_version?: string
  template_version?: string
  template_author?: string
  template_framework?: string
  template_category?: string
  template_complexity?: string
  quality_score?: number
  quality_status?: 'passed' | 'warning' | 'failed' | 'pending' | 'not_audited'
  quality_audit_id?: string
  confluence_page_url?: string
  generation_metadata?: GenerationMetadata
  compression_ratio?: number
  original_size?: string
  compressed_size?: string
  processing_time?: string
  ai_model?: string
  input_tokens?: number
  output_tokens?: number
  source_documents?: any[]
  comments?: any[]
  loaded_version?: string | null
  loaded_version_id?: string | null
  metadata: {
    ai_model?: string
    processing_time?: string
    compression_ratio?: number
    framework_compliance?: number
    review_score?: number
    quality_score?: number
    readability_score?: number
    complexity_score?: number
    stakeholder_feedback?: Feedback[]
    generation_stats?: {
      tokens_used?: number
      cost?: number
      model_version?: string
      temperature?: number
      max_tokens?: number
    }
    compliance_metrics?: {
      template_alignment?: number
      framework_adherence?: number
      quality_gates_passed?: number
      review_cycles?: number
    }
    technical_metadata?: {
      file_hash?: string
      encoding?: string
      language?: string
      structure_analysis?: {
        sections?: number
        subsections?: number
        tables?: number
        figures?: number
      }
    }
    author?: string
    reviewer?: string
    category?: string
    priority?: string
    due_date?: string
    description?: string
    notes?: string
    custom_fields?: Record<string, any>
  }
}

export interface QualityAudit {
  overall_score: number
  overall_grade: string
  quality_level: string
  completeness_score: number
  consistency_score: number
  standards_compliance_score: number
  compliance_metrics?: {
    overallComplianceRating: number
    pmbokGuide?: number
    gdpr?: number
    hipaa?: number
    soc2?: number
    euAIAct?: {
      passed: boolean
      overallScore: number
      criteria: {
        transparency: { passed: boolean; score: number }
        humanOversight: { passed: boolean; score: number }
        accuracy: { passed: boolean; score: number }
        dataGovernance: { passed: boolean; score: number }
        recordKeeping: { passed: boolean; score: number }
      }
    }
  }
  issues?: any[]
  audited_at: string
}

export interface DocumentMetadata {
  name: string
  status: string
  tags: string[]
  template_id?: string
  framework?: string
  category?: string
  priority?: string
  author?: string
  reviewer?: string
  due_date?: string
  description?: string
  notes?: string
  custom_fields?: Record<string, any>
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  name?: string
  permissions?: Record<string, boolean> | string[]
}

export interface ProjectContext {
  id: string
  name: string
  description: string
  framework: string
  metadata: Record<string, any>
  stakeholders: Array<{
    id: string
    name: string
    role: string
    email: string
    department?: string
    stakeholder_type: 'external' | 'internal'
    stakeholder_category: 'primary' | 'secondary'
    influence_level?: string | number
    interest_level?: string | number
  }>
  documents: Array<{
    id: string
    name: string
    type: string
    content: string
    metadata: Record<string, any>
  }>
  created_at?: Date | string
  updated_at?: Date | string
  // Extended properties for specific service needs
  project_id?: string
  project_name?: string
  project_type?: string
  project_phase?: string
  project_goals?: string[]
  project_constraints?: string[]
  project_timeline?: string
  project_budget?: number | string
  budget?: number | string
  status?: string
  project_team?: any[]
  project_stakeholders?: any[]
}

export interface ProcessingStatus {
  job_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  started_at: Date | string
  completed_at?: Date | string
  error?: string
  stages_completed?: string[]
  stages_remaining?: string[]
  metadata: Record<string, any>
}
