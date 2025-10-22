"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"

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
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket, useJobUpdates } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"

// Extend Job type to include 'name' property for compatibility with mockJobs and API jobs
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
  projectName?: string
  documentName?: string
  metadata?: any
}
import { toast } from "sonner"

// Mock data for jobs
const mockJobs = [
  {
    id: "job-001",
    name: "Document Generation - Project Alpha",
    type: "document_generation",
    status: "running",
    progress: 65,
    startTime: "2024-01-20T10:30:00Z",
    estimatedCompletion: "2024-01-20T11:15:00Z",
    priority: "high",
    queue: "documents",
    worker: "worker-01",
    logs: ["Started document generation", "Processing templates", "Generating content..."],
  },
  {
    id: "job-002",
    name: "AI Analysis - Requirements Review",
    type: "ai_analysis",
    status: "completed",
    progress: 100,
    startTime: "2024-01-20T09:45:00Z",
    completedTime: "2024-01-20T10:20:00Z",
    priority: "medium",
    queue: "ai_processing",
    worker: "worker-02",
    logs: ["Analysis started", "Processing requirements", "Analysis completed successfully"],
  },
  {
    id: "job-003",
    name: "Data Export - User Reports",
    type: "data_export",
    status: "failed",
    progress: 45,
    startTime: "2024-01-20T08:15:00Z",
    failedTime: "2024-01-20T08:45:00Z",
    priority: "low",
    queue: "exports",
    worker: "worker-03",
    error: "Database connection timeout",
    logs: ["Export started", "Querying database", "Error: Connection timeout"],
  },
  {
    id: "job-004",
    name: "Template Compilation",
    type: "template_processing",
    status: "queued",
    progress: 0,
    queuedTime: "2024-01-20T10:45:00Z",
    priority: "medium",
    queue: "templates",
    logs: ["Job queued for processing"],
  },
  {
    id: "job-005",
    name: "System Backup",
    type: "system_backup",
    status: "running",
    progress: 30,
    startTime: "2024-01-20T10:00:00Z",
    estimatedCompletion: "2024-01-20T12:00:00Z",
    priority: "high",
    queue: "system",
    worker: "worker-04",
    logs: ["Backup started", "Archiving documents", "Processing user data..."],
  },
]

const mockQueues = [
  {
    name: "documents",
    active: 3,
    waiting: 7,
    completed: 145,
    failed: 2,
    workers: 2,
    avgProcessingTime: "8m 32s",
  },
  {
    name: "ai_processing",
    active: 1,
    waiting: 12,
    completed: 89,
    failed: 5,
    workers: 3,
    avgProcessingTime: "15m 45s",
  },
  {
    name: "exports",
    active: 0,
    waiting: 3,
    completed: 67,
    failed: 8,
    workers: 1,
    avgProcessingTime: "5m 12s",
  },
  {
    name: "templates",
    active: 2,
    waiting: 5,
    completed: 234,
    failed: 1,
    workers: 2,
    avgProcessingTime: "3m 28s",
  },
  {
    name: "system",
    active: 1,
    waiting: 0,
    completed: 45,
    failed: 0,
    workers: 1,
    avgProcessingTime: "45m 12s",
  },
]

const mockWorkers = [
  {
    id: "worker-01",
    name: "Document Worker 1",
    status: "active",
    currentJob: "job-001",
    queue: "documents",
    uptime: "2d 14h 32m",
    jobsCompleted: 156,
    cpu: 45,
    memory: 68,
  },
  {
    id: "worker-02",
    name: "AI Processing Worker",
    status: "active",
    currentJob: "job-002",
    queue: "ai_processing",
    uptime: "1d 8h 15m",
    jobsCompleted: 89,
    cpu: 72,
    memory: 84,
  },
  {
    id: "worker-03",
    name: "Export Worker",
    status: "idle",
    currentJob: null,
    queue: "exports",
    uptime: "3d 2h 45m",
    jobsCompleted: 234,
    cpu: 12,
    memory: 35,
  },
  {
    id: "worker-04",
    name: "System Worker",
    status: "active",
    currentJob: "job-005",
    queue: "system",
    uptime: "5d 12h 8m",
    jobsCompleted: 67,
    cpu: 38,
    memory: 52,
  },
]

