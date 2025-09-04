import { io, Socket } from "socket.io-client"

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:5000"

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
    const url = `${this.baseURL}${endpoint}`
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
  async getDocuments(projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : ""
    return this.request<any[]>(`/documents${query}`)
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
<<<<<<< HEAD
=======
  async getSecurityEvents() {
    return this.request<any[]>("/security/events")
  }

  async getSecurityMetrics() {
    return this.request<any>("/security/metrics")
  }

  // Integrations endpoints (duplicate removed - using the one at line 337)

  async createIntegration(integrationData: any) {
    return this.request<any>("/integrations", {
      method: "POST",
      body: JSON.stringify(integrationData),
    })
  }

  async updateIntegration(id: string, integrationData: any) {
    return this.request<any>(`/integrations/${id}`, {
      method: "PUT",
      body: JSON.stringify(integrationData),
    })
  }

  // Documents API
>>>>>>> 00748915af6e83e4838b0067c88788e72aff8973
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

  // Generic request method for custom API calls
  async makeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, options)
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
