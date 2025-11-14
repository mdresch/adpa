"use client"

/**
 * OKR Card Component
 * Displays a single OKR with its key results and progress
 */

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
  MoreVertical,
  Target,
  User,
  Calendar,
  BarChart3,
  Plus
} from 'lucide-react'
import { KeyResultCard } from './KeyResultCard'
import { KeyResultDialog } from './KeyResultDialog'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface OKR {
  id: string
  organization_id?: string | null
  strategic_goal_id?: string | null
  parent_okr_id?: string | null
  level: 'organization' | 'portfolio' | 'program' | 'project'
  entity_id?: string | null
  entity_type?: 'program' | 'project' | null
  objective_title: string
  objective_description?: string | null
  objective_category?: 'strategic' | 'operational' | 'innovation' | null
  okr_period?: string | null
  period_start?: string | null
  period_end?: string | null
  owner_id?: string | null
  owner_name?: string | null
  owner_role?: string | null
  confidence_level?: number | null
  progress_percentage?: number | null
  status?: 'on-track' | 'at-risk' | 'behind' | 'achieved' | 'not-started' | null
  is_stretch_goal: boolean
  priority?: 'critical' | 'high' | 'medium' | 'low' | null
  created_at: string
  updated_at: string
  key_results?: KeyResult[]
}

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

interface OKRCardProps {
  okr: OKR
  onEdit: () => void
  onDelete: () => void
  onRefresh: () => void
}

export function OKRCard({ okr, onEdit, onDelete, onRefresh }: OKRCardProps) {
  const [isKeyResultDialogOpen, setIsKeyResultDialogOpen] = useState(false)
  const [editingKeyResult, setEditingKeyResult] = useState<KeyResult | null>(null)
  const [expanded, setExpanded] = useState(true)

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-500/10 text-green-700 border-green-500/20'
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
        return <CheckCircle2 className="h-4 w-4" />
      case 'on-track':
        return <TrendingUp className="h-4 w-4" />
      case 'at-risk':
        return <AlertCircle className="h-4 w-4" />
      case 'behind':
        return <AlertCircle className="h-4 w-4" />
      case 'not-started':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string | null | undefined) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'high':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'low':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'organization':
        return 'Organization'
      case 'portfolio':
        return 'Portfolio'
      case 'program':
        return 'Program'
      case 'project':
        return 'Project'
      default:
        return level
    }
  }

  const handleCreateKeyResult = () => {
    setEditingKeyResult(null)
    setIsKeyResultDialogOpen(true)
  }

  const handleEditKeyResult = (kr: KeyResult) => {
    setEditingKeyResult(kr)
    setIsKeyResultDialogOpen(true)
  }

  const handleKeyResultSaved = () => {
    setIsKeyResultDialogOpen(false)
    setEditingKeyResult(null)
    onRefresh()
  }

  const handleDeleteKeyResult = async (krId: string) => {
    if (!confirm('Are you sure you want to delete this key result?')) {
      return
    }

    try {
      const response = await apiClient.delete(`/okrs/key-results/${krId}`)
      if (response && response.success) {
        toast.success('Key result deleted successfully')
        onRefresh()
      }
    } catch (error) {
      console.error('Failed to delete key result:', error)
      toast.error('Failed to delete key result')
    }
  }

  const progress = parseFloat(String(okr.progress_percentage || 0))
  const keyResults = okr.key_results || []

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <Badge variant="outline" className="capitalize">
                  {getLevelLabel(okr.level)}
                </Badge>
                {okr.priority && (
                  <Badge className={getPriorityColor(okr.priority)}>
                    {okr.priority}
                  </Badge>
                )}
                {okr.is_stretch_goal && (
                  <Badge variant="outline" className="border-purple-500/20 text-purple-700">
                    Stretch Goal
                  </Badge>
                )}
                {okr.status && (
                  <Badge className={getStatusColor(okr.status)}>
                    {getStatusIcon(okr.status)}
                    <span className="ml-1 capitalize">{okr.status.replace('-', ' ')}</span>
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl mb-2">{okr.objective_title}</CardTitle>
              {okr.objective_description && (
                <CardDescription className="mt-2">{okr.objective_description}</CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit OKR
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete OKR
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OKR Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {okr.owner_name && (
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Owner:</span>
                <span className="font-medium">{okr.owner_name}</span>
                {okr.owner_role && (
                  <span className="text-muted-foreground">({okr.owner_role})</span>
                )}
              </div>
            )}
            {okr.okr_period && (
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Period:</span>
                <span className="font-medium">{okr.okr_period}</span>
              </div>
            )}
            {okr.confidence_level !== null && okr.confidence_level !== undefined && (
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Confidence:</span>
                <span className="font-medium">{okr.confidence_level}%</span>
              </div>
            )}
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Key Results:</span>
              <span className="font-medium">{keyResults.length}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Overall Progress</span>
              <span className="font-bold">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Key Results */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Key Results</h4>
              <Button variant="outline" size="sm" onClick={handleCreateKeyResult}>
                <Plus className="h-4 w-4 mr-2" />
                Add Key Result
              </Button>
            </div>
            {keyResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <p>No key results yet</p>
                <Button variant="ghost" size="sm" onClick={handleCreateKeyResult} className="mt-2">
                  Add your first key result
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {keyResults.map((kr) => (
                  <KeyResultCard
                    key={kr.id}
                    keyResult={kr}
                    onEdit={() => handleEditKeyResult(kr)}
                    onDelete={() => handleDeleteKeyResult(kr.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Key Result Dialog */}
      <KeyResultDialog
        open={isKeyResultDialogOpen}
        onOpenChange={setIsKeyResultDialogOpen}
        okrId={okr.id}
        keyResult={editingKeyResult}
        onSaved={handleKeyResultSaved}
      />
    </>
  )
}

