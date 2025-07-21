"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { toast } from "sonner"
import { 
  Github, 
  GitBranch, 
  GitPullRequest, 
  FileText, 
  Settings, 
  Sync, 
  CheckCircle, 
  XCircle,
  Clock,
  ExternalLink,
  Plus,
  Eye
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import { PageTransition } from "@/components/ui/page-transition"
import { AnimatedLayout } from "@/components/ui/animated-layout"
import { apiClient } from "@/lib/api"

interface GitHubIntegration {
  id: string
  name: string
  type: string
  configuration: {
    owner: string
    repo: string
    api_token: string
    default_branch: string
    template_path: string
    auto_sync: boolean
    create_pull_requests: boolean
  }
  is_active: boolean
  last_sync?: string
  sync_status?: string
  created_at: string
  updated_at: string
}

interface GitHubRepository {
  id: number
  name: string
  full_name: string
  description?: string
  private: boolean
  default_branch: string
  html_url: string
}

interface GitHubPullRequest {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  created_at: string
  updated_at: string
}

interface GitHubIssue {
  id: number
  number: number
  title: string
  state: string
  html_url: string
  user: {
    login: string
    avatar_url: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  created_at: string
}

export default function GitHubIntegrationPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [integration, setIntegration] = useState<GitHubIntegration | null>(null)
  const [repository, setRepository] = useState<GitHubRepository | null>(null)
  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([])
  const [issues, setIssues] = useState<GitHubIssue[]>([])
  const [config, setConfig] = useState({
    owner: "",
    repo: "",
    apiToken: "",
    defaultBranch: "main",
    templatePath: "templates",
    autoSync: false,
    createPullRequests: true,
  })

  useEffect(() => {
    fetchIntegration()
  }, [])

  const fetchIntegration = async () => {
    try {
      setLoading(true)
      // Get GitHub integration
      const integrations = await apiClient.getIntegrations()
      const githubIntegration = integrations.find(i => i.type === "github")
      
      if (githubIntegration) {
        setIntegration(githubIntegration)
        setConfig({
          owner: githubIntegration.configuration.owner || "",
          repo: githubIntegration.configuration.repo || "",
          apiToken: githubIntegration.configuration.api_token || "",
          defaultBranch: githubIntegration.configuration.default_branch || "main",
          templatePath: githubIntegration.configuration.template_path || "templates",
          autoSync: githubIntegration.configuration.auto_sync || false,
          createPullRequests: githubIntegration.configuration.create_pull_requests || true,
        })
        
        if (githubIntegration.is_active) {
          await fetchRepositoryInfo(githubIntegration.id)
          await fetchPullRequests(githubIntegration.id)
          await fetchIssues(githubIntegration.id)
        }
      }
    } catch (error) {
      console.error("Failed to fetch integration:", error)
      toast.error("Failed to load GitHub integration")
    } finally {
      setLoading(false)
    }
  }

  const fetchRepositoryInfo = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/github/${integrationId}/repository`)
      const data = await response.json()
      
      if (data.success) {
        setRepository(data.repository)
      }
    } catch (error) {
      console.error("Failed to fetch repository info:", error)
    }
  }

  const fetchPullRequests = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/github/${integrationId}/pull-requests`)
      const data = await response.json()
      
      if (data.success) {
        setPullRequests(data.pullRequests)
      }
    } catch (error) {
      console.error("Failed to fetch pull requests:", error)
    }
  }

  const fetchIssues = async (integrationId: string) => {
    try {
      const response = await fetch(`/api/integrations/github/${integrationId}/issues`)
      const data = await response.json()
      
      if (data.success) {
        setIssues(data.issues)
      }
    } catch (error) {
      console.error("Failed to fetch issues:", error)
    }
  }

  const saveConfiguration = async () => {
    try {
      setSaving(true)

      const configData = {
        name: "GitHub Integration",
        type: "github",
        configuration: {
          owner: config.owner,
          repo: config.repo,
          default_branch: config.defaultBranch,
          template_path: config.templatePath,
          auto_sync: config.autoSync,
          create_pull_requests: config.createPullRequests,
        },
        credentials: {
          api_token: config.apiToken,
        },
        is_active: true,
      }

      let response
      if (integration) {
        // Update existing integration
        response = await fetch(`/api/integrations/${integration.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(configData),
        })
      } else {
        // Create new integration
        response = await fetch("/api/integrations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(configData),
        })
      }

      const data = await response.json()

      if (data.success || response.ok) {
        toast.success("GitHub integration configured successfully")
        await fetchIntegration()
      } else {
        toast.error(data.error || "Configuration failed")
      }
    } catch (error) {
      console.error("Configuration failed:", error)
      toast.error("Configuration failed")
    } finally {
      setSaving(false)
    }
  }

  const testConnection = async () => {
    if (!integration) {
      toast.error("Please save configuration first")
      return
    }

    try {
      const response = await fetch(`/api/integrations/github/${integration.id}/test`, {
        method: "POST",
      })

      const data = await response.json()

      if (data.success) {
        toast.success("Connection test successful")
      } else {
        toast.error(data.error || "Connection test failed")
      }
    } catch (error) {
      console.error("Connection test failed:", error)
      toast.error("Connection test failed")
    }
  }

  const syncTemplates = async () => {
    if (!integration) return

    try {
      setSyncing(true)
      const response = await fetch(`/api/integrations/github/${integration.id}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ syncType: "templates" }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(`Synced ${data.count || 0} templates successfully`)
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getPullRequestStateColor = (state: string) => {
    switch (state) {
      case "open":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-red-100 text-red-800"
      case "merged":
        return "bg-purple-100 text-purple-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getIssueStateColor = (state: string) => {
    switch (state) {
      case "open":
        return "bg-green-100 text-green-800"
      case "closed":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                      <Github className="h-8 w-8 text-gray-900" />
                      GitHub Integration
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Version control for templates and collaborative development
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    {integration && (
                      <>
                        <Button
                          onClick={testConnection}
                          variant="outline"
                          size="sm"
                        >
                          Test Connection
                        </Button>
                        <Button
                          onClick={syncTemplates}
                          disabled={syncing}
                          size="sm"
                        >
                          {syncing ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Syncing...
                            </>
                          ) : (
                            <>
                              <Sync className="h-4 w-4 mr-2" />
                              Sync Templates
                            </>
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>

                {/* Status Card */}
                {integration && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          {getStatusIcon(integration.sync_status || "pending")}
                          Integration Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium">Repository</Label>
                            <p className="text-sm text-muted-foreground">
                              {repository ? (
                                <a
                                  href={repository.html_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 hover:underline"
                                >
                                  {repository.full_name}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                `${config.owner}/${config.repo}`
                              )}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Last Sync</Label>
                            <p className="text-sm text-muted-foreground">
                              {integration.last_sync ? formatDate(integration.last_sync) : "Never"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Status</Label>
                            <Badge
                              variant={integration.is_active ? "default" : "secondary"}
                              className="ml-2"
                            >
                              {integration.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {/* Main Content */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Tabs defaultValue="configuration" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="configuration">Configuration</TabsTrigger>
                      <TabsTrigger value="repository">Repository</TabsTrigger>
                      <TabsTrigger value="pull-requests">Pull Requests</TabsTrigger>
                      <TabsTrigger value="issues">Issues</TabsTrigger>
                    </TabsList>

                    <TabsContent value="configuration" className="space-y-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            GitHub Configuration
                          </CardTitle>
                          <CardDescription>
                            Configure your GitHub repository connection and sync settings
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="owner">Repository Owner</Label>
                              <Input
                                id="owner"
                                placeholder="username or organization"
                                value={config.owner}
                                onChange={(e) => setConfig({ ...config, owner: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="repo">Repository Name</Label>
                              <Input
                                id="repo"
                                placeholder="repository-name"
                                value={config.repo}
                                onChange={(e) => setConfig({ ...config, repo: e.target.value })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="api-token">Personal Access Token</Label>
                            <Input
                              id="api-token"
                              type="password"
                              placeholder="GitHub Personal Access Token"
                              value={config.apiToken}
                              onChange={(e) => setConfig({ ...config, apiToken: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Token needs repo access permissions
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="default-branch">Default Branch</Label>
                              <Input
                                id="default-branch"
                                placeholder="main"
                                value={config.defaultBranch}
                                onChange={(e) => setConfig({ ...config, defaultBranch: e.target.value })}
                              />
                            </div>
                            <div>
                              <Label htmlFor="template-path">Templates Path</Label>
                              <Input
                                id="template-path"
                                placeholder="templates"
                                value={config.templatePath}
                                onChange={(e) => setConfig({ ...config, templatePath: e.target.value })}
                              />
                            </div>
                          </div>

                          <Separator />

                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-base font-medium">Auto-sync Templates</Label>
                                <p className="text-sm text-muted-foreground">
                                  Automatically sync templates from GitHub repository
                                </p>
                              </div>
                              <Switch
                                checked={config.autoSync}
                                onCheckedChange={(checked) => setConfig({ ...config, autoSync: checked })}
                              />
                            </div>

                            <div className="flex items-center justify-between">
                              <div>
                                <Label className="text-base font-medium">Create Pull Requests</Label>
                                <p className="text-sm text-muted-foreground">
                                  Create pull requests for template changes instead of direct commits
                                </p>
                              </div>
                              <Switch
                                checked={config.createPullRequests}
                                onCheckedChange={(checked) => setConfig({ ...config, createPullRequests: checked })}
                              />
                            </div>
                          </div>

                          <Button
                            onClick={saveConfiguration}
                            disabled={saving}
                            className="w-full"
                          >
                            {saving ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Saving...
                              </>
                            ) : (
                              "Save Configuration"
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="repository" className="space-y-6">
                      {repository ? (
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                              <Github className="h-5 w-5" />
                              Repository Information
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-medium">{repository.full_name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {repository.description || "No description"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant={repository.private ? "secondary" : "default"}>
                                    {repository.private ? "Private" : "Public"}
                                  </Badge>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open(repository.html_url, "_blank")}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    View on GitHub
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <Label>Default Branch</Label>
                                  <p className="text-muted-foreground">{repository.default_branch}</p>
                                </div>
                                <div>
                                  <Label>Repository ID</Label>
                                  <p className="text-muted-foreground">{repository.id}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card>
                          <CardContent className="text-center py-8">
                            <Github className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Repository Connected</h3>
                            <p className="text-muted-foreground mb-4">
                              Configure your GitHub integration to view repository information
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="pull-requests" className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Pull Requests</h3>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Pull Request
                        </Button>
                      </div>

                      {pullRequests.length > 0 ? (
                        <div className="space-y-4">
                          {pullRequests.map((pr) => (
                            <Card key={pr.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <GitPullRequest className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <h4 className="font-medium">#{pr.number} {pr.title}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        by {pr.user.login} • {formatDate(pr.created_at)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getPullRequestStateColor(pr.state)}>
                                      {pr.state}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(pr.html_url, "_blank")}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="text-center py-8">
                            <GitPullRequest className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Pull Requests</h3>
                            <p className="text-muted-foreground">
                              No pull requests found in this repository
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="issues" className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">Issues</h3>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Issue
                        </Button>
                      </div>

                      {issues.length > 0 ? (
                        <div className="space-y-4">
                          {issues.map((issue) => (
                            <Card key={issue.id}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <h4 className="font-medium">#{issue.number} {issue.title}</h4>
                                      <p className="text-sm text-muted-foreground">
                                        by {issue.user.login} • {formatDate(issue.created_at)}
                                      </p>
                                      {issue.labels.length > 0 && (
                                        <div className="flex gap-1 mt-2">
                                          {issue.labels.map((label) => (
                                            <Badge
                                              key={label.name}
                                              variant="outline"
                                              style={{ backgroundColor: `#${label.color}20`, borderColor: `#${label.color}` }}
                                            >
                                              {label.name}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge className={getIssueStateColor(issue.state)}>
                                      {issue.state}
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => window.open(issue.html_url, "_blank")}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      ) : (
                        <Card>
                          <CardContent className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Issues</h3>
                            <p className="text-muted-foreground">
                              No issues found in this repository
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </TabsContent>
                  </Tabs>
                </motion.div>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
