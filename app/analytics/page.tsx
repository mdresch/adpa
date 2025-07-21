"use client"

import { useState, useEffect } from "react"
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
} from "lucide-react"

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

  const [timeRange, setTimeRange] = useState("7d")
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const data = await apiClient.getSystemAnalytics(timeRange)
      setAnalyticsData(data)
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
      toast.error("Failed to load analytics data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [timeRange])

  // Mock stats with real-time capability
  const stats = {
    totalUsers: analyticsData?.total_users || 12450,
    activeUsers: analyticsData?.active_users || 3280,
    totalDocuments: 45680,
    documentsToday: 234,
    totalSessions: 89340,
    avgSessionTime: "12m 34s",
    systemUptime: "99.8%",
    apiCalls: 234567,
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
                        <SelectItem value="24h">Last 24h</SelectItem>
                        <SelectItem value="7d">Last 7 days</SelectItem>
                        <SelectItem value="30d">Last 30 days</SelectItem>
                        <SelectItem value="90d">Last 90 days</SelectItem>
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
                            <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
                            <div className="flex items-center mt-2">
                              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm text-green-600">+{growth.users}%</span>
                            </div>
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
                            <p className="text-2xl font-bold">{stats.totalDocuments.toLocaleString()}</p>
                            <div className="flex items-center mt-2">
                              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm text-green-600">+{growth.documents}%</span>
                            </div>
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
                            <p className="text-2xl font-bold">{stats.totalSessions.toLocaleString()}</p>
                            <div className="flex items-center mt-2">
                              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                              <span className="text-sm text-green-600">+{growth.sessions}%</span>
                            </div>
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
                            <p className="text-2xl font-bold">{stats.systemUptime}</p>
                            <div className="flex items-center mt-2">
                              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                              <span className="text-sm text-red-600">{growth.performance}%</span>
                            </div>
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
                      <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="users">Users</TabsTrigger>
                        <TabsTrigger value="documents">Documents</TabsTrigger>
                        <TabsTrigger value="performance">Performance</TabsTrigger>
                        <TabsTrigger value="ai-usage">AI Usage</TabsTrigger>
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
                                <ResponsiveContainer width="100%" height={300}>
                                  <AreaChart data={userActivityData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Area
                                      type="monotone"
                                      dataKey="users"
                                      stackId="1"
                                      stroke="#3b82f6"
                                      fill="#3b82f6"
                                      fillOpacity={0.6}
                                    />
                                    <Area
                                      type="monotone"
                                      dataKey="sessions"
                                      stackId="2"
                                      stroke="#8b5cf6"
                                      fill="#8b5cf6"
                                      fillOpacity={0.6}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
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
                                <ResponsiveContainer width="100%" height={300}>
                                  <PieChart>
                                    <Pie
                                      data={documentTypeData}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {documentTypeData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
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
                              <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={systemPerformanceData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={2} />
                                  <Line type="monotone" dataKey="memory" stroke="#3b82f6" strokeWidth={2} />
                                  <Line type="monotone" dataKey="disk" stroke="#10b981" strokeWidth={2} />
                                  <Line type="monotone" dataKey="network" stroke="#f59e0b" strokeWidth={2} />
                                </LineChart>
                              </ResponsiveContainer>
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
                                  <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={userActivityData}>
                                      <CartesianGrid strokeDasharray="3 3" />
                                      <XAxis dataKey="name" />
                                      <YAxis />
                                      <Tooltip />
                                      <Legend />
                                      <Bar dataKey="users" fill="#3b82f6" />
                                      <Bar dataKey="sessions" fill="#8b5cf6" />
                                    </BarChart>
                                  </ResponsiveContainer>
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
                                <ResponsiveContainer width="100%" height={300}>
                                  <AreaChart data={userActivityData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Area
                                      type="monotone"
                                      dataKey="documents"
                                      stroke="#10b981"
                                      fill="#10b981"
                                      fillOpacity={0.6}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
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
                              <ResponsiveContainer width="100%" height={400}>
                                <LineChart data={systemPerformanceData}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Legend />
                                  <Line type="monotone" dataKey="cpu" stroke="#ef4444" strokeWidth={3} name="CPU %" />
                                  <Line
                                    type="monotone"
                                    dataKey="memory"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    name="Memory %"
                                  />
                                  <Line type="monotone" dataKey="disk" stroke="#10b981" strokeWidth={3} name="Disk %" />
                                  <Line
                                    type="monotone"
                                    dataKey="network"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    name="Network %"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
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
                                    <p className="text-2xl font-bold">72%</p>
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
                                    <p className="text-2xl font-bold">84%</p>
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
                                    <p className="text-2xl font-bold">45%</p>
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
                                    <p className="text-2xl font-bold">23%</p>
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
                                <ResponsiveContainer width="100%" height={300}>
                                  <BarChart data={aiUsageData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="analysis" fill="#3b82f6" name="Analysis" />
                                    <Bar dataKey="generation" fill="#8b5cf6" name="Generation" />
                                    <Bar dataKey="processing" fill="#10b981" name="Processing" />
                                  </BarChart>
                                </ResponsiveContainer>
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
                                <ResponsiveContainer width="100%" height={300}>
                                  <PieChart>
                                    <Pie
                                      data={projectStatusData}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                      outerRadius={80}
                                      fill="#8884d8"
                                      dataKey="value"
                                    >
                                      {projectStatusData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                      ))}
                                    </Pie>
                                    <Tooltip />
                                  </PieChart>
                                </ResponsiveContainer>
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
