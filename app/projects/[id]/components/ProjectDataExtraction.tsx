"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Database, Sparkles, CheckCircle, XCircle, Loader2, Info, AlertCircle, Users, FileText, Target, AlertTriangle, Lightbulb, Calendar, DollarSign, Archive, ListOrdered } from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"

interface ProjectDataExtractionProps {
  projectId: string
  documents: Array<{ id: string; name: string; title?: string }>
}

interface EntityCounts {
  stakeholders: number
  requirements: number
  risks: number
  milestones: number
  constraints: number
  successCriteria: number
  bestPractices: number
  phases: number
  resources: number
  qualityStandards: number
  deliverables: number
  scopeItems: number
  activities: number
}

export function ProjectDataExtraction({ projectId, documents }: ProjectDataExtractionProps) {
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

  useEffect(() => {
    void fetchEntityCounts()
    void fetchAIProviders()
  }, [projectId])
  
  const fetchAllDocuments = async () => {
    try {
      setLoadingAllDocuments(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/documents?limit=1000`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        setAllDocuments(data.documents || data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch all documents:', error)
      // Fallback to provided documents if fetch fails
      setAllDocuments(documents)
    } finally {
      setLoadingAllDocuments(false)
    }
  }

  const fetchEntityCounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/project-data-extraction/results/${projectId}`, {
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
      const providers = await apiClient.getAIProviders()
      console.log('[EXTRACTION] Raw providers response:', providers)
      console.log('[EXTRACTION] First provider object keys:', providers[0] ? Object.keys(providers[0]) : 'No providers')
      console.log('[EXTRACTION] First provider full object:', providers[0])
      
      const activeProviders = providers.filter((p: any) => p.is_active).map((p: any) => {
        // Normalize models - handle both 'models' array and 'model' string
        const models = p.models || (p.model ? [p.model] : [])
        
        // Use 'type' property (confirmed from logs: ['id', 'name', 'type', 'models', ...])
        const providerType = p.type || p.provider_type || p.providerType || p.provider || 'unknown'
        
        console.log(`[EXTRACTION] Provider ${p.name}:`, {
          type: p.type,
          models: p.models,
          modelsLength: p.models?.length || 0,
          modelsContent: p.models,
          hasModels: !!p.models && p.models.length > 0
        })
        
        return {
          ...p,
          provider_type: providerType, // Normalize to provider_type
          models: models
        }
      })
      
      console.log('[EXTRACTION] Active providers with normalized models:', activeProviders)
      
      setAiProviders(activeProviders)
      
      // Set default to first active provider WITH MODELS
      const providerWithModels = activeProviders.find(p => p.models && p.models.length > 0)
      if (providerWithModels) {
        console.log('[EXTRACTION] Setting default provider:', providerWithModels.provider_type, 'with models:', providerWithModels.models)
        
        setSelectedProvider(providerWithModels.provider_type)
        setSelectedModel(providerWithModels.models[0])
        
        console.log('[EXTRACTION] Defaults set - Provider:', providerWithModels.provider_type, 'Model:', providerWithModels.models[0])
      } else {
        console.warn('[EXTRACTION] No providers with models available')
      }
    } catch (error) {
      console.error('[EXTRACTION] Failed to fetch AI providers:', error)
      toast.error('Failed to load AI providers')
    }
  }

  const handleExtractData = async () => {
    try {
      setIsExtracting(true)
      setExtractionProgress(0)
      setExtractionStatus("Starting extraction...")

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/project-data-extraction/extract`, {
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
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/project-data-extraction/status/${jobId}`, {
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
  
  const handleImportWBS = async () => {
    if (!lastExtractedDocumentId && selectedDocuments.length === 0) {
      toast.error('Please run extraction first or select a document')
      return
    }
    
    const documentId = lastExtractedDocumentId || selectedDocuments[0]
    
    try {
      setIsImportingWBS(true)
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      
      const response = await fetch(`${apiUrl}/tasks/import-wbs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          projectId,
          documentId,
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

  const hasData = getTotalEntities() > 0

  const entityTypes = [
    { key: 'stakeholders', label: 'Stakeholders', icon: Users, color: 'text-blue-500' },
    { key: 'requirements', label: 'Requirements', icon: FileText, color: 'text-green-500' },
    { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'text-red-500' },
    { key: 'milestones', label: 'Milestones', icon: Target, color: 'text-purple-500' },
    { key: 'constraints', label: 'Constraints', icon: AlertCircle, color: 'text-orange-500' },
    { key: 'successCriteria', label: 'Success Criteria', icon: CheckCircle, color: 'text-teal-500' },
    { key: 'bestPractices', label: 'Best Practices', icon: Lightbulb, color: 'text-yellow-500' },
    { key: 'phases', label: 'Phases', icon: Calendar, color: 'text-indigo-500' },
    { key: 'resources', label: 'Resources', icon: DollarSign, color: 'text-emerald-500' },
    { key: 'qualityStandards', label: 'Quality Standards', icon: CheckCircle, color: 'text-cyan-500' },
    { key: 'deliverables', label: 'Deliverables', icon: Archive, color: 'text-pink-500' },
    { key: 'scopeItems', label: 'Scope Items', icon: ListOrdered, color: 'text-violet-500' },
    { key: 'activities', label: 'Activities', icon: Target, color: 'text-lime-500' }
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

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {entityTypes.map(({ key, label, icon: Icon, color }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${color}`} />
                      <span className="text-sm font-medium">{label}</span>
                    </div>
                    <Badge variant="outline">
                      {entityCounts?.[key as keyof EntityCounts] || 0}
                    </Badge>
                  </div>
                ))}
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

      {/* Extraction Dialog */}
      <Dialog open={showExtractionDialog} onOpenChange={setShowExtractionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Extract Project Data with AI
            </DialogTitle>
            <DialogDescription>
              AI will analyze your project documents and extract 13 types of structured entities.
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
                <Label htmlFor="ai-provider">AI Provider</Label>
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
                      console.log('[EXTRACTION] Auto-selecting model:', provider.models[0])
                      setSelectedModel(provider.models[0])
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
              </div>

              {/* AI Model Selection */}
              <div>
                <Label htmlFor="ai-model">AI Model</Label>
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
                    
                    if (!provider) {
                      return <option value="">Select a provider first</option>
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
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedModel ? `Selected: ${selectedModel}` : 'No model selected'}
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
                  <li>Stakeholders, Requirements, Risks, Milestones</li>
                  <li>Constraints, Success Criteria, Best Practices</li>
                  <li>Phases, Resources, Quality Standards</li>
                  <li>Deliverables, Scope Items, Activities</li>
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
                <Button onClick={handleExtractData} disabled={!selectedProvider || !selectedModel}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Start Extraction
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

