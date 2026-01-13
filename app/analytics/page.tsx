"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import dynamic from 'next/dynamic'

const SimpleLineChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.SimpleLineChart), { ssr: false, loading: () => <div className="h-80 flex items-center justify-center text-muted-foreground">Loading chart...</div> })
const GenericBarChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.GenericBarChart), { ssr: false })
const AreaChartWrapper = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.AreaChartWrapper), { ssr: false })
const ProviderPieChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.ProviderPieChart), { ssr: false })
const GenericPieChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.GenericPieChart), { ssr: false })
const MultiBarChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.MultiBarChart), { ssr: false })
const CombinedAreaLineChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.CombinedAreaLineChart), { ssr: false })
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Activity,
  Download,
  Calendar,
  BarChart3,
  PieChartIcon,
  LineChartIcon,
  Zap,
  Database,
  Server,
  Eye,
  Timer,
  Search,
} from "@/components/ui/icons-shim"

// Mock data for analytics
const userActivityData = [
  { name: "Jan", users: 1200, sessions: 2400, documents: 890 },
  { name: "Feb", users: 1900, sessions: 3200, documents: 1200 },
  { name: "Mar", users: 2100, sessions: 3800, documents: 1450 },
  { name: "Apr", users: 2400, sessions: 4200, documents: 1680 },
  { name: "May", users: 2800, sessions: 4800, documents: 1920 },
  { name: "Jun", users: 3200, sessions: 5400, documents: 2150 },
  { name: "Jul", users: 3600, sessions: 6000, documents: 2380 },
]

const documentTypeData = [
  { name: "Requirements", value: 35, count: 1250, color: "#3b82f6" },
  { name: "Specifications", value: 25, count: 890, color: "#8b5cf6" },
  { name: "Reports", value: 20, count: 720, color: "#06b6d4" },
  { name: "Templates", value: 12, count: 430, color: "#10b981" },
  { name: "Others", value: 8, count: 290, color: "#f59e0b" },
]

const systemPerformanceData = [
  { name: "00:00", cpu: 45, memory: 62, disk: 78, network: 23 },
  { name: "04:00", cpu: 38, memory: 58, disk: 75, network: 19 },
  { name: "08:00", cpu: 72, memory: 84, disk: 82, network: 45 },
  { name: "12:00", cpu: 85, memory: 91, disk: 88, network: 67 },
  { name: "16:00", cpu: 78, memory: 87, disk: 85, network: 52 },
  { name: "20:00", cpu: 65, memory: 73, disk: 80, network: 38 },
]

const projectStatusData = [
  { name: "Active", value: 45, color: "#10b981" },
  { name: "Planning", value: 25, color: "#3b82f6" },
  { name: "On Hold", value: 15, color: "#f59e0b" },
  { name: "Completed", value: 15, color: "#6b7280" },
]

const aiUsageData = [
  { name: "Week 1", analysis: 120, generation: 89, processing: 156 },
  { name: "Week 2", analysis: 145, generation: 102, processing: 178 },
  { name: "Week 3", analysis: 167, generation: 134, processing: 203 },
  { name: "Week 4", analysis: 189, generation: 156, processing: 234 },
]

const topUsersData = [
  { name: "John Smith", documents: 45, sessions: 23, lastActive: "2 hours ago" },
  { name: "Sarah Johnson", documents: 38, sessions: 19, lastActive: "1 hour ago" },
  { name: "Mike Davis", documents: 32, sessions: 16, lastActive: "30 minutes ago" },
  { name: "Emily Brown", documents: 28, sessions: 14, lastActive: "4 hours ago" },
  { name: "David Wilson", documents: 25, sessions: 12, lastActive: "1 day ago" },
]

