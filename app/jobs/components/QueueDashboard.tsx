"use client"

import { useState, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Server, RefreshCw } from "lucide-react"
import { apiClient } from "@/lib/api"
import { AnimatedGridItem } from "@/components/animated-layout"

interface QueueStatus {
  name: string
  active: number
  waiting: number
  completed: number
  failed: number
  delayed: number
  workers: number
  avgProcessingTime: string
  health: string
}

interface StatCardProps {
  label: string
  value: number
  color?: 'blue' | 'yellow' | 'green' | 'red' | 'purple'
  icon?: React.ReactNode
}

function StatCard({ label, value, color = 'blue', icon }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
  }

  return (
    <div className={`text-center p-3 rounded-lg border border-slate-200 dark:border-slate-700 ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
        {icon}
        {label}
      </p>
    </div>
  )
}

export function QueueDashboard() {
  const [queues, setQueues] = useState<QueueStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    fetchQueueStatus()
    const interval = setInterval(() => {
      fetchQueueStatus()
    }, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [])

  async function fetchQueueStatus() {
    try {
      const data = await apiClient.getQueueStats()
      setQueues(data.queues)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to fetch queue stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Loading queue statistics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Last Updated Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 animate-pulse text-blue-500" />
          <span>Live monitoring - Auto-refresh every 5 seconds</span>
        </div>
        <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
      </div>

      {/* Queue Cards */}
      <div className="space-y-6">
        {queues.map((queue, index) => (
          <AnimatedGridItem
            key={queue.name}
            className="animate-fade-in-up"
          >
            <Card className="glass border-0 shadow-lg hover-lift">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    {queue.name.replace(/-/g, ' ')}
                  </CardTitle>
                  <Badge 
                    variant={queue.health === 'healthy' ? 'default' : queue.health === 'degraded' ? 'secondary' : 'destructive'}
                    className="text-xs"
                  >
                    {queue.health === 'healthy' && '🟢 Healthy'}
                    {queue.health === 'degraded' && '🟡 Degraded'}
                    {queue.health === 'unhealthy' && '🔴 Unhealthy'}
                    {queue.health === 'unknown' && '⚪ Unknown'}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <StatCard label="Active" value={queue.active} color="blue" />
                  <StatCard label="Waiting" value={queue.waiting} color="yellow" />
                  <StatCard label="Completed" value={queue.completed} color="green" />
                  <StatCard label="Failed" value={queue.failed} color="red" />
                  <StatCard 
                    label="Workers" 
                    value={queue.workers} 
                    color="purple"
                    icon={<Server className="h-4 w-4" />} 
                  />
                </div>
                
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Avg Processing Time</p>
                    <p className="font-semibold text-lg">{queue.avgProcessingTime}</p>
                  </div>
                </div>
                
                {/* Queue Health Indicators */}
                {queue.health === 'degraded' && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      ⚠️ Queue performance degraded - {queue.failed > 10 ? 'High failure rate' : 'High wait times'}
                    </p>
                  </div>
                )}
                
                {queue.health === 'unhealthy' && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      🔴 Queue unhealthy - Immediate attention required
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedGridItem>
        ))}
      </div>

      {/* Empty State */}
      {queues.length === 0 && (
        <Card className="glass border-0 shadow-lg">
          <CardContent className="p-12 text-center">
            <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Queue Data Available</h3>
            <p className="text-muted-foreground">Queue statistics will appear here once jobs are processed</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

