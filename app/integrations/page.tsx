"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { Settings, Plus, TestTube, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Cloud, Loader2 } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export default function Integrations() {
  const { user } = useAuth()

  // Confluence configuration state
  const [confluenceConfig, setConfluenceConfig] = useState({
    baseUrl: "https://cba-adpa.atlassian.net",
    defaultSpace: "DOCS",
    username: "",
    apiToken: "",
    oauthClientId: "",
    oauthClientSecret: "",
    autoPublish: true,
    syncOnUpdate: false,
    createProjectsForSpaces: true,
  })

  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [existingIntegration, setExistingIntegration] = useState<any>(null)
  const [integrations, setIntegrations] = useState<any[]>([])
  const [realIntegrations, setRealIntegrations] = useState<any[]>([])
  const [allIntegrations, setAllIntegrations] = useState<any[]>([])

  // SharePoint configuration state
  const [sharepointConfig, setSharepointConfig] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    defaultSiteId: "",
    syncEnabled: true,
    autoSync: false,
    syncInterval: 60,
  })

  // Load existing integrations on component mount
  useEffect(() => {
    loadExistingIntegrations()
  }, [])

  const loadExistingIntegrations = async () => {
    try {
      setLoading(true)
      console.log("Loading integrations from backend...")
      const response = await apiClient.getIntegrations()
      const backendIntegrations = response.integrations || response // Handle both formats
      console.log("Backend integrations:", backendIntegrations)

      // Handle case where API returns non-array data
      if (!Array.isArray(backendIntegrations)) {
        console.error("Backend integrations is not an array:", backendIntegrations)
        setRealIntegrations([])
        setAllIntegrations([])
        setIntegrations([
          {
            id: "sharepoint-default",
            name: "Microsoft SharePoint",
            type: "sharepoint",
            status: "not_configured",
            enabled: false,
            baseUrl: "",
            lastSync: "Never",
            documentsPublished: 0,
            authType: "Azure AD",
            sites: [],
          }
        ])
        return
      }

      setRealIntegrations(backendIntegrations)
      setAllIntegrations(backendIntegrations)

      // Process integrations for display
      const processedIntegrations = backendIntegrations.map((integration: any) => {
        const baseIntegration = {
          id: integration.id,
          name: integration.name,
          type: integration.type,
          status: integration.is_active ? "connected" : "disconnected",
          enabled: integration.is_active,
          lastSync: integration.last_sync ? formatRelativeTime(integration.last_sync) : "Never",
          documentsPublished: 0, // TODO: Get from backend
        }

        switch (integration.type) {
          case "confluence":
            return {
              ...baseIntegration,
              baseUrl: integration.configuration?.base_url || "",
              authType: "API Token",
              spaces: integration.configuration?.spaces || [],
            }
          case "sharepoint":
            return {
              ...baseIntegration,
              baseUrl: integration.configuration?.tenant_id ? `https://${integration.configuration.tenant_id}.sharepoint.com` : "",
              authType: "Azure AD",
              sites: integration.configuration?.sites || [],
            }
          default:
            return baseIntegration
        }
      })

      // Add default integrations if they don't exist
      const defaultIntegrations = [
        {
          id: "confluence-default",
          name: "Atlassian Confluence",
          type: "confluence",
          status: "not_configured",
          enabled: false,
          baseUrl: "",
          lastSync: "Never",
          documentsPublished: 0,
          authType: "API Token",
          spaces: [],
        },
        {
          id: "sharepoint-default",
          name: "Microsoft SharePoint",
          type: "sharepoint",
          status: "not_configured",
          enabled: false,
          baseUrl: "",
          lastSync: "Never",
          documentsPublished: 0,
          authType: "Azure AD",
          sites: [],
        },
      ]

      const finalIntegrations = [...processedIntegrations]
      defaultIntegrations.forEach(defaultInt => {
        if (!processedIntegrations.find(i => i.type === defaultInt.type)) {
          finalIntegrations.push(defaultInt)
        }
      })

      setIntegrations(finalIntegrations)
      console.log("Final integrations for display:", finalIntegrations)

      // Load specific configurations
      const confluenceIntegration = backendIntegrations.find((i: any) => i.type === "confluence")
      const sharepointIntegration = backendIntegrations.find((i: any) => i.type === "sharepoint")
      if (confluenceIntegration) {
        setExistingIntegration(confluenceIntegration)
        const config = confluenceIntegration.configuration || {}
        setConfluenceConfig(prev => ({
          ...prev,
          baseUrl: config.base_url || prev.baseUrl,
          defaultSpace: config.target_space_key || prev.defaultSpace,
          username: "", // Credentials are encrypted and not returned
          apiToken: "", // Credentials are encrypted and not returned
          oauthClientId: config.oauth_client_id || "",
          oauthClientSecret: config.oauth_client_secret || "",
          autoPublish: config.auto_publish !== undefined ? config.auto_publish : prev.autoPublish,
          syncOnUpdate: config.sync_on_update !== undefined ? config.sync_on_update : prev.syncOnUpdate,
          createProjectsForSpaces: config.create_projects_for_spaces !== undefined ? config.create_projects_for_spaces : prev.createProjectsForSpaces,
        }))
      }

      if (sharepointIntegration) {
        const config = sharepointIntegration.configuration || {}
        setSharepointConfig(prev => ({
          ...prev,
          tenantId: config.tenant_id || "",
          clientId: config.client_id || "",
          clientSecret: config.client_secret || "",
          defaultSiteId: config.default_site_id || "",
          syncEnabled: config.sync_enabled !== undefined ? config.sync_enabled : prev.syncEnabled,
          autoSync: config.auto_sync !== undefined ? config.auto_sync : prev.autoSync,
          syncInterval: config.sync_interval || prev.syncInterval,
        }))
      }
    } catch (error) {
      console.error("Failed to load integrations:", error)
      toast.error("Failed to load existing integrations")
    } finally {
      setLoading(false)
    }
  }

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  // Handler functions
  const handleConfluenceConfigChange = (field: string, value: any) => {
    setConfluenceConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const testConfluenceConnection = async () => {
    setTesting(true)
    try {
      // Get auth token
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error("Please login first")
        return
      }

      console.log("Testing connection with:", {
        baseUrl: confluenceConfig.baseUrl,
        username: confluenceConfig.username,
        apiTokenLength: confluenceConfig.apiToken.length,
        apiTokenStart: confluenceConfig.apiToken.substring(0, 10) + "...",
      })

      const response = await fetch("/api/integrations/confluence/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          baseUrl: confluenceConfig.baseUrl,
          username: confluenceConfig.username,
          apiToken: confluenceConfig.apiToken,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        toast.success("Connection successful! ✅")
      } else {
        const errorMessage = data.error || data.message || "Connection failed"
        toast.error(`Connection failed: ${errorMessage}`)
        console.error("Connection test failed:", data)
      }
    } catch (error) {
      console.error("Connection test failed:", error)
      toast.error("Connection test failed - please check your network connection")
    } finally {
      setTesting(false)
    }
  }

  const saveConfluenceConfiguration = async () => {
    setSaving(true)
    try {
      const configData = {
        name: "Confluence",
        type: "confluence",
        configuration: {
          base_url: confluenceConfig.baseUrl,
          target_space_key: confluenceConfig.defaultSpace,
          oauth_client_id: confluenceConfig.oauthClientId,
          oauth_client_secret: confluenceConfig.oauthClientSecret,
          auto_publish: confluenceConfig.autoPublish,
          sync_on_update: confluenceConfig.syncOnUpdate,
          create_projects_for_spaces: confluenceConfig.createProjectsForSpaces,
        },
        credentials: {
          username: confluenceConfig.username,
          api_token: confluenceConfig.apiToken,
        },
        is_active: true,
      }

      let response
      if (existingIntegration) {
        // Update existing integration
        response = await apiClient.updateIntegration(existingIntegration.id, configData)
        toast.success("Configuration updated successfully! ✅")
      } else {
        // Create new integration
        response = await apiClient.createIntegration(configData)
        toast.success("Configuration saved successfully! ✅")
      }

      // Reload integrations to get the latest data
      await loadExistingIntegrations()

    } catch (error) {
      console.error("Failed to save configuration:", error)
      const errorMessage = error.message || "Failed to save configuration"
      toast.error(`Save failed: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // SharePoint handlers
  const handleSharepointConfigChange = (field: string, value: any) => {
    console.log("SharePoint config change:", field, value)
    setSharepointConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const testSharepointConnection = async () => {
    console.log("Testing SharePoint connection...")
    setTesting(true)
    try {
      console.log("SharePoint config:", {
        tenantId: sharepointConfig.tenantId ? "***" : "empty",
        clientId: sharepointConfig.clientId ? "***" : "empty",
        clientSecret: sharepointConfig.clientSecret ? "***" : "empty"
      })

      // Get auth token for test connection
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch("/api/integrations/sharepoint/test", {
        method: "POST",
        headers,
        body: JSON.stringify({
          tenantId: sharepointConfig.tenantId,
          clientId: sharepointConfig.clientId,
          clientSecret: sharepointConfig.clientSecret,
        }),
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", response.headers)
      console.log("Response URL:", response.url)

      if (!response.ok) {
        const text = await response.text()
        console.log("Error response text:", text)
        console.log("Full response:", response)
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      const data = await response.json()
      console.log("Response data:", data)

      if (data.success) {
        toast.success(`SharePoint connection successful! Found ${data.sitesFound || 0} sites ✅`)
      } else {
        const errorMessage = data.error || data.message || "Connection failed"
        toast.error(`SharePoint connection failed: ${errorMessage}`)
        console.error("SharePoint connection test failed:", data)
      }
    } catch (error: any) {
      console.error("SharePoint connection test failed:", error)
      toast.error(`Connection test failed: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const saveSharepointConfiguration = async () => {
    console.log("Saving SharePoint configuration...")
    setSaving(true)
    try {
      // Check authentication
      const token = localStorage.getItem('token')
      console.log("Auth token present:", !!token)
      console.log("API Client token present:", !!(apiClient as any).token)

      if (!token) {
        toast.error("Please log in to save configuration")
        setSaving(false)
        return
      }

      // Decode token to check user info (for debugging)
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]))
        console.log("Token payload:", {
          userId: tokenPayload.userId,
          exp: new Date(tokenPayload.exp * 1000),
          isExpired: Date.now() >= tokenPayload.exp * 1000
        })

        if (Date.now() >= tokenPayload.exp * 1000) {
          toast.error("Session expired. Please log in again.")
          setSaving(false)
          return
        }
      } catch (e) {
        console.error("Invalid token format:", e)
        toast.error("Invalid session. Please log in again.")
        setSaving(false)
        return
      }

      // Ensure API client has the token
      if (!(apiClient as any).token) {
        console.log("Setting token in API client...")
        ;(apiClient as any).setToken(token)
      }
      const configData = {
        name: "SharePoint",
        type: "sharepoint",
        configuration: {
          tenant_id: sharepointConfig.tenantId,
          client_id: sharepointConfig.clientId,
          client_secret: sharepointConfig.clientSecret,
          default_site_id: sharepointConfig.defaultSiteId,
          sync_enabled: sharepointConfig.syncEnabled,
          auto_sync: sharepointConfig.autoSync,
          sync_interval: sharepointConfig.syncInterval,
        },
        credentials: {
          tenant_id: sharepointConfig.tenantId,
          client_id: sharepointConfig.clientId,
          client_secret: sharepointConfig.clientSecret,
        },
        is_active: true,
      }

      console.log("Config data:", {
        ...configData,
        configuration: {
          ...configData.configuration,
          client_secret: configData.configuration.client_secret ? "***" : "empty"
        }
      })

      const existingSharepointIntegration = realIntegrations.find(i => i.type === "sharepoint")
      console.log("Existing integration:", existingSharepointIntegration?.id || "none")

      if (existingSharepointIntegration) {
        console.log("Updating existing integration...")
        console.log("API Client token present:", !!(apiClient as any).token)
        await apiClient.updateIntegration(existingSharepointIntegration.id, configData)
        toast.success("SharePoint configuration updated successfully! ✅")
      } else {
        console.log("Creating new integration...")
        console.log("API Client token present:", !!(apiClient as any).token)
        await apiClient.createIntegration(configData)
        toast.success("SharePoint configuration saved successfully! ✅")
      }

      console.log("Reloading integrations...")
      await loadExistingIntegrations()

    } catch (error) {
      console.error("Failed to save SharePoint configuration:", error)
      const errorMessage = error.message || error.toString() || "Failed to save configuration"
      toast.error(`Save failed: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // Overview tab handlers
  const handleTestIntegration = async (integration: any) => {
    console.log("Testing integration:", integration.name, integration.type)
    if (integration.type === "confluence") {
      await testConfluenceConnection()
    } else if (integration.type === "sharepoint") {
      await testSharepointConnection()
    } else {
      toast.info(`Testing for ${integration.name} not yet implemented`)
    }
  }

  const handleSyncIntegration = async (integration: any) => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        toast.error("Please login first")
        return
      }

      if (integration.type === "confluence") {
        const response = await fetch(`/api/integrations/confluence/${integration.id}/sync`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        })
        const data = await response.json()
        if (data.success) {
          toast.success(`Confluence sync completed: ${data.syncedDocuments} documents`)
        } else {
          toast.error(`Confluence sync failed: ${data.error}`)
        }
      } else if (integration.type === "sharepoint") {
        const response = await fetch(`/api/integrations/sharepoint/${integration.id}/sync`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
        const data = await response.json()
        if (data.success) {
          toast.success(`SharePoint sync completed: ${data.syncedFiles} files`)
        } else {
          toast.error(`SharePoint sync failed: ${data.error}`)
        }
      } else {
        toast.info(`Sync for ${integration.name} not yet implemented`)
      }

      await loadExistingIntegrations()
    } catch (error) {
      console.error("Sync failed:", error)
      toast.error("Sync failed - please check your connection")
    }
  }

  const handleToggleIntegration = async (integration: any, enabled: boolean) => {
    console.log("Toggling integration:", integration.name, "to", enabled)
    try {
      const realIntegration = realIntegrations.find(i => i.id === integration.id)
      console.log("Real integration found:", realIntegration?.id || "none")

      if (realIntegration) {
        const updateData = {
          ...realIntegration,
          is_active: enabled
        }
        console.log("Updating with data:", updateData)

        await apiClient.updateIntegration(integration.id, updateData)
        toast.success(`${integration.name} ${enabled ? 'enabled' : 'disabled'}`)
        await loadExistingIntegrations()
      } else {
        console.error("Real integration not found for:", integration.id)
        toast.error("Integration not found")
      }
    } catch (error) {
      console.error("Failed to toggle integration:", error)
      toast.error(`Failed to update integration status: ${error.message}`)
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
                <h1 className="text-3xl font-bold">Integrations</h1>
                <p className="text-muted-foreground">Manage connections to external systems and services</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Add Integration</DialogTitle>
                    <DialogDescription>Connect ADPA to an external system or service.</DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="integration-type" className="text-right">
                        Type
                      </Label>
                      <select className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">Select integration type</option>
                        <option value="confluence">Atlassian Confluence</option>
                        <option value="sharepoint">Microsoft SharePoint</option>
                        <option value="adobe">Adobe Document Services</option>
                        <option value="github">GitHub</option>
                        <option value="gitlab">GitLab</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="name" className="text-right">
                        Name
                      </Label>
                      <Input id="name" placeholder="Integration name" className="col-span-3" />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="base-url" className="text-right">
                        Base URL
                      </Label>
                      <Input id="base-url" placeholder="https://..." className="col-span-3" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Integration</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="confluence">Confluence</TabsTrigger>
                <TabsTrigger value="sharepoint">SharePoint</TabsTrigger>
                <TabsTrigger value="adobe">Adobe</TabsTrigger>
                <TabsTrigger value="vcs">Version Control</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                {/* Debug Info - Remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <Card className="bg-gray-50 border-dashed">
                    <CardHeader>
                      <CardTitle className="text-sm">Debug Info</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs">
                      <p>Integrations loaded: {integrations.length}</p>
                      <p>Real integrations: {realIntegrations.length}</p>
                      <p>Loading: {loading.toString()}</p>
                      <p>SharePoint config: {JSON.stringify({
                        tenantId: sharepointConfig.tenantId ? "***" : "empty",
                        clientId: sharepointConfig.clientId ? "***" : "empty",
                        clientSecret: sharepointConfig.clientSecret ? "***" : "empty"
                      })}</p>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4">
                  {integrations.map((integration) => (
                    <Card key={integration.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                              <ExternalLink className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="flex items-center space-x-2">
                                <span>{integration.name}</span>
                                <Badge
                                  variant={
                                    integration.status === "connected"
                                      ? "default"
                                      : integration.status === "warning"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                >
                                  {integration.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription>
                                {integration.baseUrl} • Last sync: {integration.lastSync}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={integration.enabled}
                              onCheckedChange={(checked) => handleToggleIntegration(integration, checked)}
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log("Test button clicked for:", integration.name)
                                handleTestIntegration(integration)
                              }}
                              disabled={!integration.enabled || integration.status === "not_configured"}
                              title={`Test ${integration.name} connection`}
                            >
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log("Sync button clicked for:", integration.name)
                                handleSyncIntegration(integration)
                              }}
                              disabled={!integration.enabled || integration.status !== "connected"}
                              title={`Sync ${integration.name} documents`}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            {integration.type === "confluence" ? (
                              <Link href="/integrations/confluence">
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </Link>
                            ) : integration.type === "sharepoint" ? (
                              <Link href="/integrations/sharepoint">
                                <Button variant="ghost" size="sm">
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </Link>
                            ) : (
                              <Button variant="ghost" size="sm">
                                <Settings className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Authentication</Label>
                            <p className="text-sm text-muted-foreground mt-1">{integration.authType}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Documents Published</Label>
                            <p className="text-sm text-muted-foreground mt-1">{integration.documentsPublished}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Status</Label>
                            <div className="flex items-center space-x-1 mt-1">
                              {integration.status === "connected" ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-yellow-500" />
                              )}
                              <span className="text-sm capitalize">{integration.status}</span>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Available Resources</Label>
                            <p className="text-sm text-muted-foreground mt-1">
                              {integration.spaces?.join(", ") ||
                                integration.sites?.join(", ") ||
                                integration.services?.join(", ") ||
                                integration.repositories?.join(", ")}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="confluence" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Confluence Configuration</CardTitle>
                    <CardDescription>
                      Configure Atlassian Confluence integration for document publishing and synchronization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading configuration...</span>
                      </div>
                    ) : (
                      <>
                    {/* Basic Configuration */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Basic Configuration</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="confluence-url">Confluence Base URL</Label>
                          <Input
                            id="confluence-url"
                            placeholder="https://your-domain.atlassian.net"
                            value={confluenceConfig.baseUrl}
                            onChange={(e) => handleConfluenceConfigChange('baseUrl', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confluence-space">Default Space Key</Label>
                          <Input
                            id="confluence-space"
                            placeholder="DOCS"
                            value={confluenceConfig.defaultSpace}
                            onChange={(e) => handleConfluenceConfigChange('defaultSpace', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Authentication */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Authentication</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="confluence-username">Username/Email</Label>
                          <Input
                            id="confluence-username"
                            placeholder="your-email@company.com"
                            type="email"
                            value={confluenceConfig.username}
                            onChange={(e) => handleConfluenceConfigChange('username', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confluence-token">API Token</Label>
                          <Input
                            id="confluence-token"
                            type="password"
                            placeholder="Your Confluence API token"
                            value={confluenceConfig.apiToken}
                            onChange={(e) => handleConfluenceConfigChange('apiToken', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Generate an API token from your Atlassian account settings.
                        <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                          Learn more
                        </a>
                      </div>
                    </div>

                    {/* OAuth2 Configuration (Alternative) */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">OAuth2 Configuration (Alternative)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="oauth-client-id">Client ID</Label>
                          <Input
                            id="oauth-client-id"
                            placeholder="OAuth2 Client ID"
                            value={confluenceConfig.oauthClientId}
                            onChange={(e) => handleConfluenceConfigChange('oauthClientId', e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="oauth-client-secret">Client Secret</Label>
                          <Input
                            id="oauth-client-secret"
                            type="password"
                            placeholder="OAuth2 Client Secret"
                            value={confluenceConfig.oauthClientSecret}
                            onChange={(e) => handleConfluenceConfigChange('oauthClientSecret', e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        OAuth2 is recommended for production environments. Use API tokens for development and testing.
                      </div>
                    </div>

                    {/* Publishing Options */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground">Publishing Options</h4>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">Auto-publish Documents</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically publish generated documents to Confluence when created
                          </p>
                        </div>
                        <Switch
                          checked={confluenceConfig.autoPublish}
                          onCheckedChange={(checked) => handleConfluenceConfigChange('autoPublish', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">Sync on Document Update</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically sync changes back to Confluence when documents are modified
                          </p>
                        </div>
                        <Switch
                          checked={confluenceConfig.syncOnUpdate}
                          onCheckedChange={(checked) => handleConfluenceConfigChange('syncOnUpdate', checked)}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <Label className="text-base font-medium">Create Projects for Spaces</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically create ADPA projects for each Confluence space during sync
                          </p>
                        </div>
                        <Switch
                          checked={confluenceConfig.createProjectsForSpaces}
                          onCheckedChange={(checked) => handleConfluenceConfigChange('createProjectsForSpaces', checked)}
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={testConfluenceConnection}
                        disabled={testing || !confluenceConfig.baseUrl || !confluenceConfig.username || !confluenceConfig.apiToken}
                      >
                        {testing ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <TestTube className="h-4 w-4 mr-2" />
                            Test Connection
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={saveConfluenceConfiguration}
                        disabled={saving || !confluenceConfig.baseUrl}
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Save Configuration
                          </>
                        )}
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href="/integrations/confluence">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Advanced Settings
                        </Link>
                      </Button>
                    </div>
                    </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sharepoint" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SharePoint Configuration</CardTitle>
                    <CardDescription>Configure Microsoft SharePoint integration for document storage and synchronization</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {loading ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading configuration...</span>
                      </div>
                    ) : (
                      <>
                        {/* Azure AD Configuration */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Azure AD Configuration</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="sharepoint-tenant-id">Tenant ID</Label>
                              <Input
                                id="sharepoint-tenant-id"
                                placeholder="e.g. 12345678-1234-1234-1234-123456789012"
                                value={sharepointConfig.tenantId}
                                onChange={(e) => handleSharepointConfigChange('tenantId', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="sharepoint-client-id">Client ID</Label>
                              <Input
                                id="sharepoint-client-id"
                                placeholder="e.g. 12345678-1234-1234-1234-123456789012"
                                value={sharepointConfig.clientId}
                                onChange={(e) => handleSharepointConfigChange('clientId', e.target.value)}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sharepoint-client-secret">Client Secret</Label>
                            <Input
                              id="sharepoint-client-secret"
                              type="password"
                              placeholder="Your SharePoint app client secret"
                              value={sharepointConfig.clientSecret}
                              onChange={(e) => handleSharepointConfigChange('clientSecret', e.target.value)}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Register an application in Azure Portal and configure Microsoft Graph API permissions.
                            <a href="#azure-setup" className="text-blue-500 hover:underline ml-1">
                              See setup instructions below
                            </a>
                          </div>
                        </div>

                        {/* Optional Configuration */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Optional Configuration</h4>
                          <div className="space-y-2">
                            <Label htmlFor="sharepoint-default-site">Default Site ID (optional)</Label>
                            <Input
                              id="sharepoint-default-site"
                              placeholder="Default SharePoint site ID for operations"
                              value={sharepointConfig.defaultSiteId}
                              onChange={(e) => handleSharepointConfigChange('defaultSiteId', e.target.value)}
                            />
                          </div>
                        </div>

                        {/* Sync Options */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Sync Options</h4>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-base font-medium">Enable Synchronization</Label>
                              <p className="text-sm text-muted-foreground">
                                Allow documents to be synchronized between ADPA and SharePoint
                              </p>
                            </div>
                            <Switch
                              checked={sharepointConfig.syncEnabled}
                              onCheckedChange={(checked) => handleSharepointConfigChange('syncEnabled', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-base font-medium">Auto Sync</Label>
                              <p className="text-sm text-muted-foreground">
                                Automatically sync documents at regular intervals
                              </p>
                            </div>
                            <Switch
                              checked={sharepointConfig.autoSync}
                              onCheckedChange={(checked) => handleSharepointConfigChange('autoSync', checked)}
                            />
                          </div>

                          {sharepointConfig.autoSync && (
                            <div className="space-y-2">
                              <Label htmlFor="sharepoint-sync-interval">Sync Interval (minutes)</Label>
                              <Input
                                id="sharepoint-sync-interval"
                                type="number"
                                min="5"
                                max="1440"
                                placeholder="60"
                                value={sharepointConfig.syncInterval}
                                onChange={(e) => handleSharepointConfigChange('syncInterval', parseInt(e.target.value) || 60)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={() => {
                              console.log("Test Connection button clicked")
                              testSharepointConnection()
                            }}
                            disabled={testing || !sharepointConfig.tenantId || !sharepointConfig.clientId || !sharepointConfig.clientSecret}
                          >
                            {testing ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <TestTube className="h-4 w-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={() => {
                              console.log("Save Configuration button clicked")
                              saveSharepointConfiguration()
                            }}
                            disabled={saving || !sharepointConfig.tenantId || !sharepointConfig.clientId}
                          >
                            {saving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Settings className="h-4 w-4 mr-2" />
                                Save Configuration
                              </>
                            )}
                          </Button>
                          <Button variant="outline" asChild>
                            <Link href="/integrations/sharepoint">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Advanced Settings
                            </Link>
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Azure Setup Instructions */}
                <Card id="azure-setup">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="h-5 w-5" />
                      Azure App Registration Setup
                    </CardTitle>
                    <CardDescription>
                      Step-by-step instructions to set up SharePoint integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                        <div>
                          <h5 className="font-medium">Register Application in Azure Portal</h5>
                          <p className="text-sm text-muted-foreground">
                            Go to <a href="https://portal.azure.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Azure Portal</a> → App Registrations → New registration
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                        <div>
                          <h5 className="font-medium">Configure API Permissions</h5>
                          <p className="text-sm text-muted-foreground">Add Microsoft Graph API permissions:</p>
                          <ul className="text-sm text-muted-foreground mt-1 ml-4 list-disc">
                            <li>Sites.Read.All (Application)</li>
                            <li>Sites.ReadWrite.All (Application)</li>
                            <li>Files.Read.All (Application)</li>
                            <li>Files.ReadWrite.All (Application)</li>
                            <li>User.Read.All (Application)</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                        <div>
                          <h5 className="font-medium">Create Client Secret</h5>
                          <p className="text-sm text-muted-foreground">
                            Go to Certificates & secrets → New client secret → Copy the secret value
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                        <div>
                          <h5 className="font-medium">Grant Admin Consent</h5>
                          <p className="text-sm text-muted-foreground">
                            In API permissions, click "Grant admin consent for [organization]"
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                        <div>
                          <h5 className="font-medium">Copy Required Values</h5>
                          <p className="text-sm text-muted-foreground">
                            From the app overview page, copy:
                          </p>
                          <ul className="text-sm text-muted-foreground mt-1 ml-4 list-disc">
                            <li>Application (client) ID</li>
                            <li>Directory (tenant) ID</li>
                            <li>Client secret (from step 3)</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h6 className="font-medium text-blue-900 mb-2">Testing Your Setup</h6>
                      <p className="text-sm text-blue-800">
                        After completing the setup, enter your Tenant ID, Client ID, and Client Secret above, then click "Test Connection" to verify the integration works correctly.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="adobe" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Adobe Document Services</CardTitle>
                    <CardDescription>
                      Configure Adobe APIs for professional document generation and processing
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="adobe-client-id">Client ID</Label>
                        <Input id="adobe-client-id" placeholder="Adobe Client ID" />
                      </div>
                      <div>
                        <Label htmlFor="adobe-client-secret">Client Secret</Label>
                        <Input id="adobe-client-secret" type="password" placeholder="Adobe Client Secret" />
                      </div>
                    </div>

                    <div>
                      <Label>Enabled Services</Label>
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span>PDF Services API</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Document Generation API</span>
                          <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Creative SDK (InDesign, Illustrator)</span>
                          <Switch />
                        </div>
                      </div>
                    </div>

                    <Button>Save Configuration</Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vcs" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Version Control Systems</CardTitle>
                    <CardDescription>
                      Configure Git repositories for document version control and collaboration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="git-provider">Git Provider</Label>
                        <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                          <option value="github">GitHub</option>
                          <option value="gitlab">GitLab</option>
                          <option value="azure-devops">Azure DevOps</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="repository">Repository</Label>
                        <Input id="repository" placeholder="owner/repository" defaultValue="company/documentation" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="access-token">Personal Access Token</Label>
                      <Input id="access-token" type="password" placeholder="GitHub/GitLab Personal Access Token" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Auto-commit Generated Documents</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically commit and push generated documents to the repository
                        </p>
                      </div>
                      <Switch />
                    </div>

                    <Button>Save Configuration</Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
