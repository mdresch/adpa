"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Task, useTaskMutations } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

interface TaskEditFormProps {
  task: Task
  onSave: () => void
}

export function TaskEditForm({ task, onSave }: TaskEditFormProps) {
  const [formData, setFormData] = useState({
    taskName: task.taskName,
    description: task.description || '',
    estimatedHours: task.estimatedHours?.toString() || '',
    startDate: task.plannedStartDate || '',
    endDate: task.plannedEndDate || '',
    status: task.status,
    percentComplete: (task.percentComplete ?? 0).toString(),
  })

  const { updateTask, updating } = useTaskMutations(task.project_id, onSave)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateTask(task.id, {
        taskName: formData.taskName,
        description: formData.description,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        plannedStartDate: formData.startDate || undefined,
        plannedEndDate: formData.endDate || undefined,
        status: formData.status as Task['status'],
        percentComplete: parseInt(formData.percentComplete),
      })
      toast.success('Task updated successfully')
    } catch (error) {
      toast.error('Failed to update task')
    }
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Task Name */}
      <div className="space-y-2">
        <Label htmlFor="taskName">Task Name *</Label>
        <Input
          id="taskName"
          value={formData.taskName}
          onChange={(e) => handleChange('taskName', e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={4}
          placeholder="Enter task description..."
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date</Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) => handleChange('startDate', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e) => handleChange('endDate', e.target.value)}
          />
        </div>
      </div>

      {/* Hours and Progress */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimatedHours">Estimated Hours</Label>
          <Input
            id="estimatedHours"
            type="number"
            step="0.5"
            min="0"
            value={formData.estimatedHours}
            onChange={(e) => handleChange('estimatedHours', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="percentComplete">Progress %</Label>
          <Input
            id="percentComplete"
            type="number"
            min="0"
            max="100"
            value={formData.percentComplete}
            onChange={(e) => handleChange('percentComplete', e.target.value)}
          />
        </div>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleChange('status', value)}>
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Readonly Fields */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">Task Number</Label>
          <p className="text-sm font-mono">{task.taskNumber}</p>
        </div>
        {task.wbsCode && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">WBS Code</Label>
            <p className="text-sm font-mono">{task.wbsCode}</p>
          </div>
        )}
        {task.actualHours !== undefined && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Actual Hours</Label>
            <p className="text-sm">{task.actualHours}h</p>
          </div>
        )}
        {task.requiredRoleName && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Required Role</Label>
            <p className="text-sm">{task.requiredRoleName}</p>
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="submit" disabled={updating}>
          {updating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

