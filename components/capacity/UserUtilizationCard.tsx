"use client"

import React from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Settings, Calendar, Clock, Briefcase, 
  TrendingUp, TrendingDown, Target, AlertTriangle
} from '@/components/ui/icons-shim'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface PortfolioUtilization {
  userId: string
  userName: string
  userEmail: string
  resourceType: string
  contractedWeeklyHours: number
  monthlyCapacityHours: number
  targetUtilizationPercent: number
  maxAllocationPercent: number
  totalPlannedHours: number
  totalActualHours: number
  projectsAssigned: number
  unavailableHoursNext30Days: number
  availableCapacityHours: number
  plannedUtilizationPercent: number
  actualUtilizationPercent: number
  allocationStatus: string
  hoursToTarget: number
  hoursToMax: number
}

interface UserUtilizationCardProps {
  user: PortfolioUtilization
  onEditSettings?: () => void
  onRequestLeave?: () => void
}

export function UserUtilizationCard({ user, onEditSettings, onRequestLeave }: UserUtilizationCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over-allocated': return 'bg-red-100 text-red-800 border-red-300'
      case 'over-100': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'optimal': return 'bg-green-100 text-green-800 border-green-300'
      case 'under-target': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'low-utilization': return 'bg-blue-100 text-blue-800 border-blue-300'
      case 'unallocated': return 'bg-gray-100 text-gray-800 border-gray-300'
      default: return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'over-allocated': return 'Over-allocated'
      case 'over-100': return 'Over 100%'
      case 'optimal': return 'Optimal'
      case 'under-target': return 'Under Target'
      case 'low-utilization': return 'Low Utilization'
      case 'unallocated': return 'Unallocated'
      default: return status
    }
  }

  const getProgressColor = (utilization: number, target: number, max: number) => {
    if (utilization > max) return 'bg-red-500'
    if (utilization > 100) return 'bg-orange-500'
    if (utilization >= target - 10 && utilization <= target + 10) return 'bg-green-500'
    if (utilization < target - 20) return 'bg-blue-500'
    return 'bg-yellow-500'
  }

  const plannedUtil = Number(user.plannedUtilizationPercent) || 0
  const actualUtil = Number(user.actualUtilizationPercent) || 0
  const targetUtil = Number(user.targetUtilizationPercent) || 80
  const maxUtil = Number(user.maxAllocationPercent) || 100

  return (
    <TooltipProvider>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{user.userName || 'Unknown User'}</h3>
                <Badge className={`${getStatusColor(user.allocationStatus)} text-xs`}>
                  {getStatusLabel(user.allocationStatus)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">{user.userEmail}</p>
            </div>
            <div className="flex items-center gap-1">
              {onEditSettings && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditSettings}>
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Edit Capacity Settings</TooltipContent>
                </Tooltip>
              )}
              {onRequestLeave && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onRequestLeave}>
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Request Leave</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resource Type & Projects */}
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Badge variant="outline" className="capitalize">
                {user.resourceType?.replace('-', ' ') || 'Full-time'}
              </Badge>
            </span>
            <span className="flex items-center gap-1 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              {Number(user.projectsAssigned) || 0} projects
            </span>
          </div>

          {/* Utilization Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Planned Utilization</span>
              <span className="font-medium">{Math.round(plannedUtil)}%</span>
            </div>
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              {/* Target marker */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-primary/50 z-10"
                style={{ left: `${Math.min(targetUtil, 100)}%` }}
              />
              {/* Progress bar */}
              <div 
                className={`h-full transition-all ${getProgressColor(plannedUtil, targetUtil, maxUtil)}`}
                style={{ width: `${Math.min(plannedUtil, 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                Target: {targetUtil}%
              </span>
              <span>{maxUtil}%</span>
            </div>
          </div>

          {/* Hours Breakdown */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Capacity</span>
              <div className="font-medium flex items-center gap-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {Number(user.contractedWeeklyHours) || 40}h/week
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Available</span>
              <div className="font-medium flex items-center gap-1">
                {Number(user.availableCapacityHours) > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                {Math.abs(Number(user.availableCapacityHours) || 0).toFixed(0)}h
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Planned</span>
              <div className="font-medium">{Number(user.totalPlannedHours || 0).toFixed(0)}h</div>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground text-xs">Actual</span>
              <div className="font-medium">{Number(user.totalActualHours || 0).toFixed(0)}h</div>
            </div>
          </div>

          {/* Upcoming Unavailability */}
          {Number(user.unavailableHoursNext30Days) > 0 && (
            <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-md text-sm">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-800">
                {Number(user.unavailableHoursNext30Days)}h unavailable in next 30 days
              </span>
            </div>
          )}

          {/* Hours to Target/Max */}
          <div className="flex items-center justify-between text-xs border-t pt-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`cursor-help ${Number(user.hoursToTarget) >= 0 ? 'text-green-600' : 'text-amber-600'}`}>
                  {Number(user.hoursToTarget) >= 0 
                    ? `${Number(user.hoursToTarget).toFixed(0)}h to target`
                    : `${Math.abs(Number(user.hoursToTarget)).toFixed(0)}h over target`
                  }
                </span>
              </TooltipTrigger>
              <TooltipContent>Hours needed to reach {targetUtil}% target utilization</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className={`cursor-help ${Number(user.hoursToMax) >= 0 ? 'text-muted-foreground' : 'text-red-600'}`}>
                  {Number(user.hoursToMax) >= 0 
                    ? `${Number(user.hoursToMax).toFixed(0)}h to max`
                    : `${Math.abs(Number(user.hoursToMax)).toFixed(0)}h over max!`
                  }
                </span>
              </TooltipTrigger>
              <TooltipContent>Hours until {maxUtil}% maximum allocation</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

