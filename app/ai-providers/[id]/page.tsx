"use client"

import React, { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { 
  ArrowLeft, 
  Settings, 
  Zap, 
  Activity, 
  Clock, 
  BarChart3, 
  TestTube,
  ChevronDown,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  AlertCircle
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

interface ProviderDetails {
  id: string
  name: string
  type: string
  is_active: boolean
  models: string[]
  default_model?: string
  configuration: any
  usage_stats?: any
  created_at: string
  updated_at: string
}

interface Model {
  id: string
  name: string
  contextWindow: number
  maxTokens: number
  temperature: number
  topP: number
  frequencyPenalty: number
  presencePenalty: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function AIProviderDetails() {
  const params = useParams()
  const router = useRouter()
  const providerId = params.id as string

  const [provider, setProvider] = useState<ProviderDetails | null>(null)
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false)
  const [editModelDialogOpen, setEditModelDialogOpen] = useState<string | null>(null)
  const [deleteModelDialogOpen, setDeleteModelDialogOpen] = useState<string | null>(null)
  
  // Testing state
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<Array<{
    testName: string
    status: string
    result: any
    timestamp: string
  }>>([])
  
  // Model Discovery state
  const [discovering, setDiscovering] = useState(false)
  const [discoveredModels, setDiscoveredModels] = useState<any[]>([])
  const [selectedModels, setSelectedModels] = useState<string[]>([])
  const [syncingModels, setSyncingModels] = useState(false)
  const [selectedDefaultModel, setSelectedDefaultModel] = useState<string | null>(null)
  
  // Collapsible state
  const [advancedConfigOpen, setAdvancedConfigOpen] = useState(false)
  const [currentConfigOpen, setCurrentConfigOpen] = useState(false)
  
  // Analytics state
  const [analytics, setAnalytics] = useState<{
    period?: string
    modelUsage?: Array<{
      model_name: string
      usage_count: number
      total_tokens: number
      avg_response_time: number
      success_rate: number
    }>
    summary?: {
      totalRequests: number
      totalTokens: number
      avgResponseTime: number
      totalErrors: number
    }
  }>({})
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d")
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  
  // Add model state
  const [addingModel, setAddingModel] = useState(false)
  const [newModelForm, setNewModelForm] = useState<{
    modelId: string
    modelName: string
    is_active: boolean
    contextWindow: number
    maxTokens: number
    temperature: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
    configuration: Record<string, any>
  }>({
    modelId: "",
    modelName: "",
    is_active: true,
    contextWindow: 128000,
    maxTokens: 4096,
    temperature: 0.7,
    topP: 1.0,
    frequencyPenalty: 0.0,
    presencePenalty: 0.0,
    configuration: {}
  })
  
  // Configuration form state
  const [configForm, setConfigForm] = useState<{
    endpoint: string
    apiKey: string
    priority: number
    timeout: number
    // Azure-specific fields
    apiVersion: string
    deployment: string
    modelName: string
    tenantId: string
    clientId: string
    clientSecret: string
    resourceName: string
    region: string
  }>({
    endpoint: "",
    apiKey: "",
    priority: 1,
    timeout: 30,
    // Azure-specific fields
    apiVersion: "2024-04-01-preview",
    deployment: "",
    modelName: "",
    tenantId: "",
    clientId: "",
    clientSecret: "",
    resourceName: "",
    region: ""
  })

  // Initialize API client with token
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !(apiClient as any).token) {
      ;(apiClient as any).setToken(token)
    }
  }, [])

  // Load provider details
  const loadProviderDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const providers = await apiClient.getAIProviders()
      const providerData = providers.find((p: any) => p.id === providerId)
      
      if (!providerData) {
        setError("Provider not found")
        return
      }

      setProvider(providerData)
      
      // Update configuration form state with provider data
      setConfigForm({
        endpoint: providerData.configuration?.endpoint || "",
        apiKey: "", // Never pre-fill API key for security
        priority: providerData.configuration?.priority || 1,
        timeout: providerData.configuration?.timeout || 30,
        // Azure-specific fields
        apiVersion: providerData.configuration?.apiVersion || "2024-04-01-preview",
        deployment: providerData.configuration?.deployment || "",
        modelName: providerData.configuration?.modelName || "",
        tenantId: providerData.configuration?.tenantId || "",
        clientId: providerData.configuration?.clientId || "",
        clientSecret: "", // Never pre-fill client secret for security
        resourceName: providerData.configuration?.resourceName || "",
        region: providerData.configuration?.region || ""
      })
      
      // Load models for this provider
      await loadProviderModels()
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Failed to load provider details")
    } finally {
      setLoading(false)
    }
  }

  // Load models for this provider
  const loadProviderModels = async () => {
    try {
      const response = await apiClient.getProviderModels(providerId)
      setModels(response.models || [])
    } catch (err: any) {
      console.error("Failed to load models:", err)
      setModels([])
    }
  }

  // Load provider analytics
  const loadProviderAnalytics = async (period: string = analyticsPeriod) => {
    setLoadingAnalytics(true)
    try {
      const response = await apiClient.get<any>(`/ai-analytics/providers/${providerId}?period=${period}`)
      if (response.success) {
        setAnalytics({
          period: response.period,
          modelUsage: response.modelUsage,
          summary: response.summary
        })
      }
    } catch (err: any) {
      console.error("Failed to load analytics:", err)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (providerId) {
      loadProviderDetails()
      loadProviderAnalytics()
    }
  }, [providerId])

  // Reload analytics when period changes
  useEffect(() => {
    if (providerId) {
      loadProviderAnalytics(analyticsPeriod)
    }
  }, [analyticsPeriod])

  const handleToggleProvider = async () => {
    if (!provider) return
    
    try {
      const response = await apiClient.request<{
        is_active: boolean
        message?: string
      }>(`/ai/providers/${providerId}/toggle`, {
        method: "POST",
      })
      
      setProvider(prev => prev ? { ...prev, is_active: response.is_active } : null)
      toast.success(response.message || `Provider ${response.is_active ? 'activated' : 'deactivated'}`)
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to toggle provider")
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    try {
      await apiClient.deleteModelConfiguration(providerId, modelId)
      await loadProviderModels()
      setDeleteModelDialogOpen(null)
      toast.success("Model deleted successfully")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to delete model")
    }
  }

  const handleAddModel = async () => {
    if (!newModelForm.modelId || !newModelForm.modelName) {
      toast.error("Model ID and Model Name are required")
      return
    }

    setAddingModel(true)
    try {
      await apiClient.createModelConfiguration(providerId, newModelForm)
      await loadProviderModels()
      setAddModelDialogOpen(false)
      
      // Reset form
      setNewModelForm({
        modelId: "",
        modelName: "",
        is_active: true,
        contextWindow: 128000,
        maxTokens: 4096,
        temperature: 0.7,
        topP: 1.0,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
        configuration: {}
      })
      
      toast.success("Model added successfully")
    } catch (err: any) {
      console.error(err)
      toast.error(err?.message || "Failed to add model")
    } finally {
      setAddingModel(false)
    }
  }

  // Define available connectivity tests for providers
  const connectivityTests = [
    { id: 'endpoint_validation', name: 'Endpoint Validation', description: 'Validate endpoint URL format and security' },
    { id: 'api_connection', name: 'API Connection', description: 'Verify provider API is accessible' },
    { id: 'authentication', name: 'Authentication', description: 'Validate API key and permissions' },
    { id: 'azure_connectivity', name: 'Azure Connectivity', description: 'Validate Azure-specific configuration (Azure providers only)' }
  ]

  // Run a single connectivity test
  const runSingleTest = async (testId: string) => {
    try {
      const response = await apiClient.request(`/ai-models/providers/${providerId}/test-connectivity`, {
        method: 'POST',
        body: JSON.stringify({
          testId: testId
        })
      })
      return response
    } catch (error: any) {
      console.error(`Test ${testId} failed:`, error)
      throw error
    }
  }

  // Run connectivity test suite
  const runConnectivityTests = async () => {
    setTesting(true)
    setTestResults([])
    
    const results = []
    
    for (const test of connectivityTests) {
      try {
        const result = await runSingleTest(test.id)
        results.push({
          testName: test.name,
          status: 'completed',
          result,
          timestamp: new Date().toISOString()
        })
      } catch (error: any) {
        results.push({
          testName: test.name,
          status: 'failed',
          result: { error: error.message },
          timestamp: new Date().toISOString()
        })
      }
    }
    
    setTestResults(results)
    setTesting(false)
    
    const passedTests = results.filter(r => r.status === 'completed' && (r.result as any)?.success).length
    const totalTests = results.length
    
    if (passedTests === totalTests) {
      toast.success(`Connectivity Test completed! ${passedTests}/${totalTests} tests passed`)
    } else {
      toast.error(`Connectivity Test completed with issues. ${passedTests}/${totalTests} tests passed`)
    }
  }

  // Discover available models from provider API
  const discoverModels = async () => {
    setDiscovering(true)
    setDiscoveredModels([])
    try {
      const response = await apiClient.request(`/ai/providers/${providerId}/discover-models`) as {
        discovered_models?: any[];
        current_default?: string;
        provider?: { name?: string };
      }
      setDiscoveredModels(response.discovered_models || [])
      
      // Pre-select all discovered models
      const modelIds = (response.discovered_models || []).map((m: any) => m.id || m.name || m)
      setSelectedModels(modelIds)
      
      // Pre-select current default or first model
      setSelectedDefaultModel(response.current_default || modelIds[0] || null)
      
      toast.success(`Discovered ${response.discovered_models?.length || 0} models from ${response.provider?.name}`)
    } catch (error: any) {
      console.error('Model discovery error:', error)
      toast.error(error.message || 'Failed to discover models')
    } finally {
      setDiscovering(false)
    }
  }
  
  // Sync selected models to database
  const syncModels = async () => {
    if (selectedModels.length === 0) {
      toast.error('Please select at least one model to sync')
      return
    }
    
    if (!selectedDefaultModel) {
      toast.error('Please select a default model')
      return
    }
    
    setSyncingModels(true)
    try {
      const response = await apiClient.request(`/ai/providers/${providerId}/sync-models`, {
        method: 'POST',
        body: JSON.stringify({
          models: selectedModels,
          default_model: selectedDefaultModel
        })
      })
      
      // Reload provider details to get updated models
      await loadProviderDetails()
      
      toast.success(`Models synced successfully! ${selectedModels.length} models saved.`)
      
      // Clear discovery state
      setDiscoveredModels([])
      setSelectedModels([])
      setSelectedDefaultModel(null)
    } catch (error: any) {
      console.error('Model sync error:', error)
      toast.error(error.message || 'Failed to sync models')
    } finally {
      setSyncingModels(false)
    }
  }
  
  // Toggle model selection
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3"></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto">
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                  {error || "Provider Not Found"}
                </h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                  {error || "The requested AI provider could not be found."}
                </p>
                <Button onClick={() => router.push('/ai-providers')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to AI Providers
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => router.push('/ai-providers')}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Providers
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                    {provider.name}
                  </h1>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant={provider.is_active ? "default" : "secondary"}>
                      {provider.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">{provider.type}</Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Models</CardTitle>
                  <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{provider.models?.length || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Available models
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Status</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {provider.is_active ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {provider.is_active ? "Operational" : "Offline"}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Last Used</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold">
                    {provider.usage_stats?.last_used 
                      ? new Date(provider.usage_stats.last_used).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : "Never"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Last API call
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Requests</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {provider.usage_stats?.total_requests?.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total API calls
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Provider Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Provider Information
                </CardTitle>
                <CardDescription>
                  Detailed configuration and connection information for this AI provider
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basic Information</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Provider Name</Label>
                        <div className="text-sm text-muted-foreground mt-1">{provider.name}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Provider Type</Label>
                        <div className="text-sm text-muted-foreground mt-1 capitalize">{provider.type}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Provider ID</Label>
                        <div className="text-sm text-muted-foreground mt-1 font-mono">{provider.id}</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Status</Label>
                        <div className="mt-1">
                          <Badge variant={provider.is_active ? "default" : "secondary"}>
                            {provider.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configuration Details */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Configuration</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">API Key Status</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.type === 'ollama' ? (
                            <Badge variant="outline">Not Required</Badge>
                          ) : (
                            <Badge variant="default">Configured</Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Endpoint</Label>
                        <div className="text-sm text-muted-foreground mt-1 font-mono">
                          {provider.configuration?.endpoint || 'Default API endpoint'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Default Model</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.configuration?.model || provider.configuration?.default_model || 'Not specified'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Priority</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.configuration?.priority || 1}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Usage & Timestamps */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Usage & Timestamps</h4>
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Total Requests</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.usage_stats?.total_requests || 0}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Total Tokens</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.usage_stats?.total_tokens || 0}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Created</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Last Updated</Label>
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.updated_at ? new Date(provider.updated_at).toLocaleDateString() : 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Advanced Configuration */}
                {provider.configuration && Object.keys(provider.configuration).length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <Collapsible open={advancedConfigOpen} onOpenChange={setAdvancedConfigOpen}>
                      <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronDown className={`h-4 w-4 transition-transform ${advancedConfigOpen ? 'rotate-180' : ''}`} />
                        <span className="font-medium uppercase tracking-wide">Raw Configuration</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-xs text-muted-foreground overflow-x-auto">
                            {JSON.stringify(provider.configuration, null, 2)}
                          </pre>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="models" className="space-y-4">
              <TabsList>
                <TabsTrigger value="models">Models</TabsTrigger>
                <TabsTrigger value="configuration">Configuration</TabsTrigger>
                <TabsTrigger value="testing">Testing</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
                <TabsTrigger value="discover">Model Discovery</TabsTrigger>
              </TabsList>

              <TabsContent value="models" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Available Models</h3>
                  <Button onClick={() => router.push(`#discover`)}>
                    <Zap className="h-4 w-4 mr-2" />
                    Discover More Models
                  </Button>
                </div>

                {/* Show provider.models (from available_models column) */}
                {provider?.models && provider.models.length > 0 ? (
                  <div className="space-y-4">
                    {/* Default Model Card */}
                    <Card className="border-2 border-primary">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{provider.default_model || provider.models[0]}</CardTitle>
                            <Badge variant="default">Default</Badge>
                          </div>
                          <CheckCircle className="h-5 w-5 text-primary" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          This is the default model used when no specific model is requested.
                        </p>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm"
                            onClick={() => router.push(`/ai-providers/${providerId}/model/${encodeURIComponent(provider.default_model || provider.models[0])}`)}
                          >
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Other Models */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {provider.models
                        .filter(modelId => modelId !== provider.default_model)
                        .map((modelId) => (
                          <Card key={modelId}>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-lg font-mono">{modelId}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-xs text-muted-foreground mb-4">
                                Available for use with {provider.name}
                              </p>
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => router.push(`/ai-providers/${providerId}/model/${encodeURIComponent(modelId)}`)}
                                >
                                  View Details
                                </Button>
                                <Button 
                                  size="sm"
                                  variant="destructive"
                                  onClick={async (e: React.MouseEvent) => {
                                    e.stopPropagation()
                                    if (confirm(`Are you sure you want to remove "${modelId}" from available models?`)) {
                                      try {
                                        // Remove model from available_models array
                                        const updatedModels = provider.models.filter(m => m !== modelId)
                                        
                                        await apiClient.request(`/context-ai/providers/${providerId}/configure`, {
                                          method: 'POST',
                                          body: JSON.stringify({
                                            configuration: {
                                              ...provider.configuration,
                                              available_models: updatedModels
                                            }
                                          })
                                        })
                                        
                                        toast.success(`Model "${modelId}" removed successfully`)
                                        await loadProviderDetails()
                                      } catch (error: any) {
                                        console.error('Failed to remove model:', error)
                                        toast.error(error?.message || 'Failed to remove model')
                                      }
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Models Configured</h3>
                    <p className="text-muted-foreground mb-4">
                      Use Model Discovery to find and sync available models from {provider?.name}.
                    </p>
                    <Button onClick={() => {
                      const tabs = document.querySelector('[role="tablist"]')
                      const discoverTab = Array.from(tabs?.querySelectorAll('[role="tab"]') || [])
                        .find(tab => tab.textContent?.includes('Model Discovery'))
                      if (discoverTab instanceof HTMLElement) {
                        discoverTab.click()
                      }
                    }}>
                      <Zap className="h-4 w-4 mr-2" />
                      Go to Model Discovery
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="configuration" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Provider Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure API credentials, endpoints, and authentication settings for this AI provider.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Basic Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Basic Configuration</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="provider-name">Provider Name</Label>
                            <Input
                              id="provider-name"
                              value={provider.name}
                              disabled
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Provider name cannot be changed</p>
                          </div>
                          <div>
                            <Label htmlFor="provider-type">Provider Type</Label>
                            <Input
                              id="provider-type"
                              value={provider.type}
                              disabled
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">Provider type cannot be changed</p>
                          </div>
                        </div>
                      </div>

                      {/* API Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">API Configuration</h4>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="api-endpoint">API Endpoint</Label>
                            <Input
                              id="api-endpoint"
                              placeholder="https://api.openai.com/v1"
                              value={configForm.endpoint}
                              onChange={(e) => setConfigForm(prev => ({ ...prev, endpoint: e.target.value }))}
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              The base URL for the AI provider's API
                            </p>
                          </div>
                          
                          {provider.type !== 'ollama' && (
                            <div>
                              <Label htmlFor="api-key">API Key</Label>
                              <Input
                                id="api-key"
                                type="password"
                                placeholder="Enter your API key"
                                value={configForm.apiKey}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, apiKey: e.target.value }))}
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                🔒 API key will be encrypted and stored securely. Leave blank to keep existing key.
                              </p>
                            </div>
                          )}
                          
                          {provider.type === 'ollama' && (
                            <div>
                              <Label htmlFor="api-key">API Key</Label>
                              <Input
                                id="api-key"
                                disabled
                                placeholder="Not required for local Ollama"
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                🏠 Local Ollama doesn't require an API key - it runs locally on your machine.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Azure AI Specific Configuration */}
                      {provider.type === 'azure' && (
                        <div className="space-y-4">
                          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Azure AI Configuration</h4>
                          
                          {/* Azure OpenAI Client Configuration */}
                          <div className="space-y-4">
                            <h5 className="font-medium text-sm text-blue-600 dark:text-blue-400">Azure OpenAI Client Settings</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="api-version">API Version</Label>
                                <Input
                                  id="api-version"
                                  placeholder="2024-04-01-preview"
                                  value={configForm.apiVersion}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, apiVersion: e.target.value }))}
                                  className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Azure OpenAI API version (e.g., 2024-04-01-preview)
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="deployment">Deployment Name</Label>
                                <Input
                                  id="deployment"
                                  placeholder="gpt-5-mini"
                                  value={configForm.deployment}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, deployment: e.target.value }))}
                                  className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Model deployment name in Azure (e.g., gpt-5-mini)
                                </p>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="model-name">Model Name</Label>
                              <Input
                                id="model-name"
                                placeholder="gpt-5-mini"
                                value={configForm.modelName}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, modelName: e.target.value }))}
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                The specific model name to use (e.g., gpt-5-mini)
                              </p>
                            </div>
                          </div>

                          {/* Azure AD Authentication (Optional) */}
                          <div className="space-y-4">
                            <h5 className="font-medium text-sm text-blue-600 dark:text-blue-400">Azure AD Authentication (Optional)</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="tenant-id">Tenant ID</Label>
                                <Input
                                  id="tenant-id"
                                  placeholder="12345678-1234-1234-1234-123456789012"
                                  value={configForm.tenantId}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, tenantId: e.target.value }))}
                                  className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Azure Active Directory tenant identifier (for Azure AD auth)
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="client-id">Client ID</Label>
                                <Input
                                  id="client-id"
                                  placeholder="87654321-4321-4321-4321-210987654321"
                                  value={configForm.clientId}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, clientId: e.target.value }))}
                                  className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Azure application client identifier (for Azure AD auth)
                                </p>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor="client-secret">Client Secret</Label>
                              <Input
                                id="client-secret"
                                type="password"
                                placeholder="Enter your client secret"
                                value={configForm.clientSecret}
                                onChange={(e) => setConfigForm(prev => ({ ...prev, clientSecret: e.target.value }))}
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                🔒 Client secret for Azure AD authentication. Leave blank to keep existing secret.
                              </p>
                            </div>
                          </div>

                          {/* Azure Resource Configuration */}
                          <div className="space-y-4">
                            <h5 className="font-medium text-sm text-blue-600 dark:text-blue-400">Azure Resource Configuration</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="resource-name">Resource Name</Label>
                                <Input
                                  id="resource-name"
                                  placeholder="cognisync-knowledgehub-resource"
                                  value={configForm.resourceName}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, resourceName: e.target.value }))}
                                  className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Azure AI resource name (e.g., cognisync-knowledgehub-resource)
                                </p>
                              </div>
                              <div>
                                <Label htmlFor="region">Region</Label>
                                <Input
                                  id="region"
                                  placeholder="eastus"
                                  value={configForm.region}
                                  onChange={(e) => setConfigForm(prev => ({ ...prev, region: e.target.value }))}
                                  className="mt-1"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Azure region where the resource is deployed
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Advanced Configuration */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Advanced Configuration</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="priority">Priority</Label>
                            <Input
                              id="priority"
                              type="number"
                              min="1"
                              max="10"
                              value={configForm.priority}
                              onChange={(e) => setConfigForm(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Provider priority (1 = highest, 10 = lowest)
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="timeout">Request Timeout (seconds)</Label>
                            <Input
                              id="timeout"
                              type="number"
                              min="10"
                              max="300"
                              value={configForm.timeout}
                              onChange={(e) => setConfigForm(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30 }))}
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              API request timeout in seconds
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Current Configuration Display */}
                      <div className="space-y-4">
                        <Collapsible open={currentConfigOpen} onOpenChange={setCurrentConfigOpen}>
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                            <ChevronDown className={`h-4 w-4 transition-transform ${currentConfigOpen ? 'rotate-180' : ''}`} />
                            <span className="font-medium uppercase tracking-wide">Configuration JSON</span>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-4">
                            <div className="bg-muted p-4 rounded-lg">
                              <pre className="text-xs text-muted-foreground overflow-x-auto">
                                {JSON.stringify(provider.configuration, null, 2)}
                              </pre>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Changes will be saved automatically when you click "Save Configuration"
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" onClick={() => {
                            // Reset form to original provider values
                            setConfigForm({
                              endpoint: provider.configuration?.endpoint || "",
                              apiKey: "", // Never pre-fill API key for security
                              priority: provider.configuration?.priority || 1,
                              timeout: provider.configuration?.timeout || 30,
                              // Azure-specific fields
                              apiVersion: provider.configuration?.apiVersion || "2024-04-01-preview",
                              deployment: provider.configuration?.deployment || "",
                              modelName: provider.configuration?.modelName || "",
                              tenantId: provider.configuration?.tenantId || "",
                              clientId: provider.configuration?.clientId || "",
                              clientSecret: "", // Never pre-fill client secret for security
                              resourceName: provider.configuration?.resourceName || "",
                              region: provider.configuration?.region || ""
                            })
                          }}>
                            Reset
                          </Button>
                          <Button onClick={async () => {
                            try {
                              // Build configuration data from form state
                              const configData: any = {
                                endpoint: configForm.endpoint || provider.configuration?.endpoint,
                                priority: configForm.priority,
                                timeout: configForm.timeout
                              }

                              // Add API key if provided
                              if (configForm.apiKey && provider.type !== 'ollama') {
                                configData.apiKey = configForm.apiKey
                              }

                              // Add Azure-specific fields
                              if (provider.type === 'azure') {
                                // Azure OpenAI Client Settings
                                if (configForm.apiVersion) configData.apiVersion = configForm.apiVersion
                                if (configForm.deployment) configData.deployment = configForm.deployment
                                if (configForm.modelName) configData.modelName = configForm.modelName
                                
                                // Azure AD Authentication (Optional)
                                if (configForm.tenantId) configData.tenantId = configForm.tenantId
                                if (configForm.clientId) configData.clientId = configForm.clientId
                                if (configForm.clientSecret) configData.clientSecret = configForm.clientSecret
                                
                                // Azure Resource Configuration
                                if (configForm.resourceName) configData.resourceName = configForm.resourceName
                                if (configForm.region) configData.region = configForm.region
                              }

                              // Update provider configuration
                              // Extract API key from configData and send as separate top-level field
                              const { apiKey: extractedApiKey, ...configWithoutApiKey } = configData
                              
                              await apiClient.request(`/context-ai/providers/${providerId}/configure`, {
                                method: 'POST',
                                body: JSON.stringify({
                                  api_key: extractedApiKey,  // Send API key as top-level field
                                  configuration: configWithoutApiKey
                                })
                              })

                              toast.success("Provider configuration updated successfully")
                              
                              // Update form state with saved values (keep sensitive fields empty for security)
                              setConfigForm(prev => ({
                                ...prev,
                                endpoint: configData.endpoint || prev.endpoint,
                                priority: configData.priority || prev.priority,
                                timeout: configData.timeout || prev.timeout,
                                // Azure-specific fields
                                apiVersion: configData.apiVersion || prev.apiVersion,
                                deployment: configData.deployment || prev.deployment,
                                modelName: configData.modelName || prev.modelName,
                                tenantId: configData.tenantId || prev.tenantId,
                                clientId: configData.clientId || prev.clientId,
                                resourceName: configData.resourceName || prev.resourceName,
                                region: configData.region || prev.region,
                                // Clear sensitive fields for security
                                apiKey: "",
                                clientSecret: ""
                              }))
                              
                              // Reload provider data to update the provider state
                              await loadProviderDetails()
                              
                            } catch (error: any) {
                              console.error("Failed to update provider configuration:", error)
                              toast.error(error?.message || "Failed to update provider configuration")
                            }
                          }}>
                            <Settings className="h-4 w-4 mr-2" />
                            Save Configuration
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="testing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TestTube className="h-5 w-5" />
                      Provider Connectivity Testing
                    </CardTitle>
                    <CardDescription>
                      Test the AI provider connection, authentication, and configuration settings.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Connectivity Test Overview */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {connectivityTests.map((test) => (
                          <Card key={test.id} className="hover:shadow-md transition-shadow">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">{test.name}</CardTitle>
                              <CardDescription className="text-xs">{test.description}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex items-center justify-between">
                                <div className="text-xs text-muted-foreground">
                                  {provider?.type === 'azure' || test.id !== 'azure_connectivity' ? 'Available' : 'N/A'}
                                </div>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>

                      {/* Test Controls */}
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <h4 className="font-medium">Connectivity Test Controls</h4>
                          <p className="text-sm text-muted-foreground">
                            Test provider endpoint, authentication, and configuration
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button 
                            onClick={runConnectivityTests}
                            disabled={testing}
                            className="min-w-[140px]"
                          >
                            <TestTube className="h-4 w-4 mr-2" />
                            {testing ? 'Testing...' : 'Run Connectivity Tests'}
                          </Button>
                        </div>
                      </div>

                      {/* Test Results */}
                      {testResults.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Test Results</h4>
                            <div className="text-sm text-muted-foreground">
                              {testResults.filter(r => r.status === 'completed' && r.result?.success).length} of {testResults.length} tests passed
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {testResults.map((testResult, index) => (
                              <Card key={index} className="border-l-4 border-l-green-500">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                      <span className="font-medium">{testResult.testName}</span>
                                      <Badge variant="outline" className="text-xs">Connectivity</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant={testResult.status === 'completed' && testResult.result?.success ? "default" : "destructive"}>
                                        {testResult.status === 'completed' && testResult.result?.success ? 'Passed' : 'Failed'}
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Response Time:</span>
                                      <div className="font-mono">
                                        {testResult.result?.responseTime ? `${testResult.result.responseTime}ms` : 'N/A'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Status:</span>
                                      <div className="font-mono">
                                        {testResult.result?.success ? 'Success' : 'Failed'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Response:</span>
                                      <div className="font-mono text-xs">
                                        {testResult.result?.response || (testResult.result as any)?.error || 'N/A'}
                                      </div>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Timestamp:</span>
                                      <div className="font-mono text-xs">
                                        {testResult.result?.timestamp ? new Date(testResult.result.timestamp).toLocaleTimeString() : 'N/A'}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {testResult.result?.success ? (
                                    <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm text-green-700 dark:text-green-300">
                                      ✅ {testResult.testName} completed successfully.
                                    </div>
                                  ) : (
                                    <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-300">
                                      ❌ {testResult.testName} failed: {(testResult.result as any)?.error || testResult.result?.message || 'Unknown error'}
                                    </div>
                                  )}
                                  
                                  {/* Display available models for Model Availability test */}
                                  {testResult.testName === 'Model Availability' && (testResult.result as any)?.availableModels && (testResult.result as any).availableModels.length > 0 && (
                                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border">
                                      <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                                        📋 Available Models ({((testResult.result as any).availableModels as string[]).length})
                                      </div>
                                      <div className="flex flex-wrap gap-1">
                                        {((testResult.result as any).availableModels as string[]).map((model: string, idx: number) => (
                                          <Badge key={idx} variant="outline" className="text-xs bg-white dark:bg-gray-800">
                                            {model}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                {/* Period Selector */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Provider Analytics</h3>
                    <p className="text-sm text-muted-foreground">Detailed usage statistics and model performance</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['7d', '30d', '90d', '1y'] as const).map((period) => (
                      <Button
                        key={period}
                        variant={analyticsPeriod === period ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setAnalyticsPeriod(period)}
                        disabled={loadingAnalytics}
                      >
                        {period === '7d' && '7 Days'}
                        {period === '30d' && '30 Days'}
                        {period === '90d' && '90 Days'}
                        {period === '1y' && '1 Year'}
                      </Button>
                    ))}
                  </div>
                </div>

                {loadingAnalytics ? (
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center">
                        <Activity className="h-12 w-12 mx-auto mb-4 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground">Loading analytics...</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* Summary Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Requests
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {(analytics.summary?.totalRequests || 0).toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Last {analyticsPeriod === '7d' ? '7 days' : analyticsPeriod === '30d' ? '30 days' : analyticsPeriod === '90d' ? '90 days' : '1 year'}
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Tokens
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {(() => {
                              const tokens = analytics.summary?.totalTokens || 0
                              if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
                              if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
                              return tokens.toLocaleString()
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Tokens processed
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Avg Response Time
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-bold">
                            {(() => {
                              const ms = analytics.summary?.avgResponseTime || 0
                              if (ms < 1000) return `${Math.round(ms)}ms`
                              return `${(ms / 1000).toFixed(1)}s`
                            })()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Average latency
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Errors
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className={`text-3xl font-bold ${(analytics.summary?.totalErrors || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {(analytics.summary?.totalErrors || 0).toLocaleString()}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Failed requests
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* ⭐ MODEL-SPECIFIC USAGE - KEY FEATURE ⭐ */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Model Usage Breakdown
                        </CardTitle>
                        <CardDescription>
                          Usage statistics per model for this provider
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {analytics.modelUsage && analytics.modelUsage.length > 0 ? (
                          <div className="space-y-4">
                            {analytics.modelUsage.map((model, index) => {
                              const totalRequests = Number(analytics.summary?.totalRequests || 0)
                              const usageCount = Number(model.usage_count || 0)
                              const percentage = totalRequests > 0 ? (usageCount / totalRequests) * 100 : 0
                              const tokens = Number(model.total_tokens || 0)
                              const responseTime = Number(model.avg_response_time || 0)
                              const successRate = Number(model.success_rate || 0)

                              return (
                                <div key={model.model_name} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-3 h-3 rounded-full ${
                                        index === 0 ? 'bg-blue-500' :
                                        index === 1 ? 'bg-green-500' :
                                        index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                                      }`} />
                                      <div>
                                        <span className="font-medium text-lg">{model.model_name}</span>
                                        <p className="text-xs text-muted-foreground">
                                          {usageCount} requests ({percentage.toFixed(1)}%)
                                        </p>
                                      </div>
                                    </div>
                                    <Badge variant={successRate >= 95 ? "default" : "destructive"}>
                                      {successRate.toFixed(1)}% Success
                                    </Badge>
                                  </div>

                                  {/* Progress bar */}
                                  <div className="w-full bg-muted rounded-full h-2.5 mb-3">
                                    <div 
                                      className={`h-2.5 rounded-full transition-all ${
                                        index === 0 ? 'bg-blue-500' :
                                        index === 1 ? 'bg-green-500' :
                                        index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>

                                  {/* Model metrics */}
                                  <div className="grid grid-cols-3 gap-3 text-sm">
                                    <div className="text-center p-2 bg-muted rounded">
                                      <div className="text-muted-foreground text-xs">Tokens</div>
                                      <div className="font-bold text-blue-600">
                                        {tokens >= 1000000 ? `${(tokens / 1000000).toFixed(1)}M` :
                                         tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}K` : 
                                         tokens.toLocaleString()}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted rounded">
                                      <div className="text-muted-foreground text-xs">Avg Speed</div>
                                      <div className="font-bold text-green-600">
                                        {responseTime < 1000 ? `${Math.round(responseTime)}ms` : `${(responseTime / 1000).toFixed(1)}s`}
                                      </div>
                                    </div>
                                    <div className="text-center p-2 bg-muted rounded">
                                      <div className="text-muted-foreground text-xs">Tokens/Req</div>
                                      <div className="font-bold text-purple-600">
                                        {usageCount > 0 ? Math.round(tokens / usageCount).toLocaleString() : 0}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No model usage data for this period</p>
                            <p className="text-xs text-muted-foreground mt-1">Generate documents to see model-specific analytics</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Empty State */}
                    {(!analytics.summary || analytics.summary.totalRequests === 0) && (
                      <Card className="border-dashed">
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No Usage Data Yet</h3>
                            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                              Start using this AI provider and detailed analytics including model-specific metrics will appear here.
                            </p>
                            <Button onClick={() => router.push('/projects')}>
                              <Zap className="h-4 w-4 mr-2" />
                              Generate Your First Document
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="discover" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Model Discovery
                    </CardTitle>
                    <CardDescription>
                      Discover available models from {provider?.name}'s API and sync them to your database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Configuration */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Current Configuration</h4>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <div className="text-sm text-muted-foreground mb-1">Estimated Total Cost</div>
                          <div className="text-2xl font-bold">
                            ${(provider.usage_stats?.estimated_cost || 0).toFixed(4)}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Based on {(provider.usage_stats?.total_tokens || 0).toLocaleString()} tokens
                          </div>
                        </div>
                        
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Avg Cost per Request</div>
                          <div className="text-2xl font-bold">
                            ${provider.usage_stats?.total_requests > 0
                              ? ((provider.usage_stats?.estimated_cost || 0) / provider.usage_stats.total_requests).toFixed(4)
                              : "0.0000"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Per API call
                          </div>
                        </div>

                        <div className="p-4 bg-muted rounded-lg">
                          <div className="text-sm text-muted-foreground mb-1">Avg Tokens per Request</div>
                          <div className="text-2xl font-bold">
                            {provider.usage_stats?.total_requests > 0
                              ? Math.round((provider.usage_stats?.total_tokens || 0) / provider.usage_stats.total_requests).toLocaleString()
                              : "0"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Average usage
                          </div>
                        </div>
                      </div>

                      {/* Token Breakdown */}
                      <div>
                        <h4 className="font-semibold mb-3">Token Usage Breakdown</h4>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span className="text-sm">Input Tokens</span>
                            </div>
                            <div className="font-mono font-semibold">
                              {(provider.usage_stats?.input_tokens || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-muted rounded">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                              <span className="text-sm">Output Tokens</span>
                            </div>
                            <div className="font-mono font-semibold">
                              {(provider.usage_stats?.output_tokens || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 bg-primary/10 rounded border-2 border-primary">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-primary"></div>
                              <span className="text-sm font-semibold">Total Tokens</span>
                            </div>
                            <div className="font-mono font-bold">
                              {(provider.usage_stats?.total_tokens || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Usage Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Usage Timeline
                    </CardTitle>
                    <CardDescription>
                      Recent activity and usage patterns
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium">First Used</Label>
                          <div className="text-lg font-semibold mt-1">
                            {provider.created_at 
                              ? new Date(provider.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : "Unknown"}
                          </div>
                        </div>
                        
                        <div>
                          <Label className="text-sm font-medium">Last Used</Label>
                          <div className="text-lg font-semibold mt-1">
                            {provider.usage_stats?.last_used && provider.usage_stats.last_used !== "Never"
                              ? new Date(provider.usage_stats.last_used).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : "Never"}
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Active Days</Label>
                          <div className="text-lg font-semibold mt-1">
                            {provider.created_at
                              ? Math.floor((new Date().getTime() - new Date(provider.created_at).getTime()) / (1000 * 60 * 60 * 24))
                              : 0} days
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium">Avg Requests per Day</Label>
                          <div className="text-lg font-semibold mt-1">
                            {provider.created_at && provider.usage_stats?.total_requests
                              ? (provider.usage_stats.total_requests / Math.max(1, Math.floor((new Date().getTime() - new Date(provider.created_at).getTime()) / (1000 * 60 * 60 * 24)))).toFixed(1)
                              : "0"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Performance Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Performance Metrics
                    </CardTitle>
                    <CardDescription>
                      Speed and reliability statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Response Time</span>
                            <Badge variant="outline" className="text-xs">
                              {provider.usage_stats?.avg_response_time
                                ? provider.usage_stats.avg_response_time < 2 ? "Excellent"
                                  : provider.usage_stats.avg_response_time < 5 ? "Good"
                                  : "Slow"
                                : "N/A"}
                            </Badge>
                          </div>
                          <div className="text-2xl font-bold">
                            {provider.usage_stats?.avg_response_time
                              ? `${provider.usage_stats.avg_response_time.toFixed(2)}s`
                              : "N/A"}
                          </div>
                          <div className="mt-2 w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{
                                width: provider.usage_stats?.avg_response_time
                                  ? `${Math.min(100, Math.max(0, 100 - (provider.usage_stats.avg_response_time / 10) * 100))}%`
                                  : '0%'
                              }}
                            ></div>
                          </div>
                        </div>

                        <div className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-muted-foreground">Success Rate</span>
                            <Badge variant="outline" className="text-xs">
                              {provider.usage_stats?.success_rate
                                ? provider.usage_stats.success_rate >= 0.99 ? "Excellent"
                                  : provider.usage_stats.success_rate >= 0.95 ? "Good"
                                  : "Needs Attention"
                                : provider.usage_stats?.total_requests > 0 ? "Excellent" : "N/A"}
                            </Badge>
                          </div>
                          <div className="text-2xl font-bold">
                            {provider.usage_stats?.success_rate
                              ? `${(provider.usage_stats.success_rate * 100).toFixed(1)}%`
                              : provider.usage_stats?.total_requests > 0 ? "100%" : "N/A"}
                          </div>
                          <div className="mt-2 w-full bg-muted rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{
                                width: provider.usage_stats?.success_rate
                                  ? `${provider.usage_stats.success_rate * 100}%`
                                  : provider.usage_stats?.total_requests > 0 ? '100%' : '0%'
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>

                      {/* Error Rate */}
                      {provider.usage_stats?.total_requests > 0 && (
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-sm text-muted-foreground">Failed Requests</div>
                              <div className="text-xl font-bold mt-1">
                                {provider.usage_stats?.failed_requests || 0}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">Error Rate</div>
                              <div className="text-xl font-bold mt-1 text-red-600">
                                {provider.usage_stats?.success_rate
                                  ? `${((1 - provider.usage_stats.success_rate) * 100).toFixed(2)}%`
                                  : "0%"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Model Usage Distribution */}
                {provider?.models && provider.models.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Model Usage Distribution
                      </CardTitle>
                      <CardDescription>
                        Which models are being used most frequently
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {provider.models.map((modelId, index) => (
                          <div key={modelId} className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <code className="text-sm font-mono">{modelId}</code>
                                  {modelId === provider.default_model && (
                                    <Badge variant="default" className="text-xs">Default</Badge>
                                  )}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {/* Simulated usage - in real app, track per model */}
                                  {index === 0 ? "60%" : index === 1 ? "25%" : `${15 / (provider.models.length - 2)}%`}
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
                                    index === 0 ? "bg-blue-500" :
                                    index === 1 ? "bg-green-500" :
                                    index === 2 ? "bg-purple-500" :
                                    "bg-orange-500"
                                  }`}
                                  style={{
                                    width: index === 0 ? "60%" : index === 1 ? "25%" : `${15 / (provider.models.length - 2)}%`
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-4">
                        💡 Note: Model-specific usage tracking coming soon. Currently showing estimated distribution.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Empty State */}
                {!provider.usage_stats?.total_requests && (
                  <Card className="border-dashed">
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Usage Data Yet</h3>
                        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                          Start using this AI provider to generate documents and analytics will appear here automatically.
                        </p>
                        <Button onClick={() => router.push('/projects')}>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate Your First Document
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="discover" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5" />
                      Model Discovery
                    </CardTitle>
                    <CardDescription>
                      Discover available models from {provider?.name}'s API and sync them to your database.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Current Configuration */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold">Current Configuration</h4>
                      <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Configured Models:</span>
                          <Badge variant="secondary">{provider?.models?.length || 0} models</Badge>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Default Model:</span>
                          <code className="text-xs bg-background px-2 py-1 rounded">
                            {(provider as any)?.default_model || 'Not set'}
                          </code>
                        </div>
                        {provider?.models && provider.models.length > 0 && (
                          <div className="mt-3">
                            <span className="text-xs text-muted-foreground">Current models:</span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {provider.models.map((model) => (
                                <Badge key={model} variant="outline" className="text-xs">
                                  {model}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Discovery Action */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Discover Models</h4>
                        <Button 
                          onClick={discoverModels}
                          disabled={discovering}
                          variant="default"
                        >
                          {discovering ? (
                            <>
                              <Activity className="mr-2 h-4 w-4 animate-spin" />
                              Discovering...
                            </>
                          ) : (
                            <>
                              <Zap className="mr-2 h-4 w-4" />
                              Discover Models
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Query {provider?.name}'s API to discover all available models.
                      </p>
                    </div>

                    {/* Discovered Models */}
                    {discoveredModels.length > 0 && (
                      <div className="space-y-3 border-t pt-6">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">
                            Discovered Models ({discoveredModels.length})
                          </h4>
                          <Badge variant="secondary">
                            {selectedModels.length} selected
                          </Badge>
                        </div>

                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {discoveredModels.map((model: any) => {
                            const modelId = model.id || model.name || model
                            const isSelected = selectedModels.includes(modelId)
                            const isDefault = selectedDefaultModel === modelId

                            return (
                              <div
                                key={modelId}
                                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                                  isSelected 
                                    ? 'border-primary bg-primary/5' 
                                    : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => toggleModelSelection(modelId)}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggleModelSelection(modelId)}
                                        className="rounded"
                                        onClick={async (e: React.MouseEvent) => e.stopPropagation()}
                                      />
                                      <code className="text-sm font-mono font-semibold">
                                        {model.name || modelId}
                                      </code>
                                      {isDefault && (
                                        <Badge variant="default" className="text-xs">
                                          Default
                                        </Badge>
                                      )}
                                    </div>

                                    {model.description && (
                                      <p className="text-xs text-muted-foreground ml-6">
                                        {model.description}
                                      </p>
                                    )}

                                    {(model.context_window || model.capabilities) && (
                                      <div className="flex flex-wrap gap-2 ml-6 mt-2">
                                        {model.context_window && (
                                          <Badge variant="outline" className="text-xs">
                                            {model.context_window.toLocaleString()} tokens
                                          </Badge>
                                        )}
                                        {model.capabilities?.map((cap: string) => (
                                          <Badge key={cap} variant="outline" className="text-xs">
                                            {cap}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <Button
                                    size="sm"
                                    variant={isDefault ? "default" : "outline"}
                                    onClick={(e: React.MouseEvent) => {
                                      e.stopPropagation()
                                      setSelectedDefaultModel(modelId)
                                      if (!isSelected) {
                                        toggleModelSelection(modelId)
                                      }
                                    }}
                                    disabled={!isSelected && !isDefault}
                                  >
                                    {isDefault ? 'Default' : 'Set Default'}
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Sync Actions */}
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="text-sm text-muted-foreground">
                            Select models to sync and choose a default model
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={() => {
                                setDiscoveredModels([])
                                setSelectedModels([])
                                setSelectedDefaultModel(null)
                              }}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={syncModels}
                              disabled={syncingModels || selectedModels.length === 0 || !selectedDefaultModel}
                            >
                              {syncingModels ? (
                                <>
                                  <Activity className="mr-2 h-4 w-4 animate-spin" />
                                  Syncing...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Sync to Database
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Help Text */}
                    {discoveredModels.length === 0 && !discovering && (
                      <div className="bg-muted/50 p-6 rounded-lg text-center space-y-2">
                        <Zap className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Click "Discover Models" to query {provider?.name}'s API for available models.
                        </p>
                        <p className="text-xs text-muted-foreground">
                          This will fetch the latest model list directly from the provider.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Add Model Dialog */}
      <Dialog open={addModelDialogOpen} onOpenChange={setAddModelDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Model</DialogTitle>
            <DialogDescription>
              Configure a new AI model for {provider?.name}. Fill in the required information below.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Basic Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modelId">Model ID *</Label>
                <Input
                  id="modelId"
                  placeholder="gpt-4"
                  value={newModelForm.modelId}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, modelId: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Unique identifier for the model (e.g., gpt-4, claude-3-sonnet)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="modelName">Model Name *</Label>
                <Input
                  id="modelName"
                  placeholder="GPT-4"
                  value={newModelForm.modelName}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, modelName: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Display name for the model
                </p>
              </div>
            </div>

            {/* Model Parameters */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contextWindow">Context Window</Label>
                <Input
                  id="contextWindow"
                  type="number"
                  min="1000"
                  max="10000000"
                  value={newModelForm.contextWindow}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, contextWindow: parseInt(e.target.value) || 128000 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum context tokens (default: 128,000)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  min="1"
                  max="100000"
                  value={newModelForm.maxTokens}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 4096 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum response tokens (default: 4,096)
                </p>
              </div>
            </div>

            {/* Advanced Parameters */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={newModelForm.temperature}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Creativity (0-2, default: 0.7)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="topP">Top P</Label>
                <Input
                  id="topP"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={newModelForm.topP}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, topP: parseFloat(e.target.value) || 1.0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Nucleus sampling (0-1, default: 1.0)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequencyPenalty">Frequency Penalty</Label>
                <Input
                  id="frequencyPenalty"
                  type="number"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={newModelForm.frequencyPenalty}
                  onChange={(e) => setNewModelForm(prev => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) || 0.0 }))}
                />
                <p className="text-xs text-muted-foreground">
                  Reduce repetition (-2 to 2, default: 0.0)
                </p>
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={newModelForm.is_active}
                onCheckedChange={(checked: boolean) => setNewModelForm(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="isActive">Active</Label>
              <p className="text-xs text-muted-foreground">
                Enable this model for use
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModelDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddModel}
              disabled={!newModelForm.modelId || !newModelForm.modelName || addingModel}
            >
              {addingModel ? "Adding..." : "Add Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Model Dialog */}
      <Dialog open={deleteModelDialogOpen !== null} onOpenChange={(open: boolean) => !open && setDeleteModelDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this model configuration? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          {deleteModelDialogOpen && (
            <div className="py-4">
              <p className="text-sm">
                You are about to delete the model configuration for:{" "}
                <code className="font-mono font-semibold bg-muted px-2 py-1 rounded">
                  {models.find(m => m.id === deleteModelDialogOpen)?.name || deleteModelDialogOpen}
                </code>
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModelDialogOpen(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => deleteModelDialogOpen && handleDeleteModel(deleteModelDialogOpen)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
