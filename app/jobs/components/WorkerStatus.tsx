"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"
import { Progress } from "@/components/ui/progress"
import { Server, Cpu, MemoryStickIcon as Memory, RefreshCw, Activity, Clock } from "lucide-react"
import { apiClient } from "@/lib/api"
import { AnimatedGridItem } from "@/components/animated-layout"

interface WorkerInfo {
  id: string
  name: string
  processId: number
  status: string
  queue: string
  currentJob: string | null
  uptime: string
  uptimeSeconds: number
  jobsCompleted: number
  jobsFailed: number
  successRate: number
  cpu: number
  memory: number
  health: string
  currentTasks?: Array<{
    jobId: string
    progress: number
    type: string
  }>
  lastSeen?: string
}

export function WorkerStatus() {
  const [workers, setWorkers] = useState<WorkerInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    fetchWorkerStatus()
    const interval = setInterval(() => {
      fetchWorkerStatus()
    }, 3000) // Refresh every 3 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchWorkerStatus() {
    try {
      const data = await apiClient.getWorkerStats()
      setWorkers(data.workers)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch worker stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading worker statistics...</p>
      </div>
    )
  }

  // Group workers by queue
  const workersByQueue = workers.reduce((acc, worker) => {
    if (!acc[worker.queue]) acc[worker.queue] = []
    acc[worker.queue].push(worker)
    return acc
  }, {} as Record<string, WorkerInfo[]>)

  return (
    <div className="space-y-6">
      {/* Last Updated Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Server className="h-4 w-4 animate-pulse text-purple-500" />
          <span>Live worker monitoring - Auto-refresh every 3 seconds</span>
        </div>
        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
      </div>

      {/* Worker Cards by Queue */}
      {Object.entries(workersByQueue).map(([queueName, queueWorkers]) => (
        <AnimatedGridItem key={queueName} className="animate-fade-in-up">
          <Card className="glass border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg capitalize flex items-center gap-2">
                <Server className="h-5 w-5 text-purple-500" />
                {queueName.replace(/-/g, ' ')} Workers ({queueWorkers.length} total)
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Worker ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Current Job</TableHead>
                      <TableHead>Uptime</TableHead>
                      <TableHead>Jobs</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead>Resources</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {queueWorkers.map(worker => (
                      <TableRow key={worker.id}>
                        <TableCell>
                          <code className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                            {worker.id.substring(0, 25)}...
                          </code>
                          {worker.processId && (
                            <div className="text-xs text-muted-foreground mt-1">
                              PID: {worker.processId}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={worker.status === 'active' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {worker.status === 'active' ? '🟢' : '⚪'} {worker.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {worker.currentJob || (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{worker.uptime}</TableCell>
                        <TableCell>
                          <div className="text-xs">
                            <span className="text-green-600 font-medium">{worker.jobsCompleted}</span>
                            {worker.jobsFailed > 0 && (
                              <span className="text-red-600 ml-1">/ {worker.jobsFailed} failed</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              worker.successRate >= 90 ? 'default' : 
                              worker.successRate >= 70 ? 'secondary' : 
                              'destructive'
                            }
                            className="text-xs"
                          >
                            {worker.successRate}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-xs">
                            <div className="flex items-center gap-1" title={`CPU: ${worker.cpu}%`}>
                              <Cpu className="h-3 w-3 text-blue-500" />
                              <span>{worker.cpu}%</span>
                            </div>
                            <div className="flex items-center gap-1" title={`Memory: ${worker.memory}%`}>
                              <Memory className="h-3 w-3 text-purple-500" />
                              <span>{worker.memory}%</span>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Current Tasks Section for Active Workers */}
              {queueWorkers.some(w => w.currentTasks && w.currentTasks.length > 0) && (
                <div className="mt-6 space-y-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                    Active Tasks
                  </h4>
                  {queueWorkers
                    .filter(w => w.currentTasks && w.currentTasks.length > 0)
                    .map(worker => (
                      <div key={worker.id} className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          Worker: {worker.id.substring(0, 30)}...
                        </p>
                        {worker.currentTasks!.map((task, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-sm">{task.type}</span>
                              {task.progress > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {task.progress}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Job ID: <code className="text-xs bg-slate-200 dark:bg-slate-800 px-1 rounded">{task.jobId.substring(0, 13)}...</code>
                            </p>
                            {task.progress > 0 && (
                              <Progress value={task.progress} className="h-1.5 mt-2" />
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AnimatedGridItem>
      ))}
      </div>

      {/* Empty State */}
      {workers.length === 0 && (
        <Card className="glass border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Server className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Workers</h3>
            <p className="text-muted-foreground">Workers will appear here when jobs are being processed</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

