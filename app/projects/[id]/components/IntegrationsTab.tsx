"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from '@/lib/notify'
import { sendNotification } from '@/lib/notifications'
import { apiClient } from "@/lib/api"
import { Loader2, ExternalLink, CheckCircle2, XCircle } from "lucide-react"

interface IntegrationSettings {
  confluence: {
    enabled: boolean
    spaceKey: string | null
    parentPageId: string | null
    autoPublish: boolean
  }
  jira: {
    enabled: boolean
    projectKey: string | null
    issueType: string | null
    priority: string | null
    autoCreate: boolean
  }
  settings: Record<string, any>
}

interface IntegrationsTabProps {
  projectId: string
}

const defaultSettings: IntegrationSettings = {
  confluence: {
    enabled: false,
    spaceKey: null,
    parentPageId: null,
    autoPublish: false
  },
  jira: {
    enabled: false,
    projectKey: null,
    issueType: null,
    priority: null,
    autoCreate: false
  },
  settings: {}
}

export function IntegrationsTab({ projectId }: IntegrationsTabProps) {
  const [settings, setSettings] = useState<IntegrationSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState<IntegrationSettings>(defaultSettings)

  useEffect(() => {
    fetchSettings()
  }, [projectId])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data = await apiClient.get(`/projects/${projectId}/integrations`)
      
      // Normalize the response to ensure proper structure
      const normalizedData: IntegrationSettings = {
        confluence: {
          enabled: data?.confluence?.enabled ?? false,
          spaceKey: data?.confluence?.spaceKey ?? null,
          parentPageId: data?.confluence?.parentPageId ?? null,
          autoPublish: data?.confluence?.autoPublish ?? false
        },
        jira: {
          enabled: data?.jira?.enabled ?? false,
          projectKey: data?.jira?.projectKey ?? null,
          issueType: data?.jira?.issueType ?? null,
          priority: data?.jira?.priority ?? null,
          autoCreate: data?.jira?.autoCreate ?? false
        },
        settings: data?.settings ?? {}
      }
      
      setSettings(normalizedData)
      setLocalSettings(normalizedData)
    } catch (error: any) {
      console.error("Failed to fetch integration settings:", error)
      sendNotification({ type: 'error', title: 'Integrations Load Failed', message: 'Failed to load integration settings', announce: true })
      toast.error("Failed to load integration settings")
      // Set defaults on error
      setSettings(defaultSettings)
      setLocalSettings(defaultSettings)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!localSettings) return

    try {
      setSaving(true)
      await apiClient.put(`/projects/${projectId}/integrations`, localSettings)
      setSettings(localSettings)
      sendNotification({ type: 'success', title: 'Integrations Saved', message: 'Integration settings saved successfully', announce: true })
      toast.success("Integration settings saved successfully")
    } catch (error: any) {
      console.error("Failed to save integration settings:", error)
      
      // Extract error message safely
      let errorMessage = "Failed to save integration settings"
      if (error?.response?.data?.error) {
        const errorData = error.response.data.error
        if (typeof errorData === 'string') {
          errorMessage = errorData
        } else if (errorData?.message) {
          errorMessage = errorData.message
        } else if (errorData?.details) {
          errorMessage = errorData.details
        } else {
          errorMessage = JSON.stringify(errorData)
        }
      } else if (error?.message) {
        errorMessage = error.message
      }
      
      sendNotification({ type: 'error', title: 'Integrations Save Failed', message: errorMessage, announce: true })
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const updateConfluence = (updates: Partial<IntegrationSettings['confluence']>) => {
    setLocalSettings(prev => {
      const current = prev || defaultSettings
      return {
        ...current,
        confluence: { ...current.confluence, ...updates }
      }
    })
  }

  const updateJira = (updates: Partial<IntegrationSettings['jira']>) => {
    setLocalSettings(prev => {
      const current = prev || defaultSettings
      return {
        ...current,
        jira: { ...current.jira, ...updates }
      }
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  // Ensure localSettings always has the proper structure
  const safeLocalSettings = localSettings || defaultSettings
  const safeSettings = settings || defaultSettings
  const hasChanges = JSON.stringify(safeLocalSettings) !== JSON.stringify(safeSettings)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integration Settings</h2>
          <p className="text-muted-foreground mt-1">
            Configure Confluence and Jira publishing for this project
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Settings"
          )}
        </Button>
      </div>

      {/* Confluence Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ExternalLink className="h-5 w-5" />
            <span>Confluence Integration</span>
            {safeLocalSettings.confluence?.enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </CardTitle>
          <CardDescription>
            Configure automatic publishing of documents to Confluence
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confluence-enabled">Enable Confluence Publishing</Label>
              <p className="text-sm text-muted-foreground">
                Allow documents to be published to Confluence
              </p>
            </div>
            <Switch
              id="confluence-enabled"
              checked={safeLocalSettings.confluence?.enabled ?? false}
              onCheckedChange={(checked: boolean) => updateConfluence({ enabled: checked })}
            />
          </div>

          {safeLocalSettings.confluence?.enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="confluence-space-key">Confluence Space Key</Label>
                  <Input
                    id="confluence-space-key"
                    placeholder="e.g., ADPA"
                    value={safeLocalSettings.confluence?.spaceKey || ""}
                    onChange={(e) => updateConfluence({ spaceKey: e.target.value || null })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Override the default Confluence space for this project
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confluence-parent-page">Parent Page ID (Optional)</Label>
                  <Input
                    id="confluence-parent-page"
                    placeholder="e.g., 123456789"
                    value={safeLocalSettings.confluence?.parentPageId || ""}
                    onChange={(e) => updateConfluence({ parentPageId: e.target.value || null })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Create documents under a specific parent page
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="confluence-auto-publish">Auto-Publish Documents</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically publish documents when created
                    </p>
                  </div>
                  <Switch
                    id="confluence-auto-publish"
                    checked={safeLocalSettings.confluence?.autoPublish ?? false}
                    onCheckedChange={(checked: boolean) => updateConfluence({ autoPublish: checked })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Jira Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ExternalLink className="h-5 w-5" />
            <span>Jira Integration</span>
            {safeLocalSettings.jira?.enabled ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-gray-400" />
            )}
          </CardTitle>
          <CardDescription>
            Configure automatic Jira issue creation for documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="jira-enabled">Enable Jira Integration</Label>
              <p className="text-sm text-muted-foreground">
                Allow documents to create or link to Jira issues
              </p>
            </div>
            <Switch
              id="jira-enabled"
              checked={safeLocalSettings.jira?.enabled ?? false}
              onCheckedChange={(checked: boolean) => updateJira({ enabled: checked })}
            />
          </div>

          {safeLocalSettings.jira?.enabled && (
            <>
              <Separator />
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jira-project-key">Jira Project Key</Label>
                  <Input
                    id="jira-project-key"
                    placeholder="e.g., PROJ"
                    value={safeLocalSettings.jira?.projectKey || ""}
                    onChange={(e) => updateJira({ projectKey: e.target.value || null })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Override the default Jira project key for this project
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jira-issue-type">Default Issue Type</Label>
                  <Input
                    id="jira-issue-type"
                    placeholder="e.g., Task, Story, Bug"
                    value={safeLocalSettings.jira?.issueType || ""}
                    onChange={(e) => updateJira({ issueType: e.target.value || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jira-priority">Default Priority</Label>
                  <Input
                    id="jira-priority"
                    placeholder="e.g., High, Medium, Low"
                    value={safeLocalSettings.jira?.priority || ""}
                    onChange={(e) => updateJira({ priority: e.target.value || null })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="jira-auto-create">Auto-Create Issues</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically create Jira issues when documents are created
                    </p>
                  </div>
                  <Switch
                    id="jira-auto-create"
                    checked={safeLocalSettings.jira?.autoCreate ?? false}
                    onCheckedChange={(checked: boolean) => updateJira({ autoCreate: checked })}
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

