"use client"

import { useState, useEffect } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
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

interface TaskCardViewProps {
  tasks: Task[]
  onViewTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onAssignTask: (taskId: string) => void
  onLogHours: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onReorder?: (taskIds: string[]) => void
  sortBy?: 'assignedTo' | 'role' | 'none'
}

interface SortableTaskCardProps {
  task: Task
  onViewTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onAssignTask: (taskId: string) => void
  onLogHours: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}

function SortableTaskCard({
  task,
  onViewTask,
  onEditTask,
  onAssignTask,
  onLogHours,
  onDeleteTask,
}: SortableTaskCardProps) {
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
    <div ref={setNodeRef} style={style} className={cn("touch-none", isDragging && "z-50")}>
      <Card
        className={cn(
          "hover:shadow-md transition-shadow cursor-pointer",
          isDragging && "shadow-lg"
        )}
        onClick={() => onViewTask(task.id)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <button
                {...attributes}
                {...listeners}
                className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-5 w-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-sm font-semibold">
                    {task.task_number || task.taskNumber || '-'}
                  </span>
                  {task.wbs_code || task.wbsCode ? (
                    <Badge variant="outline" className="font-mono text-xs">
                      {task.wbs_code || task.wbsCode}
                    </Badge>
                  ) : null}
                  <TaskStatusBadge status={task.status} />
                </div>
                <h3 className="font-semibold text-base mb-1 truncate">
                  {task.task_name || task.taskName || 'Untitled Task'}
                </h3>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                    {task.description}
                  </p>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
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
        <CardContent className="pt-0">
          <div className="space-y-3">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Progress</span>
                <span className="text-xs font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Hours */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Est:</span>
                <span className="ml-2 font-medium">
                  {task.estimated_hours || task.estimatedHours
                    ? `${parseHours(task.estimated_hours || task.estimatedHours).toLocaleString('en-US', { maximumFractionDigits: 1 })}h`
                    : '-'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Actual:</span>
                <span className="ml-2 font-medium">
                  {task.actual_hours || task.actualHours
                    ? `${parseHours(task.actual_hours || task.actualHours).toLocaleString('en-US', { maximumFractionDigits: 1 })}h`
                    : '0h'}
                </span>
              </div>
            </div>

            {/* Assigned To & Role */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {task.assigned_user_id || task.assigned_user_name ? (
                  <>
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {getInitials(task.assigned_user_name || task.assignedUserName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {task.assigned_user_name || task.assignedUserName || 'Assigned'}
                      </p>
                      {task.assigned_resources && Number(task.assigned_resources) > 1 && (
                        <p className="text-xs text-muted-foreground">
                          +{Number(task.assigned_resources) - 1} more
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Unassigned
                  </Badge>
                )}
              </div>
              <div className="flex-shrink-0 ml-2">
                {task.assigned_role_name ? (
                  <Badge variant="outline">{task.assigned_role_name}</Badge>
                ) : task.required_role_name ? (
                  <Badge variant="outline">{task.required_role_name}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">No role</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function TaskCardView({
  tasks,
  onViewTask,
  onEditTask,
  onAssignTask,
  onLogHours,
  onDeleteTask,
  onReorder,
  sortBy = 'none',
}: TaskCardViewProps) {
  const [taskIds, setTaskIds] = useState<string[]>(() => tasks.map(t => t.id))

  // Update taskIds when tasks change
  useEffect(() => {
    setTaskIds(tasks.map(t => t.id))
  }, [tasks])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sort tasks based on sortBy prop
  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortBy === 'assignedTo') {
      const aName = (a.assigned_user_name || a.assignedUserName || '').toLowerCase()
      const bName = (b.assigned_user_name || b.assignedUserName || '').toLowerCase()
      if (!aName && !bName) return 0
      if (!aName) return 1
      if (!bName) return -1
      return aName.localeCompare(bName)
    }
    if (sortBy === 'role') {
      const aRole = (a.assigned_role_name || a.required_role_name || '').toLowerCase()
      const bRole = (b.assigned_role_name || b.required_role_name || '').toLowerCase()
      if (!aRole && !bRole) return 0
      if (!aRole) return 1
      if (!bRole) return -1
      return aRole.localeCompare(bRole)
    }
    // Maintain drag-and-drop order
    const aIndex = taskIds.indexOf(a.id)
    const bIndex = taskIds.indexOf(b.id)
    if (aIndex === -1 && bIndex === -1) return 0
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = taskIds.indexOf(active.id as string)
      const newIndex = taskIds.indexOf(over.id as string)

      const newTaskIds = arrayMove(taskIds, oldIndex, newIndex)
      setTaskIds(newTaskIds)

      // Notify parent of reorder
      if (onReorder) {
        onReorder(newTaskIds)
      }
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
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              onViewTask={onViewTask}
              onEditTask={onEditTask}
              onAssignTask={onAssignTask}
              onLogHours={onLogHours}
              onDeleteTask={onDeleteTask}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

