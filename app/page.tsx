"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Activity,
  FileText,
  Users,
  Zap,
  CheckCircle,
  AlertCircle,
  Clock,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Brain,
  Wifi,
  WifiOff,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket, useJobUpdates } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"

interface DashboardData {
  projects: {
    total_projects: number
    active_projects: number
    completed_projects: number
    projects_last_30d: number
  }
  documents: {
    total_documents: number
    published_documents: number
    documents_last_30d: number
  }
  ai: {
    total_generations: number
    generations_last_30d: number
  }
  recent_activity: Array<{
    action: string
    resource_type: string
    resource_id: string
    created_at: string
  }>
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth()
  const { isConnected } = useWebSocket()
  const jobUpdates = useJobUpdates()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [aiProviders, setAiProviders] = useState<any[]>([])
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) return

      try {
        setLoading(true)
        const [analytics, providers, jobs] = await Promise.all([
          apiClient.getDashboardAnalytics(),
          apiClient.getAIProviders(),
          apiClient.getJobs({ limit: 5 })
        ])

        setDashboardData(analytics)
        setAiProviders(providers)
        setRecentJobs(jobs.jobs)
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error)
        toast.error("Failed to load dashboard data")
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Please log in to access the dashboard</h1>
            <Button onClick={() => window.location.href = "/login"}>Go to Login</Button>
          </div>
        </div>
      </PageTransition>
    )
  }
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

  const providersData = aiProviders.map(provider => ({
    name: provider.name,
    status: provider.is_active ? "active" : "inactive",
    health: provider.is_active ? 95 + Math.floor(Math.random() * 5) : 0,
    requests: provider.usage_stats?.total_requests || "0",
    color: provider.is_active ? "emerald" : "slate",
  }))

  const integrationData = [
    { name: "Confluence", status: "connected", lastSync: "2 min ago", color: "emerald" },
    { name: "SharePoint", status: "connected", lastSync: "5 min ago", color: "emerald" },
    { name: "Adobe Document Services", status: "warning", lastSync: "1 hour ago", color: "yellow" },
    { name: "GitHub", status: "connected", lastSync: "30 sec ago", color: "emerald" },
  ]

  const activityData = dashboardData?.recent_activity?.slice(0, 4).map(activity => ({
    action: activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    details: `${activity.resource_type} ${activity.resource_id.slice(0, 8)}...`,
    time: new Date(activity.created_at).toLocaleString(),
    color: activity.action.includes('create') ? 'emerald' :
           activity.action.includes('update') ? 'blue' :
           activity.action.includes('delete') ? 'red' : 'purple',
  })) || [
    {
      action: "Welcome to ADPA",
      details: "System initialized",
      time: "Just now",
      color: "blue",
    },
  ]

  const quickActions = [
    { icon: FileText, label: "Generate Document", color: "from-blue-500 to-cyan-500" },
    { icon: Zap, label: "Configure AI", color: "from-purple-500 to-pink-500" },
    { icon: Users, label: "Manage Users", color: "from-emerald-500 to-teal-500" },
    { icon: TrendingUp, label: "View Analytics", color: "from-orange-500 to-red-500" },
  ]

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6 visible-scrollbar">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading dashboard data...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatedLayout className="space-y-8">
              {/* Hero Section */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 p-8 text-white shadow-2xl"
              >
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="relative z-10">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="flex items-center space-x-3 mb-4"
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    >
                      <Sparkles className="h-8 w-8" />
                    </motion.div>
                    <h1 className="text-4xl font-bold">ADPA System Dashboard</h1>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="text-xl opacity-90 max-w-2xl"
                  >
                    Advanced Document Processing & Automation Framework - Your intelligent business automation platform
                  </motion.p>
                </div>
                <motion.div
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                  transition={{ duration: 4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32"
                />
                <motion.div
                  animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut", delay: 1 }}
                  className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24"
                />
              </motion.div>

              {/* System Status Cards */}
              <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsData.map((stat, index) => (
                  <AnimatedGridItem key={stat.title}>
                    <Card className="hover-lift glass border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          {stat.title}
                        </CardTitle>
                        <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className={`p-2 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </motion.div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                              className="text-3xl font-bold text-slate-800 dark:text-slate-100"
                            >
                              {stat.value}
                            </motion.div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.description}</p>
                          </div>
                          <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.5 }}
                            className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400"
                          >
                            <ArrowUpRight className="h-4 w-4" />
                            <span className="text-sm font-medium">{stat.trend}</span>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>
                ))}
              </AnimatedGrid>

              {/* AI Providers Status */}
              <AnimatedCard className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg"
                    >
                      <Zap className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-xl">AI Provider Status</CardTitle>
                      <CardDescription>Current status and health of configured AI providers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial="initial"
                    animate="animate"
                    variants={{
                      initial: {},
                      animate: {
                        transition: {
                          staggerChildren: 0.1,
                        },
                      },
                    }}
                    className="space-y-4"
                  >
                    {providersData.map((provider, index) => (
                      <motion.div
                        key={provider.name}
                        variants={{
                          initial: { opacity: 0, x: -20 },
                          animate: { opacity: 1, x: 0 },
                        }}
                        whileHover={{ scale: 1.02, x: 4 }}
                        className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <motion.div
                            whileHover={{ rotate: 180 }}
                            transition={{ duration: 0.3 }}
                            className={`p-2 rounded-lg bg-${provider.color}-50 dark:bg-${provider.color}-900/20`}
                          >
                            <Zap className={`h-5 w-5 text-${provider.color}-500`} />
                          </motion.div>
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-100">{provider.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {provider.requests} requests today
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {provider.health}% uptime
                            </p>
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "6rem" }}
                              transition={{ delay: index * 0.1 + 0.5, duration: 0.8 }}
                            >
                              <Progress value={provider.health} className="w-24 h-2 mt-1" />
                            </motion.div>
                          </div>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: index * 0.1 + 0.7, type: "spring" }}
                          >
                            <Badge
                              variant={
                                provider.status === "active"
                                  ? "default"
                                  : provider.status === "standby"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="animate-pulse"
                            >
                              {provider.status}
                            </Badge>
                          </motion.div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </AnimatedCard>

              {/* Integration Status & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AnimatedCard
                  delay={0.2}
                  className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg"
                      >
                        <CheckCircle className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle>Integration Health</CardTitle>
                        <CardDescription>Status of external system integrations</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      initial="initial"
                      animate="animate"
                      variants={{
                        initial: {},
                        animate: {
                          transition: {
                            staggerChildren: 0.1,
                          },
                        },
                      }}
                      className="space-y-4"
                    >
                      {integrationData.map((integration, index) => (
                        <motion.div
                          key={integration.name}
                          variants={{
                            initial: { opacity: 0, x: -20 },
                            animate: { opacity: 1, x: 0 },
                          }}
                          whileHover={{ x: 4 }}
                          className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                        >
                          <div className="flex items-center space-x-3">
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.5 }}
                            >
                              {integration.status === "connected" ? (
                                <CheckCircle className="h-5 w-5 text-emerald-500" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-500" />
                              )}
                            </motion.div>
                            <span className="font-medium text-slate-700 dark:text-slate-200">{integration.name}</span>
                          </div>
                          <span className="text-sm text-slate-500 dark:text-slate-400">{integration.lastSync}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </CardContent>
                </AnimatedCard>

                <AnimatedCard
                  delay={0.4}
                  className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
                >
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <motion.div
                        whileHover={{ scale: 1.1 }}
                        className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg"
                      >
                        <Activity className="h-6 w-6 text-white" />
                      </motion.div>
                      <div>
                        <CardTitle>Recent Activity</CardTitle>
                        <CardDescription>Latest system events and operations</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <motion.div
                      initial="initial"
                      animate="animate"
                      variants={{
                        initial: {},
                        animate: {
                          transition: {
                            staggerChildren: 0.1,
                          },
                        },
                      }}
                      className="space-y-4"
                    >
                      {activityData.map((activity, index) => (
                        <motion.div
                          key={index}
                          variants={{
                            initial: { opacity: 0, y: 20 },
                            animate: { opacity: 1, y: 0 },
                          }}
                          whileHover={{ x: 4 }}
                          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                        >
                          <motion.div
                            animate={{ scale: [1, 1.3, 1] }}
                            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, delay: index * 0.3 }}
                            className={`w-3 h-3 bg-${activity.color}-500 rounded-full mt-2`}
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{activity.action}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{activity.details}</p>
                          </div>
                          <span className="text-xs text-slate-400 dark:text-slate-500">{activity.time}</span>
                        </motion.div>
                      ))}
                    </motion.div>
                  </CardContent>
                </AnimatedCard>
              </div>

              {/* Quick Actions */}
              <AnimatedCard
                delay={0.6}
                className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg"
                    >
                      <TrendingUp className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle>Quick Actions</CardTitle>
                      <CardDescription>Common administrative tasks</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <motion.div
                    initial="initial"
                    animate="animate"
                    variants={{
                      initial: {},
                      animate: {
                        transition: {
                          staggerChildren: 0.1,
                        },
                      },
                    }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  >
                    {quickActions.map((action, index) => (
                      <motion.div
                        key={action.label}
                        variants={{
                          initial: { opacity: 0, scale: 0.8 },
                          animate: { opacity: 1, scale: 1 },
                        }}
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          className={`h-24 flex flex-col space-y-2 bg-gradient-to-br ${action.color} hover:shadow-lg transition-all duration-300 border-0 w-full`}
                        >
                          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                            <action.icon className="h-6 w-6 text-white" />
                          </motion.div>
                          <span className="text-white font-medium">{action.label}</span>
                        </Button>
                      </motion.div>
                    ))}
                  </motion.div>
                </CardContent>
              </AnimatedCard>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
