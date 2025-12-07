'use client'

import { useMemo, useState, useCallback } from 'react'
import { Gantt, Task, ViewMode } from 'gantt-task-react'
import 'gantt-task-react/dist/index.css'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Task as ProjectTask, useTaskMutations } from '@/hooks/use-tasks'
import { Calendar } from 'lucide-react'

interface TaskGanttViewProps {
  tasks: ProjectTask[]
  onViewTask?: (taskId: string) => void
  projectId?: string
}

// Extended task type with metadata
interface PlannerTaskMeta {
  assignees?: { id: string; name: string; color?: string }[]
  status?: string
  priority?: string
  role?: string
}

interface PlannerTask extends Task {
  meta?: PlannerTaskMeta
  taskNumber?: string
  startDate?: Date
  endDate?: Date
}

// Pill component for labels/assignees
const Pill: React.FC<{ text: string; color?: string }> = ({ text, color = '#334155' }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      marginRight: 6,
      marginBottom: 4,
      borderRadius: 999,
      fontSize: 11,
      background: '#e2e8f0',
      color,
      lineHeight: 1.6,
    }}
  >
    {text}
  </span>
)

// Custom tooltip component with Planner-like details
const PlannerTooltip: React.FC<{ task: PlannerTask; fontSize: number; fontFamily: string }> = ({ task }) => {
  const meta = task.meta
  const duration = Math.ceil((task.end.getTime() - task.start.getTime()) / (1000 * 60 * 60 * 24))
  
  return (
    <div
      style={{
        padding: 12,
        lineHeight: 1.35,
        maxWidth: 320,
        backgroundColor: 'white',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontFamily: 'Segoe UI Variable, system-ui, Segoe UI, Roboto, sans-serif',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 14 }}>{task.name}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
        Start: {task.start.toLocaleDateString()}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>
        End: {task.end.toLocaleDateString()}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
        Duration: {duration} {duration === 1 ? 'day' : 'days'}
      </div>
      {'progress' in task && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          Progress: {task.progress}%
        </div>
      )}
      {meta?.status && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          Status: <strong>{meta.status}</strong>
        </div>
      )}
      {meta?.priority && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          Priority: <strong>{meta.priority}</strong>
        </div>
      )}
      {meta?.role && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          Role: <strong>{meta.role}</strong>
        </div>
      )}
      {task.dependencies && task.dependencies.length > 0 && (
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
          Depends on: {task.dependencies.length} task{task.dependencies.length > 1 ? 's' : ''}
        </div>
      )}
      {meta?.assignees && meta.assignees.length > 0 && (
        <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4, textTransform: 'uppercase' }}>
            Assignees
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {meta.assignees.map((a) => (
              <Pill key={a.id} text={a.name} color={a.color} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// Custom TaskListHeader with Name, From, To columns
const CustomTaskListHeader: React.FC<{
  headerHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
}> = ({ headerHeight, rowWidth, fontFamily, fontSize }) => {
  return (
    <div
      style={{
        display: 'flex',
        width: rowWidth,
        height: headerHeight,
        fontFamily,
        fontSize,
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        fontWeight: 600,
        color: '#475569',
      }}
    >
      <div
        style={{
          width: '50%',
          padding: '8px 12px',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        Name
      </div>
      <div
        style={{
          width: '25%',
          padding: '8px 12px',
          borderRight: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        From
      </div>
      <div
        style={{
          width: '25%',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        To
      </div>
    </div>
  )
}

// Custom TaskListTable with Name, From, To columns
const CustomTaskListTable: React.FC<{
  rowHeight: number
  rowWidth: string
  fontFamily: string
  fontSize: string
  locale: string
  tasks: PlannerTask[]
  selectedTaskId: string
  setSelectedTask: (taskId: string) => void
  onExpanderClick: (task: PlannerTask) => void
}> = ({
  rowHeight,
  rowWidth,
  fontFamily,
  fontSize,
  locale,
  tasks,
  selectedTaskId,
  setSelectedTask,
  onExpanderClick,
}) => {
  const formatDate = (date: Date | undefined): string => {
    if (!date) return '-'
    return date.toLocaleDateString(locale || 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div style={{ fontFamily, fontSize }}>
      {tasks.map((task) => {
        const isSelected = task.id === selectedTaskId
        const isProject = task.type === 'project'
        const hasChildren = tasks.some((t) => t.project === task.id)

        return (
          <div
            key={task.id}
            style={{
              display: 'flex',
              width: rowWidth,
              height: rowHeight,
              borderBottom: '1px solid #e2e8f0',
              backgroundColor: isSelected ? '#eff6ff' : isProject ? '#f8fafc' : 'white',
              cursor: 'pointer',
              alignItems: 'center',
            }}
            onClick={() => setSelectedTask(task.id)}
          >
            {/* Expander */}
            <div
              style={{
                width: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: hasChildren ? 'pointer' : 'default',
              }}
              onClick={(e) => {
                if (hasChildren) {
                  e.stopPropagation()
                  onExpanderClick(task)
                }
              }}
            >
              {hasChildren && (
                <span style={{ fontSize: 12, color: '#64748b' }}>
                  {task.hideChildren ? '▶' : '▼'}
                </span>
              )}
            </div>

            {/* Name Column (50%) */}
            <div
              style={{
                width: 'calc(50% - 24px)',
                padding: '0 12px',
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontWeight: isProject ? 600 : 400,
                color: isProject ? '#1e293b' : '#334155',
              }}
            >
              {task.name}
            </div>

            {/* From Column (25%) */}
            <div
              style={{
                width: '25%',
                padding: '0 12px',
                borderRight: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                fontSize: fontSize ? parseFloat(fontSize) - 1 : 11,
                color: '#64748b',
              }}
            >
              {formatDate(task.start)}
            </div>

            {/* To Column (25%) */}
            <div
              style={{
                width: '25%',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center',
                fontSize: fontSize ? parseFloat(fontSize) - 1 : 11,
                color: '#64748b',
              }}
            >
              {formatDate(task.end)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

    // Phase colors (distinct colors for each phase)
    const phaseColors: Record<string, string> = {
      'Initiating': '#3b82f6', // blue
      'Planning': '#8b5cf6', // purple
      'Executing': '#10b981', // green
      'Monitoring & Controlling': '#f59e0b', // amber
      'Monitoring And Controlling': '#f59e0b', // amber (alternative format)
      'Closing': '#ef4444', // red
      'Unassigned': '#9ca3af', // gray
    }

    // Helper to get phase color
    const getPhaseColor = (phaseName: string): string => {
      // Try exact match first
      if (phaseColors[phaseName]) {
        return phaseColors[phaseName]
      }
      // Try case-insensitive match
      const lowerPhase = phaseName.toLowerCase()
      for (const [key, color] of Object.entries(phaseColors)) {
        if (key.toLowerCase() === lowerPhase) {
          return color
        }
      }
      // Default color based on phase name hash
      const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']
      const hash = phaseName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
      return colors[hash % colors.length]
    }

export function TaskGanttViewNew({ tasks, onViewTask, projectId }: TaskGanttViewProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Month)
  
  // Get project ID from first task if not provided
  const effectiveProjectId = projectId || tasks[0]?.project_id || ''
  const { updateTask } = useTaskMutations(effectiveProjectId, () => {
    // Refresh tasks after update - could trigger a refetch here if needed
    console.log('Task updated successfully')
  })

  // Helper to parse dates
  const parseDate = (dateValue: string | Date | null | undefined): Date | null => {
    if (!dateValue) return null
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
      if (isNaN(date.getTime())) return null
      return date
    } catch {
      return null
    }
  }

  // Phase order (project lifecycle order) - defined as constant
  const phaseOrder: string[] = [
    'Initiating',
    'Planning',
    'Executing',
    'Monitoring & Controlling',
    'Monitoring And Controlling',
    'Closing',
    'Unassigned'
  ]

  // Phase colors (distinct colors for each phase)
  const phaseColors: Record<string, string> = {
    'Initiating': '#3b82f6', // blue
    'Planning': '#8b5cf6', // purple
    'Executing': '#10b981', // green
    'Monitoring & Controlling': '#f59e0b', // amber
    'Monitoring And Controlling': '#f59e0b', // amber (alternative format)
    'Closing': '#ef4444', // red
    'Unassigned': '#9ca3af', // gray
  }

  // Helper to get phase sort order
  const getPhaseOrder = useCallback((phaseName: string): number => {
    const index = phaseOrder.findIndex(p => 
      p.toLowerCase() === phaseName.toLowerCase() ||
      p.toLowerCase().replace(/&/g, 'and') === phaseName.toLowerCase().replace(/&/g, 'and')
    )
    return index >= 0 ? index : phaseOrder.length // Put unknown phases at the end
  }, [])

  // Helper to get phase color
  const getPhaseColor = useCallback((phaseName: string): string => {
    // Try exact match first
    if (phaseColors[phaseName]) {
      return phaseColors[phaseName]
    }
    // Try case-insensitive match
    const lowerPhase = phaseName.toLowerCase()
    for (const [key, color] of Object.entries(phaseColors)) {
      if (key.toLowerCase() === lowerPhase) {
        return color
      }
    }
    // Default color based on phase name hash
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']
    const hash = phaseName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }, [])

  // Include ALL tasks - we'll assign default dates if they don't have any
  const tasksWithDates = useMemo(() => {
    // Include all tasks, even if they don't have dates
    // We'll assign default dates in the transformation
    return tasks
  }, [tasks])

  // Transform tasks to gantt-task-react format - grouped by Phase
  const ganttTasksResult = useMemo(() => {
    const allTasks: PlannerTask[] = []
    const today = new Date()

    // Group tasks by Phase for buckets
    const phaseGroups: Record<string, ProjectTask[]> = {}

    tasksWithDates.forEach((task) => {
      // Get phase from task, with fallback to "Unassigned"
      const phase = task.phase || (task as any).phase_name || 'Unassigned'
      
      // Normalize phase name (handle various formats)
      let phaseKey = phase
      if (phase) {
        // Capitalize first letter and handle common phase names
        phaseKey = phase
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      } else {
        phaseKey = 'Unassigned'
      }
      
      if (!phaseGroups[phaseKey]) {
        phaseGroups[phaseKey] = []
      }
      
      phaseGroups[phaseKey].push(task)
    })

    // Calculate initial date range from tasks that have dates
    let minDate = today
    let maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)

    // First pass: get date range from tasks that have dates
    tasksWithDates.forEach((task) => {
      const start = parseDate(
        task.plannedStartDate || 
        task.start_date || 
        (task as any).assigned_scheduled_start_date || 
        task.actualStartDate
      )
      const end = parseDate(
        task.plannedEndDate || 
        task.end_date || 
        (task as any).assigned_scheduled_end_date || 
        task.actualEndDate
      )
      
      if (start && start < minDate) minDate = new Date(start)
      if (end && end > maxDate) maxDate = new Date(end)
    })

    // If no tasks have dates, set a reasonable default range
    if (minDate >= maxDate || tasksWithDates.length === 0) {
      minDate = today
      maxDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000) // 90 days from today
    }

    // Process all tasks first to determine final date range
    // Store tasks by phase bucket ID for later insertion
    const tasksByPhaseBucket: Map<string, PlannerTask[]> = new Map()
    
    // Process tasks and collect them by Phase
    Object.entries(phaseGroups).forEach(([phaseName, phaseTasks]) => {
      if (phaseTasks.length === 0) return

      const bucketId = `phase-${phaseName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`
      const phaseTaskList: PlannerTask[] = []

      // Add tasks under this phase bucket
      phaseTasks.forEach((task, index) => {
        // Get start date with priority order
        let startDate: Date = today
        const parsedStart =
          parseDate(task.plannedStartDate) ||
          parseDate(task.start_date) ||
          parseDate((task as any).assigned_scheduled_start_date) ||
          parseDate(task.actualStartDate)

        if (parsedStart) {
          startDate = parsedStart
        } else {
          // If no start date, use today as default
          startDate = new Date(today)
          // Spread tasks out over time if they don't have dates
          // Add a small offset based on index to avoid all tasks on same day
          startDate.setDate(startDate.getDate() + (index % 30))
        }

        // Get end date with priority order
        let endDate: Date = new Date(startDate)
        const parsedEnd =
          parseDate(task.plannedEndDate) ||
          parseDate(task.end_date) ||
          parseDate((task as any).assigned_scheduled_end_date) ||
          parseDate(task.actualEndDate)

        if (parsedEnd) {
          endDate = parsedEnd
        } else if (task.estimatedDurationDays) {
          endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + (task.estimatedDurationDays || 1))
        } else {
          // Default: 1 day duration
          endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 1)
        }

        // Ensure valid dates
        if (endDate <= startDate || isNaN(endDate.getTime()) || isNaN(startDate.getTime())) {
          endDate = new Date(startDate)
          endDate.setDate(endDate.getDate() + 1)
        }

        // Update min/max dates to accommodate all tasks
        if (startDate < minDate) {
          minDate = new Date(startDate)
        }
        if (endDate > maxDate) {
          maxDate = new Date(endDate)
        }

        // Get task name only (no task number - task number will be in separate column)
        const taskName = task.task_name || task.taskName || `Task ${index + 1}`

        // Get progress
        const progress = Math.min(100, Math.max(0, task.progress_percentage || task.percentComplete || 0))

        // Determine status-based styling
        const taskStatus = task.status || 'planned'
        const statusColors: { [key: string]: string } = {
          completed: '#10b981',
          'in-progress': '#3b82f6',
          in_progress: '#3b82f6',
          scheduled: '#8b5cf6',
          planned: '#6b7280',
          'on-hold': '#f59e0b',
          on_hold: '#f59e0b',
          blocked: '#ef4444',
          cancelled: '#9ca3af',
        }
        const color = statusColors[taskStatus] || statusColors['planned']

        // Build dependencies
        const dependencies: string[] = []
        if (task.dependencies && Array.isArray(task.dependencies)) {
          task.dependencies.forEach((dep) => {
            if (dep.predecessorTaskId || dep.predecessor_task_id) {
              const predId = dep.predecessorTaskId || dep.predecessor_task_id
              if (predId) {
                dependencies.push(predId)
              }
            }
          })
        }

        // Build assignees metadata
        const assignees: { id: string; name: string; color?: string }[] = []
        if (task.assigned_user_name) {
          assignees.push({
            id: task.assigned_user_id || task.id || `user-${index}`,
            name: task.assigned_user_name,
            color: '#3b82f6',
          })
        }

        // Create task (like t1, t2, t3 in example)
        const plannerTask: PlannerTask = {
          id: task.id || `task-${index}`,
          name: taskName,
          start: startDate,
          end: endDate,
          type: 'task',
          project: bucketId, // Link to bucket project
          progress: progress,
          isDisabled: false, // Make tasks editable
          styles: { progressColor: color },
          dependencies: dependencies.length > 0 ? dependencies : undefined,
          meta: {
            status: taskStatus,
            priority: task.priority || undefined,
            role: task.assigned_role_name || undefined,
            assignees: assignees.length > 0 ? assignees : undefined,
          },
          taskNumber: task.task_number || task.taskNumber || task.wbs_code || task.wbsCode,
          startDate: startDate,
          endDate: endDate,
        }

        // Only add if dates are valid
        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate < endDate) {
          phaseTaskList.push(plannerTask)
        } else {
          console.warn('Skipping task with invalid dates:', task.id, taskName, { startDate, endDate })
        }
      })

      // Store tasks for this phase
      tasksByPhaseBucket.set(bucketId, phaseTaskList)
    })

    // Sort phases by project lifecycle order
    const sortedPhases = Object.entries(phaseGroups).sort(([phaseA], [phaseB]) => {
      return getPhaseOrder(phaseA) - getPhaseOrder(phaseB)
    })

    // Now create phase bucket projects with final date range in correct order
    sortedPhases.forEach(([phaseName, phaseTasks]) => {
      if (phaseTasks.length === 0) return

      const bucketId = `phase-${phaseName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`
      
      // Calculate phase progress (average of all tasks in phase)
      const phaseProgress = phaseTasks.length > 0
        ? Math.round(
            phaseTasks.reduce((sum, task) => sum + (task.progress_percentage || task.percentComplete || 0), 0) /
            phaseTasks.length
          )
        : 0
      
      // Create project/bucket row for this phase
      const bucketProject: PlannerTask = {
        id: bucketId,
        name: phaseName,
        start: minDate,
        end: maxDate,
        type: 'project',
        progress: phaseProgress,
        styles: {
          backgroundColor: getPhaseColor(phaseName),
        },
      }
      allTasks.push(bucketProject)

      // Add tasks for this phase immediately after the phase bucket
      const phaseTaskList = tasksByPhaseBucket.get(bucketId) || []
      allTasks.push(...phaseTaskList)
    })

    console.log('Gantt tasks created (by Phase):', {
      totalTasks: tasks.length,
      tasksWithDates: tasksWithDates.length,
      ganttTasks: allTasks.length,
      phases: Object.entries(phaseGroups).map(([phaseName, phaseTasks]) => ({
        phase: phaseName,
        count: phaseTasks.length,
        bucketId: `phase-${phaseName.toLowerCase().replace(/\s+/g, '-').replace(/&/g, 'and')}`
      }))
    })

    return { ganttTasks: allTasks, phaseGroups }
  }, [tasksWithDates, tasks, getPhaseColor, getPhaseOrder, phaseOrder])

  const ganttTasks = ganttTasksResult.ganttTasks
  const phaseGroups = ganttTasksResult.phaseGroups

  // Extract phaseGroups for use in legend
  const phaseGroupsForLegend = useMemo(() => {
    const groups: Record<string, ProjectTask[]> = {}
    tasksWithDates.forEach((task) => {
      const phase = task.phase || (task as any).phase_name || 'Unassigned'
      let phaseKey = phase
      if (phase) {
        phaseKey = phase
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ')
      } else {
        phaseKey = 'Unassigned'
      }
      if (!groups[phaseKey]) {
        groups[phaseKey] = []
      }
      groups[phaseKey].push(task)
    })
    return groups
  }, [tasksWithDates])

  // Calculate column width based on view mode
  const columnWidth = useMemo(() => {
    switch (viewMode) {
      case ViewMode.Day:
        return 65
      case ViewMode.Week:
        return 220
      case ViewMode.Month:
        return 300
      default:
        return 220
    }
  }, [viewMode])

  const handleDateChange = async (next: PlannerTask) => {
    // Skip if it's a project/bucket (can't edit those)
    if (next.type === 'project') {
      return
    }

    // Find the original task to get its ID
    const originalTask = tasks.find(t => t.id === next.id)
    if (!originalTask) {
      console.warn('Task not found for date update:', next.id)
      return
    }

    try {
      // Update task dates in backend
      await updateTask(next.id, {
        plannedStartDate: next.start,
        plannedEndDate: next.end,
      })
      console.log('Task dates updated:', next.id, { start: next.start, end: next.end })
    } catch (error) {
      console.error('Failed to update task dates:', error)
      // Optionally show a toast notification here
    }
  }

  const handleProgressChange = async (next: PlannerTask) => {
    // Skip if it's a project/bucket
    if (next.type === 'project') {
      return
    }

    const originalTask = tasks.find(t => t.id === next.id)
    if (!originalTask) {
      console.warn('Task not found for progress update:', next.id)
      return
    }

    try {
      // Update task progress in backend
      await updateTask(next.id, {
        progress_percentage: next.progress,
      })
      console.log('Task progress updated:', next.id, { progress: next.progress })
    } catch (error) {
      console.error('Failed to update task progress:', error)
    }
  }

  const handleTaskClick = (task: PlannerTask) => {
    // Open task details on click (skip project buckets)
    if (task.type !== 'project' && onViewTask) {
      onViewTask(task.id)
    }
  }

  const handleTaskSelect = (task: PlannerTask, isSelected: boolean) => {
    // Open task details on select (skip project buckets)
    if (task.type !== 'project' && onViewTask && isSelected) {
      onViewTask(task.id)
    }
  }

  const handleDoubleClick = (task: PlannerTask) => {
    // Open task details on double click (skip project buckets)
    if (task.type !== 'project' && onViewTask) {
      onViewTask(task.id)
    }
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No tasks available for Gantt chart</p>
      </div>
    )
  }

  // Show message if no tasks at all
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No tasks available for Gantt chart</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">View:</span>
          <Select
            value={viewMode.toString()}
            onValueChange={(v) => setViewMode(Number(v) as ViewMode)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ViewMode.Hour.toString()}>Hour</SelectItem>
              <SelectItem value={ViewMode.QuarterDay.toString()}>Quarter Day</SelectItem>
              <SelectItem value={ViewMode.HalfDay.toString()}>Half Day</SelectItem>
              <SelectItem value={ViewMode.Day.toString()}>Day</SelectItem>
              <SelectItem value={ViewMode.Week.toString()}>Week</SelectItem>
              <SelectItem value={ViewMode.Month.toString()}>Month</SelectItem>
              <SelectItem value={ViewMode.Year.toString()}>Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {tasksWithDates.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Gantt Chart Container with Neumorphic styling */}
      <Card className="gantt-shell" style={{ 
        background: '#f8fafc',
        borderRadius: 16,
        boxShadow: '8px 12px 24px rgba(15,23,42,0.08)',
        border: 'none'
      }}>
        <CardContent className="p-4 bg-transparent">
          <style jsx global>{`
            /* Style for task list to show task number in separate column */
            .gantt-task-list-name {
              font-family: 'Courier New', Courier, monospace !important;
              white-space: pre !important;
            }
            .gantt-task-list-name-cell {
              font-family: 'Courier New', Courier, monospace !important;
            }
          `}</style>
          <div className="w-full overflow-x-auto" style={{ minWidth: '1200px' }}>
            <Gantt
              tasks={ganttTasks}
              viewMode={viewMode}
              columnWidth={columnWidth}
              onDateChange={handleDateChange}
              onProgressChange={handleProgressChange}
              onDoubleClick={handleDoubleClick}
              onClick={handleTaskClick}
              onSelect={handleTaskSelect}
              TooltipContent={PlannerTooltip}
              listCellWidth="600px"
              TaskListHeader={CustomTaskListHeader}
              TaskListTable={CustomTaskListTable}
              rowHeight={44}
              barCornerRadius={6}
              ganttHeight={Math.max(400, ganttTasks.length * 50 + 150)}
              todayColor="#fff1a6"
              fontFamily="'Segoe UI Variable', system-ui, Segoe UI, Roboto, sans-serif"
              fontSize="12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Legend - Show phases */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">Phases:</span>
        {Object.keys(phaseGroupsForLegend).length > 0 ? (
          Object.entries(phaseGroupsForLegend).map(([phaseName]) => (
            <div key={phaseName} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded" 
                style={{ backgroundColor: getPhaseColor(phaseName) }}
              ></div>
              <span>{phaseName}</span>
            </div>
          ))
        ) : (
          <span className="text-muted-foreground">No phases available</span>
        )}
      </div>
    </div>
  )
}
