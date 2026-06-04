"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { FileText, Clock, ChevronRight, Activity, Zap } from "lucide-react"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ActivityItem {
  id: string
  type: string
  status: string
  project_name: string | null
  template_name: string | null
  document_name: string | null
  created_at: string
  project_id: string | null
  document_id: string | null
}

export function SidebarActivity() {
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRecentActivity = async () => {
    try {
      // Fetch latest completed/failed generation jobs as "Activity"
      const response = await apiClient.get<any>('/jobs?limit=5&type=ai-generate')
      if (response.jobs) {
        setActivities(response.jobs)
      }
    } catch (error) {
      console.error("Failed to fetch sidebar activity:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRecentActivity()
    // Poll for new activity every 60 seconds
    const interval = setInterval(fetchRecentActivity, 60000)
    return () => clearInterval(interval)
  }, [])

  if (loading && activities.length === 0) {
    return (
      <div className="px-4 py-2 space-y-2 opacity-50">
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-12 w-full bg-slate-200 dark:bg-slate-800 rounded animate-pulse opacity-50" />
      </div>
    )
  }

  if (activities.length === 0) return null

  return (
    <div className="px-3 py-4 border-t border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <Activity className="h-3 w-3" />
          Recent Activity
        </h3>
      </div>

      <div className="space-y-2">
        {activities.map((item) => (
          <div
            key={item.id}
            onClick={() => {
              if (item.project_id && item.document_id) {
                router.push(`/projects/${item.project_id}/documents/${item.document_id}`)
              }
            }}
            className="group cursor-pointer rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-2 hover:border-primary/30 hover:shadow-sm transition-all overflow-hidden"
          >
            <div className="flex items-start gap-2">
              <div className={cn(
                "p-1.5 rounded bg-slate-100 dark:bg-slate-800 group-hover:bg-primary/10 transition-colors",
                item.status === 'completed' ? 'text-emerald-500' : item.status === 'failed' ? 'text-red-500' : 'text-amber-500'
              )}>
                <Zap className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold truncate leading-none mb-1">
                  {item.template_name || 'Document Generated'}
                </p>
                <p className="text-[9px] text-slate-500 truncate mb-1">
                  {item.project_name || 'Project Activity'}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[8px] text-slate-400 flex items-center gap-1 font-mono uppercase">
                    <Clock className="h-2 w-2" />
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <Badge className={cn(
                    "h-3 px-1 text-[7px] uppercase font-black",
                    item.status === 'completed' ? 'bg-emerald-500/10 text-emerald-600' :
                      item.status === 'failed' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                  )}>
                    {item.status}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 h-6 text-[9px] text-slate-400 hover:text-primary uppercase font-bold tracking-tighter"
        onClick={() => router.push('/jobs')}
      >
        View All Jobs <ChevronRight className="h-2 w-2 ml-1" />
      </Button>
    </div>
  )
}
