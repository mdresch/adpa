"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { TaskMetrics } from "@/components/project/TaskMetrics"
import { TaskFilters } from "@/components/project/TaskFilters"
import { TaskTable } from "@/components/project/TaskTable"
import { TaskDetailsModal } from "@/components/project/TaskDetailsModal"
import { useTasks } from "@/hooks/use-tasks"
import { useTaskFilters } from "@/hooks/use-task-filters"
import { Download, Plus, RefreshCw, AlertCircle } from "lucide-react"
import { toast } from "sonner"

export default function TasksPage() {
  const params = useParams()
  const projectId = params?.id as string

  const { tasks, loading, error, refetch } = useTasks(projectId)
  const { filters, setFilters, filteredTasks, filterOptions } = useTaskFilters(tasks)

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleViewTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setModalOpen(true)
  }

  const handleEditTask = (taskId: string) => {
    // TODO: Open edit modal
    toast.info('Task editing - Coming in Phase 2')
  }

  const handleAssignTask = (taskId: string) => {
    // TODO: Open assignment modal
    toast.info('Resource assignment - Coming in Phase 2')
  }

  const handleLogHours = (taskId: string) => {
    // TODO: Open log hours modal
    toast.info('Hour logging - Coming in Phase 2')
  }

  const handleDeleteTask = async (taskId: string) => {
    // TODO: Implement delete with confirmation
    toast.info('Task deletion - Coming in Phase 2')
  }

  const handleExport = () => {
    // TODO: Implement CSV export
    toast.info('Export functionality - Coming in Phase 3')
  }

  const handleCreateTask = () => {
    // TODO: Open create task modal
    toast.info('Create task - Coming in Phase 2')
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        {/* Metrics Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load tasks: {error.message}
          </AlertDescription>
        </Alert>
        <Button onClick={refetch} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Metrics Cards */}
      <TaskMetrics tasks={tasks} />

      {/* Tasks Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Project Tasks ({filteredTasks.length}
              {filteredTasks.length !== tasks.length && ` of ${tasks.length}`})
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={refetch}
                size="sm"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button 
                variant="outline" 
                onClick={handleExport}
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button onClick={handleCreateTask} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            roleOptions={filterOptions.roles}
            assigneeOptions={filterOptions.assignees}
          />

          {/* Task Table */}
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                No tasks have been imported yet.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Import tasks from WBS data or create tasks manually.
              </p>
              <Button onClick={handleCreateTask}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Task
              </Button>
            </div>
          ) : (
            <TaskTable
              tasks={filteredTasks}
              onViewTask={handleViewTask}
              onEditTask={handleEditTask}
              onAssignTask={handleAssignTask}
              onLogHours={handleLogHours}
              onDeleteTask={handleDeleteTask}
            />
          )}
        </CardContent>
      </Card>

      {/* Info Alert for 141 Tasks */}
      {tasks.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>{tasks.length} tasks</strong> have been imported from WBS data. 
            Click any task to view details, edit, assign resources, and log hours!
          </AlertDescription>
        </Alert>
      )}

      {/* Task Details Modal */}
      <TaskDetailsModal
        taskId={selectedTaskId}
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open)
          if (!open) setSelectedTaskId(null)
        }}
        onTaskUpdated={refetch}
      />
    </div>
  )
}

