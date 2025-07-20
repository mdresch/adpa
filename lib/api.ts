// API client for ADPA Frontend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

class ApiClient {
  private baseURL: string
  private token: string | null = null

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
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Network error" }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })
  }

  async register(userData: { name: string; email: string; password: string }) {
    return this.request<{ token: string; user: any }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  async getCurrentUser() {
    return this.request<any>("/auth/me")
  }

  // Projects endpoints
  async getProjects() {
    return this.request<any[]>("/projects")
  }

  async getProject(id: string) {
    return this.request<any>(`/projects/${id}`)
  }

  async createProject(projectData: any) {
    return this.request<any>("/projects", {
      method: "POST",
      body: JSON.stringify(projectData),
    })
  }

  async updateProject(id: string, projectData: any) {
    return this.request<any>(`/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(projectData),
    })
  }

  async deleteProject(id: string) {
    return this.request<void>(`/projects/${id}`, {
      method: "DELETE",
    })
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
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
