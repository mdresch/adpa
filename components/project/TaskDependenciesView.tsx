"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Task } from "@/hooks/use-tasks"
import { ArrowRight, Plus, Trash2 } from "lucide-react"
import { toast } from '@/lib/notify'
import { TaskDependencyDialog } from "./TaskDependencyDialog"

interface TaskDependenciesViewProps {
  task: Task
  onUpdate: () => void
}

export function TaskDependenciesView({ task, onUpdate }: TaskDependenciesViewProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleAddDependency = () => {
    setDialogOpen(true)
  }

  const handleRemoveDependency = async (dependencyId: string) => {
    if (!confirm("Are you sure you want to remove this dependency?")) {
      return
    }

    setRemovingId(dependencyId)
    try {
      const { apiClient } = await import("@/lib/api")
      await apiClient.delete(`/tasks/${task.id}/dependencies/${dependencyId}`)

      toast.success("Dependency removed successfully")
      onUpdate()
    } catch (error: any) {
      console.error("Error removing dependency:", error)
      const errorMessage = error.response?.data?.error || error.message || "Failed to remove dependency"
      toast.error(errorMessage)
    } finally {
      setRemovingId(null)
    }
  }

  // Predecessors: tasks this task depends on (where this task is the successor)
  // In the DB: task_id = this task, depends_on_task_id = predecessor
  const predecessors = task.dependencies?.filter(
    (dep) => (dep.successorTaskId || dep.successor_task_id) === task.id
  ) || []

  // Successors: tasks that depend on this task (where this task is the predecessor)
  // In the DB: task_id = successor, depends_on_task_id = this task
  const successors = task.dependencies?.filter(
    (dep) => (dep.predecessorTaskId || dep.predecessor_task_id) === task.id
  ) || []

  const getDependencyTypeLabel = (type: string | undefined) => {
    if (!type) return 'Unknown'
    const normalized = type.toLowerCase().replace(/_/g, '-')
    switch (normalized) {
      case 'finish-to-start':
      case 'finish_to_start':
      case 'finishtostart':
      case 'finishtostart':
        return 'Finish-to-Start (FS)'
      case 'start-to-start':
      case 'start_to_start':
      case 'starttostart':
      case 'startToStart':
        return 'Start-to-Start (SS)'
      case 'finish-to-finish':
      case 'finish_to_finish':
      case 'finishtofinish':
      case 'finishToFinish':
        return 'Finish-to-Finish (FF)'
      case 'start-to-finish':
      case 'start_to_finish':
      case 'starttofinish':
      case 'startToFinish':
        return 'Start-to-Finish (SF)'
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      {/* Predecessors */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Predecessors</h3>
          <Button onClick={handleAddDependency} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Dependency
          </Button>
        </div>

        {predecessors.length > 0 ? (
          <div className="space-y-2">
            {predecessors.map((dep) => (
              <div key={dep.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">
                        {(dep.predecessorTask?.taskNumber || dep.predecessorTask?.task_number || dep.predecessor_task?.taskNumber || dep.predecessor_task?.task_number) || 'Unknown Task'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(dep.predecessorTask?.taskName || dep.predecessorTask?.task_name || dep.predecessor_task?.taskName || dep.predecessor_task?.task_name) || 'No description'}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{task.taskNumber || task.task_number || '-'}</p>
                      <p className="text-sm text-muted-foreground">{task.taskName || task.task_name || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {getDependencyTypeLabel(dep.dependencyType || dep.dependency_type)}
                    </Badge>
                    {(dep.lagDays !== undefined && dep.lagDays !== 0) || (dep.lag_days !== undefined && dep.lag_days !== 0) ? (
                      <Badge variant="secondary">
                        {((dep.lagDays || dep.lag_days || 0) > 0 ? '+' : '')}{(dep.lagDays || dep.lag_days || 0)}d lag
                      </Badge>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDependency(dep.id)}
                      disabled={removingId === dep.id}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No predecessor tasks. This task can start immediately.
            </p>
          </div>
        )}
      </div>

      {/* Successors */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Successors</h3>

        {successors.length > 0 ? (
          <div className="space-y-2">
            {successors.map((dep) => (
              <div key={dep.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium">{task.taskNumber || task.task_number || '-'}</p>
                      <p className="text-sm text-muted-foreground">{task.taskName || task.task_name || '-'}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {(dep.successorTask?.taskNumber || dep.successorTask?.task_number || dep.successor_task?.taskNumber || dep.successor_task?.task_number) || 'Unknown Task'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {(dep.successorTask?.taskName || dep.successorTask?.task_name || dep.successor_task?.taskName || dep.successor_task?.task_name) || 'No description'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {getDependencyTypeLabel(dep.dependencyType || dep.dependency_type)}
                    </Badge>
                    {(dep.lagDays !== undefined && dep.lagDays !== 0) || (dep.lag_days !== undefined && dep.lag_days !== 0) ? (
                      <Badge variant="secondary">
                        {((dep.lagDays || dep.lag_days || 0) > 0 ? '+' : '')}{(dep.lagDays || dep.lag_days || 0)}d lag
                      </Badge>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveDependency(dep.id)}
                      disabled={removingId === dep.id}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              No successor tasks depend on this task's completion.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold mb-2">Dependency Summary</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total predecessors:</span>
            <span className="ml-2 font-medium">{predecessors.length}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total successors:</span>
            <span className="ml-2 font-medium">{successors.length}</span>
          </div>
        </div>
      </div>

      {/* Add Dependency Dialog */}
      <TaskDependencyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={task}
        onSuccess={onUpdate}
      />
    </div>
  )
}

