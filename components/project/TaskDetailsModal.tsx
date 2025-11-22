"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTask } from "@/hooks/use-tasks"
import { TaskStatusBadge } from "./TaskStatusBadge"
import { TaskEditForm } from "./TaskEditForm"
import { TaskResourcesView } from "./TaskResourcesView"
import { TaskDependenciesView } from "./TaskDependenciesView"
import { TaskHoursView } from "./TaskHoursView"
import { TaskSourceView } from "./TaskSourceView"
import { AlertCircle, FileText, Briefcase } from "lucide-react"

interface TaskDetailsModalProps {
  taskId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskUpdated?: () => void
}

export function TaskDetailsModal({
  taskId,
  open,
  onOpenChange,
  onTaskUpdated,
}: TaskDetailsModalProps) {
  const { task, loading, error, refetch } = useTask(taskId)
  const [activeTab, setActiveTab] = useState<string>('details')

  // Refetch when modal opens
  useEffect(() => {
    if (open && taskId) {
      refetch()
    }
  }, [open, taskId, refetch])

  // Reset to details tab when task changes
  useEffect(() => {
    if (taskId) {
      setActiveTab('details')
    }
  }, [taskId])

  const handleTaskUpdate = () => {
    refetch()
    onTaskUpdated?.()
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
        <DialogHeader>
          {loading ? (
            <>
              <DialogTitle>
                <Skeleton className="h-6 w-48" />
              </DialogTitle>
              <DialogDescription>
                <Skeleton className="h-4 w-32 mt-2" />
              </DialogDescription>
            </>
          ) : error ? (
            <>
              <DialogTitle>Error Loading Task</DialogTitle>
              <DialogDescription>
                <Alert variant="destructive" className="mt-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Failed to load task details: {error.message}
                  </AlertDescription>
                </Alert>
              </DialogDescription>
            </>
          ) : task ? (
            <>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-mono">{task.task_number}</span>
                <span className="text-muted-foreground">•</span>
                <span>{task.task_name}</span>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                {task.wbs_code && (
                  <>
                    <Badge variant="outline" className="font-mono">
                      WBS {task.wbs_code}
                    </Badge>
                    <span className="text-muted-foreground">•</span>
                  </>
                )}
                {task.required_role_name && (
                  <>
                    <Badge variant="outline">{task.required_role_name}</Badge>
                    <span className="text-muted-foreground">•</span>
                  </>
                )}
                <TaskStatusBadge status={task.status} />
                {task.imported_from_wbs && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                      Imported from WBS
                    </Badge>
                    {task.source_document_id && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <a
                          href={`/documents/${task.source_document_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm underline flex items-center gap-2"
                        >
                          {task.source_document_title ? (
                            task.source_document_title
                          ) : (
                            <>
                              <span className="font-semibold">Document ID:</span>
                              <span className="font-mono text-xs">{task.source_document_id}</span>
                            </>
                          )}
                        </a>
                      </>
                    )}
                  </>
                )}
              </DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Task Details</DialogTitle>
              <DialogDescription>No task selected</DialogDescription>
            </>
          )}
        </DialogHeader>
        
        {loading ? (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        ) : error ? null : task ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="resources">Resources</TabsTrigger>
              <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
              <TabsTrigger value="hours">Hours</TabsTrigger>
              <TabsTrigger value="source">Source</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <TaskEditForm task={task} onSave={handleTaskUpdate} />
            </TabsContent>

            <TabsContent value="resources" className="mt-4">
              <TaskResourcesView task={task} onUpdate={handleTaskUpdate} />
            </TabsContent>

            <TabsContent value="dependencies" className="mt-4">
              <TaskDependenciesView task={task} onUpdate={handleTaskUpdate} />
            </TabsContent>

            <TabsContent value="hours" className="mt-4">
              <TaskHoursView task={task} onUpdate={handleTaskUpdate} />
            </TabsContent>

            <TabsContent value="source" className="mt-4">
              <TaskSourceView task={task} />
            </TabsContent>
          </Tabs>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

