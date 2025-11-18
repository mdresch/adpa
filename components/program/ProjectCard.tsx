"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  FolderOpen, 
  Calendar, 
  DollarSign,
  FileText,
  User
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ProjectCardProps {
  id: string
  name: string
  description?: string
  status: string
  budget?: number
  start_date?: string
  end_date?: string
  owner_name?: string
  document_count?: number | string
  document_quality_score?: number | string | null
  onClick?: () => void
}

const getStatusConfig = (status: string) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return { 
        icon: CheckCircle, 
        color: 'text-green-600', 
        bg: 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-800',
        label: 'Completed' 
      }
    case 'active':
      return { 
        icon: Clock, 
        color: 'text-blue-600', 
        bg: 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-800',
        label: 'Active' 
      }
    case 'at_risk':
    case 'at-risk':
      return { 
        icon: AlertTriangle, 
        color: 'text-red-600', 
        bg: 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800',
        label: 'At Risk' 
      }
    case 'on_hold':
    case 'on-hold':
      return { 
        icon: Clock, 
        color: 'text-yellow-600', 
        bg: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-800',
        label: 'On Hold' 
      }
    default:
      return { 
        icon: FolderOpen, 
        color: 'text-gray-600', 
        bg: 'bg-gray-100 dark:bg-gray-900/20 border-gray-300 dark:border-gray-800',
        label: status || 'Unknown' 
      }
  }
}

const getQualityConfig = (score: number | string | null | undefined) => {
  if (score === null || score === undefined || score === '') {
    return {
      label: 'No Data',
      color: 'text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-800',
      progressColor: 'bg-gray-300',
      value: 0
    }
  }
  
  const numericScore = typeof score === 'string' ? parseFloat(score) : score
  if (isNaN(numericScore)) {
    return {
      label: 'No Data',
      color: 'text-gray-500',
      bg: 'bg-gray-100 dark:bg-gray-800',
      progressColor: 'bg-gray-300',
      value: 0
    }
  }
  
  const normalizedScore = Math.min(100, Math.max(0, numericScore))
  
  if (normalizedScore >= 85) {
    return {
      label: 'Excellent',
      color: 'text-green-600',
      bg: 'bg-green-100 dark:bg-green-900/20',
      progressColor: 'bg-green-500',
      value: normalizedScore
    }
  } else if (normalizedScore >= 70) {
    return {
      label: 'Good',
      color: 'text-blue-600',
      bg: 'bg-blue-100 dark:bg-blue-900/20',
      progressColor: 'bg-blue-500',
      value: normalizedScore
    }
  } else if (normalizedScore >= 55) {
    return {
      label: 'Fair',
      color: 'text-yellow-600',
      bg: 'bg-yellow-100 dark:bg-yellow-900/20',
      progressColor: 'bg-yellow-500',
      value: normalizedScore
    }
  } else {
    return {
      label: 'Needs Improvement',
      color: 'text-red-600',
      bg: 'bg-red-100 dark:bg-red-900/20',
      progressColor: 'bg-red-500',
      value: normalizedScore
    }
  }
}

export function ProjectCard({
  id,
  name,
  description,
  status,
  budget,
  start_date,
  end_date,
  owner_name,
  document_count,
  document_quality_score,
  onClick
}: ProjectCardProps) {
  const router = useRouter()
  const statusConfig = getStatusConfig(status)
  const qualityConfig = getQualityConfig(document_quality_score)
  const StatusIcon = statusConfig.icon

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(`/projects/${id}`)
    }
  }

  const getBorderColor = () => {
    switch (statusConfig.color) {
      case 'text-green-600': return '#16a34a'
      case 'text-blue-600': return '#2563eb'
      case 'text-red-600': return '#dc2626'
      case 'text-yellow-600': return '#ca8a04'
      default: return '#6b7280'
    }
  }

  return (
    <Card 
      className="hover:shadow-md transition-all cursor-pointer border-l-4"
      style={{ borderLeftColor: getBorderColor() }}
      onClick={handleClick}
    >
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header with Name and Status */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate mb-1">{name}</h3>
              {description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {description}
                </p>
              )}
            </div>
            <Badge className={`${statusConfig.bg} ${statusConfig.color} border shrink-0`}>
              <StatusIcon className={`h-3 w-3 mr-1 ${statusConfig.color}`} />
              <span className="text-xs">{statusConfig.label}</span>
            </Badge>
          </div>

          {/* Document Quality Indicator */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Document Quality
              </span>
              <span className={`font-semibold ${qualityConfig.color}`}>
                {qualityConfig.value > 0 ? `${Math.round(qualityConfig.value)}%` : '-'}
              </span>
            </div>
            <div className="space-y-1">
              <Progress 
                value={qualityConfig.value} 
                className="h-2"
              />
              <div className="flex items-center justify-between">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${qualityConfig.bg} ${qualityConfig.color} border-0`}
                >
                  {qualityConfig.label}
                </Badge>
                {document_count !== undefined && document_count !== null && (
                  <span className="text-xs text-muted-foreground">
                    {typeof document_count === 'string' ? parseInt(document_count) : document_count} doc{(typeof document_count === 'string' ? parseInt(document_count) : document_count) !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Project Info Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t">
            {budget && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Budget</div>
                  <div className="text-xs font-semibold truncate">
                    ${budget.toLocaleString()}
                  </div>
                </div>
              </div>
            )}
            
            {start_date && end_date && (
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Timeline</div>
                  <div className="text-xs font-semibold truncate">
                    {new Date(start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            )}
            
            {owner_name && (
              <div className="flex items-center gap-1.5 col-span-2">
                <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Owner</div>
                  <div className="text-xs font-semibold truncate">
                    {owner_name}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

