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
      console.log('Baseline timeline data:', baseline.timeline_baseline)
      
      // Transform baseline timeline to Gantt tasks
      const tasks: GanttTask[] = []
      
      // Get project start date (from earliest milestone or today)
      const today = new Date().toISOString().split('T')[0]
      let projectStart = today
      
      // Extract milestones from timeline baseline
      const milestones = baseline.timeline_baseline.milestones || baseline.timeline_baseline.key_milestones || []
      console.log('Extracted milestones:', milestones)
      
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
          
          // Assign color based on index for variety
          const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
          const taskColor = colors[idx % colors.length]
          
          tasks.push({
            id: `milestone-${idx}`,
            name: milestoneName,
            start: milestoneDate,
            end: milestoneEnd,
            progress: typeof progress === 'number' ? progress : 0,
            custom_class: progress >= 100 ? 'bar-complete' : progress > 0 ? 'bar-in-progress' : 'bar-pending',
            color: taskColor
          } as any)
          
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
      
      // Check if we have tasks to render
      if (tasks.length === 0) {
        ganttContainerRef.current.innerHTML = '<div class="p-8 text-center text-gray-500">No timeline tasks available</div>'
        return
      }

      console.log('Creating Gantt chart with', tasks.length, 'tasks:', tasks)

      // Always create fresh Gantt instance (prevents duplication issues)
      ganttInstance.current = new Gantt(ganttContainerRef.current, tasks, {
          view_mode: viewMode,
          bar_height: 35,
          bar_corner_radius: 3,
          arrow_curve: 5,
          padding: 18,
          date_format: 'YYYY-MM-DD',
          language: 'en',
        // Force responsive sizing
        header_height: 50,
        column_width: 30,
        step: 24,
        width: '100%',
        height: Math.max(200, tasks.length * 60 + 100), // Dynamic height based on tasks
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
      
      console.log('Gantt chart created successfully')
      
      // Make sure SVG is visible and properly sized
      const svg = ganttContainerRef.current?.querySelector('svg') as SVGSVGElement
      if (svg) {
        // Force SVG to be visible and reasonably sized
        svg.style.backgroundColor = 'white'
        svg.style.display = 'block'
        svg.style.visibility = 'visible'
        svg.style.width = '100%'
        svg.style.maxWidth = '100%'
        svg.setAttribute('width', '100%')
        
        const rect = svg.getBoundingClientRect()
        console.log('SVG dimensions:', {
          width: rect.width,
          height: rect.height,
          viewBox: svg.getAttribute('viewBox')
        })
        
        // Check if bars exist
        const bars = svg.querySelectorAll('.bar')
        const texts = svg.querySelectorAll('text')
        console.log(`SVG content: ${bars.length} bars, ${texts.length} text elements`)
      }
      
      // FORCE BAR COLORS - Apply colors directly to ALL rect elements in bars
      setTimeout(() => {
        const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
        const barWrappers = ganttContainerRef.current?.querySelectorAll('.bar-wrapper')
        
        barWrappers?.forEach((wrapper, idx) => {
          // Find all rect elements in this bar-wrapper
          const rects = wrapper.querySelectorAll('rect')
          rects.forEach((rect) => {
            const color = colors[idx % colors.length]
            // Force color using multiple methods
            rect.setAttribute('fill', color)
            rect.setAttribute('style', `fill: ${color} !important`)
            rect.style.setProperty('fill', color, 'important')
            console.log(`Applied color ${color} to bar ${idx}, rect count: ${rects.length}`)
          })
        })
        
        console.log(`Colored ${barWrappers?.length || 0} bar wrappers`)
      }, 200)
    } catch (error) {
      console.error('Error creating Gantt chart:', error)
      if (ganttContainerRef.current) {
        ganttContainerRef.current.innerHTML = `<div class="p-8 text-center text-red-500">Error rendering timeline: ${error instanceof Error ? error.message : 'Unknown error'}</div>`
      }
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

  // Extract milestones for table view
  const milestones = baseline.timeline_baseline.milestones || baseline.timeline_baseline.key_milestones || []

  return (
    <div className="w-full bg-white dark:bg-slate-900 p-4 rounded-lg border space-y-4">
      {/* Table/Grid View */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800 border-b">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">#</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Milestone</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Target Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-200">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {Array.isArray(milestones) && milestones.length > 0 ? (
              milestones.map((milestone: any, idx: number) => {
                const milestoneName = typeof milestone === 'string' 
                  ? milestone 
                  : (milestone.name || milestone.milestone || milestone.title || `Milestone ${idx + 1}`)
                const milestoneDate = typeof milestone === 'object' 
                  ? (milestone.date || milestone.start_date || milestone.target_date || '-')
                  : '-'
                const progress = typeof milestone === 'object' 
                  ? (milestone.progress || milestone.completion || 0)
                  : 0
                const statusColor = progress >= 100 ? 'bg-green-100 text-green-800' : progress > 0 ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                const statusText = progress >= 100 ? 'Complete' : progress > 0 ? 'In Progress' : 'Pending'
                
                // Color indicator matching gantt bars
                const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-cyan-500']
                const colorClass = colors[idx % colors.length]
                
                return (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-sm ${colorClass}`}></div>
                        {idx + 1}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-slate-100 font-medium">{milestoneName}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{milestoneDate}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                        {statusText}
                      </span>
                    </td>
                  </tr>
                )
              })
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  No milestones available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Visual Timeline (Gantt Chart) */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Visual Timeline</h4>
        
        {/* Simple Timeline View (fallback) */}
        <div className="mb-4 space-y-2">
          {Array.isArray(milestones) && milestones.length > 0 ? (
            milestones.map((milestone: any, idx: number) => {
              const milestoneName = typeof milestone === 'string' 
                ? milestone 
                : (milestone.name || milestone.milestone || milestone.title || `Milestone ${idx + 1}`)
              const milestoneDate = typeof milestone === 'object' 
                ? (milestone.date || milestone.start_date || milestone.target_date || '')
                : ''
              
              const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-red-500', 'bg-cyan-500']
              const colorClass = colors[idx % colors.length]
              
              return (
                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded">
                  <div className={`w-2 h-12 ${colorClass} rounded`}></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{milestoneName}</div>
                    {milestoneDate && (
                      <div className="text-xs text-slate-500">{new Date(milestoneDate).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div className={`px-3 py-1 ${colorClass} text-white text-xs rounded-full`}>
                    {idx + 1}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-slate-500 text-sm">No milestones to display</div>
          )}
        </div>
        
        {/* Gantt Chart (experimental) */}
        <div className="mt-4">
          <h5 className="text-xs font-semibold text-slate-500 mb-2">Interactive Gantt Chart</h5>
      <style jsx global>{`
        .gantt-container {
          font-family: inherit;
          overflow: hidden;
          max-width: 100%;
        }
        .gantt {
          width: 100% !important;
          max-width: 100% !important;
          font-family: inherit;
          overflow: hidden;
        }
        .gantt .grid-row {
          max-width: 100%;
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
        .gantt .bar,
        .gantt .bar-wrapper .bar,
        .gantt-container .bar {
          fill: #3b82f6 !important;
          stroke: #2563eb !important;
          stroke-width: 0;
          rx: 3;
          ry: 3;
        }
        /* Force colors on all bar elements */
        svg .bar {
          fill: #3b82f6 !important;
          stroke: #2563eb !important;
        }
        .gantt .bar-wrapper {
          cursor: pointer;
        }
        .gantt .bar-wrapper:hover .bar {
          opacity: 0.8;
          fill: #2563eb !important;
        }
        .gantt .bar-wrapper:nth-child(odd) .bar {
          fill: #8b5cf6 !important;
          stroke: #7c3aed !important;
        }
        .gantt .bar-wrapper:nth-child(3n) .bar {
          fill: #10b981 !important;
          stroke: #059669 !important;
        }
        .gantt .bar-wrapper:nth-child(4n) .bar {
          fill: #f59e0b !important;
          stroke: #d97706 !important;
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
        <div 
          ref={ganttContainerRef} 
          className="gantt-container" 
          style={{ 
            minHeight: '400px',
            maxHeight: '600px',
            width: '100%',
            overflow: 'auto',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '0.5rem',
            padding: '1rem'
          }}
        ></div>
        </div>
      </div>
    </div>
  )
}

export default BaselineGanttChart

