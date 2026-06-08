import { io, Socket } from "socket.io-client"
import { getApiBaseUrl, getWsUrl } from "./api-url"
export { getApiBaseUrl }

// API Configuration
const API_BASE_URL = getApiBaseUrl()
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || getWsUrl()

// Debug logging only in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🔧 API Debug:', {
    API_BASE_URL,
    WS_URL
  })
}

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
  metadata?: Record<string, any> | string // JSONB column, can be object or JSON string
  company_id?: string // Optional company association for multi-tenancy
  /** Default project for chat and context features */
  defaultProjectId?: string
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
  program_id?: string
  program_name?: string
  portfolio_id?: string
  portfolio_name?: string
  document_count?: number
  document_quality_score?: number
  last_activity?: string
}

export interface ExtendedProject extends Project {
  settings?: any
  metadata?: any
}

export interface Program {
  id: string
  name: string
  description?: string
  owner_id: string
  owner_name?: string
  budget?: number
  currency_code?: string
  currency?: string
  start_date?: string
  end_date?: string
  rag_status?: 'green' | 'amber' | 'red'
  status: 'green' | 'amber' | 'red'
  created_at: string
  updated_at: string
  project_count?: number
  created_by?: string
  updated_by?: string
  portfolio_id?: string
  portfolio_name?: string
  archived?: boolean
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
  created_by_name?: string
  updated_by_name?: string
  created_at: string
  updated_at: string
  generation_metadata?: any
  metadata?: any
  template_metadata?: any
  source_documents?: any[]
  // These properties are returned by the API but were missing from the interface
  template_name?: string
  project_name?: string
  title?: string
  framework?: string
  word_count?: number
  character_count?: number
  semantic_version?: string
  template_version?: string
  template_author?: string
  template_framework?: string
  template_category?: string
  template_complexity?: string
  confluence_page_url?: string
  tags?: string[]
  quality_score?: number
  quality_status?: string
}

// ---------------------------------------------------------------------------
// RTM & Governance Types (RPAS-CM)
// ---------------------------------------------------------------------------

export interface RtmRequirement {
  id: string
  business_case_id: string
  description: string
  domain: string
  priority: string
  status: "ACTIVE" | "SUPERSEDED"
  source_version: number
  amendment_id?: string
  csr_version?: string
  executed_at?: string
  created_at: string
}

export interface RtmAmendment {
  id: string
  requirement_id: string
  proposed_description: string
  justification: string
  amendment_type: "REPLACEMENT" | "EXPANSION"
  amendment_sub_type: string
  status: "PENDING" | "APPROVED" | "REJECTED" | "APPLIED"
  proposed_by: string
  proposed_at: string
  decided_by?: string
  decided_at?: string
  decision_notes?: string
  applied_by?: string
  applied_at?: string
  resulting_requirement_id?: string
}

export interface AmendmentProposalRequest {
  requirement_id: string
  proposed_description: string
  justification: string
  amendment_type: "REPLACEMENT" | "EXPANSION"
  amendment_sub_type: string
}

