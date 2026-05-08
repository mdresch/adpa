"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/lib/notify"
import { formatDateTime } from "@/lib/utils/formatUtils"
import { Loader2 } from "lucide-react"

type ScoreRow = {
  score: number
  weight: string | number
  scored_at?: string | null
  updated_at?: string | null
}

export function ScoreSummary({ projectId }: { projectId: string }) {
  const { token, isAuthenticated } = useAuth()
  const [loading, setLoading] = React.useState(true)
  const [total, setTotal] = React.useState<number>(0)
  const [count, setCount] = React.useState<number>(0)
  const [lastUpdated, setLastUpdated] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
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
      const res = await fetch(`/api/portfolio/scores?project_id=${encodeURIComponent(projectId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || "Failed to load scores")
      }
      const rows = (await res.json()) as ScoreRow[]

      const totalScore = rows.reduce((sum, r) => {
        const w = Number(r.weight)
        return sum + r.score * (Number.isFinite(w) ? w : 1)
      }, 0)

      const latest = rows
        .map((r) => r.updated_at || r.scored_at)
        .filter((d): d is string => !!d)
        .sort()
        .at(-1) ?? null

      setTotal(totalScore)
      setCount(rows.length)
      setLastUpdated(latest)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load score summary")
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, token, projectId])

  React.useEffect(() => {
    void load()
  }, [load])

  if (!isAuthenticated) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle>Score summary</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="text-2xl font-bold">{total.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">Total score</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm text-muted-foreground">Criteria scored</div>
            </div>
            <div>
              <div className="text-sm">{lastUpdated ? formatDateTime(lastUpdated) : "—"}</div>
              <div className="text-sm text-muted-foreground">Last updated</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

