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
import { Settings, Plus, TestTube, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Cloud, Loader2, FileText, Download, ArrowDown } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { MongoDBSyncDialog } from "./MongoDBSyncDialog"
import { Database } from "@/components/ui/icons-shim"
import { MongoDBDashboard } from "./MongoDBDashboard"
import { PineconeDashboard } from "./PineconeDashboard"
import { SupabaseDashboard } from "./SupabaseDashboard"
import { Neo4jDashboard } from "./Neo4jDashboard"

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
  const [healthChecks, setHealthChecks] = useState<Record<string, { status: 'healthy' | 'unhealthy' | 'checking'; message?: string }>>({})

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

  // Notion configuration state
  const [notionConfig, setNotionConfig] = useState({
    integrationToken: "",
    defaultDatabaseId: "",
    syncEnabled: true,
    autoSync: false,
    syncInterval: 60,
  })

  // Jira configuration state
  const [jiraConfig, setJiraConfig] = useState({
    baseUrl: "",
    email: "",
    apiToken: "",
    defaultProjectKey: "",
    defaultIssueType: "Task",
    defaultPriority: "Medium",
    autoCreateIssues: true,
    linkConfluencePages: true,
  })
  const [existingJiraIntegration, setExistingJiraIntegration] = useState<any>(null)

  // Projects for Notion sync target selection
  const [projects, setProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<any>(null)

  // New integration form state
  const [newIntegration, setNewIntegration] = useState({
    type: "",
    name: "",
    baseUrl: "",
    // Jira-specific fields
    email: "",
    apiToken: "",
    defaultProjectKey: "",
    defaultIssueType: "Task",
    defaultPriority: "Medium",
    // Confluence-specific fields
    username: "",
    apiTokenConfluence: "",
    defaultSpace: "",
    // SharePoint-specific fields
    tenantId: "",
    clientId: "",
    clientSecret: "",
    // Notion-specific fields
    integrationToken: "",
    // Neo4j-specific fields
    neo4jUri: "",
    neo4jDatabase: "neo4j",
    neo4jUsername: "neo4j",
    neo4jPassword: "",
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [creatingIntegration, setCreatingIntegration] = useState(false)

  // MongoDB Sync Dialog State
  const [mongoSyncDialogOpen, setMongoSyncDialogOpen] = useState(false)
  const [mongoIntegrationToSync, setMongoIntegrationToSync] = useState<string | null>(null)

  // Handle new integration form field changes
  const handleNewIntegrationChange = (field: string, value: any) => {
    setNewIntegration(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Reset form when dialog closes
  const resetNewIntegrationForm = () => {
    setNewIntegration({
      type: "",
      name: "",
      baseUrl: "",
      email: "",
      apiToken: "",
      defaultProjectKey: "",
      defaultIssueType: "Task",
      defaultPriority: "Medium",
      username: "",
      apiTokenConfluence: "",
      defaultSpace: "",
      tenantId: "",
      clientId: "",
      clientSecret: "",
      integrationToken: "",
      neo4jUri: "",
      neo4jDatabase: "neo4j",
      neo4jUsername: "neo4j",
      neo4jPassword: "",
    })
  }

  // Handle form submission for new integration
  const handleCreateIntegration = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!newIntegration.type) {
      toast.error("Please select an integration type")
      return
    }
    if (!newIntegration.name || newIntegration.name.trim() === "") {
      toast.error("Please enter an integration name")
      return
    }

    setCreatingIntegration(true)
    try {
      let configData: any = {
        name: newIntegration.name.trim(),
        type: newIntegration.type,
        configuration: {},
        credentials: {},
        is_active: true,
      }

      // Build configuration and credentials based on integration type
      switch (newIntegration.type) {
        case "jira":
          if (!newIntegration.baseUrl || !newIntegration.email || !newIntegration.apiToken) {
            toast.error("Please fill in all required Jira fields (Base URL, Email, API Token)")
            setCreatingIntegration(false)
            return
          }
          configData.configuration = {
            baseUrl: newIntegration.baseUrl.trim(),
            defaultProjectKey: newIntegration.defaultProjectKey.trim() || undefined,
            defaultIssueType: newIntegration.defaultIssueType || "Task",
            defaultPriority: newIntegration.defaultPriority || "Medium",
          }
          configData.credentials = {
            email: newIntegration.email.trim(),
            apiToken: newIntegration.apiToken.trim(),
          }
          break

        case "confluence":
          if (!newIntegration.baseUrl || !newIntegration.username || !newIntegration.apiTokenConfluence) {
            toast.error("Please fill in all required Confluence fields (Base URL, Username, API Token)")
            setCreatingIntegration(false)
            return
          }
          configData.configuration = {
            base_url: newIntegration.baseUrl.trim(),
            target_space_key: newIntegration.defaultSpace.trim() || undefined,
          }
          configData.credentials = {
            username: newIntegration.username.trim(),
            api_token: newIntegration.apiTokenConfluence.trim(),
          }
          break

        case "sharepoint":
          if (!newIntegration.tenantId || !newIntegration.clientId || !newIntegration.clientSecret) {
            toast.error("Please fill in all required SharePoint fields (Tenant ID, Client ID, Client Secret)")
            setCreatingIntegration(false)
            return
          }
          configData.configuration = {
            tenant_id: newIntegration.tenantId.trim(),
            client_id: newIntegration.clientId.trim(),
            client_secret: newIntegration.clientSecret.trim(),
          }
          configData.credentials = {
            tenant_id: newIntegration.tenantId.trim(),
            client_id: newIntegration.clientId.trim(),
            client_secret: newIntegration.clientSecret.trim(),
          }
          break

        case "notion":
          if (!newIntegration.integrationToken) {
            toast.error("Please enter a Notion integration token")
            setCreatingIntegration(false)
            return
          }
          configData.configuration = {}
          configData.credentials = {
            integration_token: newIntegration.integrationToken.trim(),
            apiKey: newIntegration.integrationToken.trim(), // Support both formats
          }
          break

        case "neo4j":
          if (!newIntegration.neo4jUri) {
            toast.error("Please enter Neo4j URI")
            setCreatingIntegration(false)
            return
          }
          configData.configuration = {
            uri: newIntegration.neo4jUri.trim(),
            database: (newIntegration.neo4jDatabase || "neo4j").trim(),
            username: (newIntegration.neo4jUsername || "neo4j").trim(),
            source: "manual-add-integration",
          }
          configData.credentials = {
            username: (newIntegration.neo4jUsername || "neo4j").trim(),
            password: newIntegration.neo4jPassword?.trim() || "",
          }
          break

        case "mongodb":
          configData.configuration = {
            source: "manual-add-integration",
          }
          configData.credentials = {}
          break

        case "github":
        case "gitlab":
          if (!newIntegration.baseUrl) {
            toast.error("Please enter a base URL")
            setCreatingIntegration(false)
            return
          }
          configData.configuration = {
            base_url: newIntegration.baseUrl.trim(),
          }
          configData.credentials = {
            // GitHub/GitLab credentials would be added here
            // For now, just base URL
          }
          break

        case "adobe":
          if (!newIntegration.baseUrl) {
            toast.error("Please enter a base URL")
            setCreatingIntegration(false)
            return
          }
          configData.configuration = {
            base_url: newIntegration.baseUrl.trim(),
          }
          configData.credentials = {
            // Adobe credentials would be added here
          }
          break

        default:
          toast.error(`Integration type "${newIntegration.type}" is not yet fully supported`)
          setCreatingIntegration(false)
          return
      }

      // Create the integration
      const response = await apiClient.createIntegration(configData)

      toast.success(`Integration "${newIntegration.name}" created successfully! ✅`)

      // Close dialog and reset form
      setIsDialogOpen(false)
      resetNewIntegrationForm()

      // Reload integrations list
      await loadExistingIntegrations()

    } catch (error: any) {
      console.error("Failed to create integration:", error)
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create integration"
      toast.error(`Failed to create integration: ${errorMessage}`)
    } finally {
      setCreatingIntegration(false)
    }
  }

  // Load existing integrations on component mount (only if user is logged in)
  useEffect(() => {
    if (user) {
      loadExistingIntegrations()
      loadProjects()
    } else {
      setLoading(false)
    }
  }, [user])

  // Perform health checks for all active integrations
  // NOTE: Disabled until backend health check endpoint is implemented
  // useEffect(() => {
  //   if (realIntegrations.length > 0 && user) {
  //     performHealthChecks()
  //   }
  // }, [realIntegrations, user])

  const loadProjects = async () => {
    try {
      const response = await apiClient.getProjects({ page: 1, pageSize: 100 })
      setProjects(response.projects || [])
    } catch (error) {
      console.error("Failed to load projects:", error)
    }
  }

  const loadExistingIntegrations = async () => {
    if (!user) {
      console.log("User not logged in, skipping integration load")
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      console.log("Loading integrations from backend...")
      const response: any = await apiClient.get("/integrations?limit=100")
      const backendIntegrations = Array.isArray(response)
        ? response
        : response.integrations || response.data?.integrations || []
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
        {
          id: "mongodb-default",
          name: "MongoDB Vector Store",
          type: "mongodb",
          status: "not_configured",
          enabled: false,
          baseUrl: "",
          lastSync: "Never",
          documentsPublished: 0,
          authType: "API Key",
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

      const notionIntegration = backendIntegrations.find((i: any) => i.type === "notion")
      if (notionIntegration) {
        const config = notionIntegration.configuration || {}
        setNotionConfig(prev => ({
          ...prev,
          integrationToken: "", // Credentials are encrypted and not returned
          defaultDatabaseId: config.default_database_id || "",
          syncEnabled: config.sync_enabled !== undefined ? config.sync_enabled : prev.syncEnabled,
          autoSync: config.auto_sync !== undefined ? config.auto_sync : prev.autoSync,
          syncInterval: config.sync_interval || prev.syncInterval,
        }))
      }

      const jiraIntegration = backendIntegrations.find((i: any) => i.type === "jira")
      if (jiraIntegration) {
        setExistingJiraIntegration(jiraIntegration)
        const config = jiraIntegration.configuration || {}
        setJiraConfig(prev => {
          // Only update fields if backend has actual values (not empty strings)
          // This preserves user input when scrolling back to the form
          const newBaseUrl = config.baseUrl || config.base_url
          const newDefaultProjectKey = config.defaultProjectKey || config.default_project_key
          return {
            ...prev,
            // Only update if backend has a value, otherwise keep user's current input
            baseUrl: newBaseUrl && newBaseUrl.trim() ? newBaseUrl : prev.baseUrl,
            email: "", // Credentials are encrypted and not returned
            apiToken: "", // Credentials are encrypted and not returned
            defaultProjectKey: newDefaultProjectKey && newDefaultProjectKey.trim() ? newDefaultProjectKey : prev.defaultProjectKey,
            defaultIssueType: config.defaultIssueType || config.default_issue_type || prev.defaultIssueType,
            defaultPriority: config.defaultPriority || config.default_priority || prev.defaultPriority,
            autoCreateIssues: config.autoCreateIssues !== undefined ? config.autoCreateIssues : prev.autoCreateIssues,
            linkConfluencePages: config.linkConfluencePages !== undefined ? config.linkConfluencePages : prev.linkConfluencePages,
          }
        })
      } else {
        setExistingJiraIntegration(null)
      }
    } catch (error) {
      console.error("Failed to load integrations:", error)
      toast.error("Failed to load existing integrations")
    } finally {
      setLoading(false)
    }
  }

  const performHealthChecks = async () => {
    console.log('Health checks disabled - endpoint not implemented')
    return
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
      const errorMessage = typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: string }).message || "Failed to save configuration"
        : "Failed to save configuration"
      toast.error(`Save failed: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // Jira handlers
  const handleJiraConfigChange = (field: string, value: any) => {
    setJiraConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const testJiraConnection = async () => {
    setTesting(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        toast.error("Please login first")
        return
      }

      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api'

      // Check if we have an existing integration to test with stored credentials
      const jiraIntegrationToTest = existingJiraIntegration || realIntegrations.find((i: any) => i.type === "jira")

      if (jiraIntegrationToTest) {
        // Test using stored integration credentials
        console.log("Testing Jira connection with stored integration:", jiraIntegrationToTest.id)
        const response = await fetch(`${apiBaseUrl}/integrations/${jiraIntegrationToTest.id}/test`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (data.success) {
          toast.success("Jira connection successful! ✅")
          if (data.details?.projectAccess) {
            toast.success(`Project access verified: ${data.details.projectAccess}`)
          }
        } else {
          const errorMessage = data.error || data.message || "Connection failed"
          toast.error(`Jira connection failed: ${errorMessage}`)
          console.error("Jira connection test failed:", data)
        }
      } else {
        toast.error("Please save the Jira integration configuration first, then test the connection")
      }
    } catch (error) {
      console.error("Jira connection test failed:", error)
      toast.error("Connection test failed - please check your network connection")
    } finally {
      setTesting(false)
    }
  }

  const saveJiraConfiguration = async () => {
    setSaving(true)
    try {
      // Check if a Jira integration already exists (by type or name)
      let jiraIntegrationToUpdate = existingJiraIntegration

      // If not found in state, check in realIntegrations
      if (!jiraIntegrationToUpdate) {
        jiraIntegrationToUpdate = realIntegrations.find((i: any) => i.type === "jira")
      }

      const configData = {
        name: "Jira",
        type: "jira",
        configuration: {
          baseUrl: jiraConfig.baseUrl,
          defaultProjectKey: jiraConfig.defaultProjectKey || undefined,
          defaultIssueType: jiraConfig.defaultIssueType || "Task",
          defaultPriority: jiraConfig.defaultPriority || "Medium",
          autoCreateIssues: jiraConfig.autoCreateIssues,
          linkConfluencePages: jiraConfig.linkConfluencePages,
        },
        credentials: {
          email: jiraConfig.email,
          apiToken: jiraConfig.apiToken,
        },
        is_active: true,
      }

      let response
      if (jiraIntegrationToUpdate) {
        // Update existing integration
        console.log("Updating existing Jira integration:", jiraIntegrationToUpdate.id)
        response = await apiClient.updateIntegration(jiraIntegrationToUpdate.id, configData)
        toast.success("Jira configuration updated successfully! ✅")
      } else {
        // Create new integration
        console.log("Creating new Jira integration")
        try {
          response = await apiClient.createIntegration(configData)
          toast.success("Jira configuration saved successfully! ✅")
        } catch (createError: any) {
          // If creation fails due to name conflict, try to find and update existing
          if (createError?.message?.includes("name already exists") || createError?.response?.data?.error?.includes("name already exists")) {
            // Try to find existing integration by name
            const allIntegrations = await apiClient.getIntegrations()
            const existingByName = Array.isArray(allIntegrations)
              ? allIntegrations.find((i: any) => i.name === "Jira" || i.type === "jira")
              : (allIntegrations as any)?.integrations?.find((i: any) => i.name === "Jira" || i.type === "jira")

            if (existingByName) {
              console.log("Found existing integration by name, updating:", existingByName.id)
              response = await apiClient.updateIntegration(existingByName.id, configData)
              toast.success("Jira configuration updated successfully! ✅")
            } else {
              throw createError
            }
          } else {
            throw createError
          }
        }
      }

      // Reload integrations to get the latest data
      await loadExistingIntegrations()

    } catch (error) {
      console.error("Failed to save Jira configuration:", error)
      const errorMessage = typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: string }).message || "Failed to save configuration"
        : "Failed to save configuration"
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

      // Use API client to make the request (it handles the correct backend URL)
      const response = await apiClient.request("/integrations/sharepoint/test", {
        method: "POST",
        body: JSON.stringify({
          tenantId: sharepointConfig.tenantId,
          clientId: sharepointConfig.clientId,
          clientSecret: sharepointConfig.clientSecret,
        }),
      })

      // API client returns parsed JSON directly
      console.log("Response data:", response)

      const resp = response as { success?: boolean; sitesFound?: number; error?: string; message?: string }
      if (resp.success) {
        toast.success(`SharePoint connection successful! Found ${resp.sitesFound || 0} sites ✅`)
      } else {
        const errorMessage = resp.error || resp.message || "Connection failed"
        toast.error(`SharePoint connection failed: ${errorMessage}`)
        console.error("SharePoint connection test failed:", resp)
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
          ; (apiClient as any).setToken(token)
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
      let errorMessage = "Failed to save configuration"
      if (typeof error === "object" && error !== null && "message" in error && typeof (error as any).message === "string") {
        errorMessage = (error as any).message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error !== null && error !== undefined) {
        errorMessage = String(error)
      }
      toast.error(`Save failed: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // Notion handlers
  const handleNotionConfigChange = (field: string, value: any) => {
    console.log("Notion config change:", field, value)
    setNotionConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const testNotionConnection = async () => {
    console.log("Testing Notion connection...")
    console.log("realIntegrations:", realIntegrations)
    setTesting(true)
    try {
      if (!user) {
        toast.error("Please log in first to test the connection")
        setTesting(false)
        return
      }

      const existingNotionIntegration = realIntegrations.find(i => i.type === "notion")

      // Check if we have a valid NEW token entered (must start with ntn_ or secret_ and be long enough)
      const enteredToken = notionConfig.integrationToken?.trim() || ""
      const isValidNewToken = enteredToken.length >= 40 && (enteredToken.startsWith("ntn_") || enteredToken.startsWith("secret_"))

      console.log("Test connection debug:", {
        enteredTokenLength: enteredToken.length,
        enteredTokenPrefix: enteredToken.substring(0, 10),
        isValidNewToken,
        hasStoredIntegration: !!existingNotionIntegration,
        existingIntegrationId: existingNotionIntegration?.id,
        realIntegrationsCount: realIntegrations.length
      })

      // Priority 1: If there's a stored integration, use stored credentials (most reliable)
      if (existingNotionIntegration) {
        console.log("Using stored credentials for test via /:id/test endpoint...")
        const response = await apiClient.post(`/integrations/${existingNotionIntegration.id}/test`, {})

        console.log("Response data:", response)

        const resp = response as { success?: boolean; message?: string; details?: any; error?: string }
        if (resp.success) {
          toast.success(`Notion connection successful! ${resp.message || ''} ✅`)
        } else {
          const errorMessage = resp.error || resp.message || "Connection failed"
          toast.error(`Notion connection failed: ${errorMessage}`)
          console.error("Notion connection test failed:", resp)
        }
      }
      // Priority 2: No stored integration but user entered a valid new token
      else if (isValidNewToken) {
        console.log("Testing with newly entered token...")
        const response = await apiClient.post("/integrations/notion/test", {
          integrationToken: enteredToken,
        })

        console.log("Response data:", response)

        const resp = response as { success?: boolean; workspaceName?: string; pagesFound?: number; error?: string; message?: string }
        if (resp.success) {
          toast.success(`Notion connection successful! Found ${resp.pagesFound || 0} accessible pages ✅`)
        } else {
          const errorMessage = resp.error || resp.message || "Connection failed"
          toast.error(`Notion connection failed: ${errorMessage}`)
          console.error("Notion connection test failed:", resp)
        }
      }
      // No stored integration and no valid token
      else {
        toast.error("Please enter a valid Notion Integration Token (starts with 'ntn_' or 'secret_')")
      }
    } catch (error: any) {
      console.error("Notion connection test failed:", error)
      toast.error(`Connection test failed: ${error.message}`)
    } finally {
      setTesting(false)
    }
  }

  const saveNotionConfiguration = async () => {
    console.log("Saving Notion configuration...")
    setSaving(true)
    try {
      if (!user) {
        toast.error("Please log in to save configuration")
        setSaving(false)
        return
      }

      const existingNotionIntegration = realIntegrations.find(i => i.type === "notion")

      // For new integrations, a valid token is required
      const enteredToken = notionConfig.integrationToken?.trim() || ""
      const isValidToken = enteredToken.length >= 40 && (enteredToken.startsWith("ntn_") || enteredToken.startsWith("secret_"))

      if (!existingNotionIntegration && !isValidToken) {
        toast.error("A valid Integration Token is required for new Notion integrations (must start with 'ntn_' or 'secret_')")
        setSaving(false)
        return
      }

      const configData: any = {
        name: "Notion",
        type: "notion",
        configuration: {
          default_database_id: notionConfig.defaultDatabaseId,
          sync_enabled: notionConfig.syncEnabled,
          auto_sync: notionConfig.autoSync,
          sync_interval: notionConfig.syncInterval,
        },
        is_active: true,
      }

      // Only include credentials if a valid new token was provided
      // (invalid/empty token means keep the existing encrypted one)
      if (isValidToken) {
        configData.credentials = {
          integration_token: notionConfig.integrationToken.trim(),
        }
      }

      console.log("Config data:", {
        ...configData,
        credentials: configData.credentials ? { integration_token: "***" } : "not updating credentials"
      })

      console.log("Existing integration:", existingNotionIntegration?.id || "none")

      if (existingNotionIntegration) {
        console.log("Updating existing integration...")
        await apiClient.updateIntegration(existingNotionIntegration.id, configData)
        toast.success("Notion configuration updated successfully! ✅")
      } else {
        console.log("Creating new integration...")
        await apiClient.createIntegration(configData)
        toast.success("Notion configuration saved successfully! ✅")
      }

      console.log("Reloading integrations...")
      await loadExistingIntegrations()

    } catch (error) {
      console.error("Failed to save Notion configuration:", error)
      let errorMessage = "Failed to save configuration"
      if (typeof error === "object" && error !== null && "message" in error && typeof (error as any).message === "string") {
        errorMessage = (error as any).message
      } else if (typeof error === "string") {
        errorMessage = error
      } else if (error !== null && error !== undefined) {
        errorMessage = String(error)
      }
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
    } else if (integration.type === "notion") {
      await testNotionConnection()
    } else {
      toast.info(`Testing for ${integration.name} not yet implemented`)
    }
  }

  const handleSyncIntegration = async (integration: any) => {
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
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
      } else if (integration.type === "notion") {
        // Use the dedicated Notion sync function with project selection
        await handleNotionSync()
      } else if (integration.type === "mongodb") {
        if (integration.id === "mongodb-default") {
          toast.error("Enable MongoDB with the toggle first, then run Sync.")
          return
        }
        setMongoIntegrationToSync(integration.id)
        setMongoSyncDialogOpen(true)
      } else {
        toast.info(`Sync for ${integration.name} not yet implemented`)
      }

      await loadExistingIntegrations()
    } catch (error) {
      console.error("Sync failed:", error)
      toast.error("Sync failed - please check your connection")
    }
  }

  // Dedicated Notion sync function with project selection
  const handleNotionSync = async (projectId?: string) => {
    const notionIntegration = realIntegrations.find(i => i.type === "notion")
    if (!notionIntegration) {
      toast.error("Please save a Notion integration configuration first")
      return
    }

    if (!user) {
      toast.error("Please login first")
      return
    }

    try {
      setSyncing(true)
      setSyncResult(null)

      const targetProjectId = projectId || selectedProjectId

      // Get token from auth_token (where apiClient stores it)
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        toast.error("Session expired - please login again")
        return
      }

      // Call API directly on port 5000 to bypass Next.js proxy
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000/api'
      const response = await fetch(`${apiBaseUrl}/integrations/${notionIntegration.id}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          projectId: targetProjectId || null,
          companyId: user?.company_id || null
        })
      })

      // Handle non-JSON responses - read as text first, then parse
      const responseText = await response.text()
      let data: any
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        throw new Error(`Server error: ${response.status} - ${responseText || response.statusText}`)
      }

      if (data.success) {
        const count = data.details?.synced_items || 0
        const projectName = targetProjectId
          ? projects.find(p => p.id === targetProjectId)?.name || "selected project"
          : "no project (unassigned)"
        toast.success(`Imported ${count} documents from Notion into ${projectName}`)
        setSyncResult({
          success: true,
          count,
          projectId: targetProjectId,
          timestamp: new Date().toISOString()
        })
      } else {
        const errorMsg = data.message || data.details?.error || data.error || "Unknown error"
        toast.error(`Notion import failed: ${errorMsg}`)
        setSyncResult({
          success: false,
          error: errorMsg
        })
      }

      await loadExistingIntegrations()
    } catch (error: any) {
      console.error("Notion sync failed:", error)
      toast.error(`Notion import failed: ${error.message}`)
      setSyncResult({
        success: false,
        error: error.message
      })
    } finally {
      setSyncing(false)
    }
  }

  const handleToggleIntegration = async (integration: any, enabled: boolean) => {
    console.log("Toggling integration:", integration.name, "to", enabled)
    try {
      // Handle MongoDB default integration auto-creation
      if (integration.id === "mongodb-default" && enabled) {
        try {
          await apiClient.createIntegration({
            name: "MongoDB Vector Store",
            type: "mongodb",
            configuration: {},
            credentials: {}, // No credentials needed for server-side configured mongo
            is_active: true,
          })
          toast.success("MongoDB integration enabled")
          await loadExistingIntegrations()
          return
        } catch (error: any) {
          console.error("Failed to enable MongoDB integration:", error)
          toast.error(`Failed to enable: ${error.message || "Unknown error"}`)
          return
        }
      }

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
      const errorMessage = typeof error === "object" && error !== null && "message" in error
        ? (error as { message?: string }).message
        : String(error)
      toast.error(`Failed to update integration status: ${errorMessage}`)
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
              <Dialog open={isDialogOpen} onOpenChange={(open: boolean) => {
                setIsDialogOpen(open)
                if (!open) {
                  resetNewIntegrationForm()
                }
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Integration
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleCreateIntegration}>
                    <DialogHeader>
                      <DialogTitle>Add Integration</DialogTitle>
                      <DialogDescription>Connect ADPA to an external system or service.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="integration-type" className="text-right">
                          Type <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="integration-type"
                          className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          aria-label="Integration Type"
                          value={newIntegration.type}
                          onChange={(e) => handleNewIntegrationChange("type", e.target.value)}
                          required
                        >
                          <option value="">Select integration type</option>
                          <option value="confluence">Atlassian Confluence</option>
                          <option value="jira">Atlassian Jira</option>
                          <option value="sharepoint">Microsoft SharePoint</option>
                          <option value="notion">Notion</option>
                          <option value="mongodb">MongoDB Vector Store</option>
                          <option value="neo4j">Neo4j</option>
                          <option value="adobe">Adobe Document Services</option>
                          <option value="github">GitHub</option>
                          <option value="gitlab">GitLab</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                          Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          placeholder="Integration name"
                          className="col-span-3"
                          value={newIntegration.name}
                          onChange={(e) => handleNewIntegrationChange("name", e.target.value)}
                          required
                        />
                      </div>

                      {/* Common fields */}
                      {(newIntegration.type === "jira" || newIntegration.type === "confluence" || newIntegration.type === "github" || newIntegration.type === "gitlab" || newIntegration.type === "adobe") && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="base-url" className="text-right">
                            Base URL <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="base-url"
                            placeholder="https://your-domain.atlassian.net"
                            className="col-span-3"
                            value={newIntegration.baseUrl}
                            onChange={(e) => handleNewIntegrationChange("baseUrl", e.target.value)}
                            required={newIntegration.type === "jira" || newIntegration.type === "confluence"}
                          />
                        </div>
                      )}

                      {/* Jira-specific fields */}
                      {newIntegration.type === "jira" && (
                        <>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jira-email" className="text-right">
                              Email <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="jira-email"
                              type="email"
                              placeholder="your-email@company.com"
                              className="col-span-3"
                              value={newIntegration.email}
                              onChange={(e) => handleNewIntegrationChange("email", e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jira-api-token" className="text-right">
                              API Token <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="jira-api-token"
                              type="password"
                              placeholder="Your Jira API token"
                              className="col-span-3"
                              value={newIntegration.apiToken}
                              onChange={(e) => handleNewIntegrationChange("apiToken", e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jira-project-key" className="text-right">
                              Project Key
                            </Label>
                            <Input
                              id="jira-project-key"
                              placeholder="PROJ"
                              className="col-span-3"
                              value={newIntegration.defaultProjectKey}
                              onChange={(e) => handleNewIntegrationChange("defaultProjectKey", e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jira-issue-type" className="text-right">
                              Default Issue Type
                            </Label>
                            <Select
                              value={newIntegration.defaultIssueType}
                              onValueChange={(value: string) => handleNewIntegrationChange("defaultIssueType", value)}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Task">Task</SelectItem>
                                <SelectItem value="Story">Story</SelectItem>
                                <SelectItem value="Bug">Bug</SelectItem>
                                <SelectItem value="Epic">Epic</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="jira-priority" className="text-right">
                              Default Priority
                            </Label>
                            <Select
                              value={newIntegration.defaultPriority}
                              onValueChange={(value: string) => handleNewIntegrationChange("defaultPriority", value)}
                            >
                              <SelectTrigger className="col-span-3">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Highest">Highest</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                                <SelectItem value="Lowest">Lowest</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      )}

                      {/* MongoDB-specific fields */}
                      {newIntegration.type === "mongodb" && (
                        <div className="flex flex-col gap-4 text-center py-4">
                          <Database className="h-12 w-12 mx-auto text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">
                            MongoDB integration uses the server configuration.
                            <br />
                            No additional credentials required here.
                            <br />
                            Just give it a name to enable synchronization.
                          </p>
                        </div>
                      )}

                      {/* Neo4j-specific fields */}
                      {newIntegration.type === "neo4j" && (
                        <>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="neo4j-uri" className="text-right">
                              URI <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="neo4j-uri"
                              placeholder="neo4j+s://xxxx.databases.neo4j.io"
                              className="col-span-3"
                              value={newIntegration.neo4jUri}
                              onChange={(e) => handleNewIntegrationChange("neo4jUri", e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="neo4j-db" className="text-right">
                              Database
                            </Label>
                            <Input
                              id="neo4j-db"
                              placeholder="neo4j"
                              className="col-span-3"
                              value={newIntegration.neo4jDatabase}
                              onChange={(e) => handleNewIntegrationChange("neo4jDatabase", e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="neo4j-user" className="text-right">
                              Username
                            </Label>
                            <Input
                              id="neo4j-user"
                              placeholder="neo4j"
                              className="col-span-3"
                              value={newIntegration.neo4jUsername}
                              onChange={(e) => handleNewIntegrationChange("neo4jUsername", e.target.value)}
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="neo4j-password" className="text-right">
                              Password
                            </Label>
                            <Input
                              id="neo4j-password"
                              type="password"
                              placeholder="optional if env-managed"
                              className="col-span-3"
                              value={newIntegration.neo4jPassword}
                              onChange={(e) => handleNewIntegrationChange("neo4jPassword", e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {/* Confluence-specific fields */}
                      {newIntegration.type === "confluence" && (
                        <>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="confluence-username" className="text-right">
                              Username <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="confluence-username"
                              placeholder="your-email@company.com"
                              className="col-span-3"
                              value={newIntegration.username}
                              onChange={(e) => handleNewIntegrationChange("username", e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="confluence-api-token" className="text-right">
                              API Token <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="confluence-api-token"
                              type="password"
                              placeholder="Your Confluence API token"
                              value={newIntegration.apiTokenConfluence}
                              onChange={(e: any) => handleNewIntegrationChange("apiTokenConfluence", e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="confluence-space" className="text-right">
                              Default Space
                            </Label>
                            <Input
                              id="confluence-space"
                              placeholder="DOCS"
                              className="col-span-3"
                              value={newIntegration.defaultSpace}
                              onChange={(e) => handleNewIntegrationChange("defaultSpace", e.target.value)}
                            />
                          </div>
                        </>
                      )}

                      {/* SharePoint-specific fields */}
                      {newIntegration.type === "sharepoint" && (
                        <>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sharepoint-tenant" className="text-right">
                              Tenant ID <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="sharepoint-tenant"
                              placeholder="your-tenant-id"
                              className="col-span-3"
                              value={newIntegration.tenantId}
                              onChange={(e) => handleNewIntegrationChange("tenantId", e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sharepoint-client-id" className="text-right">
                              Client ID <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="sharepoint-client-id"
                              placeholder="Your Azure AD Client ID"
                              className="col-span-3"
                              value={newIntegration.clientId}
                              onChange={(e) => handleNewIntegrationChange("clientId", e.target.value)}
                              required
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="sharepoint-client-secret" className="text-right">
                              Client Secret <span className="text-red-500">*</span>
                            </Label>
                            <Input
                              id="sharepoint-client-secret"
                              type="password"
                              placeholder="Your Azure AD Client Secret"
                              className="col-span-3"
                              value={newIntegration.clientSecret}
                              onChange={(e) => handleNewIntegrationChange("clientSecret", e.target.value)}
                              required
                            />
                          </div>
                        </>
                      )}

                      {/* Notion-specific fields */}
                      {newIntegration.type === "notion" && (
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="notion-token" className="text-right">
                            Integration Token <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="notion-token"
                            type="password"
                            placeholder="secret_..."
                            className="col-span-3"
                            value={newIntegration.integrationToken}
                            onChange={(e) => handleNewIntegrationChange("integrationToken", e.target.value)}
                            required
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsDialogOpen(false)
                          resetNewIntegrationForm()
                        }}
                        disabled={creatingIntegration}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" disabled={creatingIntegration}>
                        {creatingIntegration ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          "Add Integration"
                        )}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="confluence">Confluence</TabsTrigger>
                <TabsTrigger value="jira">Jira</TabsTrigger>
                <TabsTrigger value="sharepoint">SharePoint</TabsTrigger>
                <TabsTrigger value="notion">Notion</TabsTrigger>
                <TabsTrigger value="adobe">Adobe</TabsTrigger>
                <TabsTrigger value="vcs">Version Control</TabsTrigger>
                <TabsTrigger value="mongodb-analysis">MongoDB Analysis</TabsTrigger>
                <TabsTrigger value="pinecone-analysis">Pinecone Analysis</TabsTrigger>
                <TabsTrigger value="supabase-management">Supabase</TabsTrigger>
                <TabsTrigger value="neo4j-analysis">Neo4j Analysis</TabsTrigger>
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
                          <div className="flex items-center space-x-4 flex-1">
                            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                              <ExternalLink className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="flex items-center space-x-2 flex-wrap">
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
                              <CardDescription className="mt-1">
                                {integration.baseUrl} • Last sync: {integration.lastSync}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Switch
                              checked={integration.enabled}
                              onCheckedChange={(checked: boolean) => handleToggleIntegration(integration, checked)}
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
                              onCheckedChange={(checked: boolean) => handleConfluenceConfigChange('autoPublish', checked)}
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
                              onCheckedChange={(checked: boolean) => handleConfluenceConfigChange('syncOnUpdate', checked)}
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
                              onCheckedChange={(checked: boolean) => handleConfluenceConfigChange('createProjectsForSpaces', checked)}
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

              <TabsContent value="jira" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Jira Configuration</CardTitle>
                    <CardDescription>
                      Configure Atlassian Jira integration for issue tracking and document linkage
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
                              <Label htmlFor="jira-url">Jira Base URL</Label>
                              <Input
                                id="jira-url"
                                placeholder="https://your-domain.atlassian.net"
                                value={jiraConfig.baseUrl}
                                onChange={(e) => handleJiraConfigChange('baseUrl', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="jira-project-key">Default Project Key</Label>
                              <Input
                                id="jira-project-key"
                                placeholder="PROJ"
                                value={jiraConfig.defaultProjectKey}
                                onChange={(e) => handleJiraConfigChange('defaultProjectKey', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Authentication */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Authentication</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="jira-email">Email</Label>
                              <Input
                                id="jira-email"
                                placeholder="your-email@company.com"
                                type="email"
                                value={jiraConfig.email}
                                onChange={(e) => handleJiraConfigChange('email', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="jira-token">API Token</Label>
                              <Input
                                id="jira-token"
                                type="password"
                                placeholder="Your Jira API token"
                                value={jiraConfig.apiToken}
                                onChange={(e) => handleJiraConfigChange('apiToken', e.target.value)}
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

                        {/* Issue Defaults */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Issue Defaults</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="jira-issue-type">Default Issue Type</Label>
                              <Select
                                value={jiraConfig.defaultIssueType}
                                onValueChange={(value: string) => handleJiraConfigChange('defaultIssueType', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Task">Task</SelectItem>
                                  <SelectItem value="Story">Story</SelectItem>
                                  <SelectItem value="Bug">Bug</SelectItem>
                                  <SelectItem value="Epic">Epic</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="jira-priority">Default Priority</Label>
                              <Select
                                value={jiraConfig.defaultPriority}
                                onValueChange={(value: string) => handleJiraConfigChange('defaultPriority', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Highest">Highest</SelectItem>
                                  <SelectItem value="High">High</SelectItem>
                                  <SelectItem value="Medium">Medium</SelectItem>
                                  <SelectItem value="Low">Low</SelectItem>
                                  <SelectItem value="Lowest">Lowest</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        {/* Linkage Options */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Linkage Options</h4>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-base font-medium">Auto-create Issues</Label>
                              <p className="text-sm text-muted-foreground">
                                Automatically create Jira issues when documents are generated
                              </p>
                            </div>
                            <Switch
                              checked={jiraConfig.autoCreateIssues}
                              onCheckedChange={(checked: boolean) => handleJiraConfigChange('autoCreateIssues', checked)}
                            />
                          </div>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-base font-medium">Link Confluence Pages</Label>
                              <p className="text-sm text-muted-foreground">
                                Attach Confluence page URLs to Jira issues as remote links
                              </p>
                            </div>
                            <Switch
                              checked={jiraConfig.linkConfluencePages}
                              onCheckedChange={(checked: boolean) => handleJiraConfigChange('linkConfluencePages', checked)}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={testJiraConnection}
                            disabled={testing || (!existingJiraIntegration && !realIntegrations.find((i: any) => i.type === "jira"))}
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
                            onClick={saveJiraConfiguration}
                            disabled={saving || !jiraConfig.baseUrl || !jiraConfig.email || !jiraConfig.apiToken}
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
                              onCheckedChange={(checked: boolean) => handleSharepointConfigChange('syncEnabled', checked)}
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
                              onCheckedChange={(checked: boolean) => handleSharepointConfigChange('autoSync', checked)}
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

              <TabsContent value="notion" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notion Configuration</CardTitle>
                    <CardDescription>
                      Configure Notion integration for document synchronization and knowledge management
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
                        {/* Authentication */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Authentication</h4>
                          <div className="space-y-2">
                            <Label htmlFor="notion-token">Integration Token</Label>
                            <Input
                              id="notion-token"
                              type="password"
                              placeholder="Your Notion Internal Integration Token"
                              value={notionConfig.integrationToken}
                              onChange={(e) => handleNotionConfigChange('integrationToken', e.target.value)}
                              autoComplete="off"
                              data-lpignore="true"
                              data-form-type="other"
                            />
                            {notionConfig.integrationToken && (
                              <p className="text-xs text-green-600">Token entered ({notionConfig.integrationToken.length} characters)</p>
                            )}
                            {!notionConfig.integrationToken && realIntegrations.find(i => i.type === "notion") && (
                              <p className="text-xs text-blue-600">Using stored token from saved configuration</p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Create an internal integration in Notion and copy the token.
                            <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline ml-1">
                              Manage integrations
                            </a>
                          </div>
                        </div>

                        {/* Optional Configuration */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Optional Configuration</h4>
                          <div className="space-y-2">
                            <Label htmlFor="notion-database">Default Database ID (optional)</Label>
                            <Input
                              id="notion-database"
                              placeholder="Database ID to sync documents to"
                              value={notionConfig.defaultDatabaseId}
                              onChange={(e) => handleNotionConfigChange('defaultDatabaseId', e.target.value)}
                            />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            The database ID can be found in the URL of your Notion database (the 32-character string after the workspace name).
                          </div>
                        </div>

                        {/* Sync Options */}
                        <div className="space-y-4">
                          <h4 className="text-sm font-medium text-muted-foreground">Sync Options</h4>

                          <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-base font-medium">Enable Synchronization</Label>
                              <p className="text-sm text-muted-foreground">
                                Allow documents to be synchronized between ADPA and Notion
                              </p>
                            </div>
                            <Switch
                              checked={notionConfig.syncEnabled}
                              onCheckedChange={(checked: boolean) => handleNotionConfigChange('syncEnabled', checked)}
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
                              checked={notionConfig.autoSync}
                              onCheckedChange={(checked: boolean) => handleNotionConfigChange('autoSync', checked)}
                            />
                          </div>

                          {notionConfig.autoSync && (
                            <div className="space-y-2">
                              <Label htmlFor="notion-sync-interval">Sync Interval (minutes)</Label>
                              <Input
                                id="notion-sync-interval"
                                type="number"
                                min="5"
                                max="1440"
                                placeholder="60"
                                value={notionConfig.syncInterval}
                                onChange={(e) => handleNotionConfigChange('syncInterval', parseInt(e.target.value) || 60)}
                              />
                            </div>
                          )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-4 border-t">
                          <Button
                            variant="outline"
                            onClick={testNotionConnection}
                            disabled={testing || !notionConfig.integrationToken}
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
                            onClick={saveNotionConfiguration}
                            disabled={saving}
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
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Import from Notion Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5" />
                      Import from Notion
                    </CardTitle>
                    <CardDescription>
                      Import pages and database entries from your Notion workspace into ADPA
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Sync Direction Indicator */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-blue-700">
                          <span className="font-medium">Notion</span>
                          <ArrowDown className="h-4 w-4" />
                          <span className="font-medium">ADPA</span>
                        </div>
                        <Badge variant="secondary">One-way Import</Badge>
                      </div>
                      <p className="text-sm text-blue-600 mt-2">
                        Documents from Notion will be imported into ADPA. Changes made in ADPA will not sync back to Notion.
                      </p>
                    </div>

                    {/* Project Selection */}
                    <div className="space-y-2">
                      <Label htmlFor="notion-target-project">Target Project (optional)</Label>
                      <Select value={selectedProjectId || "none"} onValueChange={(value: string) => setSelectedProjectId(value === "none" ? "" : value)}>
                        <SelectTrigger id="notion-target-project">
                          <SelectValue placeholder="Select a project to import documents into" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No project (import as unassigned)</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {selectedProjectId
                          ? `Documents will be added to the selected project.`
                          : `Documents will be imported without a project. You can assign them later.`}
                      </p>
                    </div>

                    {/* Import Status/Result */}
                    {syncResult && (
                      <div className={`p-4 rounded-lg ${syncResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        {syncResult.success ? (
                          <div className="flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-5 w-5" />
                            <span>Successfully imported {syncResult.count} documents</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="h-5 w-5" />
                            <span>Import failed: {syncResult.error}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Import Button */}
                    <div className="pt-2">
                      <Button
                        onClick={() => handleNotionSync()}
                        disabled={syncing || !realIntegrations.find(i => i.type === "notion")}
                        className="w-full"
                      >
                        {syncing ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing from Notion...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Import Documents from Notion
                          </>
                        )}
                      </Button>
                      {!realIntegrations.find(i => i.type === "notion") && (
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Save a Notion configuration above before importing
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Notion Setup Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Notion Integration Setup
                    </CardTitle>
                    <CardDescription>
                      Step-by-step instructions to set up Notion integration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                        <div>
                          <h5 className="font-medium">Create an Internal Integration</h5>
                          <p className="text-sm text-muted-foreground">
                            Go to <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Notion Integrations</a> → Create new integration
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                        <div>
                          <h5 className="font-medium">Configure Capabilities</h5>
                          <p className="text-sm text-muted-foreground">Enable these capabilities:</p>
                          <ul className="text-sm text-muted-foreground mt-1 ml-4 list-disc">
                            <li>Read content</li>
                            <li>Update content</li>
                            <li>Insert content</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                        <div>
                          <h5 className="font-medium">Copy the Integration Token</h5>
                          <p className="text-sm text-muted-foreground">
                            Copy the "Internal Integration Token" from the secrets section
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                        <div>
                          <h5 className="font-medium">Connect Pages/Databases to Integration</h5>
                          <p className="text-sm text-muted-foreground">
                            In Notion, open any page or database you want to sync → Click ⋯ (more) → Add connections → Select your integration
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h6 className="font-medium text-gray-900 mb-2">Testing Your Setup</h6>
                      <p className="text-sm text-gray-800">
                        After completing the setup, enter your Integration Token above, then click "Test Connection" to verify the integration works correctly.
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
                        <select
                          id="git-provider"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          aria-label="Git Provider"
                        >
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
              <TabsContent value="mongodb-analysis" className="space-y-4">
                <MongoDBDashboard
                  integrationId={realIntegrations.find(i => i.type === "mongodb")?.id || null}
                />
              </TabsContent>
              <TabsContent value="pinecone-analysis" className="space-y-4">
                <PineconeDashboard
                  integrationId={realIntegrations.find(i => i.type === "pinecone")?.id || null}
                />
              </TabsContent>

              <TabsContent value="supabase-management" className="space-y-4">
                <SupabaseDashboard
                  integrationId={realIntegrations.find(i => i.type === "supabase")?.id || null}
                />
              </TabsContent>

              <TabsContent value="neo4j-analysis" className="space-y-4">
                <Neo4jDashboard
                  integrationId={realIntegrations.find(i => i.type === "neo4j")?.id || null}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <MongoDBSyncDialog
        open={mongoSyncDialogOpen}
        onOpenChange={setMongoSyncDialogOpen}
        projects={projects}
        integrationId={mongoIntegrationToSync}
        onSyncComplete={() => {
          loadExistingIntegrations()
          toast.success("MongoDB sync completed successfully")
        }}
      />
    </div>
  )
}
