import { io, Socket } from "socket.io-client"

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "http://localhost:5000"

// Types
export interface User {
  id: string
  email: string
  name: string
  role: string
  permissions: Record<string, boolean>
  avatar_url?: string
  is_active: boolean
  last_login?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  name: string
  description?: string
  framework: string
  status: string
  priority: string
  owner_id: string
  owner_name?: string
  team_members: string[]
  start_date?: string
  end_date?: string
  budget?: number
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  project_id: string
  name: string
  content: any
  template_id?: string
  version: number
  status: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  generation_metadata?: any
  metadata?: any
  template_metadata?: any
  source_documents?: any[]
}

export interface Stakeholder {
  id: string
  project_id: string
  name?: string
  role: string
  department?: string
  email: string
  phone?: string
  interest_level: 'high' | 'medium' | 'low'
  influence_level: 'high' | 'medium' | 'low'
  engagement_approach: 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'
  communication_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'
  stakeholder_type: 'internal' | 'external'
  stakeholder_category: 'primary' | 'secondary'
  expectations?: string
  potential_impact?: string
  created_at: string
  updated_at: string
  created_by_name?: string
  updated_by_name?: string
}

export interface Template {
  id: string
  name: string
  description?: string
  framework: string
  category?: string
  content: any
  variables: any[]
  is_public: boolean
  usage_count: number
  created_by: string
  created_at: string
  updated_at: string
  // Template Lifecycle Fields
  development_status?: 'draft' | 'testing' | 'compliance' | 'validated' | 'production' | 'deprecated' | 'archived'
  validation_count?: number
  success_count?: number
  success_rate?: number
  health_rating?: 'Excellent' | 'Good' | 'Fair' | 'Needs Improvement'
  last_validated_at?: string
  // AI Enhancement Fields
  system_prompt?: string
  context_injection_config?: {
    enabled: boolean
    sources: Array<{
      type: string
      source_id: string
      source_name: string
      parameters?: Record<string, any>
      enabled: boolean
      weight?: number
    }>
    injection_strategy: 'prepend' | 'append' | 'interleave' | 'structured'
    max_context_length?: number
    context_priority?: 'high' | 'medium' | 'low'
  }
  prompt_build_up?: {
    enabled: boolean
    stages: Array<{
      stage_name: string
      stage_type: string
      prompt_template: string
      variables: string[]
      dependencies?: string[]
      order: number
      enabled: boolean
    }>
    final_format: 'markdown' | 'structured_json' | 'plain_text' | 'html'
    include_metadata: boolean
  }
}

