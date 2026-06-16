"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { Skeleton } from "@/components/ui/skeleton"

// Extend AnimatedGridItem to accept animationDelay prop
type AnimatedGridItemProps = React.ComponentProps<typeof AnimatedGridItem> & {
  animationDelay?: number
}

// Override AnimatedGridItem to support animationDelay
const AnimatedGridItemWithDelay: React.FC<AnimatedGridItemProps> = ({ animationDelay, ...props }) => (
  <AnimatedGridItem
    {...props}
    className={`${props.className ?? ""}`}
    // Pass animationDelay as a custom CSS variable for child animations if needed
    data-animation-delay={animationDelay ? animationDelay : undefined}
  />
)
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { QueueDashboard } from "./components/QueueDashboard"
import { WorkerStatus } from "./components/WorkerStatus"
import {
  Play,
  Pause,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  Activity,
  Server,
  Cpu,
  MemoryStickIcon as Memory,
  Wifi,
  WifiOff,
  Eye,
  FileText,
  AlertCircle,
  Trash,
  Copy,
  Zap,
  ShieldAlert,
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket, useJobUpdates } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"

// Extend Job type to include 'name' property for compatibility with API jobs
type Job = {
  id: string
  name: string
  type: string
  status: string
  progress: number
  startTime?: string
  estimatedCompletion?: string
  completedTime?: string
  failedTime?: string
  queuedTime?: string
  priority: string
  queue: string
  worker?: string
  logs: string[]
  error?: string
  error_message?: string // Alternative error field from different API endpoints
  projectName?: string
  documentName?: string
  metadata?: any
  childJobs?: any[]
}
import { toast } from '@/lib/notify'

const getStatusIcon = (status: string) => {
  switch (status) {
    case "running":
    case "processing":
      return <Play className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "failed":
      return <XCircle className="h-4 w-4" />
    case "cancelled":
      return <XCircle className="h-4 w-4" />
    case "queued":
    case "pending":
      return <Clock className="h-4 w-4" />
    case "paused":
      return <Pause className="h-4 w-4" />
    default:
      return <Clock className="h-4 w-4" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "running":
    case "processing":
      return "bg-blue-500/10 text-blue-600 border-blue-200"
    case "completed":
      return "bg-green-500/10 text-green-600 border-green-200"
    case "failed":
      return "bg-red-500/10 text-red-600 border-red-200"
    case "cancelled":
      return "bg-orange-500/10 text-orange-600 border-orange-200"
    case "queued":
    case "pending":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
    case "paused":
      return "bg-gray-500/10 text-gray-600 border-gray-200"
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-200"
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high":
      return "bg-red-500/10 text-red-600 border-red-200"
    case "medium":
      return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
    case "low":
      return "bg-green-500/10 text-green-600 border-green-200"
    default:
      return "bg-gray-500/10 text-gray-600 border-gray-200"
  }
}

