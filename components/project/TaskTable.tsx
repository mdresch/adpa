"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Edit,
  UserPlus,
  Clock,
  Trash,
  Eye,
} from "lucide-react"

interface TaskTableProps {
  tasks: Task[]
  onViewTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onAssignTask: (taskId: string) => void
  onLogHours: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
}

type SortKey = keyof Task | 'none'
type SortDirection = 'asc' | 'desc' | 'none'

export function TaskTable({
  tasks,
  onViewTask,
  onEditTask,
  onAssignTask,
  onLogHours,
  onDeleteTask,
}: TaskTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'task_number',
    direction: 'asc',
  })

  const getInitials = (name: string | undefined): string => {
    if (!name) return '??'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2)
  }

  const handleSort = (key: SortKey) => {
    let direction: SortDirection = 'asc'
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc'
      } else if (sortConfig.direction === 'desc') {
        direction = 'none'
      }
    }

    setSortConfig({ key, direction })
  }

  const getSortIcon = (columnKey: SortKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    if (sortConfig.direction === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4" />
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />
  }

  const sortedTasks = [...tasks].sort((a, b) => {
    if (sortConfig.direction === 'none') return 0

    const aValue = a[sortConfig.key as keyof Task]
    const bValue = b[sortConfig.key as keyof Task]

    if (aValue === null || aValue === undefined) return 1
    if (bValue === null || bValue === undefined) return -1

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1
    }
    return 0
  })

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No tasks found. Try adjusting your filters.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleSort('task_number')}
            >
              <div className="flex items-center">
                Task #
                {getSortIcon('task_number')}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleSort('wbs_code')}
            >
              <div className="flex items-center">
                WBS
                {getSortIcon('wbs_code')}
              </div>
            </TableHead>
            <TableHead>Task Name</TableHead>
            <TableHead 
              className="text-right cursor-pointer hover:bg-accent"
              onClick={() => handleSort('estimated_hours')}
            >
              <div className="flex items-center justify-end">
                Est Hours
                {getSortIcon('estimated_hours')}
              </div>
            </TableHead>
            <TableHead className="text-right">Actual Hours</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Assigned To</TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleSort('status')}
            >
              <div className="flex items-center">
                Status
                {getSortIcon('status')}
              </div>
            </TableHead>
            <TableHead>Progress</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => (
            <TableRow 
              key={task.id} 
              className="hover:bg-accent cursor-pointer"
              onClick={() => onViewTask(task.id)}
            >
              <TableCell className="font-mono text-sm">{task.task_number}</TableCell>
              <TableCell className="font-mono text-sm">{task.wbs_code || '-'}</TableCell>
              <TableCell className="max-w-xs">
                <div>
                  <p className="font-medium truncate">{task.task_name}</p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground truncate">
                      {task.description}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-right">
                {task.estimated_hours ? `${task.estimated_hours}h` : '-'}
              </TableCell>
              <TableCell className="text-right">
                {task.actual_hours ? `${task.actual_hours}h` : '0h'}
              </TableCell>
              <TableCell>
                {task.required_role_name ? (
                  <Badge variant="outline">{task.required_role_name}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Not specified</span>
                )}
              </TableCell>
              <TableCell>
                {task.assigned_user_id ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(task.assigned_user_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate max-w-[120px]">
                      {task.assigned_user_name}
                    </span>
                  </div>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Unassigned
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <TaskStatusBadge status={task.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Progress value={task.progress_percentage} className="w-16" />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {task.progress_percentage}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewTask(task.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditTask(task.id)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Task
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onAssignTask(task.id)}>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Assign Resource
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onLogHours(task.id)}>
                      <Clock className="mr-2 h-4 w-4" />
                      Log Hours
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDeleteTask(task.id)}
                      className="text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete Task
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

