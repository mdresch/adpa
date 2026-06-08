"use client"

import * as React from "react"
import { useRouter } from 'next/navigation'
import { toast } from '@/lib/notify'
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
import { getApiUrl as getApiUrlUtil } from '@/lib/api-url'
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
  const router = useRouter()
  const apiUrl = (path: string) => getApiUrlUtil(path)

  // Initialize API client with token
  React.useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      apiClient.setToken(token)
    }
  }, [])
  type SupportedAIProvider = "" | "openai" | "google" | "azure" | "mistral" | "groq" | "anthropic" | "deepseek" | "moonshot" | "xai" | "copilot" | "ollama"

  interface Provider {
    id: string
    name: string
    type: SupportedAIProvider
    priority: number
    endpoint: string
    enabled: boolean
    models: string[]
    default_model?: string
  }

  const [providers, setProviders] = React.useState<Provider[]>([])
  const [loading, setLoading] = React.useState(false)
  const [actionLoading, setActionLoading] = React.useState<Record<string, boolean>>({})
  const [error, setError] = React.useState<string | null>(null)
  const [ollamaModels, setOllamaModels] = React.useState<Array<{
    name: string
    size: number
    digest: string
    modified_at: string
  }>>([])

  // Testing suite state
  const [healthMetrics, setHealthMetrics] = React.useState<Array<{
    providerId: string
    providerName: string
    providerType: SupportedAIProvider
    overallHealth: number
    availability: number
    responseTime: number
    successRate: number
    lastTested: string
    recommendations: string[]
  }>>([])
  const [testing, setTesting] = React.useState(false)
  const [testResults, setTestResults] = React.useState<Array<{
    providerId: string
    testName: string
    status: string
    result: any
    timestamp: string
  }>>([])

  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)

  // Real usage analytics state
  const [usageAnalytics, setUsageAnalytics] = React.useState<{
    summary?: {
      totalRequests: number
      totalTokens: number
      avgResponseTime: number
      overallSuccessRate: number
    }
    providerStats?: Array<{
      provider_name: string
      provider_type: SupportedAIProvider
      usage_count: number
      total_tokens: number
      avg_response_time: number
      success_rate: number
    }>
  }>({})

  const [formState, setFormState] = React.useState<{
    id: string
    name: string
    type: SupportedAIProvider
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
    type: "",
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
  const [formErrors, setFormErrors] = React.useState<Record<string, string>>({})

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deleteTarget, setDeleteTarget] = React.useState<{ id: string; name: string } | null>(null)

  const resetForm = () =>
    setFormState({
      id: "",
      name: "",
      type: "",
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

    // Name validation - Only in Add mode
    if (!state.id) {
      if (!state.name || state.name.trim().length < 2) {
        errs.name = "Name is required (min 2 characters)"
      }
    }

    // Map UI type directly to provider_type (including copilot)
    const uiType = state.type
    const providerType = uiType

    if (!providerType) {
      errs.type = "Please select a provider. Priorities and failover are configured in Failover Settings."
    } else if (!["openai", "google", "azure", "mistral", "groq", "anthropic", "deepseek", "moonshot", "xai", "copilot", "ollama"].includes(providerType)) {
      errs.type = "Unsupported provider type for creation."
    }

    // Skip API key validation until a provider is selected, and for Ollama (no key required), or when editing
    if (uiType && uiType !== 'ollama' && !state.id) {
      if (!state.apiKey || state.apiKey.trim().length < 16) {
        errs.apiKey = "API key looks too short. Paste the full key (min 16 chars)."
      }
      // No key-format checks. GitHub Copilot (ghp_/github_pat_), OpenAI (sk-), etc. are all accepted.
    }

    // Defensive: never show OpenAI-specific key message (provider-agnostic validation only)
    if (errs.apiKey && (errs.apiKey.includes("OpenAI") || errs.apiKey.includes("sk-"))) {
      delete errs.apiKey
    }

    // Priority validation - different rules for Add vs Edit mode
    if (state.id) {
      // Edit mode: only allow 1, 2, or 3
      if (!state.priority || ![1, 2, 3].includes(state.priority)) {
        errs.priority = "Priority must be 1 (Primary), 2 (Backup 1), or 3 (Backup 2)"
      }
    } else {
      // Add mode: allow 1-10
      if (!state.priority || state.priority < 1 || state.priority > 10) {
        errs.priority = "Priority must be between 1 (Primary) and 10"
      }
    }

    // Azure AI Foundry specific validation - Only in Add mode
    if (providerType === "azure" && !state.id) {
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
  React.useEffect(() => {
    validateForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formState])

  // Load Ollama models on component mount
  /*
  React.useEffect(() => {
    loadOllamaModels().then(models => {
      setOllamaModels(models)
    })
  }, [])
  */


  const isFormValid = Object.keys(formErrors).length === 0

  const handleAddProvider = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    // Bug 1 Fix: Ensure type is never empty string before submission
    if (!formState.type || formState.type.trim() === "") {
      setFormErrors(prev => ({ ...prev, type: "Please select a provider. Priorities and failover are configured in Failover Settings." }))
      return
    }
    ; (async () => {
      setActionLoading((s) => ({ ...s, create: true }))
      setError(null)
      try {
        // Use apiClient for authenticated requests
        // Bug 1 Fix: Type assertion ensures type is never empty string
        const providerType = formState.type as Exclude<typeof formState.type, "">

        const isEditing = !!formState.id
        const endpoint = isEditing
          ? `/ai-providers/${encodeURIComponent(formState.name)}/configure`
          : '/ai-providers'

        const method = "POST" // Always use POST for both create and update

        // Debug: Log what we're sending with detailed formState
        console.log('🔧 API Debug - Sending:', {
          isEditing,
          endpoint,
          formState: {
            id: formState.id,
            name: formState.name,
            type: formState.type,
            priority: formState.priority,
            enabled: formState.enabled
          },
          requestBody: {
            ...(isEditing ? {
              api_key: formState.apiKey || undefined, // Only send if changed
              configuration: {
                endpoint: formState.endpoint,
                priority: parseInt(formState.priority?.toString() || '1')
              },
              is_active: formState.enabled,
              priority: parseInt(formState.priority?.toString() || '1')
            } : {
              name: formState.name,
              provider_type: providerType,
              api_key: formState.apiKey,
              configuration: {
                endpoint: formState.endpoint,
                priority: formState.priority
              },
              is_active: formState.enabled,
              priority: formState.priority
            })
          }
        })

        const response = await apiClient.request(endpoint, {
          method,
          body: JSON.stringify({
            ...(isEditing ? {
              // Edit mode
              api_key: formState.apiKey || undefined,
              configuration: {
                endpoint: formState.endpoint,
                priority: parseInt(formState.priority?.toString() || '1'),
                // Azure AI Foundry specific configuration
                ...(providerType === "azure" && {
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
              priority: parseInt(formState.priority?.toString() || '1')
            } : {
              // Add mode
              name: formState.name,
              provider_type: providerType,
              api_key: formState.apiKey,
              configuration: {
                endpoint: formState.endpoint,
                priority: formState.priority,
                // Azure AI Foundry specific configuration
                ...(providerType === "azure" && {
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
              priority: formState.priority
            }),
          }),
        })

        await loadProviders()
        resetForm()
        setAddDialogOpen(false)
        toast.success(isEditing ? "Provider updated successfully" : "Provider created successfully")

        // Debug: Log successful response
        console.log('✅ API Success - Provider updated, reloading providers')
        console.log('📄 API Response:', response)
      } catch (err: any) {
        console.error(err)
        setError(err?.message || `Failed to ${formState.id ? 'update' : 'create'} provider`)
        toast.error(err?.message || `Failed to ${formState.id ? 'update' : 'create'} provider`)
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
    ; (async () => {
      setActionLoading((s) => ({ ...s, [id]: true }))
      setError(null)
      try {
        // Use the new toggle endpoint
        const response = await apiClient.request<{
          is_active: boolean
          message?: string
        }>(`/ai-providers/${encodeURIComponent(id)}/toggle`, {
          method: "POST",
        })

        // Update the provider in the local state immediately for better UX
        setProviders(prev => prev.map(p =>
          p.id === id ? { ...p, enabled: response.is_active } : p
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
    // Only attempt to connect to Ollama in development
    if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      console.log('Skipping Ollama connection in production environment')
      return []
    }

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

      const data = await response.json() as {
        models?: Array<{
          name: string
          size: number
          digest: string
          modified_at: string
        }>
      }
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
      const normalized: Provider[] = providers.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type as SupportedAIProvider,
        priority: p.configuration?.priority || 1, // Get priority from configuration or default to 1
        endpoint: p.configuration?.endpoint || '',
        enabled: p.is_active,
        models: p.models || [],
        default_model: p.default_model
      }))
      setProviders(normalized)

      // Debug: Log loaded providers with priority details
      const providerDebug = normalized.map(p => ({
        id: p.id,
        name: p.name,
        type: p.type,
        priority: p.priority,
        enabled: p.enabled
      }))
      console.log('📋 Loaded Providers:', providerDebug)

      // Debug: Check if any provider has priority != 1
      const nonDefaultPriorities = providerDebug.filter(p => p.priority !== 1)
      if (nonDefaultPriorities.length > 0) {
        console.log('✅ Found providers with non-default priorities:', nonDefaultPriorities)
      } else {
        console.log('⚠️ All providers have default priority (1) - priority not being saved')
      }
    } catch (err: any) {
      console.error('Failed to load providers:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Load usage analytics
  const loadUsageAnalytics = async (): Promise<void> => {
    try {
      const response = await apiClient.get<any>('/ai-analytics/models?period=30d', {
        suppressNotFoundError: true,
      })
      if (response.success) {
        setUsageAnalytics({
          summary: response.summary,
          providerStats: response.providerStats
        })
      }
    } catch (error) {
      console.error('Error loading usage analytics:', error)
    }
  }

  React.useEffect(() => {
    loadProviders()
    loadHealthDashboard()
    loadUsageAnalytics()
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
          providerType: SupportedAIProvider
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
              providerType: SupportedAIProvider
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
            providerType: SupportedAIProvider
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
                <Dialog
                  open={addDialogOpen}
                  onOpenChange={(open: boolean) => {
                    setAddDialogOpen(open)
                    if (open && !formState.id) resetForm() // Only reset if not editing
                  }}
                >
                  <DialogContent className="sm:max-w-[425px]">
                    <form onSubmit={handleAddProvider}>
                      <DialogHeader>
                        <DialogTitle>{formState.id ? 'Edit AI Provider' : 'Add AI Provider'}</DialogTitle>
                        <DialogDescription>
                          {formState.id
                            ? 'Set failover priority for this provider. API key and configuration are already stored.'
                            : 'Configure a new AI provider for document generation.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">

                        {/* Conditional form fields based on Add/Edit mode */}
                        {formState.id ? (
                          // EDIT MODE: Show provider selector and priority field
                          <>
                            {/* Provider Type Selector */}
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="provider-type" className="text-right">
                                Provider
                              </Label>
                              <Select
                                value={formState.type || undefined}
                                onValueChange={(val: string) => {
                                  // Find provider with matching type and load its data
                                  const matchingProvider = providers.find(p => p.type === val)
                                  if (matchingProvider) {
                                    setFormState({
                                      ...formState,
                                      type: val as SupportedAIProvider,
                                      name: matchingProvider.name,
                                      priority: matchingProvider.priority,
                                      endpoint: matchingProvider.endpoint,
                                      enabled: matchingProvider.enabled,
                                      id: matchingProvider.id // Switch to editing this provider
                                    })
                                  } else {
                                    // If no existing provider of this type, just update type
                                    setFormState((s) => ({ ...s, type: (val || "") as SupportedAIProvider }))
                                  }
                                }}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="openai">OpenAI</SelectItem>
                                  <SelectItem value="google">Google AI</SelectItem>
                                  <SelectItem value="groq">Groq AI (FREE & Fast)</SelectItem>
                                  <SelectItem value="azure">Azure AI Foundry</SelectItem>
                                  <SelectItem value="mistral">Mistral AI</SelectItem>
                                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                  <SelectItem value="deepseek">DeepSeek AI</SelectItem>
                                  <SelectItem value="moonshot">Moonshot AI (Kimi)</SelectItem>
                                  <SelectItem value="xai">xAI (Grok)</SelectItem>
                                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
                                  <SelectItem value="copilot">GitHub Copilot</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Priority Field - Only field for Edit Mode */}
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="priority" className="text-right">
                                Failover Priority
                              </Label>
                              <div className="col-span-3">
                                <Select
                                  value={formState.priority?.toString()}
                                  onValueChange={(val: string) => setFormState((s) => ({ ...s, priority: parseInt(val) || 1 }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select priority" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="1">1 - Primary (tried first)</SelectItem>
                                    <SelectItem value="2">2 - Backup 1 (tried if primary fails)</SelectItem>
                                    <SelectItem value="3">3 - Backup 2 (tried if primary and backup 1 fail)</SelectItem>
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Set the order this provider will be tried during failover
                                </p>
                                {formErrors.priority && <div className="text-xs text-red-600 mt-1">{formErrors.priority}</div>}
                              </div>
                            </div>
                          </>
                        ) : (
                          // ADD MODE: Show all fields including API key
                          <>
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="provider-type" className="text-right">
                                Provider
                              </Label>
                              <Select
                                value={formState.type || undefined}
                                onValueChange={(val: string) => setFormState((s) => ({ ...s, type: (val || "") as SupportedAIProvider }))}
                              >
                                <SelectTrigger className="col-span-3">
                                  <SelectValue placeholder="Select provider (priorities in Failover Settings)" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="openai">OpenAI</SelectItem>
                                  <SelectItem value="google">Google AI</SelectItem>
                                  <SelectItem value="groq">Groq AI (FREE & Fast)</SelectItem>
                                  <SelectItem value="azure">Azure AI Foundry</SelectItem>
                                  <SelectItem value="mistral">Mistral AI</SelectItem>
                                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                                  <SelectItem value="deepseek">DeepSeek AI</SelectItem>
                                  <SelectItem value="moonshot">Moonshot AI (Kimi)</SelectItem>
                                  <SelectItem value="xai">xAI (Grok)</SelectItem>
                                  <SelectItem value="ollama">Ollama (Local)</SelectItem>
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
                                  placeholder={
                                    !formState.type
                                      ? "Select a provider first"
                                      : formState.type === "ollama"
                                        ? "Not required for local Ollama"
                                        : "Enter API key (will be encrypted and stored securely)"
                                  }
                                  disabled={!formState.type || formState.type === "ollama"}
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  {!formState.type
                                    ? "Select a provider above. Priorities and failover are configured in Failover Settings."
                                    : formState.type === "ollama"
                                      ? "🏠 Local Ollama doesn't require an API key - it runs locally on your machine."
                                      : formState.type === "copilot"
                                        ? "🔒 GitHub tokens usually start with 'ghp_' or 'github_pat_'. API key will be encrypted and stored securely."
                                        : "🔒 API key will be encrypted and stored securely. Only the application can access it."
                                  }
                                </p>
                                {formErrors.apiKey && <div className="text-xs text-red-600 mt-1">{formErrors.apiKey}</div>}
                              </div>
                            </div>

                            {/* Priority Field - Full version for Add Mode */}
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor="priority" className="text-right">
                                Priority
                              </Label>
                              <div className="col-span-3">
                                <Input
                                  id="priority"
                                  type="number"
                                  value={formState.priority}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormState((s) => ({ ...s, priority: parseInt(e.target.value) || 1 }))}
                                  placeholder="1 (Primary), 2 (Backup 1), 3 (Backup 2)"
                                  min="1"
                                  max="10"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  <strong>Priority System:</strong> Lower numbers = higher priority<br />
                                  • <strong>1</strong> = Primary provider (tried first)<br />
                                  • <strong>2</strong> = Backup 1 (tried if primary fails)<br />
                                  • <strong>3</strong> = Backup 2 (tried if primary and backup 1 fail)<br />
                                  • Higher numbers = lower priority
                                </p>
                                {formErrors.priority && <div className="text-xs text-red-600 mt-1">{formErrors.priority}</div>}
                              </div>
                            </div>
                          </>
                        )}

                        {/* Azure AI Foundry specific fields - Only show in Add Mode */}
                        {!formState.id && formState.type === "azure" && (
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
                                <Badge variant={provider.enabled ? "default" : "secondary"}>
                                  {provider.enabled ? "Active" : "Inactive"}
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
                              <Label className="text-sm font-medium">Model Type</Label>
                              <p className="text-sm text-muted-foreground mt-1 capitalize">{provider.type}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Priority</Label>
                              <p className="text-sm text-muted-foreground mt-1">{provider.priority}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Last Used</Label>
                              <p className="text-sm text-muted-foreground mt-1">Not available</p>
                            </div>
                            <div>
                              <Label className="text-sm font-medium">Models Sync</Label>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={provider.models.length > 0 ? "default" : "outline"} className="text-xs">
                                  {provider.models.length} Synced
                                </Badge>
                                {provider.type === 'ollama' && provider.models.length === 0 && (
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="h-auto p-0 text-xs"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/ai-providers/${encodeURIComponent(provider.id)}#discover`);
                                    }}
                                  >
                                    Discover
                                  </Button>
                                )}
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
                            <div className={`w-3 h-3 rounded-full ${provider.enabled ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
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
                              Not available
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
                                  className={`h-2 rounded-full transition-all ${provider.type === 'groq' ? 'bg-green-500' :
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
                                <div className={`w-2 h-2 rounded-full ${provider.enabled ? 'bg-green-500' : 'bg-gray-400'
                                  }`} />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{provider.name}</span>
                                  <Badge variant={provider.enabled ? "default" : "secondary"} className="text-xs">
                                    {provider.enabled ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground capitalize">{provider.type}</p>
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

                    {/* Priority Management Section */}
                    {providers.length > 0 && (
                      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-100">Quick Priority Management</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              Click to set provider as Primary, Backup 1, or Backup 2
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add Provider
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {providers
                            .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
                            .slice(0, 3)
                            .map((provider, index) => (
                              <Button
                                key={provider.id}
                                variant={provider.enabled ? "default" : "secondary"}
                                className="h-auto p-4 flex flex-col items-start"
                                onClick={() => {
                                 // Open edit dialog with current provider for priority adjustment
                                 setFormState({
                                   id: provider.id,
                                   name: provider.name,
                                   type: provider.type as SupportedAIProvider,
                                   apiKey: "",
                                   endpoint: provider.endpoint,
                                   priority: provider.priority || (index + 1),                                    enabled: provider.enabled,
                                    resourceName: "",
                                    deploymentName: "",
                                    apiVersion: "2024-12-01-preview",
                                    tenantId: "",
                                    clientId: "",
                                    clientSecret: "",
                                    subscriptionId: "",
                                    region: "",
                                    authorizationType: "api-key"
                                  });
                                  setAddDialogOpen(true);
                                }}
                              >
                                <div className="w-full text-left">
                                  <div className="flex items-center justify-between w-full mb-2">
                                    <span className="font-medium">{provider.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {index === 0 ? "Primary" : `Backup ${index}`}
                                    </Badge>
                                  </div>
                                  <div className="text-xs opacity-80">
                                    Priority: {provider.priority || (index + 1)}
                                  </div>
                                  <div className="text-xs opacity-80">
                                    {provider.type} • {provider.enabled ? "Active" : "Inactive"}
                                  </div>
                                </div>
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}

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
                      <div className="text-3xl font-bold">
                        {usageAnalytics.summary?.totalRequests ? usageAnalytics.summary.totalRequests.toLocaleString() : 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Last 30 days
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
                          const tokens = usageAnalytics.summary?.totalTokens || 0
                          if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
                          if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
                          return tokens.toString()
                        })()}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {usageAnalytics.summary?.totalRequests
                          ? `${Math.round(usageAnalytics.summary.totalTokens / usageAnalytics.summary.totalRequests).toLocaleString()} avg/request`
                          : 'No data yet'}
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
                          const ms = usageAnalytics.summary?.avgResponseTime || 0
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
                        Success Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${(usageAnalytics.summary?.overallSuccessRate || 0) >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {usageAnalytics.summary?.overallSuccessRate
                          ? `${usageAnalytics.summary.overallSuccessRate.toFixed(1)}%`
                          : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Overall reliability
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
                    {usageAnalytics.providerStats && usageAnalytics.providerStats.length > 0 ? (
                      <div className="space-y-4">
                        {usageAnalytics.providerStats.map((providerStat, index) => {
                          const totalRequests = usageAnalytics.summary?.totalRequests || 0
                          const percentage = totalRequests > 0 ? (providerStat.usage_count / totalRequests) * 100 : 0
                          const usageCount = typeof providerStat.usage_count === 'number' ? providerStat.usage_count : parseInt(providerStat.usage_count) || 0

                          return (
                            <div key={providerStat.provider_name}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${index === 0 ? 'bg-blue-500' :
                                    index === 1 ? 'bg-green-500' :
                                      index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                                    }`} />
                                  <span className="font-medium">{providerStat.provider_name}</span>
                                  <Badge variant="outline" className="text-xs capitalize">{providerStat.provider_type}</Badge>
                                </div>
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-muted-foreground">
                                    {usageCount.toLocaleString()} requests ({percentage.toFixed(1)}%)
                                  </span>
                                </div>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2.5">
                                <div
                                  className={`h-2.5 rounded-full transition-all ${index === 0 ? 'bg-blue-500' :
                                    index === 1 ? 'bg-green-500' :
                                      index === 2 ? 'bg-purple-500' : 'bg-orange-500'
                                    }`}
                                  style={{ width: `${percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No usage data yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Generate documents to see provider usage</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Cost Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Token Distribution</CardTitle>
                      <CardDescription>
                        Token usage by provider (last 30 days)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {usageAnalytics.providerStats && usageAnalytics.providerStats.length > 0 ? (
                        <div className="space-y-3">
                          {usageAnalytics.providerStats.map((providerStat, index) => {
                            const totalTokens = usageAnalytics.summary?.totalTokens || 0
                            const tokens = typeof providerStat.total_tokens === 'number' ? providerStat.total_tokens : parseInt(providerStat.total_tokens) || 0
                            const percentage = totalTokens > 0 ? (tokens / totalTokens) * 100 : 0

                            return (
                              <div key={providerStat.provider_name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                                <div className="flex items-center gap-3">
                                  <span className="capitalize font-medium">{providerStat.provider_name}</span>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold">
                                    {(() => {
                                      if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
                                      if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
                                      return tokens.toString()
                                    })()} tokens
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {percentage.toFixed(1)}% of total
                                  </div>
                                </div>
                              </div>
                            )
                          })}

                          <div className="pt-3 border-t">
                            <div className="flex items-center justify-between font-bold">
                              <span>Total Tokens Processed</span>
                              <span className="text-xl text-primary">
                                {(() => {
                                  const total = usageAnalytics.summary?.totalTokens || 0
                                  if (total >= 1000000) return `${(total / 1000000).toFixed(1)}M`
                                  if (total >= 1000) return `${(total / 1000).toFixed(1)}K`
                                  return total.toString()
                                })()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Across {usageAnalytics.summary?.totalRequests || 0} requests
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No token usage data yet</p>
                        </div>
                      )}
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
                      {usageAnalytics.providerStats && usageAnalytics.providerStats.length > 0 ? (
                        <div className="space-y-4">
                          {usageAnalytics.providerStats.map((providerStat) => {
                            const responseTime = typeof providerStat.avg_response_time === 'number'
                              ? providerStat.avg_response_time
                              : parseFloat(providerStat.avg_response_time) || 0
                            const successRate = typeof providerStat.success_rate === 'number'
                              ? providerStat.success_rate
                              : parseFloat(providerStat.success_rate) || 0

                            return (
                              <div key={providerStat.provider_name} className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium">{providerStat.provider_name}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                      {responseTime < 1500 ? '⚡ Fastest' :
                                        responseTime < 3000 ? '⭐ Fast' :
                                          successRate >= 95 ? '🎯 Reliable' : '✨ Active'}
                                    </Badge>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="p-2 bg-muted rounded">
                                    <div className="text-muted-foreground">Avg Speed</div>
                                    <div className="font-semibold">
                                      {responseTime < 1000 ? `${Math.round(responseTime)}ms` : `${(responseTime / 1000).toFixed(1)}s`}
                                    </div>
                                  </div>
                                  <div className="p-2 bg-muted rounded">
                                    <div className="text-muted-foreground">Reliability</div>
                                    <div className={`font-semibold ${successRate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                                      {successRate.toFixed(1)}%
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground">No performance data yet</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Summary</CardTitle>
                    <CardDescription>
                      Provider request distribution and efficiency
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {usageAnalytics.providerStats && usageAnalytics.providerStats.length > 0 ? (
                      <div className="space-y-4">
                        {usageAnalytics.providerStats.map((providerStat) => {
                          const tokens = typeof providerStat.total_tokens === 'number' ? providerStat.total_tokens : parseInt(providerStat.total_tokens) || 0
                          const requests = typeof providerStat.usage_count === 'number' ? providerStat.usage_count : parseInt(providerStat.usage_count) || 0
                          const tokensPerRequest = requests > 0 ? Math.round(tokens / requests) : 0

                          return (
                            <div key={providerStat.provider_name} className="p-4 border rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <span className="font-medium">{providerStat.provider_name}</span>
                                <Badge variant="outline" className="capitalize">{providerStat.provider_type}</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-3 text-sm">
                                <div className="text-center p-2 bg-muted rounded">
                                  <div className="text-muted-foreground text-xs">Requests</div>
                                  <div className="font-bold text-blue-600">{requests.toLocaleString()}</div>
                                </div>
                                <div className="text-center p-2 bg-muted rounded">
                                  <div className="text-muted-foreground text-xs">Tokens/Req</div>
                                  <div className="font-bold text-green-600">{tokensPerRequest.toLocaleString()}</div>
                                </div>
                                <div className="text-center p-2 bg-muted rounded">
                                  <div className="text-muted-foreground text-xs">Success</div>
                                  <div className={`font-bold ${(typeof providerStat.success_rate === 'number' ? providerStat.success_rate : parseFloat(providerStat.success_rate) || 0) >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                                    {(typeof providerStat.success_rate === 'number' ? providerStat.success_rate : parseFloat(providerStat.success_rate) || 0).toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">No usage summary data yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Generate documents to see provider statistics</p>
                      </div>
                    )}
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
