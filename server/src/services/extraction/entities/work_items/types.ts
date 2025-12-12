/**
 * Work Items Entity Types
 */

export interface WorkItem {
  name: string
  description?: string
  activity_name?: string
  assigned_to?: string
  estimated_hours?: number
  actual_hours?: number
  progress_percentage?: number
  status?: 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
  blockers?: string[]
  completed_date?: string
  source_document?: string
  source_document_id?: string
}