export default function JobMonitorPage() {
  const searchParams = useSearchParams()
  const { user, hasPermission, loading: authLoading, isAuthenticated } = useAuth()
  const { isConnected } = useWebSocket()
  const jobUpdates = useJobUpdates()

  const [searchTerm, setSearchTerm] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [selectedJob, setSelectedJob] = React.useState<string | null>(null)
  const [selectedWorker, setSelectedWorker] = React.useState<string | null>(null)
  const [viewingLogs, setViewingLogs] = React.useState<string | null>(null)
  const [jobs, setJobs] = React.useState<Job[]>([])
  const [queues, setQueues] = React.useState<any[]>([])
  const [workers, setWorkers] = React.useState<any[]>([])
  const [metrics, setMetrics] = React.useState<any>({})
  const [loading, setLoading] = React.useState(true)
  const [jobsLoadError, setJobsLoadError] = React.useState<string | null>(null)
  const [loadingQueues, setLoadingQueues] = React.useState(true)
  const [loadingWorkers, setLoadingWorkers] = React.useState(true)
  const [loadingLlmInsightsJobId, setLoadingLlmInsightsJobId] = React.useState<string | null>(null)
  const didScrollToQueryJobRef = React.useRef(false)

  // ── EMERGENCY KILL SWITCH ──────────────────────────────────────────────────
  const [killStatus, setKillStatus] = React.useState<{ totalActiveJobs: number; blankDocuments: number; dangerLevel: string } | null>(null)
  const [killLoading, setKillLoading] = React.useState(false)

  // Poll kill-switch status every 10 seconds (admin only)
  React.useEffect(() => {
    if (authLoading || !isAuthenticated) return
    const canAdmin = (user?.role?.toLowerCase() === 'admin' || user?.role?.toLowerCase() === 'super_admin' || hasPermission('jobs.admin'))
    if (!canAdmin) return

    const poll = async () => {
      try {
        const status = await apiClient.request<any>('/jobs/emergency-stop/status', { suppressNotFoundError: true } as any)
        setKillStatus(status)
      } catch { /* not admin or backend down — ignore */ }
    }
    void poll()
    const interval = setInterval(poll, 10000)
    return () => clearInterval(interval)
  }, [authLoading, isAuthenticated, user?.role, hasPermission])

  const handleEmergencyStop = React.useCallback(async () => {
    const activeCount = killStatus?.totalActiveJobs ?? 0
    const blankCount = killStatus?.blankDocuments ?? 0
    const confirmed = window.confirm(
      `⚠️ EMERGENCY STOP\n\nThis will immediately cancel ALL ${activeCount} active/stuck jobs and permanently delete ${blankCount} blank document(s) created in the last 24 hours.\n\nThis cannot be undone. Continue?`
    )
    if (!confirmed) return

    setKillLoading(true)
    try {
      const result = await apiClient.request<any>('/jobs/emergency-stop', { method: 'POST' })
      toast.success(`🛑 Emergency stop complete — ${result.killedJobs ?? 0} jobs killed, ${result.deletedBlankDocuments ?? 0} blank docs removed`)
      setKillStatus(null)
      void fetchJobs({ silent: true })
    } catch (error: any) {
      toast.error(`Emergency stop failed: ${error?.message ?? 'Unknown error'}`)
    } finally {
      setKillLoading(false)
    }
  }, [killStatus])

  const loadLlmInsightsIfNeeded = React.useCallback(async (jobId: string) => {
    let alreadyLoaded = false
    setJobs((prev) => {
      const current = prev.find((j) => j.id === jobId)
      if (Array.isArray((current as any)?.metadata?.llmInsights?.requests)) {
        alreadyLoaded = true
      }
      return prev
    })
    if (alreadyLoaded) return

    setLoadingLlmInsightsJobId(jobId)
    try {
      const detail = await apiClient.getJob(jobId)
      const llmInsights = (detail as any).metadata?.llmInsights
      if (!llmInsights) return
      setJobs((prev) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, metadata: { ...(j.metadata || {}), llmInsights } }
            : j
        )
      )
    } catch (error) {
      console.error("Failed to load job LLM insights:", error)
      toast.error("Failed to load LLM payload snapshots")
    } finally {
      setLoadingLlmInsightsJobId((id) => (id === jobId ? null : id))
    }
  }, [])

  const copyToClipboard = React.useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied`)
    } catch (error) {
      console.error("Failed to copy text:", error)
      toast.error("Failed to copy prompt")
    }
  }, [])

  const canViewAllJobs = React.useMemo(() => {
    const userRole = user?.role?.toLowerCase()
    const isAdminOrSuperAdmin = userRole === "admin" || userRole === "super_admin"
    return isAdminOrSuperAdmin || hasPermission("jobs.admin")
  }, [user?.role, hasPermission])

  const fetchJobs = React.useCallback(async (options?: { silent?: boolean }) => {
    if (authLoading) return

    if (!isAuthenticated) {
      setJobs([])
      setJobsLoadError(null)
      setLoading(false)
      return
    }

    try {
      setJobsLoadError(null)
      const response = await apiClient.getJobs({
        limit: 50,
        allUsers: canViewAllJobs,
      })
      setJobs((prevJobs) => {
        return (response.jobs ?? []).map((job: any) => {
          const prevJob = prevJobs.find((j) => j.id === job.id)
          const prevLlmInsights = prevJob?.metadata?.llmInsights

          return {
            ...job,
            name: job.name ?? "",
            priority: job.priority ?? "medium",
            queue: job.queue ?? "",
            logs: job.logs ?? [],
            error: job.error || job.error_message || job.metadata?.error_message || null,
            projectName: job.metadata?.project_name || job.projectName,
            documentName: job.metadata?.document_name || job.documentName,
            metadata: {
              ...(job.metadata || {}),
              currentStep: job.metadata?.currentStep,
              compressionProgress: job.metadata?.compressionProgress,
              currentDocument: job.metadata?.currentDocument,
              providerAssignments: job.metadata?.providerAssignments || [],
              llmProgressSteps: job.metadata?.llmProgressSteps || [],
              llmRequestCount: job.metadata?.llmRequestCount ?? 0,
              ...(prevLlmInsights ? { llmInsights: prevLlmInsights } : {}),
            },
          }
        })
      })
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
      const status = (error as { status?: number })?.status
      const message =
        status === 401 || status === 403
          ? "Sign in to view jobs"
          : status === 503
            ? "Database temporarily unavailable — try again shortly"
            : "Failed to load jobs"
      setJobsLoadError(message)
      if (!options?.silent) {
        if (status === 401 || status === 403) {
          toast.error("Sign in to view jobs")
        } else if (status === 503) {
          toast.error("Database temporarily unavailable — retrying shortly")
        } else {
          toast.error("Failed to load jobs")
        }
      }
    } finally {
      setLoading(false)
    }
  }, [authLoading, isAuthenticated, canViewAllJobs])

  React.useEffect(() => {
    if (authLoading) return

    setLoading(true)
    void fetchJobs({ silent: true })

    const interval = setInterval(() => {
      void fetchJobs({ silent: true })
    }, 30000)
    return () => clearInterval(interval)
  }, [authLoading, fetchJobs])

  // Deep-link: /jobs?jobId=<uuid> (e.g. after queuing document generation)
  React.useEffect(() => {
    const id = searchParams.get("jobId")
    if (!id) {
      didScrollToQueryJobRef.current = false
      return
    }
    setSelectedJob(id)
    setStatusFilter("all")
    setSearchTerm("")
    didScrollToQueryJobRef.current = false
  }, [searchParams])

  React.useEffect(() => {
    const id = searchParams.get("jobId")
    if (!id || didScrollToQueryJobRef.current) return
    if (!jobs.some(j => j.id === id)) return
    didScrollToQueryJobRef.current = true
    requestAnimationFrame(() => {
      document.getElementById(`job-row-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [searchParams, jobs])

  // Queue overview — auth-gated; slower poll to reduce DB load (7 queues × 2 queries each)
  React.useEffect(() => {
    if (authLoading || !isAuthenticated) return

    const fetchQueues = async () => {
      try {
        const response = await apiClient.request<{ queues?: any[] }>('/queue-stats/overview', { suppressNotFoundError: true } as any)
        setQueues(response.queues || [])
      } catch (error: any) {
        if (error?.status !== 404 && error?.message !== 'Failed to fetch') {
          console.error("Failed to fetch queue stats:", error)
        }
        setQueues([])
      } finally {
        setLoadingQueues(false)
      }
    }

    void fetchQueues()

    const interval = setInterval(fetchQueues, 30000)
    return () => clearInterval(interval)
  }, [authLoading, isAuthenticated])

  // Worker stats — auth-gated; aligned with jobs refresh cadence
  React.useEffect(() => {
    if (authLoading || !isAuthenticated) return

    const fetchWorkers = async () => {
      try {
        const response = await apiClient.request<{ workers?: any[] }>('/queue-stats/workers', { suppressNotFoundError: true } as any)
        setWorkers(response.workers || [])
      } catch (error: any) {
        if (error?.status !== 404 && error?.message !== 'Failed to fetch') {
          console.error("Failed to fetch worker stats:", error)
        }
        setWorkers([])
      } finally {
        setLoadingWorkers(false)
      }
    }

    void fetchWorkers()

    const interval = setInterval(fetchWorkers, 30000)
    return () => clearInterval(interval)
  }, [authLoading, isAuthenticated])

  React.useEffect(() => {
    if (authLoading || !isAuthenticated) return

    const fetchMetrics = async () => {
      try {
        const response = await apiClient.request('/queue-stats/metrics', { suppressNotFoundError: true } as any)
        setMetrics(response)
      } catch (error: any) {
        if (error?.status !== 404 && error?.message !== 'Failed to fetch') {
          console.error("Failed to fetch queue metrics:", error)
        }
      }
    }

    void fetchMetrics()

    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [authLoading, isAuthenticated])

  // Listen for real-time job progress updates
  React.useEffect(() => {
    setJobs(prevJobs =>
      prevJobs.map(job => {
        const update = jobUpdates[job.id]
        if (update) {
          return { ...job, ...update }
        }
        return job
      })
    )
  }, [jobUpdates])

  React.useEffect(() => {
    const socket = apiClient.getSocket()
    if (!socket) return

  // Listen for job progress updates
  socket.on('job:status', (data: any) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === data.jobId
          ? {
            ...job,
            status: data.status,
            progress: data.progress || job.progress,
            startTime: data.startTime || job.startTime,
            worker: data.worker || job.worker,
            metadata: {
              ...(job.metadata || {}),
              ...(data.metadata || {})
            }
          }
          : job
      )
    )
  })

  // Listen for job completion
  socket.on('job:completed', (data: any) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === data.jobId
          ? {
            ...job,
            status: 'completed',
            progress: 100,
            completedTime: data.completedTime || new Date().toISOString(),
            startTime: data.startTime || job.startTime
          }
          : job
      )
    )
  })

  // Listen for job failure
  socket.on('job:failed', (data: any) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === data.jobId
          ? {
            ...job,
            status: 'failed',
            error: data.error,
            startTime: data.startTime || job.startTime,
            completedTime: new Date().toISOString()
          }
          : job
      )
    )
  })

  // Listen for job cancellation so cancelled jobs disappear from the
  // "Active Jobs in Progress" strip immediately without waiting for
  // the next polling refresh.
  socket.on('job:cancelled', (data: any) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === data.jobId
          ? {
            ...job,
            status: 'cancelled',
            completedTime: new Date().toISOString()
          }
          : job
      )
    )
  })

  // Listen for step-by-step updates (process-flow compression progress)
  socket.on('job:step-update', (data: any) => {
    setJobs(prevJobs =>
      prevJobs.map(job =>
        job.id === data.jobId
          ? {
            ...job,
            progress: data.progress || job.progress,
            projectName: data.projectName || job.projectName,
            documentName: data.documentName || job.documentName,
            metadata: {
              ...job.metadata,
              currentStep: data.currentStep,
              compressionProgress: data.compressionProgress,
              currentDocument: data.currentDocument,
              activeDocuments: data.activeDocuments || [],
              providerAssignments: data.providerAssignments || [],
              parallelCount: data.parallelCount || 0,
              llmProgressSteps: data.llmProgressSteps ?? job.metadata?.llmProgressSteps,
              llmRequestCount: data.llmRequestCount ?? job.metadata?.llmRequestCount,
            }
          }
          : job
      )
    )
  })

  return () => {
    socket.off('job:status')
    socket.off('job:completed')
    socket.off('job:failed')
    socket.off('job:cancelled')
    socket.off('job:step-update')
  }
  }, [])

