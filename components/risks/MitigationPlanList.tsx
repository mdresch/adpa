'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Plus, Filter, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { MitigationPlanCard, type MitigationPlan } from './MitigationPlanCard'
import { MitigationPlanDialog } from './MitigationPlanDialog'
import { MitigationPlanStats } from './MitigationPlanStats'
import { AIMitigationSuggestionsDialog } from './AIMitigationSuggestionsDialog'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface MitigationPlanListProps {
  riskId: string
  showStats?: boolean
  onPlanUpdate?: () => void
  riskTitle?: string
  riskDescription?: string
  riskCategory?: string
  riskProbability?: number
  riskImpact?: number
  riskSeverity?: string
}

export function MitigationPlanList({ 
  riskId, 
  showStats = true, 
  onPlanUpdate,
  riskTitle,
  riskDescription,
  riskCategory,
  riskProbability,
  riskImpact,
  riskSeverity,
}: MitigationPlanListProps) {
  const [plans, setPlans] = useState<MitigationPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isAISuggestionsOpen, setIsAISuggestionsOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: 'all' as string,
    priority: 'all' as string,
    action_type: 'all' as string,
    overdue: false,
  })
  
  const fetchPlans = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        risk_id: riskId,
      })
      
      if (filters.status !== 'all') {
        params.append('status', filters.status)
      }
      if (filters.priority !== 'all') {
        params.append('priority', filters.priority)
      }
      if (filters.action_type !== 'all') {
        params.append('action_type', filters.action_type)
      }
      if (filters.overdue) {
        params.append('overdue', 'true')
      }
      
      const response = await apiClient.get(`/mitigation-plans?${params.toString()}`)
      
      if (response.success && response.data) {
        setPlans(response.data)
      } else {
        setPlans([])
      }
    } catch (error: any) {
      console.error('Failed to fetch mitigation plans:', error)
      toast.error('Failed to load mitigation plans')
      setPlans([])
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    if (riskId) {
      fetchPlans()
    }
  }, [riskId, filters])
  
  const handlePlanUpdate = () => {
    fetchPlans()
    onPlanUpdate?.()
  }
  
  const filteredPlans = plans.filter((plan) => {
    if (filters.status !== 'all' && plan.status !== filters.status) return false
    if (filters.priority !== 'all' && plan.priority !== filters.priority) return false
    if (filters.action_type !== 'all' && plan.action_type !== filters.action_type) return false
    return true
  })
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading mitigation plans...</span>
      </div>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Statistics */}
      {showStats && <MitigationPlanStats riskId={riskId} />}
      
      {/* Header with Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mitigation Plans</CardTitle>
              <CardDescription>
                Track and manage mitigation actions for this risk
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAISuggestionsOpen(true)}
                className="bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200"
              >
                <Sparkles className="h-4 w-4 mr-2 text-purple-600" />
                AI Suggest Plans
              </Button>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Plan
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={filters.status} onValueChange={(value: string) => setFilters({ ...filters, status: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planned">Planned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.priority} onValueChange={(value: string) => setFilters({ ...filters, priority: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filters.action_type} onValueChange={(value: string) => setFilters({ ...filters, action_type: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="mitigation">Mitigation</SelectItem>
                <SelectItem value="contingency">Contingency</SelectItem>
                <SelectItem value="avoidance">Avoidance</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="acceptance">Acceptance</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant={filters.overdue ? 'default' : 'outline'}
              onClick={() => setFilters({ ...filters, overdue: !filters.overdue })}
            >
              <Filter className="h-4 w-4 mr-2" />
              {filters.overdue ? 'Show All' : 'Overdue Only'}
            </Button>
          </div>
          
          {/* Plans Grid */}
          {filteredPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan) => (
                <MitigationPlanCard
                  key={plan.id}
                  plan={plan}
                  onUpdate={handlePlanUpdate}
                  onDelete={handlePlanUpdate}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No mitigation plans found</h3>
              <p className="text-muted-foreground mb-4">
                {plans.length === 0
                  ? 'Create your first mitigation plan to get started'
                  : 'No plans match your current filters'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Mitigation Plan
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Create Dialog */}
      <MitigationPlanDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        riskId={riskId}
        onSuccess={handlePlanUpdate}
      />
      
      {/* AI Suggestions Dialog */}
      <AIMitigationSuggestionsDialog
        open={isAISuggestionsOpen}
        onOpenChange={setIsAISuggestionsOpen}
        riskId={riskId}
        riskTitle={riskTitle}
        riskDescription={riskDescription}
        riskCategory={riskCategory}
        riskProbability={riskProbability}
        riskImpact={riskImpact}
        riskSeverity={riskSeverity}
        onPlanCreated={handlePlanUpdate}
      />
    </div>
  )
}

