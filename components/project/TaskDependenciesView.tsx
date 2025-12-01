"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Task } from "@/hooks/use-tasks"
import { ArrowRight, Plus } from "lucide-react"
import { toast } from "sonner"

interface TaskDependenciesViewProps {
  task: Task
  onUpdate: () => void
}

export function TaskDependenciesView({ task, onUpdate }: TaskDependenciesViewProps) {
  const handleAddDependency = () => {
    // TODO: Open dependency creation dialog
    toast.info('Add dependency - Coming in Phase 3!')
  }

  const predecessors = task.dependencies?.filter(
    (dep) => (dep.successorTaskId || dep.successor_task_id) === task.id
  ) || []

  const successors = task.dependencies?.filter(
    (dep) => (dep.predecessorTaskId || dep.predecessor_task_id) === task.id
  ) || []

  const getDependencyTypeLabel = (type: string | undefined) => {
    if (!type) return 'Unknown'
    switch (type) {
      case 'finish_to_start':
      case 'finishToStart':
        return 'Finish-to-Start (FS)'
      case 'start_to_start':
      case 'startToStart':
        return 'Start-to-Start (SS)'
      case 'finish_to_finish':
      case 'finishToFinish':
        return 'Finish-to-Finish (FF)'
      case 'start_to_finish':
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
    </div>
  )
}

