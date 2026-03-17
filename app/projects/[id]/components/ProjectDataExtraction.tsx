"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { toast } from '@/lib/notify'
import { Database, Sparkles, CheckCircle, XCircle, Loader2, Info, AlertCircle, Users, FileText, Target, AlertTriangle, Lightbulb, Calendar, DollarSign, Archive, ListOrdered, ChevronDown, ChevronRight, Layers, Gauge, Clock, Play, CheckCircle2, Building2, Ruler, Timer, Wallet, UserCog, ShieldAlert, MessageSquare, Award } from "@/components/ui/icons-shim"
import { Code, Users2, GitBranch, Briefcase, TrendingUp, BarChart3, Zap, Shield, Activity } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"
import { DOMAIN_KPI_KEYS, type DomainKpiDefinition, type PmbokDomain, PMBOK_DOMAINS } from "@/types/pmbok"
import { ENTITY_DOMAIN_WEIGHTS, getEntityWeights, calculateWeightedCount, type EntityDomainWeight, getEntityPhaseWeights, type ProjectPhase, type EntityPhaseWeight } from "@/types/entity-domain-weights"

interface ProjectDataExtractionProps {
  projectId: string
  documents: Array<{ id: string; name: string; title?: string }>
}

interface EntityCounts {
  // Core entities (Legacy/PMBOK 7)
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
  // PMBOK 8 Knowledge Area Domain entities (Tier 2)
  // Governance Domain
  governanceDecisions: number
  approvalWorkflows: number
  steeringCommittees: number
  changeControlBoards: number
  policyCompliance: number
  // Scope Domain
  scopeBaselines: number
  wbsNodes: number
  scopeChangeRequests: number
  requirementsTraceability: number
  scopeVerification: number
  // Schedule Domain
  scheduleBaselines: number
  scheduleActivities: number
  criticalPathActivities: number
  scheduleVariances: number
  scheduleForecasts: number
  // Finance Domain
  budgetBaselines: number
  costActuals: number
  costEstimates: number
  fundingTranches: number
  financialVariances: number
  procurementCosts: number
  // Resources Domain
  resourceAssignments: number
  resourcePool: number
  capacityForecasts: number
  utilizationRecords: number
  resourceConflicts: number
  onboardingOffboarding: number
  // Risk Domain
  riskAssessments: number
  riskResponsePlans: number
  riskTriggers: number
  riskReviews: number
  contingencyReserves: number
  riskMetrics: number
  // Stakeholders Ops Domain
  engagementActions: number
  communicationLogs: number
  satisfactionSurveys: number
  stakeholderIssues: number
  relationshipHealth: number
}

// AI Provider type for selection
type AIProviderType = "" | "google" | "openai" | "azure" | "mistral" | "groq" | "anthropic" | "deepseek" | "moonshot" | "xai" | "copilot" | "ollama"

