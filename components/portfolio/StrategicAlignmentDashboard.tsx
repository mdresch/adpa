"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Target, Link2, Trash2, Loader2 } from "lucide-react"
import { LinkGoalDialog, type StrategicGoalOption } from "@/components/portfolio/LinkGoalDialog"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/lib/notify"
import { cn } from "@/lib/utils"

type AlignmentRow = {
  id: string
  project_id: string
  goal_id: string
  contribution_level: string
  alignment_score: string | number | null
  notes: string | null
  goal_title: string
  goal_category: string | null
  goal_priority: number | null
  project_name: string
}

function contributionBadgeClass(level: string): string {
  switch (level) {
    case "critical":
      return "bg-red-600 hover:bg-red-600 text-white border-transparent"
    case "high":
      return "bg-orange-600 hover:bg-orange-600 text-white border-transparent"
    case "medium":
      return "bg-amber-500 hover:bg-amber-500 text-black border-transparent"
    case "low":
      return "bg-sky-600 hover:bg-sky-600 text-white border-transparent"
    default:
      return ""
  }
}

export function StrategicAlignmentDashboard({ projectId }: { projectId: string }) {
  const { token, isAuthenticated } = useAuth()
  const [alignments, setAlignments] = React.useState<AlignmentRow[]>([])
  const [goals, setGoals] = React.useState<StrategicGoalOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [removingId, setRemovingId] = React.useState<string | null>(null)

  const authHeaders = React.useCallback((): HeadersInit => {
    const h: HeadersInit = {}
    if (token) h.Authorization = `Bearer ${token}`
    return h
  }, [token])

  const loadAlignments = React.useCallback(async () => {
    if (!isAuthenticated || !token) return
    const res = await fetch(`/api/portfolio/strategic-alignment?project_id=${encodeURIComponent(projectId)}`, {
      headers: authHeaders(),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || "Failed to load alignments")
    }
    const data = await res.json()
    setAlignments(data)
  }, [projectId, isAuthenticated, token, authHeaders])

  const loadGoals = React.useCallback(async () => {
    if (!isAuthenticated || !token) return
    const res = await fetch("/api/portfolio/goals?status=active", { headers: authHeaders() })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || "Failed to load goals")
    }
    const rows = await res.json()
    setGoals(
      (rows as { id: string; title: string }[]).map((r) => ({
        id: r.id,
        title: r.title,
      }))
    )
  }, [isAuthenticated, token, authHeaders])

  const refresh = React.useCallback(async () => {
    if (!isAuthenticated || !token) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      await Promise.all([loadAlignments(), loadGoals()])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load strategic alignment")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, token, loadAlignments, loadGoals])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  const linkedGoalIds = React.useMemo(
    () => new Set(alignments.map((a) => a.goal_id)),
    [alignments]
  )

  async function removeLink(goalId: string) {
    if (!token) return
    setRemovingId(goalId)
    try {
      const res = await fetch(
        `/api/portfolio/strategic-alignment?project_id=${encodeURIComponent(projectId)}&goal_id=${encodeURIComponent(goalId)}`,
        { method: "DELETE", headers: authHeaders() }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "Remove failed")
      }
      toast.success("Goal unlinked.")
      await loadAlignments()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove link")
    } finally {
      setRemovingId(null)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Strategic alignment
          </CardTitle>
          <CardDescription>Sign in to view and manage OKR / KPI links for this project.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Strategic alignment
            </CardTitle>
            <CardDescription>
              This project supports {alignments.length} strategic goal
              {alignments.length === 1 ? "" : "s"}. Link OKRs and track contribution levels.
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)} disabled={loading}>
            <Link2 className="h-4 w-4 mr-2" />
            Link goal
          </Button>
        </CardHeader>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading alignment…
          </CardContent>
        </Card>
      ) : alignments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            No strategic goals linked yet. Add alignments to track contribution to organizational objectives.
          </CardContent>
        </Card>
      ) : (
        alignments.map((alignment) => {
          const scoreNum =
            alignment.alignment_score === null || alignment.alignment_score === undefined
              ? null
              : Number(alignment.alignment_score)
          return (
            <Card key={alignment.id}>
              <CardContent className="pt-6">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold leading-snug">{alignment.goal_title}</h3>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {alignment.goal_category ? (
                        <Badge variant="outline">{alignment.goal_category}</Badge>
                      ) : null}
                      {alignment.goal_priority != null ? (
                        <Badge variant="secondary">Priority {alignment.goal_priority}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-2">
                    <Badge
                      className={cn(contributionBadgeClass(alignment.contribution_level))}
                      variant="secondary"
                    >
                      {alignment.contribution_level} contribution
                    </Badge>
                    <div className="text-sm text-muted-foreground">
                      Alignment:{" "}
                      {scoreNum !== null && Number.isFinite(scoreNum) ? `${(scoreNum * 100).toFixed(0)}%` : "—"}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeLink(alignment.goal_id)}
                      disabled={removingId === alignment.goal_id}
                    >
                      {removingId === alignment.goal_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {alignment.notes ? (
                  <p className="text-sm text-muted-foreground mt-4 border-t pt-4">{alignment.notes}</p>
                ) : null}
              </CardContent>
            </Card>
          )
        })
      )}

      <LinkGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        goals={goals}
        authToken={token}
        excludeGoalIds={linkedGoalIds}
        onLinked={() => void loadAlignments()}
      />
    </div>
  )
}