export interface ResearchAdvice {
  target_requirement_id: string
  suggested_description: string
  justification: string
  amendment_type: "REPLACEMENT" | "EXPANSION"
  amendment_sub_type: string
  confidence_score: number
  analysis_context: string
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

export interface ExtractedEntity {
  id: string
  project_id: string
  entity_type: string
  entity_name: string
  entity_data: any
  extraction_confidence?: number
  extraction_method?: string
  source_document_id?: string
  created_at: string
  is_verified?: boolean
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
  quality_threshold?: number
  prompt_version?: number
  gkg_context_strategy?: {
    profile?: 'governance_full' | 'charter_light' | 'requirements_only' | 'risks_only' | 'stakeholders_only' | 'custom'
    entityTypes?: string[]
    scope?: 'same_project' | 'same_project_top_docs' | 'dependent_projects' | 'all_accessible'
    maxDocuments?: number
    maxUnits?: number
    traceableOnly?: boolean
    documentStatusFilter?: 'approved_published_only' | 'include_draft_review'
  } | null
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
  // Soft delete fields
  deleted_at?: string
  deleted_by?: string
  // Compatibility fields for UI
  version?: string | number
  usage?: number
  author?: string
  status?: string
  created_by_name?: string
  template_paragraphs?: any[]
}



export interface ProgramSummaryMetrics {
  budget: {
    total: number
    spent: number
    remaining: number
    percentSpent: number
  }
  schedule: {
    startDate: string
    endDate: string
    daysElapsed: number
    daysRemaining: number
    percentComplete: number
  }
  projects: {
    total: number
    green: number
    amber: number
    red: number
  }
  risks: {
    total: number
    critical: number
    high: number
    medium: number
    low: number
  }
}

export interface ProgramDashboardMetrics {
  budget: {
    planned: number
    actual: number
    forecast: number
    variance: number
    timeline: Array<{
      month: string
      planned: number
      actual: number
      forecast?: number
    }>
  }
  status: {
    total: number
    breakdown: {
      green: number
      amber: number
      red: number
    }
  }
  risks: Array<{
    id: string
    title: string
    description: string
    probability: number
    impact: number
    severity: 'critical' | 'high' | 'medium' | 'low'
    projectId?: string
    projectName?: string
  }>
  milestones: Array<{
    id: string
    name: string
    plannedDate: string
    actualDate?: string
    status: 'completed' | 'on-track' | 'overdue'
  }>
}

export interface PortfolioMetrics {
  totalValue: number
  valueChange: number
  programCount: {
    total: number
    green: number
    amber: number
    red: number
  }
  totalInvestment: number
  resourceUtilization: number
}

export interface KeyResult {
  name: string
  current: number
  target: number
  unit: string
}

export interface OKR {
  objective: string
  quarter: string
  keyResults: KeyResult[]
  confidence: 'high' | 'medium' | 'low'
  owner: string
  dueDate: string
}

export interface Risk {
  id: string
  project_id: string
  title: string
  description: string
  category: string
  probability: string
  impact: string
  severity: string
  status: string
  mitigation_plan?: string
  contingency_plan?: string
  owner_id?: string
  identified_at: string
  last_evaluated_at?: string
  created_at: string
  updated_at: string
  // Playbook fields
  recommended_playbook_id?: string
  last_playbook_check_at?: string
}

export interface Issue {
  id: string
  project_id: string
  title: string
  description: string
  category: 'technical' | 'resource' | 'schedule' | 'communication' | 'quality' | 'external' | 'scope' | 'budget' | 'other'
  priority: 'critical' | 'high' | 'medium' | 'low'
  impact?: string
  affected_areas?: string[]
  raised_by?: string
  assigned_to?: string
  escalated_to?: string
  status: 'open' | 'acknowledged' | 'in_progress' | 'blocked' | 'resolved' | 'closed'
  resolution?: string
  workaround?: string
  root_cause?: string
  ai_suggested_resolution?: string
  ai_confidence?: number
  date_raised: string
  target_resolution_date?: string
  date_resolved?: string
  date_closed?: string
  related_risk_id?: string
  related_milestone_id?: string
  related_deliverable_id?: string
  source_document_id?: string
  notes?: string
  tags?: string[]
  created_at: string
  updated_at: string
  raised_by_name?: string
  assigned_to_name?: string
  source_document?: {
    id: string
    title: string
    type: string
  }
  // Playbook fields
  playbook_execution_id?: string
  resolution_workflow?: {
    current_phase: string
    playbook_started_at: string
    completed_steps: string[]
    last_action_at?: string
    notes?: string
  }
}
export interface IssueStats {
  total_issues: number
  open_issues: number
  acknowledged_issues: number
  in_progress_issues: number
  blocked_issues: number
  resolved_issues: number
  closed_issues: number
  critical_issues: number
  high_issues: number
  medium_issues: number
  low_issues: number
  overdue_issues: number
  issues_with_playbooks?: number
}

export interface Playbook {
  id: string
  project_id: string
  title: string
  description?: string
  category: 'risk' | 'incident' | 'escalation' | 'resolution'
  trigger_type: 'auto' | 'manual' | 'threshold'
  applicable_risk_categories?: string[]
  applicable_severity_levels?: string[]
  applicable_priority_levels?: string[]
  is_active: boolean
  created_at: string
  updated_at: string
  version: number
  scenarios?: PlaybookScenario[]
  steps?: PlaybookStep[]
}

export interface PlaybookScenario {
  id: string
  playbook_id: string
  scenario_condition: any
  trigger_type: 'auto' | 'manual'
  priority: number
  description?: string
}

export interface PlaybookStep {
  id: string
  playbook_id: string
  step_order: number
  step_title: string
  step_description?: string
  step_type: 'action' | 'approval' | 'notification' | 'escalation' | 'documentation' | 'wait'
  assigned_role?: string
  sla_hours?: number
  step_config: any
}

export interface PlaybookExecution {
  id: string
  playbook_id: string
  triggered_by_type: 'risk' | 'issue' | 'escalation' | 'manual'
  triggered_by_id: string
  trigger_type: 'auto' | 'manual'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'failed'
  current_step_id?: string
  current_step_order?: number
  completed_steps: number
  total_steps: number
  started_at: string
  completed_at?: string
  playbook_title?: string
  playbook_category?: string
  step_executions?: PlaybookStepExecution[]
}

export interface PlaybookStepExecution {
  id: string
  execution_id: string
  step_id: string
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'
  started_at?: string
  completed_at?: string
  completed_by?: string
  completion_notes?: string
  step_title?: string
  step_order?: number
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

export interface PendingJobsDiagnostics {
  diagnostics: {
    totalPending: number
    jobs: Array<{
      jobId: string
      type: string
      queueName: string
      ageMinutes: number
      inQueue: boolean
      queueStatus: string
      queuePosition: number | null
      issues: string[]
      createdAt: string
      hasError: boolean
    }>
    summary: {
      inQueue: number
      notInQueue: number
      oldPending: number
      withErrors: number
    }
  }
  queueStats: Record<string, any>
  recommendations: string[]
}

export interface FixPendingJobsResponse {
  success: boolean
  message: string
  results: {
    processed: number
    reAdded: number
    markedFailed: number
    errors: string[]
  }
}



// PMBOK 8 Performance Domain Types
export interface PMBOK8EntityCounts {
  // Legacy entities
  stakeholders: number
  requirements: number
  risks: number
  milestones: number
  constraints: number
  successCriteria: number
  bestPractices: number
  phases: number
  resources: number
  technologies: number
  qualityStandards: number
  complianceSecurity: number
  deliverables: number
  scopeItems: number
  activities: number
  // PMBOK 8 Performance Domain entities
  teamAgreements: number
  developmentApproaches: number
  projectIterations: number
  workItems: number
  capacityPlans: number
  performanceMeasurements: number
  earnedValueMetrics: number
  opportunities: number
  riskResponses: number
  performanceActuals: number
}

export interface PMBOK8DomainCounts {
  team: number
  developmentApproach: number
  projectWork: number
  measurement: number
  uncertainty: number
}

export interface PMBOK8DomainCoverage {
  team: boolean
  developmentApproach: boolean
  projectWork: boolean
  measurement: boolean
  uncertainty: boolean
}

export interface ProjectExtractionResults {
  success: boolean
  projectId: string
  entityCounts: PMBOK8EntityCounts
  totalEntities: number
  pmbok8DomainCounts: PMBOK8DomainCounts
  pmbok8Total: number
  domainCoverage: PMBOK8DomainCoverage
}

export interface DomainHealth {
  score: number | null
  status: 'healthy' | 'needs_attention' | 'active' | 'inactive' | 'blocked' | 'at_risk' | 'on_track' | 'managed'
}

export interface PMBOK8DomainAnalytics {
  projectId: string
  domains: {
    team: {
      total_agreements: number
      active_agreements: number
      under_review: number
      avg_adherence_score: number | null
      total_violations: number
      agreements_with_violations: number
      health: DomainHealth
    }
    developmentApproach: {
      total_approaches: number
      unique_frameworks: number
      total_iterations: number
      completed_iterations: number
      avg_velocity: number | null
      avg_story_points: number | null
      health: DomainHealth
    }
    projectWork: {
      workItems: {
        total_work_items: number
        completed_items: number
        in_progress_items: number
        blocked_items: number
        total_estimated_hours: number | null
        total_actual_hours: number | null
        avg_progress: number | null
        unique_assignees: number
      }
      capacity: {
        total_capacity_plans: number
        avg_utilization: number | null
        total_available_hours: number | null
        total_allocated_hours: number | null
      }
      health: DomainHealth
    }
    measurement: {
      performance: {
        total_measurements: number
        on_track_count: number
        at_risk_count: number
        off_track_count: number
        avg_variance: number | null
        measured_criteria: number
      }
      evm: {
        total_evm_records: number
        avg_spi: number | null
        avg_cpi: number | null
        avg_sv: number | null
        avg_cv: number | null
        latest_measurement_date: string | null
      }
      actuals: {
        total_actuals: number
        ahead_of_schedule: number
        behind_schedule: number
        avg_schedule_variance_days: number | null
        avg_cost_variance: number | null
        avg_progress_variance: number | null
        avg_quality_score: number | null
        total_defects: number
        total_rework_hours: number | null
      }
      health: DomainHealth
    }
    uncertainty: {
      total_opportunities: number
      realized_opportunities: number
      exploiting_opportunities: number
      total_expected_benefit: number | null
      total_risk_responses: number
      effective_responses: number
      ineffective_responses: number
      avg_response_cost: number | null
      health: DomainHealth
    }
  }
  overallHealth: {
    domainsCovered: number
    averageScore: number
  }
  generated_at: string
}

export interface DomainExtractionDomainStat {
  domain: string
  total_runs: number
  completed_runs: number
  failed_runs: number
  partial_runs: number
  avg_entities: number
  avg_success_rate: number
  avg_cache_hit_rate: number
  avg_runtime_ms: number
  last_run_at: string | null
}

export interface DomainExtractionAnalyticsResponse {
  success: boolean
  period: string
  projectId: string | null
  generated_at: string
  summary: {
    total_runs: number
    completed_runs: number
    failed_runs: number
    partial_runs: number
    avg_success_rate: number
    avg_entities: number
    avg_runtime_ms: number
  }
  domains: DomainExtractionDomainStat[]
  providerUsage: Array<{
    provider_name: string
    model_name: string
    usage_count: number
    avg_response_time_ms: number
    total_cost_usd: number
  }>
  costByDomain: Array<{
    domain: string
    total_cost_usd: number
    total_tokens: number
  }>
}

// Extended RequestInit with custom options
interface ExtendedRequestOptions extends RequestInit {
  suppressNotFoundError?: boolean
  suppressAllErrors?: boolean
}

// Extended Error type for API errors
interface ApiError extends Error {
  response?: {
    data: unknown
    status: number
  }
  status?: number
  data?: unknown
}

export class ApiClient {
  private baseURL: string
  private token: string | null = null
  private socket: Socket | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    // Get token from localStorage if available
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("auth_token")
      // Validate token format before using it
      if (storedToken && this.isValidTokenFormat(storedToken)) {
        this.token = storedToken
      } else if (storedToken) {
        // Token exists but is invalid - clear it
        console.warn("Invalid token format in localStorage, clearing it")
        localStorage.removeItem("auth_token")
        this.token = null
      }
    }
  }

