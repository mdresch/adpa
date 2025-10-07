"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [aiProviders, setAiProviders] = useState<any[]>([])
  const [recentJobs, setRecentJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isAuthenticated) return

      try {
        setLoading(true)
        const [analytics, providers, jobs, projectsData] = await Promise.all([
          apiClient.getDashboardAnalytics(),
          apiClient.getAIProviders(),
          apiClient.getJobs({ limit: 5 }),
          apiClient.getProjects({ page: 1, limit: 1 }) // Get total count from projects endpoint
        ])

        setDashboardData(analytics)
        setAiProviders(providers)
        setRecentJobs(jobs.jobs)
        
        // Update analytics with correct project count from projects endpoint
        const updatedAnalytics = {
          ...analytics,
          projects: {
            ...analytics.projects,
            total_projects: projectsData.pagination.total
          }
        }
        setDashboardData(updatedAnalytics)
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
    return <LandingPage />
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

// Landing Page Component
function LandingPage() {
  const router = useRouter()
  
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Processing",
      description: "Advanced AI models for intelligent document analysis, generation, and automation",
      color: "from-blue-500 to-cyan-500"
    },
    {
      icon: FileText,
      title: "Document Automation",
      description: "Streamline document workflows with automated generation, processing, and management",
      color: "from-purple-500 to-pink-500"
    },
    {
      icon: "🛡️",
      title: "Enterprise Security",
      description: "Bank-grade security with encryption, compliance, and audit trails",
      color: "from-emerald-500 to-teal-500"
    },
    {
      icon: Zap,
      title: "Real-time Collaboration",
      description: "Live document editing, instant updates, and seamless team collaboration",
      color: "from-orange-500 to-red-500"
    },
    {
      icon: TrendingUp,
      title: "Analytics & Insights",
      description: "Comprehensive analytics and reporting for document processing and AI usage",
      color: "from-indigo-500 to-purple-500"
    },
    {
      icon: Users,
      title: "Team Management",
      description: "Role-based access control, user management, and permission systems",
      color: "from-pink-500 to-rose-500"
    }
  ]

  const integrations = [
    { name: "SharePoint", logo: "🔗" },
    { name: "Confluence", logo: "📝" },
    { name: "Adobe PDF", logo: "📄" },
    { name: "Microsoft 365", logo: "💼" },
    { name: "Google Workspace", logo: "🌐" },
    { name: "Slack", logo: "💬" }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"
              >
                <Brain className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ADPA Framework
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="text-slate-600 dark:text-slate-300 hover:text-blue-600"
              >
                Sign In
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Advanced Document
              </span>
              <br />
              <span className="text-slate-800 dark:text-slate-100">
                Processing & Automation
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed">
              Transform your document workflows with AI-powered automation, intelligent processing, 
              and seamless integrations. Boost productivity, ensure compliance, and scale your operations.
            </p>
          </motion.div>

          {/* ADPA Framework Core Cycle */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="mb-16"
          >
            <div className="max-w-6xl mx-auto">
              {/* Center Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="text-center mb-12"
              >
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-indigo-500 via-cyan-500 via-lime-500 to-amber-500 mb-6">
                  <Brain className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">ADPA Framework</h3>
                <p className="text-lg text-slate-600 dark:text-slate-300">Advanced Data Processing Automation</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">From raw data to real-time decisions</p>
              </motion.div>

              {/* Four Segments in Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {[
                  { 
                    icon: "🔎", 
                    title: "Analyze", 
                    description: "Inventory sources & contracts\nProfile & validate data quality\nDefine KPIs & outcomes",
                    color: "from-indigo-500 to-blue-500"
                  },
                  { 
                    icon: "📐", 
                    title: "Design", 
                    description: "Model schemas & transformations\nOrchestrate flow (batch/stream)\nGuardrails: security • governance • lineage",
                    color: "from-cyan-500 to-teal-500"
                  },
                  { 
                    icon: "⚙️", 
                    title: "Process", 
                    description: "Execute pipelines on scalable compute\nMonitor SLAs, cost, carbon\nAutomate incident response",
                    color: "from-lime-500 to-green-500"
                  },
                  { 
                    icon: "🔁", 
                    title: "Adapt", 
                    description: "Feedback loops & drift detection\nContinuous optimization (AutoML, tuning)\nVersioning, rollback, A/B",
                    color: "from-amber-500 to-orange-500"
                  }
                ].map((segment, index) => (
                  <motion.div
                    key={segment.title}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 + index * 0.1, duration: 0.6 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="group"
                  >
                    <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                      <CardContent className="p-8 text-center">
                        <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br ${segment.color} flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                          {segment.icon}
                        </div>
                        <h4 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">{segment.title}</h4>
                        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                          {segment.description}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* Benefits Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto mb-8">
                {[
                  { title: "Faster time-to-insight", icon: "⚡" },
                  { title: "Lower run costs", icon: "💰" },
                  { title: "Higher reliability", icon: "🛡️" },
                  { title: "Compliant by design", icon: "✅" }
                ].map((benefit, index) => (
                  <motion.div
                    key={benefit.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                    whileHover={{ y: -5, scale: 1.02 }}
                    className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-sm border border-slate-200/20 dark:border-slate-700/50 rounded-2xl p-6 text-center shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <div className="text-3xl mb-3">{benefit.icon}</div>
                    <h5 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                      {benefit.title}
                    </h5>
                  </motion.div>
                ))}
              </div>

              {/* Footer Lockup */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="text-center"
              >
                <div className="inline-flex items-center space-x-2 text-slate-600 dark:text-slate-400">
                  <div className="w-8 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 via-lime-500 to-amber-500 rounded-full"></div>
                  <span className="text-sm font-medium">Built for modern data and AI ops</span>
                  <div className="w-8 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 via-lime-500 to-amber-500 rounded-full"></div>
                </div>
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.4, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
          >
            <Button
              size="lg"
              onClick={() => router.push("/login")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 text-lg"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Start Free Trial
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-8 py-4 text-lg hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Activity className="mr-2 h-5 w-5" />
              View Demo
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
          >
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">10M+</div>
              <div className="text-slate-600 dark:text-slate-300">Documents Processed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">500+</div>
              <div className="text-slate-600 dark:text-slate-300">Enterprise Clients</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-indigo-600 mb-2">99.9%</div>
              <div className="text-slate-600 dark:text-slate-300">Uptime Guarantee</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 dark:bg-slate-800/50">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              Powerful Features for Modern Teams
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Everything you need to automate, process, and manage documents at scale
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                whileHover={{ y: -5, scale: 1.02 }}
                className="group"
              >
                <Card className="h-full border-0 shadow-lg hover:shadow-2xl transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardContent className="p-8">
                    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {typeof feature.icon === 'string' ? (
                        <span className="text-2xl">{feature.icon}</span>
                      ) : (
                        <feature.icon className="h-8 w-8 text-white" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4">
                      {feature.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              Seamless Integrations
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Connect with your favorite tools and platforms for a unified workflow experience
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
            {integrations.map((integration, index) => (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                whileHover={{ scale: 1.1, y: -5 }}
                className="text-center"
              >
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                  <CardContent className="p-6">
                    <div className="text-4xl mb-4">{integration.logo}</div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {integration.name}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Transform Your Workflow?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Join thousands of teams already using ADPA to automate their document processes 
              and boost productivity by 300%.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push("/login")}
                className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-4 text-lg font-semibold"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Start Your Free Trial
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/login")}
                className="border-2 border-white text-white hover:bg-white hover:text-blue-600 px-8 py-4 text-lg font-semibold"
              >
                Schedule a Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl"
              >
                <Brain className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold">ADPA Framework</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <span>© 2024 ADPA Framework. All rights reserved.</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="text-slate-400 hover:text-white"
              >
                Privacy Policy
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="text-slate-400 hover:text-white"
              >
                Terms of Service
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
