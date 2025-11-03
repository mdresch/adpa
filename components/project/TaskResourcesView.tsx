"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Task } from "@/hooks/use-tasks"
import { UserPlus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface TaskResourcesViewProps {
  task: Task
  onUpdate: () => void
}

export function TaskResourcesView({ task, onUpdate }: TaskResourcesViewProps) {
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
    // TODO: Open ResourceAssignmentModal
    toast.info('Resource assignment modal - Coming soon!')
  }

  const handleUnassign = (userId: string) => {
    // TODO: Implement unassign
    toast.info('Unassign functionality - Coming soon!')
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

        {task.assigned_user_id ? (
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(task.assigned_user_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{task.assigned_user_name}</p>
                  {task.required_role_name && (
                    <p className="text-sm text-muted-foreground">{task.required_role_name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">100% Allocation</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleUnassign(task.assigned_user_id!)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
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

      {/* Additional Resources (if supported in future) */}
      {task.assigned_resources && task.assigned_resources.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-3">Additional Team Members</h4>
          <div className="space-y-2">
            {task.assigned_resources.map((resource) => (
              <div key={resource.id} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(resource.user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{resource.user_name}</p>
                      {resource.role_name && (
                        <p className="text-xs text-muted-foreground">{resource.role_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {resource.allocation_percentage}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnassign(resource.user_id)}
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </div>
  )
}

