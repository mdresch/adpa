"use client"

import React, { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
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
      } else {
        throw new Error('Failed to record adherence')
      }
    } catch (error: any) {
      console.error('Error recording adherence:', error)
      toast.error(error.message || 'Failed to record adherence score')
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
            How well is the team following "{agreementTitle}"?
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

