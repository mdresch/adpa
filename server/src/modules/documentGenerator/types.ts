/**
 * Document Generator Module Types
 * Defines TypeScript interfaces and types for document generation functionality
 */

export interface DocumentGenerationRequest {
  template_id: string
  data: Record<string, any>
  output_format: OutputFormat
  options?: GenerationOptions
}

export interface DocumentGenerationResponse {
  id: string
  status: GenerationStatus
  output_format: OutputFormat
  file_path?: string
  file_url?: string
  file_size?: number
  metadata: GenerationMetadata
  created_at: Date
  completed_at?: Date
  error_message?: string
}

export interface GenerationOptions {
  filename?: string
  page_size?: PageSize
  orientation?: PageOrientation
  margins?: PageMargins
  include_toc?: boolean
  include_header?: boolean
  include_footer?: boolean
  header_template?: string
  footer_template?: string
  css_styles?: string
  quality?: number
  compress?: boolean
  // Adobe PDF Services options
  use_adobe_pdf?: boolean
  adobe_quality?: 'low' | 'medium' | 'high'
  adobe_compress?: boolean
  adobe_linearize?: boolean
  adobe_protect?: boolean
  adobe_password?: string
  adobe_permissions?: {
    print?: boolean
    editContent?: boolean
    editDocumentAssembly?: boolean
    editAnnotations?: boolean
    fillAndSign?: boolean
    extractForAccessibility?: boolean
    extract?: boolean
  }
  document_language?: string
  include_tagged_pdf?: boolean
}

export interface GenerationMetadata {
  template_name: string
  template_version?: string
  generated_by: string
  generation_time_ms: number
  file_size_bytes?: number
  page_count?: number
  variables_used: string[]
  context_data?: Record<string, any>
}

export interface TemplateData {
  id: string
  name: string
  content: any
  variables: TemplateVariable[]
  framework: string
  category?: string
}

export interface TemplateVariable {
  name: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'array' | 'object'
  required: boolean
  default?: any
  options?: string[]
  description?: string
  validation?: VariableValidation
}

export interface VariableValidation {
  min?: number
  max?: number
  pattern?: string
  custom?: (value: any) => boolean | string
}

export interface ProcessedTemplate {
  content: string
  metadata: Record<string, any>
  variables_resolved: Record<string, any>
  missing_variables: string[]
  warnings: string[]
}

export interface GenerationJob {
  id: string
  request: DocumentGenerationRequest
  status: GenerationStatus
  progress: number
  created_at: Date
  started_at?: Date
  completed_at?: Date
  error?: string
  result?: DocumentGenerationResponse
}

export enum OutputFormat {
  MARKDOWN = 'markdown',
  PDF = 'pdf',
  DOCX = 'docx',
  HTML = 'html'
}

export enum GenerationStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum PageSize {
  A4 = 'A4',
  A3 = 'A3',
  A5 = 'A5',
  LETTER = 'Letter',
  LEGAL = 'Legal',
  TABLOID = 'Tabloid'
}

export enum PageOrientation {
  PORTRAIT = 'portrait',
  LANDSCAPE = 'landscape'
}

export interface PageMargins {
  top: string
  right: string
  bottom: string
  left: string
}

export type { AuthenticatedUser } from '@root-types/adpa'

export interface DocumentGeneratorConfig {
  output_directory: string
  temp_directory: string
  max_file_size: number
  max_generation_time: number
  cleanup_after_hours: number
  pdf_options: PdfGenerationOptions
  docx_options: DocxGenerationOptions
  markdown_options: MarkdownGenerationOptions
}

export interface PdfGenerationOptions {
  format: PageSize
  orientation: PageOrientation
  margins: PageMargins
  print_background: boolean
  display_header_footer: boolean
  header_template: string
  footer_template: string
  scale: number
  quality: number
}

export interface DocxGenerationOptions {
  page_size: PageSize
  orientation: PageOrientation
  margins: PageMargins
  default_font: string
  default_font_size: number
  line_spacing: number
  include_styles: boolean
}

export interface MarkdownGenerationOptions {
  include_frontmatter: boolean
  frontmatter_format: 'yaml' | 'toml' | 'json'
  line_breaks: 'lf' | 'crlf'
  encoding: 'utf8' | 'utf16'
  include_toc: boolean
  toc_depth: number
}


export interface GenerationError extends Error {
  code: string
  details?: any
  template_id?: string
  generation_id?: string
}

export interface GenerationStats {
  total_generations: number
  successful_generations: number
  failed_generations: number
  average_generation_time: number
  most_used_formats: Record<OutputFormat, number>
  most_used_templates: Array<{ template_id: string; count: number }>
}