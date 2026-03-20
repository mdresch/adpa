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
}

export interface ContentMetrics {
  words?: number
  characters?: string | number
  sentences?: number
  paragraphs?: number
  avgWordsPerSentence?: string
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
  documentDatas_used?: number
  documentDatas_used_as_context?: number
  total_documentDatas?: number
  total_documentDatas_available?: number
  project_context_used?: boolean
  stakeholders_included?: number
  estimated_context_tokens?: number
}

export interface GenerationMetadata {
  aiProcessing?: AIProcessing
  contentMetrics?: ContentMetrics
  qualityMetrics?: QualityMetrics
  quality_gate_results?: QualityGate[]
  quality_gates?: QualityGate[]
  source_documentDatas?: any[]
  sourceDocuments?: any[]
  context_stats?: ContextStats
  framework?: string
  template?: {
    framework?: string
  }
  generation?: {
    durationFormatted?: string
    duration?: number
  }
}

export interface ADPADocument {
  id: string
  name: string
  content?: any
  template_id?: string
  template_name?: string
  status: string
  version: number
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
  template_category?: string
  template_complexity?: string
  confluence_page_url?: string
  generation_metadata?: GenerationMetadata
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
