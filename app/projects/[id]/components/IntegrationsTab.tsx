"use client"

import React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { toast } from '@/lib/notify'
import { sendNotification } from '@/lib/notifications'
import { apiClient } from "@/lib/api"
import { Loader2, ExternalLink, CheckCircle2, XCircle, Network, RefreshCw } from "lucide-react"

const { useState, useEffect } = React as any

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

type GkgAction = "idle" | "activate" | "bootstrap" | "sync-project" | "reconcile-dry" | "reconcile-cleanup"

interface GkgRecentStatsResponse {
  status: string
  summary: {
    total: number
    completed: number
    failed: number
    cleanupRuns: number
    avgDurationMs: number | null
    totalStaleUnits: number
  }
  recent: Array<{
    jobId: string
    status: string
    cleanup: boolean
    batchSize: number | null
    createdAt: string
    completedAt: string | null
    failedAt: string | null
    durationMs: number | null
    errorMessage: string | null
    staleCounts: { semanticUnits?: number } | null
    deletedNodes: { semanticUnits?: number } | null
    deletedEdges: { semanticUnitExtractedFrom?: number } | null
  }>
}

export function IntegrationsTab({ projectId }: IntegrationsTabProps) {
  const [settings, setSettings] = useState(null as IntegrationSettings | null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState(defaultSettings as IntegrationSettings)
  const [gkgAction, setGkgAction] = useState("idle" as GkgAction)
  const [gkgRecentStats, setGkgRecentStats] = useState(null as GkgRecentStatsResponse | null)
  const [loadingGkgStats, setLoadingGkgStats] = useState(false)

  useEffect(() => {
    fetchSettings()
    fetchGkgRecentStats()
  }, [projectId])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const data: any = await apiClient.get(`/projects/${projectId}/integrations`)
      
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
    setLocalSettings((prev: IntegrationSettings) => {
      const current = prev || defaultSettings
      return {
        ...current,
        confluence: { ...current.confluence, ...updates }
      }
    })
  }

  const updateJira = (updates: Partial<IntegrationSettings['jira']>) => {
    setLocalSettings((prev: IntegrationSettings) => {
      const current = prev || defaultSettings
      return {
        ...current,
        jira: { ...current.jira, ...updates }
      }
    })
  }

  const fetchGkgRecentStats = async () => {
    try {
      setLoadingGkgStats(true)
      const stats = await apiClient.get<GkgRecentStatsResponse>("/gkg/reconcile/recent?limit=8")
      setGkgRecentStats(stats)
    } catch {
      setGkgRecentStats(null)
    } finally {
      setLoadingGkgStats(false)
    }
  }

  const handleGkgBootstrap = async () => {
    try {
      setGkgAction("bootstrap")
      const res = await apiClient.post<{ jobId: string; status: string; type: string }>("/gkg/sync", { bootstrap: true })
      sendNotification({ type: "success", title: "GKG Bootstrap", message: `Job enqueued: ${(res as { jobId?: string })?.jobId ?? "ok"}`, announce: true })
      toast.success("GKG bootstrap job enqueued")
      await fetchGkgRecentStats()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? "GKG bootstrap failed"
      const is503 = (err as { status?: number })?.status === 503
      if (is503) {
        toast.error("Neo4j is not configured. Set NEO4J_URI on the server to enable GKG.")
      } else {
        toast.error(String(msg))
      }
    } finally {
      setGkgAction("idle")
    }
  }

  const handleGkgSyncProject = async () => {
    try {
      setGkgAction("sync-project")
      const res = await apiClient.post<{ jobId: string; status: string; type: string; projectId: string }>("/gkg/sync", { projectId })
      sendNotification({ type: "success", title: "GKG Sync", message: `Project sync enqueued: ${(res as { jobId?: string })?.jobId ?? "ok"}`, announce: true })
      toast.success("GKG project sync job enqueued")
      await fetchGkgRecentStats()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? "GKG sync failed"
      const is503 = (err as { status?: number })?.status === 503
      if (is503) {
        toast.error("Neo4j is not configured. Set NEO4J_URI on the server to enable GKG.")
      } else {
        toast.error(String(msg))
      }
    } finally {
      setGkgAction("idle")
    }
  }

  const handleQueueReconcile = async (cleanup: boolean) => {
    try {
      setGkgAction(cleanup ? "reconcile-cleanup" : "reconcile-dry")
      const res = await apiClient.post<{ jobId: string }>("/gkg/reconcile/queue", {
        cleanup,
        batchSize: 1000,
      })

      sendNotification({
        type: "success",
        title: cleanup ? "GKG Cleanup" : "GKG Drift Scan",
        message: `Reconcile job enqueued: ${(res as { jobId?: string })?.jobId ?? "ok"}`,
        announce: true,
      })
      toast.success(cleanup ? "GKG cleanup job enqueued" : "GKG drift scan job enqueued")
      await fetchGkgRecentStats()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? "GKG reconcile enqueue failed"
      toast.error(String(msg))
    } finally {
      setGkgAction("idle")
    }
  }

  const handleActivateNeo4jAndGkg = async () => {
    try {
      setGkgAction("activate")
      const res = await apiClient.post<{
        status: string
        integrationId: string
        activated: boolean
        enqueuedJobs: Array<{ type: string; jobId: string }>
      }>("/gkg/activate", {
        projectId,
        bootstrap: true,
        syncProject: true,
      })

      const jobsCount = Array.isArray(res?.enqueuedJobs) ? res.enqueuedJobs.length : 0
      sendNotification({
        type: "success",
        title: "Neo4j + GKG Activated",
        message: `Integration active. ${jobsCount} maintenance job(s) enqueued.`,
        announce: true,
      })
      toast.success("Neo4j integration activated and GKG jobs enqueued")
      await fetchGkgRecentStats()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        ?? (err as { message?: string })?.message
        ?? "Neo4j/GKG activation failed"
      toast.error(String(msg))
    } finally {
      setGkgAction("idle")
    }
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
                    onChange={(e: any) => updateConfluence({ spaceKey: e.target.value || null })}
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
                    onChange={(e: any) => updateConfluence({ parentPageId: e.target.value || null })}
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
                    onChange={(e: any) => updateJira({ projectKey: e.target.value || null })}
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
                    onChange={(e: any) => updateJira({ issueType: e.target.value || null })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jira-priority">Default Priority</Label>
                  <Input
                    id="jira-priority"
                    placeholder="e.g., High, Medium, Low"
                    value={safeLocalSettings.jira?.priority || ""}
                    onChange={(e: any) => updateJira({ priority: e.target.value || null })}
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

      {/* Governance Knowledge Graph (GKG) sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Network className="h-5 w-5" />
            <span>Governance Knowledge Graph (GKG)</span>
          </CardTitle>
          <CardDescription>
            Sync this project&apos;s data to the Neo4j Governance Knowledge Graph. Run bootstrap once per environment, then sync this project to push documents and entities.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleActivateNeo4jAndGkg}
              disabled={gkgAction !== "idle"}
            >
              {gkgAction === "activate" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Activating...
                </>
              ) : (
                <>
                  <Network className="h-4 w-4 mr-2" />
                  Auto-Activate Neo4j + GKG
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGkgBootstrap}
              disabled={gkgAction !== "idle"}
            >
              {gkgAction === "bootstrap" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Bootstrap GKG
                </>
              )}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={handleGkgSyncProject}
              disabled={gkgAction !== "idle"}
            >
              {gkgAction === "sync-project" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync this project to GKG
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleQueueReconcile(false)}
              disabled={gkgAction !== "idle"}
            >
              {gkgAction === "reconcile-dry" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queued...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Queue Drift Scan
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleQueueReconcile(true)}
              disabled={gkgAction !== "idle"}
            >
              {gkgAction === "reconcile-cleanup" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Queued...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Queue Cleanup
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGkgRecentStats}
              disabled={loadingGkgStats || gkgAction !== "idle"}
            >
              {loadingGkgStats ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Recent Stats
                </>
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Bootstrap seeds reference nodes (GovernanceDomain, MaturityLevel). Sync pushes this project to Neo4j. Drift Scan and Cleanup run full queued reconciliation for large graphs.
          </p>

          <Separator />

          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Reconcile Statistics</div>
            {!gkgRecentStats ? (
              <p className="text-sm text-muted-foreground">No recent reconcile runs found.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Total</div>
                    <div className="font-semibold">{gkgRecentStats.summary.total}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Completed</div>
                    <div className="font-semibold">{gkgRecentStats.summary.completed}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Failed</div>
                    <div className="font-semibold">{gkgRecentStats.summary.failed}</div>
                  </div>
                  <div className="rounded border p-2">
                    <div className="text-muted-foreground">Cleanup Runs</div>
                    <div className="font-semibold">{gkgRecentStats.summary.cleanupRuns}</div>
                  </div>
                </div>

                <div className="max-h-44 space-y-1 overflow-auto rounded border p-2 text-xs">
                  {gkgRecentStats.recent.slice(0, 6).map((job: any) => (
                    <div key={job.jobId} className="flex items-center justify-between gap-2">
                      <span className="truncate text-muted-foreground">{job.jobId.slice(0, 8)}…</span>
                      <span>{job.cleanup ? "cleanup" : "scan"}</span>
                      <span className={job.status === "failed" ? "text-red-500" : "text-green-600"}>{job.status}</span>
                      <span>
                        {job.durationMs != null ? `${Math.round(job.durationMs / 1000)}s` : "-"}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        onClick={() => {
                          window.open(`/jobs?jobId=${encodeURIComponent(job.jobId)}`, "_blank")
                        }}
                      >
                        View Job
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

