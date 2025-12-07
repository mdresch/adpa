"use client"

import { useState, useMemo } from "react"
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  rectIntersection,
  CollisionDetection,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TaskStatusBadge } from "./TaskStatusBadge"
import { Task } from "@/hooks/use-tasks"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreVertical,
  Edit,
  UserPlus,
  Clock,
  Trash,
  Eye,
  GripVertical,
} from "lucide-react"
import { parseHours } from "@/lib/utils/taskUtils"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface KanbanBoardViewProps {
  tasks: Task[]
  onViewTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onAssignTask: (taskId: string) => void
  onLogHours: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onStatusChange?: (taskId: string, newStatus: string) => Promise<void>
}

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  onViewTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onAssignTask: (taskId: string) => void
  onLogHours: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}

interface KanbanTaskCardProps {
  task: Task
  onViewTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onAssignTask: (taskId: string) => void
  onLogHours: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}

// Status configuration
const STATUS_COLUMNS = [
  { id: 'planned', title: 'Planned', color: 'bg-slate-100 dark:bg-slate-900' },
  { id: 'scheduled', title: 'Scheduled', color: 'bg-blue-50 dark:bg-blue-950' },
  { id: 'in-progress', title: 'In Progress', color: 'bg-yellow-50 dark:bg-yellow-950' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-50 dark:bg-yellow-950' },
  { id: 'on-hold', title: 'On Hold', color: 'bg-orange-50 dark:bg-orange-950' },
  { id: 'blocked', title: 'Blocked', color: 'bg-red-50 dark:bg-red-950' },
  { id: 'completed', title: 'Completed', color: 'bg-green-50 dark:bg-green-950' },
  { id: 'cancelled', title: 'Cancelled', color: 'bg-gray-100 dark:bg-gray-900' },
]

function KanbanTaskCard({
  task,
  onViewTask,
  onEditTask,
  onAssignTask,
  onLogHours,
  onDeleteTask,
}: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
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

  const progress = task.progress_percentage ?? task.percentComplete ?? 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", isDragging && "z-50")}
    >
      <Card
        className={cn(
          "mb-3 hover:shadow-md transition-shadow cursor-pointer",
          isDragging && "shadow-lg ring-2 ring-primary"
        )}
        onClick={() => onViewTask(task.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <button
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">
                    {task.task_number || task.taskNumber || '-'}
                  </span>
                  {task.priority && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        task.priority === 'critical' && "border-red-500 text-red-700 dark:text-red-400",
                        task.priority === 'high' && "border-orange-500 text-orange-700 dark:text-orange-400",
                        task.priority === 'medium' && "border-yellow-500 text-yellow-700 dark:text-yellow-400",
                        task.priority === 'low' && "border-blue-500 text-blue-700 dark:text-blue-400"
                      )}
                    >
                      {task.priority}
                    </Badge>
                  )}
                </div>
                <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                  {task.task_name || task.taskName || 'Untitled Task'}
                </h3>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewTask(task.id); }}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEditTask(task.id); }}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAssignTask(task.id); }}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign Resource
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onLogHours(task.id); }}>
                  <Clock className="mr-2 h-4 w-4" />
                  Log Hours
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDeleteTask(task.id); }}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {/* Progress Bar */}
          {progress > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Progress</span>
                <span className="text-xs font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Hours */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">
              Est: <span className="font-medium">{task.estimated_hours || task.estimatedHours ? `${parseHours(task.estimated_hours || task.estimatedHours).toLocaleString('en-US', { maximumFractionDigits: 1 })}h` : '-'}</span>
            </span>
            <span className="text-muted-foreground">
              Act: <span className="font-medium">{task.actual_hours || task.actualHours ? `${parseHours(task.actual_hours || task.actualHours).toLocaleString('en-US', { maximumFractionDigits: 1 })}h` : '0h'}</span>
            </span>
          </div>

          {/* Assigned To & Role */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {task.assigned_user_id || task.assigned_user_name ? (
                <>
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {getInitials(task.assigned_user_name || task.assignedUserName || '')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-xs font-medium truncate">
                    {task.assigned_user_name || task.assignedUserName || 'Assigned'}
                  </p>
                </>
              ) : (
                <span className="text-xs text-muted-foreground">Unassigned</span>
              )}
            </div>
            {task.assigned_role_name && (
              <Badge variant="outline" className="text-xs">
                {task.assigned_role_name}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KanbanColumn({
  id,
  title,
  tasks,
  onViewTask,
  onEditTask,
  onAssignTask,
  onLogHours,
  onDeleteTask,
}: KanbanColumnProps) {
  const columnConfig = STATUS_COLUMNS.find(col => col.id === id) || STATUS_COLUMNS[0]
  const taskIds = tasks.map(t => t.id)
  
  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-w-[280px] max-w-[320px]",
        isOver && "ring-2 ring-primary ring-offset-2 rounded-lg"
      )}
    >
      <Card className="flex-1 flex flex-col">
        <CardHeader className={cn("pb-3", columnConfig.color)}>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span>{title}</span>
            <Badge variant="secondary" className="ml-2">
              {tasks.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pb-4 min-h-[200px]">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-0">
              {tasks.map((task) => (
                <KanbanTaskCard
                  key={task.id}
                  task={task}
                  onViewTask={onViewTask}
                  onEditTask={onEditTask}
                  onAssignTask={onAssignTask}
                  onLogHours={onLogHours}
                  onDeleteTask={onDeleteTask}
                />
              ))}
              {/* Drop zone indicator at the bottom when column has tasks */}
              {tasks.length > 0 && isOver && (
                <div className="mt-2 h-2 bg-primary/20 rounded border-2 border-dashed border-primary/50" />
              )}
              {tasks.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg border-muted-foreground/20">
                  Drop tasks here
                </div>
              )}
            </div>
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  )
}

export function KanbanBoardView({
  tasks,
  onViewTask,
  onEditTask,
  onAssignTask,
  onLogHours,
  onDeleteTask,
  onStatusChange,
}: KanbanBoardViewProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const grouped: Record<string, Task[]> = {}
    
    // Initialize all status columns
    STATUS_COLUMNS.forEach(col => {
      grouped[col.id] = []
    })
    
    // Group tasks by status
    tasks.forEach(task => {
      const status = task.status || 'planned'
      // Normalize status (handle both 'in-progress' and 'in_progress')
      const normalizedStatus = status === 'in_progress' ? 'in-progress' : status
      
      // Find matching column
      const columnId = STATUS_COLUMNS.find(col => col.id === normalizedStatus)?.id || 'planned'
      
      if (!grouped[columnId]) {
        grouped[columnId] = []
      }
      grouped[columnId].push(task)
    })
    
    return grouped
  }, [tasks])

  // Get visible columns (only show columns that have tasks or are common statuses)
  const visibleColumns = useMemo(() => {
    const commonStatuses = ['planned', 'scheduled', 'in-progress', 'on-hold', 'blocked', 'completed']
    return STATUS_COLUMNS.filter(col => 
      commonStatuses.includes(col.id) || tasksByStatus[col.id]?.length > 0
    )
  }, [tasksByStatus])

  // Custom collision detection that prioritizes droppable columns over sortable items
  const collisionDetection: CollisionDetection = (args) => {
    const columnIds = new Set(STATUS_COLUMNS.map(col => col.id))
    
    // Get all collisions using rect intersection
    const collisions = rectIntersection(args)
    
    // Prioritize column collisions over task collisions
    const columnCollisions = collisions.filter(collision => 
      columnIds.has(collision.id as string)
    )
    
    // If we found column collisions, return them (prioritized)
    if (columnCollisions.length > 0) {
      return columnCollisions
    }
    
    // Otherwise return all collisions (which may include task cards)
    return collisions
  }

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null)
    const { active, over } = event

    if (!over) return

    const taskId = active.id as string
    let newStatus = over.id as string

    // Find the task's current status
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    // If over.id is a task ID (not a column ID), find which column that task belongs to
    if (tasks.some(t => t.id === newStatus)) {
      const targetTask = tasks.find(t => t.id === newStatus)
      if (targetTask) {
        const targetStatus = targetTask.status || 'planned'
        newStatus = targetStatus === 'in_progress' ? 'in-progress' : targetStatus
      } else {
        // If we can't determine the column, don't update
        return
      }
    }

    const currentStatus = task.status || 'planned'
    const normalizedCurrentStatus = currentStatus === 'in_progress' ? 'in-progress' : currentStatus

    // Only update if status changed
    if (normalizedCurrentStatus === newStatus) return

    // Check if the drop target is a valid status column
    const isValidStatus = STATUS_COLUMNS.some(col => col.id === newStatus)
    if (!isValidStatus) return

    try {
      // Update task status
      if (onStatusChange) {
        await onStatusChange(taskId, newStatus)
        toast.success(`Task moved to ${STATUS_COLUMNS.find(col => col.id === newStatus)?.title || newStatus}`)
      }
    } catch (error) {
      console.error('Failed to update task status:', error)
      toast.error('Failed to update task status')
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tasks found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {visibleColumns.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasksByStatus[column.id] || []}
            onViewTask={onViewTask}
            onEditTask={onEditTask}
            onAssignTask={onAssignTask}
            onLogHours={onLogHours}
            onDeleteTask={onDeleteTask}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <Card className="w-[280px] opacity-90 rotate-3 shadow-xl">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-muted-foreground">
                  {activeTask.task_number || activeTask.taskNumber || '-'}
                </span>
                <h3 className="font-semibold text-sm line-clamp-2">
                  {activeTask.task_name || activeTask.taskName || 'Untitled Task'}
                </h3>
              </div>
            </CardHeader>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

