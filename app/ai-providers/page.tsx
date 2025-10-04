"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Settings, Plus, Trash2, CheckCircle, AlertCircle, Zap, Eye, EyeOff, TestTube, BarChart3, Clock, Activity } from "lucide-react"
import { apiClient } from "@/lib/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import googleProviderStubRaw from "./google"

const googleProviderStub = {
  id: "2",
  name: "Google AI",
  type: "google",
  model: "gemini-pro",
  status: "active",
  apiKey: "*********************",
  endpoint: "https://generativelanguage.googleapis.com",
  priority: 2,
  enabled: true,
  lastUsed: "10 minutes ago",
  requestCount: 456,
  errorRate: 0.1,
  // You can spread googleProviderStubRaw if needed for additional properties
  ...googleProviderStubRaw,
}

export default function AIProviders() {
  // Use the same API base as the main API client
  const apiBase = "http://localhost:5000"
  const apiUrl = (path: string) => `${apiBase}${path}`

  // Initialize API client with token
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token && !(apiClient as any).token) {
      ;(apiClient as any).setToken(token)
    }
  }, [])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [ollamaModels, setOllamaModels] = useState<any[]>([])
  
  // Testing suite state
  const [healthMetrics, setHealthMetrics] = useState<any[]>([])
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<any[]>([])

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const [formState, setFormState] = useState({
    id: "",
    name: "",
    type: "openai",
    apiKey: "",
    endpoint: "",
    priority: 1,
    enabled: true,
    // Azure AI Foundry specific fields
    resourceName: "",
    deploymentName: "",
    apiVersion: "2024-12-01-preview",
    tenantId: "",
    clientId: "",
    clientSecret: "",
    subscriptionId: "",
    region: "",
    authorizationType: "api-key" as "api-key" | "azure-ad" | "managed-identity"
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const resetForm = () =>
    setFormState({ 
      id: "", 
      name: "", 
      type: "openai", 
      apiKey: "", 
      endpoint: "", 
      priority: 1, 
      enabled: true,
      // Azure AI Foundry specific fields
      resourceName: "",
      deploymentName: "",
      apiVersion: "2024-12-01-preview",
      tenantId: "",
      clientId: "",
      clientSecret: "",
      subscriptionId: "",
      region: "",
      authorizationType: "api-key"
    })

  const validateForm = (state = formState) => {
    const errs: Record<string, string> = {}
    if (!state.name || state.name.trim().length < 2) {
      errs.name = "Name is required (min 2 characters)"
    }

    // Map some UI types to server provider types when validating
    const uiType = state.type
    const providerType = uiType === "azure-openai" ? "azure" : uiType === "copilot" ? "openai" : uiType

    if (!["openai", "google", "azure", "mistral", "ollama"].includes(providerType)) {
      errs.type = "Unsupported provider type for creation. Choose OpenAI, Google, Azure, Mistral, or Ollama."
    }

    // Skip API key validation for Ollama providers (they don't need API keys)
    if (uiType !== "ollama") {
      if (!state.apiKey || state.apiKey.trim().length < 16) {
        errs.apiKey = "API key looks too short. Paste the full key (min 16 chars)."
      } else if (providerType === "openai" && !state.apiKey.startsWith("sk-")) {
        // gentle hint, not a hard block
        errs.apiKey = "OpenAI keys usually start with 'sk-'. Verify you pasted the right key."
      }
    }

    // Azure AI Foundry specific validation
    if (providerType === "azure") {
      if (!state.endpoint || !state.endpoint.includes("cognitiveservices.azure.com")) {
        errs.endpoint = "Azure AI endpoint must be a valid cognitiveservices.azure.com URL"
      }

      if (!state.resourceName) {
        errs.resourceName = "Resource name is required for Azure AI Foundry"
      }

      if (!state.deploymentName) {
        errs.deploymentName = "Deployment name is required for Azure AI Foundry"
      }

      if (state.authorizationType === "azure-ad") {
        if (!state.tenantId) {
          errs.tenantId = "Tenant ID is required for Azure AD authentication"
        }
        if (!state.clientId) {
          errs.clientId = "Client ID is required for Azure AD authentication"
        }
        if (!state.clientSecret) {
          errs.clientSecret = "Client Secret is required for Azure AD authentication"
        }
      }
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  // run validation live when the form changes
  useEffect(() => {
    validateForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState])

  // Load Ollama models on component mount
  useEffect(() => {
    loadOllamaModels().then(models => {
      setOllamaModels(models)
    })
  }, [])


  const isFormValid = Object.keys(formErrors).length === 0

  const handleAddProvider = (e: React.FormEvent) => {
    e.preventDefault()
  if (!validateForm()) return
  ;(async () => {
      setActionLoading((s) => ({ ...s, create: true }))
      setError(null)
      try {
        // Use apiClient for authenticated requests
        await apiClient.request('/context-ai/providers', {
          method: "POST",
          body: JSON.stringify({
            name: formState.name,
            provider_type: formState.type,
            api_key: formState.apiKey,
            configuration: { 
              endpoint: formState.endpoint, 
              priority: formState.priority,
              // Azure AI Foundry specific configuration
              ...(formState.type === "azure" && {
                resourceName: formState.resourceName,
                deploymentName: formState.deploymentName,
                apiVersion: formState.apiVersion,
                tenantId: formState.tenantId,
                clientId: formState.clientId,
                clientSecret: formState.clientSecret,
                subscriptionId: formState.subscriptionId,
                region: formState.region,
                authorizationType: formState.authorizationType
              })
            },
            is_active: formState.enabled,
          }),
        })

  await loadProviders()
  resetForm()
  setAddDialogOpen(false)
  toast.success("Provider created")
      } catch (err: any) {
        console.error(err)
        setError(err?.message || "Failed to create provider")
  toast.error(err?.message || "Failed to create provider")
      } finally {
        setActionLoading((s) => ({ ...s, create: false }))
      }
    })()
  }


  const handleDeleteProvider = (id: string) => {
    // open confirmation dialog
    const p = providers.find((x) => x.id === id || x.name === id)
    setDeleteTarget({ id, name: p?.name || id })
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    setActionLoading((s) => ({ ...s, [id]: true }))
    setError(null)
    try {
      // Use apiClient for authenticated requests
      await apiClient.request(`/context-ai/providers/${encodeURIComponent(id)}`, {
        method: "DELETE",
      })

  await loadProviders()
  setDeleteDialogOpen(false)
  setDeleteTarget(null)
  toast.success("Provider deleted")
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Failed to delete provider")
  toast.error(err?.message || "Failed to delete provider")
    } finally {
      setActionLoading((s) => ({ ...s, [id]: false }))
    }
  }

  const handleToggleEnabled = (id: string) => {
    ;(async () => {
      setActionLoading((s) => ({ ...s, [id]: true }))
      setError(null)
      try {
        // Use the new toggle endpoint
        const response = await apiClient.request(`/ai/providers/${encodeURIComponent(id)}/toggle`, {
          method: "POST",
        })

        // Update the provider in the local state immediately for better UX
        setProviders(prev => prev.map(p => 
          p.id === id ? { ...p, enabled: response.is_active, status: response.is_active ? 'active' : 'inactive' } : p
        ))

        toast.success(response.message || `Provider ${response.is_active ? 'activated' : 'deactivated'}`)
      } catch (err: any) {
        console.error(err)
        setError(err?.message || "Failed to toggle provider")
        toast.error(err?.message || "Failed to toggle provider")
      } finally {
        setActionLoading((s) => ({ ...s, [id]: false }))
      }
    })()
  }


  // Load Ollama models from local machine
  const loadOllamaModels = async () => {
    try {
      const response = await fetch('http://localhost:11434/api/tags', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error(`Ollama API not available: ${response.status}`)
      }
      
      const data = await response.json()
      return data.models || []
    } catch (error) {
      console.warn('Could not connect to Ollama:', error)
      return []
    }
  }


  // Load providers from backend
  const loadProviders = async () => {
    setLoading(true)
    setError(null)
    try {
      // Use the same endpoint as dashboard for consistency
      const providers = await apiClient.getAIProviders()
      // normalize providers for display
      const normalized = providers.map((p: any) => ({ 
        id: p.id,
        name: p.name,
        type: p.type,
        model: p.models?.[0] || 'Not specified', // Use first model as default
        models: p.models || [],
        enabled: p.is_active,
        status: p.is_active ? 'active' : 'inactive',
        priority: 1, // Default priority
        endpoint: '', // Will be populated from configuration if needed
        apiKey: 'Set', // Don't expose actual key
        lastUsed: 'Never',
        requestCount: 0,
        errorRate: 0
      }))
      setProviders(normalized)
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Failed to load providers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
    loadHealthDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Testing suite functions
  const loadHealthDashboard = async () => {
    try {
      const response = await apiClient.request('/ai-provider-testing/health-dashboard', { method: 'GET' })
      if (response.success) {
        setHealthMetrics(response.data || [])
      }
    } catch (error) {
      console.error('Error loading health dashboard:', error)
    }
  }

  const runFullTestSuite = async () => {
    setTesting(true)
    try {
      const response = await fetch(apiUrl('/api/ai-provider-testing/run-full-suite'), {
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setHealthMetrics(data.data.results || [])
        toast.success(`Test suite completed! ${data.data.summary.healthyProviders}/${data.data.summary.totalProviders} providers healthy`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to run test suite')
      }
    } catch (error) {
      console.error('Error running test suite:', error)
      toast.error('Failed to run test suite')
    } finally {
      setTesting(false)
    }
  }

  const testProvider = async (providerId: string) => {
    setTesting(true)
    try {
      const response = await fetch(apiUrl(`/api/ai-provider-testing/test/${providerId}`), {
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        // Update the specific provider in health metrics
        setHealthMetrics(prev => prev.map(h => 
          h.providerId === providerId ? data.data : h
        ))
        toast.success(`Provider test completed! Health: ${data.data.overallHealth.toFixed(1)}%`)
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to test provider')
      }
    } catch (error) {
      console.error('Error testing provider:', error)
      toast.error('Failed to test provider')
    } finally {
      setTesting(false)
    }
  }

  // Azure AI Foundry validation functions
  const validateAzureEndpoint = async () => {
    try {
      const response = await fetch(apiUrl('/api/azure-ai-foundry/validate-endpoint'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: formState.endpoint,
          apiKey: formState.apiKey,
          resourceName: formState.resourceName,
          deploymentName: formState.deploymentName,
          apiVersion: formState.apiVersion
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.data.isValid) {
          toast.success(`Endpoint validated! Found ${data.data.availableModels.length} models`)
          // Auto-fill resource name if empty
          if (!formState.resourceName && data.data.resourceName) {
            setFormState(prev => ({ ...prev, resourceName: data.data.resourceName }))
          }
        } else {
          toast.error(`Endpoint validation failed: ${data.data.error}`)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to validate endpoint')
      }
    } catch (error) {
      console.error('Error validating Azure endpoint:', error)
      toast.error('Failed to validate endpoint')
    }
  }

  const validateAzureAuth = async () => {
    try {
      const response = await fetch(apiUrl('/api/azure-ai-foundry/validate-authorization'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          endpoint: formState.endpoint,
          apiKey: formState.apiKey,
          authorizationType: formState.authorizationType,
          tenantId: formState.tenantId,
          clientId: formState.clientId,
          clientSecret: formState.clientSecret
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.data.isAuthorized) {
          toast.success(`Authorization validated! Permissions: ${data.data.permissions.join(', ')}`)
        } else {
          toast.error(`Authorization failed: ${data.data.error}`)
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to validate authorization')
      }
    } catch (error) {
      console.error('Error validating Azure authorization:', error)
      toast.error('Failed to validate authorization')
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">AI Providers</h1>
                <p className="text-muted-foreground">Configure and manage AI providers for document generation</p>
              </div>
              <>
                <Button onClick={() => { resetForm(); setAddDialogOpen(true) }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Provider
                </Button>
                <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleAddProvider}>
                    <DialogHeader>
                      <DialogTitle>Add AI Provider</DialogTitle>
                      <DialogDescription>Configure a new AI provider for document generation.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="provider-type" className="text-right">
                          Provider
                        </Label>
                        <Select onValueChange={(val) => setFormState((s) => ({ ...s, type: val }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="google">Google AI</SelectItem>
                            <SelectItem value="azure">Azure AI Foundry</SelectItem>
                            <SelectItem value="mistral">Mistral AI</SelectItem>
                            <SelectItem value="ollama">Ollama</SelectItem>
                            <SelectItem value="copilot">GitHub Copilot</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name
                        </Label>
                        <div className="col-span-3">
                          <Input id="name" value={formState.name} onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))} placeholder="Provider name" />
                          {formErrors.name && <div className="text-xs text-red-600 mt-1">{formErrors.name}</div>}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="api-key" className="text-right">
                          API Key
                        </Label>
                        <div className="col-span-3">
                          <Input 
                            id="api-key" 
                            type="password" 
                            value={formState.apiKey} 
                            onChange={(e) => setFormState((s) => ({ ...s, apiKey: e.target.value }))} 
                            placeholder={formState.type === "ollama" ? "Not required for local Ollama" : "Enter API key (will be encrypted and stored securely)"}
                            disabled={formState.type === "ollama"}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            {formState.type === "ollama" ? 
                              "🏠 Local Ollama doesn't require an API key - it runs locally on your machine." :
                              "🔒 API key will be encrypted and stored securely. Only the application can access it."
                            }
                          </p>
                          {formErrors.apiKey && <div className="text-xs text-red-600 mt-1">{formErrors.apiKey}</div>}
                        </div>
                      </div>

                      
                      {/* Azure AI Foundry specific fields */}
                      {formState.type === "azure" && (
                        <>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="endpoint" className="text-right">
                              Endpoint
                            </Label>
                            <div className="col-span-3">
                              <Input 
                                id="endpoint" 
                                value={formState.endpoint} 
                                onChange={(e) => setFormState((s) => ({ ...s, endpoint: e.target.value }))} 
                                placeholder="https://your-resource.region.cognitiveservices.azure.com" 
                              />
                              {formErrors.endpoint && <div className="text-xs text-red-600 mt-1">{formErrors.endpoint}</div>}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="resource-name" className="text-right">
                              Resource Name
                            </Label>
                            <div className="col-span-3">
                              <Input 
                                id="resource-name" 
                                value={formState.resourceName} 
                                onChange={(e) => setFormState((s) => ({ ...s, resourceName: e.target.value }))} 
                                placeholder="your-ai-resource" 
                              />
                              {formErrors.resourceName && <div className="text-xs text-red-600 mt-1">{formErrors.resourceName}</div>}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="deployment-name" className="text-right">
                              Deployment
                            </Label>
                            <div className="col-span-3">
                              <Input 
                                id="deployment-name" 
                                value={formState.deploymentName} 
                                onChange={(e) => setFormState((s) => ({ ...s, deploymentName: e.target.value }))} 
                                placeholder="gpt-4o-mini" 
                              />
                              {formErrors.deploymentName && <div className="text-xs text-red-600 mt-1">{formErrors.deploymentName}</div>}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="api-version" className="text-right">
                              API Version
                            </Label>
                            <Select onValueChange={(val) => setFormState((s) => ({ ...s, apiVersion: val }))}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select API version" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="2024-12-01-preview">2024-12-01-preview</SelectItem>
                                <SelectItem value="2024-06-01">2024-06-01</SelectItem>
                                <SelectItem value="2023-12-01-preview">2023-12-01-preview</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="authorization-type" className="text-right">
                              Auth Type
                            </Label>
                            <Select onValueChange={(val) => setFormState((s) => ({ ...s, authorizationType: val as any }))}>
                              <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select authorization type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="api-key">API Key</SelectItem>
                                <SelectItem value="azure-ad">Azure AD</SelectItem>
                                <SelectItem value="managed-identity">Managed Identity</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Azure AD specific fields */}
                          {formState.authorizationType === "azure-ad" && (
                            <>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="tenant-id" className="text-right">
                                  Tenant ID
                                </Label>
                                <div className="col-span-3">
                                  <Input 
                                    id="tenant-id" 
                                    value={formState.tenantId} 
                                    onChange={(e) => setFormState((s) => ({ ...s, tenantId: e.target.value }))} 
                                    placeholder="your-tenant-id" 
                                  />
                                  {formErrors.tenantId && <div className="text-xs text-red-600 mt-1">{formErrors.tenantId}</div>}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="client-id" className="text-right">
                                  Client ID
                                </Label>
                                <div className="col-span-3">
                                  <Input 
                                    id="client-id" 
                                    value={formState.clientId} 
                                    onChange={(e) => setFormState((s) => ({ ...s, clientId: e.target.value }))} 
                                    placeholder="your-client-id" 
                                  />
                                  {formErrors.clientId && <div className="text-xs text-red-600 mt-1">{formErrors.clientId}</div>}
                                </div>
                              </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="client-secret" className="text-right">
                                  Client Secret
                                </Label>
                                <div className="col-span-3">
                                  <Input 
                                    id="client-secret" 
                                    type="password" 
                                    value={formState.clientSecret} 
                                    onChange={(e) => setFormState((s) => ({ ...s, clientSecret: e.target.value }))} 
                                    placeholder="your-client-secret" 
                                  />
                                  {formErrors.clientSecret && <div className="text-xs text-red-600 mt-1">{formErrors.clientSecret}</div>}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <DialogFooter className="flex gap-2">
                      {formState.type === "azure" && (
                        <>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={validateAzureEndpoint}
                            disabled={!formState.endpoint || !formState.apiKey}
                          >
                            Validate Endpoint
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={validateAzureAuth}
                            disabled={!formState.endpoint}
                          >
                            Validate Auth
                          </Button>
                        </>
                      )}
                      <Button type="submit" disabled={!isFormValid}>Add Provider</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
                </>
            </div>

            <Tabs defaultValue="providers" className="space-y-4">
              <TabsList>
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="testing">Testing Suite</TabsTrigger>
                <TabsTrigger value="failover">Failover Settings</TabsTrigger>
                <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="providers" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {providers.map((provider) => (
                    <Card key={provider.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Zap className="h-6 w-6 text-primary" />
                            <div>
                              <CardTitle className="text-lg flex items-center space-x-2">
                                <span>{provider.name}</span>
                                <Badge variant={provider.status === "active" ? "default" : "secondary"}>
                                  {provider.status}
                                </Badge>
                              </CardTitle>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Switch checked={provider.enabled} onCheckedChange={() => handleToggleEnabled(provider.id)} />
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => window.location.href = `/ai-providers/${provider.id}`}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteProvider(provider.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Model</Label>
                              <p className="text-sm text-muted-foreground mt-1">{provider.model || 'Not specified'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Priority</Label>
                              <p className="text-sm text-muted-foreground mt-1">{provider.priority}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Last Used</Label>
                              <p className="text-sm text-muted-foreground mt-1">{provider.lastUsed || 'Never'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">API Key</Label>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={
                                  provider.type === "ollama" ? "secondary" : 
                                  provider.apiKey ? "default" : "destructive"
                                }>
                                  {provider.type === "ollama" ? "Not Required" : 
                                   provider.apiKey ? "Configured" : "Not Set"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Delete confirmation dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Confirm delete</DialogTitle>
                      <DialogDescription>Deleting a provider is irreversible. This will remove its configuration and any usage history links.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <p>Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?</p>
                    </div>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null) }}>Cancel</Button>
                      <Button className="ml-2" onClick={confirmDelete} disabled={!deleteTarget || !!actionLoading[deleteTarget?.id || ""]}>Delete</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              <TabsContent value="testing" className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">AI Provider Testing Suite</h2>
                    <p className="text-muted-foreground">Comprehensive testing and validation for all AI providers</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={runFullTestSuite} disabled={testing}>
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing ? "Running Tests..." : "Run Full Test Suite"}
                    </Button>
                    <Button variant="outline" onClick={loadHealthDashboard}>
                      <Activity className="h-4 w-4 mr-2" />
                      Refresh Health
                    </Button>
                  </div>
                </div>

                {/* Health Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
                      <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{healthMetrics.length}</div>
                      <p className="text-xs text-muted-foreground">Active providers</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Healthy Providers</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {healthMetrics.filter(h => h.overallHealth >= 80).length}
                      </div>
                      <p className="text-xs text-muted-foreground">80%+ health score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Average Health</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {healthMetrics.length > 0 ? 
                          Math.round(healthMetrics.reduce((sum, h) => sum + h.overallHealth, 0) / healthMetrics.length) : 0
                        }%
                      </div>
                      <p className="text-xs text-muted-foreground">Overall system health</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {healthMetrics.length > 0 ? 
                          Math.round(healthMetrics.reduce((sum, h) => sum + h.responseTime, 0) / healthMetrics.length) : 0
                        }ms
                      </div>
                      <p className="text-xs text-muted-foreground">Average response time</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Provider Health Cards */}
                <div className="grid gap-4">
                  {healthMetrics.map((provider) => (
                    <Card key={provider.providerId}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${
                              provider.overallHealth >= 80 ? 'bg-green-500' :
                              provider.overallHealth >= 60 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <div>
                              <CardTitle className="text-lg">{provider.providerName}</CardTitle>
                              <CardDescription>{provider.providerType}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge variant={
                              provider.overallHealth >= 80 ? "default" :
                              provider.overallHealth >= 60 ? "secondary" :
                              "destructive"
                            }>
                              {provider.overallHealth.toFixed(1)}% Health
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => testProvider(provider.providerId)}
                              disabled={testing}
                            >
                              <TestTube className="h-4 w-4 mr-2" />
                              Test Now
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Availability</p>
                            <p className="text-lg font-semibold">{provider.availability.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Response Time</p>
                            <p className="text-lg font-semibold">{provider.responseTime.toFixed(0)}ms</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Success Rate</p>
                            <p className="text-lg font-semibold">{provider.successRate.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Last Tested</p>
                            <p className="text-sm">{new Date(provider.lastTested).toLocaleString()}</p>
                          </div>
                        </div>
                        {provider.recommendations.length > 0 && (
                          <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Recommendations:</p>
                            <ul className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                              {provider.recommendations.map((rec, index) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="failover" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Failover Configuration</CardTitle>
                    <CardDescription>
                      Configure automatic failover between AI providers when primary providers are unavailable
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Enable Automatic Failover</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically switch to backup providers when primary fails
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <div className="space-y-2">
                      <Label>Failover Priority Order</Label>
                      <div className="space-y-2">
                        {providers
                          .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
                          .map((provider, index) => (
                            <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm">
                                  {index + 1}
                                </span>
                                <span className="font-medium">{provider.name}</span>
                                <Badge variant="outline">{provider.model}</Badge>
                              </div>
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Total Requests Today</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">2,479</div>
                      <p className="text-sm text-muted-foreground">+12% from yesterday</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Average Response Time</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">1.2s</div>
                      <p className="text-sm text-muted-foreground">-0.3s from yesterday</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Success Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">99.7%</div>
                      <p className="text-sm text-muted-foreground">+0.2% from yesterday</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
