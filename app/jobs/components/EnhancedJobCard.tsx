"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Server,
  User,
  FileText,
  Activity,
  MoreHorizontal,
  Eye,
  Trash,
  RefreshCw,
  XCircle,
  Play,
  CheckCircle,
  Clock,
  Pause,
  AlertTriangle,
  Folder,
  Layers,
  Cpu
} from "lucide-react"

interface Job {
  id: string
  name: string
  type: string
  status: string
  progress: number
  startTime?: string
  completedTime?: string
  queuedTime?: string
  processingStartedAt?: string
  priority: string
  queue: string
  worker?: string
  workerProcessId?: number
  queuePosition?: number
  logs: string[]
  error?: string
  projectName?: string
  templateName?: string
  documentName?: string
  userName?: string
  metadata?: any
}

interface EnhancedJobCardProps {
  job: Job
  onViewDetails: () => void
  onViewLogs: () => void
  onRetry?: () => void
  onCancel?: () => void
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "running":
    case "processing":
      return <Play className="h-4 w-4" />
    case "completed":
      return <CheckCircle className="h-4 w-4" />
    case "failed":
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

export function EnhancedJobCard({ job, onViewDetails, onViewLogs, onRetry, onCancel }: EnhancedJobCardProps) {
  const isProcessing = job.status === 'processing' || job.status === 'running'
  const hasError = job.status === 'failed'
  const isQueued = job.status === 'pending' || job.status === 'queued'

  return (
    <Card className="border border-slate-200 dark:border-slate-700 hover-lift">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg border ${getStatusColor(job.status)}`}>
                {getStatusIcon(job.status)}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{job.name}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <p className="text-sm text-muted-foreground">ID: {job.id.substring(0, 13)}...</p>
                  {job.projectName && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-sm text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        {job.projectName}
                      </p>
                    </>
                  )}
                  {job.documentName && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <p className="text-sm text-purple-600 dark:text-purple-400 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {job.documentName}
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getPriorityColor(job.priority)}>
                  {job.priority}
                </Badge>
                <Badge variant="outline">{job.queue}</Badge>
              </div>
            </div>

            {/* Progress Bar */}
            {isProcessing && job.progress > 0 && job.progress < 100 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center space-x-2">
                    <Activity className="h-3 w-3 animate-pulse text-blue-500" />
                    <span>Progress</span>
                  </span>
                  <span className="font-semibold text-blue-600">{job.progress}%</span>
                </div>
                <Progress value={job.progress} className="h-2" />
              </div>
            )}

            {/* Worker & Queue Info Section */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-500" />
                Worker & Queue Info
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Queue</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {job.queue}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Worker</p>
                  <p className="font-mono text-xs mt-1 truncate" title={job.worker}>
                    {job.worker !== 'Unassigned' ? (
                      <span className="text-green-600 dark:text-green-400">
                        ✓ {job.worker.substring(0, 20)}...
                      </span>
                    ) : (
                      <span className="text-yellow-600 dark:text-yellow-400">⏳ Waiting...</span>
                    )}
                  </p>
                </div>
                {job.workerProcessId && (
                  <div>
                    <p className="text-muted-foreground text-xs">Process ID</p>
                    <code className="text-xs mt-1 block text-blue-600 dark:text-blue-400">
                      {job.workerProcessId}
                    </code>
                  </div>
                )}
                {job.queuePosition !== undefined && job.queuePosition !== null && (
                  <div>
                    <p className="text-muted-foreground text-xs">Position</p>
                    <p className="font-medium mt-1 text-xs">
                      {job.queuePosition === 0 ? (
                        <span className="text-blue-600 dark:text-blue-400">⚡ Processing</span>
                      ) : (
                        <span className="text-yellow-600 dark:text-yellow-400">#{job.queuePosition} in queue</span>
                      )}
                    </p>
                  </div>
                )}
                {job.processingStartedAt && (
                  <div>
                    <p className="text-muted-foreground text-xs">Processing Since</p>
                    <p className="font-medium mt-1 text-xs">
                      {new Date(job.processingStartedAt).toLocaleTimeString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Project Context Section */}
            {(job.projectName || job.templateName || job.userName) && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-blue-500" />
                  Project Context
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {job.projectName && (
                    <div>
                      <p className="text-muted-foreground text-xs">Project</p>
                      <p className="font-medium mt-1 truncate flex items-center gap-1" title={job.projectName}>
                        <Folder className="h-3 w-3 text-blue-500" />
                        <span>{job.projectName}</span>
                      </p>
                    </div>
                  )}
                  {job.templateName && (
                    <div>
                      <p className="text-muted-foreground text-xs">Template</p>
                      <p className="font-medium mt-1 truncate flex items-center gap-1" title={job.templateName}>
                        <Layers className="h-3 w-3 text-purple-500" />
                        <span>{job.templateName}</span>
                      </p>
                    </div>
                  )}
                  {job.userName && (
                    <div>
                      <p className="text-muted-foreground text-xs">Initiated By</p>
                      <p className="font-medium mt-1 flex items-center gap-1 truncate" title={job.userName}>
                        <User className="h-3 w-3 text-green-500" />
                        <span>{job.userName}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {hasError && job.error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-sm text-red-700 dark:text-red-300">{job.error}</p>
                </div>
              </div>
            )}

            {/* Basic Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Started</p>
                <p className="font-medium mt-1">
                  {job.startTime
                    ? new Date(job.startTime).toLocaleTimeString()
                    : job.queuedTime
                    ? new Date(job.queuedTime).toLocaleTimeString()
                    : "Not started"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Type</p>
                <p className="font-medium mt-1 capitalize">{job.type.replace("_", " ").replace("-", " ")}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <Badge variant="outline" className={`${getStatusColor(job.status)} mt-1`}>
                  {job.status}
                </Badge>
              </div>
              {job.completedTime && (
                <div>
                  <p className="text-muted-foreground text-xs">Completed</p>
                  <p className="font-medium mt-1">
                    {new Date(job.completedTime).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewLogs}>
                <FileText className="h-4 w-4 mr-2" />
                View Logs
              </DropdownMenuItem>
              {(hasError || isProcessing) && onRetry && (
                <DropdownMenuItem onClick={onRetry}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {isProcessing ? "Retry Stuck Job" : "Retry Job"}
                </DropdownMenuItem>
              )}
              {(isQueued || isProcessing) && onCancel && (
                <DropdownMenuItem onClick={onCancel} className="text-red-600">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Job
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedJobCard

