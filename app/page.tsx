"use client"

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
} from "lucide-react"

export default function Dashboard() {
  const statsData = [
    {
      title: "System Status",
      value: "Healthy",
      description: "All services operational",
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      trend: "+2.5%",
    },
    {
      title: "Active Jobs",
      value: "12",
      description: "3 in queue, 9 processing",
      icon: Clock,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      trend: "+15%",
    },
    {
      title: "Documents Generated",
      value: "1,247",
      description: "+23% from last month",
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      trend: "+23%",
    },
    {
      title: "Active Users",
      value: "47",
      description: "Across 3 business units",
      icon: Users,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      trend: "+8%",
    },
  ]

  const providersData = [
    { name: "OpenAI GPT-4", status: "active", health: 98, requests: "1,234", color: "emerald" },
    { name: "Google AI Gemini", status: "standby", health: 95, requests: "456", color: "blue" },
    { name: "Azure OpenAI", status: "active", health: 92, requests: "789", color: "emerald" },
    { name: "GitHub Copilot", status: "inactive", health: 0, requests: "0", color: "slate" },
  ]

  const integrationData = [
    { name: "Confluence", status: "connected", lastSync: "2 min ago", color: "emerald" },
    { name: "SharePoint", status: "connected", lastSync: "5 min ago", color: "emerald" },
    { name: "Adobe Document Services", status: "warning", lastSync: "1 hour ago", color: "yellow" },
    { name: "GitHub", status: "connected", lastSync: "30 sec ago", color: "emerald" },
  ]

  const activityData = [
    {
      action: "Document generated",
      details: "PMBOK Project Charter",
      time: "2 min ago",
      color: "blue",
    },
    {
      action: "Template updated",
      details: "BABOK Requirements Template",
      time: "15 min ago",
      color: "purple",
    },
    { action: "User added", details: "john.doe@company.com", time: "1 hour ago", color: "emerald" },
    {
      action: "Integration configured",
      details: "SharePoint connection",
      time: "2 hours ago",
      color: "orange",
    },
  ]

  const quickActions = [
    { icon: FileText, label: "Generate Document", color: "from-blue-500 to-cyan-500" },
    { icon: Zap, label: "Configure AI", color: "from-purple-500 to-pink-500" },
    { icon: Users, label: "Manage Users", color: "from-emerald-500 to-teal-500" },
    { icon: TrendingUp, label: "View Analytics", color: "from-orange-500 to-red-500" },
  ]

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
