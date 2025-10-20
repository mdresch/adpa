'use client'

import { useEffect, useRef } from 'react'
import Gantt from 'frappe-gantt'

interface GanttTask {
  id: string
  name: string
  start: string
  end: string
  progress: number
  dependencies?: string
  custom_class?: string
}

interface BaselineGanttChartProps {
  baseline: any
  viewMode?: 'Quarter Day' | 'Half Day' | 'Day' | 'Week' | 'Month'
}

export function BaselineGanttChart({ baseline, viewMode = 'Month' }: BaselineGanttChartProps) {
  const ganttContainerRef = useRef<HTMLDivElement>(null)
  const ganttInstance = useRef<any>(null)

  useEffect(() => {
    if (!ganttContainerRef.current || !baseline?.timeline_baseline) return

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
      // Transform baseline timeline to Gantt tasks
      const tasks: GanttTask[] = []
      
      // Get project start date (from earliest milestone or today)
      const today = new Date().toISOString().split('T')[0]
      let projectStart = today
      
      // Extract milestones from timeline baseline
      const milestones = baseline.timeline_baseline.milestones || baseline.timeline_baseline.key_milestones || []
      
      if (Array.isArray(milestones) && milestones.length > 0) {
        milestones.forEach((milestone: any, idx: number) => {
          // Handle different milestone formats
          let milestoneName = ''
          let milestoneDate = ''
          let milestoneEnd = ''
          let progress = 0
          
          if (typeof milestone === 'string') {
            // Simple string format: "Complete Immediate Actions"
            milestoneName = milestone
            // Estimate dates based on index (each milestone ~1 month apart)
            const startDate = new Date()
            startDate.setMonth(startDate.getMonth() + idx)
            milestoneDate = startDate.toISOString().split('T')[0]
            
            const endDate = new Date(startDate)
            endDate.setMonth(endDate.getMonth() + 1)
            milestoneEnd = endDate.toISOString().split('T')[0]
          } else if (typeof milestone === 'object') {
            // Object format with date, name, etc.
            milestoneName = milestone.name || milestone.milestone || milestone.title || `Milestone ${idx + 1}`
            milestoneDate = milestone.date || milestone.start_date || milestone.target_date || today
            milestoneEnd = milestone.end_date || milestone.date || today
            progress = milestone.progress || milestone.completion || 0
          }
          
          // Ensure end date is after start date
          if (new Date(milestoneEnd) <= new Date(milestoneDate)) {
            const end = new Date(milestoneDate)
            end.setDate(end.getDate() + 30) // Default 30-day duration
            milestoneEnd = end.toISOString().split('T')[0]
          }
          
          tasks.push({
            id: `milestone-${idx}`,
            name: milestoneName,
            start: milestoneDate,
            end: milestoneEnd,
            progress: typeof progress === 'number' ? progress : 0,
            custom_class: progress >= 100 ? 'bar-complete' : progress > 0 ? 'bar-in-progress' : 'bar-pending'
          })
          
          // Update project start if earlier
          if (new Date(milestoneDate) < new Date(projectStart)) {
            projectStart = milestoneDate
          }
        })
      }
      
      // If no milestones, create phases from duration
      if (tasks.length === 0) {
        const duration = baseline.timeline_baseline.duration_months || 
                        baseline.timeline_baseline.duration || 
                        6 // Default 6 months
        
        const phases = [
          { name: 'Phase 1: Foundation', percentage: 0.33 },
          { name: 'Phase 2: Development', percentage: 0.33 },
          { name: 'Phase 3: Deployment', percentage: 0.34 }
        ]
        
        let currentStart = new Date()
        phases.forEach((phase, idx) => {
          const phaseDuration = Math.ceil(duration * phase.percentage)
          const start = new Date(currentStart)
          const end = new Date(currentStart)
          end.setMonth(end.getMonth() + phaseDuration)
          
          tasks.push({
            id: `phase-${idx}`,
            name: phase.name,
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
            progress: 0,
            dependencies: idx > 0 ? `phase-${idx - 1}` : undefined
          })
          
          currentStart = end
        })
      }
      
      // Add dependencies between sequential milestones
      if (tasks.length > 1) {
        for (let i = 1; i < tasks.length; i++) {
          if (!tasks[i].dependencies) {
            tasks[i].dependencies = tasks[i - 1].id
          }
        }
      }
      
      // Always create fresh Gantt instance (prevents duplication issues)
      ganttInstance.current = new Gantt(ganttContainerRef.current, tasks, {
          view_mode: viewMode,
          bar_height: 35,
          bar_corner_radius: 3,
          arrow_curve: 5,
          padding: 18,
          date_format: 'YYYY-MM-DD',
          language: 'en',
          custom_popup_html: function(task: any) {
          const duration = Math.ceil((new Date(task._end).getTime() - new Date(task._start).getTime()) / (1000 * 60 * 60 * 24))
            return `
              <div class="p-3">
                <h5 class="font-semibold mb-2">${task.name}</h5>
                <p class="text-sm text-gray-600">
                  Start: ${new Date(task._start).toLocaleDateString()}<br/>
                  End: ${new Date(task._end).toLocaleDateString()}<br/>
                Duration: ${duration} days<br/>
                  Progress: ${task.progress}%
                </p>
              </div>
            `
          }
        })
    } catch (error) {
      console.error('Error creating Gantt chart:', error)
    }

    // Cleanup
    return () => {
      ganttInstance.current = null
    }
  }, [baseline, viewMode])

  if (!baseline?.timeline_baseline) {
    return (
      <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
        <p>No timeline data available for Gantt chart</p>
        <p className="text-sm mt-2">Timeline baseline must be extracted first</p>
      </div>
    )
  }

  return (
    <div className="w-full overflow-x-auto bg-white dark:bg-slate-900 p-4 rounded-lg border">
      <style jsx global>{`
        .gantt-container {
          font-family: inherit;
          overflow: visible;
        }
        .gantt {
          width: 100%;
          font-family: inherit;
        }
        .gantt .grid-header {
          fill: #f8fafc;
          stroke: #e2e8f0;
          stroke-width: 1;
        }
        .gantt .grid-row {
          fill: #ffffff;
        }
        .gantt .grid-row:nth-child(even) {
          fill: #f8fafc;
        }
        .gantt .row-line {
          stroke: #e2e8f0;
        }
        .gantt .tick {
          stroke: #cbd5e1;
          stroke-width: 0.5;
        }
        .gantt .tick.thick {
          stroke: #94a3b8;
          stroke-width: 1;
        }
        .gantt .today-highlight {
          fill: #eff6ff;
          opacity: 0.5;
        }
        .gantt .bar-complete {
          fill: #10b981;
        }
        .gantt .bar-in-progress {
          fill: #3b82f6;
        }
        .gantt .bar-pending {
          fill: #94a3b8;
        }
        .gantt .bar-wrapper {
          cursor: pointer;
        }
        .gantt .bar-wrapper:hover .bar {
          opacity: 0.8;
        }
        .gantt .bar-progress {
          fill: #059669;
        }
        .gantt .bar-label {
          fill: #ffffff;
          font-size: 12px;
          font-weight: 500;
        }
        .gantt .lower-text, .gantt .upper-text {
          fill: #475569;
          font-size: 11px;
        }
        .gantt .arrow {
          stroke: #94a3b8;
          stroke-width: 1.5;
          fill: none;
        }
        .gantt-container .popup-wrapper {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          padding: 0;
          font-size: 0.875rem;
          z-index: 999;
        }
        .gantt .date-highlight {
          fill: #fef3c7;
          stroke: #f59e0b;
        }
      `}</style>
      <div ref={ganttContainerRef} className="gantt-container" style={{ minHeight: '400px' }}></div>
    </div>
  )
}

export default BaselineGanttChart

