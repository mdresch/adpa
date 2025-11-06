"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Task, useTaskMutations } from "@/hooks/use-tasks"
import { Clock, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { parseHours } from "@/lib/utils/taskUtils"

interface TaskHoursViewProps {
  task: Task
  onUpdate: () => void
}

function formatHours(hours: number): string {
  return hours.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 0 })
}

export function TaskHoursView({ task, onUpdate }: TaskHoursViewProps) {
  const [showLogForm, setShowLogForm] = useState(false)
  const [formData, setFormData] = useState({
    hours: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  })

  const { logHours, updating } = useTaskMutations(task.project_id, () => {
    onUpdate()
    setShowLogForm(false)
    setFormData({ hours: '', date: new Date().toISOString().split('T')[0], notes: '' })
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.hours || parseFloat(formData.hours) <= 0) {
      toast.error('Please enter a valid number of hours')
      return
    }

    try {
      await logHours(task.id, parseFloat(formData.hours), formData.date, formData.notes)
      toast.success('Hours logged successfully')
    } catch (error) {
      toast.error('Failed to log hours')
    }
  }

  const estimatedHours = parseHours(task.estimated_hours)
  const actualHours = parseHours(task.actual_hours)
  const remainingHours = Math.max(0, estimatedHours - actualHours)
  const progressPercentage = estimatedHours > 0 
    ? Math.min(100, Math.round((actualHours / estimatedHours) * 100))
    : 0

  return (
    <div className="space-y-6">
      {/* Hours Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Estimated Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(estimatedHours)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Actual Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(actualHours)}h</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Remaining Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${remainingHours < 0 ? 'text-destructive' : ''}`}>
              {formatHours(remainingHours)}h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
        {actualHours > estimatedHours && (
          <p className="text-sm text-destructive">
            ⚠️ Task has exceeded estimated hours by {actualHours - estimatedHours}h
          </p>
        )}
      </div>

      {/* Log Hours Form */}
      {showLogForm ? (
        <form onSubmit={handleSubmit} className="border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold">Log Hours</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hours">Hours Worked *</Label>
              <Input
                id="hours"
                type="number"
                step="0.25"
                min="0.25"
                value={formData.hours}
                onChange={(e) => setFormData(prev => ({ ...prev, hours: e.target.value }))}
                placeholder="8.0"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updating}>
              {updating ? 'Logging...' : 'Log Hours'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowLogForm(false)}
              disabled={updating}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setShowLogForm(true)} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          Log Hours
        </Button>
      )}

      {/* Hours History (placeholder for future) */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Hours Log History</h4>
        <div className="border border-dashed rounded-lg p-6 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Detailed hours history will be available in a future update
          </p>
        </div>
      </div>
    </div>
  )
}

