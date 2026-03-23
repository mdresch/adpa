"use client"

import React, { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { getApiUrl } from "@/lib/api-url"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { toast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"

interface ProjectIntegrations {
  confluence: {
    enabled: boolean
    spaceKey: string
    parentPageId: string
    autoPublish: boolean
  }
  jira: {
    enabled: boolean
    projectKey: string
    issueType: string
    priority: string
    autoCreate: boolean
  }
  settings: {
    sharepoint_auto_archive?: boolean
    sharepoint_drive_id?: string
    projectwise_auto_archive?: boolean
    projectwise_folder_path?: string
    [key: string]: any
  }
  confluence_space_key?: string
  confluence_parent_page_id?: string
  jira_project_key?: string
  jira_issue_type_default?: string
}

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [confluenceSpaceName, setConfluenceSpaceName] = useState<string | null>(null)
  const [lastTestChecks, setLastTestChecks] = useState<any | null>(null)
  const [state, setState] = useState<ProjectIntegrations>({
    confluence: { enabled: false, spaceKey: "", parentPageId: "", autoPublish: false },
    jira: { enabled: false, projectKey: "", issueType: "", priority: "", autoCreate: false },
    settings: {}
  })
  const [errors, setErrors] = useState<any>({})

  const authHeader = () => {
    if (typeof window === 'undefined') return {}
    const token = localStorage.getItem("auth_token")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const { hasPermission } = useAuth()
  const canUpdate = hasPermission('integrations.update')
  const canTest = hasPermission('integrations.test')

  useEffect(() => {
    const run = async () => {
      if (!projectId) return
      try {
        setLoading(true)
        const res = await fetch(getApiUrl(`/projects/${projectId}/integrations`), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeader(),
          },
        })
        if (!res.ok) throw new Error(`Failed to load settings (${res.status})`)
        const data = await res.json()

        setState({
          confluence: {
            enabled: data.confluence?.enabled || false,
            spaceKey: data.confluence?.spaceKey || "",
            parentPageId: (data.confluence?.parentPageId || "").toString(),
            autoPublish: data.confluence?.autoPublish || false
          },
          jira: {
            enabled: data.jira?.enabled || false,
            projectKey: data.jira?.projectKey || "",
            issueType: data.jira?.issueType || "",
            priority: data.jira?.priority || "",
            autoCreate: data.jira?.autoCreate || false
          },
          settings: data.settings || {}
        })
      } catch (e: any) {
        toast({ title: 'Failed to load settings', description: e?.message || String(e), variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [projectId])

  const save = async () => {
    if (!canUpdate) {
      toast({ title: 'Access denied', description: 'You do not have permission to update integrations.', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)
      const res = await fetch(getApiUrl(`/projects/${projectId}/integrations`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify(state),
      })
      if (!res.ok) throw new Error(`Save failed (${res.status})`)
      toast({ title: 'Settings saved' })
    } catch (e: any) {
      toast({ title: 'Failed to save', description: e?.message || String(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    if (!canTest) {
      toast({ title: 'Access denied', description: 'You do not have permission to test integrations.', variant: 'destructive' })
      return
    }

    try {
      setTesting(true)
      setConfluenceSpaceName(null)
      const res = await fetch(getApiUrl(`/projects/${projectId}/integrations/test`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeader(),
        },
        body: JSON.stringify({ confluence_space_key: state.confluence.spaceKey })
      })
      const data = await res.json()
      if (data?.success) {
        setConfluenceSpaceName(data?.confluence_space_name || null)
        setLastTestChecks(data?.checks || null)
        toast({ title: 'Connection OK' })
      } else {
        toast({ title: 'Connection failed', description: data?.error || 'See server logs.', variant: 'destructive' })
      }
    } catch (e: any) {
      toast({ title: 'Test failed', description: e?.message || String(e), variant: 'destructive' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-8">
      <h1 className="text-2xl font-bold mb-4">Project Settings</h1>
      <p className="text-sm text-muted-foreground mb-6">Configure Confluence/Jira mappings for this project.</p>

      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">Confluence & Jira</h2>
        <div className="grid gap-2">
          <Label htmlFor="space">Confluence Space Key</Label>
          <Input aria-invalid={!!errors.confluence_space_key} aria-describedby="space-error" id="space" value={state.confluence_space_key} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setState(s => ({ ...s, confluence_space_key: e.target.value.toUpperCase() })); setErrors(prev => ({ ...prev, confluence_space_key: undefined })) }} placeholder="AD" />
          {errors.confluence_space_key && <p id="space-error" className="text-red-600 text-sm">{errors.confluence_space_key}</p>}
          {confluenceSpaceName && (
            <p className="text-xs text-muted-foreground">Space Name: {confluenceSpaceName}</p>
          )}
          {!confluenceSpaceName && state.confluence_space_key && lastTestChecks && lastTestChecks.hasConfluenceSpace && (
            <p className="text-xs text-amber-600">
              {lastTestChecks.confluenceResolutionReason === 'no_active_integration' && 'No active Confluence integration with credentials configured.'}
              {lastTestChecks.confluenceResolutionReason === 'not_found_or_unauthorized' && 'Space key not found or access denied.'}
              {lastTestChecks.confluenceResolutionReason === 'invalid_base_url' && 'Confluence base URL is invalid. Use full https://your-domain.atlassian.net URL.'}
              {lastTestChecks.confluenceResolutionReason === 'missing_credentials' && 'Confluence credentials missing. Add username and API token to integration.'}
              {lastTestChecks.confluenceResolutionReason === 'api_error' && 'Confluence API error occurred. Check server logs for details.'}
              {!lastTestChecks.confluenceResolutionReason && 'Space name unavailable. Verify Confluence integration and permissions.'}
            </p>
          )}
          {!lastTestChecks && state.confluence_space_key && (
            <p className="text-xs text-muted-foreground">Space name will show after a successful Test Connection.</p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="parent">Confluence Parent Page ID (optional)</Label>
          <Input aria-invalid={!!errors.confluence_parent_page_id} aria-describedby="parent-error" id="parent" value={state.confluence_parent_page_id} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setState(s => ({ ...s, confluence_parent_page_id: e.target.value.replace(/[^0-9]/g, '') })); setErrors(prev => ({ ...prev, confluence_parent_page_id: undefined })) }} placeholder="329253087" />
          {errors.confluence_parent_page_id && <p id="parent-error" className="text-red-600 text-sm">{errors.confluence_parent_page_id}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="jiraKey">Jira Project Key (optional)</Label>
          <Input aria-invalid={!!errors.jira_project_key} aria-describedby="jiraKey-error" id="jiraKey" value={state.jira_project_key} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setState(s => ({ ...s, jira_project_key: e.target.value.toUpperCase() })); setErrors(prev => ({ ...prev, jira_project_key: undefined })) }} placeholder="WA" />
          {errors.jira_project_key && <p id="jiraKey-error" className="text-red-600 text-sm">{errors.jira_project_key}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issueType">Jira Default Issue Type (optional)</Label>
          <Input id="issueType" value={state.jira_issue_type_default} onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setState(s => ({ ...s, jira_issue_type_default: e.target.value })); setErrors(prev => ({ ...prev, jira_issue_type_default: undefined })) }} placeholder="Task" />
        </div>

        <div className="border-t pt-6 mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Enterprise Storage Archival</h2>
          <div className="space-y-6">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="sp_archive"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={!!(state as any).sharepoint_auto_archive}
                onChange={(e) => setState(s => ({ ...s, sharepoint_auto_archive: e.target.checked } as any))}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="sp_archive" className="text-sm font-medium">Auto-Archive to Microsoft SharePoint</Label>
                <p className="text-xs text-muted-foreground">Automatically push generated documents to a SharePoint Document Library.</p>
                {(state as any).sharepoint_auto_archive && (
                  <div className="mt-2 grid gap-2">
                    <Label htmlFor="sp_drive" className="text-xs">SharePoint Drive ID</Label>
                    <Input
                      id="sp_drive"
                      className="h-8 text-xs"
                      value={(state as any).sharepoint_drive_id || ''}
                      onChange={(e) => setState(s => ({ ...s, sharepoint_drive_id: e.target.value } as any))}
                      placeholder="e.g. b!..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="pw_archive"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={!!(state as any).projectwise_auto_archive}
                onChange={(e) => setState(s => ({ ...s, projectwise_auto_archive: e.target.checked } as any))}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="pw_archive" className="text-sm font-medium">Auto-Archive to Bentley ProjectWise</Label>
                <p className="text-xs text-muted-foreground">Automatically sync infrastructure documents to the ProjectWise environment.</p>
                {(state as any).projectwise_auto_archive && (
                  <div className="mt-2 grid gap-2">
                    <Label htmlFor="pw_path" className="text-xs">ProjectWise Folder Path</Label>
                    <Input
                      id="pw_path"
                      className="h-8 text-xs"
                      value={(state as any).projectwise_folder_path || ''}
                      onChange={(e) => setState(s => ({ ...s, projectwise_folder_path: e.target.value } as any))}
                      placeholder="e.g. ADPA_Archival/Reports"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-6 border-t">
          <Button onClick={save} disabled={saving || loading || !canUpdate} aria-label="save-settings">{saving ? 'Saving...' : 'Save Settings'}</Button>
          <Button variant="outline" onClick={test} disabled={testing || loading || !canTest} aria-label="test-connection">{testing ? 'Testing...' : 'Test Connection'}</Button>
        </div>
      </Card>
    </div>
  )
}
