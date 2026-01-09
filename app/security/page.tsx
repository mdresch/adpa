"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { AnimatedLayout, AnimatedCard, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  Shield,
  ShieldAlert,
  ShieldCheck,
  Lock,
  Key,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Activity,
  FileText,
  Settings,
  Download,
  Filter,
  Search,
  MoreHorizontal,
  Zap,
  UserCheck,
  UserX,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react"

// Mock data for security metrics
const securityMetrics = [
  {
    title: "Security Score",
    value: "94%",
    change: "+2%",
    trend: "up",
    icon: Shield,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    title: "Active Threats",
    value: "3",
    change: "-5",
    trend: "down",
    icon: ShieldAlert,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-900/20",
  },
  {
    title: "Failed Logins",
    value: "127",
    change: "+12%",
    trend: "up",
    icon: Lock,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
  },
  {
    title: "Compliance Status",
    value: "98.5%",
    change: "+0.5%",
    trend: "up",
    icon: CheckCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
  },
]

// Mock data for security events
const securityEvents = [
  {
    id: 1,
    type: "Failed Login",
    severity: "medium",
    user: "john.doe@company.com",
    ip: "192.168.1.100",
    timestamp: "2024-01-20 14:30:25",
    status: "blocked",
    location: "New York, US",
  },
  {
    id: 2,
    type: "Suspicious Activity",
    severity: "high",
    user: "admin@company.com",
    ip: "10.0.0.50",
    timestamp: "2024-01-20 14:25:10",
    status: "investigating",
    location: "London, UK",
  },
  {
    id: 3,
    type: "Permission Change",
    severity: "low",
    user: "manager@company.com",
    ip: "192.168.1.75",
    timestamp: "2024-01-20 14:20:45",
    status: "approved",
    location: "San Francisco, US",
  },
  {
    id: 4,
    type: "API Access",
    severity: "medium",
    user: "service-account",
    ip: "172.16.0.10",
    timestamp: "2024-01-20 14:15:30",
    status: "allowed",
    location: "Internal",
  },
  {
    id: 5,
    type: "Data Export",
    severity: "high",
    user: "analyst@company.com",
    ip: "192.168.1.200",
    timestamp: "2024-01-20 14:10:15",
    status: "completed",
    location: "Chicago, US",
  },
]

// Mock data for compliance metrics
const complianceData = [
  { name: "GDPR", score: 98, status: "compliant" },
  { name: "SOC 2", score: 95, status: "compliant" },
  { name: "ISO 27001", score: 92, status: "compliant" },
  { name: "HIPAA", score: 89, status: "warning" },
  { name: "PCI DSS", score: 96, status: "compliant" },
]

// Mock data for threat trends
const threatTrends = [
  { date: "Jan 15", threats: 12, blocked: 11, resolved: 10 },
  { date: "Jan 16", threats: 8, blocked: 8, resolved: 7 },
  { date: "Jan 17", threats: 15, blocked: 13, resolved: 12 },
  { date: "Jan 18", threats: 6, blocked: 6, resolved: 6 },
  { date: "Jan 19", threats: 9, blocked: 8, resolved: 8 },
  { date: "Jan 20", threats: 3, blocked: 3, resolved: 2 },
]

// Mock data for access patterns
const accessPatterns = [
  { hour: "00:00", logins: 5, failed: 1 },
  { hour: "04:00", logins: 2, failed: 0 },
  { hour: "08:00", logins: 45, failed: 3 },
  { hour: "12:00", logins: 38, failed: 2 },
  { hour: "16:00", logins: 42, failed: 4 },
  { hour: "20:00", logins: 15, failed: 1 },
]

// Mock data for user permissions
const userPermissions = [
  {
    id: 1,
    name: "John Doe",
    email: "john.doe@company.com",
    role: "Admin",
    permissions: ["read", "write", "delete", "manage"],
    lastAccess: "2024-01-20 14:30:00",
    status: "active",
  },
  {
    id: 2,
    name: "Jane Smith",
    email: "jane.smith@company.com",
    role: "Editor",
    permissions: ["read", "write"],
    lastAccess: "2024-01-20 13:45:00",
    status: "active",
  },
  {
    id: 3,
    name: "Mike Johnson",
    email: "mike.johnson@company.com",
    role: "Viewer",
    permissions: ["read"],
    lastAccess: "2024-01-19 16:20:00",
    status: "inactive",
  },
]

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]

