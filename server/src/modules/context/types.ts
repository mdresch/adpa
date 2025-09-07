/**
 * Context Injection System Types
 * 
 * Defines all interfaces and types used throughout the context injection system.
 */

export interface ContextData {
  project?: ProjectContext
  documents?: DocumentContext[]
  templates?: TemplateContext[]
  user?: UserContext
  integrations?: IntegrationContext[]
  metadata?: Record<string, any>
}

export interface ProjectContext {
  id: string
  name: string
  description?: string
  framework: string
  status: string
  priority: string
  start_date?: Date
  end_date?: Date
  budget?: number
  team_members: string[]
  settings: Record<string, any>
  metadata: Record<string, any>
  owner_name?: string
}

export interface DocumentContext {
  id: string
  project_id: string
  name: string
  content?: any
  template_id?: string
  version: number
  status: string
  framework: string
  metadata: Record<string, any>
  created_by: string
  updated_by: string
  created_at: Date
  updated_at: Date
}

export interface TemplateContext {
  id: string
  name: string
  description?: string
  framework: string
  category?: string
  content: any
  variables: any[]
  is_public: boolean
  usage_count: number
}

export interface UserContext {
  id: string
  name: string
  email: string
  role: string
  permissions: Record<string, any>
  avatar_url?: string
}

export interface IntegrationContext {
  id: string
  name: string
  type: string
  configuration: Record<string, any>
  is_active: boolean
  last_sync?: Date
  sync_status?: string
}

export interface ContextRequest {
  prompt: string
  project_id?: string
  document_ids?: string[]
  template_id?: string
  user_id: string
  provider: string
  model?: string
  max_context_tokens?: number
  priority_config?: PriorityConfig
  include_integrations?: boolean
  custom_context?: Record<string, any>
}

export interface ContextResponse {
  enhanced_prompt: string
  context_used: ContextData
  token_usage: TokenUsage
  context_summary: string
  warnings?: string[]
}

export interface ContextConfig {
  max_context_ratio: number // Maximum percentage of tokens to use for context (0.0-1.0)
  default_priority: ContextPriority
  enable_smart_truncation: boolean
  preserve_user_prompt: boolean
  context_separator: string
  include_metadata: boolean
}

export interface ContextError {
  type: "token_limit" | "extraction_error" | "validation_error" | "provider_error"
  message: string
  code?: string
  details?: any
}

export interface TokenUsage {
  prompt_tokens: number
  context_tokens: number
  total_tokens: number
  available_tokens: number
  context_ratio: number
}

export interface ProviderTokenLimits {
  [provider: string]: {
    [model: string]: number
  }
}

export enum ContextPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export interface PriorityConfig {
  project: ContextPriority
  documents: ContextPriority
  templates: ContextPriority
  user: ContextPriority
  integrations: ContextPriority
  custom: ContextPriority
}

export interface ContextSection {
  type: 'project' | 'document' | 'template' | 'user' | 'integration' | 'custom'
  priority: ContextPriority
  content: string
  tokens: number
  metadata?: Record<string, any>
}

export interface ExtractionOptions {
  include_content?: boolean
  include_metadata?: boolean
  max_content_length?: number
  content_format?: 'full' | 'summary' | 'outline'
}