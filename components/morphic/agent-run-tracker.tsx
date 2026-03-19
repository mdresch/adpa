'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, Circle, Loader2 } from 'lucide-react'
import { io, Socket } from 'socket.io-client'

interface AgentPhase {
    id: string
    phaseType: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    output?: any
    error?: string
    startedAt?: string
    completedAt?: string
}

interface AgentRunTrackerProps {
    runId: string
    projectId: string
    goal: string
    initialStatus: string
}

export function AgentRunTracker({ runId, projectId, goal, initialStatus }: AgentRunTrackerProps) {
    const [status, setStatus] = useState(initialStatus)
    const [phases, setPhases] = useState<AgentPhase[]>([])
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        let socket: Socket | null = null;
        
        async function setupSocket() {
             // We configure socket.io purely relative to window location unless env vars say otherwise
             const socketUrl = process.env.NEXT_PUBLIC_API_URL || '';
             
             socket = io(socketUrl, {
                 path: '/socket.io/',
                 transports: ['websocket', 'polling'], // Allow fallback to polling
             });

             socket.on('connect', () => {
                 console.log(`[AgentRunTracker] Connected to socket for run ${runId}`)
                 socket?.emit('join_run', runId)
             })

             socket.on('run_status', (data: { runId: string, status: string }) => {
                 if (data.runId === runId) setStatus(data.status)
             })

             socket.on('phase_started', (data: { runId: string, phase: any }) => {
                 if (data.runId === runId) {
                     setPhases(prev => {
                         const existing = [...prev]
                         const index = existing.findIndex(p => p.id === data.phase.id)
                         if (index >= 0) existing[index] = data.phase
                         else existing.push(data.phase)
                         return existing
                     })
                     updateProgress(phases)
                 }
             })

             socket.on('phase_completed', (data: { runId: string, phase: any }) => {
                 if (data.runId === runId) {
                     setPhases(prev => {
                         const existing = [...prev]
                         const index = existing.findIndex(p => p.id === data.phase.id)
                         if (index >= 0) existing[index] = data.phase
                         else existing.push(data.phase)
                         return existing
                     })
                     updateProgress(phases)
                 }
             })

             socket.on('phase_failed', (data: { runId: string, phase: any }) => {
                 if (data.runId === runId) {
                     setPhases(prev => {
                         const existing = [...prev]
                         const index = existing.findIndex(p => p.id === data.phase.id)
                         if (index >= 0) existing[index] = data.phase
                         else existing.push(data.phase)
                         return existing
                     })
                     updateProgress(phases)
                 }
             })
             
             socket.on('run_completed', (data: { runId: string, status: string }) => {
                  if (data.runId === runId) setStatus('completed')
             })
             
             socket.on('run_failed', (data: { runId: string, error: string }) => {
                  if (data.runId === runId) setStatus('failed')
             })

             // Load initial details from API
             try {
                const res = await fetch(`/api/agents/run/${runId}`)
                if (res.ok) {
                    const data = await res.json()
                    setStatus(data.status)
                    if (data.phases) {
                        setPhases(data.phases)
                        updateProgress(data.phases)
                    }
                }
             } catch(err) {
                console.error('Failed to load initial run data:', err)
             }
        }

        setupSocket()

        return () => {
            if (socket) {
                socket.off('connect');
                socket.off('run_status');
                socket.off('phase_started');
                socket.off('phase_completed');
                socket.off('phase_failed');
                socket.off('run_completed');
                socket.off('run_failed');
                socket.disconnect();
            }
        }
    }, [runId])

    const updateProgress = (currentPhases: AgentPhase[]) => {
        if (!currentPhases.length) {
            setProgress(0)
            return
        }
        const completed = currentPhases.filter(p => p.status === 'completed' || p.status === 'failed').length
        setProgress(Math.round((completed / 10) * 100)) // Assuming 10 phases
    }

    const getStatusBadge = () => {
        switch (status) {
            case 'completed': return <Badge variant="default" className="bg-green-500">Completed</Badge>
            case 'failed': return <Badge variant="destructive">Failed</Badge>
            case 'in_progress': 
            case 'active':
                return <Badge variant="secondary" className="animate-pulse">Active</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    return (
        <Card className="w-full my-4 border-2">
            <CardHeader className="pb-3 border-b bg-muted/20">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">
                        {status === 'in_progress' || status === 'active' ? (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : null}
                        Project Agent Run
                    </CardTitle>
                    {getStatusBadge()}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                    Goal: <strong>{goal}</strong>
                </div>
                <div className="text-xs text-muted-foreground">
                    Project ID: {projectId}
                </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
                <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                        <span>Overall Progress</span>
                        <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>

                {phases.length > 0 && (
                    <div className="space-y-2 mt-4 bg-muted/30 p-3 rounded-lg border text-sm max-h-[300px] overflow-y-auto">
                        <h4 className="font-semibold mb-2">Phases:</h4>
                        {phases.map(phase => (
                            <div key={phase.id} className="flex items-center gap-2">
                                {phase.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                                ) : phase.status === 'in_progress' ? (
                                    <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />
                                ) : phase.status === 'failed' ? (
                                    <Circle className="w-4 h-4 text-red-500 shrink-0" />
                                ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span className={
                                    phase.status === 'completed' ? 'text-muted-foreground line-through' :
                                    phase.status === 'in_progress' ? 'font-medium' :
                                    phase.status === 'failed' ? 'text-red-500' :
                                    'text-muted-foreground'
                                }>
                                    {phase.phaseType.replace(/_/g, ' ')}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
