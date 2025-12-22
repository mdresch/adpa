"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { apiClient } from "@/lib/api"
import { Loader2, Save, Link, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"

interface JiraLinkageConfig {
  enabled: boolean
  integrationId?: string
  autoCreateIssues?: boolean
  linkConfluencePages?: boolean
  defaultIssueType?: string
  defaultPriority?: string
}

interface JiraIntegration {
  id: string
  name: string
  projectKey?: string
}

export default function JiraLinkageSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [config, setConfig] = useState<JiraLinkageConfig>({
    enabled: false,
    autoCreateIssues: false,
    linkConfluencePages: false,
    defaultIssueType: 'Task',
    defaultPriority: 'Medium'
  })
  
  const [availableIntegrations, setAvailableIntegrations] = useState<JiraIntegration[]>([])

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    setMessage(null) // Clear previous messages
    try {
      const data = await apiClient.get('/jira-linkage/config')
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format')
      }
      setConfig(data.config || {
        enabled: false,
        autoCreateIssues: false,
        linkConfluencePages: false,
        defaultIssueType: 'Task',
        defaultPriority: 'Medium'
      })
      setAvailableIntegrations(data.availableIntegrations || [])
    } catch (error) {
      console.error('Failed to load Jira linkage config:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load configuration'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async () => {
    setSaving(true)
    setMessage(null)
    
    try {
      await apiClient.put('/jira-linkage/config', config)
      setMessage({ type: 'success', text: 'Jira linkage settings saved successfully!' })
      await loadConfig() // Reload to get updated config
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to save settings'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setSaving(false)
    }
  }

  const testIntegration = async () => {
    if (!config.integrationId) {
      setMessage({ type: 'error', text: 'Please select a Jira integration first' })
      return
    }

    setTesting(true)
    setMessage(null)
    
    try {
      const result = await apiClient.post(`/jira-linkage/test/${config.integrationId}`)
      if (result.success) {
        setMessage({ 
          type: 'success', 
          text: `Connection successful! ${result.details.projectAccess ? `Project access: ${result.details.projectAccess}` : ''}` 
        })
      } else {
        setMessage({ type: 'error', text: result.message || 'Connection test failed' })
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error || error?.message || 'Connection test failed'
      setMessage({ type: 'error', text: errorMessage })
    } finally {
      setTesting(false)
    }
  }

  const updateConfig = (updates: Partial<JiraLinkageConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }))
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Jira Issue Linkage
        </CardTitle>
        <CardDescription>
          Automatically create or link Jira issues for generated documents. 
          Requires a configured Jira integration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            {message.type === 'success' ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Jira Linkage</Label>
              <div className="text-sm text-muted-foreground">
                Automatically create or link Jira issues for generated documents
              </div>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={(enabled) => updateConfig({ enabled })}
            />
          </div>

          {config.enabled && (
            <>
              {/* Integration Selection */}
              <div className="space-y-2">
                <Label htmlFor="integration">Jira Integration</Label>
                {availableIntegrations.length > 0 ? (
                  <div className="flex gap-2">
                    <Select
                      value={config.integrationId || ""}
                      onValueChange={(integrationId) => updateConfig({ integrationId })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a Jira integration" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableIntegrations.map((integration) => (
                          <SelectItem key={integration.id} value={integration.id}>
                            {integration.name}
                            {integration.projectKey && (
                              <span className="text-muted-foreground ml-2">
                                ({integration.projectKey})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      onClick={testIntegration}
                      disabled={testing || !config.integrationId}
                    >
                      {testing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Test"
                      )}
                    </Button>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      No Jira integrations found. Please configure a Jira integration first.
                      <Button variant="link" className="p-0 h-auto ml-2" asChild>
                        <a href="/integrations" target="_blank" rel="noopener noreferrer">
                          Go to Integrations <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Auto Create Issues */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-create Issues</Label>
                  <div className="text-sm text-muted-foreground">
                    Automatically create new Jira issues for documents
                  </div>
                </div>
                <Switch
                  checked={config.autoCreateIssues}
                  onCheckedChange={(autoCreateIssues) => updateConfig({ autoCreateIssues })}
                />
              </div>

              {/* Link Confluence Pages */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Link Confluence Pages</Label>
                  <div className="text-sm text-muted-foreground">
                    Attach Confluence page URLs to Jira issues
                  </div>
                </div>
                <Switch
                  checked={config.linkConfluencePages}
                  onCheckedChange={(linkConfluencePages) => updateConfig({ linkConfluencePages })}
                />
              </div>

              {/* Default Issue Type */}
              <div className="space-y-2">
                <Label htmlFor="issue-type">Default Issue Type</Label>
                <Select
                  value={config.defaultIssueType || "Task"}
                  onValueChange={(defaultIssueType) => updateConfig({ defaultIssueType })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select issue type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Task">Task</SelectItem>
                    <SelectItem value="Story">Story</SelectItem>
                    <SelectItem value="Bug">Bug</SelectItem>
                    <SelectItem value="Epic">Epic</SelectItem>
                    <SelectItem value="Subtask">Subtask</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Default Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority">Default Priority</Label>
                <Select
                  value={config.defaultPriority || "Medium"}
                  onValueChange={(defaultPriority) => updateConfig({ defaultPriority })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select priority" />
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

          {/* Save Button */}
          <Button
            onClick={saveConfig}
            disabled={saving}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Jira Settings
              </>
            )}
          </Button>

          {/* Information Box */}
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              How Jira Linkage Works
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>When a document is generated, a Jira issue is automatically created or linked</li>
              <li>Document regenerations add comments to the linked Jira issue</li>
              <li>Confluence page URLs can be attached as remote links</li>
              <li>Issues are created in the project specified in your Jira integration</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}