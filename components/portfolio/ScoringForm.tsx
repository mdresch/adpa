"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/lib/notify"
import { Loader2 } from "lucide-react"

type Criterion = {
  id: string
  name: string
  description: string | null
  weight: string | number
  min_score: number
  max_score: number
}

type ScoreInput = {
  criterion_id: string
  score: number
  rationale: string | null
}

type ExistingScoreRow = {
  criterion_id: string
  score: number
  rationale: string | null
}

export function ScoringForm({ projectId }: { projectId: string }) {
  const { token, isAuthenticated } = useAuth()

  const [criteria, setCriteria] = React.useState<Criterion[]>([])
  const [scores, setScores] = React.useState<Record<string, ScoreInput>>({})
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const authHeaders = React.useCallback((): HeadersInit => {
    const h: HeadersInit = { "Content-Type": "application/json" }
    if (token) h.Authorization = `Bearer ${token}`
    return h
  }, [token])

  const loadCriteria = React.useCallback(async () => {
    const res = await fetch("/api/portfolio/criteria", { headers: token ? { Authorization: `Bearer ${token}` } : {} })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || "Failed to load criteria")
    }
    const data = (await res.json()) as Criterion[]
    setCriteria(data)
    return data
  }, [token])

  const loadExistingScores = React.useCallback(async () => {
    const res = await fetch(`/api/portfolio/scores?project_id=${encodeURIComponent(projectId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: string }).error || "Failed to load existing scores")
    }
    return (await res.json()) as ExistingScoreRow[]
  }, [projectId, token])

  const initializeScores = React.useCallback((crit: Criterion[], existing: ExistingScoreRow[]) => {
    const map: Record<string, ScoreInput> = {}
    const existingByCriterion = new Map(existing.map((s) => [s.criterion_id, s]))

    for (const c of crit) {
      const prev = existingByCriterion.get(c.id)
      map[c.id] = {
        criterion_id: c.id,
        score: prev?.score ?? c.min_score,
        rationale: prev?.rationale ?? null,
      }
    }

    setScores(map)
  }, [])

  const refresh = React.useCallback(async () => {
    // If the user is authenticated but the token hasn't populated yet, keep showing loading.
    // (AuthContext can be "authenticated" before the token is ready.)
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    if (!token) {
      setLoading(true)
      return
    }

    setLoading(true)
    try {
      const [crit, existing] = await Promise.all([loadCriteria(), loadExistingScores()])
      initializeScores(crit, existing)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load scoring data")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, token, loadCriteria, loadExistingScores, initializeScores])

  React.useEffect(() => {
    void refresh()
  }, [refresh])

  function updateScore(criterionId: string, field: "score" | "rationale", value: number | string) {
    setScores((prev) => ({
      ...prev,
      [criterionId]: {
        ...(prev[criterionId] || { criterion_id: criterionId, score: 0, rationale: null }),
        criterion_id: criterionId,
        [field]: value,
      } as ScoreInput,
    }))
  }

  const totals = React.useMemo(() => {
    const totalWeighted = criteria.reduce((sum, c) => {
      const weight = Number(c.weight)
      const s = scores[c.id]?.score ?? 0
      return sum + s * (Number.isFinite(weight) ? weight : 1)
    }, 0)

    const maxPossible = criteria.reduce((sum, c) => {
      const weight = Number(c.weight)
      return sum + c.max_score * (Number.isFinite(weight) ? weight : 1)
    }, 0)

    const pct = maxPossible > 0 ? (totalWeighted / maxPossible) * 100 : 0

    return { totalWeighted, maxPossible, pct }
  }, [criteria, scores])

  async function handleSubmit() {
    if (!token) {
      toast.error("You must be signed in to save scores.")
      return
    }
    if (criteria.length === 0) {
      toast.error("No criteria available.")
      return
    }

    setSaving(true)
    try {
      const payloadScores = criteria.map((c) => scores[c.id]).filter(Boolean) as ScoreInput[]
      if (payloadScores.length === 0) {
        toast.error("Nothing to save.")
        return
      }

      const res = await fetch("/api/portfolio/scores/bulk", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          project_id: projectId,
          scores: payloadScores.map((s) => ({
            criterion_id: s.criterion_id,
            score: s.score,
            rationale: s.rationale || null,
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "Failed to save scores")
      }

      toast.success("Scores saved.")
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save scores")
    } finally {
      setSaving(false)
    }
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio prioritization scoring</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">Sign in to score this project.</CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading scoring…
        </CardContent>
      </Card>
    )
  }

  if (!token) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio prioritization scoring</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Initializing your session… (auth token not ready yet)
        </CardContent>
      </Card>
    )
  }

  if (criteria.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio prioritization scoring</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>No active portfolio criteria were returned by the API.</p>
          <p>
            If this is unexpected, create criteria in <code>/admin/prioritization-criteria</code> or verify the
            <code> portfolio_criteria</code> table has <code>is_active = true</code> rows.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Portfolio prioritization scoring</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total score: <strong>{totals.totalWeighted.toFixed(2)}</strong> / {totals.maxPossible.toFixed(2)} (
            {totals.pct.toFixed(1)}%)
          </div>
        </CardHeader>
      </Card>

      {criteria.map((criterion) => {
        const current = scores[criterion.id]
        const currentScore = current?.score ?? criterion.min_score
        const weight = Number(criterion.weight)
        const weightedContribution = currentScore * (Number.isFinite(weight) ? weight : 1)

        return (
          <Card key={criterion.id}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-start gap-4">
                <div className="min-w-0">
                  <Label className="text-base font-semibold">{criterion.name}</Label>
                  {criterion.description ? (
                    <p className="text-sm text-muted-foreground mt-1">{criterion.description}</p>
                  ) : null}
                  <p className="text-xs text-muted-foreground mt-1">Weight: {Number.isFinite(weight) ? weight : 1}x</p>
                </div>
                <div className="text-2xl font-bold shrink-0">{currentScore}</div>
              </div>

              <div className="space-y-2">
                <Slider
                  value={[currentScore]}
                  onValueChange={(v) => updateScore(criterion.id, "score", v[0] ?? criterion.min_score)}
                  min={criterion.min_score}
                  max={criterion.max_score}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {criterion.min_score} - Low
                  </span>
                  <span>
                    {criterion.max_score} - High
                  </span>
                </div>
              </div>

              <Textarea
                placeholder="Rationale for this score…"
                value={current?.rationale || ""}
                onChange={(e) => updateScore(criterion.id, "rationale", e.target.value)}
                rows={2}
              />

              <div className="text-sm text-muted-foreground">Weighted contribution: {weightedContribution.toFixed(2)}</div>
            </CardContent>
          </Card>
        )
      })}

      <Button onClick={handleSubmit} disabled={saving} className="w-full" size="lg">
        {saving ? "Saving…" : "Save all scores"}
      </Button>
    </div>
  )
}

