"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/lib/notify"

export type StrategicGoalOption = {
  id: string
  title: string
}

type LinkGoalDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  goals: StrategicGoalOption[]
  authToken: string | null
  excludeGoalIds?: Set<string>
  onLinked: () => void
}

export function LinkGoalDialog({
  open,
  onOpenChange,
  projectId,
  goals,
  authToken,
  excludeGoalIds = new Set(),
  onLinked,
}: LinkGoalDialogProps) {
  const [selectedGoal, setSelectedGoal] = React.useState<string>("")
  const [contributionLevel, setContributionLevel] = React.useState("medium")
  const [alignmentScore, setAlignmentScore] = React.useState(0.5)
  const [notes, setNotes] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  const availableGoals = React.useMemo(
    () => goals.filter((g) => !excludeGoalIds.has(g.id)),
    [goals, excludeGoalIds]
  )

  React.useEffect(() => {
    if (!open) {
      setSelectedGoal("")
      setContributionLevel("medium")
      setAlignmentScore(0.5)
      setNotes("")
    }
  }, [open])

  async function handleSave() {
    if (!authToken) {
      toast.error("You must be signed in to link goals.")
      return
    }
    if (!selectedGoal) {
      toast.error("Select a strategic goal.")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/portfolio/strategic-alignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          project_id: projectId,
          goal_id: selectedGoal,
          contribution_level: contributionLevel,
          alignment_score: alignmentScore,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error || res.statusText)
      }
      toast.success("Strategic goal linked.")
      onLinked()
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to link goal")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Link strategic goal</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Strategic goal</Label>
            {availableGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active goals available to link (all may already be linked).
              </p>
            ) : (
              <Select value={selectedGoal} onValueChange={setSelectedGoal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  {availableGoals.map((goal) => (
                    <SelectItem key={goal.id} value={goal.id}>
                      {goal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label>Contribution level</Label>
            <Select value={contributionLevel} onValueChange={setContributionLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Alignment score: {(alignmentScore * 100).toFixed(0)}%</Label>
            <Slider
              value={[alignmentScore]}
              onValueChange={(v) => setAlignmentScore(v[0] ?? 0)}
              min={0}
              max={1}
              step={0.05}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="alignment-notes">Notes</Label>
            <Textarea
              id="alignment-notes"
              placeholder="How this project contributes to the goal…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || availableGoals.length === 0}>
            {saving ? "Saving…" : "Link goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
