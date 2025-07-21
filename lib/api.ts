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

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`)
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

  // Documents endpoints
  async getDocuments(projectId?: string) {
    const query = projectId ? `?projectId=${projectId}` : ""
    return this.request<any[]>(`/documents${query}`)
  }

  async getDocument(id: string) {
    return this.request<any>(`/documents/${id}`)
  }

  async createDocument(documentData: any) {
    return this.request<any>("/documents", {
      method: "POST",
      body: JSON.stringify(documentData),
    })
  }

  async updateDocument(id: string, documentData: any) {
    return this.request<any>(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(documentData),
    })
  }

  async deleteDocument(id: string) {
    return this.request<void>(`/documents/${id}`, {
      method: "DELETE",
    })
  }

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
  async getTemplates() {
    return this.request<any[]>("/templates")
  }

  async getTemplate(id: string) {
    return this.request<any>(`/templates/${id}`)
  }

  async createTemplate(templateData: any) {
    return this.request<any>("/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
    })
  }

  // AI endpoints
  async generateDocument(prompt: string, templateId?: string) {
    return this.request<any>("/ai/generate", {
      method: "POST",
      body: JSON.stringify({ prompt, templateId }),
    })
  }

  async getAIProviders() {
    return this.request<any[]>("/ai/providers")
  }

  // Analytics endpoints
  async getAnalytics(timeRange?: string) {
    const query = timeRange ? `?timeRange=${timeRange}` : ""
    return this.request<any>(`/analytics${query}`)
  }

  // Jobs endpoints
  async getJobs() {
    return this.request<any[]>("/jobs")
  }

  async getJob(id: string) {
    return this.request<any>(`/jobs/${id}`)
  }

  // Security endpoints
  async getSecurityEvents() {
    return this.request<any[]>("/security/events")
  }

  async getSecurityMetrics() {
    return this.request<any>("/security/metrics")
  }

  // Integrations endpoints
  async getIntegrations() {
    return this.request<any[]>("/integrations")
  }

  async createIntegration(integrationData: any) {
    return this.request<any>("/integrations", {
      method: "POST",
      body: JSON.stringify(integrationData),
    })
  }
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
    return response.data!
  }

  async getDocument(id: string): Promise<Document> {
    const response = await this.request<{ document: Document }>(`/documents/${id}`)
    return response.data!.document
  }

  async createDocument(projectId: string, documentData: Partial<Document>): Promise<Document> {
    const response = await this.request<{ document: Document }>(`/documents/project/${projectId}`, {
      method: "POST",
      body: JSON.stringify(documentData),
    })
    return response.data!.document
  }

  async updateDocument(id: string, documentData: Partial<Document>): Promise<Document> {
    const response = await this.request<{ document: Document }>(`/documents/${id}`, {
      method: "PUT",
      body: JSON.stringify(documentData),
    })
    return response.data!.document
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
    return response.data!
  }

  async getTemplate(id: string): Promise<Template> {
    const response = await this.request<{ template: Template }>(`/templates/${id}`)
    return response.data!.template
  }

  async createTemplate(templateData: Partial<Template>): Promise<Template> {
    const response = await this.request<{ template: Template }>("/templates", {
      method: "POST",
      body: JSON.stringify(templateData),
    })
    return response.data!.template
  }

  async updateTemplate(id: string, templateData: Partial<Template>): Promise<Template> {
    const response = await this.request<{ template: Template }>(`/templates/${id}`, {
      method: "PUT",
      body: JSON.stringify(templateData),
    })
    return response.data!.template
  }

  async deleteTemplate(id: string): Promise<void> {
    await this.request(`/templates/${id}`, { method: "DELETE" })
  }

  async cloneTemplate(id: string, data: { name: string; description?: string; is_public?: boolean }): Promise<Template> {
    const response = await this.request<{ template: Template }>(`/templates/${id}/clone`, {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response.data!.template
  }

  // AI API
  async getAIProviders(): Promise<any[]> {
    const response = await this.request<{ providers: any[] }>("/ai/providers")
    return response.data!.providers
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
    return response.data
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
    return response.data!
  }

  async getJob(id: string): Promise<Job> {
    const response = await this.request<{ job: Job }>(`/jobs/${id}`)
    return response.data!.job
  }

  async cancelJob(id: string): Promise<void> {
    await this.request(`/jobs/${id}/cancel`, { method: "POST" })
  }

  async retryJob(id: string): Promise<{ newJobId: string }> {
    const response = await this.request<{ newJobId: string }>(`/jobs/${id}/retry`, {
      method: "POST",
    })
    return response.data!
  }

  // Analytics API
  async getDashboardAnalytics(): Promise<any> {
    const response = await this.request("/analytics/dashboard")
    return response.data
  }

  async getSystemAnalytics(period: string = "30d"): Promise<any> {
    const response = await this.request(`/analytics/system?period=${period}`)
    return response.data
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
