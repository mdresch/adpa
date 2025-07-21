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
import { Settings, Plus, TestTube, CheckCircle, AlertCircle, ExternalLink, RefreshCw, Cloud } from "lucide-react"
import Link from "next/link"
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
  // Confluence configuration state
  const [confluenceConfig, setConfluenceConfig] = useState({
    baseUrl: "https://company.atlassian.net",
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

  const [integrations] = useState([
    {
      id: "1",
      name: "Atlassian Confluence",
      type: "confluence",
      status: "connected",
      enabled: true,
      baseUrl: "https://company.atlassian.net",
      lastSync: "2 minutes ago",
      documentsPublished: 156,
      authType: "OAuth2",
      spaces: ["Engineering", "Product", "Documentation"],
    },
    {
      id: "2",
      name: "Microsoft SharePoint",
      type: "sharepoint",
      status: "connected",
      enabled: true,
      baseUrl: "https://company.sharepoint.com",
      lastSync: "5 minutes ago",
      documentsPublished: 89,
      authType: "Azure AD",
      sites: ["Projects", "Templates", "Archive"],
    },
    {
      id: "3",
      name: "Adobe Document Services",
      type: "adobe",
      status: "warning",
      enabled: true,
      baseUrl: "https://pdf-services.adobe.io",
      lastSync: "1 hour ago",
      documentsPublished: 234,
      authType: "OAuth2",
      services: ["PDF Services", "Document Generation"],
    },
    {
      id: "4",
      name: "GitHub Repository",
      type: "github",
      status: "connected",
      enabled: true,
      baseUrl: "https://api.github.com",
      lastSync: "30 seconds ago",
      documentsPublished: 67,
      authType: "Personal Access Token",
      repositories: ["docs", "templates", "automation"],
    },
  ])

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
      const response = await fetch("/api/integrations/confluence/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: confluenceConfig.baseUrl,
          username: confluenceConfig.username,
          apiToken: confluenceConfig.apiToken,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Show success message (you can add toast notification here)
        alert("Connection successful!")
      } else {
        alert(data.error || "Connection failed")
      }
    } catch (error) {
      console.error("Connection test failed:", error)
      alert("Connection test failed")
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
          username: confluenceConfig.username,
          api_token: confluenceConfig.apiToken,
          target_space_key: confluenceConfig.defaultSpace,
          oauth_client_id: confluenceConfig.oauthClientId,
          oauth_client_secret: confluenceConfig.oauthClientSecret,
          auto_publish: confluenceConfig.autoPublish,
          sync_on_update: confluenceConfig.syncOnUpdate,
          create_projects_for_spaces: confluenceConfig.createProjectsForSpaces,
        },
        is_active: true,
      }

      // Here you would call your API to save the configuration
      // const response = await apiClient.createIntegration(configData)

      // For now, just show success
      alert("Configuration saved successfully!")

    } catch (error) {
      console.error("Failed to save configuration:", error)
      alert("Failed to save configuration")
    } finally {
      setSaving(false)
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
                            <Switch checked={integration.enabled} />
                            <Button variant="ghost" size="sm">
                              <TestTube className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            {integration.type === "confluence" ? (
                              <Link href="/integrations/confluence">
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
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sharepoint" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>SharePoint Configuration</CardTitle>
                    <CardDescription>Configure Microsoft SharePoint integration for document storage</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="sharepoint-url">SharePoint Site URL</Label>
                        <Input
                          id="sharepoint-url"
                          placeholder="https://company.sharepoint.com/sites/docs"
                          defaultValue="https://company.sharepoint.com/sites/docs"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sharepoint-library">Document Library</Label>
                        <Input id="sharepoint-library" placeholder="Documents" defaultValue="Generated Documents" />
                      </div>
                    </div>

                    <div>
                      <Label>Azure AD Configuration</Label>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <Input placeholder="Tenant ID" />
                        <Input placeholder="Client ID" />
                        <Input type="password" placeholder="Client Secret" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-medium">Preserve Metadata</Label>
                        <p className="text-sm text-muted-foreground">
                          Include document metadata when uploading to SharePoint
                        </p>
                      </div>
                      <Switch defaultChecked />
                    </div>

                    <Button>Save Configuration</Button>
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
