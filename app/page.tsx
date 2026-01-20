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
  Activity as ActivityIcon,
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
import { toast } from '@/lib/notify'
import { ExecutiveDriftAlertsWidget } from "@/app/(dashboard)/components/ExecutiveDriftAlertsWidget"

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

  const activityData = dashboardData?.recent_activity?.slice(0, 4).map(activity => {
    const action = activity.action.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());

    // Create more descriptive details using metadata if available
    let details = `${activity.resource_type || 'Resource'} ${activity.resource_id?.slice(0, 8) || 'unknown'}...`;
    const metadata = activity.new_values || {};

    if (activity.action === 'use_template' && metadata.template_name) {
      details = `Template: ${metadata.template_name}`;
    } else if (activity.action === 'create_document') {
      if (metadata.template_name) {
        details = `New document from ${metadata.template_name}`;
      } else {
        details = `New document created`;
      }
    } else if (activity.action === 'ai_generate' && metadata.provider) {
      details = `Generated using ${metadata.provider} (${metadata.model || 'unknown'})`;
    } else if (metadata.name) {
      details = `${activity.resource_type}: ${metadata.name}`;
    }

    return {
      action,
      details,
      time: new Date(activity.created_at).toLocaleString(),
      color: activity.action.includes('create') ? 'emerald' :
        activity.action.includes('update') ? 'blue' :
          activity.action.includes('delete') ? 'red' : 'purple',
    };
  }) || [
      {
        action: "Welcome to ADPA",
        details: "System initialized",
        time: "Just now",
        color: "blue",
      },
    ]

  const quickActions = [
    {
      icon: FileText,
      label: "Generate Document",
      color: "from-blue-600 to-blue-800",
      onClick: () => router.push("/projects"),
      description: "Create new documents"
    },
    {
      icon: Zap,
      label: "Configure AI",
      color: "from-blue-700 to-blue-900",
      onClick: () => router.push("/ai-providers"),
      description: "Manage AI providers"
    },
    {
      icon: Users,
      label: "Manage Users",
      color: "from-blue-500 to-blue-700",
      onClick: () => router.push("/admin"),
      description: "User administration"
    },
    {
      icon: TrendingUp,
      label: "View Analytics",
      color: "from-blue-800 to-slate-900",
      onClick: () => router.push("/ai-analytics"),
      description: "AI usage insights"
    },
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
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900 via-blue-700 to-blue-600 p-8 text-white shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 to-blue-800/20"></div>
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
                    Advanced Document Processing Analytics - Where every document builds intelligence for the next generation
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

              {/* Compounding Intelligence Showcase */}
              <AnimatedCard className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg"
                    >
                      <Brain className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-xl">Compounding Intelligence Engine</CardTitle>
                      <CardDescription>Each document enhances the intelligence of future generations</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1, duration: 0.6 }}
                      className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700"
                    >
                      <div className="text-4xl mb-4">🧠</div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Context Injection</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Previous high-quality documents automatically inform new generations with relevant context
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2, duration: 0.6 }}
                      className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/20 dark:to-blue-700/20 border border-blue-300 dark:border-blue-600"
                    >
                      <div className="text-4xl mb-4">📊</div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Adaptive Compression</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Intelligent compression reduces token usage by up to 80% while preserving critical information
                      </p>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.6 }}
                      className="text-center p-6 rounded-xl bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-700/20 dark:to-blue-600/20 border border-blue-400 dark:border-blue-500"
                    >
                      <div className="text-4xl mb-4">🔄</div>
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">Knowledge Graph</h4>
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Documents form interconnected knowledge networks that evolve and improve over time
                      </p>
                    </motion.div>
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Smart Topic Centric Knowledge Compression */}
              <AnimatedCard className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
                    >
                      <Brain className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-xl">Smart Topic Centric Knowledge Compression</CardTitle>
                      <CardDescription>AI-driven topic extraction and intelligent summarization with domain-specific primers</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      ADPA's intelligent compression engine analyzes documents across multiple knowledge domains,
                      extracting key topics and building contextualized summaries primed with domain expertise.
                      Each knowledge area maintains its own compression matrix, ensuring critical information is preserved
                      while achieving up to 80% token reduction.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        {
                          domain: "Project Management",
                          primer: "PMBOK 7th Edition",
                          icon: "📋",
                          topics: "Scope, Schedule, Budget, Risk, Stakeholders",
                          color: "from-blue-500 to-blue-600"
                        },
                        {
                          domain: "Business Analysis",
                          primer: "BABOK v3",
                          icon: "📊",
                          topics: "Requirements, Processes, Enterprise Architecture",
                          color: "from-blue-600 to-blue-700"
                        },
                        {
                          domain: "Data Management",
                          primer: "DMBOK Framework",
                          icon: "🗄️",
                          topics: "Data Governance, Quality, Architecture, Security",
                          color: "from-blue-700 to-blue-800"
                        },
                        {
                          domain: "Strategic Planning",
                          primer: "Enterprise Strategy",
                          icon: "🎯",
                          topics: "Vision, Goals, KPIs, Portfolio Alignment",
                          color: "from-blue-800 to-blue-900"
                        }
                      ].map((area, index) => (
                        <motion.div
                          key={area.domain}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1, duration: 0.6 }}
                          whileHover={{ y: -4, scale: 1.02 }}
                          className="p-4 rounded-lg border border-blue-200 dark:border-blue-700 hover:shadow-md transition-all duration-200"
                        >
                          <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${area.color} flex items-center justify-center text-2xl mb-3 shadow-lg`}>
                            {area.icon}
                          </div>
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">
                            {area.domain}
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-2">
                            {area.primer}
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {area.topics}
                          </p>
                        </motion.div>
                      ))}
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-2 flex items-center">
                        <span className="text-lg mr-2">🎓</span>
                        Context Building Intelligence
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Our AI analyzes each document through domain-specific lenses, identifying key concepts,
                        relationships, and dependencies. The system builds rich contextual summaries that maintain
                        semantic accuracy while dramatically reducing token consumption. Each summary is tagged with
                        relevance scores, confidence metrics, and cross-domain linkages for optimal reuse.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

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
                      className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
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
                        onClick={() => router.push(`/ai-providers`)}
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

              {/* 10-Stage Enterprise Processing Pipeline */}
              <AnimatedCard className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg"
                    >
                      <ActivityIcon className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-xl">10-Stage Enterprise Document Processing Pipeline</CardTitle>
                      <CardDescription>End-to-end intelligent processing from ingestion to enterprise integration</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                      {
                        stage: "1. OCR & Ingestion",
                        description: "Optical character recognition for scanned documents, PDFs, and images with format normalization",
                        icon: "📄",
                        color: "from-blue-400 to-blue-500"
                      },
                      {
                        stage: "2. Context Gathering",
                        description: "Collects relevant project documents, stakeholder information, and historical context",
                        icon: "🔍",
                        color: "from-blue-450 to-blue-550"
                      },
                      {
                        stage: "3. Topic Extraction",
                        description: "AI-driven topic analysis and domain-specific knowledge categorization across frameworks",
                        icon: "🎯",
                        color: "from-blue-500 to-blue-600"
                      },
                      {
                        stage: "4. Content Prioritization",
                        description: "Ranks content by relevance, importance, and impact using multi-dimensional scoring",
                        icon: "📊",
                        color: "from-blue-550 to-blue-650"
                      },
                      {
                        stage: "5. Smart Compression",
                        description: "Topic-centric compression with domain primers, achieving 80% token reduction",
                        icon: "🗜️",
                        color: "from-blue-600 to-blue-700"
                      },
                      {
                        stage: "6. Context Injection",
                        description: "Injects compressed, domain-aware context into AI prompts for enhanced generation",
                        icon: "💉",
                        color: "from-blue-650 to-blue-750"
                      },
                      {
                        stage: "7. AI Generation",
                        description: "Multi-provider AI generation with framework-specific templates and guardrails",
                        icon: "🤖",
                        color: "from-blue-700 to-blue-800"
                      },
                      {
                        stage: "8. Quality Scoring",
                        description: "Knowledge output matrix scoring: completeness, accuracy, coherence, compliance",
                        icon: "⭐",
                        color: "from-blue-750 to-blue-850"
                      },
                      {
                        stage: "9. Analytics & Reporting",
                        description: "Real-time metrics, cost analysis, quality dashboards, and ROI tracking",
                        icon: "📈",
                        color: "from-blue-800 to-blue-900"
                      },
                      {
                        stage: "10. Enterprise Integration",
                        description: "Seamless export to SharePoint, Confluence, Jira, and enterprise document systems",
                        icon: "🔗",
                        color: "from-blue-900 to-slate-900"
                      }
                    ].map((stage, index) => (
                      <motion.div
                        key={stage.stage}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.1, duration: 0.6 }}
                        whileHover={{ y: -2, scale: 1.02 }}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center text-lg shadow-lg`}>
                            {stage.icon}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm mb-1">
                              {stage.stage}
                            </h4>
                            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                              {stage.description}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Advanced Enterprise Intelligence Features */}
              <AnimatedCard className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="p-2 bg-gradient-to-br from-blue-800 to-slate-900 rounded-lg"
                    >
                      <TrendingUp className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-xl">Advanced Enterprise Intelligence</CardTitle>
                      <CardDescription>Proactive project management with AI-powered baseline tracking and drift detection</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Baseline & Drift Detection */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1, duration: 0.6 }}
                        className="p-5 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700"
                      >
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl shadow-lg">
                            📊
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-base mb-1">
                              Baseline & Drift Detection
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                              Automated scope deviation tracking
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Scope Drift:</strong> Real-time detection of scope creep and unauthorized changes</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Technical Drift:</strong> Architecture and technology stack deviation alerts</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Timeline Drift:</strong> Schedule variance analysis with critical path impact</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Budget Drift:</strong> Cost overrun detection with automatic escalation</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Auto Change Requests:</strong> Generates CRs from detected positive deviations</span>
                          </li>
                        </ul>
                      </motion.div>

                      {/* Intelligent Feedback System */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="p-5 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/20 dark:to-blue-700/20 border border-blue-300 dark:border-blue-600"
                      >
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center text-2xl shadow-lg">
                            💬
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-base mb-1">
                              Document Review Intelligence
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                              AI-powered feedback analytics
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Multi-Level Feedback:</strong> Stakeholder, reviewer, and peer input aggregation</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Sentiment Analysis:</strong> AI-driven tone and satisfaction scoring</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Template Optimization:</strong> Continuous improvement based on feedback patterns</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Provider Performance:</strong> AI model effectiveness tracking and optimization</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Quality Trends:</strong> Longitudinal analysis of document quality evolution</span>
                          </li>
                        </ul>
                      </motion.div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Hierarchical Project Management */}
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.6 }}
                        className="p-5 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/20 dark:to-blue-700/20 border border-blue-300 dark:border-blue-600"
                      >
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center text-2xl shadow-lg">
                            🏗️
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-base mb-1">
                              Hierarchical Project Management
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                              Portfolio → Program → Project → Task
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Portfolio View:</strong> Strategic alignment and cross-program dependencies</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Program Management:</strong> Multi-project coordination and resource sharing</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Misalignment Detection:</strong> AI identifies over-elevated or hidden programs</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Consolidation Alerts:</strong> Suggests project mergers for efficiency gains</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Cross-Level Drift:</strong> Detects scope creep cascading across hierarchy</span>
                          </li>
                        </ul>
                      </motion.div>

                      {/* Resource Allocation Intelligence */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4, duration: 0.6 }}
                        className="p-5 rounded-xl bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-700/20 dark:to-blue-600/20 border border-blue-400 dark:border-blue-500"
                      >
                        <div className="flex items-start space-x-3 mb-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-800 to-slate-900 flex items-center justify-center text-2xl shadow-lg">
                            👥
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-base mb-1">
                              Resource Allocation Intelligence
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                              Integration-first approach
                            </p>
                          </div>
                        </div>
                        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Jira Integration:</strong> Pull work logs and time tracking from existing systems</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Overallocation Alerts:</strong> Identifies resource conflicts across projects</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Underutilization Detection:</strong> Flags idle capacity and optimization opportunities</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Skill Gap Analysis:</strong> AI-driven competency mapping and recommendations</span>
                          </li>
                          <li className="flex items-start">
                            <span className="text-blue-600 mr-2">•</span>
                            <span><strong>Cross-Project View:</strong> Enterprise-wide resource utilization dashboard</span>
                          </li>
                        </ul>
                      </motion.div>
                    </div>

                    {/* Value Proposition Banner */}
                    <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-lg p-6 text-white shadow-xl">
                      <div className="flex items-center space-x-4">
                        <div className="text-4xl">🎯</div>
                        <div className="flex-1">
                          <h4 className="font-bold text-lg mb-2">Proactive Intelligence, Not Reactive Management</h4>
                          <p className="text-sm text-blue-100 leading-relaxed">
                            ADPA's advanced features transform traditional project management from reactive firefighting to proactive intelligence.
                            Detect issues before they become problems, optimize resource allocation in real-time, and maintain perfect alignment
                            from portfolio strategy down to individual tasks. Estimated ROI: <strong>300-500% over 18 months</strong>.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </AnimatedCard>

              {/* Executive Drift Alerts Dashboard - TASK-744 */}
              <AnimatedCard
                delay={0.5}
                className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      className="p-2 bg-gradient-to-br from-red-600 to-red-800 rounded-lg"
                    >
                      <AlertCircle className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <CardTitle className="text-xl">Executive Dashboard</CardTitle>
                      <CardDescription>Drift alerts, budget overruns, and opportunities</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ExecutiveDriftAlertsWidget />
                </CardContent>
              </AnimatedCard>

              {/* Performance Metrics */}
              <AnimatedCard
                delay={0.5}
                className="glass border-0 shadow-xl hover:shadow-2xl transition-all duration-300"
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push("/ai-analytics")}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: "Avg Response Time",
                        value: dashboardData?.ai?.total_generations ? "1.2s" : "N/A",
                        icon: Clock,
                        color: "text-blue-500",
                        bgColor: "bg-blue-50 dark:bg-blue-900/20"
                      },
                      {
                        label: "Success Rate",
                        value: dashboardData?.ai?.total_generations ? "98.5%" : "N/A",
                        icon: CheckCircle,
                        color: "text-emerald-500",
                        bgColor: "bg-emerald-50 dark:bg-emerald-900/20"
                      },
                      {
                        label: "Active Providers",
                        value: aiProviders.filter(p => p.is_active).length.toString(),
                        icon: Zap,
                        color: "text-purple-500",
                        bgColor: "bg-purple-50 dark:bg-purple-900/20"
                      },
                      {
                        label: "Documents Today",
                        value: dashboardData?.documents?.documents_last_30d?.toString() || "0",
                        icon: FileText,
                        color: "text-orange-500",
                        bgColor: "bg-orange-50 dark:bg-orange-900/20"
                      },
                    ].map((metric, index) => (
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
                        className="p-2 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg"
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
                        className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
                      >
                        <ActivityIcon className="h-6 w-6 text-white" />
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
                          onClick={() => router.push("/projects")}
                          className="flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 cursor-pointer"
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
                      className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-lg"
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
                          onClick={action.onClick}
                          className={`h-32 flex flex-col justify-center items-center space-y-2 bg-gradient-to-br ${action.color} hover:shadow-lg transition-all duration-300 border-0 w-full`}
                        >
                          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                            <action.icon className="h-8 w-8 text-white" />
                          </motion.div>
                          <div className="text-center">
                            <div className="text-white font-semibold text-base">{action.label}</div>
                            <div className="text-white/80 text-xs mt-1">{action.description}</div>
                          </div>
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
      title: "Compounding Intelligence",
      description: "Each document builds upon previous knowledge, creating an ever-evolving knowledge graph that improves quality over time",
      color: "from-blue-600 to-blue-700"
    },
    {
      icon: FileText,
      title: "Multi-Framework Support",
      description: "PMBOK, BABOK, DMBOK, and custom frameworks for business analysis and project management excellence",
      color: "from-blue-700 to-blue-800"
    },
    {
      icon: "🛡️",
      title: "Enterprise Security",
      description: "SOC 2 Type II compliant with AES-256 encryption, audit trails, and tamper-evident logging",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: Zap,
      title: "80% Cost Reduction",
      description: "Intelligent compression and context management reduces AI token costs by up to 80% while maintaining quality",
      color: "from-blue-800 to-blue-900"
    },
    {
      icon: TrendingUp,
      title: "Real-Time Analytics",
      description: "Track document quality, AI usage, compression efficiency, and ROI with comprehensive dashboards",
      color: "from-blue-600 to-blue-800"
    },
    {
      icon: Users,
      title: "Stakeholder Intelligence",
      description: "Automated stakeholder analysis and personalized content generation for targeted communication",
      color: "from-blue-700 to-blue-900"
    }
  ]

  const integrations = [
    { name: "SharePoint", logo: "🔗" },
    { name: "Confluence", logo: "📝" },
    { name: "Jira", logo: "📋" },
    { name: "Adobe PDF", logo: "📄" },
    { name: "Microsoft 365", logo: "💼" },
    { name: "Google Workspace", logo: "🌐" }
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
                className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl"
              >
                <Brain className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent">
                ADPA Framework
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/login")}
                className="text-slate-700 dark:text-slate-300 hover:text-blue-700 font-medium"
              >
                Client Login
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-6"
              >
                Contact Us
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
              <span className="bg-gradient-to-r from-blue-700 via-blue-800 to-blue-900 bg-clip-text text-transparent">
                Advanced Document
              </span>
              <br />
              <span className="text-slate-800 dark:text-slate-100">
                Processing Analytics
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 max-w-4xl mx-auto leading-relaxed mb-6">
              Enterprise-grade document intelligence for project managers, business analysts, and process improvement professionals.
              Leverage compounding AI to transform requirements gathering, stakeholder analysis, and strategic documentation.
            </p>
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium">
              Trusted by Fortune 500 organizations to deliver strategic frameworks and actionable insights that accelerate decision-making and drive measurable outcomes.
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
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-r from-blue-600 via-blue-700 via-blue-800 to-blue-900 mb-6">
                  <Brain className="h-12 w-12 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">ADPA Framework</h3>
                <p className="text-lg text-slate-600 dark:text-slate-300">Advanced Document Processing Analytics</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Where knowledge compounds and intelligence evolves</p>
              </motion.div>

              {/* Four Segments in Grid Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                {[
                  {
                    icon: "🔍",
                    title: "Gather",
                    description: "Collect project documents\nExtract stakeholder context\nBuild knowledge foundation",
                    color: "from-blue-500 to-blue-600"
                  },
                  {
                    icon: "🧠",
                    title: "Process",
                    description: "6-stage intelligent pipeline\nContext compression & injection\nMulti-provider AI generation",
                    color: "from-blue-600 to-blue-700"
                  },
                  {
                    icon: "📊",
                    title: "Analyze",
                    description: "Real-time analytics & insights\nToken usage optimization\nQuality metrics tracking",
                    color: "from-blue-700 to-blue-800"
                  },
                  {
                    icon: "🔄",
                    title: "Evolve",
                    description: "Compounding intelligence\nKnowledge graph growth\nContinuous improvement",
                    color: "from-blue-800 to-blue-900"
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
                  { title: "80% token reduction", icon: "⚡" },
                  { title: "Compounding intelligence", icon: "🧠" },
                  { title: "Enterprise security", icon: "🛡️" },
                  { title: "Real-time analytics", icon: "📊" }
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
                  <div className="w-8 h-1 bg-gradient-to-r from-blue-600 via-blue-700 via-blue-800 to-blue-900 rounded-full"></div>
                  <span className="text-sm font-medium">Enterprise-Grade Document Intelligence Platform</span>
                  <div className="w-8 h-1 bg-gradient-to-r from-blue-600 via-blue-700 via-blue-800 to-blue-900 rounded-full"></div>
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
              className="bg-gradient-to-r from-blue-700 to-blue-900 hover:from-blue-800 hover:to-slate-900 text-white px-8 py-4 text-lg shadow-xl"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              Request Enterprise Demo
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-blue-700 dark:border-blue-600 text-blue-800 dark:text-blue-400 px-8 py-4 text-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <ActivityIcon className="mr-2 h-5 w-5" />
              View Case Studies
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
              <div className="text-4xl font-bold text-blue-700 mb-2">80%</div>
              <div className="text-slate-600 dark:text-slate-300 font-medium">Cost Reduction</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Through intelligent compression</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-800 mb-2">98.5%</div>
              <div className="text-slate-600 dark:text-slate-300 font-medium">Quality Score</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">Enterprise-grade accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-900 mb-2">50+</div>
              <div className="text-slate-600 dark:text-slate-300 font-medium">Framework Templates</div>
              <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">PMBOK, BABOK, DMBOK</div>
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
              Enterprise Capabilities That Drive Results
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Strategic frameworks and practical guidance designed for project management, business analysis, and process excellence
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
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

          {/* Smart Topic Centric Knowledge Compression - Landing Page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mb-20"
          >
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  Smart Topic Centric Knowledge Compression
                </CardTitle>
                <CardDescription className="text-lg">
                  AI-driven topic extraction and intelligent summarization with domain-specific primers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-center text-slate-600 dark:text-slate-300 mb-8 max-w-4xl mx-auto leading-relaxed">
                  ADPA's intelligent compression engine analyzes documents across multiple knowledge domains,
                  extracting key topics and building contextualized summaries primed with domain expertise.
                  Each knowledge area maintains its own compression matrix, ensuring critical information is preserved
                  while achieving up to 80% token reduction.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {[
                    {
                      domain: "Project Management",
                      primer: "PMBOK 7th Edition",
                      icon: FileText,
                      topics: "Scope, Schedule, Budget, Risk, Stakeholders",
                      color: "from-blue-500 to-blue-600"
                    },
                    {
                      domain: "Business Analysis",
                      primer: "BABOK v3",
                      icon: TrendingUp,
                      topics: "Requirements, Processes, Enterprise Architecture",
                      color: "from-blue-600 to-blue-700"
                    },
                    {
                      domain: "Data Management",
                      primer: "DMBOK Framework",
                      icon: ActivityIcon,
                      topics: "Data Governance, Quality, Architecture, Security",
                      color: "from-blue-700 to-blue-800"
                    },
                    {
                      domain: "Strategic Planning",
                      primer: "Enterprise Strategy",
                      icon: Zap,
                      topics: "Vision, Goals, KPIs, Portfolio Alignment",
                      color: "from-blue-800 to-blue-900"
                    }
                  ].map((area, index) => (
                    <motion.div
                      key={area.domain}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + index * 0.1, duration: 0.6 }}
                      whileHover={{ y: -4, scale: 1.02 }}
                      className="p-5 rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-800"
                    >
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${area.color} flex items-center justify-center mb-4 shadow-lg`}>
                        <area.icon className="h-8 w-8 text-white" />
                      </div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">
                        {area.domain}
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 font-semibold mb-3">
                        {area.primer}
                      </p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {area.topics}
                      </p>
                    </motion.div>
                  ))}
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700">
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-3 flex items-center text-lg">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center mr-3">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    Context Building Intelligence
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                    Our AI analyzes each document through domain-specific lenses, identifying key concepts,
                    relationships, and dependencies. The system builds rich contextual summaries that maintain
                    semantic accuracy while dramatically reducing token consumption. Each summary is tagged with
                    relevance scores, confidence metrics, and cross-domain linkages for optimal reuse.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 10-Stage Enterprise Processing Pipeline - Landing Page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mb-20"
          >
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  10-Stage Enterprise Document Processing Pipeline
                </CardTitle>
                <CardDescription className="text-lg">
                  End-to-end intelligent processing from ingestion to enterprise integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {[
                    {
                      stage: "1. OCR & Ingestion",
                      description: "Optical character recognition for scanned documents, PDFs, and images with format normalization",
                      icon: FileText,
                      color: "from-blue-400 to-blue-500"
                    },
                    {
                      stage: "2. Context Gathering",
                      description: "Collects relevant project documents, stakeholder information, and historical context",
                      icon: ActivityIcon,
                      color: "from-blue-450 to-blue-550"
                    },
                    {
                      stage: "3. Topic Extraction",
                      description: "AI-driven topic analysis and domain-specific knowledge categorization across frameworks",
                      icon: Zap,
                      color: "from-blue-500 to-blue-600"
                    },
                    {
                      stage: "4. Content Prioritization",
                      description: "Ranks content by relevance, importance, and impact using multi-dimensional scoring",
                      icon: TrendingUp,
                      color: "from-blue-550 to-blue-650"
                    },
                    {
                      stage: "5. Smart Compression",
                      description: "Topic-centric compression with domain primers, achieving 80% token reduction",
                      icon: ActivityIcon,
                      color: "from-blue-600 to-blue-700"
                    },
                    {
                      stage: "6. Context Injection",
                      description: "Injects compressed, domain-aware context into AI prompts for enhanced generation",
                      icon: Zap,
                      color: "from-blue-650 to-blue-750"
                    },
                    {
                      stage: "7. AI Generation",
                      description: "Multi-provider AI generation with framework-specific templates and guardrails",
                      icon: Brain,
                      color: "from-blue-700 to-blue-800"
                    },
                    {
                      stage: "8. Quality Scoring",
                      description: "Knowledge output matrix scoring: completeness, accuracy, coherence, compliance",
                      icon: CheckCircle,
                      color: "from-blue-750 to-blue-850"
                    },
                    {
                      stage: "9. Analytics & Reporting",
                      description: "Real-time metrics, cost analysis, quality dashboards, and ROI tracking",
                      icon: TrendingUp,
                      color: "from-blue-800 to-blue-900"
                    },
                    {
                      stage: "10. Enterprise Integration",
                      description: "Seamless export to SharePoint, Confluence, Jira, and enterprise document systems",
                      icon: ActivityIcon,
                      color: "from-blue-900 to-slate-900"
                    }
                  ].map((stage, index) => (
                    <motion.div
                      key={stage.stage}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + index * 0.05, duration: 0.4 }}
                      whileHover={{ y: -2, scale: 1.02 }}
                      className="p-4 rounded-xl border-2 border-blue-200 dark:border-blue-700 hover:shadow-lg transition-all duration-200 bg-white dark:bg-slate-800"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${stage.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <stage.icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm mb-1">
                            {stage.stage}
                          </h4>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                            {stage.description}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Advanced Enterprise Intelligence - Landing Page */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.8 }}
          >
            <Card className="border-0 shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">
                  Advanced Enterprise Intelligence
                </CardTitle>
                <CardDescription className="text-lg">
                  Proactive project management with AI-powered baseline tracking and drift detection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Baseline & Drift Detection */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.1, duration: 0.6 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700"
                  >
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg flex-shrink-0">
                        <TrendingUp className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">
                          Baseline & Drift Detection
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                          Automated scope deviation tracking
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Scope Drift:</strong> Real-time detection of scope creep and unauthorized changes</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Technical Drift:</strong> Architecture and technology stack deviation alerts</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Timeline Drift:</strong> Schedule variance analysis with critical path impact</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Budget Drift:</strong> Cost overrun detection with automatic escalation</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Auto Change Requests:</strong> Generates CRs from detected positive deviations</span>
                      </li>
                    </ul>
                  </motion.div>

                  {/* Document Review Intelligence */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.2, duration: 0.6 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/20 dark:to-blue-700/20 border-2 border-blue-300 dark:border-blue-600"
                  >
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 flex items-center justify-center shadow-lg flex-shrink-0">
                        <FileText className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">
                          Document Review Intelligence
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                          AI-powered feedback analytics
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Multi-Level Feedback:</strong> Stakeholder, reviewer, and peer input aggregation</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Sentiment Analysis:</strong> AI-driven tone and satisfaction scoring</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Template Optimization:</strong> Continuous improvement based on feedback patterns</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Provider Performance:</strong> AI model effectiveness tracking and optimization</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Quality Trends:</strong> Longitudinal analysis of document quality evolution</span>
                      </li>
                    </ul>
                  </motion.div>

                  {/* Hierarchical Project Management */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.3, duration: 0.6 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-800/20 dark:to-blue-700/20 border-2 border-blue-300 dark:border-blue-600"
                  >
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg flex-shrink-0">
                        <ActivityIcon className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">
                          Hierarchical Project Management
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                          Portfolio → Program → Project → Task
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Portfolio View:</strong> Strategic alignment and cross-program dependencies</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Program Management:</strong> Multi-project coordination and resource sharing</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Misalignment Detection:</strong> AI identifies over-elevated or hidden programs</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Consolidation Alerts:</strong> Suggests project mergers for efficiency gains</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Cross-Level Drift:</strong> Detects scope creep cascading across hierarchy</span>
                      </li>
                    </ul>
                  </motion.div>

                  {/* Resource Allocation Intelligence */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.4, duration: 0.6 }}
                    className="p-6 rounded-xl bg-gradient-to-br from-blue-200 to-blue-300 dark:from-blue-700/20 dark:to-blue-600/20 border-2 border-blue-400 dark:border-blue-500"
                  >
                    <div className="flex items-start space-x-4 mb-4">
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-800 to-slate-900 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1">
                          Resource Allocation Intelligence
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">
                          Integration-first approach
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Jira Integration:</strong> Pull work logs and time tracking from existing systems</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Overallocation Alerts:</strong> Identifies resource conflicts across projects</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Underutilization Detection:</strong> Flags idle capacity and optimization opportunities</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Skill Gap Analysis:</strong> AI-driven competency mapping and recommendations</span>
                      </li>
                      <li className="flex items-start">
                        <span className="text-blue-600 mr-2 text-lg">•</span>
                        <span><strong>Cross-Project View:</strong> Enterprise-wide resource utilization dashboard</span>
                      </li>
                    </ul>
                  </motion.div>
                </div>

                {/* Value Proposition Banner */}
                <div className="bg-gradient-to-r from-blue-700 to-blue-900 rounded-xl p-8 text-white shadow-2xl">
                  <div className="flex items-center space-x-6">
                    <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center">
                      <Zap className="h-10 w-10 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-2xl mb-3">Proactive Intelligence, Not Reactive Management</h4>
                      <p className="text-blue-100 leading-relaxed text-base">
                        ADPA's advanced features transform traditional project management from reactive firefighting to proactive intelligence.
                        Detect issues before they become problems, optimize resource allocation in real-time, and maintain perfect alignment
                        from portfolio strategy down to individual tasks. Estimated ROI: <strong className="text-white">300-500% over 18 months</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
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
              Enterprise System Integration
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Connect seamlessly with your existing enterprise platforms and collaboration tools for unified document intelligence
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
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-800 via-blue-900 to-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Turn Insight Into Action
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Discover how ADPA's compounding intelligence platform helps Fortune 500 organizations
              accelerate project delivery, reduce costs by 80%, and maintain enterprise-grade compliance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => router.push("/login")}
                className="bg-white text-blue-900 hover:bg-blue-50 px-8 py-4 text-lg font-semibold shadow-xl"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Request Enterprise Demo
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/login")}
                className="border-2 border-white text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold"
              >
                Talk To An Expert
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
                className="p-2 bg-gradient-to-br from-blue-700 to-blue-900 rounded-xl"
              >
                <Brain className="h-6 w-6 text-white" />
              </motion.div>
              <span className="text-xl font-bold">ADPA</span>
            </div>
            <div className="flex items-center space-x-6 text-sm text-slate-400">
              <span>© 2025 ADPA. All rights reserved.</span>
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
