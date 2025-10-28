"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { apiClient } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Zap, 
  Activity,
  Users,
  FileText,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  CheckCircle,
  Plus
} from "@/components/ui/icons-shim"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

interface ModelUsageData {
  date: string
  [key: string]: string | number
}

interface ProviderStats {
  provider_name: string
  provider_type: string
  usage_count: number
  total_tokens: number
  avg_response_time: number
  success_rate: number
}

interface ModelStats {
  model_name: string
  provider_name: string
  usage_count: number
  total_tokens: number
  avg_response_time: number
  success_rate: number
}

export default function AIAnalyticsPage() {
  const { user, hasPermission } = useAuth()
  const { isConnected } = useWebSocket()

  const [timeRange, setTimeRange] = useState("30d")
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [modelUsageData, setModelUsageData] = useState<ModelUsageData[]>([])
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([])
  const [modelStats, setModelStats] = useState<ModelStats[]>([])
  const [aiSummary, setAiSummary] = useState<any>(null)
  const [hourlyUsage, setHourlyUsage] = useState<any[]>([])

  const fetchAIAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch system analytics which includes AI usage
      const systemData = await apiClient.getSystemAnalytics(timeRange)
      setAnalyticsData(systemData)
      
      // Fetch detailed AI model usage data
      const response = await apiClient.request('GET', `/ai-analytics/models?period=${timeRange}`)
      if (response.success) {
        setModelUsageData(response.usageOverTime || [])
        setProviderStats(response.providerStats || [])
        setModelStats(response.modelStats || [])
        setAiSummary(response.summary || {})
        setHourlyUsage(response.hourlyUsage || [])
        
        console.log('📊 AI Analytics loaded:', {
          totalRequests: response.summary?.totalRequests,
          totalTokens: response.summary?.totalTokens,
          providers: response.providerStats?.length,
          models: response.modelStats?.length
        })
      }
      
    } catch (error) {
      console.error("Failed to fetch AI analytics:", error)
      toast({
        title: "Error",
        description: "Failed to load AI analytics data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAIAnalytics()
  }, [timeRange])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toString()
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getProviderColor = (providerType: string) => {
    const colors = {
      'openai': '#10B981',
      'google': '#3B82F6', 
      'azure': '#8B5CF6',
      'ollama': '#F59E0B',
      'mistral': '#EF4444'
    }
    return colors[providerType as keyof typeof colors] || '#6B7280'
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
                  <p className="text-muted-foreground">You don't have permission to view AI analytics.</p>
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
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  AI Model Analytics
                </h1>
                <p className="text-muted-foreground mt-2">
                  Track AI model usage, performance, and trends over time
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchAIAnalytics}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading AI analytics...</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total AI Requests
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatNumber(aiSummary?.totalRequests || analyticsData?.ai_generations_period || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : timeRange === '90d' ? 'Last 90 days' : 'Last year'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Tokens
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {formatNumber(aiSummary?.totalTokens || 0)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {aiSummary?.totalTokens ? `${(aiSummary.totalTokens / (aiSummary.totalRequests || 1)).toFixed(0)} avg/request` : 'No data yet'}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Active Models
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {modelStats.length || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Across {providerStats.length || 0} providers
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Avg Response
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {aiSummary?.avgResponseTime ? formatDuration(aiSummary.avgResponseTime) : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Average API latency
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Success Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className={`text-3xl font-bold ${aiSummary?.overallSuccessRate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                        {aiSummary?.overallSuccessRate ? `${aiSummary.overallSuccessRate.toFixed(1)}%` : 'N/A'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {aiSummary?.totalRequests ? `${aiSummary.totalRequests} total requests` : 'No data yet'}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Main Analytics Tabs */}
                <Tabs defaultValue="usage" className="space-y-6">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="usage">Usage Over Time</TabsTrigger>
                    <TabsTrigger value="providers">Provider Comparison</TabsTrigger>
                    <TabsTrigger value="models">Model Performance</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                  </TabsList>

                  {/* Usage Over Time */}
                  <TabsContent value="usage" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Model Usage Over Time</CardTitle>
                        <CardDescription>
                          Track usage patterns across all AI models and providers
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {modelUsageData.length > 0 && providerStats.length > 0 ? (
                          <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={modelUsageData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                {providerStats.map((provider, index) => (
                                  <Line
                                    key={provider.provider_name}
                                    type="monotone"
                                    dataKey={provider.provider_name}
                                    stroke={getProviderColor(provider.provider_type)}
                                    strokeWidth={2}
                                    dot={{ r: 4 }}
                                  />
                                ))}
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-96 flex items-center justify-center">
                            <div className="text-center">
                              <Activity className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                              <p className="text-lg font-medium text-muted-foreground mb-2">No Usage Data Yet</p>
                              <p className="text-sm text-muted-foreground max-w-md">
                                Start generating documents with AI to see usage trends over time
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Provider Comparison */}
                  <TabsContent value="providers" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Provider Usage</CardTitle>
                          <CardDescription>
                            Total requests by AI provider
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {providerStats.length > 0 ? (
                            <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={providerStats}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis dataKey="provider_name" />
                                  <YAxis />
                                  <Tooltip />
                                  <Bar dataKey="usage_count" fill="#3B82F6" />
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-80 flex items-center justify-center">
                              <div className="text-center">
                                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">No provider usage data yet</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Provider Distribution</CardTitle>
                          <CardDescription>
                            Token usage distribution across providers
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {providerStats.length > 0 ? (
                            <div className="h-80">
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={providerStats}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ provider_name, percent }) => `${provider_name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="total_tokens"
                                  >
                                    {providerStats.map((provider, index) => (
                                      <Cell key={`cell-${index}`} fill={getProviderColor(provider.provider_type)} />
                                    ))}
                                  </Pie>
                                  <Tooltip />
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <div className="h-80 flex items-center justify-center">
                              <div className="text-center">
                                <PieChart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                                <p className="text-sm text-muted-foreground">No token distribution data yet</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Provider Stats Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Provider Performance</CardTitle>
                        <CardDescription>
                          Detailed performance metrics for each AI provider
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {providerStats.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-4">Provider</th>
                                  <th className="text-left p-4">Type</th>
                                  <th className="text-right p-4">Requests</th>
                                  <th className="text-right p-4">Tokens</th>
                                  <th className="text-right p-4">Avg Response</th>
                                  <th className="text-right p-4">Success Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {providerStats.map((provider) => (
                                  <tr key={provider.provider_name} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{provider.provider_name}</td>
                                    <td className="p-4">
                                      <Badge variant="outline">{provider.provider_type}</Badge>
                                    </td>
                                    <td className="p-4 text-right">{formatNumber(provider.usage_count)}</td>
                                    <td className="p-4 text-right">{formatNumber(provider.total_tokens)}</td>
                                    <td className="p-4 text-right">{formatDuration(provider.avg_response_time)}</td>
                                    <td className="p-4 text-right">
                                      <span className={provider.success_rate >= 95 ? 'text-green-600 font-semibold' : provider.success_rate >= 90 ? 'text-blue-600' : 'text-yellow-600'}>
                                        {provider.success_rate.toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">No Provider Data Yet</p>
                            <p className="text-sm text-muted-foreground">
                              Generate documents using AI to see provider performance metrics
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Model Performance */}
                  <TabsContent value="models" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Model Performance Comparison</CardTitle>
                        <CardDescription>
                          Compare performance metrics across different AI models
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {modelStats.length > 0 ? (
                          <div className="h-96">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={modelStats} layout="horizontal">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="model_name" type="category" width={120} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="usage_count" fill="#3B82F6" name="Requests" />
                                <Bar dataKey="total_tokens" fill="#10B981" name="Tokens" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <div className="h-96 flex items-center justify-center">
                            <div className="text-center">
                              <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                              <p className="text-lg font-medium text-muted-foreground mb-2">No Model Data Yet</p>
                              <p className="text-sm text-muted-foreground max-w-md">
                                Generate documents to see which AI models are being used
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Model Stats Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Model Performance Details</CardTitle>
                        <CardDescription>
                          Detailed metrics for each AI model
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {modelStats.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left p-4">Model</th>
                                  <th className="text-left p-4">Provider</th>
                                  <th className="text-right p-4">Requests</th>
                                  <th className="text-right p-4">Tokens</th>
                                  <th className="text-right p-4">Avg Response</th>
                                  <th className="text-right p-4">Success Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {modelStats.map((model) => (
                                  <tr key={`${model.provider_name}-${model.model_name}`} className="border-b hover:bg-muted/50">
                                    <td className="p-4 font-medium">{model.model_name}</td>
                                    <td className="p-4">{model.provider_name}</td>
                                    <td className="p-4 text-right">{formatNumber(model.usage_count)}</td>
                                    <td className="p-4 text-right">{formatNumber(model.total_tokens)}</td>
                                    <td className="p-4 text-right">{formatDuration(model.avg_response_time)}</td>
                                    <td className="p-4 text-right">
                                      <span className={model.success_rate >= 95 ? 'text-green-600 font-semibold' : model.success_rate >= 90 ? 'text-blue-600' : 'text-yellow-600'}>
                                        {model.success_rate.toFixed(1)}%
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="text-center py-12">
                            <Zap className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">No Model Data Yet</p>
                            <p className="text-sm text-muted-foreground">
                              Generate documents using AI to see detailed model performance
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  {/* Insights */}
                  <TabsContent value="insights" className="space-y-6">
                    {/* Key Metrics Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">🏆 Top Performer</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {modelStats.length > 0 ? (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Most Used Model</p>
                                <p className="text-xl font-bold">{modelStats[0].model_name}</p>
                                <p className="text-xs text-green-600 mt-1">
                                  {formatNumber(modelStats[0].usage_count)} requests 
                                  ({aiSummary?.totalRequests ? ((modelStats[0].usage_count / aiSummary.totalRequests) * 100).toFixed(1) : 0}%)
                                </p>
                              </div>
                              <div className="pt-3 border-t">
                                <p className="text-sm text-muted-foreground">Performance</p>
                                <p className="text-xs mt-1">⚡ {formatDuration(modelStats[0].avg_response_time)} avg response</p>
                                <p className="text-xs">✅ {modelStats[0].success_rate?.toFixed(1)}% success rate</p>
                                <p className="text-xs">🔢 {formatNumber(modelStats[0].total_tokens)} tokens</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No usage data yet</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">⚡ Speed Champion</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {modelStats.length > 0 ? (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Fastest Model</p>
                                {(() => {
                                  const fastest = [...modelStats].sort((a, b) => a.avg_response_time - b.avg_response_time)[0]
                                  return (
                                    <>
                                      <p className="text-xl font-bold">{fastest.model_name}</p>
                                      <p className="text-xs text-blue-600 mt-1">{formatDuration(fastest.avg_response_time)} average</p>
                                    </>
                                  )
                                })()}
                              </div>
                              <div className="pt-3 border-t">
                                <p className="text-sm text-muted-foreground">Provider</p>
                                <p className="text-sm font-medium">{[...modelStats].sort((a, b) => a.avg_response_time - b.avg_response_time)[0].provider_name}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No usage data yet</p>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">🎯 Reliability Leader</CardTitle>
                        </CardHeader>
                        <CardContent>
                          {modelStats.length > 0 ? (
                            <div className="space-y-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Highest Success Rate</p>
                                {(() => {
                                  const mostReliable = [...modelStats].sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0))[0]
                                  return (
                                    <>
                                      <p className="text-xl font-bold">{mostReliable.model_name}</p>
                                      <p className="text-xs text-purple-600 mt-1">{mostReliable.success_rate?.toFixed(1)}% success rate</p>
                                    </>
                                  )
                                })()}
                              </div>
                              <div className="pt-3 border-t">
                                <p className="text-sm text-muted-foreground">Usage</p>
                                <p className="text-sm font-medium">{formatNumber([...modelStats].sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0))[0].usage_count)} requests</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">No usage data yet</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Cost Analysis */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>💰 Token Usage Analysis</CardTitle>
                          <CardDescription>
                            Token consumption by provider
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm text-muted-foreground">Total Tokens Processed</p>
                                <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                                  {formatNumber(aiSummary?.totalTokens || 0)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Per Request</p>
                                <p className="text-xl font-semibold">
                                  {aiSummary?.totalRequests ? formatNumber(Math.round(aiSummary.totalTokens / aiSummary.totalRequests)) : '0'}
                                </p>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Based on {formatNumber(aiSummary?.totalRequests || 0)} AI requests
                            </p>
                          </div>

                          <div className="space-y-2">
                            <p className="text-sm font-medium">Token Usage by Provider</p>
                            {providerStats.length > 0 ? (
                              providerStats.slice(0, 5).map((provider, index) => {
                                const percentage = aiSummary?.totalTokens ? ((provider.total_tokens / aiSummary.totalTokens) * 100).toFixed(1) : 0
                                return (
                                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-3 h-3 rounded-full`} style={{ backgroundColor: getProviderColor(provider.provider_type) }} />
                                      <span className="text-sm font-medium">{provider.provider_name}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-sm text-muted-foreground">{percentage}%</span>
                                      <span className="text-sm font-bold">{formatNumber(provider.total_tokens)} tokens</span>
                                    </div>
                                  </div>
                                )
                              })
                            ) : (
                              <p className="text-sm text-muted-foreground text-center py-4">No provider data yet</p>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>📊 Performance Metrics</CardTitle>
                          <CardDescription>
                            Response time and reliability analysis
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                              <p className="text-sm text-muted-foreground">Avg Response Time</p>
                              <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                {aiSummary?.avgResponseTime ? formatDuration(aiSummary.avgResponseTime) : 'N/A'}
                              </p>
                              <p className="text-xs text-blue-600 mt-1">
                                {aiSummary?.avgResponseTime < 2000 ? 'Excellent' : aiSummary?.avgResponseTime < 5000 ? 'Good' : 'Needs improvement'}
                              </p>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                              <p className="text-sm text-muted-foreground">Success Rate</p>
                              <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                                {aiSummary?.overallSuccessRate ? `${aiSummary.overallSuccessRate.toFixed(1)}%` : 'N/A'}
                              </p>
                              <p className="text-xs text-purple-600 mt-1">
                                {aiSummary?.overallSuccessRate >= 95 ? 'Excellent' : aiSummary?.overallSuccessRate >= 90 ? 'Good' : 'Monitor closely'}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-sm font-medium">Provider Reliability</p>
                            <div className="space-y-2">
                              {providerStats.length > 0 ? (
                                providerStats.slice(0, 5).map((provider, index) => (
                                  <div key={index}>
                                    <div className="flex justify-between text-xs mb-1">
                                      <span>{provider.provider_name}</span>
                                      <span className="font-medium">{provider.success_rate?.toFixed(1)}% success</span>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          provider.success_rate >= 95 ? 'bg-green-500' : 
                                          provider.success_rate >= 90 ? 'bg-blue-500' : 'bg-yellow-500'
                                        }`} 
                                        style={{ width: `${provider.success_rate}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No provider data yet</p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>💡 Data-Driven Insights</CardTitle>
                          <CardDescription>
                            Recommendations based on your actual usage patterns
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {providerStats.length > 0 ? (
                            <>
                              {/* Fastest Provider */}
                              {(() => {
                                const fastest = [...providerStats].sort((a, b) => a.avg_response_time - b.avg_response_time)[0]
                                return (
                                  <div className="p-4 border-l-4 border-l-green-500 bg-green-50 dark:bg-green-900/20 rounded">
                                    <div className="flex items-start gap-3">
                                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                                      <div>
                                        <h4 className="font-medium text-green-900 dark:text-green-100">Fastest: {fastest.provider_name}</h4>
                                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                                          Average response: {formatDuration(fastest.avg_response_time)}. Great for time-sensitive requests.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Most Used Provider */}
                              <div className="p-4 border-l-4 border-l-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded">
                                <div className="flex items-start gap-3">
                                  <BarChart3 className="h-5 w-5 text-blue-600 mt-0.5" />
                                  <div>
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Most Used: {providerStats[0].provider_name}</h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                      {formatNumber(providerStats[0].usage_count)} requests 
                                      ({aiSummary?.totalRequests ? ((providerStats[0].usage_count / aiSummary.totalRequests) * 100).toFixed(1) : 0}% of total)
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Token Efficiency */}
                              {(() => {
                                const mostEfficient = [...providerStats].sort((a, b) => (a.total_tokens / a.usage_count) - (b.total_tokens / b.usage_count))[0]
                                return (
                                  <div className="p-4 border-l-4 border-l-purple-500 bg-purple-50 dark:bg-purple-900/20 rounded">
                                    <div className="flex items-start gap-3">
                                      <Zap className="h-5 w-5 text-purple-600 mt-0.5" />
                                      <div>
                                        <h4 className="font-medium text-purple-900 dark:text-purple-100">Most Efficient: {mostEfficient.provider_name}</h4>
                                        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                          {Math.round(mostEfficient.total_tokens / mostEfficient.usage_count)} tokens per request on average
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* Reliability Leader */}
                              {(() => {
                                const mostReliable = [...providerStats].sort((a, b) => (b.success_rate || 0) - (a.success_rate || 0))[0]
                                return (
                                  <div className="p-4 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded">
                                    <div className="flex items-start gap-3">
                                      <Activity className="h-5 w-5 text-orange-600 mt-0.5" />
                                      <div>
                                        <h4 className="font-medium text-orange-900 dark:text-orange-100">Most Reliable: {mostReliable.provider_name}</h4>
                                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                          {mostReliable.success_rate?.toFixed(1)}% success rate across {formatNumber(mostReliable.usage_count)} requests
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })()}
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground">
                                Generate some documents to see AI insights and recommendations
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>📈 Usage Patterns</CardTitle>
                          <CardDescription>
                            When your AI is being used most
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {hourlyUsage.length > 0 ? (
                            <>
                              <div className="p-4 bg-muted rounded-lg">
                                <h4 className="font-medium mb-3">Peak Usage Hours</h4>
                                <div className="space-y-2">
                                  {[...hourlyUsage]
                                    .sort((a, b) => b.usage_count - a.usage_count)
                                    .slice(0, 3)
                                    .map((hourData, index) => {
                                      const maxUsage = hourlyUsage.reduce((max, h) => Math.max(max, h.usage_count), 0)
                                      const percentage = (hourData.usage_count / maxUsage) * 100
                                      const hour = parseInt(hourData.hour)
                                      const timeLabel = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`
                                      return (
                                        <div key={index} className="flex items-center justify-between">
                                          <span className="text-sm">{timeLabel}</span>
                                          <div className="flex items-center gap-2">
                                            <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                              <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                            <span className="text-xs text-muted-foreground">{hourData.usage_count} reqs</span>
                                          </div>
                                        </div>
                                      )
                                    })}
                                </div>
                              </div>

                              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
                                <div className="flex items-start gap-3">
                                  <TrendingUp className="h-6 w-6 text-blue-600" />
                                  <div>
                                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Usage Summary</h4>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                      {formatNumber(aiSummary?.totalRequests || 0)} total AI requests in the last {timeRange === '7d' ? '7 days' : timeRange === '30d' ? '30 days' : timeRange === '90d' ? '90 days' : 'year'}
                                    </p>
                                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                                      Average: {aiSummary?.totalRequests ? Math.round(aiSummary.totalRequests / (timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365)) : 0} requests per day
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-8">
                              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                              <p className="text-sm text-muted-foreground">
                                No usage pattern data available yet
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Generate documents to see when AI is used most
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </main>
        </div>
      </div>
    </PageTransition>
  )
}
