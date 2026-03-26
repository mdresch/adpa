"use client"

import React, { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { 
  Activity, 
  Mail, 
  AlertTriangle, 
  Play, 
  CheckCircle, 
  Clock 
} from 'lucide-react'

interface VisualTraceProps {
  data: {
    logs: any[]
    email_notifications: any[]
    notifications: any[]
    extraction_failures: any[]
  }
  correlationId: string
}

const nodeStyles = {
  request: "bg-blue-500/20 border-blue-500/50 text-blue-200",
  log: "bg-slate-800/80 border-slate-700 text-slate-300",
  notification: "bg-emerald-500/20 border-emerald-500/50 text-emerald-200",
  failure: "bg-red-500/20 border-red-500/50 text-red-200",
}

export function VisualTrace({ data, correlationId }: VisualTraceProps) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = []
    const edges: Edge[] = []

    // 1. Root Node: Request Start
    nodes.push({
      id: 'root',
      type: 'input',
      data: { 
        label: (
          <div className="flex items-center gap-2 p-2">
            <Play className="h-4 w-4 text-blue-400" />
            <div>
              <div className="font-bold text-xs uppercase tracking-wider">Request Initialized</div>
              <div className="text-[10px] opacity-70 font-mono">{correlationId.slice(0, 8)}...</div>
            </div>
          </div>
        )
      },
      position: { x: 250, y: 0 },
      className: `w-64 rounded-xl border-2 shadow-2xl backdrop-blur-md ${nodeStyles.request}`,
    })

    let lastId = 'root'
    let currentY = 100

    // 2. Logs nodes (Grouped or specific key logs)
    const sortedLogs = [...data.logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    if (sortedLogs.length > 0) {
      // Pick important milestones or just the first/last if too many
      const displayLogs = sortedLogs.length > 5 
        ? [sortedLogs[0], { message: `... ${sortedLogs.length - 2} more steps ...`, timestamp: sortedLogs[1].timestamp, isSummary: true }, sortedLogs[sortedLogs.length - 1]]
        : sortedLogs

      displayLogs.forEach((log, index) => {
        const id = `log-${index}`
        nodes.push({
          id,
          data: { 
            label: (
              <div className="flex items-center gap-2 p-2">
                <Activity className="h-4 w-4 text-slate-400" />
                <div className="truncate">
                  <div className="font-medium text-[11px] truncate">{log.message || log.msg}</div>
                  <div className="text-[9px] opacity-60 font-mono">
                    {new Date(log.timestamp || log.time).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            )
          },
          position: { x: 250, y: currentY },
          className: `w-64 rounded-lg border shadow-lg backdrop-blur-sm ${nodeStyles.log}`,
        })

        edges.push({
          id: `e-log-${index}`,
          source: lastId,
          target: id,
          animated: true,
          style: { stroke: '#475569' },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
        })

        lastId = id
        currentY += 80
      })
    }

    // 3. Notifications (Level 3 - Side branches)
    data.notifications.concat(data.email_notifications).forEach((notif, index) => {
      const id = `notif-${index}`
      nodes.push({
        id,
        data: { 
          label: (
            <div className="flex items-center gap-2 p-2">
              <Mail className="h-4 w-4 text-emerald-400" />
              <div className="truncate">
                <div className="font-bold text-xs uppercase tracking-wider">Notification Sent</div>
                <div className="text-[10px] truncate opacity-70">{notif.subject || notif.type}</div>
              </div>
            </div>
          )
        },
        position: { x: 550, y: currentY - 40 },
        className: `w-56 rounded-xl border-2 shadow-xl backdrop-blur-md ${nodeStyles.notification}`,
      })

      edges.push({
        id: `e-notif-${index}`,
        source: lastId,
        target: id,
        animated: true,
        style: { stroke: '#10b981' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#10b981' },
      })
    })

    // 4. Failures (Side branches)
    data.extraction_failures.forEach((fail, index) => {
      const id = `fail-${index}`
      nodes.push({
        id,
        data: { 
          label: (
            <div className="flex items-center gap-2 p-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <div className="truncate">
                <div className="font-bold text-xs uppercase tracking-wider">Exception Encountered</div>
                <div className="text-[10px] truncate opacity-70">{fail.error_message}</div>
              </div>
            </div>
          )
        },
        position: { x: -50, y: currentY - 40 },
        className: `w-56 rounded-xl border-2 shadow-xl backdrop-blur-md ${nodeStyles.failure}`,
      })

      edges.push({
        id: `e-fail-${index}`,
        source: lastId,
        target: id,
        animated: true,
        style: { stroke: '#ef4444' },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
      })
    })

    return { nodes, edges }
  }, [data, correlationId])

  return (
    <div style={{ height: '500px', width: '100%', position: 'relative' }} className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
      >
        <Background color="#334155" variant="dots" gap={20} size={1} />
        <Controls showInteractive={false} className="bg-slate-800 border-slate-700 fill-slate-200" />
        <MiniMap 
          nodeColor={(node) => {
            if (node.id === 'root') return '#3b82f6'
            if (node.id.startsWith('log')) return '#475569'
            if (node.id.startsWith('notif')) return '#10b981'
            if (node.id.startsWith('fail')) return '#ef4444'
            return '#fff'
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
          className="bg-slate-800 border-slate-700 rounded-lg"
        />
        <Panel position="top-right" className="bg-slate-800/80 p-2 rounded-lg border border-slate-700 backdrop-blur-sm text-xs text-slate-300">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-emerald-400" /> Trace Complete</span>
            <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-slate-400" /> {new Date().toLocaleTimeString()}</span>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  )
}
