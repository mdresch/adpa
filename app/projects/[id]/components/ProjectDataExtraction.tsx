"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Database, Sparkles, CheckCircle, XCircle, Loader2, Info, AlertCircle, Users, FileText, Target, AlertTriangle, Lightbulb, Calendar, DollarSign, Archive, ListOrdered } from "@/components/ui/icons-shim"
import { Code, Users2, GitBranch, Briefcase, TrendingUp, BarChart3, Zap, Shield, Activity } from "lucide-react"
import { apiClient } from "@/lib/api"
import { useRouter } from "next/navigation"

interface ProjectDataExtractionProps {
  projectId: string
  documents: Array<{ id: string; name: string; title?: string }>
}

interface EntityCounts {
  // Legacy entities (PMBOK 7 and earlier)
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
  const [selectedProvider, setSelectedProvider] = useState("google")
  const [selectedModel, setSelectedModel] = useState("gemini-2.0-flash-exp")
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

  useEffect(() => {
    void fetchEntityCounts()
    void fetchAIProviders()
    
    // Initialize with provided documents
    if (documents && documents.length > 0) {
      setAllDocuments(documents)
    }
  }, [projectId, documents])
  
  const fetchAllDocuments = async () => {
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

  const fetchEntityCounts = async () => {
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
          xai: ['grok-beta', 'grok-vision-beta']
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
              xai: 'grok-beta'
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

  const entityTypes = [
    // Legacy entities (PMBOK 7 and earlier)
    { key: 'stakeholders', label: 'Stakeholders', icon: Users, color: 'text-blue-500' },
    { key: 'requirements', label: 'Requirements', icon: FileText, color: 'text-green-500' },
    { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'text-red-500' },
    { key: 'milestones', label: 'Milestones', icon: Target, color: 'text-purple-500' },
    { key: 'constraints', label: 'Constraints', icon: AlertCircle, color: 'text-orange-500' },
    { key: 'successCriteria', label: 'Success Criteria', icon: CheckCircle, color: 'text-teal-500' },
    { key: 'bestPractices', label: 'Best Practices', icon: Lightbulb, color: 'text-yellow-500' },
    { key: 'phases', label: 'Phases', icon: Calendar, color: 'text-indigo-500' },
    { key: 'resources', label: 'Resources', icon: DollarSign, color: 'text-emerald-500' },
    { key: 'technologies', label: 'Technologies', icon: Database, color: 'text-gray-500' },
    { key: 'qualityStandards', label: 'Quality Standards', icon: CheckCircle, color: 'text-cyan-500' },
    { key: 'deliverables', label: 'Deliverables', icon: Archive, color: 'text-pink-500' },
    { key: 'scopeItems', label: 'Scope Items', icon: ListOrdered, color: 'text-violet-500' },
    { key: 'activities', label: 'Activities', icon: Target, color: 'text-lime-500' },
    // PMBOK 8 Performance Domain entities
    { key: 'teamAgreements', label: 'Team Agreements', icon: Users2, color: 'text-blue-600' },
    { key: 'developmentApproaches', label: 'Development Approach', icon: Code, color: 'text-orange-500' },
    { key: 'projectIterations', label: 'Project Iterations', icon: GitBranch, color: 'text-purple-600' },
    { key: 'workItems', label: 'Work Items', icon: Briefcase, color: 'text-slate-600' },
    { key: 'capacityPlans', label: 'Capacity Plans', icon: TrendingUp, color: 'text-green-600' },
    { key: 'performanceMeasurements', label: 'Performance Measurements', icon: BarChart3, color: 'text-indigo-600' },
    { key: 'earnedValueMetrics', label: 'Earned Value Metrics', icon: BarChart3, color: 'text-cyan-600' },
    { key: 'opportunities', label: 'Opportunities', icon: Zap, color: 'text-yellow-600' },
    { key: 'riskResponses', label: 'Risk Responses', icon: Shield, color: 'text-red-600' },
    { key: 'performanceActuals', label: 'Performance Actuals', icon: Activity, color: 'text-emerald-600' }
  ]

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

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {entityTypes.map(({ key, label, icon: Icon, color }) => {
                  const count = entityCounts?.[key as keyof EntityCounts] || 0
                  const isClickable = count > 0
                  
                  return (
                  <div
                    key={key}
                      className={`flex items-center justify-between p-3 border rounded-lg transition-all ${
                        isClickable 
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
                          onCheckedChange={(checked) => {
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
                              onCheckedChange={(checked) => {
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

