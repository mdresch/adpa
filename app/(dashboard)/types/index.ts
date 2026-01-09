// Dashboard Types
// Extracted from app/page.tsx for better maintainability

export interface DashboardData {
  projects: {
    total_projects: number
    active_projects: number
    completed_projects: number
    projects_last_30d: number
  }
  documents: {
    total_documents: number
    published_documents: number
    documents_last_30d: number
  }
  ai: {
    total_generations: number
    generations_last_30d: number
  }
  recent_activity: Array<{
    action: string
    resource_type: string
    resource_id: string
    created_at: string
  }>
}

export interface StatCard {
  title: string
  value: string
  description: string
  icon: any
  color: string
  bgColor: string
  trend: string
}

export interface ProviderData {
  name: string
  status: string
  health: number
  requests: string
  color: string
}

export interface IntegrationData {
  name: string
  status: string
  lastSync: string
  color: string
}

export interface ActivityItem {
  action: string
  details: string
  time: string
  color: string
}

export interface QuickAction {
  icon: any
  label: string
  color: string
  onClick: () => void
  description: string
}

export interface AIProvider {
  id: string
  name: string
  type: string
  is_active: boolean
  usage_stats?: {
    total_requests?: number
    [key: string]: any
  }
  [key: string]: any
}

export interface Job {
  id: string
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'running' | 'pending'
  type: string
  created_at: string
  error_message?: string  // Error message when job fails
  error?: string | any    // Alternative error property
  startTime?: string      // When job started processing
  [key: string]: any
}

