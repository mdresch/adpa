'use client'

import { useEffect, useRef, useState } from 'react'
import Gantt from 'frappe-gantt'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Task } from '@/hooks/use-tasks'
import { Calendar } from 'lucide-react'

interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies?: string
  custom_class?: string
}

interface TaskGanttViewProps {
  tasks: Task[]
  onViewTask?: (taskId: string) => void
}

export function TaskGanttView({ tasks, onViewTask }: TaskGanttViewProps) {
  const ganttContainerRef = useRef<HTMLDivElement | null>(null)
  const ganttInstance = useRef<any>(null)
  const [viewMode, setViewMode] = useState<'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'>('Month')

  // Filter tasks that have dates (at least estimated or scheduled from assignments)
  const tasksWithDates = tasks.filter(
    (task) =>
      task.plannedStartDate ||
      task.start_date ||
      task.actualStartDate ||
      task.plannedEndDate ||
      task.end_date ||
      task.actualEndDate ||
      (task as any).assigned_scheduled_start_date ||
      (task as any).assigned_scheduled_end_date ||
      task.estimatedDurationDays
  )

  useEffect(() => {
    console.log('TaskGanttView useEffect triggered', {
      containerExists: !!ganttContainerRef.current,
      tasksCount: tasks.length,
      tasksWithDatesCount: tasksWithDates.length,
      viewMode
    })

    if (!ganttContainerRef.current) {
      console.warn('Gantt container ref not available')
      return
    }

    if (tasksWithDates.length === 0) {
      // Clear container if no tasks
      console.log('No tasks with dates, clearing container')
      ganttContainerRef.current.innerHTML = '<div class="p-8 text-center text-gray-500">No tasks with dates available</div>'
      return
    }

    // Store click handler for cleanup (declare outside try block so it's available in cleanup)
    let clickHandler: ((e: MouseEvent) => void) | null = null

    // Clear any existing Gantt instance
    if (ganttInstance.current) {
      try {
        ganttInstance.current = null
      } catch (e) {
        console.warn('Error clearing previous Gantt:', e)
      }
    }

    // Clear the container completely
    if (ganttContainerRef.current) {
      ganttContainerRef.current.innerHTML = ''
    }

    try {
      // Transform tasks to Gantt format
      const ganttTasks: GanttTask[] = []
      const today = new Date()
      const todayStr = today.toISOString().split('T')[0]

      // Build a map of task IDs to their Gantt task IDs for dependency resolution
      const taskIdMap = new Map<string, string>()

      tasksWithDates.forEach((task, index) => {
        // Use task ID or generate one
        const taskId = task.id || `task-${index}`
        taskIdMap.set(task.id, taskId)

        // Get task name
        const taskName = task.task_name || task.taskName || task.task_number || task.taskNumber || `Task ${index + 1}`

        // Determine start and end dates
        let startDate: string = todayStr
        let endDate: string = todayStr

        // Helper function to safely parse and format dates
        const formatDate = (dateValue: string | Date | null | undefined): string | null => {
          if (!dateValue) return null
          try {
            const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue
            if (isNaN(date.getTime())) return null
            return date.toISOString().split('T')[0] // Returns YYYY-MM-DD format
          } catch {
            return null
          }
        }

        // Priority: planned dates > scheduled dates from assignments > actual dates > estimated duration > default
        // Start date priority
        const parsedStartDate = 
          formatDate(task.plannedStartDate) ||
          formatDate(task.start_date) ||
          formatDate((task as any).assigned_scheduled_start_date) ||
          formatDate(task.actualStartDate)
        
        if (parsedStartDate) {
          startDate = parsedStartDate
        }

        // End date priority
        const parsedEndDate = 
          formatDate(task.plannedEndDate) ||
          formatDate(task.end_date) ||
          formatDate((task as any).assigned_scheduled_end_date) ||
          formatDate(task.actualEndDate)
        
        if (parsedEndDate) {
          endDate = parsedEndDate
        } else if (task.estimatedDurationDays) {
          // If no end date, calculate from start date + estimated duration
          const start = new Date(startDate)
          start.setDate(start.getDate() + (task.estimatedDurationDays || 1))
          endDate = start.toISOString().split('T')[0]
        } else {
          // Default: 1 day duration
          const start = new Date(startDate)
          start.setDate(start.getDate() + 1)
          endDate = start.toISOString().split('T')[0]
        }

        // Ensure end date is not before start date
        const startDateObj = new Date(startDate)
        const endDateObj = new Date(endDate)
        if (endDateObj < startDateObj) {
          const correctedEnd = new Date(startDateObj)
          correctedEnd.setDate(correctedEnd.getDate() + 1)
          endDate = correctedEnd.toISOString().split('T')[0]
        }

        // Validate dates are in correct format (YYYY-MM-DD)
        if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
          console.warn('Invalid date format for task:', task.id, { startDate, endDate })
          return // Skip this task
        }

        // Get progress percentage
        const progress = Math.min(100, Math.max(0, task.progress_percentage || task.percentComplete || 0))

        // Build dependencies string (frappe-gantt format: comma-separated task IDs)
        const dependencies: string[] = []
        if (task.dependencies && Array.isArray(task.dependencies)) {
          task.dependencies.forEach((dep) => {
            // If this task depends on another (predecessor)
            if (dep.predecessorTaskId || dep.predecessor_task_id) {
              const predId = dep.predecessorTaskId || dep.predecessor_task_id
              if (predId && taskIdMap.has(predId)) {
                dependencies.push(taskIdMap.get(predId)!)
              }
            }
            // If another task depends on this one (successor), we don't add it here
            // The successor task will reference this task's ID
          })
        }

        // Determine color based on status
        const statusColors: { [key: string]: string } = {
          'completed': '#10b981', // green
          'in-progress': '#3b82f6', // blue
          'in_progress': '#3b82f6', // blue
          'scheduled': '#8b5cf6', // purple
          'planned': '#6b7280', // gray
          'on-hold': '#f59e0b', // orange
          'blocked': '#ef4444', // red
          'cancelled': '#9ca3af', // light gray
        }
        const status = task.status || 'planned'
        const color = statusColors[status] || statusColors['planned']

        ganttTasks.push({
          id: taskId,
          name: taskName,
          start: startDate,
          end: endDate,
          progress,
          dependencies: dependencies.length > 0 ? dependencies.join(',') : undefined,
          custom_class: `gantt-task-${status.replace(/-/g, '_')}`,
        })
      })

      if (ganttTasks.length === 0) {
        if (ganttContainerRef.current) {
          ganttContainerRef.current.innerHTML = '<div class="p-8 text-center text-gray-500">No valid tasks to display</div>'
        }
        return
      }

      console.log('Creating Gantt chart with', ganttTasks.length, 'tasks:', ganttTasks.slice(0, 3))

      // Validate task dates
      const validTasks = ganttTasks.filter(task => {
        const start = new Date(task.start)
        const end = new Date(task.end)
        const isValid = !isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start
        if (!isValid) {
          console.warn('Invalid task dates:', task)
        }
        return isValid
      })

      if (validTasks.length === 0) {
        console.error('No valid tasks after date validation')
        if (ganttContainerRef.current) {
          ganttContainerRef.current.innerHTML = '<div class="p-8 text-center text-gray-500">No valid tasks with proper dates</div>'
        }
        return
      }

      // Ensure container is visible and has dimensions before initializing
      const initGantt = () => {
        if (!ganttContainerRef.current) return

        const rect = ganttContainerRef.current.getBoundingClientRect()
        console.log('Container dimensions:', { width: rect.width, height: rect.height })
        
        if (rect.width === 0 || rect.height === 0) {
          console.warn('Container has zero dimensions, retrying...')
          setTimeout(initGantt, 100)
          return
        }

        // Ensure container has explicit dimensions (frappe-gantt needs pixel values)
        // Use actual container width or minimum 1200px for proper rendering
        const containerWidth = Math.max(rect.width || 1200, 1200)
        const containerHeight = Math.max(400, validTasks.length * 50 + 150)
        
        // Set explicit dimensions
        ganttContainerRef.current.style.width = `${containerWidth}px`
        ganttContainerRef.current.style.minWidth = '1200px'
        ganttContainerRef.current.style.minHeight = `${containerHeight}px`
        ganttContainerRef.current.style.overflowX = 'auto'
        ganttContainerRef.current.style.overflowY = 'visible'
        ganttContainerRef.current.style.position = 'relative'

        // Create Gantt chart
        console.log('Initializing Gantt with options:', {
          view_mode: viewMode,
          bar_height: 35,
          tasks: validTasks.length,
          containerWidth,
          containerHeight,
          sampleTask: validTasks[0]
        })
        
        try {
          // Clear container before creating new instance
          if (ganttContainerRef.current) {
            ganttContainerRef.current.innerHTML = ''
          }

          ganttInstance.current = new Gantt(ganttContainerRef.current, validTasks, {
            view_mode: viewMode,
            bar_height: 35,
            bar_corner_radius: 3,
            arrow_curve: 5,
            padding: 18,
            date_format: 'YYYY-MM-DD',
            language: 'en',
            header_height: 50,
            column_width: 30,
            step: 24,
            width: containerWidth,
            height: containerHeight,
            custom_popup_html: function(task: any) {
              const taskObj = tasksWithDates.find(t => (t.id || '') === task.id || (t.task_number || '') === task.id)
              const duration = Math.ceil(
                (new Date(task._end).getTime() - new Date(task._start).getTime()) / (1000 * 60 * 60 * 24)
              )
              const assignedTo = taskObj?.assigned_user_name || taskObj?.assignedUserName || 'Unassigned'
              const status = taskObj?.status || 'planned'
              const priority = taskObj?.priority || 'medium'
              
              return `
                <div class="p-3 min-w-[200px]">
                  <h5 class="font-semibold mb-2 text-gray-900">${task.name}</h5>
                  <div class="text-sm space-y-1 text-gray-600">
                    <p><strong>Status:</strong> ${status}</p>
                    <p><strong>Priority:</strong> ${priority}</p>
                    <p><strong>Assigned to:</strong> ${assignedTo}</p>
                    <p><strong>Start:</strong> ${new Date(task._start).toLocaleDateString()}</p>
                    <p><strong>End:</strong> ${new Date(task._end).toLocaleDateString()}</p>
                    <p><strong>Duration:</strong> ${duration} days</p>
                    <p><strong>Progress:</strong> ${task.progress}%</p>
                    ${taskObj?.estimated_hours ? `<p><strong>Est. Hours:</strong> ${taskObj.estimated_hours}h</p>` : ''}
                    ${taskObj?.actual_hours ? `<p><strong>Actual Hours:</strong> ${taskObj.actual_hours}h</p>` : ''}
                  </div>
                </div>
              `
            },
          })

          console.log('Gantt chart created successfully')
          
          // Immediately check and fix SVG rendering
          setTimeout(() => {
            const svg = ganttContainerRef.current?.querySelector('svg')
            if (svg) {
              console.log('SVG found, applying fixes')
              svg.style.backgroundColor = 'white'
              svg.style.display = 'block'
              svg.style.visibility = 'visible'
            } else {
              console.warn('SVG not found after Gantt creation')
            }
          }, 50)
        } catch (ganttError) {
          console.error('Error initializing Gantt:', ganttError)
          throw ganttError
        }
      }

      // Initialize with a small delay to ensure container is ready
      setTimeout(initGantt, 50)

      // Add click handler to Gantt tasks using event delegation
      if (ganttContainerRef.current && onViewTask) {
        clickHandler = (e: MouseEvent) => {
          const target = e.target as HTMLElement
          // Check if clicked element is part of a task bar
          const barWrapper = target.closest('.bar-wrapper') as HTMLElement
          if (barWrapper) {
            e.stopPropagation()
            // Try to extract task ID from the wrapper's class or data attributes
            const classList = barWrapper.className.baseVal || barWrapper.className
            const taskIdMatch = classList.match(/task-([^\s]+)/) || 
                               barWrapper.getAttribute('data-task-id') ||
                               barWrapper.getAttribute('id')
            
            if (taskIdMatch) {
              const ganttTaskId = typeof taskIdMatch === 'string' ? taskIdMatch : taskIdMatch[1]
              // Find the original task ID from our map
              const originalTaskId = Array.from(taskIdMap.entries()).find(([_, ganttId]) => ganttId === ganttTaskId)?.[0]
              if (originalTaskId) {
                onViewTask(originalTaskId)
              }
            }
          }
        }

        // Use event delegation on the container
        ganttContainerRef.current.addEventListener('click', clickHandler)
      }

      // Add custom CSS for status colors and frappe-gantt base styles
      const styleId = 'gantt-task-status-colors'
      let styleElement = document.getElementById(styleId) as HTMLStyleElement
      if (!styleElement) {
        styleElement = document.createElement('style')
        styleElement.id = styleId
        document.head.appendChild(styleElement)
      }
      
      // Update style content
      styleElement.textContent = `
        /* Base frappe-gantt container */
        .gantt-container {
          background-color: white !important;
          overflow-x: auto;
          overflow-y: visible;
        }
        
        .gantt-container svg {
          background-color: white !important;
          display: block;
          width: 100%;
          height: auto;
        }
        
        /* Fix header positioning - ensure timeline headers stay at top */
        .gantt-container svg g.grid-header {
          transform: translate(0, 0) !important;
        }
        
        .gantt-container svg g.grid-header rect {
          fill: #f9fafb !important;
        }
        
        .gantt-container svg g.grid-header text {
          fill: #1f2937 !important;
          font-size: 12px !important;
          font-weight: 500 !important;
        }
        
        /* Grid background */
        .gantt-container .grid-background {
          fill: white !important;
        }
        
        /* Task rows - ensure they're in the grid area, not header */
        .gantt-container svg g.grid-row {
          fill: white !important;
        }
        
        .gantt-container svg g.grid-row:nth-child(even) {
          fill: #f9fafb !important;
        }
        
        .gantt-container .row-line {
          stroke: #e5e7eb !important;
        }
        
        .gantt-container .tick {
          stroke: #9ca3af !important;
        }
        
        .gantt-container .today-highlight {
          fill: #fef3c7 !important;
          opacity: 0.5 !important;
        }
        
        /* Task bars */
        .gantt-container .bar {
          rx: 3 !important;
          ry: 3 !important;
        }
        
        .gantt-container .bar-progress {
          fill: rgba(0, 0, 0, 0.2) !important;
        }
        
        .gantt-container .bar-invalid {
          fill: transparent !important;
          stroke: #ef4444 !important;
          stroke-width: 1 !important;
          stroke-dasharray: 5 !important;
        }
        
        .gantt-container .bar-label {
          fill: #1f2937 !important;
          dominant-baseline: central !important;
          text-anchor: middle !important;
          font-size: 12px !important;
          font-weight: 500 !important;
        }
        
        .gantt-container .arrow {
          fill: none !important;
          stroke: #6b7280 !important;
          stroke-width: 1.5 !important;
        }
        
        /* Remove any black backgrounds */
        .gantt-container svg rect[fill="#000000"],
        .gantt-container svg rect[fill="black"],
        .gantt-container svg rect[fill="#000"] {
          display: none !important;
        }
        
        /* Status-based task colors */
        .gantt-task-completed .bar { fill: #10b981 !important; }
        .gantt-task-in_progress .bar, .gantt-task-in-progress .bar { fill: #3b82f6 !important; }
        .gantt-task-scheduled .bar { fill: #8b5cf6 !important; }
        .gantt-task-planned .bar { fill: #6b7280 !important; }
        .gantt-task-on_hold .bar { fill: #f59e0b !important; }
        .gantt-task-blocked .bar { fill: #ef4444 !important; }
        .gantt-task-cancelled .bar { fill: #9ca3af !important; }
      `

      // Fix layout and styling issues
      setTimeout(() => {
        const svg = ganttContainerRef.current?.querySelector('svg')
        if (!svg) {
          console.warn('SVG not found in Gantt container')
          return
        }

        console.log('Applying Gantt layout fixes')

        // Force SVG to be visible and properly sized
        svg.style.backgroundColor = 'white'
        svg.style.display = 'block'
        svg.style.visibility = 'visible'
        svg.style.width = '100%'
        svg.style.maxWidth = '100%'
        svg.style.height = 'auto'
        svg.setAttribute('preserveAspectRatio', 'xMidYMid meet')

        // Get viewBox to understand structure
        const viewBox = svg.getAttribute('viewBox')
        console.log('SVG viewBox:', viewBox)

        // Find and fix header group (should contain years/months)
        const headerGroups = svg.querySelectorAll('g.grid-header')
        console.log(`Found ${headerGroups.length} header groups`)
        
        headerGroups.forEach((headerGroup, idx) => {
          const transform = headerGroup.getAttribute('transform')
          console.log(`Header group ${idx} transform:`, transform)
          
          // Ensure header is positioned at top (y=0 or small y value)
          if (transform && !transform.includes('translate(0')) {
            // Reset transform to ensure header stays at top
            headerGroup.setAttribute('transform', 'translate(0, 0)')
          }
        })

        // Remove any black background rects
        const allRects = svg.querySelectorAll('rect')
        let removedCount = 0
        allRects.forEach((rect) => {
          const fill = rect.getAttribute('fill')
          if (fill === '#000000' || fill === 'black' || fill === '#000') {
            rect.remove()
            removedCount++
          }
        })
        if (removedCount > 0) {
          console.log(`Removed ${removedCount} black background rects`)
        }

        // Ensure grid rows are properly positioned below header
        const gridRows = svg.querySelectorAll('g.grid-row')
        console.log(`Found ${gridRows.length} grid rows`)
        
        // Check if any grid rows are positioned incorrectly (in header area)
        gridRows.forEach((row, idx) => {
          const transform = row.getAttribute('transform')
          if (transform) {
            const yMatch = transform.match(/translate\([^,]+,\s*(\d+)\)/)
            if (yMatch) {
              const y = parseInt(yMatch[1])
              // If row is in header area (y < 50), it might be mispositioned
              if (y < 50 && idx === 0) {
                console.warn(`Grid row ${idx} might be in header area: y=${y}`)
              }
            }
          }
        })

        // Apply status-based colors to task bars
        const barWrappers = ganttContainerRef.current?.querySelectorAll('.bar-wrapper')
        console.log(`Found ${barWrappers?.length || 0} bar wrappers`)
        
        barWrappers?.forEach((wrapper, idx) => {
          const rects = wrapper.querySelectorAll('rect')
          // Get the task's status from the custom_class
          const wrapperClass = wrapper.className.baseVal || wrapper.className || ''
          const statusMatch = wrapperClass.match(/gantt-task-([^\s]+)/)
          
          if (statusMatch) {
            const status = statusMatch[1].replace(/_/g, '-')
            const statusColors: { [key: string]: string } = {
              'completed': '#10b981',
              'in-progress': '#3b82f6',
              'in_progress': '#3b82f6',
              'scheduled': '#8b5cf6',
              'planned': '#6b7280',
              'on-hold': '#f59e0b',
              'on_hold': '#f59e0b',
              'blocked': '#ef4444',
              'cancelled': '#9ca3af',
            }
            const color = statusColors[status] || statusColors['planned']
            
            rects.forEach((rect) => {
              rect.setAttribute('fill', color)
              rect.setAttribute('style', `fill: ${color} !important`)
              rect.style.setProperty('fill', color, 'important')
            })
          } else {
            // Fallback: apply default color if no status match
            const defaultColor = '#6b7280'
            rects.forEach((rect) => {
              rect.setAttribute('fill', defaultColor)
              rect.setAttribute('style', `fill: ${defaultColor} !important`)
            })
          }
        })

        // Ensure the container itself has white background
        if (ganttContainerRef.current) {
          ganttContainerRef.current.style.backgroundColor = 'white'
          ganttContainerRef.current.style.minHeight = '400px'
        }
      }, 300)
    } catch (error) {
      console.error('Error creating Gantt chart:', error)
      if (ganttContainerRef.current) {
        ganttContainerRef.current.innerHTML = `
          <div class="p-8 text-center">
            <p class="text-red-500 mb-2">Error loading Gantt chart</p>
            <p class="text-sm text-gray-500">${error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        `
      }
    }

    // Cleanup function
    return () => {
      if (clickHandler && ganttContainerRef.current) {
        ganttContainerRef.current.removeEventListener('click', clickHandler)
      }
      if (ganttInstance.current) {
        ganttInstance.current = null
      }
    }
  }, [tasksWithDates, viewMode, onViewTask])

  // Update view mode when it changes
  useEffect(() => {
    if (ganttInstance.current && viewMode) {
      try {
        ganttInstance.current.change_view_mode(viewMode)
      } catch (error) {
        console.error('Error changing view mode:', error)
      }
    }
  }, [viewMode])

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No tasks available for Gantt chart</p>
      </div>
    )
  }

  if (tasksWithDates.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-2">No tasks with dates available</p>
        <p className="text-sm text-muted-foreground">
          Add start/end dates or estimated duration to tasks to view them in the Gantt chart
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* View Mode Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">View:</span>
          <Select value={viewMode} onValueChange={(v: string) => setViewMode(v as typeof viewMode)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quarter Day">Quarter Day</SelectItem>
              <SelectItem value="Half Day">Half Day</SelectItem>
              <SelectItem value="Day">Day</SelectItem>
              <SelectItem value="Week">Week</SelectItem>
              <SelectItem value="Month">Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          Showing {tasksWithDates.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Gantt Chart Container */}
      <Card>
        <CardContent className="p-4 bg-white">
          <div className="w-full overflow-x-auto" style={{ minWidth: '1200px' }}>
            <div
              ref={ganttContainerRef}
              className="gantt-container bg-white"
              style={{ 
                minHeight: '400px', 
                backgroundColor: 'white',
                width: '100%',
                position: 'relative'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-medium">Status:</span>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500"></div>
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-purple-500"></div>
          <span>Scheduled</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-500"></div>
          <span>Planned</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-orange-500"></div>
          <span>On Hold</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500"></div>
          <span>Blocked</span>
        </div>
      </div>
    </div>
  )
}