  /**
   * Validates that a token has a reasonable structure.
   * In production, this should ideally be a full JWT check.
   */
  private isValidTokenFormat(token: string): boolean {
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return false
    }
    
    // We're more lenient in development/emulator mode, as long as it's a non-empty string.
    // Standard JWTs have 3 parts separated by dots.
    const parts = token.trim().split(".")
    if (parts.length !== 3) {
      if (process.env.NODE_ENV === 'development') {
        console.warn("⚠️ Token does not look like a standard JWT (3 parts expected), but allowing in development.")
      }
    }
    
    return true
  }

  setToken(token: string) {
    if (!token) return;
    
    const trimmedToken = token.trim()
    
    // Safety check for common "broken" token values
    if (trimmedToken === "undefined" || trimmedToken === "null" || trimmedToken === "[object Object]") {
      console.error("Attempted to set an invalid literal token:", trimmedToken)
      return
    }

    // Validate token format before storing
    if (!this.isValidTokenFormat(trimmedToken)) {
      console.error("Attempted to set an empty or invalid token format")
      return
    }
    
    this.token = trimmedToken
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", this.token)
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
    options: ExtendedRequestOptions = {}
  ): Promise<T> {
    // FIX: Handle trailing/leading slashes to prevent double slashes
    const baseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${baseURL}${cleanEndpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    // Allow FormData to set its own Content-Type (with boundary)
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      delete headers["Content-Type"];
    }

    // Only add authorization header if token exists and is not empty
    if (this.token && typeof this.token === 'string' && this.token.trim().length > 0) {
      headers['authorization'] = `Bearer ${this.token.trim()}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        // include credentials so cookie-based sessions work from the browser
        credentials: options.credentials || "include",
      })

      let data: unknown
      try {
        data = await response.json()
      } catch (jsonError) {
        // If response is not JSON or JSON parsing failed, read the raw text.
        // Use `response.clone()` because some environments may have already
        // consumed the body (or `response.json()` attempted to read it and
        // failed) — cloning provides a fresh stream to safely call `text()`.
        let text: string
        try {
          text = await response.clone().text()
        } catch (_err) {
          // Fallback if clone/text also fail; provide a generic message
          text = `HTTP error! status: ${response.status}`
        }

        data = { error: text || `HTTP error! status: ${response.status}`, message: text || `HTTP error! status: ${response.status}` }
      }

      if (!response.ok) {
        // Create an error object that includes the response data for better error handling
        // Extract message from various possible locations in the response
        const responseData = data as Record<string, unknown>
        let errorMessage: any = responseData?.message || responseData?.error || `HTTP error! status: ${response.status}`

        // Ensure errorMessage is a string
        if (typeof errorMessage !== 'string') {
          if (typeof errorMessage === 'object' && errorMessage !== null) {
            errorMessage = JSON.stringify(errorMessage)
          } else {
            errorMessage = String(errorMessage)
          }
        }

        const error = new Error(errorMessage) as ApiError
        error.response = { data, status: response.status }
        error.status = response.status
        error.data = data // Also attach data directly for easier access
        throw error
      }

      return data as T
    } catch (error) {
      const apiError = error as ApiError
      const nativeError = error as Error
      // Don't log expected errors if suppressNotFoundError is set
      // Suppresses: 404 (not found), 401/403 (auth errors - user not logged in)
      // suppressAllErrors skips logging for ALL errors (use for non-critical polling)
      const shouldSuppressLog = options.suppressAllErrors ||
        (options.suppressNotFoundError &&
          (apiError?.status === 404 || apiError?.status === 401 || apiError?.status === 403))

      if (!shouldSuppressLog) {
        const statusCode = apiError?.status || apiError?.response?.status
        const isNetworkError = !statusCode
        // Log error with better formatting
        const errorDetails = apiError?.response?.data || apiError?.data || apiError?.message || error
        const errorMessage =
          typeof errorDetails === 'string'
            ? errorDetails
            : (nativeError?.message || JSON.stringify(errorDetails))

        const isStartupUnavailable =
          statusCode === 503 &&
          typeof errorMessage === 'string' &&
          errorMessage.includes('initializing dependencies')

        if (!isStartupUnavailable) {
          console.error(`API request failed: ${endpoint}`, {
            url,
            status: statusCode,
            networkError: isNetworkError,
            message: errorMessage,
            errorName: nativeError?.name,
            error
          })
        }
      }
      throw error
    }
  }

  // HTTP method shortcuts
  async get<T>(endpoint: string, options?: ExtendedRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown, options?: ExtendedRequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? (body as any) : (body ? JSON.stringify(body) : undefined)
    })
  }

  async put<T>(endpoint: string, body?: unknown, options?: ExtendedRequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: isFormData ? (body as any) : (body ? JSON.stringify(body) : undefined)
    })
  }

  async delete<T>(endpoint: string, options?: ExtendedRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  async patch<T>(endpoint: string, body?: unknown, options?: ExtendedRequestOptions): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: isFormData ? (body as any) : (body ? JSON.stringify(body) : undefined)
    })
  }

  /**
   * Makes a request that returns a Blob (for file downloads like PDF)
   */
  async requestBlob(endpoint: string, options: RequestInit = {}): Promise<Blob> {
    const baseURL = this.baseURL.endsWith('/') ? this.baseURL.slice(0, -1) : this.baseURL
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    const url = `${baseURL}${cleanEndpoint}`

    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    }

    if (this.token && typeof this.token === 'string' && this.token.trim().length > 0) {
      headers['authorization'] = `Bearer ${this.token.trim()}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorData = await response.json()
        errorMessage = errorData?.message || errorData?.error || errorMessage
      } catch {
        // If JSON parsing fails, use the status text
        errorMessage = response.statusText || errorMessage
      }
      throw new Error(errorMessage)
    }

    // Check content type to ensure we got a PDF and not an error JSON response
    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('application/pdf')) {
      // Might be a JSON error response with 200 status
      try {
        const errorData = await response.json()
        throw new Error(errorData?.message || errorData?.error || 'Expected PDF but received different content type')
      } catch (e) {
        if (e instanceof Error && e.message !== 'Expected PDF but received different content type') {
          throw e
        }
        throw new Error(`Expected PDF but received: ${contentType}`)
      }
    }

    return response.blob()
  }

  // WebSocket connection
  connectWebSocket(): Socket {
    if (!this.socket) {
      // Configure socket with safe reconnection settings and prefer websocket transport
      this.socket = io(WS_URL, {
        auth: {
          token: this.token,
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      })

      this.socket.on("connect", () => {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_WS === 'true') {
          console.log("WebSocket connected")
        }
      })

      this.socket.on("disconnect", () => {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_WS === 'true') {
          console.log("WebSocket disconnected")
        }
      })

      // Suppress connection errors in production to reduce console noise
      this.socket.on("connect_error", (error: Error) => {
        if (process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_DEBUG_WS === 'true') {
          console.warn("WebSocket connection error:", error.message || error)
        }
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
    companyName?: string
  }): Promise<{ user: User; token: string; company?: { id: string; name: string } }> {
    const response = await this.request<{ user: User; token: string; message: string; company?: { id: string; name: string } }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })

    if (response.token) {
      this.setToken(response.token)
    }

    return {
      user: response.user,
      token: response.token,
      company: response.company || undefined
    }
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>("/auth/me")
    return response.user || response as any
  }

  /**
   * One-time / cold-start elevation to admin or super_admin. See server: POST /auth/bootstrap-elevation.
   * When admins already exist, requires env ADPA_BOOTSTRAP_TOKEN as header x-adpa-bootstrap-token or body.bootstrapToken.
   */
  async claimBootstrapElevation(options?: {
    role?: "admin" | "super_admin"
    bootstrapToken?: string
  }): Promise<{ success: boolean; message?: string; user: User }> {
    const headers: Record<string, string> = {}
    if (options?.bootstrapToken) {
      headers["x-adpa-bootstrap-token"] = options.bootstrapToken
    }
    return this.request("/auth/bootstrap-elevation", {
      method: "POST",
      body: JSON.stringify({
        role: options?.role ?? "super_admin",
        ...(options?.bootstrapToken ? { bootstrapToken: options.bootstrapToken } : {}),
      }),
      headers,
    })
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

    const response = await this.request<{ projects?: Project[]; pagination?: any; page?: number; limit?: number; total?: number }>(
      `/projects?${queryParams}`
    )
    const projects = response.projects || []
    const page = Number(response.pagination?.page ?? response.page ?? params?.page ?? 1)
    const limit = Number(response.pagination?.limit ?? response.limit ?? params?.limit ?? 10)
    const total = Number(response.pagination?.total ?? response.total ?? projects.length)
    const pages = Number(response.pagination?.pages ?? Math.ceil(total / Math.max(limit, 1)) ?? 0)

    return {
      projects,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    }
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

  // Entities API
  async getProjectEntities(projectId: string, params?: Record<string, string | number | undefined>): Promise<{ success: boolean; data: ExtractedEntity[] }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }
    const query = queryParams.toString()
    return this.request<{ success: boolean; data: ExtractedEntity[] }>(`/entities/project/${projectId}${query ? `?${query}` : ''}`)
  }

  async extractProjectEntities(projectId: string): Promise<{ success: boolean; data: { totalExtracted: number } }> {
    return this.request<{ success: boolean; data: { totalExtracted: number } }>(`/entities/extract/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({})
    })
  }

  async verifyEntity(entityId: string, payload: { verified: boolean; confirmed?: boolean }): Promise<{ success: boolean; error?: string; requiresConfirmation?: boolean }> {
    return this.request<{ success: boolean; error?: string; requiresConfirmation?: boolean }>(`/entities/${entityId}/verify`, {
      method: 'POST',
      body: JSON.stringify(payload)
    })
  }

  // Programs API
  async getPrograms(params?: {
    page?: number
    limit?: number
    status?: string
    owner_id?: string
    rag_status?: string
    search?: string
  }): Promise<{ programs: Program[]; pagination: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString())
        }
      })
    }

    // Backend returns { success: true, data: Program[] }
    const response = await this.request<{ success: boolean; data: Program[] }>(
      `/programs?${queryParams}`
    )
    // Transform to expected format for backward compatibility
    return {
      programs: response.data || [],
      pagination: {} // Backend doesn't return pagination yet, but structure is ready
    }
  }

  async getProgram(id: string): Promise<Program> {
    // Backend returns { success: true, data: Program } on success
    // On 404, backend returns { error: 'Program not found' } and request() throws
    try {
      const response = await this.request<{ success: boolean; data: Program }>(`/programs/${id}`)
      return response.data
    } catch (error: any) {
      // Re-throw with better context
      if (error?.status === 404) {
        const notFoundError = new Error('Program not found')
          ; (notFoundError as any).status = 404
        throw notFoundError
      }
      throw error
    }
  }

  async createProgram(programData: Partial<Program>): Promise<Program> {
    // Backend returns { success: true, data: Program }
    const response = await this.request<{ success: boolean; data: Program }>("/programs", {
      method: "POST",
      body: JSON.stringify(programData),
    })
    return response.data
  }

  async updateProgram(id: string, programData: Partial<Program>): Promise<Program> {
    // Backend returns { success: true, data: Program }
    const response = await this.request<{ success: boolean; data: Program }>(`/programs/${id}`, {
      method: "PUT",
      body: JSON.stringify(programData),
    })
    return response.data
  }

  async deleteProgram(id: string): Promise<void> {
    await this.request(`/programs/${id}`, { method: "DELETE" })
  }

  async getProgramMetrics(id: string): Promise<ProgramDashboardMetrics> {
    const response = await this.request<{ success: boolean; data: ProgramDashboardMetrics }>(`/programs/${id}/metrics`)
    return response.data
  }

  async getProgramProjects(id: string): Promise<{ projects: Project[] }> {
    const response = await this.request<{ success: boolean; data: Project[] }>(`/programs/${id}/projects`)
    return {
      projects: response.data || []
    }
  }

  async canArchiveProgram(id: string): Promise<{ canArchive: boolean; reason?: string; unarchivedCount?: number }> {
    const response = await this.request<{ success: boolean; data: { canArchive: boolean; reason?: string; unarchivedCount?: number } }>(`/programs/${id}/can-archive`)
    return response.data
  }

  async archiveProgram(id: string): Promise<void> {
    await this.request(`/programs/${id}/archive`, { method: "POST" })
  }

  async unarchiveProgram(id: string): Promise<void> {
    await this.request(`/programs/${id}/unarchive`, { method: "POST" })
  }

  // ---------------------------------------------------------------------------
  // RTM & Governance Rituals (RPAS-CM)
  // ---------------------------------------------------------------------------

  /**
   * Fetches the full RTM Ledger (Historical or Baseline)
   * Authored under RPAS-CM for Researcher Dashboard
   */
  async getRtmLedger(): Promise<RtmRequirement[]> {
    const response = await this.request<RtmRequirement[]>("/Ritual/ledger/rtm")
    return response || []
  }

  /**
   * Proposes a new RTM Amendment
   * Complies with RPAS G5 (Read vs Act) - Drafting only.
   */
  async proposeRtmAmendment(request: AmendmentProposalRequest): Promise<RtmAmendment> {
    const res = await this.request<{ Status: string; AmendmentId: string; TargetId: string }>("/Ritual/rtm/propose-amendment", {
      method: "POST",
      body: JSON.stringify({
        targetRequirementId: request.requirement_id,
        proposedDescription: request.proposed_description,
        justification: request.justification,
        amendmentType: request.amendment_type,
        amendmentSubType: request.amendment_sub_type,
        requester: "SYSTEM"
      })
    })
    return {
      id: res.AmendmentId,
      requirement_id: res.TargetId,
      status: "PENDING",
      proposed_by: "SYSTEM",
      proposed_at: new Date().toISOString(),
      proposed_description: request.proposed_description,
      justification: request.justification,
      amendment_type: request.amendment_type,
      amendment_sub_type: request.amendment_sub_type,
    } as any
  }

  /**
   * Triggers an AI Research Ritual for a given requirement.
   * Leverages Full Historical Ledger context via Orchestrator.
   */
  async getRtmResearchAdvice(requirementId: string): Promise<ResearchAdvice> {
    return this.request<ResearchAdvice>(`/Ritual/rtm/research-advice/${requirementId}`, {
      method: "POST"
    })
  }

  // Search API
  async search(query: string, filters?: any): Promise<any[]> {
    const response = await this.request<{ results: any[] }>("/search", {
      method: "POST",
      body: JSON.stringify({ query, filters }),
    })
    return response.results
  }

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
    return response.integrations || []
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
  async getDocuments(params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    framework?: string
    projectId?: string
  }): Promise<{ documents: Document[]; pagination?: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Convert projectId to project_id for backend
        const paramKey = key === 'projectId' ? 'project_id' : key
        if (value !== undefined) {
          queryParams.append(paramKey, value.toString())
        }
      })
    }
    const response = await this.request<{ documents: Document[]; pagination?: any }>(`/documents?${queryParams}`)
    return response
  }

  // Users endpoints
  async getUsers(params?: { page?: number; limit?: number; search?: string }) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    const query = queryParams.toString()
    
    return this.request<{ users: User[], pagination: any }>(`/users${query ? `?${query}` : ''}`)
  }

  async getUser(id: string) {
    return this.request<{ user: User }>(`/users/${id}`)
  }

  async updateUser(id: string, userData: any) {
    return this.request<any>(`/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(userData),
    })
  }

  // Analytics endpoints
  async getAnalytics(timeRange?: string) {
    const query = timeRange ? `?timeRange=${timeRange}` : ""
    return this.request<any>(`/analytics${query}`)
  }

  // Security endpoints
  async getSecurityEvents() {
    return this.request<any[]>("/security/events")
  }

  async getSecurityMetrics() {
    return this.request<any>("/security/metrics")
  }

  // Companies endpoints
  async getCompanies(params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.search) queryParams.append('search', params.search)
    if (params?.is_active !== undefined) queryParams.append('is_active', params.is_active.toString())
    const query = queryParams.toString()
    return this.request<{ companies: any[]; pagination: any }>(
      `/v1/identity/companies${query ? `?${query}` : ""}`
    )
  }

  async getCompany(id: string) {
    return this.request<{ company: any }>(`/v1/identity/companies/${id}`)
  }

  async createCompany(companyData: { name: string; domain?: string; metadata?: any }) {
    return this.request<{ message: string; company: any }>("/v1/identity/companies", {
      method: "POST",
      body: JSON.stringify(companyData),
    })
  }

  async updateCompany(id: string, companyData: { name?: string; domain?: string; metadata?: any; is_active?: boolean }) {
    return this.request<{ message: string; company: any }>(`/v1/identity/companies/${id}`, {
      method: "PUT",
      body: JSON.stringify(companyData),
    })
  }

  async deleteCompany(id: string) {
    return this.request<{ message: string; company: any }>(`/v1/identity/companies/${id}`, {
      method: "DELETE",
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
    return response
  }

  async getDocumentsByType(batchId: string, documentType: string): Promise<any[]> {
    const response = await this.request<{ success: boolean; data: any[] }>(
      `/assessment/batch/${batchId}/documents?type=${encodeURIComponent(documentType)}`
    )
    return response.data || []
  }

  async getDocumentQualityAudit(documentId: string): Promise<any> {
    const response = await this.request<{ success: boolean; data: any }>(
      `/documents/${documentId}/quality-audit`
    )
    return response.data || null
  }

  async getDocument(id: string): Promise<Document> {
    // Fetch single document, including optional confluence_page_url if backend provides it

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
      console.error("API Client: Test error occurred:", error)
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
    // The /api/ai-providers endpoint returns providers array directly, not wrapped
    const response = await this.request<any>("/ai-providers")
    // Handle both direct array response and wrapped response
    if (Array.isArray(response)) {
      return response
    }
    return response?.providers || []
  }

  // AI Model Configuration API
  async getProviderModels(providerId: string): Promise<{ models: any[], provider: any }> {
    return await this.request<{ models: any[], provider: any }>(`/ai-models/providers/${providerId}/models`)
  }

  async getModelConfiguration(providerId: string, modelId: string): Promise<{ model: any }> {
    return await this.request<{ model: any }>(`/ai-models/providers/${providerId}/models/${modelId}`)
  }

  async createModelConfiguration(providerId: string, modelData: any): Promise<{ model: any, message: string }> {
    return await this.request<{ model: any, message: string }>(`/ai-models/providers/${providerId}/models`, {
      method: "POST",
      body: JSON.stringify(modelData)
    })
  }

  async updateModelConfiguration(providerId: string, modelId: string, modelData: any): Promise<{ model: any, message: string }> {
    return await this.request<{ model: any, message: string }>(`/ai-models/providers/${providerId}/models/${modelId}`, {
      method: "PUT",
      body: JSON.stringify(modelData)
    })
  }

  async deleteModelConfiguration(providerId: string, modelId: string): Promise<{ message: string }> {
    return await this.request<{ message: string }>(`/ai-models/providers/${providerId}/models/${modelId}`, {
      method: "DELETE"
    })
  }

  async testModelConfiguration(providerId: string, modelId: string, testData?: any): Promise<{ test: any, message: string }> {
    return await this.request<{ test: any, message: string }>(`/ai-models/providers/${providerId}/models/${modelId}/test`, {
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
    projectId?: string
  }): Promise<any> {
    const payload = {
      ...data,
      project_id: data.projectId
    }
    const response = await this.request<any>("/ai/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    return response
  }

  /**
   * Queue background AI document generation (worker creates document when complete).
   * POST /api/jobs/ai-generate → 202 { jobId }
   */
  async enqueueAiGenerateJob(data: {
    projectId: string
    prompt: string
    provider?: string
    model?: string
    templateId?: string
    maxTokens?: number
    temperature?: number
    documentName?: string
    description?: string
    variables?: Record<string, unknown>
    useContext?: boolean
  }): Promise<{ jobId: string }> {
    return this.request<{ jobId: string }>("/jobs/ai-generate", {
      method: "POST",
      body: JSON.stringify({
        projectId: data.projectId,
        prompt: data.prompt,
        provider: data.provider,
        model: data.model,
        templateId: data.templateId,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        documentName: data.documentName,
        description: data.description,
        variables: data.variables,
        useContext: data.useContext,
      }),
    })
  }

  // Document Generation with Smart Versioning (conflict detection)
  async generateDocument(data: {
    projectId: string
    name: string
    description?: string
    templateId?: string
    userPrompt: string
    provider: string
    model?: string
    temperature?: number
    includeStakeholders?: boolean
    includeDocuments?: boolean
    customContext?: string
    async?: boolean
  }): Promise<{ document: Document; generation: any } | { jobId: string; async: true; message: string }> {
    const response = await this.request<{ document: Document; generation: any } | { jobId: string; async: true; message: string }>("/document-generation/generate", {
      method: "POST",
      body: JSON.stringify(data),
    })
    return response
  }

  // Generate as new version of existing document (conflict resolution)
  async generateDocumentNewVersion(data: {
    existingDocumentId: string
    projectId: string
    templateId: string
    userPrompt: string
    provider: string
    model?: string
    temperature?: number
  }): Promise<{ document: Document; previousVersion: string; newVersion: string; driftDetected: boolean; generation: any }> {
    const response = await this.request<{
      document: Document
      previousVersion: string
      newVersion: string
      driftDetected: boolean
      generation: any
    }>("/document-generation/generate-new-version", {
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

  async pickUpGitHubIssue(integrationId: string, issueNumber: number, options?: {
    createJob?: boolean
    assignToUser?: string
    addComment?: boolean
  }): Promise<any> {
    return this.request<any>(`/integrations/github/${integrationId}/issues/${issueNumber}/pickup`, {
      method: "POST",
      body: JSON.stringify(options || {}),
    })
  }

  // Jobs API
  async getJobs(params?: {
    page?: number
    limit?: number
    status?: string
    type?: string
    allUsers?: boolean // If true, uses admin endpoint to get all users' jobs
  }): Promise<{ jobs: Job[]; pagination: any }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && key !== 'allUsers') {
          queryParams.append(key, value.toString())
        }
      })
    }

    // Use admin endpoint if allUsers is true
    const endpoint = params?.allUsers ? `/jobs/admin/all?${queryParams}` : `/jobs?${queryParams}`
    const response = await this.request<{ jobs: Job[]; pagination: any }>(endpoint)
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

  // Queue Stats API
  async getQueueStats(): Promise<{ queues: any[] }> {
    const response = await this.request<{ queues: any[] }>("/queue-stats/overview")
    return response
  }

  async getWorkerStats(): Promise<{ workers: any[] }> {
    const response = await this.request<{ workers: any[] }>("/queue-stats/workers")
    return response
  }

  async getQueueMetrics(): Promise<any> {
    const response = await this.request<any>("/queue-stats/metrics")
    return response
  }

  async getQueueHealth(): Promise<{ status: string; failedJobs: number; stalledJobs: number }> {
    const response = await this.request<{ status: string; failedJobs: number; stalledJobs: number }>("/queue-stats/health")
    return response
  }

  // Job Diagnostics API
  async getPendingJobsDiagnostics(): Promise<PendingJobsDiagnostics> {
    const response = await this.request<PendingJobsDiagnostics>("/jobs/diagnostics/pending")
    return response
  }



  async exportDocumentPdf(id: string): Promise<Blob> {
    return this.requestBlob(`/documents/${id}/export/pdf`)
  }

  async exportDocumentDocx(id: string): Promise<Blob> {
    return this.requestBlob(`/documents/${id}/export/docx`)
  }

  async fixPendingJobs(action: 're-add' | 'mark-failed', maxAge?: number): Promise<FixPendingJobsResponse> {
    const response = await this.request<FixPendingJobsResponse>("/jobs/diagnostics/fix-pending", {
      method: "POST",
      body: JSON.stringify({ action, maxAge }),
    })
    return response
  }

  // Analytics API
  async getDashboardAnalytics(): Promise<any> {
    const response = await this.request<any>("/analytics/dashboard")
    return response
  }

  async getSystemAnalytics(period: string = "30d"): Promise<any> {
    const response = await this.request<any>(`/analytics/system?period=${period}`)
    return response
  }

  /**
   * Get extraction analytics overview
   */
  async getExtractionOverview(period: string = '30d'): Promise<any> {
    return this.get<any>(`/extraction-analytics/overview?period=${period}`)
  }

  /**
   * Get extraction distribution by entity type
   */
  async getExtractionDistribution(period: string = '30d'): Promise<any> {
    return this.get<any>(`/extraction-analytics/distribution?period=${period}`)
  }

  /**
   * Get extraction trends over time
   */
  async getExtractionTrends(period: string = '30d'): Promise<any> {
    return this.get<any>(`/extraction-analytics/trends?period=${period}`)
  }

  // AI Analytics API
  async getAIModelAnalytics(period: string = "30d"): Promise<any> {
    const response = await this.request<any>(`/ai-analytics/models?period=${period}`)
    return response
  }

  async getAIProviderAnalytics(providerId: string, period: string = "30d"): Promise<any> {
    const response = await this.request<any>(`/ai-analytics/providers/${providerId}?period=${period}`)
    return response
  }

  async getAITrends(period: string = "30d"): Promise<any> {
    const response = await this.request<any>(`/ai-analytics/trends?period=${period}`)
    return response
  }

  async getDomainExtractionAnalytics(period: string = "30d", projectId?: string): Promise<DomainExtractionAnalyticsResponse> {
    const params = new URLSearchParams({ period })
    if (projectId) {
      params.append('projectId', projectId)
    }
    const response = await this.request<DomainExtractionAnalyticsResponse>(`/analytics/domain-extraction?${params.toString()}`)
    return response
  }

  // PMBOK 8 Domain Analytics API
  async getPMBOK8DomainAnalytics(projectId: string): Promise<PMBOK8DomainAnalytics> {
    const response = await this.request<PMBOK8DomainAnalytics>(`/analytics/pmbok8-domains/${projectId}`)
    return response
  }

  // Generic request method for custom API calls
  async makeRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, options)
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

  async linkStakeholderToUser(stakeholderId: string, userId: string): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>(`/stakeholders/${stakeholderId}/link-user`, { userId })
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

  // Drift Detection & Resolution API
  async checkDrift(projectId: string, documentId: string): Promise<{
    success: boolean
    driftDetected: boolean
    severity: 'low' | 'medium' | 'high' | 'critical'
    driftCount: number
    summary: string
    driftPoints: any[]
  }> {
    return this.post('/api/drift/check', {
      projectId,
      documentId
    })
  }

  async resolveDrift(
    documentId: string,
    driftRecordId: string,
    strategy: 'conservative' | 'balanced' | 'permissive' = 'balanced'
  ): Promise<{
    success: boolean
    resolvedContent: string
    originalContent: string
    driftPoints: any[]
    majorChanges: any[]
    requiresApproval: boolean
    strategy: string
    previewHtml?: string
  }> {
    return this.post('/api/drift/resolve', {
      documentId,
      driftRecordId,
      strategy
    })
  }

  async applyDriftResolution(
    documentId: string,
    driftRecordId: string,
    resolvedContent: string,
    majorChanges?: any[]
  ): Promise<{
    success: boolean
    message: string
    changeRequestCreated?: boolean
    changeRequestId?: string
  }> {
    return this.post('/api/drift/apply', {
      documentId,
      driftRecordId,
      resolvedContent,
      majorChanges
    })
  }

  async getDriftRecord(driftRecordId: string): Promise<{
    success: boolean
    driftRecord: any
  }> {
    return this.get(`/api/drift/${driftRecordId}`)
  }

  async getProjectDriftRecords(projectId: string, status?: string): Promise<{
    success: boolean
    driftRecords: any[]
  }> {
    const query = status ? `?status=${status}` : ''
    return this.get(`/api/drift/project/${projectId}${query}`)
  }

  // Project Context Items API
  async getProjectContextItems(projectId: string, filters?: {
    type?: string
    is_active?: boolean
    integration_type?: string
  }): Promise<{
    success: boolean
    items: ProjectContextItem[]
  }> {
    const params = new URLSearchParams()
    if (filters?.type) params.append('type', filters.type)
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
    if (filters?.integration_type) params.append('integration_type', filters.integration_type)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.get(`/projects/${projectId}/context-items${query}`)
  }

  async createProjectContextItem(
    projectId: string,
    data: {
      type: 'reference_document' | 'url' | 'custom_text' | 'jira_page' | 'confluence_page'
      title?: string
      content?: string
      source_url?: string
      integration_type?: string
      integration_page_id?: string
      priority?: number
      file?: File
    }
  ): Promise<{
    success: boolean
    item: ProjectContextItem
  }> {
    if (data.type === 'reference_document' && data.file) {
      // Use FormData for file upload
      const formData = new FormData()
      formData.append('type', data.type)
      if (data.title) formData.append('title', data.title)
      if (data.priority) formData.append('priority', String(data.priority))
      formData.append('file', data.file)

      return this.request(`/projects/${projectId}/context-items`, {
        method: 'POST',
        body: formData,
        headers: {}, // Let browser set Content-Type with boundary
      })
    } else {
      return this.post(`/projects/${projectId}/context-items`, data)
    }
  }

  async updateProjectContextItem(
    projectId: string,
    itemId: string,
    data: {
      title?: string
      content?: string
      is_active?: boolean
      priority?: number
    }
  ): Promise<{
    success: boolean
    item: ProjectContextItem
  }> {
    return this.put(`/projects/${projectId}/context-items/${itemId}`, data)
  }

  async deleteProjectContextItem(
    projectId: string,
    itemId: string
  ): Promise<{
    success: boolean
    message: string
  }> {
    return this.delete(`/projects/${projectId}/context-items/${itemId}`)
  }

  async fetchUrlContent(projectId: string, url: string): Promise<{
    success: boolean
    content: string
    title: string
    metadata: any
  }> {
    return this.post(`/projects/${projectId}/context-items/fetch-url`, { url })
  }

  async getIntegrationPages(
    projectId: string,
    integrationType: 'jira' | 'confluence',
    search?: string
  ): Promise<{
    success: boolean
    pages: IntegrationPage[]
  }> {
    const params = new URLSearchParams()
    params.append('integration_type', integrationType)
    if (search) params.append('search', search)
    return this.get(`/projects/${projectId}/context-items/integration-pages?${params.toString()}`)
  }

  async getProjectContextAnalytics(projectId: string): Promise<{
    success: boolean
    totalItems: number
    itemsByType: Record<string, number>
    activeItems: number
    totalContentSize: number
    mostUsedItems: any[]
    recentItems: any[]
    usageOverTime: any[]
  }> {
    return this.get(`/projects/${projectId}/context-items/analytics`)
  }

  async getProjectContextRecommendations(projectId: string): Promise<{
    success: boolean
    recommendations: ContextRecommendation[]
    templateSuggestions: TemplateSuggestion[]
  }> {
    return this.get(`/projects/${projectId}/context-items/recommendations`)
  }

  async logContextItemUsage(
    projectId: string,
    itemId: string,
    data: {
      document_id?: string
      usage_type?: 'document_generation' | 'manual_review' | 'export'
    }
  ): Promise<{
    success: boolean
    message: string
  }> {
    return this.post(`/projects/${projectId}/context-items/${itemId}/log-usage`, data)
  }

  // Review Scheduling API
  async getReviewSchedule(programId: string, reviewType?: string): Promise<{
    success: boolean
    data: ReviewSchedule | null
  }> {
    const query = reviewType ? `?review_type=${reviewType}` : ''
    return this.get(`/programs/${programId}/reviews/schedule${query}`)
  }

  async createReviewSchedule(programId: string, scheduleData: Partial<ReviewSchedule>): Promise<{
    success: boolean
    data: ReviewSchedule
  }> {
    return this.post(`/programs/${programId}/reviews/schedule`, scheduleData)
  }

  async getReviewMeetings(
    programId: string,
    options?: {
      limit?: number
      offset?: number
      status?: string
      start_date?: string
      end_date?: string
    }
  ): Promise<{
    success: boolean
    data: ReviewMeeting[]
  }> {
    const params = new URLSearchParams()
    if (options?.limit) params.append('limit', options.limit.toString())
    if (options?.offset) params.append('offset', options.offset.toString())
    if (options?.status) params.append('status', options.status)
    if (options?.start_date) params.append('start_date', options.start_date)
    if (options?.end_date) params.append('end_date', options.end_date)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.get(`/programs/${programId}/reviews${query}`)
  }

  async createReviewMeeting(programId: string, meetingData: Partial<ReviewMeeting>): Promise<{
    success: boolean
    data: ReviewMeeting
  }> {
    return this.post(`/programs/${programId}/reviews`, meetingData)
  }

  async getReviewMeeting(programId: string, meetingId: string): Promise<{
    success: boolean
    data: ReviewMeeting
  }> {
    return this.get(`/programs/${programId}/reviews/${meetingId}`)
  }

  async updateReviewMeeting(programId: string, meetingId: string, updates: Partial<ReviewMeeting>): Promise<{
    success: boolean
    data: ReviewMeeting
  }> {
    return this.put(`/programs/${programId}/reviews/${meetingId}`, updates)
  }

  async deleteReviewMeeting(programId: string, meetingId: string): Promise<{
    success: boolean
    message: string
  }> {
    return this.delete(`/programs/${programId}/reviews/${meetingId}`)
  }

  async createReviewDecision(programId: string, meetingId: string, decisionData: Partial<ReviewDecision>): Promise<{
    success: boolean
    data: ReviewDecision
  }> {
    return this.post(`/programs/${programId}/reviews/${meetingId}/decisions`, decisionData)
  }

  async createReviewActionItem(programId: string, meetingId: string, actionItemData: Partial<ReviewActionItem>): Promise<{
    success: boolean
    data: ReviewActionItem
  }> {
    return this.post(`/programs/${programId}/reviews/${meetingId}/action-items`, actionItemData)
  }

  async getReviewCompliance(programId: string): Promise<{
    success: boolean
    data: ReviewCompliance[]
  }> {
    return this.get(`/programs/${programId}/reviews/compliance`)
  }

  async getUpcomingReviews(daysAhead?: number): Promise<{
    success: boolean
    data: ReviewMeeting[]
  }> {
    const query = daysAhead ? `?days_ahead=${daysAhead}` : ''
    return this.get(`/reviews/upcoming${query}`)
  }

  async getOverdueReviews(): Promise<{
    success: boolean
    data: ReviewCompliance[]
  }> {
    return this.get(`/reviews/overdue`)
  }

  async generateUpcomingMeetings(programId: string, scheduleId: string, monthsAhead?: number): Promise<{
    success: boolean
    data: ReviewMeeting[]
    message: string
  }> {
    return this.post(`/programs/${programId}/reviews/schedule/${scheduleId}/generate-meetings`, {
      months_ahead: monthsAhead || 3
    })
  }

  async autoGenerateAllMeetings(monthsAhead?: number): Promise<{
    success: boolean
    data: {
      schedulesProcessed: number
      meetingsCreated: number
      errors: string[]
    }
    message: string
  }> {
    return this.post(`/reviews/auto-generate`, {
      months_ahead: monthsAhead || 3
    })
  }

  // Playbook Management API
  async getPlaybooks(params?: { project_id?: string; category?: string; is_active?: boolean }): Promise<{ playbooks: Playbook[] }> {
    const query = params ? '?' + new URLSearchParams(params as any).toString() : ''
    const response = await this.get<{ success: boolean; data: Playbook[] } | { playbooks: Playbook[] }>(`/playbooks${query}`)
    // Handle both old and new response formats for backward compatibility
    if ('data' in response) {
      return { playbooks: response.data }
    } else if ('playbooks' in response) {
      return { playbooks: response.playbooks }
    } else {
      return { playbooks: [] }
    }
  }

  async getPlaybook(id: string): Promise<{ playbook: Playbook; scenarios: PlaybookScenario[]; steps: PlaybookStep[] }> {
    const response = await this.get<{ success: boolean; data: Playbook }>(`/playbooks/${id}`)
    return {
      playbook: response.data,
      scenarios: response.data.scenarios || [],
      steps: response.data.steps || [],
    }
  }

  async createPlaybook(data: any): Promise<{ playbook: Playbook }> {
    return this.post<{ playbook: Playbook }>('/playbooks', data)
  }

  async updatePlaybook(id: string, data: any): Promise<{ playbook: Playbook }> {
    return this.put<{ playbook: Playbook }>(`/playbooks/${id}`, data)
  }

  async executePlaybook(
    playbookId: string,
    data: {
      triggered_by_type: 'risk' | 'issue' | 'escalation' | 'manual',
      triggered_by_id: string,
      trigger_type: 'auto' | 'manual',
      trigger_reason?: string
    }
  ): Promise<{ execution: PlaybookExecution }> {
    const response = await this.post<{ success: boolean; data: PlaybookExecution }>(`/playbooks/${playbookId}/execute`, data)
    return { execution: response.data }
  }

  async getExecutionById(executionId: string): Promise<{ execution: PlaybookExecution }> {
    const response = await this.get<{ success: boolean; data: PlaybookExecution }>(`/playbooks/executions/${executionId}`)
    return { execution: response.data }
  }

  async getMatchingPlaybooks(criteria: { project_id: string; risk_category?: string; severity_level?: string; priority_level?: string }): Promise<{ playbooks: Playbook[] }> {
    const query = new URLSearchParams(criteria as any).toString()
    return this.get<{ playbooks: Playbook[] }>(`/playbooks/match?${query}`)
  }

  async getPlaybookExecutions(params: { project_id?: string; status?: string }): Promise<{ executions: PlaybookExecution[] }> {
    const query = new URLSearchParams(params as any).toString()
    return this.get<{ executions: PlaybookExecution[] }>(`/playbooks/executions?${query}`)
  }

  async completePlaybookStep(
    executionId: string,
    stepId: string,
    notes?: string,
    evidence?: Record<string, unknown>
  ): Promise<{ success: boolean; data: PlaybookStepExecution }> {
    return this.post<{ success: boolean; data: PlaybookStepExecution }>(
      `/playbooks/executions/${executionId}/steps/${stepId}/complete`,
      { notes, evidence: evidence || {} }
    )
  }

  async updatePlaybookStepNotes(
    executionId: string,
    stepId: string,
    notes?: string,
    evidence?: Record<string, unknown>
  ): Promise<{ success: boolean; data: PlaybookStepExecution }> {
    return this.post<{ success: boolean; data: PlaybookStepExecution }>(
      `/playbooks/executions/${executionId}/steps/${stepId}/notes`,
      { notes, evidence: evidence || {} }
    )
  }

  // Issues API
  async getIssues(params?: {
    project_id?: string
    status?: string[]
    priority?: string[]
    category?: string[]
    assigned_to?: string
    search?: string
  }): Promise<{ data: Issue[]; count: number }> {
    const queryParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            value.forEach(v => queryParams.append(key, v))
          } else {
            queryParams.append(key, value.toString())
          }
        }
      })
    }
    return this.get<{ data: Issue[]; count: number; success: boolean }>(`/issues?${queryParams.toString()}`)
  }

  async getIssue(id: string): Promise<Issue> {
    const response = await this.get<{ success: boolean; data: Issue }>(`/issues/${id}`)
    return response.data
  }

  async getIssueStats(projectId: string): Promise<IssueStats> {
    const response = await this.get<{ success: boolean; data: IssueStats }>(`/issues/stats/${projectId}`)
    return response.data
  }

  async createIssue(issueData: Partial<Issue>): Promise<Issue> {
    const response = await this.post<{ success: boolean; data: Issue }>("/issues", issueData)
    return response.data
  }

  async updateIssue(id: string, issueData: Partial<Issue>): Promise<Issue> {
    const response = await this.put<{ success: boolean; data: Issue }>(`/issues/${id}`, issueData)
    return response.data
  }

  async deleteIssue(id: string): Promise<void> {
    await this.delete(`/issues/${id}`)
  }

  async analyzeIssueRCA(id: string): Promise<any> {
    const response = await this.post<{ success: boolean; data: any }>(`/issues/${id}/analyze-rca`, {})
    return response.data
  }

  async getIssueHistory(id: string): Promise<any[]> {
    const response = await this.get<{ success: boolean; data: any[] }>(`/issues/${id}/history`)
    return response.data || []
  }

  async getIssueResolutionRecommendations(id: string): Promise<{ recommendations: Playbook[] }> {
    const response = await this.get<{ success: boolean; data: { recommendations: Playbook[] } }>(`/issues/${id}/resolution-recommendations`)
    return response.data
  }

  async getIssueResolutionMetrics(projectId: string): Promise<{ metrics: any }> {
    const response = await this.get<{ success: boolean; data: { metrics: any } }>(`/issues/project/${projectId}/resolution-metrics`)
    return response.data
  }
}