export interface Job {
  id: string
  type: string
  status: string
  progress: number
  data: any
  result?: any
  error_message?: string
  created_by: string
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

class ApiClient {
  private baseURL: string
  private token: string | null = null
  private socket: Socket | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Get token from localStorage if available
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token")
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
    }
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
  }

  public async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // FIX: Handle trailing/leading slashes to prevent double slashes
    const baseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${baseURL}${cleanEndpoint}`
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers['authorization'] = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // include credentials so cookie-based sessions work from the browser
        credentials: (options as any).credentials || "include",
      })

      const data = await response.json()

      if (!response.ok) {
        // Create an error object that includes the response data for better error handling
        const error = new Error(data.error || data.message || `HTTP error! status: ${response.status}`)
        ;(error as any).response = { data, status: response.status }
        throw error
      }

      return data
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error)
      throw error
    }
  }

  // WebSocket connection
  connectWebSocket(): Socket {
    if (!this.socket) {
      this.socket = io(WS_URL, {
        auth: {
          token: this.token,
        },
      })

      this.socket.on("connect", () => {
        console.log("WebSocket connected")
      })

      this.socket.on("disconnect", () => {
        console.log("WebSocket disconnected")
      })
    }

    return this.socket
  }

  getSocket(): Socket | null {
    return this.socket
  }

  // Authentication API
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string; message: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    if (response.token) {
      this.setToken(response.token)
    }

    return {
      user: response.user,
      token: response.token
    }
  }

  async demoLogin(): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string }>("/auth/demo", {
      method: "POST",
    })

    if (response.token) {
      this.setToken(response.token)
    }

    return { user: response.user, token: response.token }
  }

  async register(userData: {
    email: string
    password: string
    name: string
    role?: string
  }): Promise<{ user: User; token: string }> {
    const response = await this.request<{ user: User; token: string; message: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })

    if (response.token) {
      this.setToken(response.token)
    }

    return {
      user: response.user,
      token: response.token
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>("/auth/me")
    return response.user || response as any
  }

  async logout(): Promise<void> {
    this.clearToken()
  }

  // Projects API
  async getProjects(params?: {
    page?: number
    limit?: number
    framework?: string
    status?: string
    search?: string
  }): Promise<{ projects: Project[]; pagination: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await this.request<{ projects: Project[]; pagination: any }>(
      `/projects?${queryParams}`
    )
    return response
  }

  async getProject(id: string): Promise<Project> {
    const response = await this.request<{ project: Project }>(`/projects/${id}`)
    return response.project
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const response = await this.request<{ project: Project }>("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    })
    return response.project
  }

  async updateProject(id: string, projectData: Partial<Project>): Promise<Project> {
    const response = await this.request<{ project: Project }>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    })
    return response.project
  }

  async deleteProject(id: string): Promise<void> {
    await this.request(`/projects/${id}`, { method: "DELETE" })
  }

  // Templates API
  // Duplicate getTemplates method removed

  // Duplicate createTemplate method removed

  // Search API
  async search(query: string, filters?: any): Promise<any[]> {
    const response = await this.request<{ results: any[] }>("/search", {
      method: "POST",
      body: JSON.stringify({ query, filters }),
    })
    return response.results
  }

  // Analytics API
  // Removed duplicate getSystemAnalytics method

  // System Settings API
  async getSystemSettings(): Promise<any> {
    const response = await this.request<any>("/settings/system")
    return response
  }

  async updateSystemSettings(settings: any): Promise<any> {
    const response = await this.request<any>("/settings/system", {
      method: "PUT",
      body: JSON.stringify(settings),
    })
    return response
  }

  // Integrations API
  async getIntegrations(): Promise<any[]> {
    const response = await this.request<{ integrations: any[] }>("/integrations")
    return response.integrations || response
  }

  async createIntegration(integrationData: any): Promise<any> {
    const response = await this.request<{ integration: any }>("/integrations", {
      method: "POST",
      body: JSON.stringify(integrationData),
    })
    return response.integration || response
  }

  async updateIntegration(id: string, integrationData: any): Promise<any> {
    const response = await this.request<{ integration: any }>(`/integrations/${id}`, {
      method: "PUT",
      body: JSON.stringify(integrationData),
    })
    return response.integration || response
  }

  async deleteIntegration(id: string): Promise<void> {
    await this.request(`/integrations/${id}`, { method: "DELETE" })
  }

  // Documents endpoints
  async getDocuments(projectId?: string): Promise<{ documents: Document[]; pagination?: any }> {
    const query = projectId ? `?projectId=${projectId}` : ""
    const response = await this.request<{ documents: Document[]; pagination?: any }>(`/documents${query}`)
    return response
  }

  // Removed duplicate getDocument method

  // Duplicate createDocument method removed

  // Removed duplicate updateDocument method

  // Removed duplicate deleteDocument method

  // Users endpoints
  async getUsers() {
    return this.request<any[]>("/users")
  }

  async getUser(id: string) {
    return this.request<any>(`/users/${id}`)
  }

  async updateUser(id: string, userData: any) {
    return this.request<any>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  }

  // Templates endpoints
  // Duplicate getTemplates() method removed

  // Removed duplicate getTemplate method

  // Duplicate createTemplate method removed

  // AI endpoints
  async generateDocument(prompt: string, templateId?: string) {
    return this.request<any>("/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, templateId }),
    })
  }

  // Analytics endpoints
  async getAnalytics(timeRange?: string) {
    const query = timeRange ? `?timeRange=${timeRange}` : ""
    return this.request<any>(`/analytics${query}`)
  }

  // Jobs endpoints
  // Removed duplicate getJobs() and getJob() methods

  // Security endpoints
  async getSecurityEvents() {
    return this.request<any[]>("/security/events")
  }

  async getSecurityMetrics() {
    return this.request<any>("/security/metrics")
  }

  // Integrations endpoints (duplicate removed - using the one at line 337)

  // Duplicate createIntegration method removed

  // Duplicate updateIntegration method removed

  // Documents API
  async getProjectDocuments(
    projectId: string,
    params?: { page?: number; limit?: number; status?: string; search?: string }
  ): Promise<{ documents: Document[]; pagination: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await this.request<{ documents: Document[]; pagination: any }>(
      `/documents/project/${projectId}?${queryParams}`
    )
    return response
  }

  async getDocument(id: string): Promise<Document> {
    const response = await this.request<{ document: Document }>(`/documents/${id}`)
    return response.document
  }

  async createDocument(projectId: string, documentData: Partial<Document>): Promise<Document> {
    const response = await this.request<{ document: Document }>(`/documents/project/${projectId}`, {
      method: "POST",
      body: JSON.stringify(documentData),
    })
    return response.document
  }

  async updateDocument(id: string, documentData: Partial<Document>): Promise<Document> {
    const response = await this.request<{ document: Document }>(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(documentData),
    })
    return response.document
  }

  async deleteDocument(id: string): Promise<void> {
    await this.request(`/documents/${id}`, { method: "DELETE" })
  }

  // Test feedback endpoint
  async testFeedbackEndpoint(feedback: {
    comment: string
    rating: number
    category: string
  }): Promise<any> {
    try {
      console.log("API Client: Testing feedback endpoint with data:", feedback)
      
      const response = await this.request<any>(`/documents/test-feedback`, {
        method: "POST",
        body: JSON.stringify(feedback),
      })
      
      console.log("API Client: Test response received:", response)
      return response
    } catch (error) {
      console.error("API Client: Error testing feedback endpoint:", error)
      throw error
    }
  }

  // Submit feedback for a document
  async submitDocumentFeedback(id: string, feedback: {
    comment: string
    rating: number
    category: string
  }): Promise<{ success: boolean; feedback: any; document: any }> {
    try {
      console.log("API Client: Submitting feedback to:", `/documents/${id}/feedback`)
      console.log("API Client: Feedback data:", feedback)
      
      const response = await this.request<{ success: boolean; feedback: any; document: any }>(`/documents/${id}/feedback`, {
        method: "POST",
        body: JSON.stringify(feedback),
      })
      
      console.log("API Client: Response received:", response)
      return response
    } catch (error) {
      console.error("API Client: Error submitting feedback:", error)
      throw error
    }
  }

  // Templates API
  async getTemplates(params?: {
    page?: number
    limit?: number
    framework?: string
    category?: string
    search?: string
    is_public?: boolean
  }): Promise<{ templates: Template[]; pagination: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await this.request<{ templates: Template[]; pagination: any }>(
      `/templates?${queryParams}`
    )
    return response
  }

  async getTemplate(id: string): Promise<Template> {
    const response = await this.request<{ template: Template }>(`/templates/${id}`)
    return response.template
  }

  async createTemplate(templateData: Partial<Template>): Promise<Template> {
    const response = await this.request<{ template: Template }>("/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
    })
    return response.template
  }

  async updateTemplate(id: string, templateData: Partial<Template>): Promise<Template> {
    const response = await this.request<{ template: Template }>(`/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(templateData),
    })
    return response.template
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.request(`/templates/${id}`, { method: "DELETE" })
  }

  async getDeletedTemplates(params?: { page?: number; limit?: number }): Promise<{ templates: Template[]; pagination?: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) queryParams.append(key, String(value))
      })
    }
  const qs = queryParams.toString()
  const response = await this.request<{ templates: Template[]; pagination?: any }>(`/templates/trash${qs ? `?${qs}` : ""}`)
    return response
  }

  async restoreTemplate(id: string): Promise<Template> {
  const response = await this.request<{ template: Template }>(`/templates/${id}/restore`, {
      method: "POST",
    })
    return response.template
  }

  async hardDeleteTemplate(id: string): Promise<void> {
  await this.request(`/templates/${id}/hard`, { method: "DELETE" })
  }

  async cloneTemplate(id: string, data: { name: string; description?: string; is_public?: boolean }): Promise<Template> {
  const response = await this.request<{ template: Template }>(`/templates/${id}/clone`, {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response.template
  }

  // AI API
  async getAIProviders(): Promise<any[]> {
    const response = await this.request<{ providers: any[] }>("/ai/providers")
    return response.providers
  }

  // AI Model Configuration API
  async getProviderModels(providerId: string): Promise<{ models: any[], provider: any }> {
    return await this.request(`/ai-models/providers/${providerId}/models`)
  }

  async getModelConfiguration(providerId: string, modelId: string): Promise<{ model: any }> {
    return await this.request(`/ai-models/providers/${providerId}/models/${modelId}`)
  }

  async createModelConfiguration(providerId: string, modelData: any): Promise<{ model: any, message: string }> {
    return await this.request(`/ai-models/providers/${providerId}/models`, {
      method: "POST",
      body: JSON.stringify(modelData)
    })
  }

  async updateModelConfiguration(providerId: string, modelId: string, modelData: any): Promise<{ model: any, message: string }> {
    return await this.request(`/ai-models/providers/${providerId}/models/${modelId}`, {
      method: "PUT",
      body: JSON.stringify(modelData)
    })
  }

  async deleteModelConfiguration(providerId: string, modelId: string): Promise<{ message: string }> {
    return await this.request(`/ai-models/providers/${providerId}/models/${modelId}`, {
      method: "DELETE"
    })
  }

  async testModelConfiguration(providerId: string, modelId: string, testData?: any): Promise<{ test: any, message: string }> {
    return await this.request(`/ai-models/providers/${providerId}/models/${modelId}/test`, {
      method: "POST",
      body: JSON.stringify(testData || {})
    })
  }

  async generateContent(data: {
    prompt: string
    provider: string
    model?: string
    temperature?: number
    max_tokens?: number
    template_id?: string
    variables?: Record<string, any>
  }): Promise<any> {
    const response = await this.request("/ai/generate", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response
  }

  // GitHub Integration API
  async getGitHubRepository(integrationId: string): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/repository`)
  }

  async getGitHubPullRequests(integrationId: string, state: string = "open"): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/pull-requests?state=${state}`)
  }

  async getGitHubIssues(integrationId: string, state: string = "open"): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/issues?state=${state}`)
  }

  async testGitHubConnection(integrationId: string): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/test`, {
      method: "POST"
    })
  }

  async syncGitHubTemplates(integrationId: string, options?: {
    syncType?: string,
    targetBranch?: string,
    createPullRequests?: boolean
  }): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/sync`, {
      method: "POST",
      body: JSON.stringify(options || { syncType: "templates" }),
    })
  }

  async createGitHubPullRequest(integrationId: string, data: {
    title: string,
    description: string,
    sourceBranch: string,
    targetBranch?: string
  }): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/pull-request`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async createGitHubIssue(integrationId: string, data: {
    title: string,
    description: string,
    labels?: string[],
    assignees?: string[]
  }): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/issue`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  // Jobs API
  async getJobs(params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
  }): Promise<{ jobs: Job[]; pagination: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }

    const response = await this.request<{ jobs: Job[]; pagination: any }>(
      `/jobs?${queryParams}`
    )
    return response
  }

  async getJob(id: string): Promise<Job> {
    const response = await this.request<{ job: Job }>(`/jobs/${id}`)
    return response.job
  }

  async cancelJob(id: string): Promise<void> {
    await this.request(`/jobs/${id}/cancel`, { method: "POST" })
  }

  async retryJob(id: string): Promise<{ newJobId: string }> {
    const response = await this.request<{ newJobId: string }>(`/jobs/${id}/retry`, {
      method: "POST",
    })
    return response
  }

  // Analytics API
  async getDashboardAnalytics(): Promise<any> {
    const response = await this.request("/analytics/dashboard")
    return response
  }

  async getSystemAnalytics(period: string = "30d"): Promise<any> {
    const response = await this.request(`/analytics/system?period=${period}`)
    return response
  }

  // AI Analytics API
  async getAIModelAnalytics(period: string = "30d"): Promise<any> {
    const response = await this.request(`/ai-analytics/models?period=${period}`)
    return response
  }

  async getAIProviderAnalytics(providerId: string, period: string = "30d"): Promise<any> {
    const response = await this.request(`/ai-analytics/providers/${providerId}?period=${period}`)
    return response
  }

  async getAITrends(period: string = "30d"): Promise<any> {
    const response = await this.request(`/ai-analytics/trends?period=${period}`)
    return response
  }

  // Generic request method for custom API calls
  async makeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, options)
  }

  // Convenience methods
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async put<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined
    })
  }

  async delete<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }

  // Stakeholder Management Methods
  async getProjectStakeholders(projectId: string): Promise<{ stakeholders: Stakeholder[]; count: number }> {
    return this.get<{ stakeholders: Stakeholder[]; count: number }>(`/stakeholders/project/${projectId}`)
  }

  async getStakeholder(stakeholderId: string): Promise<{ stakeholder: Stakeholder }> {
    return this.get<{ stakeholder: Stakeholder }>(`/stakeholders/${stakeholderId}`)
  }

  async createStakeholder(stakeholderData: Omit<Stakeholder, 'id' | 'created_at' | 'updated_at' | 'created_by_name' | 'updated_by_name'>): Promise<{ message: string; stakeholder: Stakeholder }> {
    return this.post<{ message: string; stakeholder: Stakeholder }>('/stakeholders', stakeholderData)
  }

  async updateStakeholder(stakeholderId: string, stakeholderData: Partial<Omit<Stakeholder, 'id' | 'project_id' | 'created_at' | 'updated_at' | 'created_by_name' | 'updated_by_name'>>): Promise<{ message: string; stakeholder: Stakeholder }> {
    return this.put<{ message: string; stakeholder: Stakeholder }>(`/stakeholders/${stakeholderId}`, stakeholderData)
  }

  async deleteStakeholder(stakeholderId: string): Promise<{ message: string; deleted_stakeholder: { name: string; project_id: string } }> {
    return this.delete<{ message: string; deleted_stakeholder: { name: string; project_id: string } }>(`/stakeholders/${stakeholderId}`)
  }

  async getStakeholderEngagementMatrix(projectId: string): Promise<{
    stakeholders: Stakeholder[]
    engagement_matrix: {
      manage_closely: Stakeholder[]
      keep_satisfied: Stakeholder[]
      keep_informed: Stakeholder[]
      monitor: Stakeholder[]
    }
    summary: {
      total: number
      high_interest_high_influence: number
      high_interest_low_influence: number
      low_interest_high_influence: number
      low_interest_low_influence: number
      internal: number
      external: number
      primary: number
      secondary: number
    }
  }> {
    return this.get(`/stakeholders/project/${projectId}/engagement-matrix`)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
