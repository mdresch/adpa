"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, RefreshCw, CheckCircle } from '@/components/ui/icons-shim'
import { toast } from '@/lib/notify'
import { getApiUrl } from '@/lib/api-url'

interface ResourceConflict {
  resourceId: string
  resourceName: string
  conflictingProjects: number
  totalAllocation: number
  conflictSeverity: 'over-allocated' | 'near-capacity' | 'ok'
  projectIds?: string[]
}

interface ResourceConflictsViewProps {
  programId: string
  onRefresh?: () => void
}

export function ResourceConflictsView({ programId, onRefresh }: ResourceConflictsViewProps) {
  const [conflicts, setConflicts] = useState<ResourceConflict[]>([])
  const [loading, setLoading] = useState(true)
  const [detecting, setDetecting] = useState(false)

  useEffect(() => {
    void fetchConflicts()
  }, [programId])

  const fetchConflicts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/conflicts`),
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setConflicts(data.data || [])
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to fetch conflicts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDetectConflicts = async () => {
    try {
      setDetecting(true)
      const token = localStorage.getItem('auth_token')
      const response = await fetch(
        getApiUrl(`/programs/${programId}/resources/conflicts/detect`),
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        toast.success(`Detected ${data.data.conflictCount} conflict(s)`)
        void fetchConflicts()
        if (onRefresh) {
          onRefresh()
        }
      } else {
        const error = await response.json()
        toast.error(error.message || 'Failed to detect conflicts')
      }
    } catch (error) {
      console.error('[RESOURCES] Failed to detect conflicts:', error)
      toast.error('Failed to detect conflicts')
    } finally {
      setDetecting(false)
    }
  }

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, string> = {
      'over-allocated': 'bg-red-100 text-red-800 border-red-300',
      'near-capacity': 'bg-yellow-100 text-yellow-800 border-yellow-300',
      'ok': 'bg-green-100 text-green-800 border-green-300'
    }
    return variants[severity] || 'bg-gray-100 text-gray-800 border-gray-300'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const overAllocated = conflicts.filter(c => c.conflictSeverity === 'over-allocated')
  const nearCapacity = conflicts.filter(c => c.conflictSeverity === 'near-capacity')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Resource Conflicts</h3>
          <p className="text-sm text-muted-foreground">
            Detect and resolve resource overallocation issues
          </p>
        </div>
        <Button onClick={handleDetectConflicts} disabled={detecting} className="gap-2">
          {detecting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Detecting...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Detect Conflicts
            </>
          )}
        </Button>
      </div>

      {conflicts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">No Conflicts Detected</p>
            <p className="text-sm text-muted-foreground mb-4">
              All resources are properly allocated within capacity limits
            </p>
            <Button onClick={handleDetectConflicts} variant="outline" disabled={detecting}>
              Run Conflict Detection
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {overAllocated.length > 0 && (
              <Card className="border-red-300 bg-red-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    Over-allocated Resources
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">{overAllocated.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Resources allocated beyond 100% capacity
                  </p>
                </CardContent>
              </Card>
            )}

            {nearCapacity.length > 0 && (
              <Card className="border-yellow-300 bg-yellow-50/50">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    Near Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-yellow-600">{nearCapacity.length}</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Resources allocated above 90% capacity
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Conflict List */}
          <div className="space-y-4">
            {conflicts.map((conflict) => (
              <Card 
                key={conflict.resourceId}
                className={conflict.conflictSeverity === 'over-allocated' ? 'border-red-300 bg-red-50/50' : 'border-yellow-300 bg-yellow-50/50'}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        {conflict.resourceName}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Resource ID: {conflict.resourceId}
                      </CardDescription>
                    </div>
                    <Badge className={getSeverityBadge(conflict.conflictSeverity)}>
                      {conflict.conflictSeverity.replace('-', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Allocation</p>
                      <p className="text-lg font-bold">
                        {Math.round(conflict.totalAllocation * 100)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Conflicting Projects</p>
                      <p className="text-lg font-bold">{conflict.conflictingProjects}</p>
                    </div>
                    {conflict.projectIds && conflict.projectIds.length > 0 && (
                      <div>
                        <p className="text-sm text-muted-foreground">Project IDs</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {conflict.projectIds.slice(0, 3).map((projectId) => (
                            <Badge key={projectId} variant="outline" className="text-xs">
                              {projectId.substring(0, 8)}...
                            </Badge>
                          ))}
                          {conflict.projectIds.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{conflict.projectIds.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  {conflict.conflictSeverity === 'over-allocated' && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-md">
                      <p className="text-sm text-red-800">
                        ⚠️ This resource is overallocated. Consider reducing allocation or adding additional resources.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

