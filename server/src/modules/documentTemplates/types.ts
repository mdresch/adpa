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
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select'
  required: boolean
  default?: any
  options?: string[]
  description?: string
}

export interface CreateTemplateRequest {
  name: string
  description?: string
  framework: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom'
  category?: string
  content: Record<string, any>
  variables?: TemplateVariable[]
  is_public?: boolean
}

export interface UpdateTemplateRequest {
  name?: string
  description?: string
  framework?: 'TOGAF' | 'SABSA' | 'COBIT' | 'ITIL' | 'Custom'
  category?: string
  content?: Record<string, any>
  variables?: TemplateVariable[]
  is_public?: boolean
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