// Review Scheduling Types
export interface ReviewSchedule {
  id: string
  program_id: string
  review_type: 'portfolio_performance' | 'program_performance' | 'strategic' | 'governance'
  frequency: 'monthly' | 'quarterly' | 'bi-annually' | 'annually'
  day_of_month?: number
  day_of_week?: string
  required_attendees: string[]
  optional_attendees: string[]
  review_owner_id?: string
  agenda_template_id?: string
  duration_minutes: number
  auto_generate_agenda: boolean
  send_reminders: boolean
  reminder_days_before: number[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ReviewMeeting {
  id: string
  schedule_id: string
  program_id: string
  scheduled_date: string
  actual_date?: string
  start_time?: string
  end_time?: string
  duration_minutes?: number
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'postponed'
  attendees: string[]
  absentees: string[]
  decisions: any[]
  action_items: any[]
  notes?: string
  was_on_time?: boolean
  was_complete?: boolean
  created_at: string
  updated_at: string
}

export interface ReviewDecision {
  id: string
  review_meeting_id: string
  decision_type: 'approve' | 'reject' | 'defer' | 'modify' | 'escalate'
  decision_text: string
  affected_projects: string[]
  affected_programs: string[]
  approved_by?: string
  approval_date?: string
  implementation_deadline?: string
  implementation_status: 'pending' | 'in-progress' | 'completed'
  created_at: string
}

export interface ReviewActionItem {
  id: string
  review_meeting_id: string
  action_text: string
  assigned_to?: string
  due_date?: string
  status: 'open' | 'in-progress' | 'completed' | 'cancelled'
  completed_at?: string
  completed_by?: string
  priority: 'high' | 'medium' | 'low'
  related_project_id?: string
  related_program_id?: string
  created_at: string
  updated_at: string
}

export interface ReviewCompliance {
  schedule_id: string
  program_id: string
  review_type: string
  frequency: string
  total_reviews_held: number
  on_time_reviews: number
  completed_reviews: number
  last_review_date?: string
  next_review_due_date?: string
  compliance_status: 'overdue' | 'on-track' | 'no-reviews'
}

// Project Context Items Types
export interface ProjectContextItem {
  id: string
  project_id: string
  type: 'reference_document' | 'url' | 'custom_text' | 'jira_page' | 'confluence_page'
  title: string
  content: string
  source_url?: string
  original_filename?: string
  file_type?: string
  integration_type?: string
  integration_page_id?: string
  metadata?: any
  is_active: boolean
  priority: number
  created_by?: string
  created_at: string
  updated_at: string
}

export interface IntegrationPage {
  id: string
  title: string
  url: string
  type: 'jira' | 'confluence'
  lastModified?: string
  spaceKey?: string
  projectKey?: string
  summary?: string
}

export interface ContextRecommendation {
  id: string
  type: 'template' | 'standard' | 'portfolio_standard' | 'missing_context'
  title: string
  message: string
  action: string
  priority: 'high' | 'medium' | 'low'
  metadata?: any
}

export interface TemplateSuggestion {
  suggestedTemplateName: string
  basedOnContextItems: string[]
  estimatedUsage: number
  templateStructure?: any
  action: 'create_template' | 'create_standards_doc' | 'create_portfolio_standard'
  priority: 'high' | 'medium' | 'low'
}

export const apiClient = new ApiClient(API_BASE_URL)
export default apiClient
