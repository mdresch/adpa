/**
 * Type definitions for Projects page
 * Centralized types for all project-related components
 */

import { Project, Template } from "@/lib/api"

/**
 * Form data for creating a new project
 */
export interface NewProjectForm {
  name: string
  description: string
  framework: string
  priority: string
  start_date: string
  end_date: string
  budget: string
  manager: string
}

/**
 * Form data for AI document generation
 */
export interface DocumentGenerationForm {
  name: string
  template_id: string
  prompt: string
  provider: string
  model: string
  temperature: number
  max_tokens: number
  user_id: string
  project_id: string
  document_ids: string[]
  include_integrations: boolean
  max_context_tokens: number
  context_priority: string
  custom_context: string
  metadata?: {
    framework?: string
    author_id?: string
    reviewers?: string[]
    due_date?: string
  }
}

/**
 * Progress tracking for document generation
 */
export interface GenerationProgress {
  step: number
  totalSteps: number
  message: string
  percentage: number
}

/**
 * Form data for document upload
 */
export interface DocumentUploadForm {
  name: string
  file: File | null
  template_id: string
}

/**
 * Pagination state
 */
export interface PaginationState {
  page: number
  limit: number
  total: number
  pages: number
}

/**
 * Status configuration for badges
 */
export interface StatusConfig {
  emoji: string
  label: string
  color: string
  variant: 'default' | 'secondary' | 'destructive'
}

/**
 * Health configuration for indicators
 */
export interface HealthConfig {
  color: string
  bgColor: string
  icon: string
}

/**
 * Props for ProjectCard component
 */
export interface ProjectCardProps {
  project: Project
  index: number
  onEdit: (project: Project) => void
  onDelete: (projectId: string) => void
  onArchive: (projectId: string) => void
  onGenerateDocument: (project: Project) => void
  onUploadDocument: (project: Project) => void
}

/**
 * Props for CreateProjectDialog component
 */
export interface CreateProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  newProject: NewProjectForm
  onProjectChange: (project: NewProjectForm) => void
  onSubmit: (e: React.FormEvent) => void
  creating: boolean
}

/**
 * Props for EditProjectDialog component
 */
export interface EditProjectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  onProjectChange: (project: Project | null) => void
  onSubmit: (e: React.FormEvent) => void
  updating: boolean
}

/**
 * Props for GenerateDocumentDialog component
 */
export interface GenerateDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  templates: Template[]
  users?: any[]
  form: DocumentGenerationForm
  onFormChange: (form: DocumentGenerationForm) => void
  onSubmit: (e: React.FormEvent) => void
  generating: boolean
  progress: GenerationProgress
  aiProviders?: any[]
}

/**
 * Props for UploadDocumentDialog component
 */
export interface UploadDocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: Project | null
  templates: Template[]
  form: DocumentUploadForm
  onFormChange: (form: DocumentUploadForm) => void
  onSubmit: (e: React.FormEvent) => void
  uploading: boolean
}

/**
 * Props for ProjectsHeader component
 */
export interface ProjectsHeaderProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  statusFilter: string
  onStatusFilterChange: (status: string) => void
  onCreateClick: () => void
  projectsCount: number | string
}

/**
 * Props for ProjectsGrid component
 */
export interface ProjectsGridProps {
  projects: Project[]
  loading: boolean
  onEdit: (project: Project) => void
  onDelete: (projectId: string) => void
  onArchive: (projectId: string) => void
  onGenerateDocument: (project: Project) => void
  onUploadDocument: (project: Project) => void
}

/**
 * Props for EmptyState component
 */
export interface EmptyStateProps {
  searchTerm: string
  statusFilter: string
  onCreateClick: () => void
}

/**
 * Re-export commonly used types
 */
export type { Project, Template }

