'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  XCircle, 
  Pause,
  Calendar,
  User,
  Target,
  Edit,
  Trash2,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { MitigationPlanDialog } from './MitigationPlanDialog'
import { toast } from '@/lib/notify'
import { apiClient } from '@/lib/api'

export interface MitigationPlan {
  id: string
  risk_id: string
  title: string
  description?: string
  action_type: 'mitigation' | 'contingency' | 'avoidance' | 'transfer' | 'acceptance'
  owner_id?: string
  assigned_to?: string
  owner_name?: string
  assigned_to_name?: string
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold'
  completion_percentage: number
  planned_start_date?: string
  planned_completion_date?: string
  actual_start_date?: string
  actual_completion_date?: string
  due_date?: string
  progress_notes?: string[]
  completion_notes?: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  expected_effectiveness?: number
  cost_estimate?: 'low' | 'medium' | 'high'
  created_at: string
  updated_at: string
  completed_at?: string
}

interface MitigationPlanCardProps {
  plan: MitigationPlan
  onUpdate?: () => void
  onDelete?: () => void
  showRiskInfo?: boolean
}

const statusConfig = {
  planned: { 
    label: 'Planned', 
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Clock,
    bgColor: 'bg-blue-50'
  },
  in_progress: { 
    label: 'In Progress', 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    icon: Clock,
    bgColor: 'bg-yellow-50'
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle2,
    bgColor: 'bg-green-50'
  },
  cancelled: { 
    label: 'Cancelled', 
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: XCircle,
    bgColor: 'bg-gray-50'
  },
  on_hold: { 
    label: 'On Hold', 
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: Pause,
    bgColor: 'bg-orange-50'
  },
} as const

const priorityConfig = {
  critical: { label: 'Critical', color: 'bg-red-100 text-red-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
} as const

const actionTypeConfig = {
  mitigation: { label: 'Mitigation', color: 'bg-blue-100 text-blue-800' },
  contingency: { label: 'Contingency', color: 'bg-purple-100 text-purple-800' },
  avoidance: { label: 'Avoidance', color: 'bg-green-100 text-green-800' },
  transfer: { label: 'Transfer', color: 'bg-orange-100 text-orange-800' },
  acceptance: { label: 'Acceptance', color: 'bg-gray-100 text-gray-800' },
} as const

export function MitigationPlanCard({ plan, onUpdate, onDelete, showRiskInfo = false }: MitigationPlanCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const StatusIcon = statusConfig[plan.status].icon
  const isOverdue = plan.due_date && new Date(plan.due_date) < new Date() && plan.status !== 'completed' && plan.status !== 'cancelled'
  
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${plan.title}"?`)) return
    
    try {
      setIsDeleting(true)
      await apiClient.delete(`/mitigation-plans/${plan.id}`)
      toast.success('Mitigation plan deleted successfully')
      onDelete?.()
    } catch (error: any) {
      console.error('Failed to delete mitigation plan:', error)
      toast.error(error.message || 'Failed to delete mitigation plan')
    } finally {
      setIsDeleting(false)
    }
  }
  
  return (
    <>
      <Card className={cn(
        'transition-all hover:shadow-md',
        statusConfig[plan.status].bgColor,
        isOverdue && 'border-red-300 border-2'
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                {plan.title}
                {isOverdue && (
                  <Badge variant="destructive" className="ml-2">
                    Overdue
                  </Badge>
                )}
              </CardTitle>
              {plan.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {plan.description}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="h-8 w-8 p-0"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Status and Priority Badges */}
          <div className="flex flex-wrap gap-2">
            <Badge className={statusConfig[plan.status].color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig[plan.status].label}
            </Badge>
            <Badge className={priorityConfig[plan.priority].color}>
              {priorityConfig[plan.priority].label}
            </Badge>
            <Badge className={actionTypeConfig[plan.action_type].color}>
              {actionTypeConfig[plan.action_type].label}
            </Badge>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Completion</span>
              <span className="font-medium">{plan.completion_percentage}%</span>
            </div>
            <Progress value={plan.completion_percentage} className="h-2" />
          </div>
          
          {/* Dates */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {plan.due_date && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className={cn(isOverdue && 'text-red-600 font-medium')}>
                  Due: {format(new Date(plan.due_date.includes('T') ? plan.due_date.split('T')[0] : plan.due_date), 'MMM d, yyyy')}
                </span>
              </div>
            )}
            {plan.actual_start_date && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Started: {format(new Date(plan.actual_start_date.includes('T') ? plan.actual_start_date.split('T')[0] : plan.actual_start_date), 'MMM d, yyyy')}</span>
              </div>
            )}
            {plan.actual_completion_date && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                <span>Completed: {format(new Date(plan.actual_completion_date.includes('T') ? plan.actual_completion_date.split('T')[0] : plan.actual_completion_date), 'MMM d, yyyy')}</span>
              </div>
            )}
          </div>
          
          {/* Expected Effectiveness and Cost Estimate */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {plan.expected_effectiveness !== undefined && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Target className="h-3 w-3" />
                <span>Effectiveness: {plan.expected_effectiveness}%</span>
              </div>
            )}
            {plan.cost_estimate && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="font-medium">Cost:</span>
                <Badge 
                  className={cn(
                    plan.cost_estimate === 'low' && 'bg-green-100 text-green-800',
                    plan.cost_estimate === 'medium' && 'bg-yellow-100 text-yellow-800',
                    plan.cost_estimate === 'high' && 'bg-orange-100 text-orange-800'
                  )}
                >
                  {plan.cost_estimate.charAt(0).toUpperCase() + plan.cost_estimate.slice(1)}
                </Badge>
              </div>
            )}
          </div>
          
          {/* Progress Notes Count */}
          {plan.progress_notes && plan.progress_notes.length > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span>{plan.progress_notes.length} progress note{plan.progress_notes.length !== 1 ? 's' : ''}</span>
            </div>
          )}
        </CardContent>
      </Card>
      
      <MitigationPlanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        plan={plan}
        riskId={plan.risk_id}
        onSuccess={() => {
          setIsDialogOpen(false)
          onUpdate?.()
        }}
      />
    </>
  )
}

