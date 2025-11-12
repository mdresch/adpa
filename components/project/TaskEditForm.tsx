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
    task_name: task.task_name,
    description: task.description || '',
    estimated_hours: task.estimated_hours?.toString() || '',
    start_date: task.start_date || '',
    end_date: task.end_date || '',
    status: task.status,
    progress_percentage: task.progress_percentage?.toString() || '0',
  })

  const { updateTask, updating } = useTaskMutations(task.project_id, onSave)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateTask(task.id, {
        task_name: formData.task_name,
        description: formData.description,
        estimated_hours: formData.estimated_hours ? parseFloat(formData.estimated_hours) : undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        status: formData.status as Task['status'],
        progress_percentage: parseInt(formData.progress_percentage),
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
        <Label htmlFor="task_name">Task Name *</Label>
        <Input
          id="task_name"
          value={formData.task_name}
          onChange={(e) => handleChange('task_name', e.target.value)}
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
          <Label htmlFor="start_date">Start Date</Label>
          <Input
            id="start_date"
            type="date"
            value={formData.start_date}
            onChange={(e) => handleChange('start_date', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End Date</Label>
          <Input
            id="end_date"
            type="date"
            value={formData.end_date}
            onChange={(e) => handleChange('end_date', e.target.value)}
          />
        </div>
      </div>

      {/* Hours and Progress */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="estimated_hours">Estimated Hours</Label>
          <Input
            id="estimated_hours"
            type="number"
            step="0.5"
            min="0"
            value={formData.estimated_hours}
            onChange={(e) => handleChange('estimated_hours', e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="progress_percentage">Progress %</Label>
          <Input
            id="progress_percentage"
            type="number"
            min="0"
            max="100"
            value={formData.progress_percentage}
            onChange={(e) => handleChange('progress_percentage', e.target.value)}
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
          <p className="text-sm font-mono">{task.task_number}</p>
        </div>
        {task.wbs_code && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">WBS Code</Label>
            <p className="text-sm font-mono">{task.wbs_code}</p>
          </div>
        )}
        {task.actual_hours !== undefined && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Actual Hours</Label>
            <p className="text-sm">{task.actual_hours}h</p>
          </div>
        )}
        {task.required_role_name && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Required Role</Label>
            <p className="text-sm">{task.required_role_name}</p>
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

