"use client"

/**
 * Key Result Card Component
 * Displays a single key result with progress tracking
 */

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  Clock,
  Edit,
  Trash2,
  MoreVertical
} from 'lucide-react'

interface KeyResult {
  id: string
  okr_id: string
  key_result_title: string
  key_result_description?: string | null
  metric_name?: string | null
  metric_unit?: string | null
  baseline_value?: number | null
  target_value: number
  current_value: number
  stretch_target?: number | null
  progress_percentage?: number | null
  progress_status?: 'not-started' | 'in-progress' | 'achieved' | 'at-risk' | 'behind' | null
  measurement_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  last_measured_at?: string | null
  next_measurement_date?: string | null
  owner_id?: string | null
  contributing_projects?: string[] | null
  created_at: string
  updated_at: string
}

interface KeyResultCardProps {
  keyResult: KeyResult
  onEdit: () => void
  onDelete: () => void
}

export function KeyResultCard({ keyResult, onEdit, onDelete }: KeyResultCardProps) {
  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-500/10 text-green-700 border-green-500/20'
      case 'in-progress':
      case 'on-track':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'at-risk':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'behind':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'not-started':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle2 className="h-3 w-3" />
      case 'in-progress':
      case 'on-track':
        return <TrendingUp className="h-3 w-3" />
      case 'at-risk':
        return <AlertCircle className="h-3 w-3" />
      case 'behind':
        return <AlertCircle className="h-3 w-3" />
      case 'not-started':
        return <Clock className="h-3 w-3" />
      default:
        return <Clock className="h-3 w-3" />
    }
  }

  const formatValue = (value: number | string | null | undefined, unit?: string | null) => {
    // Convert to number, handling null/undefined and string values
    const numValue = typeof value === 'number' ? value : parseFloat(String(value || 0))
    
    if (isNaN(numValue)) {
      return 'N/A'
    }
    
    if (unit === 'dollars' || unit === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(numValue)
    }
    if (unit === 'percentage') {
      return `${numValue.toFixed(1)}%`
    }
    return new Intl.NumberFormat('en-US').format(numValue)
  }

  const progress = parseFloat(String(keyResult.progress_percentage || 0))
  // Ensure values are numbers before calculating gap
  const targetValue = typeof keyResult.target_value === 'number' ? keyResult.target_value : parseFloat(String(keyResult.target_value || 0))
  const currentValue = typeof keyResult.current_value === 'number' ? keyResult.current_value : parseFloat(String(keyResult.current_value || 0))
  const gap = targetValue - currentValue

  return (
    <Card className="border-l-4 border-l-primary/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <h5 className="font-semibold">{keyResult.key_result_title}</h5>
              {keyResult.progress_status && (
                <Badge className={getStatusColor(keyResult.progress_status)} variant="outline">
                  {getStatusIcon(keyResult.progress_status)}
                  <span className="ml-1 capitalize text-xs">
                    {keyResult.progress_status.replace('-', ' ')}
                  </span>
                </Badge>
              )}
            </div>

            {keyResult.key_result_description && (
              <p className="text-sm text-muted-foreground">{keyResult.key_result_description}</p>
            )}

            {/* Metric Values */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Current:</span>
                <span className="ml-2 font-semibold">
                  {formatValue(keyResult.current_value, keyResult.metric_unit)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Target:</span>
                <span className="ml-2 font-semibold">
                  {formatValue(keyResult.target_value, keyResult.metric_unit)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Gap:</span>
                <span className={`ml-2 font-semibold ${gap >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatValue(Math.abs(gap), keyResult.metric_unit)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium">{progress.toFixed(1)}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>

            {/* Baseline and Stretch Target */}
            {(keyResult.baseline_value !== null || keyResult.stretch_target !== null) && (
              <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                {keyResult.baseline_value !== null && (
                  <span>Baseline: {formatValue(keyResult.baseline_value, keyResult.metric_unit)}</span>
                )}
                {keyResult.stretch_target !== null && (
                  <span>Stretch: {formatValue(keyResult.stretch_target, keyResult.metric_unit)}</span>
                )}
              </div>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