export default function SecurityPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterSeverity, setFilterSeverity] = useState("all")

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      case "medium":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "blocked":
      case "resolved":
      case "compliant":
      case "approved":
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "investigating":
      case "warning":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "inactive":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
    }
  }

  const filteredEvents = securityEvents.filter((event) => {
    const matchesSearch =
      event.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesSeverity = filterSeverity === "all" || event.severity === filterSeverity
    return matchesSearch && matchesSeverity
  })

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto">
          <AnimatedLayout className="p-8 space-y-8">
            {/* Page Header */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center justify-between"
            >
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-800 dark:from-slate-100 dark:via-blue-200 dark:to-indigo-200 bg-clip-text text-transparent">
                  Security Center
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">
                  Monitor security events, manage access controls, and ensure compliance
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline" className="hover-lift bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
                <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover-lift">
                  <Settings className="h-4 w-4 mr-2" />
                  Security Settings
                </Button>
              </div>
            </motion.div>

            {/* Security Metrics */}
            <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {securityMetrics.map((metric, index) => (
                <AnimatedGridItem key={metric.title}>
                  <Card className="glass border-0 shadow-lg hover-lift">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                          <metric.icon className={`h-6 w-6 ${metric.color}`} />
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            {metric.trend === "up" ? (
                              <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : metric.trend === "down" ? (
                              <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                              <Minus className="h-4 w-4 text-gray-500" />
                            )}
                            <span
                              className={`text-sm font-medium ${
                                metric.trend === "up"
                                  ? "text-green-600"
                                  : metric.trend === "down"
                                    ? "text-red-600"
                                    : "text-gray-600"
                              }`}
                            >
                              {metric.change}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400">{metric.title}</h3>
                        <p className="text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1">{metric.value}</p>
                      </div>
                    </CardContent>
                  </Card>
                </AnimatedGridItem>
              ))}
            </AnimatedGrid>

            {/* Main Content Tabs */}
            <AnimatedCard>
              <Card className="glass border-0 shadow-lg">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <CardHeader className="pb-4">
                    <TabsList className="grid w-full grid-cols-6 bg-slate-100 dark:bg-slate-800">
                      <TabsTrigger value="overview" className="flex items-center space-x-2">
                        <Shield className="h-4 w-4" />
                        <span>Overview</span>
                      </TabsTrigger>
                      <TabsTrigger value="events" className="flex items-center space-x-2">
                        <Activity className="h-4 w-4" />
                        <span>Events</span>
                      </TabsTrigger>
                      <TabsTrigger value="compliance" className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>Compliance</span>
                      </TabsTrigger>
                      <TabsTrigger value="access" className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>Access Control</span>
                      </TabsTrigger>
                      <TabsTrigger value="threats" className="flex items-center space-x-2">
                        <ShieldAlert className="h-4 w-4" />
                        <span>Threats</span>
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="flex items-center space-x-2">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </TabsTrigger>
                    </TabsList>
                  </CardHeader>

                  <CardContent className="p-6">
                    <TabsContent value="overview" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Threat Trends Chart */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <TrendingUp className="h-5 w-5 text-blue-600" />
                              <span>Threat Trends</span>
                            </CardTitle>
                            <CardDescription>Security threats over the past week</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <AreaChart data={threatTrends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area
                                  type="monotone"
                                  dataKey="threats"
                                  stackId="1"
                                  stroke="#ef4444"
                                  fill="#ef4444"
                                  fillOpacity={0.6}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="blocked"
                                  stackId="2"
                                  stroke="#f59e0b"
                                  fill="#f59e0b"
                                  fillOpacity={0.6}
                                />
                                <Area
                                  type="monotone"
                                  dataKey="resolved"
                                  stackId="3"
                                  stroke="#10b981"
                                  fill="#10b981"
                                  fillOpacity={0.6}
                                />
                              </AreaChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>

                        {/* Access Patterns */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Clock className="h-5 w-5 text-green-600" />
                              <span>Access Patterns</span>
                            </CardTitle>
                            <CardDescription>Login activity throughout the day</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <BarChart data={accessPatterns}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="hour" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="logins" fill="#3b82f6" />
                                <Bar dataKey="failed" fill="#ef4444" />
                              </BarChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Recent Security Alerts */}
                      <Card className="glass border-0 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Bell className="h-5 w-5 text-orange-600" />
                            <span>Recent Security Alerts</span>
                          </CardTitle>
                          <CardDescription>Latest security events requiring attention</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {securityEvents.slice(0, 3).map((event) => (
                              <div
                                key={event.id}
                                className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                              >
                                <div className="flex items-center space-x-4">
                                  <div
                                    className={`p-2 rounded-lg ${
                                      event.severity === "high"
                                        ? "bg-red-100 dark:bg-red-900/20"
                                        : event.severity === "medium"
                                          ? "bg-orange-100 dark:bg-orange-900/20"
                                          : "bg-green-100 dark:bg-green-900/20"
                                    }`}
                                  >
                                    {event.severity === "high" ? (
                                      <ShieldAlert className="h-4 w-4 text-red-600" />
                                    ) : event.severity === "medium" ? (
                                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                                    ) : (
                                      <Shield className="h-4 w-4 text-green-600" />
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-slate-100">{event.type}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                      {event.user} • {event.location}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                  <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                                  <span className="text-sm text-slate-500 dark:text-slate-400">{event.timestamp}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="events" className="space-y-6">
                      {/* Filters */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Search events..."
                              value={searchTerm}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                              className="pl-10 w-64"
                            />
                          </div>
                          <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Severity" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Severities</SelectItem>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button variant="outline" className="hover-lift bg-transparent">
                          <Filter className="h-4 w-4 mr-2" />
                          More Filters
                        </Button>
                      </div>

                      {/* Events Table */}
                      <Card className="glass border-0 shadow-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Event Type</TableHead>
                              <TableHead>User</TableHead>
                              <TableHead>IP Address</TableHead>
                              <TableHead>Location</TableHead>
                              <TableHead>Severity</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Timestamp</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredEvents.map((event) => (
                              <TableRow key={event.id}>
                                <TableCell className="font-medium">{event.type}</TableCell>
                                <TableCell>{event.user}</TableCell>
                                <TableCell className="font-mono text-sm">{event.ip}</TableCell>
                                <TableCell>{event.location}</TableCell>
                                <TableCell>
                                  <Badge className={getSeverityColor(event.severity)}>{event.severity}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge className={getStatusColor(event.status)}>{event.status}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{event.timestamp}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <FileText className="h-4 w-4 mr-2" />
                                        Generate Report
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-red-600">
                                        <XCircle className="h-4 w-4 mr-2" />
                                        Block IP
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Card>
                    </TabsContent>

                    <TabsContent value="compliance" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Compliance Overview */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <CheckCircle className="h-5 w-5 text-green-600" />
                              <span>Compliance Overview</span>
                            </CardTitle>
                            <CardDescription>Current compliance status across frameworks</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {complianceData.map((item: any) => (
                                <div key={item.name} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{item.name}</span>
                                    <div className="flex items-center space-x-2">
                                      <span className="text-sm font-medium">{item.score}%</span>
                                      <Badge className={getStatusColor(item.status)}>{item.status}</Badge>
                                    </div>
                                  </div>
                                  <Progress value={item.score} className="h-2" />
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Compliance Distribution */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <PieChart className="h-5 w-5 text-blue-600" />
                              <span>Compliance Distribution</span>
                            </CardTitle>
                            <CardDescription>Compliance scores by framework</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <PieChart>
                                <Pie
                                  data={complianceData}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, score }) => `${name}: ${score}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey="score"
                                >
                                  {complianceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Compliance Actions */}
                      <Card className="glass border-0 shadow-lg">
                        <CardHeader>
                          <CardTitle>Required Actions</CardTitle>
                          <CardDescription>Items that need attention to maintain compliance</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 border border-orange-200 dark:border-orange-800 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                              <div className="flex items-center space-x-3">
                                <AlertTriangle className="h-5 w-5 text-orange-600" />
                                <div>
                                  <p className="font-medium">HIPAA Compliance Review</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Annual security assessment due in 15 days
                                  </p>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                Schedule Review
                              </Button>
                            </div>
                            <div className="flex items-center justify-between p-4 border border-blue-200 dark:border-blue-800 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                              <div className="flex items-center space-x-3">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div>
                                  <p className="font-medium">Policy Update Required</p>
                                  <p className="text-sm text-slate-600 dark:text-slate-400">
                                    Data retention policy needs quarterly update
                                  </p>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                Update Policy
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="access" className="space-y-6">
                      {/* User Permissions Table */}
                      <Card className="glass border-0 shadow-lg">
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle>User Permissions</CardTitle>
                              <CardDescription>Manage user access and permissions</CardDescription>
                            </div>
                            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
                              <Users className="h-4 w-4 mr-2" />
                              Add User
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Permissions</TableHead>
                                <TableHead>Last Access</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {userPermissions.map((user) => (
                                <TableRow key={user.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{user.name}</p>
                                      <p className="text-sm text-slate-600 dark:text-slate-400">{user.email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{user.role}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                      {user.permissions.map((permission) => (
                                        <Badge key={permission} variant="secondary" className="text-xs">
                                          {permission}
                                        </Badge>
                                      ))}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-sm">{user.lastAccess}</TableCell>
                                  <TableCell>
                                    <Badge className={getStatusColor(user.status)}>{user.status}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem>
                                          <UserCheck className="h-4 w-4 mr-2" />
                                          Edit Permissions
                                        </DropdownMenuItem>
                                        <DropdownMenuItem>
                                          <Key className="h-4 w-4 mr-2" />
                                          Reset Password
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-600">
                                          <UserX className="h-4 w-4 mr-2" />
                                          Deactivate User
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="threats" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Active Threats */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-red-600">
                              <ShieldAlert className="h-5 w-5" />
                              <span>Active Threats</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center">
                              <div className="text-4xl font-bold text-red-600 mb-2">3</div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Threats detected in the last 24 hours
                              </p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Blocked Attacks */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-orange-600">
                              <Shield className="h-5 w-5" />
                              <span>Blocked Attacks</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center">
                              <div className="text-4xl font-bold text-orange-600 mb-2">127</div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Attacks blocked this week</p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Threat Score */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2 text-green-600">
                              <ShieldCheck className="h-5 w-5" />
                              <span>Threat Score</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-center">
                              <div className="text-4xl font-bold text-green-600 mb-2">Low</div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">Current threat level</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Threat Detection Rules */}
                      <Card className="glass border-0 shadow-lg">
                        <CardHeader>
                          <CardTitle>Threat Detection Rules</CardTitle>
                          <CardDescription>Configure automated threat detection and response</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div>
                              <p className="font-medium">Brute Force Detection</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Block IPs after 5 failed login attempts
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div>
                              <p className="font-medium">Suspicious Activity Monitoring</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Monitor for unusual access patterns
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div>
                              <p className="font-medium">Geo-location Blocking</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Block access from restricted countries
                              </p>
                            </div>
                            <Switch />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="settings" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Authentication Settings */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Key className="h-5 w-5 text-blue-600" />
                              <span>Authentication Settings</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="session-timeout">Session Timeout (minutes)</Label>
                              <Input id="session-timeout" type="number" defaultValue="30" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="password-policy">Password Policy</Label>
                              <Select defaultValue="strong">
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="basic">Basic</SelectItem>
                                  <SelectItem value="strong">Strong</SelectItem>
                                  <SelectItem value="enterprise">Enterprise</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <Label htmlFor="mfa">Multi-Factor Authentication</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Require MFA for all users</p>
                              </div>
                              <Switch id="mfa" defaultChecked />
                            </div>
                          </CardContent>
                        </Card>

                        {/* Security Notifications */}
                        <Card className="glass border-0 shadow-lg">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Bell className="h-5 w-5 text-orange-600" />
                              <span>Security Notifications</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <Label>Failed Login Alerts</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Notify on failed login attempts
                                </p>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <Label>Threat Detection Alerts</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Notify on detected threats</p>
                              </div>
                              <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                              <div>
                                <Label>Compliance Alerts</Label>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                  Notify on compliance issues
                                </p>
                              </div>
                              <Switch />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="notification-email">Notification Email</Label>
                              <Input id="notification-email" type="email" defaultValue="security@company.com" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* API Security Settings */}
                      <Card className="glass border-0 shadow-lg">
                        <CardHeader>
                          <CardTitle className="flex items-center space-x-2">
                            <Zap className="h-5 w-5 text-purple-600" />
                            <span>API Security Settings</span>
                          </CardTitle>
                          <CardDescription>Configure API access and security policies</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="rate-limit">Rate Limit (requests/minute)</Label>
                              <Input id="rate-limit" type="number" defaultValue="1000" />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="api-timeout">API Timeout (seconds)</Label>
                              <Input id="api-timeout" type="number" defaultValue="30" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <Label>API Key Rotation</Label>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                Automatically rotate API keys monthly
                              </p>
                            </div>
                            <Switch defaultChecked />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="allowed-origins">Allowed Origins</Label>
                            <Textarea
                              id="allowed-origins"
                              placeholder="https://app.company.com&#10;https://admin.company.com"
                              rows={3}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </CardContent>
                </Tabs>
              </Card>
            </AnimatedCard>
          </AnimatedLayout>
        </main>
      </div>
    </div>
  )
}
