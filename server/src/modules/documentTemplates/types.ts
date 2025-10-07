/**
 * Document Templates Module Types
 * Defines TypeScript interfaces and types for document template management
 */

export interface DocumentTemplate {
  id: string
  name: string
  description?: string
  framework: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom'
  category?: string
  content: Record<string, any>
  variables: TemplateVariable[]
  is_public: boolean
  created_by: string
  usage_count: number
  created_at: Date
  updated_at: Date
  deleted_at?: Date
  deleted_by?: string
  created_by_name?: string
  // Enhanced fields for AI integration
  system_prompt?: string
  context_injection_config?: ContextInjectionConfig
  prompt_build_up?: PromptBuildUpConfig
  template_paragraphs?: TemplateParagraph[]
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  required: boolean
  default?: any
  options?: string[]
  description?: string
}

export interface ContextInjectionConfig {
  enabled: boolean
  sources: ContextSource[]
  injection_strategy: 'prepend' | 'append' | 'interleave' | 'structured'
  max_context_length?: number
  context_priority?: 'high' | 'medium' | 'low'
}

export interface ContextSource {
  type: 'project_data' | 'user_preferences' | 'document_history' | 'external_api' | 'database_query' | 'file_content'
  source_id: string
  source_name: string
  query?: string
  parameters?: Record<string, any>
  weight?: number
  enabled: boolean
}

export interface PromptBuildUpConfig {
  enabled: boolean
  stages: PromptStage[]
  final_format: 'markdown' | 'structured_json' | 'plain_text' | 'html'
  include_metadata: boolean
}

export interface PromptStage {
  stage_name: string
  stage_type: 'context_gathering' | 'template_processing' | 'ai_generation' | 'post_processing'
  prompt_template: string
  variables: string[]
  dependencies?: string[]
  order: number
  enabled: boolean
}

export interface TemplateParagraph {
  section_name: string
  section_type: 'header' | 'paragraph' | 'list' | 'table' | 'code_block' | 'summary' | 'conclusion'
  description: string
  required: boolean
  order: number
  prompt_guidance?: string // Specific guidance for AI on how to generate this section
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  framework: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom'
  category?: string
  content: Record<string, any>
  variables?: TemplateVariable[]
  is_public?: boolean
  system_prompt?: string
  context_injection_config?: ContextInjectionConfig
  prompt_build_up?: PromptBuildUpConfig
  template_paragraphs?: TemplateParagraph[]
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  framework?: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom'
  category?: string
  content?: Record<string, any>
  variables?: TemplateVariable[]
  is_public?: boolean
  system_prompt?: string
  context_injection_config?: ContextInjectionConfig
  prompt_build_up?: PromptBuildUpConfig
  template_paragraphs?: TemplateParagraph[]
}

export interface CloneTemplateRequest {
  name: string
  description?: string
  is_public?: boolean
}

export interface TemplateListQuery {
  page?: number
  limit?: number
  framework?: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom'
  category?: string
  search?: string
  is_public?: boolean
}

export interface TemplateListResponse {
  templates: DocumentTemplate[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface TemplateResponse {
  template: DocumentTemplate
}

export interface TemplateUsageResponse {
  message: string
  usage_count: number
}

export interface TemplateOperationResponse {
  message: string
  template: DocumentTemplate
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: string
  permissions: Record<string, boolean>
}