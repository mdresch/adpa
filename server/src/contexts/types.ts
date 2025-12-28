export interface NormalizedContext {
  id: string
  provider: 'confluence' | 'jira'
  title: string
  summary: string
  url: string
  last_modified?: string
  fetched_at: string
  expires_at?: string
  access_scope?: { projectId?: string }
  metadata?: Record<string, any>
}

export interface ProviderAdapter {
  search: (params: { query: string; projectId?: string; fresh?: boolean }) => Promise<NormalizedContext[]>
  fetchById: (params: { id: string; projectId?: string; fresh?: boolean }) => Promise<NormalizedContext | null>
}
