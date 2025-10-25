'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Activity,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Pause,
  Square,
  RefreshCw,
  Settings,
  Download,
  Eye,
  Zap,
  Target,
  Shield,
  Brain,
  FileText,
  Database
} from 'lucide-react'

interface PipelineDashboardProps {
  jobs: any[]
  selectedJob: any
  isProcessing: boolean
  onStartPipeline: () => void
  onStopPipeline: () => void
  onJobSelect: (job: any) => void
}

export function PipelineDashboard({
  jobs,
  selectedJob,
  isProcessing,
  onStartPipeline,
  onStopPipeline,
  onJobSelect
}: PipelineDashboardProps) {
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    totalJobs: 0,
    successfulJobs: 0,
    failedJobs: 0,
    averageProcessingTime: 0,
    averageQualityScore: 0,
    currentThroughput: 0
  })

  useEffect(() => {
    // Calculate real-time metrics
    const metrics = {
      totalJobs: jobs.length,
      successfulJobs: jobs.filter(job => job.status === 'completed').length,
      failedJobs: jobs.filter(job => job.status === 'failed').length,
      averageProcessingTime: jobs.length > 0 
        ? jobs.reduce((sum, job) => sum + (job.totalDuration || 0), 0) / jobs.length 
        : 0,
      averageQualityScore: jobs.length > 0 
        ? jobs.reduce((sum, job) => sum + (job.overallQualityScore || 0), 0) / jobs.length 
        : 0,
      currentThroughput: jobs.filter(job => 
        job.status === 'running' || 
        (job.completedAt && new Date().getTime() - job.completedAt.getTime() < 60000)
      ).length
    }

    setRealTimeMetrics(metrics)
  }, [jobs])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getStageIcon = (stageId: string) => {
    switch (stageId) {
      case 'context_gathering':
        return <Database className="h-4 w-4" />
      case 'template_processing':
        return <FileText className="h-4 w-4" />
      case 'ai_generation':
        return <Brain className="h-4 w-4" />
      case 'context_injection':
        return <Target className="h-4 w-4" />
      case 'quality_assurance':
        return <Shield className="h-4 w-4" />
      case 'output_formatting':
        return <Download className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'pending':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold">{realTimeMetrics.totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Successful</p>
                <p className="text-2xl font-bold">{realTimeMetrics.successfulJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <XCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold">{realTimeMetrics.failedJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Quality</p>
                <p className="text-2xl font-bold">
                  {(realTimeMetrics.averageQualityScore * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Job Status */}
      {selectedJob && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Current Job Status</span>
            </CardTitle>
            <CardDescription>
              Job {selectedJob.jobId.slice(-8)} • Template: {selectedJob.templateId} • Project: {selectedJob.projectId}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Overall Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Overall Progress</span>
                  <span className="text-lg font-semibold">{selectedJob.progress.toFixed(1)}%</span>
                </div>
                <Progress value={selectedJob.progress} className="h-3" />
              </div>

              {/* Stage Progress */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedJob.stages.map((stage: any) => (
                  <div key={stage.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getStageIcon(stage.id)}
                        <span className="font-medium text-sm">{stage.name}</span>
                      </div>
                      <Badge className={getStatusColor(stage.status)}>
                        {stage.status}
                      </Badge>
                    </div>
                    <Progress value={stage.progress} className="h-2 mb-2" />
                    {stage.qualityScore && (
                      <div className="text-xs text-gray-600">
                        Quality: {(stage.qualityScore * 100).toFixed(1)}%
                      </div>
                    )}
                    {stage.duration && (
                      <div className="text-xs text-gray-600">
                        Duration: {formatDuration(stage.duration)}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Job Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedJob.stages.filter((s: any) => s.status === 'completed').length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {selectedJob.stages.filter((s: any) => s.status === 'running').length}
                  </div>
                  <div className="text-sm text-gray-600">Running</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {selectedJob.stages.filter((s: any) => s.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedJob.stages.filter((s: any) => s.status === 'failed').length}
                  </div>
                  <div className="text-sm text-gray-600">Failed</div>
                </div>
              </div>

              {/* Quality and Duration */}
              {selectedJob.overallQualityScore && (
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Overall Quality Score</span>
                  <span className="text-lg font-semibold text-green-600">
                    {(selectedJob.overallQualityScore * 100).toFixed(1)}%
                  </span>
                </div>
              )}

              {selectedJob.totalDuration && (
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold">Total Duration</span>
                  <span className="text-lg font-semibold">
                    {formatDuration(selectedJob.totalDuration)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Pipeline Controls</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <Button
              onClick={onStartPipeline}
              disabled={isProcessing}
              className="flex items-center space-x-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Start Pipeline</span>
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={onStopPipeline}
              disabled={!isProcessing}
              className="flex items-center space-x-2"
            >
              <Square className="h-4 w-4" />
              <span>Stop Pipeline</span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </Button>

            <Button
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Export Results</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5" />
            <span>Recent Jobs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No processing jobs yet</p>
                <p className="text-sm text-gray-500">Click "Start Pipeline" to begin processing</p>
              </div>
            ) : (
              jobs.slice(0, 5).map((job) => (
                <div 
                  key={job.jobId} 
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedJob?.jobId === job.jobId ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => onJobSelect(job)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        {job.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {job.status === 'running' && <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />}
                        {job.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                        {job.status === 'pending' && <Clock className="h-4 w-4 text-gray-500" />}
                      </div>
                      <div>
                        <h3 className="font-semibold">Job {job.jobId.slice(-8)}</h3>
                        <p className="text-sm text-gray-600">
                          Template: {job.templateId} • Project: {job.projectId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className={getStatusColor(job.status)}>
                        {job.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">
                        {job.createdAt.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>Progress</span>
                      <span>{job.progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={job.progress} className="h-2" />
                  </div>

                  {job.overallQualityScore && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span>Quality Score</span>
                      <span className="font-semibold">
                        {(job.overallQualityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {job.totalDuration && (
                    <div className="mt-1 flex items-center justify-between text-sm">
                      <span>Duration</span>
                      <span>{formatDuration(job.totalDuration)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Pipeline Engine</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">AI Services</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Database</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Context Repository</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

