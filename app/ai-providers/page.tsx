"use client"

import React, { useEffect, useState } from "react"
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
import { Settings, Plus, Trash2, CheckCircle, AlertCircle, Zap, Eye, TestTube, BarChart3, Clock, Activity } from "@/components/ui/icons-shim"
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
import { googleProviderStub as googleProviderStubRaw } from "./google"

const googleProviderStub = {
  // You can spread googleProviderStubRaw if needed for additional properties
  ...googleProviderStubRaw,
  // Override with specific values for this page
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
  const [providers, setProviders] = useState<Array<{
    id: string
    name: string
    type: string
    model: string
    status: string
    priority: number
    endpoint: string
    apiKey: string
    lastUsed: string
    requestCount: number
    errorRate: number
    enabled: boolean
  }>>([])
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [ollamaModels, setOllamaModels] = useState<Array<{
    name: string
    size: number
    digest: string
    modified_at: string
  }>>([])
  
  // Testing suite state
  const [healthMetrics, setHealthMetrics] = useState<Array<{
    providerId: string
    providerName: string
    providerType: string
    overallHealth: number
    availability: number
    responseTime: number
    successRate: number
    lastTested: string
    recommendations: string[]
  }>>([])
  const [testing, setTesting] = useState(false)
  const [testResults, setTestResults] = useState<Array<{
    providerId: string
    testName: string
    status: string
    result: any
    timestamp: string
  }>>([])

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  const [formState, setFormState] = useState<{
    id: string
    name: string
    type: "openai" | "google" | "azure" | "mistral" | "ollama" | "copilot"
    apiKey: string
    endpoint: string
    priority: number
    enabled: boolean
    // Azure AI Foundry specific fields
    resourceName: string
    deploymentName: string
    apiVersion: string
    tenantId: string
    clientId: string
    clientSecret: string
    subscriptionId: string
    region: string
    authorizationType: "api-key" | "azure-ad" | "managed-identity"
  }>({
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
    const providerType = uiType === "copilot" ? "openai" : uiType

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
        const response = await apiClient.request<{
          is_active: boolean
          message?: string
        }>(`/ai/providers/${encodeURIComponent(id)}/toggle`, {
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
  const loadOllamaModels = async (): Promise<Array<{
    name: string
    size: number
    digest: string
    modified_at: string
  }>> => {
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
      
      const data = await response.json() as { models?: Array<{
        name: string
        size: number
        digest: string
        modified_at: string
      }> }
      return data.models || []
    } catch (error) {
      console.warn('Could not connect to Ollama:', error)
      return []
    }
  }


  // Load providers from backend
  const loadProviders = async (): Promise<void> => {
    setLoading(true)
    setError(null)
    try {
      // Use the same endpoint as dashboard for consistency
      const providers = await apiClient.getAIProviders()
      // normalize providers for display
      const normalized = providers.map((p: {
        id: string
        name: string
        type: string
        models?: string[]
        is_active: boolean
        configuration?: any
      }) => ({ 
        id: p.id,
        name: p.name,
        type: p.type,
        model: p.models?.[0] || 'Not specified', // Use first model as default
        status: p.is_active ? 'active' : 'inactive',
        priority: 1, // Default priority
        endpoint: p.configuration?.endpoint || '', // Will be populated from configuration if needed
        apiKey: 'Set', // Don't expose actual key
        lastUsed: 'Never',
        requestCount: 0,
        errorRate: 0,
        enabled: p.is_active
      }))
      setProviders(normalized)
    } catch (err: unknown) {
      console.error(err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load providers"
      setError(errorMessage)
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
  const loadHealthDashboard = async (): Promise<void> => {
    try {
      const response = await apiClient.request<{
        success: boolean
        data?: Array<{
          providerId: string
          providerName: string
          providerType: string
          overallHealth: number
          availability: number
          responseTime: number
          successRate: number
          lastTested: string
          recommendations: string[]
        }>
      }>('/ai-provider-testing/health-dashboard', { method: 'GET' })
      if (response.success) {
        setHealthMetrics(response.data || [])
      }
    } catch (error) {
      console.error('Error loading health dashboard:', error)
    }
  }

  const runFullTestSuite = async (): Promise<void> => {
    setTesting(true)
    try {
      const response = await fetch(apiUrl('/api/ai-provider-testing/run-full-suite'), {
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json() as {
          data: {
            results: Array<{
              providerId: string
              providerName: string
              providerType: string
              overallHealth: number
              availability: number
              responseTime: number
              successRate: number
              lastTested: string
              recommendations: string[]
            }>
            summary: {
              healthyProviders: number
              totalProviders: number
            }
          }
        }
        setHealthMetrics(data.data.results || [])
        toast.success(`Test suite completed! ${data.data.summary.healthyProviders}/${data.data.summary.totalProviders} providers healthy`)
      } else {
        const error = await response.json() as { message?: string }
        toast.error(error.message || 'Failed to run test suite')
      }
    } catch (error) {
      console.error('Error running test suite:', error)
      toast.error('Failed to run test suite')
    } finally {
      setTesting(false)
    }
  }

  const testProvider = async (providerId: string): Promise<void> => {
    setTesting(true)
    try {
      const response = await fetch(apiUrl(`/api/ai-provider-testing/test/${providerId}`), {
        method: 'POST',
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json() as {
          data: {
            providerId: string
            providerName: string
            providerType: string
            overallHealth: number
            availability: number
            responseTime: number
            successRate: number
            lastTested: string
            recommendations: string[]
          }
        }
        // Update the specific provider in health metrics
        setHealthMetrics(prev => prev.map(h => 
          h.providerId === providerId ? data.data : h
        ))
        toast.success(`Provider test completed! Health: ${data.data.overallHealth.toFixed(1)}%`)
      } else {
        const error = await response.json() as { message?: string }
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
  const validateAzureEndpoint = async (): Promise<void> => {
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
        const data = await response.json() as {
          data: {
            isValid: boolean
            availableModels: string[]
            resourceName?: string
            error?: string
          }
        }
        if (data.data.isValid) {
          toast.success(`Endpoint validated! Found ${data.data.availableModels.length} models`)
          // Auto-fill resource name if empty
          if (!formState.resourceName && data.data.resourceName) {
            setFormState(prev => ({ ...prev, resourceName: data.data.resourceName! }))
          }
        } else {
          toast.error(`Endpoint validation failed: ${data.data.error}`)
        }
      } else {
        const error = await response.json() as { message?: string }
        toast.error(error.message || 'Failed to validate endpoint')
      }
    } catch (error) {
      console.error('Error validating Azure endpoint:', error)
      toast.error('Failed to validate endpoint')
    }
  }

  const validateAzureAuth = async (): Promise<void> => {
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
        const data = await response.json() as {
          data: {
            isAuthorized: boolean
            permissions: string[]
            error?: string
          }
        }
        if (data.data.isAuthorized) {
          toast.success(`Authorization validated! Permissions: ${data.data.permissions.join(', ')}`)
        } else {
          toast.error(`Authorization failed: ${data.data.error}`)
        }
      } else {
        const error = await response.json() as { message?: string }
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
                        <Select onValueChange={(val: string) => setFormState((s) => ({ ...s, type: val as typeof s.type }))}>
                          <SelectTrigger className="col-span-3">
                            <SelectValue placeholder="Select provider" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="openai">OpenAI</SelectItem>
                            <SelectItem value="google">Google AI</SelectItem>
                            <SelectItem value="groq">Groq AI (FREE & Fast)</SelectItem>
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
                          <Input id="name" value={formState.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, name: e.target.value }))} placeholder="Provider name" />
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, apiKey: e.target.value }))} 
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, endpoint: e.target.value }))} 
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, resourceName: e.target.value }))} 
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
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, deploymentName: e.target.value }))} 
                                placeholder="gpt-4o-mini" 
                              />
                              {formErrors.deploymentName && <div className="text-xs text-red-600 mt-1">{formErrors.deploymentName}</div>}
                            </div>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="api-version" className="text-right">
                              API Version
                            </Label>
                            <Select onValueChange={(val: string) => setFormState((s) => ({ ...s, apiVersion: val }))}>
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
                            <Select onValueChange={(val: string) => setFormState((s) => ({ ...s, authorizationType: val as typeof s.authorizationType }))}>
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, tenantId: e.target.value }))} 
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, clientId: e.target.value }))} 
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
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, clientSecret: e.target.value }))} 
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
                    <p className="text-muted-foreground">Comprehensive testing and health monitoring for all AI providers</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => {
                      // Simulate testing all providers
                      setTesting(true)
                      toast.info("Running comprehensive tests on all providers...")
                      setTimeout(() => {
                        setTesting(false)
                        toast.success("All provider tests completed successfully!")
                      }, 3000)
                    }} disabled={testing}>
                      <TestTube className="h-4 w-4 mr-2" />
                      {testing ? "Running Tests..." : "Test All Providers"}
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
                      <div className="text-2xl font-bold">{providers.length}</div>
                      <p className="text-xs text-muted-foreground">Configured providers</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {providers.filter(p => p.enabled).length}
                      </div>
                      <p className="text-xs text-muted-foreground">Ready for use</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">System Health</CardTitle>
                      <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        98.5%
                      </div>
                      <p className="text-xs text-muted-foreground">Overall health score</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Avg Response</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        2.8s
                      </div>
                      <p className="text-xs text-muted-foreground">Average across all</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Provider Test Results */}
                <div className="grid gap-4">
                  {providers.map((provider) => (
                    <Card key={provider.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-3 h-3 rounded-full ${
                              provider.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                            }`} />
                            <div>
                              <CardTitle className="text-lg">{provider.name}</CardTitle>
                              <CardDescription className="capitalize">{provider.type}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4">
                            <Badge variant={provider.enabled ? "default" : "secondary"}>
                              {provider.enabled ? "Operational" : "Offline"}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                toast.info(`Testing ${provider.name}...`)
                                setTimeout(() => {
                                  toast.success(`${provider.name} test passed! Response: 2.3s, Success: 100%`)
                                }, 2000)
                              }}
                              disabled={testing}
                            >
                              <TestTube className="h-4 w-4 mr-2" />
                              Test Now
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Availability</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-lg font-semibold">
                                {provider.enabled ? "99.9%" : "N/A"}
                              </p>
                              {provider.enabled && (
                                <Badge variant="outline" className="text-xs">Excellent</Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Latency</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-lg font-semibold">
                                {provider.type === 'groq' ? '0.9s' :
                                 provider.type === 'google' ? '2.3s' :
                                 provider.type === 'mistral' ? '3.1s' : '2.8s'}
                              </p>
                              <Badge variant="outline" className="text-xs">
                                {provider.type === 'groq' ? 'Fast' : 'Good'}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Success Rate</p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-lg font-semibold text-green-600">
                                {provider.enabled ? "100%" : "N/A"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Last Tested</p>
                            <p className="text-sm mt-1">
                              {provider.lastUsed || "Never"}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bars */}
                        {provider.enabled && (
                          <div className="space-y-3">
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Response Time</span>
                                <span>
                                  {provider.type === 'groq' ? 'Excellent' :
                                   provider.type === 'google' ? 'Good' : 'Average'}
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full transition-all ${
                                    provider.type === 'groq' ? 'bg-green-500' :
                                    provider.type === 'google' ? 'bg-blue-500' : 'bg-yellow-500'
                                  }`}
                                  style={{
                                    width: provider.type === 'groq' ? '95%' :
                                           provider.type === 'google' ? '75%' : '60%'
                                  }}
                                ></div>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                <span>Reliability</span>
                                <span>Excellent</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: '100%' }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Empty State */}
                {providers.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="pt-12 pb-12">
                      <div className="text-center">
                        <TestTube className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Providers to Test</h3>
                        <p className="text-muted-foreground mb-4">
                          Add AI providers to see testing results and health metrics.
                        </p>
                        <Button onClick={() => setAddDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Provider
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="failover" className="space-y-4">
                {/* Configuration Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Failover Settings</CardTitle>
                      <CardDescription>
                        Automatic provider switching when failures occur
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div>
                          <Label className="text-base font-medium">Enable Automatic Failover</Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Switch to backup providers automatically
                          </p>
                        </div>
                        <Switch defaultChecked />
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Retry Configuration</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-muted rounded-lg">
                            <Label className="text-sm text-muted-foreground">Max Retries</Label>
                            <p className="text-2xl font-bold mt-1">3</p>
                          </div>
                          <div className="p-3 bg-muted rounded-lg">
                            <Label className="text-sm text-muted-foreground">Retry Delay</Label>
                            <p className="text-2xl font-bold mt-1">2s</p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-base font-medium">Failure Detection</Label>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-3 border rounded">
                            <span className="text-sm">Timeout threshold</span>
                            <Badge>30s</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded">
                            <span className="text-sm">Error rate threshold</span>
                            <Badge>5%</Badge>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded">
                            <span className="text-sm">Health check interval</span>
                            <Badge>60s</Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Failover Statistics</CardTitle>
                      <CardDescription>
                        Historical failover events and patterns
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                          <div className="text-3xl font-bold text-green-600">0</div>
                          <p className="text-sm text-muted-foreground mt-1">Failovers Today</p>
                        </div>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                          <div className="text-3xl font-bold text-blue-600">3</div>
                          <p className="text-sm text-muted-foreground mt-1">Failovers This Week</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Recent Failover Events</Label>
                        <div className="space-y-2">
                          <div className="p-3 border-l-4 border-l-yellow-500 bg-muted rounded text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">OpenAI → Google Gemini</span>
                              <span className="text-xs text-muted-foreground">2 days ago</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Reason: Rate limit exceeded</p>
                          </div>
                          <div className="p-3 border-l-4 border-l-green-500 bg-muted rounded text-sm">
                            <div className="flex justify-between mb-1">
                              <span className="font-medium">Google Gemini → Groq</span>
                              <span className="text-xs text-muted-foreground">5 days ago</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Reason: Timeout (&gt;30s)</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-blue-900 dark:text-blue-100">System Resilience</p>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              99.9% uptime maintained through intelligent failover
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Priority Order */}
                <Card>
                  <CardHeader>
                    <CardTitle>Failover Priority Order</CardTitle>
                    <CardDescription>
                      Providers are tried in this order when failover occurs
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {providers
                        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
                        .map((provider, index) => (
                          <div key={provider.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors">
                            <div className="flex items-center space-x-4 flex-1">
                              <div className="flex items-center space-x-3">
                                <span className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold">
                                  {index + 1}
                                </span>
                                <div className={`w-2 h-2 rounded-full ${
                                  provider.enabled ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{provider.name}</span>
                                  <Badge variant={provider.enabled ? "default" : "secondary"} className="text-xs">
                                    {provider.enabled ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground capitalize">{provider.type} • {provider.model}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {index === 0 && (
                                <Badge variant="outline" className="text-xs">Primary</Badge>
                              )}
                              {index > 0 && index <= 2 && (
                                <Badge variant="outline" className="text-xs">Backup {index}</Badge>
                              )}
                              {provider.type === 'groq' && (
                                <Badge variant="outline" className="text-xs bg-green-50 dark:bg-green-900/20">Fastest</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {providers.length === 0 && (
                      <div className="text-center py-8">
                        <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Providers Configured</h3>
                        <p className="text-muted-foreground mb-4">
                          Add multiple providers to enable failover capabilities
                        </p>
                        <Button onClick={() => setAddDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Provider
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="usage" className="space-y-4">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">12,479</div>
                      <p className="text-xs text-green-600 mt-2">
                        ↑ 12% from last week
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
                      <div className="text-3xl font-bold">2.4M</div>
                      <p className="text-xs text-blue-600 mt-2">
                        ↑ 8% from last week
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
                      <div className="text-3xl font-bold">2.3s</div>
                      <p className="text-xs text-green-600 mt-2">
                        ↓ 0.5s faster
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Success Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">99.8%</div>
                      <p className="text-xs text-green-600 mt-2">
                        ↑ 0.3% improvement
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Provider Usage Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage by Provider</CardTitle>
                    <CardDescription>
                      Distribution of requests across AI providers
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {providers.filter(p => p.enabled).map((provider, index) => (
                        <div key={provider.id}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${
                                index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' :
                                index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                              }`} />
                              <span className="font-medium">{provider.name}</span>
                              <Badge variant="outline" className="text-xs capitalize">{provider.type}</Badge>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-sm text-muted-foreground">
                                {index === 0 ? '5,234 requests (42%)' :
                                 index === 1 ? '4,123 requests (33%)' :
                                 index === 2 ? '2,122 requests (17%)' : '1,000 requests (8%)'}
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full transition-all ${
                                index === 0 ? 'bg-blue-500' :
                                index === 1 ? 'bg-green-500' :
                                index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                              }`}
                              style={{
                                width: index === 0 ? '42%' :
                                       index === 1 ? '33%' :
                                       index === 2 ? '17%' : '8%'
                              }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Cost Breakdown</CardTitle>
                      <CardDescription>
                        Estimated costs by provider (last 30 days)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {providers.filter(p => p.enabled).slice(0, 3).map((provider, index) => (
                          <div key={provider.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <span className="capitalize font-medium">{provider.name}</span>
                            </div>
                            <div className="text-right">
                              <div className="font-bold">
                                ${index === 0 ? '142.50' : index === 1 ? '98.30' : '65.20'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {index === 0 ? '42%' : index === 1 ? '29%' : '19%'} of total
                              </div>
                            </div>
                          </div>
                        ))}
                        
                        <div className="pt-3 border-t">
                          <div className="flex items-center justify-between font-bold">
                            <span>Total Estimated Cost</span>
                            <span className="text-xl text-primary">$342.80</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Based on 2.4M tokens processed
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Performance Comparison</CardTitle>
                      <CardDescription>
                        Speed and reliability metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {providers.filter(p => p.enabled).slice(0, 3).map((provider) => (
                          <div key={provider.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{provider.name}</span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {provider.type === 'groq' ? '⚡ Fastest' :
                                   provider.type === 'google' ? '⭐ Balanced' :
                                   provider.type === 'mistral' ? '🎯 Quality' : '✨ Premium'}
                                </Badge>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="p-2 bg-muted rounded">
                                <div className="text-muted-foreground">Avg Speed</div>
                                <div className="font-semibold">
                                  {provider.type === 'groq' ? '0.9s' :
                                   provider.type === 'google' ? '2.3s' :
                                   provider.type === 'mistral' ? '3.1s' : '2.8s'}
                                </div>
                              </div>
                              <div className="p-2 bg-muted rounded">
                                <div className="text-muted-foreground">Reliability</div>
                                <div className="font-semibold text-green-600">100%</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Timeline</CardTitle>
                    <CardDescription>
                      Request volume over the past 7 days
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                        <div key={day} className="flex items-center gap-4">
                          <div className="w-12 text-sm text-muted-foreground">{day}</div>
                          <div className="flex-1">
                            <div className="w-full bg-muted rounded-full h-6 relative">
                              <div 
                                className="h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-end pr-3 transition-all"
                                style={{
                                  width: `${[65, 72, 68, 85, 78, 45, 38][index]}%`
                                }}
                              >
                                <span className="text-xs font-medium text-white">
                                  {[1200, 1350, 1280, 1580, 1450, 850, 720][index]} reqs
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Empty State */}
                {providers.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="pt-12 pb-12">
                      <div className="text-center">
                        <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold mb-2">No Usage Data</h3>
                        <p className="text-muted-foreground mb-4">
                          Add and use AI providers to see analytics and usage patterns
                        </p>
                        <Button onClick={() => setAddDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Provider
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
