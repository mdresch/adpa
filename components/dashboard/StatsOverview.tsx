import type React from "react"
import { motion } from "framer-motion"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ArrowUpRight, Wifi, WifiOff, Clock, FileText, Brain } from "lucide-react"

interface StatsOverviewProps {
  isConnected: boolean
  recentJobs: any[]
  jobUpdates: any
  dashboardData: any
}

export function StatsOverview({ isConnected, recentJobs, jobUpdates, dashboardData }: StatsOverviewProps) {
  const statsData = [
    {
      title: "Connection Status",
      value: isConnected ? "Connected" : "Disconnected",
      description: isConnected ? "Real-time updates active" : "Reconnecting...",
      icon: isConnected ? Wifi : WifiOff,
      color: isConnected ? "text-emerald-500" : "text-red-500",
      bgColor: isConnected ? "bg-emerald-50 dark:bg-emerald-900/20" : "bg-red-50 dark:bg-red-900/20",
      trend: isConnected ? "Online" : "Offline",
    },
    {
      title: "Active Jobs",
      value: recentJobs.filter(job => job.status === "processing").length.toString(),
      description: `${recentJobs.length} total jobs`,
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      trend: `${Object.keys(jobUpdates).length} live`,
    },
    {
      title: "Total Projects",
      value: dashboardData?.projects?.total_projects?.toString() || "0",
      description: `${dashboardData?.projects?.active_projects || 0} active`,
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      trend: `+${dashboardData?.projects?.projects_last_30d || 0}`,
    },
    {
      title: "AI Generations",
      value: dashboardData?.ai?.total_generations?.toString() || "0",
      description: "Total AI generations",
      icon: Brain,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      trend: `+${dashboardData?.ai?.generations_last_30d || 0}`,
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsData.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="hover-lift glass border-0 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                    {stat.value}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.description}</p>
                </div>
                <div className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
                  <ArrowUpRight className="h-4 w-4" />
                  <span className="text-sm font-medium">{stat.trend}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
