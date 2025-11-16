'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Target,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { apiClient } from '@/lib/api'
import { cn } from '@/lib/utils'

interface MitigationPlanStatsProps {
  riskId?: string
}

interface Stats {
  total: number
  by_status: {
    completed: number
    planned: number
    in_progress: number
    cancelled: number
    on_hold: number
  }
  by_priority: {
    critical: number
    high: number
    medium: number
    low: number
  }
  completion_rate: number
  overdue_count: number
  completion_percentage_avg: number
}

export function MitigationPlanStats({ riskId }: MitigationPlanStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [riskCompletion, setRiskCompletion] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        
        // Fetch general stats
        const params = riskId ? `?risk_id=${riskId}` : ''
        const statsResponse = await apiClient.get(`/mitigation-plans/stats${params}`)
        
        if (statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data)
        }
        
        // Fetch risk completion if riskId provided
        if (riskId) {
          try {
            const completionResponse = await apiClient.get(`/mitigation-plans/risk/${riskId}/completion`)
            if (completionResponse.success && completionResponse.data) {
              setRiskCompletion(completionResponse.data.completion_percentage)
            }
          } catch (error) {
            console.error('Failed to fetch risk completion:', error)
          }
        }
      } catch (error) {
        console.error('Failed to fetch mitigation plan stats:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStats()
  }, [riskId])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading statistics...</span>
      </div>
    )
  }
  
  if (!stats) {
    return null
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Plans */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Plans</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      
      {/* Completion Rate */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-muted-foreground">Completion Rate</p>
              <p className="text-2xl font-bold">{stats.completion_rate.toFixed(1)}%</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
          <Progress value={stats.completion_rate} className="h-2" />
        </CardContent>
      </Card>
      
      {/* Risk Completion (if riskId provided) */}
      {riskId && riskCompletion !== null && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm text-muted-foreground">Risk Completion</p>
                <p className="text-2xl font-bold">{riskCompletion}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={riskCompletion} className="h-2" />
          </CardContent>
        </Card>
      )}
      
      {/* Overdue Plans */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overdue Plans</p>
              <p className={cn(
                "text-2xl font-bold",
                stats.overdue_count > 0 ? "text-red-600" : "text-green-600"
              )}>
                {stats.overdue_count}
              </p>
            </div>
            <AlertTriangle className={cn(
              "h-8 w-8",
              stats.overdue_count > 0 ? "text-red-500" : "text-green-500"
            )} />
          </div>
        </CardContent>
      </Card>
      
      {/* Status Breakdown */}
      {stats.total > 0 && (
        <Card className="md:col-span-2 lg:col-span-4">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Status Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {stats.by_status.completed > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-800">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed: {stats.by_status.completed}
                    </Badge>
                  )}
                  {stats.by_status.in_progress > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                      <Clock className="h-3 w-3 mr-1" />
                      In Progress: {stats.by_status.in_progress}
                    </Badge>
                  )}
                  {stats.by_status.planned > 0 && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-800">
                      <Clock className="h-3 w-3 mr-1" />
                      Planned: {stats.by_status.planned}
                    </Badge>
                  )}
                  {stats.by_status.on_hold > 0 && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-800">
                      On Hold: {stats.by_status.on_hold}
                    </Badge>
                  )}
                  {stats.by_status.cancelled > 0 && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-800">
                      Cancelled: {stats.by_status.cancelled}
                    </Badge>
                  )}
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Priority Breakdown</p>
                <div className="flex flex-wrap gap-2">
                  {stats.by_priority.critical > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-800">
                      Critical: {stats.by_priority.critical}
                    </Badge>
                  )}
                  {stats.by_priority.high > 0 && (
                    <Badge variant="outline" className="bg-orange-50 text-orange-800">
                      High: {stats.by_priority.high}
                    </Badge>
                  )}
                  {stats.by_priority.medium > 0 && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                      Medium: {stats.by_priority.medium}
                    </Badge>
                  )}
                  {stats.by_priority.low > 0 && (
                    <Badge variant="outline" className="bg-green-50 text-green-800">
                      Low: {stats.by_priority.low}
                    </Badge>
                  )}
                </div>
              </div>
              
              {stats.completion_percentage_avg > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Average Completion</p>
                  <div className="flex items-center gap-2">
                    <Progress value={stats.completion_percentage_avg} className="h-2 flex-1" />
                    <span className="text-sm font-medium">{stats.completion_percentage_avg.toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