const filteredJobs = jobs.filter((job) => {
  const matchesSearch = (job.name || job.id).toLowerCase().includes(searchTerm.toLowerCase())
  const matchesStatus = statusFilter === "all" || job.status === statusFilter
  return matchesSearch && matchesStatus
})

// Separate pending jobs for special display
const pendingJobs = filteredJobs.filter(j => j.status === 'pending' || j.status === 'queued')
const otherJobs = filteredJobs.filter(j => j.status !== 'pending' && j.status !== 'queued')

// Calculate stats from real data or metrics
const stats = {
  totalJobs: metrics.totalJobs || jobs.length,
  runningJobs: metrics.totalActive || jobs.filter((j) => {
    // Only count as running if:
    // 1. Status is processing/running
    // 2. No error message (error means it's actually failed)
    // 3. Started recently (not stuck)
    const hasError = j.error || j.error_message
    const isOld = j.startTime && new Date(j.startTime).getTime() < Date.now() - 30 * 60 * 1000 // 30 minutes
    return (j.status === "processing" || j.status === "running") && !hasError && !isOld
  }).length,
  completedJobs: metrics.totalCompleted || jobs.filter((j) => j.status === "completed").length,
  failedJobs: metrics.totalFailed || jobs.filter((j) => j.status === "failed").length,
  queuedJobs: metrics.totalWaiting || jobs.filter((j) => j.status === "pending").length,
  activeWorkers: metrics.activeWorkers || workers.filter((w) => w.status === "active").length,
  successRate: metrics.successRate || 0,
  queueHealth: metrics.queueHealth || 'unknown'
}

