/**
 * Quality Audit Badge Component
 * Displays document quality score and grade with clickable details
 */

'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { QualityAuditModal } from './QualityAuditModal'
import { CheckCircle, AlertTriangle, XCircle, Clock, HelpCircle } from 'lucide-react'

interface QualityAuditBadgeProps {
  documentId: string
  score?: number
  grade?: string
  status?: 'passed' | 'warning' | 'failed' | 'pending' | 'not_audited'
  compact?: boolean
  onClick?: () => void
}

export function QualityAuditBadge({
  documentId,
  score,
  grade,
  status,
  compact = false,
  onClick
}: QualityAuditBadgeProps) {
  const [showDetails, setShowDetails] = useState(false)

  const getBadgeVariant = () => {
    if (!status || status === 'not_audited') return 'secondary'
    if (status === 'passed') return 'default'
    if (status === 'warning') return 'outline'
    if (status === 'pending') return 'secondary'
    return 'destructive'
  }

  const getBadgeColor = () => {
    if (!status || status === 'not_audited') return 'bg-gray-100 text-gray-700 border-gray-300'
    if (status === 'passed') return 'bg-green-100 text-green-800 border-green-300'
    if (status === 'warning') return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (status === 'pending') return 'bg-blue-100 text-blue-800 border-blue-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const getIcon = () => {
    if (!status || status === 'not_audited') return <HelpCircle className="h-3 w-3" />
    if (status === 'passed') return <CheckCircle className="h-3 w-3" />
    if (status === 'warning') return <AlertTriangle className="h-3 w-3" />
    if (status === 'pending') return <Clock className="h-3 w-3" />
    return <XCircle className="h-3 w-3" />
  }

  const getStatusText = () => {
    if (!status || status === 'not_audited') return 'Not Audited'
    if (status === 'passed') return 'Passed'
    if (status === 'warning') return 'Review Recommended'
    if (status === 'pending') return 'Auditing...'
    return 'Failed'
  }

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      setShowDetails(true)
    }
  }

  if (compact) {
    return (
      <>
        <button
          onClick={handleClick}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${getBadgeColor()} hover:opacity-80 transition-opacity`}
          title={`Quality: ${grade || 'N/A'} (${score || 'N/A'}%)`}
        >
          {getIcon()}
          <span>{grade || 'N/A'}</span>
        </button>

        {showDetails && (
          <QualityAuditModal
            documentId={documentId}
            onClose={() => { setShowDetails(false) }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${getBadgeColor()} hover:opacity-80 transition-opacity`}
      >
        {getIcon()}
        <div className="flex flex-col items-start">
          <span className="text-xs font-medium">Quality: {grade || 'N/A'}</span>
          <span className="text-xs opacity-75">{score ? `${score}%` : getStatusText()}</span>
        </div>
      </button>

      {showDetails && (
        <QualityAuditModal
          documentId={documentId}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  )
}

/**
 * Simple quality score display (no modal)
 */
export function QualityScore({ score, grade }: { score?: number; grade?: string }) {
  const getColor = () => {
    if (!score) return 'text-gray-500'
    if (score >= 90) return 'text-green-600'
    if (score >= 80) return 'text-green-500'
    if (score >= 70) return 'text-yellow-600'
    if (score >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  return (
    <div className={`text-sm font-semibold ${getColor()}`}>
      {grade || 'N/A'} {score ? `(${score}%)` : ''}
    </div>
  )
}

