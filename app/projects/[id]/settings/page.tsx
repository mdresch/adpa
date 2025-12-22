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

interface IntegrationState {
  confluence_space_key: string
  confluence_parent_page_id: string
  jira_project_key: string
  jira_issue_type_default: string
}

type Errors = Partial<Record<keyof IntegrationState, string>>

export default function ProjectSettingsPage() {
  const params = useParams<{ id: string }>()
  const projectId = params?.id
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [confluenceSpaceName, setConfluenceSpaceName] = useState<string | null>(null)
  const [lastTestChecks, setLastTestChecks] = useState<any | null>(null)
  const [state, setState] = useState<IntegrationState>({
    confluence_space_key: "",
    confluence_parent_page_id: "",
    jira_project_key: "",
    jira_issue_type_default: "",
  })
  const [errors, setErrors] = useState<Errors>({})

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
        const integ = data?.integration || {}
        setState({
          confluence_space_key: integ.confluence_space_key || "",
          confluence_parent_page_id: integ.confluence_parent_page_id || "",
          jira_project_key: integ.jira_project_key || "",
          jira_issue_type_default: integ.jira_issue_type_default || "",
        })
      } catch (e:any) {
        toast({ title: 'Failed to load settings', description: e?.message || String(e), variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [projectId])

  const save = async () => {
    // Client-side RBAC check
    if (!canUpdate) {
      toast({ title: 'Access denied', description: 'You do not have permission to update integrations.', variant: 'destructive' })
      return
    }

    // Validate before submit
    const { validateIntegrationForm } = await import('@/lib/utils/projectIntegrationValidation')
    const result = validateIntegrationForm(state)
    setErrors(result.errors)
    if (!result.valid) {
      toast({ title: 'Fix validation errors', description: 'Please correct the highlighted fields.', variant: 'destructive' })
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
    } catch (e:any) {
      toast({ title: 'Failed to save', description: e?.message || String(e), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    // Client-side RBAC check
    if (!canTest) {
      toast({ title: 'Access denied', description: 'You do not have permission to test integrations.', variant: 'destructive' })
      return
    }

    // Validate minimal mapping before testing
    const { validateIntegrationForm } = await import('@/lib/utils/projectIntegrationValidation')
    const result = validateIntegrationForm(state)
    setErrors(result.errors)
    if (!result.valid) {
      toast({ title: 'Fix validation errors', description: 'Please correct the highlighted fields before testing.', variant: 'destructive' })
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
        body: JSON.stringify({ confluence_space_key: state.confluence_space_key })
      })
      const data = await res.json()
      if (data?.success) {
        setConfluenceSpaceName(data?.confluence_space_name || null)
        setLastTestChecks(data?.checks || null)
        let desc = data?.message || 'Confluence mapping looks good.'
        if (!data?.confluence_space_name && data?.checks?.hasConfluenceSpace) {
          if (data?.checks?.confluenceResolutionReason === 'no_active_integration') desc = 'Connected, but no active Confluence integration with credentials found.'
          else if (data?.checks?.confluenceResolutionReason === 'not_found_or_unauthorized') desc = 'Connected, but space key not found or access denied.'
          else if (data?.checks?.confluenceResolutionReason === 'invalid_base_url') desc = 'Connected, but Confluence base URL is invalid. Configure an https:// base URL.'
          else if (data?.checks?.confluenceResolutionReason === 'missing_credentials') desc = 'Connected, but Confluence credentials are missing. Add username and API token.'
          else if (data?.checks?.confluenceResolutionReason === 'api_error') desc = 'Connected, but Confluence API error occurred. See server logs.'
        }
        toast({ title: 'Connection OK', description: desc })
      } else {
        setConfluenceSpaceName(null)
        setLastTestChecks(null)
        toast({ title: 'Connection failed', description: data?.error || data?.message || 'See server logs for details.', variant: 'destructive' })
      }
    } catch (e:any) {
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
        <div className="grid gap-2">
          <Label htmlFor="space">Confluence Space Key</Label>
          <Input aria-invalid={!!errors.confluence_space_key} aria-describedby="space-error" id="space" value={state.confluence_space_key} onChange={(e)=> { setState(s=>({...s, confluence_space_key: e.target.value.toUpperCase()})); setErrors(prev=>({...prev, confluence_space_key: undefined})) }} placeholder="AD" />
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
          <Input aria-invalid={!!errors.confluence_parent_page_id} aria-describedby="parent-error" id="parent" value={state.confluence_parent_page_id} onChange={(e)=> { setState(s=>({...s, confluence_parent_page_id: e.target.value.replace(/[^0-9]/g, '')})); setErrors(prev=>({...prev, confluence_parent_page_id: undefined})) }} placeholder="329253087" />
          {errors.confluence_parent_page_id && <p id="parent-error" className="text-red-600 text-sm">{errors.confluence_parent_page_id}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="jiraKey">Jira Project Key (optional)</Label>
          <Input aria-invalid={!!errors.jira_project_key} aria-describedby="jiraKey-error" id="jiraKey" value={state.jira_project_key} onChange={(e)=> { setState(s=>({...s, jira_project_key: e.target.value.toUpperCase()})); setErrors(prev=>({...prev, jira_project_key: undefined})) }} placeholder="WA" />
          {errors.jira_project_key && <p id="jiraKey-error" className="text-red-600 text-sm">{errors.jira_project_key}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="issueType">Jira Default Issue Type (optional)</Label>
          <Input id="issueType" value={state.jira_issue_type_default} onChange={(e)=> { setState(s=>({...s, jira_issue_type_default: e.target.value})); setErrors(prev=>({...prev, jira_issue_type_default: undefined})) }} placeholder="Task" />
        </div>

        <div className="flex gap-3 pt-2">
          <Button onClick={save} disabled={saving || loading || !canUpdate} aria-disabled={!canUpdate} aria-label="save-settings">{saving ? 'Saving...' : 'Save Settings'}</Button>
          <Button variant="outline" onClick={test} disabled={testing || loading || !canTest} aria-disabled={!canTest} aria-label="test-connection">{testing ? 'Testing...' : 'Test Connection'}</Button>
        </div>
      </Card>
    </div>
  )
}
