"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Task } from "@/hooks/use-tasks"
import { UserPlus, Trash2, Loader2, Clock, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import { ResourceAssignmentDialog } from "./ResourceAssignmentDialog"

interface TaskAssignment {
  id: string
  taskId: string
  userId: string
  userName: string
  roleName?: string
  plannedHours: number
  actualHours?: number
  allocationPercentage: number
  status: string
  scheduledStartDate?: string
  scheduledEndDate?: string
  hourlyRate?: number
  plannedCost?: number
}

interface TaskResourcesViewProps {
  task: Task
  onUpdate: () => void
}

export function TaskResourcesView({ task, onUpdate }: TaskResourcesViewProps) {
  const [assignments, setAssignments] = useState<TaskAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    if (task?.id) {
      void fetchAssignments()
    }
  }, [task?.id])

  const fetchAssignments = async () => {
    if (!task?.id) return
    
    try {
      setLoading(true)
      const response = await apiClient.get<{ success: boolean; data: TaskAssignment[] }>(
        `/tasks/${task.id}/assignments`
      )
      setAssignments(response.data || [])
    } catch (error) {
      console.error("Failed to fetch task assignments:", error)
      // Don't show error toast if assignments endpoint doesn't exist yet
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string | undefined): string => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const handleAssignResource = () => {
    setDialogOpen(true)
  }

  const handleUnassign = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to unassign this resource from the task?")) {
      return
    }

    try {
      await apiClient.delete(`/tasks/assignments/${assignmentId}`)
      toast.success("Resource unassigned successfully")
      await fetchAssignments()
      onUpdate()
    } catch (error: any) {
      console.error("Failed to unassign resource:", error)
      toast.error(error.response?.data?.error || "Failed to unassign resource")
    }
  }

  const handleAssignmentSuccess = async () => {
    await fetchAssignments()
    onUpdate()
  }

  return (
    <div className="space-y-6">
      {/* Current Assignment */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Assigned Resources</h3>
          <Button onClick={handleAssignResource} size="sm">
            <UserPlus className="mr-2 h-4 w-4" />
            Assign Resource
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : assignments.length > 0 ? (
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar>
                      <AvatarFallback>
                        {getInitials(assignment.userName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{assignment.userName}</p>
                      {assignment.roleName && (
                        <p className="text-sm text-muted-foreground">{assignment.roleName}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {Number(assignment.plannedHours || 0).toFixed(1)}h planned
                          {assignment.actualHours !== undefined && assignment.actualHours !== null && (
                            <> / {Number(assignment.actualHours).toFixed(1)}h actual</>
                          )}
                        </span>
                        {assignment.plannedCost && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            ${Number(assignment.plannedCost).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{assignment.allocationPercentage}%</Badge>
                    <Badge variant={assignment.status === 'completed' ? 'default' : 'secondary'}>
                      {assignment.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassign(assignment.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {assignment.scheduledStartDate && assignment.scheduledEndDate && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Scheduled: {new Date(assignment.scheduledStartDate).toLocaleDateString()} - {new Date(assignment.scheduledEndDate).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No resources assigned to this task</p>
            <Button onClick={handleAssignResource} variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Assign First Resource
            </Button>
          </div>
        )}
      </div>

      {/* Resource Requirements */}
      {task.required_role_name && (
        <div className="border-t pt-4">
          <h4 className="text-sm font-semibold mb-3">Requirements</h4>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Required Role:</span>
            <Badge variant="secondary">{task.required_role_name}</Badge>
          </div>
        </div>
      )}

      {/* Resource Assignment Dialog */}
      {task?.id && (task?.project_id || task?.projectId) && (
        <ResourceAssignmentDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          taskId={task.id}
          projectId={task.project_id || task.projectId || ''}
          onSuccess={handleAssignmentSuccess}
        />
      )}
    </div>
  )
}

