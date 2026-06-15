"use client"

import type React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Activity as ActivityIcon, ExternalLink } from "lucide-react"

interface RecentActivityProps {
  activities: any[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const activityDotClass: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
  }

  const formatTime = (time: string | Date) => {
    if (!time) return ""
    const date = new Date(time)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "Just now"
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
    return date.toLocaleDateString()
  }

  const formatAction = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  const getEntityName = (details: string) => {
    if (details && details.includes(': ')) {
      return details.split(': ')[1];
    }
    return null;
  }

  const getHref = (activity: any) => {
    if (!activity.entity_id || !activity.entity_type || activity.action?.startsWith('delete')) return null;

    if (activity.entity_type === 'template') {
      return `/templates/${activity.entity_id}`;
    }
    
    if (activity.entity_type === 'document') {
      const projectId = activity.metadata?.projectId;
      if (projectId) {
        return `/projects/${projectId}/documents/${activity.entity_id}/view`;
      }
    }
    
    if (activity.entity_type === 'project') {
      return `/projects/${activity.entity_id}`;
    }

    return null;
  }

  return (
    <Card className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <ActivityIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">Recent Activity</CardTitle>
            <CardDescription>Live stream of system events</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {activities.map((activity, index) => {
            const href = getHref(activity);
            const entityName = getEntityName(activity.details);
            const formattedAction = formatAction(activity.action);
            
            const content = (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {entityName || formattedAction}
                  </p>
                  {href && <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {entityName ? formattedAction : activity.details}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center pt-1 font-medium">
                  {formatTime(activity.time)}
                </p>
              </div>
            );

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative pl-6 pb-6 border-l border-slate-200 dark:border-slate-700 last:pb-0 group"
              >
                <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${activityDotClass[activity.color] || 'bg-slate-400'}`} />
                {href ? (
                  <Link href={href} className="block cursor-pointer">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  )
}
