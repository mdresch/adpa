/**
 * Custom hook for document regeneration with AI
 * Handles API calls, WebSocket subscription, and state management
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { apiClient } from '@/lib/api'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { toast } from '@/lib/notify'

interface RegenerationProgress {
  jobId: string
  progress: number
  message: string
}

interface RegenerationParams {
  documentId: string
  templateId?: string
  provider: string
  model?: string
  versionType: 'patch' | 'minor' | 'major'
  temperature?: number
  max_tokens?: number
}

interface RegenerationResult {
  versionId: string
  versionNumber: string
}

interface JobResponse {
  id: string
  progress?: number
  status: string
  progress_message?: string
  new_version_id?: string
  error_message?: string
  metadata?: {
    versionNumber?: string
  }
}

interface UseDocumentRegenerationReturn {
  regenerate: (params: RegenerationParams) => Promise<void>
  progress: RegenerationProgress | null
  isRegenerating: boolean
  error: string | null
  result: RegenerationResult | null
  reset: () => void
}

export function useDocumentRegeneration(): UseDocumentRegenerationReturn {
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [progress, setProgress] = useState<RegenerationProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RegenerationResult | null>(null)
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  
  const { socket } = useWebSocket()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Poll for job status (fallback if WebSocket fails)
  const pollJobStatus = useCallback(async (jobId: string) => {
    try {
      const response = await apiClient.request<{ job: JobResponse }>(
        `/document-generation/regenerate/job/${jobId}`
      )

      if (response.job) {
        const job = response.job
        
        setProgress({
          jobId: job.id,
          progress: job.progress || 0,
          message: job.progress_message || 'Processing...'
        })

        if (job.status === 'completed') {
          setResult({
            versionId: job.new_version_id,
            versionNumber: job.version_number || 'new version'
          })
          setIsRegenerating(false)
          setProgress(null)
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          
          toast.success('Document regenerated successfully!')
        } else if (job.status === 'failed') {
          setError(job.error_message || 'Regeneration failed')
          setIsRegenerating(false)
          setProgress(null)
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }
          
          toast.error(job.error_message || 'Regeneration failed')
        }
      }
    } catch (err) {
      console.error('Failed to poll job status:', err)
    }
  }, [])

  // Handle WebSocket events
  useEffect(() => {
    if (!socket || !currentJobId) return

    const handleProgress = (data: any) => {
      if (data.jobId === currentJobId) {
        setProgress({
          jobId: data.jobId,
          progress: data.progress,
          message: data.message
        })
      }
    }

    const handleCompleted = (data: any) => {
      if (data.jobId === currentJobId) {
        setResult({
          versionId: data.versionId,
          versionNumber: data.versionNumber
        })
        setIsRegenerating(false)
        setProgress(null)
        setCurrentJobId(null)
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        
        toast.success(`Version ${data.versionNumber} created successfully!`)
      }
    }

    const handleFailed = (data: any) => {
      if (data.jobId === currentJobId) {
        setError(data.error)
        setIsRegenerating(false)
        setProgress(null)
        setCurrentJobId(null)
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
          pollingIntervalRef.current = null
        }
        
        toast.error(data.error || 'Regeneration failed')
      }
    }

    socket.on('document:regeneration:progress', handleProgress)
    socket.on('document:regeneration:completed', handleCompleted)
    socket.on('document:regeneration:failed', handleFailed)

    return () => {
      socket.off('document:regeneration:progress', handleProgress)
      socket.off('document:regeneration:completed', handleCompleted)
      socket.off('document:regeneration:failed', handleFailed)
    }
  }, [socket, currentJobId])

  // Regenerate document
  const regenerate = useCallback(async (params: RegenerationParams) => {
    try {
      setIsRegenerating(true)
      setError(null)
      setResult(null)
      setProgress({
        jobId: '',
        progress: 0,
        message: 'Starting regeneration...'
      })

      const response = await apiClient.request<{ jobId: string; message: string }>(
        `/document-generation/regenerate/${params.documentId}`,
        {
          method: 'POST',
          body: JSON.stringify({
            templateId: params.templateId,
            provider: params.provider,
            model: params.model,
            versionType: params.versionType,
            temperature: params.temperature || 0.7,
            max_tokens: params.max_tokens || 8000
          })
        }
      )

      if (response.jobId) {
        setCurrentJobId(response.jobId)
        setProgress({
          jobId: response.jobId,
          progress: 0,
          message: 'Queued for processing...'
        })

        // Start polling as fallback
        pollingIntervalRef.current = setInterval(() => {
          void pollJobStatus(response.jobId)
        }, 3000) // Poll every 3 seconds

        toast.info('Regeneration started')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start regeneration'
      setError(errorMessage)
      setIsRegenerating(false)
      setProgress(null)
      toast.error(errorMessage)
    }
  }, [pollJobStatus])

  // Reset state
  const reset = useCallback(() => {
    setIsRegenerating(false)
    setProgress(null)
    setError(null)
    setResult(null)
    setCurrentJobId(null)
    
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  return {
    regenerate,
    progress,
    isRegenerating,
    error,
    result,
    reset
  }
}