const getStatusIcon = (status: string) => {
  switch (status) {
    case "running":
      return <Play className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "failed":
      return <XCircle className="h-4 w-4" />
    case "queued":
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
      return "bg-blue-500/10 text-blue-600 border-blue-200"
    case "completed":
      return "bg-green-500/10 text-green-600 border-green-200"
    case "failed":
      return "bg-red-500/10 text-red-600 border-red-200"
    case "queued":
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
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()
  const jobUpdates = useJobUpdates()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedJob, setSelectedJob] = useState<string | null>(null)
  const [selectedWorker, setSelectedWorker] = useState<string | null>(null)
  const [viewingLogs, setViewingLogs] = useState<string | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [queues, setQueues] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [metrics, setMetrics] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [loadingQueues, setLoadingQueues] = useState(true)
  const [loadingWorkers, setLoadingWorkers] = useState(true)

  // Fetch jobs
  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await apiClient.getJobs({ limit: 50 })
        setJobs(
          response.jobs.map((job: any) => ({
            ...job, // Spread all job fields first
            name: job.name ?? "", // Then set defaults only if missing
            priority: job.priority ?? "medium",
            queue: job.queue ?? "",
            logs: job.logs ?? [],
            // Extract project and document names from metadata to top level
            projectName: job.metadata?.project_name || job.projectName,
            documentName: job.metadata?.document_name || job.documentName,
            metadata: {
              ...(job.metadata || {}), // Preserve existing metadata
              // Ensure progress fields are included
              currentStep: job.metadata?.currentStep,
              compressionProgress: job.metadata?.compressionProgress,
              currentDocument: job.metadata?.currentDocument,
              providerAssignments: job.metadata?.providerAssignments || []
            }
          }))
        )
      } catch (error) {
        console.error("Failed to fetch jobs:", error)
        toast.error("Failed to load jobs")
      } finally {
        setLoading(false)
      }
    }

    fetchJobs()

    // Refresh every 30 seconds
    const interval = setInterval(fetchJobs, 30000)
    return () => clearInterval(interval)
  }, [])

  // Fetch queue statistics
  useEffect(() => {
    const fetchQueues = async () => {
      try {
        const response = await apiClient.request('/queue-stats/overview', { suppressNotFoundError: true } as any)
        setQueues(response.queues || [])
      } catch (error: any) {
        // Gracefully fallback to mock data if stats endpoint unavailable
        if (error?.status !== 404 && error?.message !== 'Failed to fetch') {
        console.error("Failed to fetch queue stats:", error)
        }
        setQueues(mockQueues) // Fallback to mock
      } finally {
        setLoadingQueues(false)
      }
    }

    fetchQueues()

    // Refresh every 10 seconds (more frequent for queue stats)
    const interval = setInterval(fetchQueues, 10000)
    return () => clearInterval(interval)
  }, [])

  // Fetch worker statistics
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const response = await apiClient.request('/queue-stats/workers', { suppressNotFoundError: true } as any)
        setWorkers(response.workers || [])
      } catch (error: any) {
        // Gracefully fallback to mock data if stats endpoint unavailable
        if (error?.status !== 404 && error?.message !== 'Failed to fetch') {
        console.error("Failed to fetch worker stats:", error)
        }
        setWorkers(mockWorkers) // Fallback to mock
      } finally {
        setLoadingWorkers(false)
      }
    }

    fetchWorkers()

    // Refresh every 5 seconds (real-time worker status)
    const interval = setInterval(fetchWorkers, 5000)
    return () => clearInterval(interval)
  }, [])

  // Fetch aggregate metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await apiClient.request('/queue-stats/metrics', { suppressNotFoundError: true } as any)
        setMetrics(response)
      } catch (error: any) {
        // Gracefully handle unavailable metrics endpoint
        if (error?.status !== 404 && error?.message !== 'Failed to fetch') {
        console.error("Failed to fetch queue metrics:", error)
        }
      }
    }

    fetchMetrics()

    // Refresh every 15 seconds
    const interval = setInterval(fetchMetrics, 15000)
    return () => clearInterval(interval)
  }, [])

  // Update jobs with real-time data from WebSocket
  useEffect(() => {
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

  // Listen for real-time job progress updates
  useEffect(() => {
    const socket = apiClient.getSocket()
    
    if (socket) {
      // Listen for job progress updates
      socket.on('job:status', (data: any) => {
        setJobs(prevJobs =>
          prevJobs.map(job =>
            job.id === data.jobId
              ? {
                  ...job,
                  status: data.status,
                  progress: data.progress || job.progress
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
                  completedTime: new Date().toISOString()
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
                    parallelCount: data.parallelCount || 0
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
        socket.off('job:step-update')
      }
    }
  }, [])

  const filteredJobs = (jobs.length > 0 ? jobs : mockJobs).filter((job) => {
    const matchesSearch = (job.name || job.id).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || job.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Calculate stats from real data or metrics
  const stats = {
    totalJobs: metrics.totalJobs || jobs.length,
    runningJobs: metrics.totalActive || jobs.filter((j) => j.status === "processing").length,
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
                          const result = await apiClient.request('POST', '/jobs/cleanup') as any
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

                {/* Real-Time Active Jobs Status Bar */}
                {jobs.filter(j => j.status === 'processing' || j.status === 'running').length > 0 && (
                  <Card className="glass border-0 shadow-lg border-l-4 border-l-blue-500 animate-fade-in">
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2 text-lg">
                        <Activity className="h-5 w-5 text-blue-500 animate-pulse" />
                        <span>Active Jobs in Progress</span>
                        <Badge className="bg-blue-500">{jobs.filter(j => j.status === 'processing' || j.status === 'running').length}</Badge>
                      </CardTitle>
                      <CardDescription>Real-time progress tracking with live updates</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {jobs
                        .filter(j => (j.status === 'processing' || j.status === 'running') && j.progress >= 0)
                        .map(job => (
                          <div key={job.id} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 transition-all duration-300">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-semibold text-sm">{job.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {job.worker !== 'Unassigned' ? `Worker: ${job.worker.substring(0, 25)}...` : '⏳ Waiting for worker assignment...'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-blue-600">{job.progress}%</p>
                                <p className="text-xs text-muted-foreground font-medium">
                                  {job.progress <= 10 && "⚡ Starting job..."}
                                  {job.progress > 10 && job.progress <= 30 && "📚 Gathering context..."}
                                  {job.progress > 30 && job.progress <= 50 && "🤖 AI generating..."}
                                  {job.progress > 50 && job.progress <= 90 && "⚙️ Processing..."}
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
                        <div className="space-y-4">
                          {filteredJobs.map((job, index) => (
                            <AnimatedGridItemWithDelay
                              key={job.id}
                              className="animate-fade-in-up"
                              animationDelay={index * 100}
                            >
                              <Card className="border border-slate-200 dark:border-slate-700 hover-lift">
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
                                            {job.progress > 30 && job.progress <= 50 && "AI generating content..."}
                                            {job.progress > 50 && job.progress <= 90 && "Processing response..."}
                                            {job.progress > 90 && job.progress < 100 && "Finalizing..."}
                                              </>
                                            )}
                                          </p>
                                          
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
                                        {(job.status === "failed" || job.status === "processing") && (
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
                                            {job.status === "processing" ? "Retry Stuck Job" : "Retry Job"}
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
                        {loadingQueues && queues.length === 0 ? (
                          <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground mt-2">Loading queue statistics...</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(queues.length > 0 ? queues : mockQueues).map((queue, index) => (
                            <AnimatedGridItemWithDelay
                              key={queue.name}
                              className="animate-fade-in-up"
                              animationDelay={index * 100}
                            >
                              <Card>
                                <CardHeader>
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg capitalize">{queue.name.replace("_", " ")}</CardTitle>
                                    <Badge variant="outline">{queue.workers} workers</Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                      <p className="text-2xl font-bold text-blue-600">{queue.active}</p>
                                      <p className="text-sm text-muted-foreground">Active</p>
                                    </div>
                                    <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                                      <p className="text-2xl font-bold text-yellow-600">{queue.waiting}</p>
                                      <p className="text-sm text-muted-foreground">Waiting</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                      <p className="text-2xl font-bold text-green-600">{queue.completed}</p>
                                      <p className="text-sm text-muted-foreground">Completed</p>
                                    </div>
                                    <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                      <p className="text-2xl font-bold text-red-600">{queue.failed}</p>
                                      <p className="text-sm text-muted-foreground">Failed</p>
                                    </div>
                                  </div>
                                  <div className="pt-2 border-t">
                                    <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                                    <p className="font-semibold">{queue.avgProcessingTime}</p>
                                  </div>
                                </CardContent>
                              </Card>
                            </AnimatedGridItemWithDelay>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="workers" className="space-y-4">
                        {loadingWorkers && workers.length === 0 ? (
                          <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                            <p className="text-muted-foreground mt-2">Loading worker statistics...</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {(workers.length > 0 ? workers : mockWorkers).map((worker, index) => (
                            <AnimatedGridItemWithDelay
                              key={worker.id}
                              className="animate-fade-in-up"
                              animationDelay={index * 100}
                            >
                              <Card>
                                <CardContent className="p-6">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 space-y-4">
                                      <div className="flex items-center space-x-3">
                                        <div
                                          className={`p-2 rounded-lg border ${
                                            worker.status === "active"
                                              ? "bg-green-500/10 text-green-600 border-green-200"
                                              : "bg-gray-500/10 text-gray-600 border-gray-200"
                                          }`}
                                        >
                                          <Server className="h-4 w-4" />
                                        </div>
                                        <div>
                                          <h3 className="font-semibold text-lg">{worker.name}</h3>
                                          <p className="text-sm text-muted-foreground">ID: {worker.id}</p>
                                        </div>
                                        <Badge
                                          variant="outline"
                                          className={
                                            worker.status === "active"
                                              ? "bg-green-500/10 text-green-600 border-green-200"
                                              : "bg-gray-500/10 text-gray-600 border-gray-200"
                                          }
                                        >
                                          {worker.status}
                                        </Badge>
                                      </div>

                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                        <div>
                                          <p className="text-muted-foreground">Queue</p>
                                          <p className="font-medium">{worker.queue}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Current Job</p>
                                          <p className="font-medium">{worker.currentJob || "None"}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Uptime</p>
                                          <p className="font-medium">{worker.uptime}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Jobs Completed</p>
                                          <p className="font-medium">{worker.jobsCompleted}</p>
                                        </div>
                                        <div>
                                          <p className="text-muted-foreground">Performance</p>
                                          <div className="flex items-center space-x-2">
                                            <Cpu className="h-3 w-3" />
                                            <span className="text-xs">{worker.cpu}%</span>
                                            <Memory className="h-3 w-3" />
                                            <span className="text-xs">{worker.memory}%</span>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center space-x-1">
                                              <Cpu className="h-3 w-3" />
                                              <span>CPU Usage</span>
                                            </span>
                                            <span>{worker.cpu}%</span>
                                          </div>
                                          <Progress value={worker.cpu} className="h-2" />
                                        </div>
                                        <div className="space-y-2">
                                          <div className="flex items-center justify-between text-sm">
                                            <span className="flex items-center space-x-1">
                                              <Memory className="h-3 w-3" />
                                              <span>Memory Usage</span>
                                            </span>
                                            <span>{worker.memory}%</span>
                                          </div>
                                          <Progress value={worker.memory} className="h-2" />
                                        </div>
                                      </div>
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
                                            setSelectedWorker(prev => (prev === worker.id ? null : worker.id))
                                          }}
                                        >
                                          <Eye className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onSelect={(e) => {
                                            e.preventDefault()
                                            // Navigate to filtered jobs view for this queue
                                            const queueType = worker.queue
                                            toast.info(`Showing jobs for ${worker.name}`)
                                          }}
                                        >
                                          <FileText className="h-4 w-4 mr-2" />
                                          View Queue Jobs
                                        </DropdownMenuItem>
                                        <DropdownMenuItem disabled className="text-muted-foreground">
                                          <AlertCircle className="h-4 w-4 mr-2" />
                                          Worker controls unavailable
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                  
                                  {/* Worker Details Section (expandable) */}
                                  {selectedWorker === worker.id && (
                                    <div className="mt-4 rounded-lg border-t border-slate-200 dark:border-slate-700 pt-4">
                                      <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                          <h4 className="font-semibold text-sm">Worker Details</h4>
                                          <Badge variant={worker.health === 'healthy' ? 'default' : worker.health === 'degraded' ? 'secondary' : 'destructive'}>
                                            {worker.health || 'unknown'}
                                          </Badge>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                          <div>
                                            <p className="text-muted-foreground">Queue Type</p>
                                            <p className="font-medium">{worker.queue}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Concurrency Limit</p>
                                            <p className="font-medium">{worker.maxLoad || worker.concurrency} jobs</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Current Load</p>
                                            <p className="font-medium">{worker.currentLoad || 0}/{worker.maxLoad || worker.concurrency}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Success Rate</p>
                                            <p className={`font-medium ${(worker.successRate || 0) >= 90 ? 'text-green-600' : (worker.successRate || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                                              {worker.successRate || 0}%
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Jobs Processed</p>
                                            <p className="font-medium">{(worker.jobsProcessed || 0).toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Jobs Failed</p>
                                            <p className="font-medium text-red-600">{worker.jobsFailed || 0}</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Queue Waiting</p>
                                            <p className="font-medium">{worker.queueSize || 0} jobs</p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Uptime</p>
                                            <p className="font-medium">
                                              {worker.uptime ? `${Math.floor(worker.uptime / 3600)}h ${Math.floor((worker.uptime % 3600) / 60)}m` : 'N/A'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-muted-foreground">Utilization</p>
                                            <p className="font-medium">{worker.utilization || 0}%</p>
                                          </div>
                                        </div>
                                        
                                        {/* Current Tasks */}
                                        {worker.currentTasks && worker.currentTasks.length > 0 && (
                                          <div className="space-y-2">
                                            <p className="font-semibold text-sm flex items-center gap-2">
                                              <Activity className="h-4 w-4 text-blue-500 animate-pulse" />
                                              Active Tasks ({worker.currentTasks.length})
                                            </p>
                                            <div className="space-y-2">
                                              {worker.currentTasks.map((task: any, idx: number) => (
                                                <div key={idx} className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                                                  <div className="flex items-center justify-between">
                                                    <span className="font-medium text-sm">{task.type || 'Unknown Task'}</span>
                                                    {task.progress > 0 && (
                                                      <Badge variant="secondary" className="text-xs">
                                                        {task.progress}%
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  <p className="text-xs text-muted-foreground mt-1">
                                                    Job ID: <code className="text-xs bg-slate-200 dark:bg-slate-800 px-1 rounded">{task.jobId?.substring(0, 13)}...</code>
                                                  </p>
                                                  {task.startedAt && (
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                      Started: {new Date(task.startedAt).toLocaleTimeString()}
                                                    </p>
                                                  )}
                                                  {task.progress > 0 && (
                                                    <Progress value={task.progress} className="h-1.5 mt-2" />
                                                  )}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                        
                                        {(!worker.currentTasks || worker.currentTasks.length === 0) && worker.status === 'idle' && (
                                          <div className="text-center py-4 text-sm text-muted-foreground">
                                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p>Worker is idle - waiting for jobs</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </AnimatedGridItemWithDelay>
                            ))}
                          </div>
                        )}
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
