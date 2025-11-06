"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle, Clock, ListTodo, UserX, TrendingUp } from "lucide-react"
import { Task } from "@/hooks/use-tasks"
import { parseHours } from "@/lib/utils/taskUtils"

interface TaskMetricsProps {
  tasks: Task[]
}

function formatHours(hours: number): string {
  return hours.toLocaleString('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 0 })
}

export function TaskMetrics({ tasks }: TaskMetricsProps) {
  const metrics = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    planned: tasks.filter(t => t.status === 'planned').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    unassigned: tasks.filter(t => !t.assigned_user_id).length,
    estimatedHours: tasks.reduce((sum, t) => sum + parseHours(t.estimated_hours), 0),
    actualHours: tasks.reduce((sum, t) => sum + parseHours(t.actual_hours), 0),
  }

  const completionRate = metrics.total > 0 
    ? Math.round((metrics.completed / metrics.total) * 100) 
    : 0

  const hoursProgress = metrics.estimatedHours > 0
    ? Math.round((metrics.actualHours / metrics.estimatedHours) * 100)
    : 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <ListTodo className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {metrics.inProgress} in progress, {metrics.planned} planned
          </div>
        </CardContent>
      </Card>

      {/* Completed Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Completed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.completed}</div>
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            {completionRate}% completion rate
          </div>
        </CardContent>
      </Card>

      {/* Hours Tracking */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hours</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatHours(metrics.actualHours)}h / {formatHours(metrics.estimatedHours)}h
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {hoursProgress}% of estimated hours logged
          </div>
        </CardContent>
      </Card>

      {/* Unassigned Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
          <UserX className={`h-4 w-4 ${metrics.unassigned > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${metrics.unassigned > 0 ? 'text-orange-500' : ''}`}>
            {metrics.unassigned}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {metrics.blocked > 0 && `${metrics.blocked} blocked tasks`}
            {metrics.blocked === 0 && 'No blocked tasks'}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