return (
  <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          <PageTransition>
            <AnimatedLayout className="space-y-8">
              {/* ── EMERGENCY KILL SWITCH BANNER ─────────────────────── */}
              {killStatus && killStatus.totalActiveJobs > 0 && (
                <div
                  className={`rounded-xl border-2 p-4 flex items-center justify-between gap-4 ${
                    killStatus.dangerLevel === 'critical'
                      ? 'bg-red-950/80 border-red-500 animate-pulse'
                      : 'bg-orange-950/70 border-orange-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldAlert className={`h-7 w-7 shrink-0 ${
                      killStatus.dangerLevel === 'critical' ? 'text-red-400' : 'text-orange-400'
                    }`} />
                    <div>
                      <p className={`font-bold text-sm ${
                        killStatus.dangerLevel === 'critical' ? 'text-red-300' : 'text-orange-300'
                      }`}>
                        {killStatus.dangerLevel === 'critical' ? '🚨 CRITICAL — Backend overloaded by runaway jobs' : '⚠️ Warning — Active jobs consuming backend resources'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {killStatus.totalActiveJobs} active/stuck job{killStatus.totalActiveJobs !== 1 ? 's' : ''}
                        {killStatus.blankDocuments > 0 ? ` · ${killStatus.blankDocuments} blank document${killStatus.blankDocuments !== 1 ? 's' : ''} detected` : ''}
                        {' — kill switch will cancel all and clean blank files'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={killLoading}
                    onClick={handleEmergencyStop}
                    className="shrink-0 bg-red-600 hover:bg-red-700 border-red-400 font-bold text-white shadow-lg shadow-red-900/50 px-6"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {killLoading ? 'Stopping...' : '🛑 Kill All Jobs'}
                  </Button>
                </div>
              )}

              {/* Header */}
              <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
                    Job Monitor
                  </h1>
                  <p className="text-muted-foreground mt-2">
                    Monitor and manage background jobs, queues, and workers
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        // Use correct endpoint and HTTP method; previous implementation
                        // accidentally treated 'POST' as the path, causing a 404 on /api/POST.
                        const result = await apiClient.request('/jobs/cleanup', { method: 'POST' }) as any
                        toast.success(`Cleaned up ${result.cleanedCount || 0} stuck cancelled jobs`)
                        window.location.reload()
                      } catch (error) {
                        toast.error('Failed to cleanup cancelled jobs')
                      }
                    }}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Clean Cancelled
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await apiClient.request('/jobs/clean-stalled', { method: 'POST' })
                        toast.success('Stalled jobs cleaned')
                        window.location.reload()
                      } catch (error) {
                        toast.error('Failed to clean stalled jobs')
                      }
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Clean Stalled
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const result = await apiClient.request('/jobs/clean-orphaned-pending', { method: 'POST' }) as any
                        const msg = result.requeuedCount > 0
                          ? `Re-queued ${result.requeuedCount} orphaned jobs`
                          : result.cleanedCount > 0
                            ? `Cleaned ${result.cleanedCount} orphaned jobs`
                            : 'No orphaned pending jobs found'
                        toast.success(msg)
                        window.location.reload()
                      } catch (error) {
                        toast.error('Failed to clean orphaned pending jobs')
                      }
                    }}
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Fix Orphaned
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const result = await apiClient.request('/jobs/retry-all-failed', { method: 'POST' }) as any
                        toast.success(`Retried ${result.retriedCount} failed jobs`)
                        window.location.reload()
                      } catch (error) {
                        toast.error('Failed to retry jobs')
                      }
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry All Failed
                  </Button>
                </div>
              </div>

              {/* Stats Cards */}
              {loading ? (
                <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <AnimatedGridItem key={i}>
                      <Card className="glass border-0 shadow-lg">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-8 w-12" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-full" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                  ))}
                </AnimatedGrid>
              ) : (
                <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                            <p className="text-2xl font-bold">{stats.totalJobs}</p>
                          </div>
                          <Activity className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Running</p>
                            <p className="text-2xl font-bold text-blue-600">{stats.runningJobs}</p>
                          </div>
                          <Play className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{stats.completedJobs}</p>
                          </div>
                          <CheckCircle className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Failed</p>
                            <p className="text-2xl font-bold text-red-600">{stats.failedJobs}</p>
                          </div>
                          <XCircle className="h-8 w-8 text-red-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Queued</p>
                            <p className="text-2xl font-bold text-yellow-600">{stats.queuedJobs}</p>
                          </div>
                          <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Workers</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.activeWorkers}</p>
                          </div>
                          <Server className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>
                </AnimatedGrid>
              )}

              {/* Real-Time Active Jobs Status Bar */}
              {jobs.filter(j => j.status === 'processing' || j.status === 'running').length > 0 && (
                <Card className="glass border-0 shadow-lg border-l-4 border-l-blue-500 animate-fade-in">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-lg">
                      <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
                      <span>Active Jobs in Progress</span>
                      <Badge className="bg-blue-500">{jobs.filter(j => {
                        const hasError = j.error || j.error_message
                        const isOld = j.startTime && new Date(j.startTime).getTime() < Date.now() - 30 * 60 * 1000
                        return (j.status === 'processing' || j.status === 'running') && !hasError && !isOld
                      }).length}</Badge>
                    </CardTitle>
                    <CardDescription>Real-time progress tracking with live updates</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {jobs
                      .filter(j => {
                        // Only show as active if no error and not stuck
                        const hasError = j.error || j.error_message
                        const isOld = j.startTime && new Date(j.startTime).getTime() < Date.now() - 30 * 60 * 1000 // 30 minutes
                        return (j.status === 'processing' || j.status === 'running') && j.progress >= 0 && !hasError && !isOld
                      })
                      .map(job => (
                        <div
                          key={job.id}
                          id={`job-row-${job.id}`}
                          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-300"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{job.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {job.worker && job.worker !== 'Unassigned' ? `Worker: ${job.worker.substring(0, 25)}...` : '⏳ Waiting for worker assignment...'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-blue-600">{job.progress}%</p>
                              <p className="text-xs text-muted-foreground font-medium">
                                {job.progress <= 10 && "⚡ Starting job..."}
                                {job.progress > 10 && job.progress <= 30 && "📚 Gathering context..."}
                                {job.progress > 30 && job.progress <= 55 && "🤖 AI generating..."}
                                {job.progress > 55 && job.progress <= 90 && "⚙️ Processing..."}
                                {job.progress > 90 && job.progress < 100 && "✨ Finalizing..."}
                              </p>
                            </div>
                          </div>
                          <Progress value={job.progress} className="h-3 transition-all duration-500" />
                          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                            <span>Queue: {job.queue}</span>
                            <span>Type: {job.type}</span>
                          </div>
                        </div>
                      ))}
                  </CardContent>
                </Card>
              )}

              {/* Main Content */}
              <Card className="glass border-0 shadow-lg">
                <CardHeader>
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div>
                      <CardTitle>Job Management</CardTitle>
                      <CardDescription>Monitor and control background jobs and processes</CardDescription>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search jobs..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32">
                          <Filter className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="running">Running</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                          <SelectItem value="queued">Queued</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="jobs" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="jobs">Jobs</TabsTrigger>
                      <TabsTrigger value="queues">Queues</TabsTrigger>
                      <TabsTrigger value="workers">Workers</TabsTrigger>
                    </TabsList>

                    <TabsContent value="jobs" className="space-y-4">
                      {jobsLoadError && !loading && jobs.length === 0 ? (
                        <Card className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
                          <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-4">
                            <div className="flex items-start gap-2 text-red-700 dark:text-red-300">
                              <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                              <p className="text-sm">{jobsLoadError}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLoading(true)
                                void fetchJobs()
                              }}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                          </CardContent>
                        </Card>
                      ) : null}

                      {/* Pending Jobs Alert */}
                      {pendingJobs.length > 0 && (
                        <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-900/10">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
                                <AlertCircle className="h-5 w-5" />
                                Pending Jobs ({pendingJobs.length})
                              </CardTitle>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-yellow-700 border-yellow-500 hover:bg-yellow-100 dark:text-yellow-400 dark:hover:bg-yellow-900/30"
                                onClick={async () => {
                                  try {
                                    const result = await apiClient.request('/jobs/clean-orphaned-pending', { method: 'POST' }) as any
                                    const msg = result.requeuedCount > 0
                                      ? `Re-queued ${result.requeuedCount} orphaned jobs`
                                      : result.cleanedCount > 0
                                        ? `Cleaned ${result.cleanedCount} orphaned jobs`
                                        : 'No orphaned pending jobs found'
                                    toast.success(msg)
                                    window.location.reload()
                                  } catch (error) {
                                    toast.error('Failed to fix orphaned jobs')
                                  }
                                }}
                              >
                                <RefreshCw className="h-4 w-4 mr-1" />
                                Fix All Orphaned
                              </Button>
                            </div>
                            <CardDescription>
                              <div className="space-y-1">
                                <span>Jobs waiting to be processed. Jobs pending &gt;5 minutes may be orphaned (not in queue).</span>
                                {pendingJobs.some((j: { queue?: string; type?: string }) => (j.queue === "gkg-sync" || String(j.type || "").startsWith("gkg-"))) && (
                                  <p className="text-amber-700 dark:text-amber-400 text-sm mt-2">
                                    <strong>GKG jobs</strong> are processed by the same backend that serves the API. Restart the backend (process on port 5000) so the gkg-sync consumer runs, then use &quot;Retry&quot; on each job.
                                  </p>
                                )}
                              </div>
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {pendingJobs.map((job) => {
                              const createdAt = job.queuedTime || job.startTime
                              const ageMinutes = createdAt
                                ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60)
                                : 0
                              const isOld = ageMinutes > 5
                              const isVeryOld = ageMinutes > 15

                              return (
                                <div
                                  key={job.id}
                                  id={`job-row-${job.id}`}
                                  className={`p-4 rounded-lg border ${isVeryOld
                                      ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                                      : isOld
                                        ? 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                                        : 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800'
                                    }`}
                                >
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <Clock className={`h-4 w-4 flex-shrink-0 ${isVeryOld ? 'text-red-500' : 'text-yellow-600'}`} />
                                        <p className="font-medium text-sm truncate">{job.name}</p>
                                      </div>
                                      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                        <div><span className="font-medium">Type:</span> {job.type}</div>
                                        <div><span className="font-medium">Queue:</span> {job.queue || 'unknown'}</div>
                                        <div><span className="font-medium">Age:</span> <span className={isOld ? 'text-yellow-700 dark:text-yellow-400 font-semibold' : ''}>{ageMinutes} min</span></div>
                                        <div><span className="font-medium">ID:</span> <span className="font-mono text-[10px]">{job.id.slice(0, 8)}...</span></div>
                                      </div>
                                      {isVeryOld && (
                                        <div className="mt-2 p-2 rounded bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                                          <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                                            🚨 Likely orphaned - Job not in queue. Click "Retry" to re-queue or "Cancel" to remove.
                                          </p>
                                        </div>
                                      )}
                                      {isOld && !isVeryOld && (
                                        <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-2">
                                          ⚠️ Pending for {ageMinutes} min - may be stuck or orphaned
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                      <Button
                                        variant={isOld ? "default" : "outline"}
                                        size="sm"
                                        className={isOld ? "bg-yellow-600 hover:bg-yellow-700 text-white" : ""}
                                        onClick={async () => {
                                          try {
                                            const result = await apiClient.request(`/jobs/${job.id}/retry`, { method: 'POST' }) as any
                                            toast.success(`Job re-queued: ${result.newJobId?.slice(0, 8)}...`)
                                            window.location.reload()
                                          } catch (error: any) {
                                            toast.error(error?.message || 'Failed to retry job')
                                          }
                                        }}
                                      >
                                        <RefreshCw className="h-3 w-3 mr-1" />
                                        Retry
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-red-600 border-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                                        onClick={async () => {
                                          try {
                                            await apiClient.request(`/jobs/${job.id}/cancel`, { method: 'POST' })
                                            toast.success('Job cancelled')
                                            window.location.reload()
                                          } catch (error: any) {
                                            toast.error(error?.message || 'Failed to cancel job')
                                          }
                                        }}
                                      >
                                        <XCircle className="h-3 w-3 mr-1" />
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </CardContent>
                        </Card>
                      )}

                      <div className="space-y-4">
                        {otherJobs.map((job, index) => (
                          <AnimatedGridItemWithDelay
                            key={job.id}
                            className="animate-fade-in-up"
                            animationDelay={index * 100}
                          >
                            <Card id={`job-row-${job.id}`} className="border border-slate-200 dark:border-slate-700 hover-lift scroll-mt-24">
                              <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1 space-y-3">
                                    <div className="flex items-center space-x-3">
                                      <div className={`p-2 rounded-lg border ${getStatusColor(job.status)}`}>
                                        {getStatusIcon(job.status)}
                                      </div>
                                      <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{job.name}</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                          <p className="text-sm text-muted-foreground">ID: {job.id}</p>
                                          {job.projectName && (
                                            <>
                                              <span className="text-muted-foreground">•</span>
                                              <p className="text-sm text-blue-600 dark:text-blue-400">
                                                📁 {job.projectName}
                                              </p>
                                            </>
                                          )}
                                          {job.documentName && (
                                            <>
                                              <span className="text-muted-foreground">•</span>
                                              <p className="text-sm text-purple-600 dark:text-purple-400">
                                                📄 {job.documentName}
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                      <Badge variant="outline" className={getPriorityColor(job.priority)}>
                                        {job.priority}
                                      </Badge>
                                      <Badge variant="outline">{job.queue}</Badge>
                                    </div>

                                    {(job.status === "running" || job.status === "processing") && job.progress > 0 && job.progress < 100 && (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="flex items-center space-x-2">
                                            <Activity className="h-3 w-3 animate-pulse text-blue-500" />
                                            <span>Progress</span>
                                          </span>
                                          <span className="font-semibold text-blue-600">{job.progress}%</span>
                                        </div>
                                        <Progress value={job.progress} className="h-2" />
                                        <p className="text-xs text-muted-foreground">
                                          {/* Show current step if available (process-flow jobs) */}
                                          {(job.metadata as any)?.currentStep || (
                                            <>
                                              {job.progress <= 10 && "Starting job..."}
                                              {job.progress > 10 && job.progress <= 30 && "Gathering context..."}
                                              {job.progress > 30 && job.progress <= 55 && "AI generating content... (long documents may take 2–5 min)"}
                                              {job.progress > 55 && job.progress <= 90 && "Processing response..."}
                                              {job.progress > 90 && job.progress < 100 && "Finalizing..."}
                                            </>
                                          )}
                                        </p>

                                        {Array.isArray((job.metadata as any)?.llmProgressSteps) &&
                                          (job.metadata as any).llmProgressSteps.length > 0 && (
                                          <div className="mt-3 space-y-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 p-3">
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="font-semibold text-amber-900 dark:text-amber-100">
                                                LLM generation steps
                                              </span>
                                              <span className="text-muted-foreground">
                                                {(job.metadata as any).llmRequestCount ?? 0} request
                                                {((job.metadata as any).llmRequestCount ?? 0) === 1 ? "" : "s"} captured
                                              </span>
                                            </div>
                                            <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                              {(job.metadata as any).llmProgressSteps.map((step: any) => {
                                                const status = step.status || "pending"
                                                const statusColor =
                                                  status === "completed"
                                                    ? "text-green-600 dark:text-green-400"
                                                    : status === "running"
                                                      ? "text-blue-600 dark:text-blue-400"
                                                      : status === "failed"
                                                        ? "text-red-600 dark:text-red-400"
                                                        : "text-muted-foreground"
                                                const statusIcon =
                                                  status === "completed"
                                                    ? "✓"
                                                    : status === "running"
                                                      ? "…"
                                                      : status === "failed"
                                                        ? "✗"
                                                        : "○"
                                                return (
                                                  <div
                                                    key={step.id}
                                                    className={`flex items-start gap-2 text-xs p-2 rounded-md border ${
                                                      status === "running"
                                                        ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30"
                                                        : "border-transparent bg-white/50 dark:bg-slate-950/30"
                                                    }`}
                                                  >
                                                    <span className={`font-mono shrink-0 ${statusColor}`}>{statusIcon}</span>
                                                    <div className="min-w-0 flex-1">
                                                      <p className="font-medium truncate">{step.label}</p>
                                                      {step.heading ? (
                                                        <p className="text-muted-foreground truncate">{step.heading}</p>
                                                      ) : null}
                                                      <div className="flex flex-wrap gap-x-2 text-[10px] text-muted-foreground mt-0.5">
                                                        {step.phase ? <span>{step.phase}</span> : null}
                                                        {step.provider ? <span>{step.provider}</span> : null}
                                                        {step.model ? <span>{step.model}</span> : null}
                                                      </div>
                                                    </div>
                                                  </div>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        )}

                                        {/* Show compression progress for process-flow jobs */}
                                        {(job.metadata as any)?.compressionProgress && (
                                          <div className="mt-2 space-y-2">
                                            <div className="flex items-center justify-between text-xs">
                                              <span className="text-muted-foreground">Document Compression</span>
                                              <span className="font-medium text-blue-600">
                                                {(job.metadata as any).compressionProgress.current}/
                                                {(job.metadata as any).compressionProgress.total}
                                              </span>
                                            </div>
                                            <Progress
                                              value={(job.metadata as any).compressionProgress.percentage}
                                              className="h-1.5"
                                            />

                                            {/* Show parallel processing indicator */}
                                            {(job.metadata as any)?.parallelCount > 1 && (
                                              <div className="flex items-center gap-2 text-xs">
                                                <Badge variant="secondary" className="text-xs">
                                                  ⚡ {(job.metadata as any).parallelCount} parallel
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                  {(job.metadata as any).parallelCount}x faster
                                                </span>
                                              </div>
                                            )}

                                            {/* Show provider assignments for AI compression */}
                                            {(job.metadata as any)?.providerAssignments && (job.metadata as any).providerAssignments.length > 0 && (
                                              <div className="space-y-2 mt-2 p-3 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                  <Activity className="h-3 w-3 animate-pulse" />
                                                  AI Provider Work Queue ({(job.metadata as any).providerAssignments.length} active)
                                                </p>
                                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                                  {(job.metadata as any).providerAssignments.map((assignment: any, idx: number) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs p-2 rounded-md bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900 shadow-sm">
                                                      <div className="flex items-center gap-2 flex-1">
                                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 font-mono bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                                                          {assignment.provider}
                                                        </Badge>
                                                        <div className="flex-1 min-w-0">
                                                          <p className="truncate text-blue-900 dark:text-blue-100 font-medium">
                                                            Doc #{assignment.docIndex}: {assignment.name}
                                                          </p>
                                                        </div>
                                                      </div>
                                                      <div className="flex items-center gap-1 text-muted-foreground whitespace-nowrap">
                                                        <Clock className="h-3 w-3" />
                                                        {assignment.duration}s
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground italic text-center pt-1 border-t border-blue-200 dark:border-blue-800">
                                                  Each provider processes documents independently with automatic failover
                                                </p>
                                              </div>
                                            )}

                                            {/* Fallback: Show active documents (old format) */}
                                            {!(job.metadata as any)?.providerAssignments && (job.metadata as any)?.activeDocuments && (job.metadata as any).activeDocuments.length > 0 && (
                                              <div className="space-y-1 mt-2 p-2 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                                                  <Activity className="h-3 w-3 animate-pulse" />
                                                  Processing {(job.metadata as any).activeDocuments.length} document{(job.metadata as any).activeDocuments.length > 1 ? 's' : ''} now:
                                                </p>
                                                <div className="space-y-1 max-h-32 overflow-y-auto">
                                                  {(job.metadata as any).activeDocuments.slice(0, 10).map((doc: any, idx: number) => (
                                                    <div key={idx} className="flex items-center justify-between text-xs p-1.5 rounded bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900">
                                                      <span className="truncate flex-1 text-blue-900 dark:text-blue-100">
                                                        {idx + 1}. {doc.name}
                                                      </span>
                                                      <span className="text-muted-foreground ml-2 whitespace-nowrap">
                                                        {doc.duration}s
                                                      </span>
                                                    </div>
                                                  ))}
                                                  {(job.metadata as any).activeDocuments.length > 10 && (
                                                    <p className="text-xs text-muted-foreground text-center">
                                                      +{(job.metadata as any).activeDocuments.length - 10} more...
                                                    </p>
                                                  )}
                                                </div>
                                              </div>
                                            )}

                                            {/* Fallback to single document display */}
                                            {(!job.metadata as any)?.activeDocuments && (job.metadata as any)?.currentDocument?.documentName && (
                                              <p className="text-xs text-muted-foreground italic truncate">
                                                Compressing: {(job.metadata as any).currentDocument.documentName}
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Started</p>
                                        <p className="font-medium">
                                          {job.startTime
                                            ? new Date(job.startTime).toLocaleTimeString()
                                            : "Not started"}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Worker</p>
                                        <p className="font-medium">{job.worker || "Unassigned"}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Type</p>
                                        <p className="font-medium">{job.type.replace("_", " ")}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Status</p>
                                        <Badge variant="outline" className={getStatusColor(job.status)}>
                                          {job.status}
                                        </Badge>
                                      </div>
                                    </div>

                                    {job.error && (
                                      <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                                        <div className="flex items-center space-x-2">
                                          <AlertTriangle className="h-4 w-4 text-red-500" />
                                          <p className="text-sm text-red-700 dark:text-red-300">{job.error}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault()
                                          setSelectedJob(prev => (prev === job.id ? null : job.id))
                                        }}
                                      >
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(e) => {
                                          e.preventDefault()
                                          setViewingLogs(prev => (prev === job.id ? null : job.id))
                                        }}
                                      >
                                        <FileText className="h-4 w-4 mr-2" />
                                        View Logs
                                      </DropdownMenuItem>
                                      {(job.status === "failed" || job.status === "stuck" || job.status === "processing" || job.status === "cancelled") && (
                                        <DropdownMenuItem
                                          onSelect={async (e) => {
                                            e.preventDefault()
                                            try {
                                              const result = await apiClient.request(`/jobs/${job.id}/retry`, { method: 'POST' }) as any
                                              toast.success(`Job retried! New job: ${result.newJobId?.substring(0, 8)}...`)
                                              window.location.reload()
                                            } catch (error) {
                                              toast.error('Failed to retry job')
                                            }
                                          }}
                                        >
                                          <RefreshCw className="h-4 w-4 mr-2" />
                                          {job.status === "stuck" || job.status === "processing" ? "Retry Stuck Job" : job.status === "cancelled" ? "Retry Cancelled Job" : "Retry Job"}
                                        </DropdownMenuItem>
                                      )}
                                      {(job.status === "pending" || job.status === "processing") && (
                                        <DropdownMenuItem
                                          onSelect={async (e) => {
                                            e.preventDefault()
                                            try {
                                              await apiClient.request(`/jobs/${job.id}/cancel`, { method: 'POST' })
                                              toast.success('Job cancelled successfully')
                                              window.location.reload()
                                            } catch (error: any) {
                                              toast.error(error?.message || 'Failed to cancel job')
                                            }
                                          }}
                                          className="text-red-600"
                                        >
                                          <XCircle className="h-4 w-4 mr-2" />
                                          Cancel Job
                                        </DropdownMenuItem>
                                      )}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardContent>
                            </Card>
                            {selectedJob === job.id && (
                              <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-4">
                                <h4 className="font-semibold mb-4">Job Details</h4>

                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm mb-4">
                                  <div>
                                    <p className="text-muted-foreground">Job ID</p>
                                    <p className="font-mono text-xs break-all">{job.id}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Queue</p>
                                    <p className="font-medium">{job.queue || "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Priority</p>
                                    <p className="font-medium capitalize">{job.priority}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Started</p>
                                    <p className="font-medium">{job.startTime ? new Date(job.startTime).toLocaleString() : "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Completed</p>
                                    <p className="font-medium">{job.completedTime ? new Date(job.completedTime).toLocaleString() : "-"}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Status</p>
                                    <p className="font-medium capitalize">{job.status}</p>
                                  </div>
                                </div>

                                {/* Child Sub-processes */}
                                {job.childJobs && job.childJobs.length > 0 && (() => {
                                  const total = job.childJobs.length;
                                  const completed = job.childJobs.filter((c: any) => c.status === 'completed');
                                  const failed = job.childJobs.filter((c: any) => c.status === 'failed');
                                  const processing = job.childJobs.filter((c: any) => c.status === 'processing' || c.status === 'running');
                                  const pending = job.childJobs.filter((c: any) => c.status === 'pending' || c.status === 'queued');
                                  const pct = Math.round(((completed.length + failed.length) / total) * 100);

                                  const renderChildGrid = (children: any[]) => (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 p-1">
                                      {children.map((child: any) => (
                                        <div key={child.id} className="text-xs p-2.5 rounded bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-col justify-between gap-1 hover:border-slate-300 dark:hover:border-slate-700 transition-colors duration-200">
                                          <div className="flex justify-between items-start gap-1">
                                            <span className="font-mono text-xs font-semibold capitalize text-slate-700 dark:text-slate-300 truncate">
                                              {child.type.replace("extract-entity-", "").replace(/_/g, " ")}
                                            </span>
                                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 font-medium ${getStatusColor(child.status)}`}>
                                              {child.status}
                                            </Badge>
                                          </div>
                                          <span className="text-[10px] text-muted-foreground font-mono truncate">ID: {child.id}</span>
                                          {(child.startTime || child.completedTime) && (
                                            <div className="text-[10px] text-muted-foreground flex justify-between mt-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                                              <span>{child.startTime ? new Date(child.startTime).toLocaleTimeString() : "-"}</span>
                                              <span>{child.completedTime ? new Date(child.completedTime).toLocaleTimeString() : ""}</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  );

                                  return (
                                    <div className="mb-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-3">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <h5 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Entity Ingestion Sub-processes</h5>
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-muted-foreground">Progress:</span>
                                          <span className="font-semibold text-blue-600 dark:text-blue-400">{completed.length}/{total} Done</span>
                                          {failed.length > 0 && <span className="font-semibold text-red-600 dark:text-red-400">({failed.length} Failed)</span>}
                                        </div>
                                      </div>

                                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-500 ${failed.length > 0 ? 'bg-red-500' : 'bg-blue-500'}`}
                                          style={{ width: `${pct}%` }}
                                        />
                                      </div>

                                      <div className="space-y-2 mt-2">
                                        {/* 1. Active / Processing */}
                                        {processing.length > 0 && (
                                          <details open className="group">
                                            <summary className="cursor-pointer text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1 py-1 hover:text-blue-800 transition-colors">
                                              <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                                              Active / Processing ({processing.length})
                                            </summary>
                                            <div className="mt-2 max-h-60 overflow-y-auto">
                                              {renderChildGrid(processing)}
                                            </div>
                                          </details>
                                        )}

                                        {/* 2. Failed */}
                                        {failed.length > 0 && (
                                          <details open className="group">
                                            <summary className="cursor-pointer text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1 py-1 hover:text-red-800 transition-colors">
                                              <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                                              Failed ({failed.length})
                                            </summary>
                                            <div className="mt-2 max-h-60 overflow-y-auto">
                                              {renderChildGrid(failed)}
                                            </div>
                                          </details>
                                        )}

                                        {/* 3. Pending / Queued */}
                                        {pending.length > 0 && (
                                          <details className="group">
                                            <summary className="cursor-pointer text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1 py-1 hover:text-slate-700 transition-colors">
                                              <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                                              Pending / Queued ({pending.length})
                                            </summary>
                                            <div className="mt-2 max-h-60 overflow-y-auto">
                                              {renderChildGrid(pending)}
                                            </div>
                                          </details>
                                        )}

                                        {/* 4. Completed */}
                                        {completed.length > 0 && (
                                          <details className="group">
                                            <summary className="cursor-pointer text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1 py-1 hover:text-green-800 transition-colors">
                                              <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                                              Completed ({completed.length})
                                            </summary>
                                            <div className="mt-2 max-h-72 overflow-y-auto">
                                              {renderChildGrid(completed)}
                                            </div>
                                          </details>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* AI-Specific Metadata */}
                                {(job as any).metadata && (job as any).metadata.provider && (
                                  <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <h5 className="text-sm font-semibold mb-3">AI Processing Details</h5>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                                      <div>
                                        <p className="text-muted-foreground">Provider</p>
                                        <p className="font-medium">{(job as any).metadata.provider || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Model</p>
                                        <p className="font-medium">{(job as any).metadata.model || "-"}</p>
                                      </div>
                                      <div>
                                        <p className="text-muted-foreground">Temperature</p>
                                        <p className="font-medium">{(job as any).metadata.temperature || "-"}</p>
                                      </div>
                                      {((job as any).metadata.project_name || job.projectName) && (
                                        <div>
                                          <p className="text-muted-foreground">Project</p>
                                          <p className="font-medium">{(job as any).metadata.project_name || job.projectName}</p>
                                        </div>
                                      )}
                                      {((job as any).metadata.document_name || job.documentName) && (
                                        <div>
                                          <p className="text-muted-foreground">Document</p>
                                          <p className="font-medium">{(job as any).metadata.document_name || job.documentName}</p>
                                        </div>
                                      )}
                                      {(job as any).metadata.tokens && (
                                        <div>
                                          <p className="text-muted-foreground">Tokens Used</p>
                                          <p className="font-medium">{(job as any).metadata.tokens.total_tokens || (job as any).metadata.tokens.totalTokens || "-"}</p>
                                        </div>
                                      )}
                                      {(job as any).metadata.template_name && (
                                        <div>
                                          <p className="text-muted-foreground">Template</p>
                                          <p className="font-medium">{(job as any).metadata.template_name}</p>
                                        </div>
                                      )}
                                      {(job as any).metadata.document_id && (
                                        <div>
                                          <p className="text-muted-foreground">Generated Document</p>
                                          <a
                                            href={`/projects/${(job as any).metadata.project_id}/documents/${(job as any).metadata.document_id}`}
                                            className="font-medium text-blue-600 hover:underline"
                                          >
                                            View Document
                                          </a>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {(() => {
                                  const llmRequestCount = (job as any).metadata?.llmRequestCount ?? 0
                                  const llmRequests = Array.isArray((job as any).metadata?.llmInsights?.requests)
                                    ? (job as any).metadata.llmInsights.requests
                                    : []

                                  if (llmRequestCount === 0 && llmRequests.length === 0) return null

                                  const isLoadingLlm = loadingLlmInsightsJobId === job.id
                                  const hasLoadedLlm = llmRequests.length > 0
                                  const requestCount = llmRequestCount || llmRequests.length

                                  return (
                                    <details
                                      className="mb-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 group"
                                      onToggle={(e) => {
                                        if ((e.currentTarget as HTMLDetailsElement).open) {
                                          void loadLlmInsightsIfNeeded(job.id)
                                        }
                                      }}
                                    >
                                      <summary className="cursor-pointer list-none p-3 text-sm font-semibold flex items-center gap-2 hover:bg-amber-100/50 dark:hover:bg-amber-900/30 rounded-lg transition-colors">
                                        <span className="transition-transform duration-200 group-open:rotate-90 text-amber-700 dark:text-amber-300">▶</span>
                                        LLM Payload Sent
                                        <span className="text-xs font-normal text-muted-foreground">
                                          ({requestCount} request{requestCount === 1 ? "" : "s"} — expand to load)
                                        </span>
                                      </summary>
                                      <div className="px-3 pb-3">
                                        <p className="text-xs text-muted-foreground mb-3">
                                          Full prompt snapshots captured after context assembly and before the provider request.
                                        </p>
                                        {isLoadingLlm && !hasLoadedLlm ? (
                                          <div className="text-sm text-muted-foreground py-2">
                                            Loading LLM payload snapshots…
                                          </div>
                                        ) : !hasLoadedLlm ? (
                                          <div className="text-sm text-muted-foreground py-2">
                                            Expand this section to load prompt snapshots.
                                          </div>
                                        ) : (
                                          <div className="space-y-3">
                                            {llmRequests.map((request: any, index: number) => {
                                              const prompt = typeof request.prompt === "string" ? request.prompt : ""
                                              const label = request.label || `${request.phase || "LLM"} request ${index + 1}`

                                              return (
                                                <div key={`${request.traceName || request.phase || "llm"}-${index}`} className="rounded-md border border-amber-200 dark:border-amber-800 bg-white/70 dark:bg-slate-950/40 p-3">
                                                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                                                    <div>
                                                      <p className="text-sm font-medium">{label}</p>
                                                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                                                        <span>Phase: {request.phase || "-"}</span>
                                                        <span>Provider: {request.provider || "-"}</span>
                                                        <span>Model: {request.model || "-"}</span>
                                                        <span>Temperature: {request.temperature ?? "-"}</span>
                                                        <span>{request.characterCount ?? prompt.length} chars</span>
                                                      </div>
                                                      {request.context_metrics && (
                                                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 p-2 rounded-md bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
                                                          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-tight">
                                                            <Activity className="h-3 w-3" />
                                                            Context Injection
                                                          </div>
                                                          <div className="flex flex-wrap gap-2">
                                                            {request.context_metrics.rag_strategy && (
                                                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-200 dark:border-blue-800 bg-blue-100/50 dark:bg-blue-900/30">
                                                                RAG: {request.context_metrics.rag_strategy.replace('-', ' ')}
                                                              </Badge>
                                                            )}
                                                            {request.context_metrics.rag_chunks_found !== undefined && (
                                                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-200 dark:border-blue-800">
                                                                Chunks: {request.context_metrics.rag_chunks_found}
                                                              </Badge>
                                                            )}
                                                            {request.context_metrics.entities_injected !== undefined && (
                                                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-200 dark:border-blue-800">
                                                                Entities: {request.context_metrics.entities_injected}
                                                              </Badge>
                                                            )}
                                                            {request.context_metrics.baseline_entities_injected !== undefined && request.context_metrics.baseline_entities_injected > 0 && (
                                                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-200 dark:border-blue-800">
                                                                Baseline: {request.context_metrics.baseline_entities_injected}
                                                              </Badge>
                                                            )}
                                                          </div>
                                                        </div>
                                                      )}
                                                      {request.heading && (
                                                        <p className="mt-1 text-xs text-muted-foreground">Section: {request.heading}</p>
                                                      )}
                                                    </div>
                                                    <Button
                                                      type="button"
                                                      variant="outline"
                                                      size="sm"
                                                      className="h-8 shrink-0"
                                                      onClick={() => copyToClipboard(prompt, label)}
                                                    >
                                                      <Copy className="mr-2 h-3 w-3" />
                                                      Copy
                                                    </Button>
                                                  </div>
                                                  <details className="mt-3">
                                                    <summary className="cursor-pointer text-xs font-medium text-amber-800 dark:text-amber-200 mb-2">
                                                      Show full prompt & response
                                                    </summary>
                                                    <div className="space-y-4 pt-2">
                                                      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">System Prompt Payload</span>
                                                          <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 px-2 text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700"
                                                            onClick={() => copyToClipboard(prompt, "System Prompt")}
                                                          >
                                                            <Copy className="h-3 w-3 mr-1.5" /> Copy
                                                          </Button>
                                                        </div>
                                                        <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50">
                                                          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                                                            {prompt || "No prompt captured."}
                                                          </pre>
                                                        </div>
                                                      </div>
                                                      <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                                                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 px-3 py-2">
                                                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">AI Provider Response</span>
                                                          {request.response && (
                                                            <Button
                                                              type="button"
                                                              variant="ghost"
                                                              size="sm"
                                                              className="h-6 px-2 text-[10px] hover:bg-slate-200 dark:hover:bg-slate-700"
                                                              onClick={() => copyToClipboard(request.response, "AI Response")}
                                                            >
                                                              <Copy className="h-3 w-3 mr-1.5" /> Copy
                                                            </Button>
                                                          )}
                                                        </div>
                                                        <div className="p-3 bg-slate-50/50 dark:bg-slate-950/50">
                                                          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                                                            {request.response || "No response recorded (generation may have failed or is in progress)."}
                                                          </pre>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </details>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        )}
                                      </div>
                                    </details>
                                  )
                                })()}

                                {job.logs && job.logs.length > 0 && (
                                  <div className="mt-4">
                                    <p className="text-sm text-muted-foreground mb-2">Logs</p>
                                    <div className="max-h-56 overflow-auto rounded-md bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-3 text-xs space-y-1">
                                      {job.logs.map((line, i) => (
                                        <pre key={i} className="whitespace-pre-wrap break-words">{line}</pre>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {job.error && (
                                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm">
                                    <div className="flex items-center space-x-2">
                                      <AlertTriangle className="h-4 w-4 text-red-500" />
                                      <p className="text-red-700 dark:text-red-300">{job.error}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Logs Viewer - Terminal Style */}
                            {viewingLogs === job.id && (
                              <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-900 p-0 overflow-hidden">
                                <div className="flex items-center justify-between bg-slate-800 px-4 py-2 border-b border-slate-700">
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    </div>
                                    <span className="text-xs font-mono text-slate-300">Job Logs: {job.id.substring(0, 13)}...</span>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-slate-400 hover:text-white"
                                    onClick={() => setViewingLogs(null)}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </div>

                                <div className="p-4 max-h-96 overflow-auto font-mono text-xs">
                                  {/* Job execution logs */}
                                  {job.logs && job.logs.length > 0 ? (
                                    <div className="space-y-1">
                                      {job.logs.map((log: any, idx: number) => (
                                        <div key={idx} className="text-green-400">
                                          <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span>
                                          <span className="ml-2">{log}</span>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-slate-400 space-y-1">
                                      <div><span className="text-slate-500">[{job.queuedTime ? new Date(job.queuedTime).toLocaleTimeString() : '--:--:--'}]</span> <span className="text-blue-400">INFO</span> Job queued: {job.type}</div>
                                      {job.startTime && (
                                        <div><span className="text-slate-500">[{new Date(job.startTime).toLocaleTimeString()}]</span> <span className="text-green-400">INFO</span> Job started by worker: {job.worker}</div>
                                      )}
                                      {(job.metadata as any)?.currentStep && (
                                        <div><span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-cyan-400">INFO</span> {(job.metadata as any).currentStep}</div>
                                      )}
                                      {(job.metadata as any)?.activeDocuments?.length > 0 && (
                                        <>
                                          <div className="text-yellow-400 mt-2">
                                            <span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-yellow-400">INFO</span> Parallel processing: {(job.metadata as any).activeDocuments.length} documents
                                          </div>
                                          {(job.metadata as any).activeDocuments.slice(0, 10).map((doc: any, idx: number) => (
                                            <div key={idx} className="text-slate-400 ml-4">
                                              <span className="text-slate-600">└─</span> [{idx + 1}] {doc.name} <span className="text-cyan-400">({doc.duration}s)</span>
                                            </div>
                                          ))}
                                        </>
                                      )}
                                      {job.progress > 0 && job.progress < 100 && (
                                        <div><span className="text-slate-500">[{new Date().toLocaleTimeString()}]</span> <span className="text-cyan-400">INFO</span> Progress: {job.progress}%</div>
                                      )}
                                      {job.status === 'completed' && job.completedTime && (
                                        <div><span className="text-slate-500">[{new Date(job.completedTime).toLocaleTimeString()}]</span> <span className="text-green-400">SUCCESS</span> Job completed successfully</div>
                                      )}
                                      {job.status === 'failed' && job.error && (
                                        <div><span className="text-slate-500">[{job.completedTime ? new Date(job.completedTime).toLocaleTimeString() : '--:--:--'}]</span> <span className="text-red-400">ERROR</span> {job.error}</div>
                                      )}
                                      {job.status === 'cancelled' && (
                                        <div><span className="text-slate-500">[{job.completedTime ? new Date(job.completedTime).toLocaleTimeString() : '--:--:--'}]</span> <span className="text-yellow-400">WARN</span> Job cancelled by user</div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </AnimatedGridItemWithDelay>
                        ))}
                      </div>
                    </TabsContent>

                    <TabsContent value="queues" className="space-y-4">
                      <QueueDashboard />
                    </TabsContent>

                    <TabsContent value="workers" className="space-y-4">
                      <WorkerStatus />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </AnimatedLayout>
          </PageTransition>
        </div>
      </main>
    </div>
  </div>
)
}
