"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Task, useTaskMutations } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"
import { apiClient } from "@/lib/api"

interface TaskEditFormProps {
  task: Task
  onSave: () => void
}

export function TaskEditForm({ task, onSave }: TaskEditFormProps) {
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return ''
    if (typeof date === 'string') {
      // If it's already in YYYY-MM-DD format, return as-is
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date
      }
      // Handle ISO date strings - parse as local date to avoid timezone issues
      const d = new Date(date)
      if (isNaN(d.getTime())) return ''
      // Use local date components, not UTC
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    // Date object - use local date components
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const [formData, setFormData] = useState({
    taskName: task.taskName || task.task_name || '',
    description: task.description || '',
    estimatedHours: (task.estimatedHours || task.estimated_hours)?.toString() || '',
    startDate: formatDate(task.plannedStartDate || task.start_date),
    endDate: formatDate(task.plannedEndDate || task.end_date),
    status: task.status,
    percentComplete: (task.percentComplete ?? task.progress_percentage ?? 0).toString(),
    priority: task.priority || 'medium',
    phase: task.phase || '',
    category: task.category || '',
    requiredRoleId: task.requiredRoleId || task.required_role_id || '__none__',
  })

  const [roles, setRoles] = useState<Array<{ id: string; roleName: string; roleType?: string }>>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  // Fetch available roles
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        setLoadingRoles(true)
        const response = await apiClient.get<{ success: boolean; data: Array<{ id: string; roleName: string; roleType?: string }> }>(
          '/cost-management/roles'
        )
        setRoles(response.data || [])
      } catch (error) {
        console.error('Failed to fetch roles:', error)
        toast.error('Failed to load available roles')
      } finally {
        setLoadingRoles(false)
      }
    }

    void fetchRoles()
  }, [])

  const { updateTask, updating } = useTaskMutations(task.project_id || task.projectId || '', onSave)

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
        priority: formData.priority as Task['priority'],
        phase: formData.phase || undefined,
        category: formData.category || undefined,
        requiredRoleId: formData.requiredRoleId && formData.requiredRoleId !== '__none__' ? formData.requiredRoleId : undefined,
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('taskName', e.target.value)}
          required
        />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('startDate', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End Date</Label>
          <Input
            id="endDate"
            type="date"
            value={formData.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('endDate', e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('estimatedHours', e.target.value)}
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
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('percentComplete', e.target.value)}
          />
        </div>
      </div>

      {/* Status, Priority, Phase, Category */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value: string) => handleChange('status', value)}>
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="planned">Planned</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={formData.priority} onValueChange={(value: string) => handleChange('priority', value)}>
            <SelectTrigger id="priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="phase">Phase</Label>
          <Input
            id="phase"
            value={formData.phase}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('phase', e.target.value)}
            placeholder="e.g., Design, Development, Testing"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('category', e.target.value)}
            placeholder="e.g., Technical, Management"
          />
        </div>
      </div>

      {/* Required Role */}
      <div className="space-y-2">
        <Label htmlFor="requiredRoleId">Required Role</Label>
        <Select 
          value={formData.requiredRoleId || '__none__'} 
          onValueChange={(value: string) => handleChange('requiredRoleId', value)}
          disabled={loadingRoles}
        >
          <SelectTrigger id="requiredRoleId">
            <SelectValue placeholder={loadingRoles ? "Loading roles..." : "Select a role (optional)"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None (No specific role required)</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.roleName}
                {role.roleType && (
                  <span className="text-xs text-muted-foreground ml-2">
                    ({role.roleType})
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {formData.requiredRoleId && formData.requiredRoleId !== '__none__' && (
          <p className="text-xs text-muted-foreground">
            Selected role will be used to suggest appropriate resources for this task
          </p>
        )}
      </div>

      {/* Readonly Fields */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-1">
          <Label className="text-sm text-muted-foreground">Task Number</Label>
          <p className="text-sm font-mono">{task.taskNumber || task.task_number || '-'}</p>
        </div>
        {(task.wbsCode || task.wbs_code) && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">WBS Code</Label>
            <p className="text-sm font-mono">{task.wbsCode || task.wbs_code}</p>
          </div>
        )}
        {(task.actualHours !== undefined || task.actual_hours !== undefined) && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Actual Hours</Label>
            <p className="text-sm">{(task.actualHours || task.actual_hours || 0)}h</p>
          </div>
        )}
        {(task.actualCost !== undefined || task.actual_cost !== undefined) && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Actual Cost</Label>
            <p className="text-sm">${(task.actualCost || task.actual_cost || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        )}
        {(task.requiredSkills || task.required_skills) && (task.requiredSkills?.length || task.required_skills?.length) && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Required Skills</Label>
            <p className="text-sm">{(task.requiredSkills || task.required_skills || []).join(', ')}</p>
          </div>
        )}
        {(task.actualStartDate || task.actual_start_date) && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Actual Start Date</Label>
            <p className="text-sm">{formatDate(task.actualStartDate || task.actual_start_date)}</p>
          </div>
        )}
        {(task.actualEndDate || task.actual_end_date) && (
          <div className="space-y-1">
            <Label className="text-sm text-muted-foreground">Actual End Date</Label>
            <p className="text-sm">{formatDate(task.actualEndDate || task.actual_end_date)}</p>
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