export default function AnalyticsPage() {
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("7d")
  const [analyticsData, setAnalyticsData] = useState<{
    total_users?: number
    active_users?: number
    total_documents?: number
    documents_today?: number
    total_sessions?: number
    avg_session_time?: string
    system_uptime?: string
    api_calls?: number
    system_performance?: Array<{
      name: string
      cpu: number
      memory: number
      disk: number
      network: number
    }>
  } | null>(null)
  const [searchAnalytics, setSearchAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchLoading, setSearchLoading] = useState(false)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Only attempt to fetch system analytics if user is admin
      if (!hasPermission('analytics.system')) {
        console.log('User does not have analytics.system permission, using mock data')
        setAnalyticsData(null) // Will fall back to mock data
        return
      }

      const data = await apiClient.getSystemAnalytics(timeRange)
      setAnalyticsData(data)
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
      // Gracefully fall back to mock data instead of showing error
      console.log('Falling back to mock analytics data')
      setAnalyticsData(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchSearchAnalytics = async () => {
    try {
      setSearchLoading(true)
      const data = await apiClient.get(`/analytics/search?timeRange=${timeRange}`)
      setSearchAnalytics(data)
    } catch (error) {
      console.error("Failed to fetch search analytics:", error)
      setSearchAnalytics(null)
    } finally {
      setSearchLoading(false)
    }
  }

  useEffect(() => {
    void fetchAnalytics()
    void fetchSearchAnalytics()
  }, [timeRange, hasPermission])

  // Stats with real data from API (fallback to mock if unavailable)
  const stats = {
    totalUsers: analyticsData?.total_users || 0,
    activeUsers: analyticsData?.active_users || 0,
    totalDocuments: analyticsData?.total_documents || 0,
    documentsToday: analyticsData?.documents_today || 0,
    totalSessions: analyticsData?.total_sessions || 0,
    avgSessionTime: analyticsData?.avg_session_time || "0m 0s", // TODO: Calculate from user_activity_logs
    systemUptime: analyticsData?.system_uptime || "N/A",
    apiCalls: analyticsData?.api_calls || 0,
    currentResources: analyticsData?.system_performance?.length
      ? analyticsData.system_performance[analyticsData.system_performance.length - 1]
      : { cpu: 0, memory: 0, disk: 0, network: 0 }
  }

  const growth = {
    users: 12.5,
    documents: 8.3,
    sessions: 15.7,
    performance: -2.1,
  }

  if (!hasPermission("analytics.system")) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                  <p className="text-muted-foreground">You don't have permission to view analytics.</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-blue-900/20 dark:to-purple-900/20">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            <PageTransition>
              <AnimatedLayout className="space-y-8">
                {/* Header */}
                <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
                      Analytics Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-2">
                      Comprehensive insights into system usage, performance, and user behavior
                    </p>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className="text-sm text-muted-foreground">
                        {isConnected ? 'Live data' : 'Offline'}
                      </span>
                    </div>
                    <Select value={timeRange} onValueChange={setTimeRange}>
                      <SelectTrigger className="w-32">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
                        <SelectItem value="1y">Last year</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={fetchAnalytics} variant="outline" size="sm">
                      <Activity className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Key Metrics */}
                <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                            {loading ? (
                              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                            ) : (
                              <>
                                <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                                {analyticsData && (
                                  <div className="flex items-center mt-2">
                                    <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                                    <span className="text-sm text-green-600">Active: {stats.activeUsers.toLocaleString()}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <Users className="h-8 w-8 text-blue-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Documents</p>
                            {loading ? (
                              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                            ) : (
                              <>
                                <p className="text-2xl font-bold">{stats.totalDocuments.toLocaleString()}</p>
                                {analyticsData && stats.documentsToday > 0 && (
                                  <div className="flex items-center mt-2">
                                    <FileText className="h-4 w-4 text-purple-500 mr-1" />
                                    <span className="text-sm text-muted-foreground">{stats.documentsToday} today</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <FileText className="h-8 w-8 text-purple-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Active Sessions</p>
                            {loading ? (
                              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                            ) : (
                              <>
                                <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
                                {analyticsData && stats.apiCalls > 0 && (
                                  <div className="flex items-center mt-2">
                                    <Zap className="h-4 w-4 text-yellow-500 mr-1" />
                                    <span className="text-sm text-muted-foreground">{stats.apiCalls.toLocaleString()} API calls</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <Activity className="h-8 w-8 text-cyan-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>

                  <AnimatedGridItem>
                    <Card className="glass border-0 shadow-lg hover-lift">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">System Uptime</p>
                            {loading ? (
                              <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 animate-pulse rounded mt-1" />
                            ) : (
                              <>
                                <p className="text-2xl font-bold">{stats.systemUptime}</p>
                                {analyticsData && analyticsData.system_uptime && analyticsData.system_uptime !== "N/A" && (
                                  <div className="flex items-center mt-2">
                                    <Server className="h-4 w-4 text-green-500 mr-1" />
                                    <span className="text-sm text-muted-foreground">Monitoring active</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                          <Server className="h-8 w-8 text-green-500" />
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>
                </AnimatedGrid>

                {/* Main Analytics Content */}
                <Card className="glass border-0 shadow-lg">
                  <CardContent className="p-6">
                    <Tabs defaultValue="overview" className="space-y-6">
                      <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="performance">Performance</TabsTrigger>
                        <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
                        <TabsTrigger value="search">Search</TabsTrigger>
                      </TabsList>

                      <TabsContent value="overview" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                  <BarChart3 className="h-5 w-5" />
                                  <span>User Activity Trends</span>
                                </CardTitle>
                                <CardDescription>Monthly user engagement and document creation</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <AreaChartWrapper
                                  data={userActivityData}
                                  dataKey={[
                                    { key: 'users', stroke: '#3b82f6', fill: '#3b82f6', fillOpacity: 0.6 },
                                    { key: 'sessions', stroke: '#8b5cf6', fill: '#8b5cf6', fillOpacity: 0.6 },
                                  ]}
                                />
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardHeader>
                                <CardTitle className="flex items-center space-x-2">
                                  <PieChartIcon className="h-5 w-5" />
                                  <span>Document Types</span>
                                </CardTitle>
                                <CardDescription>Distribution of document types generated</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <GenericPieChart
                                  data={documentTypeData}
                                  dataKey="value"
                                  colorKey="color"
                                  labelFormatter={(e: any) => `${e.name} ${(e.percent * 100).toFixed(0)}%`}
                                />
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>
                        </div>

                        <AnimatedGridItem>
                          <Card className="border border-slate-200 dark:border-slate-700">
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <LineChartIcon className="h-5 w-5" />
                                <span>System Performance</span>
                              </CardTitle>
                              <CardDescription>Real-time system resource utilization</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <SimpleLineChart
                                data={systemPerformanceData}
                                lines={[
                                  { key: 'cpu', color: '#ef4444' },
                                  { key: 'memory', color: '#3b82f6' },
                                  { key: 'disk', color: '#10b981' },
                                  { key: 'network', color: '#f59e0b' },
                                ]}
                              />
                            </CardContent>
                          </Card>
                        </AnimatedGridItem>
                      </TabsContent>

                      <TabsContent value="users" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2">
                            <AnimatedGridItem>
                              <Card className="border border-slate-200 dark:border-slate-700">
                                <CardHeader>
                                  <CardTitle>User Growth</CardTitle>
                                  <CardDescription>Monthly active users and new registrations</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <MultiBarChart
                                    data={userActivityData}
                                    bars={[{ key: 'users', fill: '#3b82f6' }, { key: 'sessions', fill: '#8b5cf6' }]}
                                  />
                                </CardContent>
                              </Card>
                            </AnimatedGridItem>
                          </div>

                          <div>
                            <AnimatedGridItem>
                              <Card className="border border-slate-200 dark:border-slate-700">
                                <CardHeader>
                                  <CardTitle>Top Active Users</CardTitle>
                                  <CardDescription>Most engaged users this month</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                  {topUsersData.map((user, index) => (
                                    <div
                                      key={user.name}
                                      className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
                                    >
                                      <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {user.documents} docs • {user.sessions} sessions
                                        </p>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {user.lastActive}
                                      </Badge>
                                    </div>
                                  ))}
                                </CardContent>
                              </Card>
                            </AnimatedGridItem>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                                    <p className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</p>
                                  </div>
                                  <Eye className="h-8 w-8 text-blue-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Avg Session Time</p>
                                    <p className="text-2xl font-bold">{stats.avgSessionTime}</p>
                                  </div>
                                  <Timer className="h-8 w-8 text-green-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">API Calls</p>
                                    <p className="text-2xl font-bold">{stats.apiCalls.toLocaleString()}</p>
                                  </div>
                                  <Zap className="h-8 w-8 text-yellow-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>
                        </div>
                      </TabsContent>

                      <TabsContent value="documents" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardHeader>
                                <CardTitle>Document Generation Trends</CardTitle>
                                <CardDescription>Monthly document creation statistics</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <CombinedAreaLineChart
                                  data={userActivityData}
                                  xKey="name"
                                  areas={[{ key: 'documents', stroke: '#10b981', fill: '#10b981', fillOpacity: 0.6 }]}
                                  lines={[]}
                                />
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardHeader>
                                <CardTitle>Document Type Distribution</CardTitle>
                                <CardDescription>Breakdown by document categories</CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                {documentTypeData.map((type) => (
                                  <div key={type.name} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-medium">{type.name}</span>
                                      <span className="text-sm text-muted-foreground">{type.count} docs</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className="h-2 rounded-full"
                                        style={{ width: `${type.value}%`, backgroundColor: type.color }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>
                        </div>
                      </TabsContent>

                      <TabsContent value="performance" className="space-y-6">
                        <AnimatedGridItem>
                          <Card className="border border-slate-200 dark:border-slate-700">
                            <CardHeader>
                              <CardTitle>System Resource Usage</CardTitle>
                              <CardDescription>Real-time monitoring of system performance metrics</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <SimpleLineChart
                                data={analyticsData?.system_performance || systemPerformanceData}
                                lines={[
                                  { key: 'cpu', color: '#ef4444' },
                                  { key: 'memory', color: '#3b82f6' },
                                  { key: 'disk', color: '#10b981' },
                                  { key: 'network', color: '#f59e0b' },
                                ]}
                              />
                            </CardContent>
                          </Card>
                        </AnimatedGridItem>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">CPU Usage</p>
                                    <p className="text-2xl font-bold">{stats.currentResources.cpu}%</p>
                                  </div>
                                  <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                                    <div className="h-4 w-4 rounded-full bg-red-500" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Memory</p>
                                    <p className="text-2xl font-bold">{stats.currentResources.memory}%</p>
                                  </div>
                                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                                    <div className="h-4 w-4 rounded-full bg-blue-500" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Disk I/O</p>
                                    <p className="text-2xl font-bold">{stats.currentResources.disk}%</p>
                                  </div>
                                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                                    <div className="h-4 w-4 rounded-full bg-green-500" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Network</p>
                                    <p className="text-2xl font-bold">{stats.currentResources.network}%</p>
                                  </div>
                                  <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <div className="h-4 w-4 rounded-full bg-yellow-500" />
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>
                        </div>
                      </TabsContent>

                      <TabsContent value="ai-usage" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardHeader>
                                <CardTitle>AI Processing Trends</CardTitle>
                                <CardDescription>Weekly AI service utilization</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <MultiBarChart
                                  data={aiUsageData}
                                  bars={[
                                    { key: 'analysis', fill: '#3b82f6' },
                                    { key: 'generation', fill: '#8b5cf6' },
                                    { key: 'processing', fill: '#10b981' },
                                  ]}
                                />
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardHeader>
                                <CardTitle>Project Status Overview</CardTitle>
                                <CardDescription>Current project distribution</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <GenericPieChart
                                  data={projectStatusData}
                                  dataKey="value"
                                  colorKey="color"
                                  labelFormatter={(e: any) => `${e.name} ${(e.percent * 100).toFixed(0)}%`}
                                />
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">AI Analysis</p>
                                    <p className="text-2xl font-bold">1,234</p>
                                    <p className="text-sm text-green-600">+15% this week</p>
                                  </div>
                                  <Database className="h-8 w-8 text-blue-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Document Generation</p>
                                    <p className="text-2xl font-bold">856</p>
                                    <p className="text-sm text-green-600">+22% this week</p>
                                  </div>
                                  <FileText className="h-8 w-8 text-purple-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>

                          <AnimatedGridItem>
                            <Card className="border border-slate-200 dark:border-slate-700">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Processing Time</p>
                                    <p className="text-2xl font-bold">2.3s</p>
                                    <p className="text-sm text-red-600">+5% slower</p>
                                  </div>
                                  <Zap className="h-8 w-8 text-yellow-500" />
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>
                        </div>
                      </TabsContent>

                      <TabsContent value="search" className="space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold mb-4">Search Analytics</h2>
                          <p className="text-muted-foreground mb-6">
                            Insights into search usage, popular queries, and user behavior
                          </p>
                        </div>

                        {searchLoading ? (
                          <div className="flex items-center justify-center h-64">
                            <div className="text-center">
                              <Activity className="h-8 w-8 text-blue-500 mx-auto mb-2 animate-pulse" />
                              <p className="text-muted-foreground">Loading search analytics...</p>
                            </div>
                          </div>
                        ) : searchAnalytics ? (
                          <>
                            {/* Search Statistics */}
                            <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              <AnimatedGridItem>
                                <Card className="glass border-0 shadow-lg">
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Total Searches</p>
                                        <p className="text-2xl font-bold">{searchAnalytics.statistics?.total_searches?.toLocaleString() || 0}</p>
                                      </div>
                                      <Search className="h-8 w-8 text-blue-500" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </AnimatedGridItem>

                              <AnimatedGridItem>
                                <Card className="glass border-0 shadow-lg">
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                                        <p className="text-2xl font-bold">{Number(searchAnalytics.statistics?.success_rate || 0).toFixed(1)}%</p>
                                      </div>
                                      <TrendingUp className="h-8 w-8 text-green-500" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </AnimatedGridItem>

                              <AnimatedGridItem>
                                <Card className="glass border-0 shadow-lg">
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Avg Results</p>
                                        <p className="text-2xl font-bold">{Number(searchAnalytics.statistics?.avg_results_per_search || 0).toFixed(1)}</p>
                                      </div>
                                      <BarChart3 className="h-8 w-8 text-purple-500" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </AnimatedGridItem>

                              <AnimatedGridItem>
                                <Card className="glass border-0 shadow-lg">
                                  <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="text-sm font-medium text-muted-foreground">Cache Hit Rate</p>
                                        <p className="text-2xl font-bold">{Number(searchAnalytics.statistics?.cache_hit_rate || 0).toFixed(1)}%</p>
                                      </div>
                                      <Zap className="h-8 w-8 text-yellow-500" />
                                    </div>
                                  </CardContent>
                                </Card>
                              </AnimatedGridItem>
                            </AnimatedGrid>

                            {/* Popular Searches */}
                            <Card className="glass border-0 shadow-lg">
                              <CardHeader>
                                <CardTitle>Popular Searches</CardTitle>
                                <CardDescription>Most searched queries in the last 30 days</CardDescription>
                              </CardHeader>
                              <CardContent>
                                {searchAnalytics.popularSearches && searchAnalytics.popularSearches.length > 0 ? (
                                  <div className="space-y-2">
                                    {searchAnalytics.popularSearches.slice(0, 10).map((search: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                          <span className="text-sm font-medium text-muted-foreground">#{idx + 1}</span>
                                          <span className="font-medium">{search.query}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <span>{search.search_count} searches</span>
                                          <span>{search.unique_users} users</span>
                                          <span>{Number(search.success_rate || 0).toFixed(0)}% success</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground text-center py-8">No search data available yet</p>
                                )}
                              </CardContent>
                            </Card>

                            {/* Search Mode Usage */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <Card className="glass border-0 shadow-lg">
                                <CardHeader>
                                  <CardTitle>Search Mode Usage</CardTitle>
                                  <CardDescription>Distribution of search modes</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  {searchAnalytics.modeUsage && searchAnalytics.modeUsage.length > 0 ? (
                                    <GenericPieChart
                                      data={searchAnalytics.modeUsage.map((m: any, i: number) => ({
                                        name: m.search_mode,
                                        value: Number(m.usage_count) || 0,
                                        color: ['#3b82f6', '#8b5cf6', '#06b6d4'][i % 3]
                                      }))}
                                      dataKey="value"
                                      colorKey="color"
                                      labelFormatter={(e: any) => `${e.name}: ${e.value} (${((e.percent ?? 0) * 100).toFixed(0)}%)`}
                                    />
                                  ) : (
                                    <p className="text-muted-foreground text-center py-8">No mode usage data</p>
                                  )}
                                </CardContent>
                              </Card>

                              <Card className="glass border-0 shadow-lg">
                                <CardHeader>
                                  <CardTitle>Success Rate Over Time</CardTitle>
                                  <CardDescription>Search success rate trends</CardDescription>
                                </CardHeader>
                                <CardContent>
                                  {searchAnalytics.successRate && searchAnalytics.successRate.length > 0 ? (
                                    <SimpleLineChart data={searchAnalytics.successRate} lines={[{ key: 'success_rate', color: '#10b981' }]} xKey="date" />
                                  ) : (
                                    <p className="text-muted-foreground text-center py-8">No success rate data</p>
                                  )}
                                </CardContent>
                              </Card>
                            </div>

                            {/* Top Clicked Results */}
                            <Card className="glass border-0 shadow-lg">
                              <CardHeader>
                                <CardTitle>Top Clicked Results</CardTitle>
                                <CardDescription>Most clicked search results</CardDescription>
                              </CardHeader>
                              <CardContent>
                                {searchAnalytics.topClickedResults && searchAnalytics.topClickedResults.length > 0 ? (
                                  <div className="space-y-2">
                                    {searchAnalytics.topClickedResults.slice(0, 10).map((result: any, idx: number) => (
                                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                          <Badge variant="outline">{result.result_type}</Badge>
                                          <span className="font-medium">{result.result_title || 'Untitled'}</span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                          <span>{result.click_count} clicks</span>
                                          <span>Avg position: {Number(result.avg_position || 0).toFixed(1)}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-muted-foreground text-center py-8">No click data available</p>
                                )}
                              </CardContent>
                            </Card>
                          </>
                        ) : (
                          <Card className="glass border-0 shadow-lg">
                            <CardContent className="p-12 text-center">
                              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">No Search Analytics Available</h3>
                              <p className="text-muted-foreground">
                                Search analytics will appear here once users start searching.
                              </p>
                            </CardContent>
                          </Card>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </AnimatedLayout>
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
