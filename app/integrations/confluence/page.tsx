"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Cloud,
  RefreshCw,
  Download,
  Upload,
  Search,
  FileText,
  Folder,
  CheckCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  Settings,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

interface ConfluenceSpace {
  id: string
  key: string
  name: string
  description?: {
    plain?: string
    view?: string
    _expandable?: any
  } | string
  type: string
  status: string
  _links?: {
    webui: string
  }
}

interface ConfluencePage {
  id: string
  title: string
  type: string
  status: string
  space: {
    id: string
    key: string
    name: string
  }
  version: {
    number: number
    when: string
    by: {
      displayName: string
    }
  }
  _links?: {
    webui: string
  }
}

export default function ConfluenceIntegrationPage() {
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()
  
  const [integration, setIntegration] = useState<any>(null)
  const [spaces, setSpaces] = useState<ConfluenceSpace[]>([])
  const [searchResults, setSearchResults] = useState<ConfluencePage[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSpace, setSelectedSpace] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  // Configuration state
  const [config, setConfig] = useState({
    baseUrl: "",
    username: "",
    apiToken: "",
    targetSpaceKey: "",
  })

  useEffect(() => {
    fetchIntegration()
  }, [])

  const fetchIntegration = async () => {
    try {
      setLoading(true)
      // Get Confluence integration
      const response = await apiClient.getIntegrations()
      const integrations = response.integrations || response // Handle both formats
      const confluenceIntegration = integrations.find(i => i.type === "confluence")
      
      if (confluenceIntegration) {
        setIntegration(confluenceIntegration)
        setConfig({
          baseUrl: confluenceIntegration.configuration.base_url || "",
          username: "", // Credentials are encrypted and not returned
          apiToken: "", // Credentials are encrypted and not returned
          targetSpaceKey: confluenceIntegration.configuration.target_space_key || "",
        })

        if (confluenceIntegration.is_active) {
          await fetchSpaces(confluenceIntegration.id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch Confluence integration:", error)
      toast.error("Failed to load integration")
    } finally {
      setLoading(false)
    }
  }

  const fetchSpaces = async (integrationId: string) => {
    try {
      const response = await apiClient.request(`/integrations/confluence/${integrationId}/spaces`)

      if (response.success) {
        setSpaces(response.spaces)
      }
    } catch (error) {
      console.error("Failed to fetch spaces:", error)
      toast.error("Failed to fetch Confluence spaces")
    }
  }

  const testConnection = async () => {
    try {
      setTesting(true)

      console.log("Testing connection with config:", {
        baseUrl: config.baseUrl,
        username: config.username,
        apiToken: config.apiToken ? "***HIDDEN***" : "EMPTY",
      })

      const response = await apiClient.request("/integrations/confluence/test", {
        method: "POST",
        body: JSON.stringify({
          baseUrl: config.baseUrl,
          credentials: {
            username: config.username,
            api_token: config.apiToken,
          }
        }),
      })

      if (response.success) {
        toast.success("Connection successful!")
      } else {
        toast.error(response.error || "Connection failed")
      }
    } catch (error) {
      console.error("Connection test failed:", error)
      toast.error(error.message || "Connection test failed")
    } finally {
      setTesting(false)
    }
  }

  const saveConfiguration = async () => {
    try {
      // FORCE DEBUG: Always log this
      alert("Save Configuration Started - Check Console")
      console.log("=== SAVE CONFIGURATION DEBUG ===")
      console.log("Config values:", config)

      const configData = {
        name: "Confluence",
        configuration: {
          base_url: config.baseUrl,
          target_space_key: config.targetSpaceKey,
          auto_publish: true,
          create_projects_for_spaces: true,
          sync_on_update: false,
        },
        credentials: {
          username: config.username,
          api_token: config.apiToken,
        },
        is_active: true,
      }

      // Get the current integration ID dynamically
      console.log("Fetching latest integrations to get correct ID...")
      const response = await apiClient.getIntegrations()
      const integrations = response.integrations || response
      console.log("Found integrations:", integrations)

      const currentIntegration = integrations.find(i => i.type === "confluence")
      console.log("Current Confluence integration:", currentIntegration)

      if (currentIntegration) {
        console.log("Using integration ID:", currentIntegration.id)
        await apiClient.updateIntegration(currentIntegration.id, configData)
        setIntegration(currentIntegration)
        toast.success("Configuration updated successfully")
      } else {
        console.log("Creating new integration")
        const newIntegration = await apiClient.createIntegration({
          ...configData,
          type: "confluence" // Include type for creation
        })
        setIntegration(newIntegration)
        toast.success("Integration created successfully")
      }

      // Refresh the integration data
      await fetchIntegration()
    } catch (error) {
      console.error("Failed to save configuration:", error)
      toast.error("Failed to save configuration")
    }
  }

  const syncDocuments = async () => {
    if (!integration) return

    try {
      setSyncing(true)

      const response = await apiClient.request(`/integrations/confluence/${integration.id}/sync`, {
        method: "POST",
      })

      if (response.success) {
        toast.success(`Successfully synced ${response.syncedDocuments} documents`)
        await fetchIntegration()
      } else {
        toast.error(response.error || "Sync failed")
      }
    } catch (error) {
      console.error("Sync failed:", error)
      toast.error(error.message || "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const searchContent = async () => {
    if (!integration || !searchQuery) return

    try {
      const response = await apiClient.request(
        `/integrations/confluence/${integration.id}/search?query=${encodeURIComponent(searchQuery)}${selectedSpace && selectedSpace !== "all" ? `&spaceKey=${selectedSpace}` : ""}`
      )

      if (response.success) {
        setSearchResults(response.results)
      } else {
        toast.error(response.error || "Search failed")
      }
    } catch (error) {
      console.error("Search failed:", error)
      toast.error(error.message || "Search failed")
    }
  }

  const importPage = async (pageId: string) => {
    if (!integration) return

    try {
      const response = await apiClient.request(`/integrations/confluence/${integration.id}/import`, {
        method: "POST",
        body: JSON.stringify({ pageId }),
      })

      if (response.success) {
        toast.success("Page imported successfully")
      } else {
        toast.error(response.error || "Import failed")
      }
    } catch (error) {
      console.error("Import failed:", error)
      toast.error(error.message || "Import failed")
    }
  }

  const exportToConfluence = async () => {
    try {
      // This would typically open a dialog to select documents to export
      // For now, we'll show a placeholder message
      toast.info("Export to Confluence feature coming soon! This will allow you to export ADPA documents to your Confluence spaces.")
    } catch (error) {
      console.error("Failed to export to Confluence:", error)
      toast.error("Failed to export to Confluence")
    }
  }

  const viewInConfluence = (webUrl: string) => {
    // Open Confluence space in new tab
    // Ensure the URL includes /wiki for Confluence Cloud spaces
    let fullUrl
    if (webUrl.startsWith('http')) {
      fullUrl = webUrl
    } else {
      // For relative URLs, construct the full Confluence URL with /wiki
      const baseUrl = config.baseUrl || 'https://cba-adpa.atlassian.net'
      fullUrl = `${baseUrl}/wiki${webUrl}`
    }
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }

  const viewPage = (webUrl: string) => {
    // Open Confluence page in new tab
    // Ensure the URL includes /wiki for Confluence Cloud pages
    let fullUrl
    if (webUrl.startsWith('http')) {
      fullUrl = webUrl
    } else {
      // For relative URLs, construct the full Confluence URL with /wiki
      const baseUrl = config.baseUrl || 'https://cba-adpa.atlassian.net'
      fullUrl = `${baseUrl}/wiki${webUrl}`
    }
    window.open(fullUrl, '_blank', 'noopener,noreferrer')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (!hasPermission("integrations.create") && !hasPermission("integrations.update")) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground">You don't have permission to manage integrations.</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center justify-between"
                >
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <Cloud className="h-8 w-8 text-blue-500" />
                      Confluence Integration
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Sync documents and collaborate with Confluence spaces
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm text-muted-foreground">
                        {isConnected ? 'Connected' : 'Offline'}
                      </span>
                    </div>
                    {integration?.is_active && (
                      <Badge variant="default" className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Active
                      </Badge>
                    )}
                  </div>
                </motion.div>

                {/* Status Card */}
                {integration && (
                  <AnimatedCard>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        Integration Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-3 w-3 rounded-full ${integration.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm font-medium">Status</p>
                            <p className="text-sm text-muted-foreground">
                              {integration.is_active ? 'Active' : 'Inactive'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-4 w-4 text-blue-500" />
                          <div>
                            <p className="text-sm font-medium">Last Sync</p>
                            <p className="text-sm text-muted-foreground">
                              {integration.last_sync ? formatDate(integration.last_sync) : 'Never'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-green-500" />
                          <div>
                            <p className="text-sm font-medium">Sync Status</p>
                            <p className="text-sm text-muted-foreground">
                              {integration.sync_status || 'Not started'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </AnimatedCard>
                )}

                {/* Main Content */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="spaces">Spaces</TabsTrigger>
                    <TabsTrigger value="search">Search & Import</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5" />
                            Sync Documents
                          </CardTitle>
                          <CardDescription>
                            Sync all documents from your Confluence spaces to ADPA
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button 
                            onClick={syncDocuments} 
                            disabled={!integration?.is_active || syncing}
                            className="w-full"
                          >
                            {syncing ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Syncing...
                              </>
                            ) : (
                              <>
                                <Download className="h-4 w-4 mr-2" />
                                Start Sync
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </AnimatedCard>

                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            Export Documents
                          </CardTitle>
                          <CardDescription>
                            Export ADPA documents to Confluence spaces
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            variant="outline"
                            disabled={!integration?.is_active}
                            className="w-full"
                            onClick={exportToConfluence}
                          >
                            <ArrowUpFromLine className="h-4 w-4 mr-2" />
                            Export to Confluence
                          </Button>
                        </CardContent>
                      </AnimatedCard>
                    </div>
                  </TabsContent>

                  <TabsContent value="configuration" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle>Confluence Configuration</CardTitle>
                        <CardDescription>
                          Configure your Confluence connection settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="baseUrl">Confluence Base URL</Label>
                            <Input
                              id="baseUrl"
                              placeholder="https://your-domain.atlassian.net"
                              value={config.baseUrl}
                              onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="username">Username/Email</Label>
                            <Input
                              id="username"
                              placeholder="your-email@company.com"
                              value={config.username}
                              onChange={(e) => setConfig({ ...config, username: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="apiToken">API Token</Label>
                          <Input
                            id="apiToken"
                            type="password"
                            placeholder="Your Confluence API token"
                            value={config.apiToken}
                            onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="targetSpace">Target Space Key (for exports)</Label>
                          <Input
                            id="targetSpace"
                            placeholder="SPACE"
                            value={config.targetSpaceKey}
                            onChange={(e) => setConfig({ ...config, targetSpaceKey: e.target.value })}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button onClick={testConnection} variant="outline" disabled={testing}>
                            {testing ? (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                Testing...
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Test Connection
                              </>
                            )}
                          </Button>
                          <Button onClick={saveConfiguration}>
                            <Settings className="h-4 w-4 mr-2" />
                            Save Configuration
                          </Button>
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>

                  <TabsContent value="spaces" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Folder className="h-5 w-5" />
                          Confluence Spaces
                        </CardTitle>
                        <CardDescription>
                          Browse and manage your Confluence spaces
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {spaces.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {spaces.map((space) => (
                              <Card key={space.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <h3 className="font-semibold">{space.name}</h3>
                                      <Badge variant="outline">{space.key}</Badge>
                                    </div>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {typeof space.description === 'string'
                                        ? space.description
                                        : space.description?.plain || space.description?.view || "No description"}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="text-xs">
                                        {space.type}
                                      </Badge>
                                      <Badge variant="secondary" className="text-xs">
                                        {space.status}
                                      </Badge>
                                    </div>
                                    {space._links?.webui && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => viewInConfluence(space._links.webui)}
                                      >
                                        <ExternalLink className="h-3 w-3 mr-2" />
                                        View in Confluence
                                      </Button>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Spaces Found</h3>
                            <p className="text-muted-foreground">
                              {integration?.is_active 
                                ? "No Confluence spaces are accessible with the current configuration."
                                : "Configure the integration to view spaces."
                              }
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>

                  <TabsContent value="search" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Search className="h-5 w-5" />
                          Search & Import
                        </CardTitle>
                        <CardDescription>
                          Search Confluence content and import specific pages
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search Confluence content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && searchContent()}
                          />
                          <Select value={selectedSpace} onValueChange={setSelectedSpace}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="All spaces" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All spaces</SelectItem>
                              {spaces.map((space) => (
                                <SelectItem key={space.key} value={space.key}>
                                  {space.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={searchContent} disabled={!searchQuery}>
                            <Search className="h-4 w-4 mr-2" />
                            Search
                          </Button>
                        </div>

                        {searchResults.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-semibold">Search Results</h3>
                            {searchResults.map((page) => (
                              <Card key={page.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                      <h4 className="font-medium">{page.title}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        Space: {page.space.name} • Version: {page.version.number}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        Last modified by {page.version.by.displayName}
                                      </p>
                                    </div>
                                    <div className="flex gap-2">
                                      {page._links?.webui && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => viewPage(page._links.webui)}
                                        >
                                          <ExternalLink className="h-3 w-3 mr-2" />
                                          View
                                        </Button>
                                      )}
                                      <Button 
                                        size="sm" 
                                        onClick={() => importPage(page.id)}
                                      >
                                        <ArrowDownToLine className="h-3 w-3 mr-2" />
                                        Import
                                      </Button>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>
                </Tabs>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
