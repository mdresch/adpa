/**
 * Drift Alert Banner
 * Displays when baseline drift is detected on a document
 */

'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  AlertTriangle, 
  Sparkles, 
  X, 
  ChevronDown,
  ChevronUp 
} from 'lucide-react'

interface DriftPoint {
  entityType: string
  driftType: 'added' | 'removed' | 'modified'
  description: string
  requiresApproval: boolean
}

interface DriftAlertProps {
  driftRecordId: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  driftCount: number
  summary?: string
  driftPoints?: DriftPoint[]
  onResolve: () => void
  onDismiss: () => void
  onViewDetails: () => void
  isResolving?: boolean
}

export function DriftAlertBanner({
  driftRecordId,
  severity,
  driftCount,
  summary,
  driftPoints = [],
  onResolve,
  onDismiss,
  onViewDetails,
  isResolving = false
}: DriftAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const severityColors = {
    low: 'bg-blue-50 border-blue-200 text-blue-900',
    medium: 'bg-yellow-50 border-yellow-200 text-yellow-900',
    high: 'bg-orange-50 border-orange-200 text-orange-900',
    critical: 'bg-red-50 border-red-200 text-red-900'
  }

  const severityBadgeColors = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800'
  }

  return (
    <Alert className={`mb-6 ${severityColors[severity]} border-2`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <AlertTriangle className="h-5 w-5 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-lg font-semibold mb-2 flex items-center gap-2">
              Baseline Drift Detected
              <Badge className={severityBadgeColors[severity]}>
                {severity.toUpperCase()}
              </Badge>
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                This document has {driftCount} change{driftCount > 1 ? 's' : ''} that deviate from the approved baseline.
              </p>
              
              {summary && (
                <p className="text-sm font-medium">
                  {summary}
                </p>
              )}

              {isExpanded && driftPoints.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-semibold">Drift Details:</p>
                  <ul className="space-y-1 text-sm">
                    {driftPoints.slice(0, 5).map((drift, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-xs mt-1">•</span>
                        <span>
                          <strong>{drift.driftType.toUpperCase()}</strong>: {drift.description}
                          {drift.requiresApproval && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              Requires Approval
                            </Badge>
                          )}
                        </span>
                      </li>
                    ))}
                    {driftPoints.length > 5 && (
                      <li className="text-sm text-muted-foreground">
                        ...and {driftPoints.length - 5} more drift point{driftPoints.length - 5 > 1 ? 's' : ''}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mt-4">
                <Button
                  size="sm"
                  onClick={onResolve}
                  disabled={isResolving}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  {isResolving ? (
                    <>
                      <div className="animate-spin mr-2 h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3 w-3 mr-2" />
                      Resolve Drift with AI ⭐
                    </>
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-2" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-2" />
                      View Details
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={onViewDetails}
                >
                  Full Analysis
                </Button>
              </div>
            </AlertDescription>
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="ml-2"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Alert>
  )
}
