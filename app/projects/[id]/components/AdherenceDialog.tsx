"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface AdherenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agreementId: string
  agreementTitle: string
  currentScore?: number
  onSuccess: () => void
}

interface AdherenceLogEntry {
  id: string
  date_recorded: string
  adherence_score?: number
  notes?: string
  recorded_by?: string
  recorded_by_name?: string | null
}

export function AdherenceDialog({
  open,
  onOpenChange,
  agreementId,
  agreementTitle,
  currentScore,
  onSuccess
}: AdherenceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [score, setScore] = useState(currentScore ? [currentScore] : [5])
  const [notes, setNotes] = useState('')
  const [history, setHistory] = useState<AdherenceLogEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      setHistoryError(null)
      const response = await apiClient.get<{
        success: boolean
        data: AdherenceLogEntry[]
      }>(`/team-agreements/${agreementId}/adherence`)

      if (response.success && Array.isArray(response.data)) {
        setHistory(response.data)
      } else {
        setHistory([])
      }
    } catch (err: unknown) {
      console.error('Error fetching adherence history:', err)
      const message = err instanceof Error ? err.message : 'Failed to load adherence history'
      setHistoryError(message)
    } finally {
      setHistoryLoading(false)
    }
  }, [agreementId])

  useEffect(() => {
    if (open) {
      setScore(currentScore ? [currentScore] : [5])
      setNotes('')
      void fetchHistory()
    }
  }, [open, currentScore, fetchHistory])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)

      const response = await apiClient.post<{
        success: boolean
        data: {
          id: string
          adherence_score: number
          notes?: string
        }
      }>(`/team-agreements/${agreementId}/adherence`, {
        adherence_score: score[0],
        notes: notes || undefined
      })

      if (response.success) {
        toast.success('Adherence score recorded successfully')
        onSuccess()
        onOpenChange(false)
        setNotes('')
        setScore([5])
        await fetchHistory()
      } else {
        throw new Error('Failed to record adherence')
      }
    } catch (error: unknown) {
      console.error('Error recording adherence:', error)
      const message = error instanceof Error ? error.message : 'Failed to record adherence score'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Adherence Score</DialogTitle>
          <DialogDescription>
            How well is the team following {agreementTitle}?
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Adherence Score</Label>
                <span className="text-2xl font-bold">{score[0].toFixed(1)} / 10.0</span>
              </div>
              <Slider
                value={score}
                onValueChange={setScore}
                min={1}
                max={10}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Poor (1.0)</span>
                <span>Excellent (10.0)</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add context about the adherence score..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>History</Label>
                {historyLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {historyError && (
                <p className="text-sm text-destructive">{historyError}</p>
              )}
              {!historyLoading && !historyError && history.length === 0 && (
                <p className="text-sm text-muted-foreground">No adherence entries recorded yet.</p>
              )}
              {!historyError && history.length > 0 && (
                <ScrollArea className="max-h-52 border rounded-md">
                  <div className="divide-y">
                    {history.map((entry) => (
                      <div key={entry.id} className="px-3 py-2 text-sm space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">
                            {entry.recorded_by_name || 'Unknown user'}
                          </p>
                          {entry.adherence_score !== undefined && (
                            <Badge variant="outline">
                              {entry.adherence_score.toFixed(1)}/10
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.date_recorded).toLocaleString()}
                        </p>
                        {entry.notes && (
                          <p className="text-sm">{entry.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Score
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

