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
import { parseHours } from "@/lib/utils/taskUtils"

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

    let aValue: any
    let bValue: any

    // Handle special sorting cases
    if (sortConfig.key === 'assigned_role_name') {
      aValue = (a.assigned_role_name || a.required_role_name || '').toLowerCase()
      bValue = (b.assigned_role_name || b.required_role_name || '').toLowerCase()
    } else if (sortConfig.key === 'assigned_user_name') {
      aValue = (a.assigned_user_name || a.assignedUserName || '').toLowerCase()
      bValue = (b.assigned_user_name || b.assignedUserName || '').toLowerCase()
    } else {
      aValue = a[sortConfig.key as keyof Task]
      bValue = b[sortConfig.key as keyof Task]
    }

    if (aValue === null || aValue === undefined || aValue === '') return 1
    if (bValue === null || bValue === undefined || bValue === '') return -1

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
            <TableHead 
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleSort('assigned_role_name' as SortKey)}
            >
              <div className="flex items-center">
                Role
                {getSortIcon('assigned_role_name' as SortKey)}
              </div>
            </TableHead>
            <TableHead 
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleSort('assigned_user_name' as SortKey)}
            >
              <div className="flex items-center">
                Assigned To
                {getSortIcon('assigned_user_name' as SortKey)}
              </div>
            </TableHead>
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
          {sortedTasks.map((task, index) => (
            <TableRow 
              key={task.id || `task-${index}`}
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
                {task.estimated_hours 
                  ? `${parseHours(task.estimated_hours).toLocaleString('en-US', { maximumFractionDigits: 1 })}h`
                  : '-'}
              </TableCell>
              <TableCell className="text-right">
                {task.actual_hours 
                  ? `${parseHours(task.actual_hours).toLocaleString('en-US', { maximumFractionDigits: 1 })}h`
                  : '0h'}
              </TableCell>
              <TableCell>
                {task.assigned_role_name ? (
                  <Badge variant="outline">{task.assigned_role_name}</Badge>
                ) : task.required_role_name ? (
                  <Badge variant="outline">{task.required_role_name}</Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">Not specified</span>
                )}
              </TableCell>
              <TableCell>
                {task.assigned_user_id || task.assigned_user_name ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(task.assigned_user_name || task.assignedUserName || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate max-w-[120px] font-medium">
                        {task.assigned_user_name || task.assignedUserName || 'Assigned'}
                      </span>
                      {task.assigned_resources && Number(task.assigned_resources) > 1 && (
                        <span className="text-xs text-muted-foreground">
                          +{Number(task.assigned_resources) - 1} more
                        </span>
                      )}
                    </div>
                  </div>
                ) : task.assigned_to ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {getInitials(task.assigned_to.split(',')[0] || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm truncate max-w-[120px] font-medium">
                        {task.assigned_to.split(',')[0].trim()}
                      </span>
                      {task.assigned_to.split(',').length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          +{task.assigned_to.split(',').length - 1} more
                        </span>
                      )}
                    </div>
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
                  <Progress 
                    value={task.progress_percentage ?? task.percentComplete ?? 0} 
                    className="w-16" 
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {task.progress_percentage ?? task.percentComplete ?? 0}%
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" style={{ border: '2px solid red' }}>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