export function ProjectDataExtraction({ projectId, documents }: ProjectDataExtractionProps) {
  const router = useRouter()
  const [showExtractionDialog, setShowExtractionDialog] = useState(false)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionStatus, setExtractionStatus] = useState<string>("")
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  const [entityCounts, setEntityCounts] = useState<EntityCounts | null>(null)
  const [loading, setLoading] = useState(true)

  // AI Provider selection
  const [aiProviders, setAiProviders] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState<AIProviderType>("ollama")
  const [selectedModel, setSelectedModel] = useState("llama3")
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])

  // WBS Import
  const [isImportingWBS, setIsImportingWBS] = useState(false)
  const [lastExtractedDocumentId, setLastExtractedDocumentId] = useState<string | null>(null)

  // All documents (not paginated) for extraction selection
  const [allDocuments, setAllDocuments] = useState<Array<{ id: string; name: string; title?: string }>>([])
  const [loadingAllDocuments, setLoadingAllDocuments] = useState(false)
  const [documentSearchTerm, setDocumentSearchTerm] = useState("")

  // Entity Details Dialog
  const [showEntityDialog, setShowEntityDialog] = useState(false)
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null)
  const [entityDetails, setEntityDetails] = useState<any[]>([])
  const [loadingEntityDetails, setLoadingEntityDetails] = useState(false)

  // KPI Source Traceability Dialog
  const [showKpiSourceDialog, setShowKpiSourceDialog] = useState(false)
  const [selectedKpi, setSelectedKpi] = useState<{
    kpi: DomainKpiDefinition
    mapping: { entities: string[]; calculationHint: string }
    sourceEntityCounts: Array<{ key: string; label: string; count: number; color: string }>
  } | null>(null)

  useEffect(() => {
    void fetchEntityCounts()
    void fetchAIProviders()

    // Initialize with provided documents
    if (documents && documents.length > 0) {
      setAllDocuments(documents)
    }
  }, [projectId, documents])

  const fetchAllDocuments = async () => {
    if (!projectId || projectId === 'undefined') return
    try {
      setLoadingAllDocuments(true)

      // Use apiClient to get documents (same method as parent component)
      const documentsData = await apiClient.getProjectDocuments(projectId, {
        page: 1,
        limit: 1000
      })

      console.log('[EXTRACTION] Fetched documents:', documentsData)

      const docs = documentsData.documents || documentsData.data || []
      setAllDocuments(docs)

      console.log('[EXTRACTION] Set allDocuments:', docs.length)

    } catch (error) {
      console.error('[EXTRACTION] Failed to fetch all documents:', error)
      // Fallback to provided documents if fetch fails
      console.log('[EXTRACTION] Falling back to provided documents:', documents.length)
      setAllDocuments(documents)
    } finally {
      setLoadingAllDocuments(false)
    }
  }

  // ========================================================================
  // Weighted Entity Allocation Functions
  // ========================================================================

  /**
   * Calculate weighted entity count for a specific domain
   * Distributes entity counts across domains based on weight allocations
   */
  const calculateWeightedDomainCount = (domain: PmbokDomain, counts: EntityCounts | null): number => {
    if (!counts) return 0

    let weightedTotal = 0

    // Iterate through all entity types in entityCounts
    Object.entries(counts).forEach(([entityKey, count]) => {
      if (count === 0) return

      // Get weight allocations for this entity type
      const weights = getEntityWeights(entityKey)

      // Find the weight for this specific domain
      const domainWeight = weights.find(w => w.domain === domain)

      if (domainWeight) {
        // Add weighted count to domain total
        weightedTotal += calculateWeightedCount(count, domainWeight.weight)
      }
    })

    return weightedTotal
  }

  /**
   * Get entity weight info for display (Primary/Secondary badge)
   */
  const getEntityWeightInfo = (entityKey: string, domain: PmbokDomain): {
    weight: number
    isPrimary: boolean
    percentage: number
  } | null => {
    const weights = getEntityWeights(entityKey)
    const domainWeight = weights.find(w => w.domain === domain)

    if (!domainWeight) return null

    return {
      weight: domainWeight.weight,
      isPrimary: domainWeight.isPrimary,
      percentage: Math.round(domainWeight.weight * 100)
    }
  }

  /**
   * Calculate total extracted entities (for validation)
   */
  const calculateTotalExtractedEntities = (counts: EntityCounts | null): number => {
    if (!counts) return 0
    return Object.values(counts).reduce((sum, count) => sum + count, 0)
  }

  /**
   * Validate weighted allocations match extracted total
   */
  const validateWeightedAllocations = (counts: EntityCounts | null): {
    isValid: boolean
    totalExtracted: number
    totalWeighted: number
    difference: number
  } => {
    if (!counts) {
      return { isValid: true, totalExtracted: 0, totalWeighted: 0, difference: 0 }
    }

    const totalExtracted = calculateTotalExtractedEntities(counts)

    // Calculate total weighted across all domains
    const allDomains: PmbokDomain[] = [
      ...PMBOK_DOMAINS
    ]

    let totalWeighted = 0
    allDomains.forEach(domain => {
      totalWeighted += calculateWeightedDomainCount(domain, counts)
    })

    const difference = totalExtracted - totalWeighted
    const isValid = Math.abs(difference) < 0.01 // Allow tiny rounding error

    return { isValid, totalExtracted, totalWeighted, difference }
  }

  /**
   * Calculate weighted entity count for a specific project phase
   */
  const calculateWeightedPhaseCount = (phase: ProjectPhase, counts: EntityCounts | null): number => {
    if (!counts) return 0

    let weightedTotal = 0

    // Iterate through all entity types
    Object.entries(counts).forEach(([entityKey, count]) => {
      if (count === 0) return

      // Get phase weight allocations for this entity type
      const weights = getEntityPhaseWeights(entityKey)

      // Find the weight for this specific phase
      const phaseWeight = weights.find(w => w.phase === phase)

      if (phaseWeight) {
        // Add weighted count to phase total
        weightedTotal += calculateWeightedCount(count, phaseWeight.weight)
      }
    })

    return weightedTotal
  }

  /**
   * Get entity phase weight info for display
   */
  const getEntityPhaseWeightInfo = (entityKey: string, phase: ProjectPhase): {
    weight: number
    isPrimary: boolean
    percentage: number
  } | null => {
    const weights = getEntityPhaseWeights(entityKey)
    const phaseWeight = weights.find(w => w.phase === phase)

    if (!phaseWeight) return null

    return {
      weight: phaseWeight.weight,
      isPrimary: phaseWeight.isPrimary,
      percentage: Math.round(phaseWeight.weight * 100)
    }
  }

  /**
   * Validate phase weighted allocations match extracted total
   */
  const validatePhaseWeightedAllocations = (counts: EntityCounts | null): {
    isValid: boolean
    totalExtracted: number
    totalWeighted: number
    difference: number
  } => {
    if (!counts) {
      return { isValid: true, totalExtracted: 0, totalWeighted: 0, difference: 0 }
    }

    const totalExtracted = calculateTotalExtractedEntities(counts)

    // Calculate total weighted across all project phases
    const allPhases: ProjectPhase[] = [
      'initiating',
      'planning',
      'executing',
      'monitoring_controlling',
      'closing'
    ]

    let totalWeighted = 0
    allPhases.forEach(phase => {
      totalWeighted += calculateWeightedPhaseCount(phase, counts)
    })

    const difference = totalExtracted - totalWeighted
    const isValid = Math.abs(difference) < 0.01

    return { isValid, totalExtracted, totalWeighted, difference }
  }

  const fetchEntityCounts = async () => {
    if (!projectId || projectId === 'undefined') return
    try {
      setLoading(true)
      const { getApiUrl } = await import('@/lib/api-url')
      const response = await fetch(getApiUrl(`/project-data-extraction/results/${projectId}`), {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setEntityCounts(data.entityCounts)
      }
    } catch (error) {
      console.error('Failed to fetch entity counts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAIProviders = async () => {
    try {
      console.log('[EXTRACTION] Fetching AI providers...')
      const providers = await apiClient.getAIProviders()
      console.log('[EXTRACTION] Raw providers response:', providers)
      console.log('[EXTRACTION] Providers count:', providers?.length || 0)
      console.log('[EXTRACTION] First provider object keys:', providers[0] ? Object.keys(providers[0]) : 'No providers')
      console.log('[EXTRACTION] First provider full object:', providers[0])

      if (!providers || providers.length === 0) {
        console.warn('[EXTRACTION] No providers returned from API')
        setAiProviders([])
        return
      }

      const activeProviders = providers.filter((p: any) => p.is_active).map((p: any) => {
        // Helper function to extract model name/id from string or object
        const extractModelName = (model: any): string => {
          if (typeof model === 'string') {
            return model
          }
          if (typeof model === 'object' && model !== null) {
            // Model object has properties like id, name, isDefault, maxTokens, etc.
            return model.name || model.id || model.model || String(model)
          }
          return String(model)
        }

        // Normalize models - check multiple possible locations
        // API returns: configuration.models array OR configuration.model string OR top-level model string
        // Models can be strings or objects with {id, name, isDefault, maxTokens, ...}
        const configModels = (p.configuration?.models || []).map(extractModelName)
        const configModel = p.configuration?.model ? [extractModelName(p.configuration.model)] : []
        const topLevelModel = p.model ? [extractModelName(p.model)] : []
        const topLevelModels = (p.models || []).map(extractModelName)

        // Combine all possible model sources, deduplicate
        const allModels = [...new Set([
          ...configModels,
          ...configModel,
          ...topLevelModel,
          ...topLevelModels
        ])].filter(Boolean)

        // Use 'type' property from API (API returns 'type', not 'provider_type')
        const providerType = p.type || p.provider_type || p.providerType || p.provider || 'unknown'

        console.log(`[EXTRACTION] Provider ${p.name}:`, {
          type: p.type,
          provider_type: p.provider_type,
          configModels: p.configuration?.models,
          configModel: p.configuration?.model,
          topLevelModel: p.model,
          topLevelModels: p.models,
          allModels: allModels,
          modelsLength: allModels.length,
          hasModels: allModels.length > 0
        })

        // If no models found, use backend fallback models (matching server/src/routes/ai-providers.ts)
        const backendFallbackModels: Record<string, string[]> = {
          openai: ['gpt-4o', 'gpt-4-turbo-preview', 'gpt-4', 'gpt-3.5-turbo'],
          google: ['gemini-2.0-flash-exp', 'gemini-2.5-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
          azure: ['gpt-4', 'gpt-35-turbo', 'gpt-4-32k'],
          groq: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama3-70b-8192', 'mixtral-8x7b-32768'],
          mistral: ['mistral-large-latest', 'mistral-small-latest', 'mistral-medium-latest'],
          anthropic: ['claude-sonnet-4.0', 'claude-haiku-4.0', 'claude-opus-4.0', 'claude-3-sonnet'],
          deepseek: ['deepseek-chat', 'deepseek-reasoner', 'deepseek-coder'],
          moonshot: ['kimi-k2-turbo-preview', 'moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
          xai: ['grok-beta', 'grok-vision-beta'],
          ollama: ['llama3', 'llama3.1', 'mistral', 'phi3']
        }

        const finalModels = allModels.length > 0 ? allModels : (backendFallbackModels[providerType] || [])

        return {
          ...p,
          provider_type: providerType, // Normalize to provider_type for component use
          models: finalModels
        }
      })

      console.log('[EXTRACTION] Active providers with normalized models:', activeProviders)
      console.log('[EXTRACTION] Active providers count:', activeProviders.length)

      if (activeProviders.length === 0) {
        console.warn('[EXTRACTION] No active providers found after filtering')
        setAiProviders([])
        return
      }

      setAiProviders(activeProviders)

      // Set default to first active provider WITH MODELS
      const providerWithModels = activeProviders.find(p => p.models && p.models.length > 0)
      if (providerWithModels) {
        console.log('[EXTRACTION] Setting default provider:', providerWithModels.provider_type, 'with models:', providerWithModels.models)

        setSelectedProvider(providerWithModels.provider_type)

        // Validate selected model exists in available models, otherwise use first model
        const currentModel = selectedModel
        const modelExists = providerWithModels.models.includes(currentModel)
        const modelToUse = modelExists ? currentModel : providerWithModels.models[0]

        if (!modelExists && currentModel) {
          console.warn(`[EXTRACTION] Selected model "${currentModel}" not available, using "${modelToUse}" instead`)
        }

        setSelectedModel(modelToUse)

        console.log('[EXTRACTION] Defaults set - Provider:', providerWithModels.provider_type, 'Model:', modelToUse)
      } else {
        console.warn('[EXTRACTION] No providers with models available')
        // Fallback: try to set a default provider even without models
        if (activeProviders.length > 0) {
          const firstProvider = activeProviders[0]
          setSelectedProvider(firstProvider.provider_type)
          // Use first model from provider's models array (which now includes backend fallbacks)
          if (firstProvider.models && firstProvider.models.length > 0) {
            setSelectedModel(firstProvider.models[0])
            console.log('[EXTRACTION] Using first available model:', firstProvider.models[0])
          } else {
            // Last resort: use backend default model mapping
            const defaultModels: Record<string, string> = {
              google: 'gemini-2.0-flash-exp',
              openai: 'gpt-4-turbo-preview',
              mistral: 'mistral-large-latest',
              groq: 'llama-3.3-70b-versatile',
              anthropic: 'claude-3-sonnet',
              deepseek: 'deepseek-chat',
              moonshot: 'moonshot-v1-8k',
              xai: 'grok-beta',
              ollama: 'llama3'
            }
            const defaultModel = defaultModels[firstProvider.provider_type] || ''
            if (defaultModel) {
              setSelectedModel(defaultModel)
              console.log('[EXTRACTION] Using hardcoded fallback default model:', defaultModel)
            }
          }
        }
      }
    } catch (error: any) {
      console.error('[EXTRACTION] Failed to fetch AI providers:', error)
      console.error('[EXTRACTION] Error details:', {
        message: error?.message,
        response: error?.response,
        status: error?.response?.status,
        data: error?.response?.data
      })
      toast.error(`Failed to load AI providers: ${error?.message || 'Unknown error'}. Please check your backend connection.`)
      setAiProviders([])
      setSelectedProvider('')
      setSelectedModel('')
    }
  }

  const handleExtractData = async () => {
    if (!projectId || projectId === 'undefined') {
      toast.error('Invalid project')
      return
    }
    try {
      setIsExtracting(true)
      setExtractionProgress(0)
      setExtractionStatus("Starting extraction...")

      const { getApiUrl } = await import('@/lib/api-url')
      const response = await fetch(getApiUrl('/project-data-extraction/extract'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          projectId,
          aiProvider: selectedProvider,
          aiModel: selectedModel,
          documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[EXTRACTION] API Error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        })

        if (response.status === 403 || response.status === 401) {
          toast.error('Authentication failed. Please logout and login again.')
          throw new Error('Authentication required - please re-login')
        }

        throw new Error(errorData.message || errorData.error || 'Failed to start extraction')
      }

      const data = await response.json()
      setCurrentJobId(data.jobId)
      setExtractionStatus("Extraction job started")
      toast.success("Extraction started! This may take 2-3 minutes...")

      // Poll job status
      pollJobStatus(data.jobId)
    } catch (error) {
      console.error('Extraction failed:', error)
      toast.error('Failed to start extraction')
      setIsExtracting(false)
    }
  }

  const pollJobStatus = async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { getApiUrl } = await import('@/lib/api-url')
        const response = await fetch(getApiUrl(`/project-data-extraction/status/${jobId}`), {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          setExtractionProgress(data.progress || 0)
          setExtractionStatus(data.status)

          if (data.status === 'completed') {
            clearInterval(pollInterval)
            setIsExtracting(false)
            setShowExtractionDialog(false)

            // Save document ID for WBS import
            if (selectedDocuments.length > 0) {
              setLastExtractedDocumentId(selectedDocuments[0])
            }

            toast.success(`Extraction complete! ${data.result?.totalEntities || 0} entities extracted.`)

            // Hint about WBS import if activities found
            if (data.result?.entityCounts?.activities > 0) {
              setTimeout(() => {
                toast.info(
                  `💡 Found ${data.result.entityCounts.activities} activities! You can now import them as project tasks.`,
                  { duration: 6000 }
                )
              }, 1500)
            }

            void fetchEntityCounts()
          } else if (data.status === 'failed') {
            clearInterval(pollInterval)
            setIsExtracting(false)
            toast.error('Extraction failed. Please try again.')
          }
        }
      } catch (error) {
        console.error('Failed to poll job status:', error)
      }
    }, 2000) // Poll every 2 seconds

    // Clear interval after 5 minutes (safety)
    setTimeout(() => clearInterval(pollInterval), 300000)
  }

  const fetchEntityDetails = async (entityType: string) => {
    if (!projectId || projectId === 'undefined') return
    try {
      setLoadingEntityDetails(true)
      setSelectedEntityType(entityType)
      setShowEntityDialog(true)

      const { getApiUrl } = await import('@/lib/api-url')
      const apiUrl = getApiUrl(`/project-data-extraction/entities/${projectId}/${entityType}?limit=100`)
      console.log('[ENTITY-DETAILS] Fetching:', apiUrl)

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      console.log('[ENTITY-DETAILS] Response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[ENTITY-DETAILS] Error response:', errorData)
        throw new Error(errorData.error || `Failed to fetch entity details (${response.status})`)
      }

      const data = await response.json()
      console.log('[ENTITY-DETAILS] Response data:', data)
      console.log('[ENTITY-DETAILS] Entities count:', data.entities?.length || 0)

      setEntityDetails(data.entities || [])
    } catch (error) {
      console.error('[ENTITY-DETAILS] Failed to fetch entity details:', error)
      toast.error('Failed to load entity details')
      setEntityDetails([])
    } finally {
      setLoadingEntityDetails(false)
    }
  }

  const handleImportWBS = async () => {
    if (!projectId || projectId === 'undefined') {
      toast.error('Invalid project')
      return
    }
    try {
      setIsImportingWBS(true)

      const { getApiUrl } = await import('@/lib/api-url')
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')

      // Import from extracted entities (project-level) instead of requiring specific document
      const response = await fetch(getApiUrl('/tasks/import-wbs'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          // Use project-level entities if no specific document
          useProjectEntities: true,
          options: {
            autoMatchRoles: true,
            importDependencies: true,
            createHierarchy: true
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to import WBS')
      }

      const result = await response.json()
      const data = result.data

      toast.success(
        `WBS Import Complete! Created ${data.tasksCreated} tasks (${data.totalEstimatedHours} hours estimated)`,
        { duration: 5000 }
      )

      // Show detailed result
      if (data.tasksNeedingRoleAssignment > 0) {
        toast.info(
          `${data.tasksNeedingRoleAssignment} tasks need role assignment`,
          { duration: 4000 }
        )
      }

    } catch (error: any) {
      console.error('WBS import failed:', error)
      toast.error(error.message || 'Failed to import WBS')
    } finally {
      setIsImportingWBS(false)
    }
  }

  const getTotalEntities = () => {
    if (!entityCounts) return 0
    return Object.values(entityCounts).reduce((sum, count) => sum + count, 0)
  }

  const getFilteredDocuments = () => {
    if (!documentSearchTerm) return allDocuments

    const searchLower = documentSearchTerm.toLowerCase()
    return allDocuments.filter(doc =>
      (doc.title || doc.name).toLowerCase().includes(searchLower)
    )
  }

  const renderEntityField = (key: string, value: any, entity?: any): React.ReactNode => {
    if (value === null || value === undefined) return <span className="text-muted-foreground italic">-</span>
    if (typeof value === 'boolean') return value ? <span className="text-green-600">Yes</span> : <span className="text-red-600">No</span>

    // Special handling for source_document_id - show clickable link
    if (key === 'source_document_id' && value) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}/documents/${value}/view`)}
            className="h-7 text-xs"
          >
            <FileText className="h-3 w-3 mr-1" />
            View Source Document
          </Button>
        </div>
      )
    }

    // Handle arrays (including JSONB arrays from PostgreSQL)
    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">None</span>
      }
      // Special handling for tailoring_decisions array
      if (key === 'tailoring_decisions' && value.length > 0 && typeof value[0] === 'object') {
        return (
          <div className="space-y-2">
            {value.map((decision: any, idx: number) => (
              <div key={idx} className="border-l-2 border-primary pl-3 py-1">
                <div className="font-medium text-foreground">{decision.area || `Decision ${idx + 1}`}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  <div><strong>Standard:</strong> {decision.standard_process || '-'}</div>
                  <div><strong>Tailored:</strong> {decision.tailored_process || '-'}</div>
                  {decision.justification && (
                    <div className="mt-1 italic">{decision.justification}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      }
      // Regular arrays - display as bullet list
      return (
        <ul className="list-disc list-inside space-y-1">
          {value.map((item: any, idx: number) => (
            <li key={idx} className="text-foreground">
              {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
            </li>
          ))}
        </ul>
      )
    }

    // Handle objects (non-arrays)
    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    // Handle dates (exclude user ID fields that contain "date" in their name)
    if ((key.includes('date') || key.includes('Date')) &&
      !key.includes('updated_by') &&
      !key.includes('created_by') &&
      !key.includes('updatedBy') &&
      !key.includes('createdBy')) {
      try {
        return new Date(value).toLocaleDateString()
      } catch {
        return String(value)
      }
    }

    // Handle long text (like justification)
    if (key === 'justification' && typeof value === 'string' && value.length > 200) {
      return (
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap text-foreground">{value}</div>
        </div>
      )
    }

    return <span className="text-foreground">{String(value)}</span>
  }

  const getEntityTypeLabel = (entityType: string): string => {
    return entityTypes.find(et => et.key === entityType)?.label || entityType
  }

  const hasData = getTotalEntities() > 0

  // =========================================================================
  // PMBOK 8 Domain Configuration - Two-Tier Model
  // =========================================================================

  // Entity type definitions with icons
  const entityTypeConfig: Record<string, { label: string; icon: any; color: string }> = {
    // Core entities (Legacy/PMBOK 7)
    stakeholders: { label: 'Stakeholders', icon: Users, color: 'text-blue-500' },
    requirements: { label: 'Requirements', icon: FileText, color: 'text-green-500' },
    risks: { label: 'Risks', icon: AlertTriangle, color: 'text-red-500' },
    milestones: { label: 'Milestones', icon: Target, color: 'text-purple-500' },
    constraints: { label: 'Constraints', icon: AlertCircle, color: 'text-orange-500' },
    successCriteria: { label: 'Success Criteria', icon: CheckCircle, color: 'text-teal-500' },
    bestPractices: { label: 'Best Practices', icon: Lightbulb, color: 'text-yellow-500' },
    phases: { label: 'Phases', icon: Calendar, color: 'text-indigo-500' },
    resources: { label: 'Resources', icon: DollarSign, color: 'text-emerald-500' },
    technologies: { label: 'Technologies', icon: Database, color: 'text-gray-500' },
    qualityStandards: { label: 'Quality Standards', icon: CheckCircle, color: 'text-cyan-500' },
    complianceSecurity: { label: 'Compliance & Security', icon: Shield, color: 'text-amber-500' },
    deliverables: { label: 'Deliverables', icon: Archive, color: 'text-pink-500' },
    scopeItems: { label: 'Scope Items', icon: ListOrdered, color: 'text-violet-500' },
    activities: { label: 'Activities', icon: Target, color: 'text-lime-500' },
    // PMBOK 8 Performance Domain entities
    teamAgreements: { label: 'Team Agreements', icon: Users2, color: 'text-blue-600' },
    developmentApproaches: { label: 'Development Approach', icon: Code, color: 'text-orange-500' },
    projectIterations: { label: 'Project Iterations', icon: GitBranch, color: 'text-purple-600' },
    workItems: { label: 'Work Items', icon: Briefcase, color: 'text-slate-600' },
    capacityPlans: { label: 'Capacity Plans', icon: TrendingUp, color: 'text-green-600' },
    performanceMeasurements: { label: 'Performance Measurements', icon: BarChart3, color: 'text-indigo-600' },
    earnedValueMetrics: { label: 'Earned Value Metrics', icon: BarChart3, color: 'text-cyan-600' },
    opportunities: { label: 'Opportunities', icon: Zap, color: 'text-yellow-600' },
    riskResponses: { label: 'Risk Responses', icon: Shield, color: 'text-red-600' },
    performanceActuals: { label: 'Performance Actuals', icon: Activity, color: 'text-emerald-600' },
    // PMBOK 8 Knowledge Area Domain entities (Tier 2)
    // Governance Domain
    governanceDecisions: { label: 'Governance Decisions', icon: Building2, color: 'text-amber-600' },
    approvalWorkflows: { label: 'Approval Workflows', icon: CheckCircle2, color: 'text-amber-500' },
    steeringCommittees: { label: 'Steering Committees', icon: Users2, color: 'text-amber-600' },
    changeControlBoards: { label: 'Change Control Boards', icon: Shield, color: 'text-amber-500' },
    policyCompliance: { label: 'Policy Compliance', icon: Award, color: 'text-amber-600' },
    // Scope Domain
    scopeBaselines: { label: 'Scope Baselines', icon: Ruler, color: 'text-violet-600' },
    wbsNodes: { label: 'WBS Nodes', icon: GitBranch, color: 'text-violet-500' },
    scopeChangeRequests: { label: 'Scope Change Requests', icon: FileText, color: 'text-violet-600' },
    requirementsTraceability: { label: 'Requirements Traceability', icon: ListOrdered, color: 'text-violet-500' },
    scopeVerification: { label: 'Scope Verification', icon: CheckCircle, color: 'text-violet-600' },
    // Schedule Domain
    scheduleBaselines: { label: 'Schedule Baselines', icon: Timer, color: 'text-green-600' },
    scheduleActivities: { label: 'Schedule Activities', icon: Calendar, color: 'text-green-500' },
    criticalPathActivities: { label: 'Critical Path', icon: AlertCircle, color: 'text-green-600' },
    scheduleVariances: { label: 'Schedule Variances', icon: TrendingUp, color: 'text-green-500' },
    scheduleForecasts: { label: 'Schedule Forecasts', icon: Clock, color: 'text-green-600' },
    // Finance Domain
    budgetBaselines: { label: 'Budget Baselines', icon: Wallet, color: 'text-emerald-600' },
    costActuals: { label: 'Cost Actuals', icon: DollarSign, color: 'text-emerald-500' },
    costEstimates: { label: 'Cost Estimates', icon: BarChart3, color: 'text-emerald-600' },
    fundingTranches: { label: 'Funding Tranches', icon: Layers, color: 'text-emerald-500' },
    financialVariances: { label: 'Financial Variances', icon: TrendingUp, color: 'text-emerald-600' },
    procurementCosts: { label: 'Procurement Costs', icon: DollarSign, color: 'text-emerald-500' },
    // Resources Domain
    resourceAssignments: { label: 'Resource Assignments', icon: UserCog, color: 'text-teal-600' },
    resourcePool: { label: 'Resource Pool', icon: Users, color: 'text-teal-500' },
    capacityForecasts: { label: 'Capacity Forecasts', icon: TrendingUp, color: 'text-teal-600' },
    utilizationRecords: { label: 'Utilization Records', icon: BarChart3, color: 'text-teal-500' },
    resourceConflicts: { label: 'Resource Conflicts', icon: AlertTriangle, color: 'text-teal-600' },
    onboardingOffboarding: { label: 'Onboarding/Offboarding', icon: Users2, color: 'text-teal-500' },
    // Risk Domain
    riskAssessments: { label: 'Risk Assessments', icon: ShieldAlert, color: 'text-rose-600' },
    riskResponsePlans: { label: 'Risk Response Plans', icon: Shield, color: 'text-rose-500' },
    riskTriggers: { label: 'Risk Triggers', icon: Zap, color: 'text-rose-600' },
    riskReviews: { label: 'Risk Reviews', icon: FileText, color: 'text-rose-500' },
    contingencyReserves: { label: 'Contingency Reserves', icon: DollarSign, color: 'text-rose-600' },
    riskMetrics: { label: 'Risk Metrics', icon: BarChart3, color: 'text-rose-500' },
    // Stakeholders Ops Domain
    engagementActions: { label: 'Engagement Actions', icon: MessageSquare, color: 'text-sky-600' },
    communicationLogs: { label: 'Communication Logs', icon: FileText, color: 'text-sky-500' },
    satisfactionSurveys: { label: 'Satisfaction Surveys', icon: Award, color: 'text-sky-600' },
    stakeholderIssues: { label: 'Stakeholder Issues', icon: AlertCircle, color: 'text-sky-500' },
    relationshipHealth: { label: 'Relationship Health', icon: Activity, color: 'text-sky-600' },
  }

  // Performance Domains (Tier 1) - PMBOK 8
  const performanceDomains: Array<{
    key: string
    pmbokDomain: PmbokDomain
    name: string
    description: string
    icon: any
    color: string
    entities: string[]
  }> = [
      {
        key: 'stakeholders_domain',
        pmbokDomain: 'stakeholders',
        name: 'Stakeholders',
        description: 'Stakeholder identification, engagement, and communication',
        icon: Users,
        color: 'bg-blue-500',
        entities: ['stakeholders']
      },
      {
        key: 'team_domain',
        pmbokDomain: 'team',
        name: 'Team',
        description: 'Team composition, skills, dynamics, and agreements',
        icon: Users2,
        color: 'bg-indigo-500',
        entities: ['teamAgreements', 'resources']
      },
      {
        key: 'development_approach_domain',
        pmbokDomain: 'development_approach',
        name: 'Development Approach',
        description: 'Methodology, iterations, and quality gates',
        icon: Code,
        color: 'bg-orange-500',
        entities: ['developmentApproaches', 'projectIterations', 'phases']
      },
      {
        key: 'planning_domain',
        pmbokDomain: 'planning',
        name: 'Planning',
        description: 'Milestones, activities, requirements, and constraints',
        icon: Target,
        color: 'bg-purple-500',
        entities: ['milestones', 'activities', 'requirements', 'constraints', 'scopeItems']
      },
      {
        key: 'project_work_domain',
        pmbokDomain: 'project_work',
        name: 'Project Work',
        description: 'Work items, capacity plans, and execution tracking',
        icon: Briefcase,
        color: 'bg-slate-500',
        entities: ['workItems', 'capacityPlans']
      },
      {
        key: 'delivery_domain',
        pmbokDomain: 'delivery',
        name: 'Delivery',
        description: 'Deliverables, quality standards, and success criteria',
        icon: Archive,
        color: 'bg-pink-500',
        entities: ['deliverables', 'qualityStandards', 'successCriteria']
      },
      {
        key: 'measurement_domain',
        pmbokDomain: 'measurement',
        name: 'Measurement',
        description: 'Performance measurements and earned value metrics',
        icon: BarChart3,
        color: 'bg-cyan-500',
        entities: ['performanceMeasurements', 'earnedValueMetrics', 'performanceActuals']
      },
      {
        key: 'uncertainty_domain',
        pmbokDomain: 'uncertainty',
        name: 'Uncertainty',
        description: 'Risks, opportunities, and risk responses',
        icon: AlertTriangle,
        color: 'bg-red-500',
        entities: ['risks', 'opportunities', 'riskResponses']
      }
    ]

  // Knowledge Domains (Tier 2) - Supplementary
  // Now includes all Knowledge Area Domain entities from the 38 new database tables
  const knowledgeDomains: Array<{
    key: string
    pmbokDomain: PmbokDomain
    name: string
    description: string
    icon: any
    color: string
    entities: string[]
  }> = [
      {
        key: 'governance_domain',
        pmbokDomain: 'governance',
        name: 'Governance',
        description: 'Decision-making, approvals, steering committees, and compliance',
        icon: Building2,
        color: 'bg-amber-600',
        entities: ['governanceDecisions', 'approvalWorkflows', 'steeringCommittees', 'changeControlBoards', 'policyCompliance', 'complianceSecurity', 'developmentApproaches', 'phases', 'milestones', 'teamAgreements']
      },
      {
        key: 'scope_domain',
        pmbokDomain: 'scope',
        name: 'Scope',
        description: 'Scope baseline, WBS, change requests, and requirements traceability',
        icon: Ruler,
        color: 'bg-violet-500',
        entities: ['scopeBaselines', 'wbsNodes', 'scopeChangeRequests', 'requirementsTraceability', 'scopeVerification', 'scopeItems', 'requirements', 'deliverables']
      },
      {
        key: 'schedule_domain',
        pmbokDomain: 'schedule',
        name: 'Schedule',
        description: 'Schedule baseline, critical path, variances, and forecasts',
        icon: Timer,
        color: 'bg-green-600',
        entities: ['scheduleBaselines', 'scheduleActivities', 'criticalPathActivities', 'scheduleVariances', 'scheduleForecasts', 'milestones', 'activities', 'phases']
      },
      {
        key: 'finance_domain',
        pmbokDomain: 'finance',
        name: 'Finance',
        description: 'Budget baseline, cost tracking, funding, and procurement',
        icon: Wallet,
        color: 'bg-emerald-600',
        entities: ['budgetBaselines', 'costActuals', 'costEstimates', 'fundingTranches', 'financialVariances', 'procurementCosts', 'earnedValueMetrics']
      },
      {
        key: 'resources_domain',
        pmbokDomain: 'resources',
        name: 'Resources',
        description: 'Resource allocation, capacity, utilization, and onboarding',
        icon: UserCog,
        color: 'bg-teal-500',
        entities: ['resourceAssignments', 'resourcePool', 'capacityForecasts', 'utilizationRecords', 'resourceConflicts', 'onboardingOffboarding', 'resources', 'capacityPlans', 'teamAgreements']
      },
      {
        key: 'risk_domain',
        pmbokDomain: 'risk',
        name: 'Risk',
        description: 'Risk assessments, response plans, triggers, and reserves',
        icon: ShieldAlert,
        color: 'bg-rose-500',
        entities: ['riskAssessments', 'riskResponsePlans', 'riskTriggers', 'riskReviews', 'contingencyReserves', 'riskMetrics', 'risks', 'riskResponses', 'opportunities']
      },
      {
        key: 'stakeholders_ops_domain',
        pmbokDomain: 'stakeholders_ops',
        name: 'Stakeholders (Ops)',
        description: 'Engagement actions, communications, surveys, and relationship health',
        icon: MessageSquare,
        color: 'bg-sky-500',
        entities: ['engagementActions', 'communicationLogs', 'satisfactionSurveys', 'stakeholderIssues', 'relationshipHealth', 'stakeholders']
      }
    ]

  // Project Phases / Focus Areas
  const projectPhases = [
    {
      key: 'initiating',
      name: 'Initiating',
      description: 'Project authorization and stakeholder identification',
      icon: Play,
      color: 'bg-green-500',
      entities: ['stakeholders', 'risks', 'constraints']
    },
    {
      key: 'planning',
      name: 'Planning',
      description: 'Scope, schedule, and resource planning',
      icon: Target,
      color: 'bg-blue-500',
      entities: ['milestones', 'activities', 'requirements', 'scopeItems', 'resources', 'risks', 'deliverables', 'phases', 'developmentApproaches', 'projectIterations', 'capacityPlans']
    },
    {
      key: 'executing',
      name: 'Executing',
      description: 'Work execution and team management',
      icon: Activity,
      color: 'bg-orange-500',
      entities: ['workItems', 'teamAgreements', 'deliverables', 'qualityStandards']
    },
    {
      key: 'monitoring_controlling',
      name: 'Monitoring & Controlling',
      description: 'Performance tracking and change control',
      icon: Gauge,
      color: 'bg-purple-500',
      entities: ['performanceMeasurements', 'earnedValueMetrics', 'performanceActuals', 'riskResponses', 'successCriteria']
    },
    {
      key: 'closing',
      name: 'Closing',
      description: 'Project completion and lessons learned',
      icon: CheckCircle2,
      color: 'bg-teal-500',
      entities: ['deliverables', 'successCriteria', 'bestPractices']
    }
  ]

  // All entity types (flat list for backward compatibility)
  const entityTypes = Object.entries(entityTypeConfig).map(([key, config]) => ({
    key,
    ...config
  }))

  // KPI to Entity Mapping - defines which entities feed into each KPI
  const kpiEntityMapping: Record<string, { entities: string[]; calculationHint: string }> = {
    // Stakeholders Domain
    'engagement_score': {
      entities: ['stakeholders'],
      calculationHint: 'Average of (interest + influence) / 2 for stakeholders with both values populated'
    },
    'freshness': {
      entities: ['stakeholders'],
      calculationHint: 'Percentage of stakeholders updated within last 30 days'
    },
    // Team Domain
    'skills_coverage': {
      entities: ['teamAgreements', 'resources'],
      calculationHint: 'Required skills matched by team member competencies'
    },
    'velocity_trend': {
      entities: ['projectIterations', 'workItems'],
      calculationHint: 'Slope of story points completed across last 3 iterations'
    },
    // Development Approach Domain
    'iteration_predictability': {
      entities: ['projectIterations', 'workItems'],
      calculationHint: 'Variance between planned vs actual completion per iteration'
    },
    // Planning Domain
    'dependency_coverage': {
      entities: ['milestones', 'activities'],
      calculationHint: 'Percentage of items with upstream/downstream dependencies defined'
    },
    'planning_confidence': {
      entities: ['requirements', 'resources', 'risks', 'milestones'],
      calculationHint: 'Composite: scope clarity + resource readiness + risk mitigation'
    },
    // Project Work Domain
    'blocker_sla': {
      entities: ['workItems'],
      calculationHint: 'Average days to resolve blockers in work items'
    },
    'utilization_alignment': {
      entities: ['capacityPlans', 'resources'],
      calculationHint: 'Variance between planned vs actual utilization'
    },
    // Delivery Domain
    'first_pass_acceptance': {
      entities: ['deliverables', 'qualityStandards'],
      calculationHint: 'Percentage of deliverables accepted without rework'
    },
    'release_success_rate': {
      entities: ['deliverables'],
      calculationHint: 'Ratio of releases completed without rollback'
    },
    // Measurement Domain
    'kpi_on_track_ratio': {
      entities: ['successCriteria', 'performanceMeasurements'],
      calculationHint: 'Percentage of success criteria with on_track status'
    },
    'spi': {
      entities: ['earnedValueMetrics', 'performanceActuals'],
      calculationHint: 'Earned Value / Planned Value from EVM data'
    },
    // Uncertainty Domain
    'risk_response_coverage': {
      entities: ['risks', 'riskResponses'],
      calculationHint: 'Percentage of medium+ risks with active response plans'
    },
    'opportunity_conversion': {
      entities: ['opportunities'],
      calculationHint: 'Ratio of realized vs identified opportunities'
    },
    // Governance Domain (uses new Knowledge Area tables)
    'decision_cycle_time': {
      entities: ['governanceDecisions', 'approvalWorkflows', 'complianceSecurity'],
      calculationHint: 'Average days from decision request to approval'
    },
    'escalation_rate': {
      entities: ['governanceDecisions', 'steeringCommittees', 'complianceSecurity'],
      calculationHint: 'Percentage of decisions escalated beyond initial authority'
    },
    'governance_health_score': {
      entities: ['governanceDecisions', 'policyCompliance', 'changeControlBoards', 'complianceSecurity'],
      calculationHint: 'Composite of compliance status and decision velocity'
    },
    'audit_findings_open': {
      entities: ['policyCompliance', 'complianceSecurity'],
      calculationHint: 'Count of critical audit findings open > 30 days'
    },
    // Scope Domain (uses new Knowledge Area tables)
    'scope_creep_index': {
      entities: ['scopeBaselines', 'scopeChangeRequests', 'scopeItems', 'requirements'],
      calculationHint: 'Unapproved scope additions relative to baseline'
    },
    'requirements_coverage': {
      entities: ['requirementsTraceability', 'requirements', 'deliverables'],
      calculationHint: 'Percentage of requirements linked to deliverables'
    },
    'wbs_completeness': {
      entities: ['wbsNodes', 'scopeItems', 'activities', 'resources'],
      calculationHint: 'WBS nodes with assigned resources and estimates'
    },
    // Schedule Domain (uses new Knowledge Area tables)
    'critical_path_float': {
      entities: ['criticalPathActivities', 'scheduleActivities', 'activities', 'milestones'],
      calculationHint: 'Average float on critical path activities'
    },
    'milestone_hit_rate': {
      entities: ['scheduleBaselines', 'milestones'],
      calculationHint: 'Percentage of milestones completed on/before target'
    },
    'schedule_variance_trend': {
      entities: ['scheduleVariances', 'scheduleForecasts', 'milestones', 'activities', 'performanceActuals'],
      calculationHint: 'Direction of schedule variance over periods'
    },
    // Finance Domain (uses new Knowledge Area tables)
    'cpi': {
      entities: ['budgetBaselines', 'costActuals', 'earnedValueMetrics'],
      calculationHint: 'Earned Value / Actual Cost ratio'
    },
    'budget_utilization': {
      entities: ['budgetBaselines', 'costActuals', 'financialVariances', 'earnedValueMetrics', 'resources'],
      calculationHint: 'Budget consumed relative to timeline progress'
    },
    'vac': {
      entities: ['budgetBaselines', 'costEstimates', 'earnedValueMetrics'],
      calculationHint: 'Budget at Completion minus Estimate at Completion'
    },
    'funding_runway': {
      entities: ['fundingTranches', 'procurementCosts', 'earnedValueMetrics', 'resources'],
      calculationHint: 'Months of runway at current burn rate'
    },
    // Resources Domain (uses new Knowledge Area tables)
    'utilization_rate': {
      entities: ['utilizationRecords', 'resourceAssignments', 'resources', 'capacityPlans'],
      calculationHint: 'Actual hours / available hours ratio'
    },
    'resource_conflict_rate': {
      entities: ['resourceConflicts', 'resourceAssignments', 'resources', 'capacityPlans'],
      calculationHint: 'Percentage of resources with overallocation'
    },
    'skill_match_score': {
      entities: ['resourcePool', 'resourceAssignments', 'resources', 'teamAgreements'],
      calculationHint: 'Assignments where skill level meets requirement'
    },
    'bench_rate': {
      entities: ['resourcePool', 'capacityForecasts', 'resources'],
      calculationHint: 'Percentage of available resources unassigned'
    },
    // Risk Domain (uses new Knowledge Area tables)
    'risk_exposure_index': {
      entities: ['riskAssessments', 'riskMetrics', 'risks'],
      calculationHint: 'Sum of probability × impact for all open risks'
    },
    'response_plan_coverage': {
      entities: ['riskResponsePlans', 'riskResponses', 'risks'],
      calculationHint: 'Medium+ risks with active response plans'
    },
    'risk_velocity': {
      entities: ['riskReviews', 'riskTriggers', 'risks'],
      calculationHint: 'Rate of new risks identified per period'
    },
    'reserve_adequacy': {
      entities: ['contingencyReserves', 'riskMetrics', 'risks', 'earnedValueMetrics'],
      calculationHint: 'Ratio of reserves to current risk exposure'
    },
    // Stakeholders Ops Domain (uses new Knowledge Area tables)
    'communication_compliance': {
      entities: ['communicationLogs', 'engagementActions', 'stakeholders'],
      calculationHint: 'Actual vs planned communications ratio'
    },
    'issue_resolution_time': {
      entities: ['stakeholderIssues', 'stakeholders'],
      calculationHint: 'Average days to resolve stakeholder issues'
    },
    'satisfaction_trend': {
      entities: ['satisfactionSurveys', 'relationshipHealth', 'stakeholders'],
      calculationHint: 'NPS or satisfaction score trend'
    },
    'engagement_action_completion': {
      entities: ['engagementActions', 'stakeholders'],
      calculationHint: 'Planned engagement actions completed'
    }
  }

  // KPI Display Component - only shows KPIs with available source data
  const renderKpiSection = (pmbokDomain: PmbokDomain, domainEntities: string[]) => {
    const kpis = DOMAIN_KPI_KEYS[pmbokDomain] || []
    if (kpis.length === 0) return null

    // Filter KPIs to only those with available entity data
    const calculableKpis = kpis.filter(kpi => {
      const mapping = kpiEntityMapping[kpi.key]
      if (!mapping) return false

      // Check if we have data for at least one required entity
      return mapping.entities.some(entityKey => {
        const count = entityCounts?.[entityKey as keyof EntityCounts] || 0
        return count > 0
      })
    })

    if (calculableKpis.length === 0) {
      return (
        <div className="mt-3 pt-3 border-t border-dashed">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Gauge className="h-3.5 w-3.5" />
            <span className="text-xs italic">
              No KPIs available - extract more entity types to enable KPI calculations
            </span>
          </div>
        </div>
      )
    }

    return (
      <div className="mt-3 pt-3 border-t border-dashed">
        <div className="flex items-center gap-2 mb-2">
          <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Domain KPIs ({calculableKpis.length} calculable)
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {calculableKpis.map((kpi) => {
            const mapping = kpiEntityMapping[kpi.key]
            const sourceEntities = mapping?.entities || []
            const sourceEntityCounts = sourceEntities.map(e => ({
              key: e,
              label: entityTypeConfig[e]?.label || e,
              count: entityCounts?.[e as keyof EntityCounts] || 0
            })).filter(e => e.count > 0)

            const totalSourceCount = sourceEntityCounts.reduce((sum, e) => sum + e.count, 0)

            // Handle KPI click - open source traceability dialog
            const handleKpiClick = () => {
              setSelectedKpi({
                kpi,
                mapping: mapping!,
                sourceEntityCounts
              })
              setShowKpiSourceDialog(true)
            }

            return (
              <div
                key={kpi.key}
                className="p-2 bg-muted/30 rounded-md border border-dashed hover:bg-muted/50 hover:border-primary cursor-pointer transition-all group"
                onClick={handleKpiClick}
                title={`Click to view source dependencies and calculations`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate flex items-center gap-1">
                      {kpi.label}
                      <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                      {mapping?.calculationHint || kpi.description}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 bg-slate-50 dark:bg-slate-900">
                        📊 {totalSourceCount} source entities
                      </Badge>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {kpi.targetDirection === 'higher_is_better' && (
                      <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300 border-green-200">
                        ↑ {kpi.targetValue !== undefined ? `${(kpi.targetValue * 100).toFixed(0)}%` : 'Higher'}
                      </Badge>
                    )}
                    {kpi.targetDirection === 'lower_is_better' && (
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200">
                        ↓ {kpi.targetValue !== undefined ? (kpi.units === 'days' ? `${kpi.targetValue}d` : `${(kpi.targetValue * 100).toFixed(0)}%`) : 'Lower'}
                      </Badge>
                    )}
                    {kpi.targetDirection === 'range' && (
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200">
                        {kpi.minValue !== undefined && kpi.maxValue !== undefined
                          ? `${(kpi.minValue * 100).toFixed(0)}-${(kpi.maxValue * 100).toFixed(0)}%`
                          : 'Range'}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              AI Project Data Extraction
            </CardTitle>
            <CardDescription className="mt-1.5">
              Automatically extract structured entities from your project documents using AI
            </CardDescription>
          </div>
          <Button
            onClick={() => {
              setShowExtractionDialog(true)
              void fetchAllDocuments()
            }}
            disabled={loading || documents.length === 0}
            size="sm"
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            {hasData ? 'Re-extract Data' : 'Extract Data'}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !hasData ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No Extracted Data</p>
              <p className="text-sm">Extract structured entities to power RAG-enhanced document generation</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Total Entities Extracted</span>
                </div>
                <Badge variant="secondary" className="text-lg font-bold">
                  {getTotalEntities()}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                Click on any entity type below to view details
              </p>

              {/* System for Value Delivery */}
              {entityCounts && (
                (entityCounts.successCriteria > 0 || entityCounts.deliverables > 0 || entityCounts.stakeholders > 0)
              ) && (
                  <Card className="border-2 border-dashed border-emerald-500/30 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                        System for Value Delivery
                      </CardTitle>
                      <CardDescription>
                        Creating tangible and intangible value through strategic alignment
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">

                      {/* Value Types - Tangible vs Intangible */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Tangible Value */}
                        <div className="p-3 rounded-lg border-2 border-emerald-300 bg-white dark:bg-emerald-950/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded bg-emerald-100 dark:bg-emerald-900">
                              <Archive className="h-4 w-4 text-emerald-700 dark:text-emerald-300" />
                            </div>
                            <span className="font-semibold text-sm">Tangible Value</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div
                              className="flex items-center justify-between p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                              onClick={() => entityCounts?.deliverables && entityCounts.deliverables > 0 && fetchEntityDetails('deliverables')}
                            >
                              <span>📦 Deliverables</span>
                              <Badge variant="secondary" className="text-[10px]">{entityCounts?.deliverables || 0}</Badge>
                            </div>
                            <div
                              className="flex items-center justify-between p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                              onClick={() => entityCounts?.earnedValueMetrics && entityCounts.earnedValueMetrics > 0 && fetchEntityDetails('earnedValueMetrics')}
                            >
                              <span>💰 Financial Metrics</span>
                              <Badge variant="secondary" className="text-[10px]">{entityCounts?.earnedValueMetrics || 0}</Badge>
                            </div>
                            <div
                              className="flex items-center justify-between p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                              onClick={() => entityCounts?.qualityStandards && entityCounts.qualityStandards > 0 && fetchEntityDetails('qualityStandards')}
                            >
                              <span>✅ Quality Standards</span>
                              <Badge variant="secondary" className="text-[10px]">{entityCounts?.qualityStandards || 0}</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Intangible Value */}
                        <div className="p-3 rounded-lg border-2 border-purple-300 bg-white dark:bg-purple-950/50">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded bg-purple-100 dark:bg-purple-900">
                              <Sparkles className="h-4 w-4 text-purple-700 dark:text-purple-300" />
                            </div>
                            <span className="font-semibold text-sm">Intangible Value</span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div
                              className="flex items-center justify-between p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                              onClick={() => entityCounts?.stakeholders && entityCounts.stakeholders > 0 && fetchEntityDetails('stakeholders')}
                            >
                              <span>👥 Stakeholder Satisfaction</span>
                              <Badge variant="secondary" className="text-[10px]">{entityCounts?.stakeholders || 0}</Badge>
                            </div>
                            <div
                              className="flex items-center justify-between p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                              onClick={() => entityCounts?.bestPractices && entityCounts.bestPractices > 0 && fetchEntityDetails('bestPractices')}
                            >
                              <span>💡 Knowledge & Learning</span>
                              <Badge variant="secondary" className="text-[10px]">{entityCounts?.bestPractices || 0}</Badge>
                            </div>
                            <div
                              className="flex items-center justify-between p-1.5 bg-purple-50 dark:bg-purple-900/30 rounded cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                              onClick={() => entityCounts?.teamAgreements && entityCounts.teamAgreements > 0 && fetchEntityDetails('teamAgreements')}
                            >
                              <span>🤝 Team Capability</span>
                              <Badge variant="secondary" className="text-[10px]">{entityCounts?.teamAgreements || 0}</Badge>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Value Delivery Hierarchy */}
                      <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                          <Layers className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm">Value Delivery Hierarchy</span>
                        </div>
                        <div className="relative pl-4 border-l-2 border-blue-200 dark:border-blue-800 space-y-2">
                          {/* Vision & Mission */}
                          <div className="relative">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">V</span>
                            </div>
                            <div className="ml-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                              <div className="font-medium">Vision & Mission</div>
                              <div className="text-muted-foreground">Strategic direction and purpose</div>
                            </div>
                          </div>

                          {/* Organizational Strategy */}
                          <div className="relative">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">S</span>
                            </div>
                            <div className="ml-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                              <div className="font-medium">Organizational Strategy & Objectives</div>
                              <div className="text-muted-foreground">Business goals alignment</div>
                            </div>
                          </div>

                          {/* Portfolio Management */}
                          <div className="relative">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">P</span>
                            </div>
                            <div
                              className="ml-2 p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded text-xs cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                              onClick={() => entityCounts?.successCriteria && entityCounts.successCriteria > 0 && fetchEntityDetails('successCriteria')}
                            >
                              <div className="font-medium flex items-center justify-between">
                                <span>Portfolio & Strategic Planning</span>
                                <Badge variant="outline" className="text-[9px]">{entityCounts?.successCriteria || 0} criteria</Badge>
                              </div>
                              <div className="text-muted-foreground">Investment prioritization</div>
                            </div>
                          </div>

                          {/* Program & Product Management */}
                          <div className="relative">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">M</span>
                            </div>
                            <div
                              className="ml-2 p-2 bg-violet-50 dark:bg-violet-950/30 rounded text-xs cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/50 transition-colors"
                              onClick={() => entityCounts?.phases && entityCounts.phases > 0 && fetchEntityDetails('phases')}
                            >
                              <div className="font-medium flex items-center justify-between">
                                <span>Programs, Products & Operations</span>
                                <Badge variant="outline" className="text-[9px]">{entityCounts?.phases || 0} phases</Badge>
                              </div>
                              <div className="text-muted-foreground">Coordinated value streams</div>
                            </div>
                          </div>

                          {/* Project Execution */}
                          <div className="relative">
                            <div className="absolute -left-[21px] w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                              <span className="text-white text-[8px] font-bold">X</span>
                            </div>
                            <div
                              className="ml-2 p-2 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                              onClick={() => entityCounts?.deliverables && entityCounts.deliverables > 0 && fetchEntityDetails('deliverables')}
                            >
                              <div className="font-medium flex items-center justify-between">
                                <span>Authorized Projects & Deliverables</span>
                                <Badge variant="outline" className="text-[9px]">{entityCounts?.deliverables || 0} deliverables</Badge>
                              </div>
                              <div className="text-muted-foreground">Value realization</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Value Propositions & Benefits */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Value Propositions */}
                        <div
                          className="p-3 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 cursor-pointer hover:shadow-md transition-all"
                          onClick={() => entityCounts?.requirements && entityCounts.requirements > 0 && fetchEntityDetails('requirements')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-amber-600" />
                            <span className="font-semibold text-sm">Value Propositions</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            What value is promised to stakeholders?
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[9px] bg-amber-100 dark:bg-amber-900">
                              📋 {entityCounts?.requirements || 0} requirements
                            </Badge>
                            <Badge variant="outline" className="text-[9px] bg-amber-100 dark:bg-amber-900">
                              📦 {entityCounts?.scopeItems || 0} scope items
                            </Badge>
                          </div>
                        </div>

                        {/* Benefits Realization */}
                        <div
                          className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-all"
                          onClick={() => entityCounts?.successCriteria && entityCounts.successCriteria > 0 && fetchEntityDetails('successCriteria')}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="font-semibold text-sm">Benefits Realization</span>
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            How is value measured and tracked?
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[9px] bg-green-100 dark:bg-green-900">
                              ✅ {entityCounts?.successCriteria || 0} success criteria
                            </Badge>
                            <Badge variant="outline" className="text-[9px] bg-green-100 dark:bg-green-900">
                              📊 {entityCounts?.performanceMeasurements || 0} measurements
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {/* Assessing Project Success */}
                      <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/30 dark:to-green-950/30 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Award className="h-4 w-4 text-blue-600" />
                          <span className="font-semibold text-sm">Assessing Project Success</span>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div
                            className="p-2 bg-white dark:bg-slate-900 rounded border cursor-pointer hover:border-blue-400 transition-colors"
                            onClick={() => entityCounts?.successCriteria && entityCounts.successCriteria > 0 && fetchEntityDetails('successCriteria')}
                          >
                            <div className="text-lg font-bold text-blue-600">{entityCounts?.successCriteria || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Success Criteria</div>
                          </div>
                          <div
                            className="p-2 bg-white dark:bg-slate-900 rounded border cursor-pointer hover:border-green-400 transition-colors"
                            onClick={() => entityCounts?.performanceMeasurements && entityCounts.performanceMeasurements > 0 && fetchEntityDetails('performanceMeasurements')}
                          >
                            <div className="text-lg font-bold text-green-600">{entityCounts?.performanceMeasurements || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Performance KPIs</div>
                          </div>
                          <div
                            className="p-2 bg-white dark:bg-slate-900 rounded border cursor-pointer hover:border-purple-400 transition-colors"
                            onClick={() => entityCounts?.stakeholders && entityCounts.stakeholders > 0 && fetchEntityDetails('stakeholders')}
                          >
                            <div className="text-lg font-bold text-purple-600">{entityCounts?.stakeholders || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Stakeholders</div>
                          </div>
                          <div
                            className="p-2 bg-white dark:bg-slate-900 rounded border cursor-pointer hover:border-amber-400 transition-colors"
                            onClick={() => entityCounts?.deliverables && entityCounts.deliverables > 0 && fetchEntityDetails('deliverables')}
                          >
                            <div className="text-lg font-bold text-amber-600">{entityCounts?.deliverables || 0}</div>
                            <div className="text-[10px] text-muted-foreground">Deliverables</div>
                          </div>
                        </div>
                      </div>

                      {/* Value Artifacts Summary */}
                      <div className="flex items-center gap-4 pt-2 border-t text-xs text-muted-foreground">
                        <span className="font-medium">Value Artifacts:</span>
                        <div className="flex items-center gap-1">
                          <span>Tangible: {(entityCounts?.deliverables || 0) + (entityCounts?.earnedValueMetrics || 0) + (entityCounts?.qualityStandards || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Intangible: {(entityCounts?.stakeholders || 0) + (entityCounts?.bestPractices || 0) + (entityCounts?.teamAgreements || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>Total: {
                            (entityCounts?.deliverables || 0) +
                            (entityCounts?.earnedValueMetrics || 0) +
                            (entityCounts?.qualityStandards || 0) +
                            (entityCounts?.stakeholders || 0) +
                            (entityCounts?.bestPractices || 0) +
                            (entityCounts?.teamAgreements || 0)
                          }</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Project Lifecycle Methodology Indicator */}
              {entityCounts && (entityCounts.developmentApproaches > 0 || entityCounts.projectIterations > 0) && (
                <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/50 dark:to-blue-900/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <GitBranch className="h-5 w-5 text-primary" />
                      Project Lifecycle Methodology
                    </CardTitle>
                    <CardDescription>
                      Constraint configuration determines the recommended delivery approach
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Iron Triangle Visualization */}
                    <div className="grid grid-cols-3 gap-3">
                      {/* Scope */}
                      <div
                        className="p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all"
                        style={{
                          borderColor: 'rgb(139, 92, 246)',
                          backgroundColor: 'rgba(139, 92, 246, 0.1)'
                        }}
                        onClick={() => entityCounts?.scopeItems && entityCounts.scopeItems > 0 && fetchEntityDetails('scopeItems')}
                      >
                        <div className="text-center">
                          <Ruler className="h-6 w-6 mx-auto text-violet-600 mb-1" />
                          <div className="font-semibold text-sm">Scope</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {entityCounts?.scopeItems || 0} items
                          </div>
                          <Badge
                            variant="outline"
                            className="mt-2 text-[10px] bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
                          >
                            {(entityCounts?.scopeItems || 0) > 0 ? 'Defined' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      {/* Budget/Cost */}
                      <div
                        className="p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all"
                        style={{
                          borderColor: 'rgb(16, 185, 129)',
                          backgroundColor: 'rgba(16, 185, 129, 0.1)'
                        }}
                        onClick={() => entityCounts?.earnedValueMetrics && entityCounts.earnedValueMetrics > 0 && fetchEntityDetails('earnedValueMetrics')}
                      >
                        <div className="text-center">
                          <Wallet className="h-6 w-6 mx-auto text-emerald-600 mb-1" />
                          <div className="font-semibold text-sm">Budget</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {entityCounts?.earnedValueMetrics || 0} metrics
                          </div>
                          <Badge
                            variant="outline"
                            className="mt-2 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                          >
                            {(entityCounts?.earnedValueMetrics || 0) > 0 ? 'Tracked' : 'Pending'}
                          </Badge>
                        </div>
                      </div>

                      {/* Schedule/Time */}
                      <div
                        className="p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all"
                        style={{
                          borderColor: 'rgb(59, 130, 246)',
                          backgroundColor: 'rgba(59, 130, 246, 0.1)'
                        }}
                        onClick={() => entityCounts?.milestones && entityCounts.milestones > 0 && fetchEntityDetails('milestones')}
                      >
                        <div className="text-center">
                          <Timer className="h-6 w-6 mx-auto text-blue-600 mb-1" />
                          <div className="font-semibold text-sm">Schedule</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {entityCounts?.milestones || 0} milestones
                          </div>
                          <Badge
                            variant="outline"
                            className="mt-2 text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {(entityCounts?.milestones || 0) > 0 ? 'Planned' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Methodology Approaches */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                      {/* Predictive Approach */}
                      <div
                        className={`p-3 rounded-lg border text-center transition-all cursor-pointer hover:shadow-md ${entityCounts?.developmentApproaches && entityCounts.developmentApproaches > 0
                            ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30'
                            : 'border-dashed opacity-60'
                          }`}
                        onClick={() => entityCounts?.developmentApproaches && entityCounts.developmentApproaches > 0 && fetchEntityDetails('developmentApproaches')}
                      >
                        <div className="text-2xl mb-1">📋</div>
                        <div className="font-semibold text-sm">Predictive</div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                          Scope Fixed<br />
                          Budget & Schedule Variable
                        </div>
                        <div className="text-[9px] text-orange-600 dark:text-orange-400 mt-2 font-medium">
                          Waterfall / Sequential
                        </div>
                      </div>

                      {/* Adaptive Approach */}
                      <div
                        className={`p-3 rounded-lg border text-center transition-all cursor-pointer hover:shadow-md ${entityCounts?.projectIterations && entityCounts.projectIterations > 0
                            ? 'border-purple-300 bg-purple-50 dark:bg-purple-950/30'
                            : 'border-dashed opacity-60'
                          }`}
                        onClick={() => entityCounts?.projectIterations && entityCounts.projectIterations > 0 && fetchEntityDetails('projectIterations')}
                      >
                        <div className="text-2xl mb-1">🔄</div>
                        <div className="font-semibold text-sm">Adaptive</div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                          Budget & Schedule Fixed<br />
                          Scope Variable
                        </div>
                        <div className="text-[9px] text-purple-600 dark:text-purple-400 mt-2 font-medium">
                          Agile / Iterative
                        </div>
                      </div>

                      {/* Hybrid Approach */}
                      <div
                        className={`p-3 rounded-lg border text-center transition-all cursor-pointer hover:shadow-md ${(entityCounts?.developmentApproaches || 0) > 0 && (entityCounts?.projectIterations || 0) > 0
                            ? 'border-teal-300 bg-teal-50 dark:bg-teal-950/30'
                            : 'border-dashed opacity-60'
                          }`}
                        onClick={() => {
                          if (entityCounts?.developmentApproaches && entityCounts.developmentApproaches > 0) {
                            fetchEntityDetails('developmentApproaches')
                          } else if (entityCounts?.projectIterations && entityCounts.projectIterations > 0) {
                            fetchEntityDetails('projectIterations')
                          }
                        }}
                      >
                        <div className="text-2xl mb-1">⚡</div>
                        <div className="font-semibold text-sm">Hybrid</div>
                        <div className="text-[10px] text-muted-foreground mt-1 leading-tight">
                          Mixed Constraints<br />
                          Tailored Approach
                        </div>
                        <div className="text-[9px] text-teal-600 dark:text-teal-400 mt-2 font-medium">
                          Best of Both
                        </div>
                      </div>
                    </div>

                    {/* Source Data Summary */}
                    <div className="flex items-center gap-4 pt-3 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Code className="h-3.5 w-3.5" />
                        <span>{entityCounts?.developmentApproaches || 0} approaches</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5" />
                        <span>{entityCounts?.projectIterations || 0} iterations</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{entityCounts?.phases || 0} phases</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 text-xs"
                        onClick={() => entityCounts?.developmentApproaches && entityCounts.developmentApproaches > 0 && fetchEntityDetails('developmentApproaches')}
                      >
                        View Details →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* PMBOK 8 Domain Tabs */}
              <Tabs defaultValue="performance" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-auto p-1">
                  <TabsTrigger value="performance" className="text-xs py-2 px-3">
                    <Layers className="h-3.5 w-3.5 mr-1.5" />
                    Performance Domains
                  </TabsTrigger>
                  <TabsTrigger value="knowledge" className="text-xs py-2 px-3">
                    <Database className="h-3.5 w-3.5 mr-1.5" />
                    Knowledge Domains
                  </TabsTrigger>
                  <TabsTrigger value="phases" className="text-xs py-2 px-3">
                    <Clock className="h-3.5 w-3.5 mr-1.5" />
                    Project Phases
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs py-2 px-3">
                    <ListOrdered className="h-3.5 w-3.5 mr-1.5" />
                    All Entities
                  </TabsTrigger>
                </TabsList>

                {/* Performance Domains (Tier 1) */}
                <TabsContent value="performance" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                      Tier 1: Outcome-Focused
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      8 Performance Domains from PMBOK 8
                    </span>
                  </div>
                  {performanceDomains.map((domain) => {
                    // Calculate weighted count for this Performance Domain
                    const weightedCount = calculateWeightedDomainCount(domain.pmbokDomain, entityCounts)
                    const totalExtracted = calculateTotalExtractedEntities(entityCounts)
                    const percentage = totalExtracted > 0 ? (weightedCount / totalExtracted) * 100 : 0
                    const DomainIcon = domain.icon

                    return (
                      <Collapsible key={domain.key} className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${domain.color} text-white`}>
                              <DomainIcon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{domain.name}</div>
                              <div className="text-xs text-muted-foreground">{domain.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={weightedCount > 0 ? "default" : "outline"} className="font-mono">
                              {weightedCount.toFixed(1)} entities
                              {weightedCount > 0 && (
                                <span className="ml-1 text-xs opacity-75">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              )}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [&[data-state=open]>svg]:rotate-180" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t mt-2">
                            {domain.entities.map((entityKey) => {
                              const config = entityTypeConfig[entityKey]
                              if (!config) return null
                              const count = entityCounts?.[entityKey as keyof EntityCounts] || 0
                              const weightInfo = getEntityWeightInfo(entityKey, domain.pmbokDomain)

                              // Skip if entity has no weight allocation for this domain
                              if (!weightInfo || count === 0) return null

                              const weightedCount = calculateWeightedCount(count, weightInfo.weight)
                              const isClickable = count > 0
                              const EntityIcon = config.icon
                              const badgeVariant = weightInfo.isPrimary ? "default" : "secondary"
                              const badgeIcon = weightInfo.isPrimary ? "⭐" : "◆"
                              const badgeLabel = weightInfo.isPrimary ? "Primary" : "Secondary"

                              return (
                                <div
                                  key={entityKey}
                                  className={`flex items-center justify-between p-2 border rounded-md text-sm transition-all ${isClickable
                                      ? 'cursor-pointer hover:bg-muted/50 hover:border-primary'
                                      : 'opacity-50'
                                    }`}
                                  onClick={() => isClickable && fetchEntityDetails(entityKey)}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-base">{badgeIcon}</span>
                                    <EntityIcon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />
                                    <span className="text-xs truncate">{config.label}</span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <Badge variant={badgeVariant} className="text-xs font-mono whitespace-nowrap">
                                      {weightedCount.toFixed(1)}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                      {badgeLabel} {weightInfo.percentage}%
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {/* Domain KPIs */}
                          {renderKpiSection(domain.pmbokDomain, domain.entities)}
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}

                  {/* Performance Domain Weighted Allocation Validation */}
                  {entityCounts && (() => {
                    const validation = validateWeightedAllocations(entityCounts)
                    return (
                      <Card className="mt-4 bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {validation.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="text-sm font-medium">
                                {validation.isValid ? 'PMBOK 8 Performance Domain Coverage Validated' : 'Coverage Warning'}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Total Extracted</div>
                              <div className="text-sm font-mono font-medium">
                                {validation.totalExtracted} entities
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {validation.isValid ? (
                              <span className="text-green-600">
                                ✓ Performance Domain distribution equals total extracted entities ({validation.totalWeighted.toFixed(1)} = {validation.totalExtracted})
                              </span>
                            ) : (
                              <span className="text-orange-600">
                                ⚠️ Allocation mismatch: {Math.abs(validation.difference).toFixed(2)} entity difference
                              </span>
                            )}
                          </div>
                          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <p className="flex items-start gap-2">
                              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              <span>
                                <strong>PMBOK 8 Performance Domains</strong> show outcome-focused entity distribution.
                                Weighted allocation ensures accurate coverage measurement for compliance with PMBOK 8th Edition standards.
                                Primary allocations (⭐) indicate highest outcome relevance.
                              </span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </TabsContent>

                {/* Knowledge Domains (Tier 2) */}
                <TabsContent value="knowledge" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
                      Tier 2: Function-Focused
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      7 Knowledge Area Domains (Supplementary)
                    </span>
                  </div>
                  {knowledgeDomains.map((domain) => {
                    // Calculate weighted count for this domain
                    const weightedCount = calculateWeightedDomainCount(domain.pmbokDomain, entityCounts)
                    const totalExtracted = calculateTotalExtractedEntities(entityCounts)
                    const percentage = totalExtracted > 0 ? (weightedCount / totalExtracted) * 100 : 0
                    const DomainIcon = domain.icon

                    return (
                      <Collapsible key={domain.key} className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${domain.color} text-white`}>
                              <DomainIcon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{domain.name}</div>
                              <div className="text-xs text-muted-foreground">{domain.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={weightedCount > 0 ? "default" : "outline"} className="font-mono">
                              {weightedCount.toFixed(1)} entities
                              {weightedCount > 0 && (
                                <span className="ml-1 text-xs opacity-75">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              )}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t mt-2">
                            {domain.entities.map((entityKey) => {
                              const config = entityTypeConfig[entityKey]
                              if (!config) return null
                              const count = entityCounts?.[entityKey as keyof EntityCounts] || 0
                              const weightInfo = getEntityWeightInfo(entityKey, domain.pmbokDomain)

                              // Skip if entity has no weight allocation for this domain
                              if (!weightInfo || count === 0) return null

                              const weightedCount = calculateWeightedCount(count, weightInfo.weight)
                              const isClickable = count > 0
                              const EntityIcon = config.icon
                              const badgeVariant = weightInfo.isPrimary ? "default" : "secondary"
                              const badgeIcon = weightInfo.isPrimary ? "⭐" : "◆"
                              const badgeLabel = weightInfo.isPrimary ? "Primary" : "Secondary"

                              return (
                                <div
                                  key={entityKey}
                                  className={`flex items-center justify-between p-2 border rounded-md text-sm transition-all ${isClickable
                                      ? 'cursor-pointer hover:bg-muted/50 hover:border-primary'
                                      : 'opacity-50'
                                    }`}
                                  onClick={() => isClickable && fetchEntityDetails(entityKey)}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-base">{badgeIcon}</span>
                                    <EntityIcon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />
                                    <span className="text-xs truncate">{config.label}</span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <Badge variant={badgeVariant} className="text-xs font-mono whitespace-nowrap">
                                      {weightedCount.toFixed(1)}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                      {badgeLabel} {weightInfo.percentage}%
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                          {/* Domain KPIs */}
                          {renderKpiSection(domain.pmbokDomain, domain.entities)}
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}

                  {/* Weighted Allocation Validation */}
                  {entityCounts && (() => {
                    const validation = validateWeightedAllocations(entityCounts)
                    return (
                      <Card className="mt-4 bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {validation.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="text-sm font-medium">
                                {validation.isValid ? 'Allocation Validated' : 'Allocation Warning'}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Total Extracted</div>
                              <div className="text-sm font-mono font-medium">
                                {validation.totalExtracted} entities
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {validation.isValid ? (
                              <span className="text-green-600">
                                ✓ Weighted distribution equals total extracted entities ({validation.totalWeighted.toFixed(1)} = {validation.totalExtracted})
                              </span>
                            ) : (
                              <span className="text-orange-600">
                                ⚠️ Allocation mismatch: {Math.abs(validation.difference).toFixed(2)} entity difference
                              </span>
                            )}
                          </div>
                          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <p className="flex items-start gap-2">
                              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              <span>
                                Entities are distributed across domains based on relevance weights.
                                Primary allocations (⭐) show highest relevance; Secondary allocations (◆) show cross-domain relationships.
                              </span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </TabsContent>

                {/* Project Phases / Focus Areas */}
                <TabsContent value="phases" className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                      Project Lifecycle
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      5 Focus Areas / Project Phases
                    </span>
                  </div>
                  {projectPhases.map((phase) => {
                    // Calculate weighted count for this phase
                    const weightedCount = calculateWeightedPhaseCount(phase.key as ProjectPhase, entityCounts)
                    const totalExtracted = calculateTotalExtractedEntities(entityCounts)
                    const percentage = totalExtracted > 0 ? (weightedCount / totalExtracted) * 100 : 0
                    const PhaseIcon = phase.icon

                    return (
                      <Collapsible key={phase.key} className="border rounded-lg">
                        <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${phase.color} text-white`}>
                              <PhaseIcon className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                              <div className="font-medium">{phase.name}</div>
                              <div className="text-xs text-muted-foreground">{phase.description}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={weightedCount > 0 ? "default" : "outline"} className="font-mono">
                              {weightedCount.toFixed(1)} entities
                              {weightedCount > 0 && (
                                <span className="ml-1 text-xs opacity-75">
                                  ({percentage.toFixed(1)}%)
                                </span>
                              )}
                            </Badge>
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="px-3 pb-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t mt-2">
                            {/* Show ALL entity types with their phase weights, not just phase.entities */}
                            {Object.keys(entityTypeConfig).map((entityKey) => {
                              const config = entityTypeConfig[entityKey]
                              if (!config) return null
                              const count = entityCounts?.[entityKey as keyof EntityCounts] || 0
                              const weightInfo = getEntityPhaseWeightInfo(entityKey, phase.key as ProjectPhase)

                              // Skip if entity has no weight allocation for this phase or count is 0
                              if (!weightInfo || count === 0 || weightInfo.weight === 0) return null

                              const weightedCount = calculateWeightedCount(count, weightInfo.weight)
                              const isClickable = count > 0
                              const EntityIcon = config.icon
                              const badgeVariant = weightInfo.isPrimary ? "default" : "secondary"
                              const badgeIcon = weightInfo.isPrimary ? "⭐" : "◆"
                              const badgeLabel = weightInfo.isPrimary ? "Primary" : "Secondary"

                              return (
                                <div
                                  key={entityKey}
                                  className={`flex items-center justify-between p-2 border rounded-md text-sm transition-all ${isClickable
                                      ? 'cursor-pointer hover:bg-muted/50 hover:border-primary'
                                      : 'opacity-50'
                                    }`}
                                  onClick={() => isClickable && fetchEntityDetails(entityKey)}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="text-base">{badgeIcon}</span>
                                    <EntityIcon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />
                                    <span className="text-xs truncate">{config.label}</span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                    <Badge variant={badgeVariant} className="text-xs font-mono whitespace-nowrap">
                                      {weightedCount.toFixed(1)}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                      {badgeLabel} {weightInfo.percentage}%
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )
                  })}

                  {/* Phase Weighted Allocation Validation */}
                  {entityCounts && (() => {
                    const validation = validatePhaseWeightedAllocations(entityCounts)
                    return (
                      <Card className="mt-4 bg-muted/30">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {validation.isValid ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-orange-600" />
                              )}
                              <span className="text-sm font-medium">
                                {validation.isValid ? 'Phase Allocation Validated' : 'Phase Allocation Warning'}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Total Extracted</div>
                              <div className="text-sm font-mono font-medium">
                                {validation.totalExtracted} entities
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {validation.isValid ? (
                              <span className="text-green-600">
                                ✓ Phase distribution equals total extracted entities ({validation.totalWeighted.toFixed(1)} = {validation.totalExtracted})
                              </span>
                            ) : (
                              <span className="text-orange-600">
                                ⚠️ Phase allocation mismatch: {Math.abs(validation.difference).toFixed(2)} entity difference
                              </span>
                            )}
                          </div>
                          <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                            <p className="flex items-start gap-2">
                              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                              <span>
                                Entities are distributed across project phases based on temporal weights showing WHEN they are active in the project lifecycle.
                                Primary allocations (⭐) show the phase where the entity is most active.
                              </span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })()}
                </TabsContent>

                {/* All Entities (Flat View) */}
                <TabsContent value="all" className="mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {entityTypes.map(({ key, label, icon: Icon, color }) => {
                      const count = entityCounts?.[key as keyof EntityCounts] || 0
                      const isClickable = count > 0

                      return (
                        <div
                          key={key}
                          className={`flex items-center justify-between p-3 border rounded-lg transition-all ${isClickable
                              ? 'cursor-pointer hover:bg-muted/50 hover:border-primary hover:shadow-sm'
                              : 'opacity-50 cursor-not-allowed'
                            }`}
                          onClick={() => isClickable && fetchEntityDetails(key)}
                          role={isClickable ? 'button' : undefined}
                          tabIndex={isClickable ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault()
                              fetchEntityDetails(key)
                            }
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${color}`} />
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          <Badge variant={isClickable ? "default" : "outline"}>
                            {count}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">RAG Integration Active</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    These entities are now available for semantic search in AI document generation, providing richer context and higher quality outputs.
                  </p>
                </div>
              </div>

              {/* WBS Import Button */}
              {entityCounts && (entityCounts.activities > 0 || entityCounts.deliverables > 0) && (
                <div className="flex items-start gap-2 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg">
                  <ListOrdered className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                      Convert WBS to Project Tasks
                    </p>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                      Found {entityCounts.activities} activities and {entityCounts.deliverables} deliverables.
                      Import them as project tasks with estimated hours, roles, and dependencies.
                    </p>
                    <Button
                      onClick={handleImportWBS}
                      disabled={isImportingWBS}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                      size="sm"
                    >
                      {isImportingWBS ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing WBS...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Import WBS to Tasks
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Entity Details Dialog */}
      <Dialog open={showEntityDialog} onOpenChange={setShowEntityDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedEntityType && entityTypes.find(et => et.key === selectedEntityType) && (
                <>
                  {(() => {
                    const EntityIcon = entityTypes.find(et => et.key === selectedEntityType)!.icon
                    return <EntityIcon className="h-5 w-5" />
                  })()}
                  {getEntityTypeLabel(selectedEntityType)} Details
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {entityDetails.length} {getEntityTypeLabel(selectedEntityType || '')} extracted from project documents
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {loadingEntityDetails ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : entityDetails.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Info className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium mb-1">No {getEntityTypeLabel(selectedEntityType || '')} Found</p>
                <p className="text-sm">Try running extraction again with different documents</p>
              </div>
            ) : (
              <div className="space-y-4 pr-2">
                {entityDetails.map((entity, index) => (
                  <Card key={entity.id || index} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {entity.name || entity.title || entity.description?.substring(0, 50) || `${getEntityTypeLabel(selectedEntityType || '')} #${index + 1}`}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(entity)
                        .filter(([key]) => {
                          // Exclude system fields
                          if (['id', 'project_id', 'created_at', 'updated_at', 'extraction_metadata'].includes(key)) {
                            return false
                          }
                          // Skip created_by and updated_by UUIDs if we have name fields
                          if ((key === 'created_by' || key === 'updated_by') &&
                            typeof entity[key] === 'string' &&
                            entity[key].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
                            entity[`${key}_name`]) {
                            return false // Skip UUID if name field exists
                          }
                          return true
                        })
                        .map(([key, value]) => {
                          // Prefer _name fields over UUID fields
                          if ((key === 'created_by_name' || key === 'updated_by_name')) {
                            const baseKey = key.replace('_name', '')
                            // If the UUID field exists, use the name field instead
                            if (entity[baseKey]) {
                              key = baseKey // Display as "created_by" or "updated_by" but show the name
                            }
                          }

                          const isLongContent = key === 'justification' || (Array.isArray(value) && value.length > 0)
                          return (
                            <div key={key} className={isLongContent ? 'space-y-1' : 'grid grid-cols-3 gap-2 text-sm'}>
                              <span className={`font-medium text-muted-foreground capitalize ${isLongContent ? 'block mb-1' : ''}`}>
                                {key.replace(/_/g, ' ')}:
                              </span>
                              <div className={isLongContent ? 'w-full' : 'col-span-2 break-words'}>
                                {renderEntityField(key, value, entity)}
                              </div>
                            </div>
                          )
                        })}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowEntityDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* KPI Source Traceability Dialog */}
      <Dialog open={showKpiSourceDialog} onOpenChange={setShowKpiSourceDialog}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gauge className="h-5 w-5" />
              KPI Source Traceability
            </DialogTitle>
            <DialogDescription>
              View all source entities and understand how this KPI is calculated
            </DialogDescription>
          </DialogHeader>

          {selectedKpi && (
            <div className="flex-1 overflow-y-auto space-y-4">
              {/* KPI Overview */}
              <Card className="border-2 border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedKpi.kpi.label}</CardTitle>
                      <CardDescription className="mt-1">
                        {selectedKpi.kpi.description}
                      </CardDescription>
                    </div>
                    <div>
                      {selectedKpi.kpi.targetDirection === 'higher_is_better' && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          ↑ Target: {selectedKpi.kpi.targetValue !== undefined
                            ? `${(selectedKpi.kpi.targetValue * 100).toFixed(0)}%`
                            : 'Higher is better'}
                        </Badge>
                      )}
                      {selectedKpi.kpi.targetDirection === 'lower_is_better' && (
                        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          ↓ Target: {selectedKpi.kpi.targetValue !== undefined
                            ? (selectedKpi.kpi.units === 'days'
                              ? `${selectedKpi.kpi.targetValue} days`
                              : `${(selectedKpi.kpi.targetValue * 100).toFixed(0)}%`)
                            : 'Lower is better'}
                        </Badge>
                      )}
                      {selectedKpi.kpi.targetDirection === 'range' && (
                        <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          ⟷ Range: {selectedKpi.kpi.minValue !== undefined && selectedKpi.kpi.maxValue !== undefined
                            ? `${(selectedKpi.kpi.minValue * 100).toFixed(0)}% - ${(selectedKpi.kpi.maxValue * 100).toFixed(0)}%`
                            : 'Within range'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
                      <Info className="h-4 w-4" />
                      Calculation Method
                    </div>
                    <p className="text-sm text-foreground">
                      {selectedKpi.mapping.calculationHint}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Source Entities Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">Source Entities ({selectedKpi.sourceEntityCounts.reduce((s, e) => s + e.count, 0)} total)</h3>
                </div>

                <div className="space-y-2">
                  {selectedKpi.sourceEntityCounts.map((source, index) => {
                    const config = entityTypeConfig[source.key]
                    const EntityIcon = config?.icon || Database

                    return (
                      <Card
                        key={source.key}
                        className="cursor-pointer hover:border-primary hover:shadow-sm transition-all"
                        onClick={() => {
                          setShowKpiSourceDialog(false)
                          fetchEntityDetails(source.key)
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg bg-muted`}>
                                <EntityIcon className={`h-5 w-5 ${config?.color || 'text-gray-500'}`} />
                              </div>
                              <div>
                                <div className="font-medium">{source.label}</div>
                                <div className="text-sm text-muted-foreground">
                                  {source.count} {source.count === 1 ? 'entity' : 'entities'} extracted
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{source.count}</Badge>
                              <ChevronRight className="h-5 w-5 text-muted-foreground" />
                            </div>
                          </div>

                          {/* Relationship indicator */}
                          {index < selectedKpi.sourceEntityCounts.length - 1 && (
                            <div className="mt-3 pt-3 border-t border-dashed flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="px-2 py-0.5 bg-muted rounded">Combined with ↓</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Dependency Diagram */}
              <Card className="bg-slate-50 dark:bg-slate-900/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GitBranch className="h-4 w-4" />
                    Dependency Structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="font-mono text-xs bg-background p-3 rounded border overflow-x-auto">
                    <div className="text-primary font-semibold">{selectedKpi.kpi.label}</div>
                    <div className="ml-2 border-l-2 border-muted-foreground/30 pl-2 mt-1">
                      {selectedKpi.sourceEntityCounts.map((source, i) => (
                        <div key={source.key} className="flex items-center gap-2 py-0.5">
                          <span className="text-muted-foreground">├──</span>
                          <span className={entityTypeConfig[source.key]?.color || 'text-gray-500'}>
                            {source.label}
                          </span>
                          <span className="text-muted-foreground">({source.count})</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-dashed text-muted-foreground">
                      └── Formula: {selectedKpi.mapping.calculationHint.split(' ').slice(0, 6).join(' ')}...
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Data Quality Note */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-900 dark:text-amber-100">
                  <p className="font-medium">Data Quality Note</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-1">
                    This KPI is calculated from {selectedKpi.sourceEntityCounts.length} entity type(s).
                    For accurate results, ensure all source entities have complete and up-to-date data.
                    Click on any source entity above to review the underlying data.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-4 border-t pt-4">
            <Button variant="outline" onClick={() => setShowKpiSourceDialog(false)}>
              Close
            </Button>
            {selectedKpi && selectedKpi.sourceEntityCounts.length > 0 && (
              <Button
                onClick={() => {
                  setShowKpiSourceDialog(false)
                  fetchEntityDetails(selectedKpi.sourceEntityCounts[0].key)
                }}
              >
                View Primary Source ({selectedKpi.sourceEntityCounts[0]?.label})
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extraction Dialog */}
      <Dialog open={showExtractionDialog} onOpenChange={setShowExtractionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Extract Project Data with AI
            </DialogTitle>
            <DialogDescription>
              AI will analyze your project documents and extract 24 types of structured entities (14 legacy + 10 PMBOK 8 Performance Domain entities).
            </DialogDescription>
          </DialogHeader>

          {isExtracting ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{extractionStatus}</span>
                  <span className="font-medium">{extractionProgress}%</span>
                </div>
                <Progress value={extractionProgress} className="h-2" />
              </div>
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-900 dark:text-blue-100">
                  This typically takes 2-3 minutes. Please wait...
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI Provider Selection */}
              <div>
                <Label htmlFor="ai-provider">AI Provider {aiProviders.length === 0 && <span className="text-red-500 text-xs">(No providers available)</span>}</Label>
                {aiProviders.length === 0 ? (
                  <div className="mt-1 p-3 border border-red-200 bg-red-50 dark:bg-red-950/20 rounded-md">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      No AI providers configured. Please configure at least one provider in Settings → AI Providers.
                    </p>
                  </div>
                ) : (
                  <select
                    id="ai-provider"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                    value={selectedProvider}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const providerType = e.target.value
                      console.log('[EXTRACTION] Provider changed to:', providerType)

                      const provider = aiProviders.find(p => p.provider_type === providerType)
                      console.log('[EXTRACTION] Found provider:', provider)
                      console.log('[EXTRACTION] Provider models:', provider?.models)

                      setSelectedProvider(providerType)

                      // Auto-select first model for new provider (models already normalized in state)
                      if (provider && provider.models && provider.models.length > 0) {
                        // Check if current model is valid for this provider, otherwise use first
                        const currentModel = selectedModel
                        const modelExists = provider.models.includes(currentModel)
                        const modelToUse = modelExists ? currentModel : provider.models[0]

                        if (!modelExists && currentModel) {
                          console.warn(`[EXTRACTION] Model "${currentModel}" not available for ${providerType}, using "${modelToUse}"`)
                        }

                        console.log('[EXTRACTION] Auto-selecting model:', modelToUse)
                        setSelectedModel(modelToUse)
                      } else {
                        console.warn('[EXTRACTION] No models available for provider:', providerType)
                        setSelectedModel('')
                      }
                    }}
                  >
                    {aiProviders.map((provider) => (
                      <option key={provider.id} value={provider.provider_type}>
                        {provider.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* AI Model Selection */}
              <div>
                <Label htmlFor="ai-model">AI Model {!selectedProvider && <span className="text-amber-500 text-xs">(Select provider first)</span>}</Label>
                <select
                  id="ai-model"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                  value={selectedModel}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    console.log('[EXTRACTION] Model changed to:', e.target.value)
                    setSelectedModel(e.target.value)
                  }}
                  disabled={!selectedProvider}
                >
                  {(() => {
                    const provider = aiProviders.find((p: any) => p.provider_type === selectedProvider)
                    console.log('[EXTRACTION] Rendering models for provider:', selectedProvider, 'models:', provider?.models)

                    if (!selectedProvider) {
                      return <option value="">Select a provider first</option>
                    }

                    if (!provider) {
                      return <option value="">Provider not found</option>
                    }

                    const models = provider.models || []

                    if (models.length === 0) {
                      return <option value="">No models available for {provider.name}</option>
                    }

                    return models.map((model: string) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))
                  })()}
                </select>
                <p className={`text-xs mt-1 ${selectedModel ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'}`}>
                  {selectedModel ? `Selected: ${selectedModel}` : '⚠️ No model selected - extraction cannot start'}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Document Selection (Optional)</Label>
                  {!loadingAllDocuments && allDocuments.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {allDocuments.length} documents available
                    </span>
                  )}
                </div>

                {/* Search Input */}
                {allDocuments.length > 10 && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search documents..."
                      value={documentSearchTerm}
                      onChange={(e) => setDocumentSearchTerm(e.target.value)}
                      className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {documentSearchTerm && (
                      <button
                        onClick={() => setDocumentSearchTerm("")}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                )}

                <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-2">
                  {loadingAllDocuments ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
                      <span className="text-sm text-muted-foreground">Loading all documents...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2 pb-2 border-b sticky top-0 bg-white dark:bg-gray-950">
                        <Checkbox
                          id="select-all"
                          checked={getFilteredDocuments().length > 0 &&
                            getFilteredDocuments().every(d => selectedDocuments.includes(d.id))}
                          onCheckedChange={(checked: boolean) => {
                            if (checked) {
                              // Add all filtered documents to selection
                              const filteredIds = getFilteredDocuments().map(d => d.id)
                              setSelectedDocuments([...new Set([...selectedDocuments, ...filteredIds])])
                            } else {
                              // Remove all filtered documents from selection
                              const filteredIds = getFilteredDocuments().map(d => d.id)
                              setSelectedDocuments(selectedDocuments.filter(id => !filteredIds.includes(id)))
                            }
                          }}
                        />
                        <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                          Select All
                          {documentSearchTerm
                            ? ` (${getFilteredDocuments().length} filtered)`
                            : ` (${allDocuments.length} documents)`
                          }
                        </label>
                      </div>
                      {getFilteredDocuments().length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {documentSearchTerm
                            ? `No documents match "${documentSearchTerm}"`
                            : 'No documents available'
                          }
                        </p>
                      ) : (
                        getFilteredDocuments().map((doc) => (
                          <div key={doc.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={doc.id}
                              checked={selectedDocuments.includes(doc.id)}
                              onCheckedChange={(checked: boolean) => {
                                setSelectedDocuments(
                                  checked
                                    ? [...selectedDocuments, doc.id]
                                    : selectedDocuments.filter((id) => id !== doc.id)
                                )
                              }}
                            />
                            <label htmlFor={doc.id} className="text-sm cursor-pointer flex-1 truncate" title={doc.title || doc.name}>
                              {doc.title || doc.name}
                            </label>
                          </div>
                        ))
                      )}
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to analyze all {allDocuments.length || 0} project documents
                </p>
              </div>

              <div className="space-y-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  What will be extracted:
                </p>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 ml-4 list-disc">
                  <li><strong>Legacy Entities:</strong> Stakeholders, Requirements, Risks, Milestones</li>
                  <li>Constraints, Success Criteria, Best Practices, Phases</li>
                  <li>Resources, Technologies, Quality Standards, Deliverables</li>
                  <li>Scope Items, Activities</li>
                  <li><strong>PMBOK 8 Domains:</strong> Team Agreements, Development Approach</li>
                  <li>Project Iterations, Work Items, Capacity Plans</li>
                  <li>Performance Measurements, Earned Value Metrics</li>
                  <li>Opportunities, Risk Responses, Performance Actuals</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            {!isExtracting && (
              <>
                <Button variant="outline" onClick={() => setShowExtractionDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleExtractData}
                  disabled={!selectedProvider || !selectedModel || isExtracting}
                  title={
                    !selectedProvider
                      ? "Please select an AI provider"
                      : !selectedModel
                        ? "Please select an AI model"
                        : isExtracting
                          ? "Extraction in progress..."
                          : "Start extraction"
                  }
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isExtracting ? "Extracting..." : "Start Extraction"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

