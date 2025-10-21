'use client'

import { useState, useEffect, useCallback } from 'react'
import { getApiBaseUrl } from '@/lib/api-url'

interface PipelineJob {
  jobId: string
  requestId: string
  templateId: string
  projectId: string
  userId: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  progress: number
  currentStage?: string
  stages: any[]
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
  totalDuration?: number
  overallQualityScore?: number
  error?: string
}

interface PipelineRequest {
  templateId: string
  projectId: string
  userId: string
  contextBundle?: any
  processingConfig?: any
  enhancementConfig?: any
  qualityConfig?: any
  outputConfig?: {
    primary_format?: string
    secondary_formats?: string[]
    include_metadata?: boolean
  }
}

export function usePipelineAPI() {
  const [jobs, setJobs] = useState<PipelineJob[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Start pipeline processing
  const startPipeline = useCallback(async (request: PipelineRequest): Promise<PipelineJob> => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const job = result.data
      
      // Convert dates
      job.createdAt = new Date(job.createdAt)
      if (job.startedAt) job.startedAt = new Date(job.startedAt)
      if (job.completedAt) job.completedAt = new Date(job.completedAt)

      setJobs(prev => [job, ...prev])
      return job

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start pipeline'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get job status
  const getJobStatus = useCallback(async (jobId: string): Promise<PipelineJob> => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/job/${jobId}/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const job = result.data
      
      // Convert dates
      job.createdAt = new Date(job.createdAt)
      if (job.startedAt) job.startedAt = new Date(job.startedAt)
      if (job.completedAt) job.completedAt = new Date(job.completedAt)

      // Update job in state
      setJobs(prev => prev.map(j => j.jobId === jobId ? job : j))
      
      return job

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get job status'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Cancel job
  const cancelJob = useCallback(async (jobId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/job/${jobId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Update job status in state
      setJobs(prev => prev.map(j => 
        j.jobId === jobId 
          ? { ...j, status: 'cancelled' as const }
          : j
      ))

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel job'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Get all jobs
  const getJobs = useCallback(async (): Promise<PipelineJob[]> => {
    setIsLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/jobs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      const jobs = result.data || []
      
      // Convert dates
      const processedJobs = jobs.map((job: any) => ({
        ...job,
        createdAt: new Date(job.createdAt),
        startedAt: job.startedAt ? new Date(job.startedAt) : undefined,
        completedAt: job.completedAt ? new Date(job.completedAt) : undefined,
      }))

      setJobs(processedJobs)
      return processedJobs

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get jobs'
      setError(errorMessage)
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Get pipeline metrics
  const getPipelineMetrics = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/metrics`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get pipeline metrics'
      setError(errorMessage)
      return null
    }
  }, [])

  // Get stage details
  const getStageDetails = useCallback(async (jobId: string, stageId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/job/${jobId}/stage/${stageId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get stage details'
      setError(errorMessage)
      return null
    }
  }, [])

  // Retry stage
  const retryStage = useCallback(async (jobId: string, stageId: string): Promise<void> => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/job/${jobId}/stage/${stageId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      // Refresh job status
      await getJobStatus(jobId)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to retry stage'
      setError(errorMessage)
      throw err
    }
  }, [getJobStatus])

  // Get job logs
  const getJobLogs = useCallback(async (jobId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/job/${jobId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get job logs'
      setError(errorMessage)
      return null
    }
  }, [])

  // Get stage logs
  const getStageLogs = useCallback(async (jobId: string, stageId: string) => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/job/${jobId}/stage/${stageId}/logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get stage logs'
      setError(errorMessage)
      return null
    }
  }, [])

  // Export job results
  const exportJobResults = useCallback(async (jobId: string, format: string = 'json') => {
    try {
      const token = localStorage.getItem('auth_token')
      const response = await fetch(`${getApiBaseUrl()}/pipeline/job/${jobId}/export?format=${format}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pipeline-job-${jobId}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to export job results'
      setError(errorMessage)
      throw err
    }
  }, [])

  // Poll job status (for real-time updates)
  const pollJobStatus = useCallback((jobId: string, interval: number = 1000) => {
    const poll = async () => {
      try {
        await getJobStatus(jobId)
      } catch (err) {
        console.error('Failed to poll job status:', err)
      }
    }

    // Poll immediately on start, then at interval
    poll()
    const intervalId = setInterval(poll, interval)
    
    return () => clearInterval(intervalId)
  }, [getJobStatus])

  // Load jobs on mount
  useEffect(() => {
    getJobs()
  }, [getJobs])

  return {
    jobs,
    isLoading,
    error,
    startPipeline,
    getJobStatus,
    cancelJob,
    getJobs,
    getPipelineMetrics,
    getStageDetails,
    retryStage,
    getJobLogs,
    getStageLogs,
    exportJobResults,
    pollJobStatus,
  }
}

