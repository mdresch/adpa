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
  /** Triggers which GKG semantic search to use for LLM context when generating from this template. */
  gkg_context_strategy?: GkgContextStrategy
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  required: boolean
  default?: any
  options?: string[]
  description?: string
}

/**
 * GKG context strategy: which semantic search to run against the Governance Knowledge Graph
 * when building LLM context for document generation. Set on template to trigger the right
 * context retrieval (entity types, scope, caps). See docs/07-architecture/GKG_CONTEXT_STRATEGY.md.
 */
export type GkgContextScope =
  | 'same_project'           // Only entities from the target project
  | 'same_project_top_docs'  // Same project, prioritize docs with most units
  | 'dependent_projects'     // Same project + projects in project_dependencies
  | 'all_accessible'         // All projects the user can access (e.g. company scope)

export type GkgContextProfile =
  | 'governance_full'   // Requirement, Risk, Stakeholder, Milestone, Constraint, Deliverable
  | 'charter_light'     // Requirement, Risk, Stakeholder
  | 'requirements_only'  // Requirement only
  | 'risks_only'       // Risk only
  | 'stakeholders_only'// Stakeholder only
  | 'custom'           // Use entityTypes array

/** When to include source documents by status: only approved/published, or also draft and in-review. */
export type GkgDocumentStatusFilter =
  | 'approved_published_only'  // Only documents with status approved or published
  | 'include_draft_review'     // Include draft and in-review documents as well

export interface GkgContextStrategy {
  /** Preset profile; if set, entityTypes/scope can be overridden by profile defaults. */
  profile?: GkgContextProfile
  /** Entity types to include (e.g. Requirement, Risk, Stakeholder). Used when profile is custom or to override profile. */
  entityTypes?: string[]
  /** Where to pull context from in the GKG. */
  scope?: GkgContextScope
  /** Max number of source documents to pull units from (by unit count). */
  maxDocuments?: number
  /** Max total semantic units to include in context. */
  maxUnits?: number
  /** Include only units that have EXTRACTED_FROM (traceable to a document). */
  traceableOnly?: boolean
  /** Restrict to documents with status Approved/Published only, or include Draft and In Review. */
  documentStatusFilter?: GkgDocumentStatusFilter
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
  gkg_context_strategy?: GkgContextStrategy
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
  gkg_context_strategy?: GkgContextStrategy
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