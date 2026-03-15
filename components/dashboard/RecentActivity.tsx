"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Activity as ActivityIcon } from "lucide-react"

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
          {activities.map((activity, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-6 pb-6 border-l border-slate-200 dark:border-slate-700 last:pb-0"
            >
              <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-slate-900 ${activityDotClass[activity.color] || 'bg-slate-400'}`} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{activity.action}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{activity.details}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center pt-1 font-medium">
                  {activity.time}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
