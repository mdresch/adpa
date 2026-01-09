"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useApi } from "@/hooks/use-api"
import { apiClient } from "@/lib/api"
import { Task } from "@/hooks/use-tasks"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface TaskDependencyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task: Task
  onSuccess: () => void
}

export function TaskDependencyDialog({
  open,
  onOpenChange,
  task,
  onSuccess,
}: TaskDependencyDialogProps) {
  const [dependsOnTaskId, setDependsOnTaskId] = useState<string>("")
  const [dependencyType, setDependencyType] = useState<string>("finish-to-start")
  const [lagDays, setLagDays] = useState<string>("0")
  const [submitting, setSubmitting] = useState(false)

  // Fetch available tasks in the same project (excluding current task)
  const { data: tasksData, isLoading: loadingTasks } = useApi<{ success: boolean; data: Task[] }>(
    task.projectId || task.project_id ? `/tasks/project/${task.projectId || task.project_id}` : null,
    { success: true, data: [] }
  )

  const availableTasks = (tasksData?.data || []).filter(
    (t) => t.id !== task.id
  )

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setDependsOnTaskId("")
      setDependencyType("finish-to-start")
      setLagDays("0")
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!dependsOnTaskId) {
      toast.error("Please select a task to depend on")
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post(`/tasks/${task.id}/dependencies`, {
        dependsOnTaskId,
        dependencyType,
        lagDays: parseInt(lagDays) || 0,
      })

      toast.success("Dependency added successfully")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error("Error adding dependency:", error)
      const errorMessage = error.response?.data?.error || error.message || "Failed to add dependency"
      toast.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Task Dependency</DialogTitle>
          <DialogDescription>
            Create a dependency relationship for task {task.taskNumber || task.task_number || task.id}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dependsOnTask">This task depends on</Label>
            <Select
              value={dependsOnTaskId}
              onValueChange={setDependsOnTaskId}
              disabled={loadingTasks || submitting}
            >
              <SelectTrigger id="dependsOnTask">
                <SelectValue placeholder={loadingTasks ? "Loading tasks..." : "Select a task"} />
              </SelectTrigger>
              <SelectContent>
                {availableTasks.length === 0 ? (
                  <SelectItem value="__no_tasks__" disabled>
                    No other tasks available
                  </SelectItem>
                ) : (
                  availableTasks.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.taskNumber || t.task_number || "TASK"} - {t.taskName || t.task_name || "Untitled"}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Select the task that must be completed (or started) before this task can begin
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dependencyType">Dependency Type</Label>
            <Select
              value={dependencyType}
              onValueChange={setDependencyType}
              disabled={submitting}
            >
              <SelectTrigger id="dependencyType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="finish-to-start">
                  Finish-to-Start (FS) - Most common
                </SelectItem>
                <SelectItem value="start-to-start">
                  Start-to-Start (SS) - Start together
                </SelectItem>
                <SelectItem value="finish-to-finish">
                  Finish-to-Finish (FF) - Finish together
                </SelectItem>
                <SelectItem value="start-to-finish">
                  Start-to-Finish (SF) - Rare
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              FS: Task B starts after Task A finishes (most common)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lagDays">Lag Days (optional)</Label>
            <Input
              id="lagDays"
              type="number"
              value={lagDays}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLagDays(e.target.value)}
              placeholder="0"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Positive = delay, negative = overlap (e.g., -2 = start 2 days before predecessor finishes)
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !dependsOnTaskId || dependsOnTaskId === "__no_tasks__"}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Dependency"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

