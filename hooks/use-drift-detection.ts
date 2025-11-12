/**
 * Custom hook for drift detection in documents
 * Handles WebSocket events and drift resolution workflow
 */

import { useState, useEffect, useCallback } from 'react'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface DriftAlert {
  driftRecordId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  driftCount: number
  summary?: string
  documentId?: string
  documentTitle?: string
}

interface DriftPoint {
  entityType: string
  driftType: 'added' | 'removed' | 'modified'
  description: string
  requiresApproval: boolean
}

interface ResolutionPreview {
  resolvedContent: string
  originalContent: string
  driftPoints: DriftPoint[]
  majorChanges: DriftPoint[]
  requiresApproval: boolean
  strategy: 'conservative' | 'balanced' | 'permissive'
  previewHtml?: string
}

export function useDriftDetection(documentId: string, projectId?: string) {
  const { socket, joinRoom, on, off } = useWebSocket()
  const [driftAlert, setDriftAlert] = useState<DriftAlert | null>(null)
  const [resolutionPreview, setResolutionPreview] = useState<ResolutionPreview | null>(null)
  const [isResolving, setIsResolving] = useState(false)
  const [isApplying, setIsApplying] = useState(false)

  // Join project room for drift notifications
  useEffect(() => {
    if (projectId && socket) {
      joinRoom(`project:${projectId}`)
    }
  }, [projectId, socket, joinRoom])

  // Listen for drift detection events
  useEffect(() => {
    if (!socket) return

    const handleDriftDetected = (data: any) => {
      console.log('[DRIFT] Drift detected event:', data)
      
      if (data.documentId === documentId) {
        setDriftAlert({
          driftRecordId: data.driftRecordId,
          severity: data.severity,
          driftCount: data.driftCount,
          summary: `${data.driftCount} drift point${data.driftCount > 1 ? 's' : ''} detected`,
          documentId: data.documentId,
          documentTitle: data.documentTitle
        })

        toast.warning(
          `Baseline drift detected: ${data.driftCount} change${data.driftCount > 1 ? 's' : ''}`,
          { duration: 8000 }
        )
      }
    }

    on('drift:detected', handleDriftDetected)

    return () => {
      off('drift:detected', handleDriftDetected)
    }
  }, [socket, documentId, on, off])

  // Handle "Resolve Drift" button click
  const handleResolveDrift = useCallback(async (strategy: 'conservative' | 'balanced' | 'permissive' = 'balanced') => {
    if (!driftAlert) return

    setIsResolving(true)

    try {
      console.log('[DRIFT] Requesting resolution:', {
        documentId,
        driftRecordId: driftAlert.driftRecordId,
        strategy
      })

      const result = await apiClient.resolveDrift(
        documentId,
        driftAlert.driftRecordId,
        strategy
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate resolution')
      }

      setResolutionPreview({
        resolvedContent: result.resolvedContent,
        originalContent: result.originalContent,
        driftPoints: result.driftPoints || [],
        majorChanges: result.majorChanges || [],
        requiresApproval: result.requiresApproval || false,
        strategy: result.strategy || strategy,
        previewHtml: result.previewHtml
      })

      toast.success('Resolution prepared! Review changes before applying.')
    } catch (error: any) {
      console.error('[DRIFT] Failed to generate resolution:', error)
      toast.error('Failed to prepare drift resolution: ' + (error.message || 'Unknown error'))
    } finally {
      setIsResolving(false)
    }
  }, [driftAlert, documentId])

  // Apply AI-generated resolution
  const handleApplyResolution = useCallback(async () => {
    if (!resolutionPreview || !driftAlert) return

    setIsApplying(true)

    try {
      console.log('[DRIFT] Applying resolution:', {
        documentId,
        driftRecordId: driftAlert.driftRecordId
      })

      const result = await apiClient.applyDriftResolution(
        documentId,
        driftAlert.driftRecordId,
        resolutionPreview.resolvedContent,
        resolutionPreview.majorChanges
      )

      if (!result.success) {
        throw new Error(result.error || 'Failed to apply resolution')
      }

      // Clear drift alert
      setDriftAlert(null)
      setResolutionPreview(null)

      toast.success('✅ Drift resolved! Document realigned with baseline.')

      // If major changes, show change request notification
      if (result.changeRequestCreated) {
        toast.info(`Change request created for major changes requiring approval${result.changeRequestId ? ` (CR-${result.changeRequestId})` : ''}`)
      }

      // Return success to allow caller to refresh document
      return true
    } catch (error: any) {
      console.error('[DRIFT] Failed to apply resolution:', error)
      toast.error('Failed to apply drift resolution: ' + (error.message || 'Unknown error'))
      return false
    } finally {
      setIsApplying(false)
    }
  }, [resolutionPreview, driftAlert, documentId])

  const dismissDriftAlert = useCallback(() => {
    setDriftAlert(null)
    setResolutionPreview(null)
  }, [])

  return {
    driftAlert,
    resolutionPreview,
    isResolving,
    isApplying,
    handleResolveDrift,
    handleApplyResolution,
    dismissDriftAlert
  }
}
