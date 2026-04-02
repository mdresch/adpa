"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  Brain, 
  Terminal,
  ChevronRight,
  Zap,
  Shield,
  Search,
  Database,
  Layers,
  FileText,
  LineChart,
  GitBranch,
  Settings,
  Share2
} from "lucide-react"
import { io, Socket } from "socket.io-client"
import { getWsUrl } from "@/lib/api-url"
import { cn } from "@/lib/utils"

interface Phase {
  number: number
  name: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  goal: string
  icon: React.ReactNode
}

interface LogEntry {
  timestamp: Date
  type: 'info' | 'thought' | 'action' | 'error' | 'success'
  message: string
}

export function AgentRunMonitor({ runId: initialRunId }: { runId?: string | null }) {
  const [runId, setRunId] = useState<string | null>(initialRunId || null)
  const [activePhase, setActivePhase] = useState(1)
  const [overallStatus, setOverallStatus] = useState<'idle' | 'running' | 'completed' | 'failed'>('idle')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setOverallProgress] = useState(0)
  const socketRef = useRef<Socket | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const [phases, setPhases] = useState<Phase[]>([
    { number: 1, name: "Project Discovery", status: 'pending', icon: <Search className="h-4 w-4" />, goal: "Knowledge base ingestion" },
    { number: 2, name: "Stakeholder Analysis", status: 'pending', icon: <Share2 className="h-4 w-4" />, goal: "Communication planning" },
    { number: 3, name: "Scope & Requirements", status: 'pending', icon: <FileText className="h-4 w-4" />, goal: "Defining baselines" },
    { number: 4, name: "Risk Assessment", status: 'pending', icon: <Shield className="h-4 w-4" />, goal: "Probability & impact scoring" },
    { number: 5, name: "Work Breakdown", status: 'pending', icon: <Layers className="h-4 w-4" />, goal: "WBS Decomposition" },
    { number: 6, name: "Timeline Planning", status: 'pending', icon: <Clock className="h-4 w-4" />, goal: "Schedule production" },
    { number: 7, name: "Integration & Sync", status: 'pending', icon: <GitBranch className="h-4 w-4" />, goal: "Jira/GitHub synchronization" },
    { number: 8, name: "Quality & Governance", status: 'pending', icon: <CheckCircle2 className="h-4 w-4" />, goal: "Compliance checkpoints" },
    { number: 9, name: "Execution Setup", status: 'pending', icon: <Activity className="h-4 w-4" />, goal: "Drift monitor configuration" },
    { number: 10, name: "Synthesis", status: 'pending', icon: <Zap className="h-4 w-4" />, goal: "Final project health report" },
  ])

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  useEffect(() => {
    if (!runId) return

    const WS_URL = getWsUrl()
    const socket = io(`${WS_URL}/agents`, {
      transports: ['websocket'],
      reconnectionAttempts: 5
    })

    socketRef.current = socket

    socket.on('connect', () => {
      addLog('info', 'Connected to Agent Orchestration Bus')
      socket.emit('subscribeToRun', runId)
    })

    socket.on('run_start', () => {
      setOverallStatus('running')
      addLog('success', 'Starting 10-Phase Project Orchestration')
    })

    socket.on('phase_start', (data: any) => {
      const phaseNum = data.number || data.phase_number
      setActivePhase(phaseNum)
      setOverallProgress((phaseNum - 1) * 10)
      
      setPhases(prev => prev.map(p => 
        p.number === phaseNum ? { ...p, status: 'running' } : 
        p.number < phaseNum ? { ...p, status: 'completed' } : p
      ))
      
      addLog('info', `Entering Phase ${phaseNum}: ${data.name}`)
    })

    socket.on('agent_thought', (data: any) => {
      addLog('thought', data.thought || data.message)
    })

    socket.on('agent_action', (data: any) => {
      addLog('action', `Executing: ${data.tool || data.action}`)
    })

    socket.on('phase_end', (data: any) => {
      const phaseNum = activePhase
      setPhases(prev => prev.map(p => 
        p.number === phaseNum ? { ...p, status: data.status } : p
      ))
      if (data.status === 'completed') {
        setOverallProgress(phaseNum * 10)
      }
    })

    socket.on('run_end', (data: any) => {
      setOverallStatus(data.status)
      setOverallProgress(data.status === 'completed' ? 100 : overallProgress)
      addLog(data.status === 'completed' ? 'success' : 'error', 
        data.status === 'completed' ? 'Orchestration Completed Successfully' : `Run Failed: ${data.error}`)
    })

    return () => {
      socket.disconnect()
    }
  }, [runId])

  const addLog = (type: LogEntry['type'], message: string) => {
    setLogs(prev => [...prev, { timestamp: new Date(), type, message }])
  }

  const getStatusIcon = (status: Phase['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-500" />
      case 'running': return <Loader2 className="h-4 w-4 text-primary animate-spin" />
      case 'failed': return <AlertCircle className="h-4 w-4 text-destructive" />
      default: return <Clock className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Sidebar: Phase List */}
      <Card className="xl:col-span-1 border-none shadow-lg bg-background/40 backdrop-blur-md">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Orchestration Phases</CardTitle>
            {overallStatus === 'running' && (
              <Badge variant="outline" className="animate-pulse bg-primary/5 text-primary border-primary/20">
                Live
              </Badge>
            )}
          </div>
          <CardDescription>10-phase PMBOK aligned execution</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="px-4 py-4 space-y-1">
            {phases.map((phase) => (
              <div 
                key={phase.number} 
                className={cn(
                  "flex items-center space-x-3 p-3 rounded-lg transition-all border border-transparent",
                  phase.status === 'running' && "bg-primary/5 border-primary/10 shadow-sm",
                  phase.status === 'completed' && "opacity-80"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shrink-0",
                  phase.status === 'completed' ? "bg-green-500/10 text-green-600" :
                  phase.status === 'running' ? "bg-primary text-primary-foreground shadow-md" :
                  "bg-muted text-muted-foreground"
                )}>
                  {phase.status === 'completed' ? <CheckCircle2 className="h-5 w-5" /> : phase.number}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "text-sm font-semibold truncate",
                      phase.status === 'running' ? "text-primary" : "text-foreground"
                    )}>
                      {phase.name}
                    </p>
                    {getStatusIcon(phase.status)}
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{phase.goal}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content: Logs & Progress */}
      <div className="xl:col-span-2 space-y-6">
        {/* Progress Card */}
        <Card className="border-none shadow-lg bg-background/40 backdrop-blur-md">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-bold flex items-center">
                    <Brain className="h-5 w-5 mr-2 text-primary" />
                    Overall Orchestration Progress
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Current Task: <span className="text-foreground font-medium">{phases[activePhase - 1].name}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-primary">{progress}%</span>
                </div>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Live Feed */}
        <Card className="flex-1 border-none shadow-xl bg-slate-950 text-slate-100 overflow-hidden min-h-[500px] flex flex-col">
          <CardHeader className="border-b border-slate-800 bg-slate-900/50 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="h-4 w-4 text-blue-400" />
                <CardTitle className="text-sm font-mono tracking-tight uppercase">Agent Thought Stream</CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Bus Active</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 relative">
            <ScrollArea className="h-[450px] p-4 font-mono text-xs" ref={scrollRef}>
              <div className="space-y-3">
                {logs.length === 0 && (
                  <div className="h-[400px] flex flex-col items-center justify-center space-y-4 opacity-20">
                    <Activity className="h-12 w-12 animate-pulse" />
                    <p>Awaiting events from Orchestration Bus...</p>
                  </div>
                )}
                {logs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex space-x-3 p-2 rounded border-l-2 transition-colors",
                    log.type === 'thought' ? "border-blue-500 bg-blue-500/5" :
                    log.type === 'action' ? "border-amber-500 bg-amber-500/5" :
                    log.type === 'success' ? "border-green-500 bg-green-500/5" :
                    log.type === 'error' ? "border-red-500 bg-red-500/5" :
                    "border-slate-700 bg-slate-800/20"
                  )}>
                    <span className="text-slate-500 shrink-0">[{log.timestamp.toLocaleTimeString([], { hour12: false })}]</span>
                    <span className={cn(
                      "font-bold uppercase text-[10px] shrink-0 w-16",
                      log.type === 'thought' ? "text-blue-400" :
                      log.type === 'action' ? "text-amber-400" :
                      log.type === 'success' ? "text-green-400" :
                      log.type === 'error' ? "text-red-400" :
                      "text-slate-400"
                    )}>
                      {log.type}
                    </span>
                    <span className="leading-relaxed whitespace-pre-wrap">{log.message}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
