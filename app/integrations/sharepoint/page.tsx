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
  HardDrive,
  Building,
  Users,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { SiteCard } from "./components/SiteCard"
import { DriveCard } from "./components/DriveCard"
import { FileCard } from "./components/FileCard"

interface SharePointSite {
  id: string
  name: string
  displayName: string
  webUrl: string
  description?: string
  createdDateTime: string
  lastModifiedDateTime: string
}

interface SharePointDrive {
  id: string
  name: string
  description?: string
  driveType: string
  webUrl: string
  createdDateTime: string
  lastModifiedDateTime: string
  quota?: {
    total: number
    used: number
    remaining: number
    state: string
  }
}

interface SharePointFile {
  id: string
  name: string
  webUrl: string
  size: number
  createdDateTime: string
  lastModifiedDateTime: string
  file?: {
    mimeType: string
  }
  createdBy?: {
    user?: {
      displayName: string
      email: string
    }
  }
  lastModifiedBy?: {
    user?: {
      displayName: string
      email: string
    }
  }
}

export default function SharePointIntegrationPage() {
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()
  
  const [integration, setIntegration] = useState<any>(null)
  const [sites, setSites] = useState<SharePointSite[]>([])
  const [drives, setDrives] = useState<SharePointDrive[]>([])
  const [files, setFiles] = useState<SharePointFile[]>([])
  const [searchResults, setSearchResults] = useState<SharePointFile[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedSite, setSelectedSite] = useState("")
  const [selectedDrive, setSelectedDrive] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  // Configuration state
  const [config, setConfig] = useState({
    tenantId: "",
    clientId: "",
    clientSecret: "",
    defaultSiteId: "",
    syncEnabled: true,
    autoSync: false,
    syncInterval: 60,
  })

  useEffect(() => {
    fetchIntegration()
  }, [])

  const fetchIntegration = async () => {
    try {
      setLoading(true)
      // Get SharePoint integration
      const integrations = await apiClient.getIntegrations()
      const sharepointIntegration = integrations.find(i => i.type === "sharepoint")
      
      if (sharepointIntegration) {
        setIntegration(sharepointIntegration)
        setConfig({
          tenantId: sharepointIntegration.configuration.tenant_id || "",
          clientId: sharepointIntegration.configuration.client_id || "",
          clientSecret: sharepointIntegration.configuration.client_secret || "",
          defaultSiteId: sharepointIntegration.configuration.default_site_id || "",
          syncEnabled: sharepointIntegration.configuration.sync_enabled ?? true,
          autoSync: sharepointIntegration.configuration.auto_sync ?? false,
          syncInterval: sharepointIntegration.configuration.sync_interval || 60,
        })
        
        if (sharepointIntegration.is_active) {
          await fetchSites(sharepointIntegration.id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch SharePoint integration:", error)
      toast.error("Failed to load integration")
    } finally {
      setLoading(false)
    }
  }

  const fetchSites = async (integrationId: string) => {
    try {
      const response = await fetch(`http://localhost:5001/api/integrations/sharepoint/${integrationId}/sites`)
      const data = await response.json()
      
      if (data.success) {
        setSites(data.sites)
      }
    } catch (error) {
      console.error("Failed to fetch sites:", error)
    }
  }

  const fetchDrives = async (siteId: string) => {
    if (!integration) return

    try {
      const response = await fetch(`http://localhost:5001/api/integrations/sharepoint/${integration.id}/sites/${siteId}/drives`)
      const data = await response.json()
      
      if (data.success) {
        setDrives(data.drives)
      }
    } catch (error) {
      console.error("Failed to fetch drives:", error)
    }
  }

  const fetchFiles = async (driveId: string, folderId: string = "root") => {
    if (!integration) return

    try {
      const response = await fetch(
        `http://localhost:5001/api/integrations/sharepoint/${integration.id}/drives/${driveId}/files?folderId=${folderId}`
      )
      const data = await response.json()
      
      if (data.success) {
        setFiles(data.files)
      }
    } catch (error) {
      console.error("Failed to fetch files:", error)
    }
  }

  const testConnection = async () => {
    try {
      setTesting(true)

      const url = "/api/integrations/sharepoint/test"
      const requestData = {
        tenantId: config.tenantId,
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      }

      console.log("🚀 Testing SharePoint connection...")
      console.log("📍 URL:", url)
      console.log("📦 Request data:", {
        tenantId: config.tenantId ? "***" : "empty",
        clientId: config.clientId ? "***" : "empty",
        clientSecret: config.clientSecret ? "***" : "empty"
      })

      // First test if the server is reachable
      try {
        const healthCheck = await fetch("/api/health")
        console.log("🏥 Health check:", healthCheck.status, await healthCheck.text())
      } catch (healthError) {
        console.error("❌ Health check failed:", healthError)
      }

      // Get auth token
      const token = localStorage.getItem('token')
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      }
      if (token) {
        headers["Authorization"] = `Bearer ${token}`
      }

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestData),
      })

      console.log("📡 Response received:")
      console.log("   Status:", response.status)
      console.log("   Status Text:", response.statusText)
      console.log("   URL:", response.url)

      const data = await response.json()

      if (data.success) {
        toast.success("Connection successful!")
      } else {
        toast.error(data.error || "Connection failed")
      }
    } catch (error) {
      console.error("Connection test failed:", error)
      toast.error("Connection test failed")
    } finally {
      setTesting(false)
    }
  }

  const saveConfiguration = async () => {
    try {
      const configData = {
        name: "SharePoint",
        type: "sharepoint",
        configuration: {
          tenant_id: config.tenantId,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          default_site_id: config.defaultSiteId,
          sync_enabled: config.syncEnabled,
          auto_sync: config.autoSync,
          sync_interval: config.syncInterval,
        },
        is_active: true,
      }

      if (integration) {
        await apiClient.updateIntegration(integration.id, configData)
        toast.success("Configuration updated successfully")
      } else {
        const newIntegration = await apiClient.createIntegration(configData)
        setIntegration(newIntegration)
        toast.success("Integration created successfully")
      }

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
      
      const response = await fetch(`http://localhost:5000/api/integrations/sharepoint/${integration.id}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          siteId: selectedSite || undefined,
          driveId: selectedDrive || undefined,
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Successfully synced ${data.syncedFiles} files`)
        await fetchIntegration()
      } else {
        toast.error(data.error || "Sync failed")
      }
    } catch (error) {
      console.error("Sync failed:", error)
      toast.error("Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const searchContent = async () => {
    if (!integration || !searchQuery) return

    try {
      const response = await fetch(
        `http://localhost:5000/api/integrations/sharepoint/${integration.id}/search?query=${encodeURIComponent(searchQuery)}${selectedSite ? `&siteId=${selectedSite}` : ""}`
      )
      const data = await response.json()

      if (data.success) {
        setSearchResults(data.results)
      } else {
        toast.error(data.error || "Search failed")
      }
    } catch (error) {
      console.error("Search failed:", error)
      toast.error("Search failed")
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
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
                      <Building className="h-8 w-8 text-blue-500" />
                      SharePoint Integration
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Sync documents and collaborate with SharePoint sites and OneDrive
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
                  <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="configuration">Configuration</TabsTrigger>
                    <TabsTrigger value="sites">Sites</TabsTrigger>
                    <TabsTrigger value="drives">Document Libraries</TabsTrigger>
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
                            Sync all documents from your SharePoint sites to ADPA
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
                            Export ADPA documents to SharePoint document libraries
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Button
                            variant="outline"
                            disabled={!integration?.is_active}
                            className="w-full"
                          >
                            <ArrowUpFromLine className="h-4 w-4 mr-2" />
                            Export to SharePoint
                          </Button>
                        </CardContent>
                      </AnimatedCard>
                    </div>
                  </TabsContent>

                  <TabsContent value="configuration" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle>SharePoint Configuration</CardTitle>
                        <CardDescription>
                          Configure your SharePoint connection settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="tenantId">Tenant ID</Label>
                            <Input
                              id="tenantId"
                              placeholder="e.g. 12345678-1234-1234-1234-123456789012"
                              value={config.tenantId}
                              onChange={(e) => setConfig({ ...config, tenantId: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="clientId">Client ID</Label>
                            <Input
                              id="clientId"
                              placeholder="e.g. 12345678-1234-1234-1234-123456789012"
                              value={config.clientId}
                              onChange={(e) => setConfig({ ...config, clientId: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="clientSecret">Client Secret</Label>
                          <Input
                            id="clientSecret"
                            type="password"
                            placeholder="Your SharePoint app client secret"
                            value={config.clientSecret}
                            onChange={(e) => setConfig({ ...config, clientSecret: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="defaultSiteId">Default Site ID (optional)</Label>
                          <Input
                            id="defaultSiteId"
                            placeholder="Default SharePoint site ID"
                            value={config.defaultSiteId}
                            onChange={(e) => setConfig({ ...config, defaultSiteId: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="syncEnabled">Sync Enabled</Label>
                            <Select
                              value={config.syncEnabled ? "true" : "false"}
                              onValueChange={(value) => setConfig({ ...config, syncEnabled: value === "true" })}
                            >
                              <SelectTrigger id="syncEnabled">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Enabled</SelectItem>
                                <SelectItem value="false">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="autoSync">Auto Sync</Label>
                            <Select
                              value={config.autoSync ? "true" : "false"}
                              onValueChange={(value) => setConfig({ ...config, autoSync: value === "true" })}
                            >
                              <SelectTrigger id="autoSync">
                                <SelectValue placeholder="Select option" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="true">Enabled</SelectItem>
                                <SelectItem value="false">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="syncInterval">Sync Interval (minutes)</Label>
                          <Input
                            id="syncInterval"
                            type="number"
                            min="5"
                            max="1440"
                            placeholder="60"
                            value={config.syncInterval}
                            onChange={(e) => setConfig({ ...config, syncInterval: parseInt(e.target.value) || 60 })}
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

                  <TabsContent value="sites" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          SharePoint Sites
                        </CardTitle>
                        <CardDescription>
                          Browse and manage your SharePoint sites
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {sites.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {sites.map((site) => (
                              <SiteCard
                                key={site.id}
                                site={site}
                                onSelect={setSelectedSite}
                                onViewDrives={fetchDrives}
                                isSelected={selectedSite === site.id}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Sites Found</h3>
                            <p className="text-muted-foreground">
                              {integration?.is_active
                                ? "No SharePoint sites are accessible with the current configuration."
                                : "Configure the integration to view sites."
                              }
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </TabsContent>

                  <TabsContent value="drives" className="space-y-6">
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <HardDrive className="h-5 w-5" />
                          Document Libraries
                        </CardTitle>
                        <CardDescription>
                          Browse document libraries and their files
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {selectedSite && (
                          <div className="mb-4 p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium">
                              Selected Site: {sites.find(s => s.id === selectedSite)?.displayName || selectedSite}
                            </p>
                          </div>
                        )}

                        {drives.length > 0 ? (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {drives.map((drive) => (
                                <DriveCard
                                  key={drive.id}
                                  drive={drive}
                                  onSelect={setSelectedDrive}
                                  onViewFiles={(driveId) => {
                                    setSelectedDrive(driveId)
                                    fetchFiles(driveId)
                                  }}
                                  isSelected={selectedDrive === drive.id}
                                />
                              ))}
                            </div>

                            {files.length > 0 && selectedDrive && (
                              <div className="mt-6">
                                <h3 className="text-lg font-semibold mb-4">Files in Selected Library</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {files.map((file) => (
                                    <FileCard
                                      key={file.id}
                                      file={file}
                                      integrationId={integration?.id}
                                      driveId={selectedDrive}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <HardDrive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No Document Libraries Found</h3>
                            <p className="text-muted-foreground">
                              {selectedSite
                                ? "No document libraries found in the selected site."
                                : "Select a site to view its document libraries."
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
                          Search SharePoint content and import specific files
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="Search SharePoint content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && searchContent()}
                          />
                          <Select value={selectedSite} onValueChange={setSelectedSite}>
                            <SelectTrigger className="w-48">
                              <SelectValue placeholder="All sites" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All sites</SelectItem>
                              {sites.map((site) => (
                                <SelectItem key={site.id} value={site.id}>
                                  {site.displayName}
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
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {searchResults.map((file) => (
                                <FileCard
                                  key={file.id}
                                  file={file}
                                  integrationId={integration?.id}
                                  onImport={async (fileId) => {
                                    // Import logic would go here
                                    console.log("Importing file:", fileId)
                                  }}
                                />
                              ))}
                            </div>
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
