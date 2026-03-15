"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { TrendingUp, Clock, CheckCircle, Zap, FileText, Activity as ActivityIcon } from "lucide-react"

interface SystemPerformanceMetricsProps {
  dashboardData: any
  aiProviders: any[]
}

export function SystemPerformanceMetrics({ dashboardData, aiProviders }: SystemPerformanceMetricsProps) {
  const metrics = [
    ...(dashboardData?.ai_performance
      ? [
          {
            label: "Avg Response Time",
            value: `${(dashboardData.ai_performance.avg_response_time_ms / 1000).toFixed(1)}s`,
            icon: Clock,
            color: "text-blue-500",
            bgColor: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "Success Rate",
            value: `${dashboardData.ai_performance.success_rate.toFixed(1)}%`,
            icon: CheckCircle,
            color: "text-emerald-500",
            bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
          },
        ]
      : []),
    {
      label: "Active Providers",
      value: aiProviders.filter(p => p.is_active).length.toString(),
      icon: Zap,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "Documents (30d)",
      value: dashboardData?.documents?.documents_last_30d?.toString() || "0",
      icon: FileText,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
    },
  ]

  return (
    <Card className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <motion.div
            whileHover={{ scale: 1.1 }}
            className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
          >
            <ActivityIcon className="h-6 w-6 text-white" />
          </motion.div>
          <div>
            <CardTitle>System Performance</CardTitle>
            <CardDescription>Real-time metrics and health indicators</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
              className="text-center p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                className={`inline-flex p-2 rounded-lg ${metric.bgColor} mb-2`}
              >
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </motion.div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">
                {metric.value}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {metric.label}
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
