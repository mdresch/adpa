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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import dynamic from 'next/dynamic'

const UsageLineChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.UsageLineChart), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex items-center justify-center">
      <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
      <p className="text-muted-foreground">Loading chart...</p>
    </div>
  )
})

const ProviderBarChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.ProviderBarChart), { ssr: false })
const ProviderPieChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.ProviderPieChart), { ssr: false })
const ModelBarChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.ModelBarChart), { ssr: false })

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
  const [analyticsData, setAnalyticsData] = useState<Record<string, unknown> | null>(null)
  const [modelUsageData, setModelUsageData] = useState<ModelUsageData[]>([])
  const [providerStats, setProviderStats] = useState<ProviderStats[]>([])
  const [modelStats, setModelStats] = useState<ModelStats[]>([])
  const [aiSummary, setAiSummary] = useState<Record<string, unknown> | null>(null)
  const [hourlyUsage, setHourlyUsage] = useState<Array<Record<string, unknown>>>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dailyBreakdown, setDailyBreakdown] = useState<any>(null)
  const [loadingBreakdown, setLoadingBreakdown] = useState(false)

  const fetchAIAnalytics = async () => {
    try {
      setLoading(true)
      
      // Fetch system analytics which includes AI usage
      const systemData = await apiClient.getSystemAnalytics(timeRange)
      setAnalyticsData(systemData)
      
      // Fetch detailed AI model usage data
      const response = await apiClient.get<any>(`/ai-analytics/models?period=${timeRange}`, {
        suppressNotFoundError: true,
      })
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
      
    } catch (error: any) {
      if (error?.status === 404 || error?.response?.status === 404) {
        // Endpoint is optional in some deployments; keep page usable with system analytics only.
        setModelUsageData([])
        setProviderStats([])
        setModelStats([])
        setAiSummary(null)
        setHourlyUsage([])
        setLoading(false)
        return
      }
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
    void fetchAIAnalytics()
  }, [timeRange])

  const formatNumber = (num: number | string | undefined | null) => {
    if (!num && num !== 0) return '0'
    const value = typeof num === 'number' ? num : parseFloat(num as string) || 0
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
    return value.toString()
  }

  const formatDuration = (ms: number | string | undefined | null) => {
    if (!ms && ms !== 0) return 'N/A'
    const value = typeof ms === 'number' ? ms : parseFloat(ms as string) || 0
    if (value < 1000) return `${Math.round(value)}ms`
    return `${(value / 1000).toFixed(1)}s`
  }

  const formatPercent = (num: number | string | undefined | null) => {
    if (num === null || num === undefined) return '0%'
    const value = typeof num === 'number' ? num : parseFloat(num as string) || 0
    return `${value.toFixed(1)}%`
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

  const fetchDailyBreakdown = async (date: string | Date) => {
    try {
      setLoadingBreakdown(true)
      // Handle both Date objects and date strings
      // IMPORTANT: Always treat date strings as UTC dates to avoid timezone shifts
      let dateStr: string
      if (date instanceof Date) {
        // Use UTC methods to avoid timezone conversion
        const year = date.getUTCFullYear()
        const month = String(date.getUTCMonth() + 1).padStart(2, '0')
        const day = String(date.getUTCDate()).padStart(2, '0')
        dateStr = `${year}-${month}-${day}`
      } else if (typeof date === 'string') {
        // If it's already in YYYY-MM-DD format, use it directly (treat as UTC)
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          dateStr = date
        } else {
          // Parse as UTC to avoid timezone shifts
          const parsed = new Date(date + 'T00:00:00Z')
          const year = parsed.getUTCFullYear()
          const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
          const day = String(parsed.getUTCDate()).padStart(2, '0')
          dateStr = `${year}-${month}-${day}`
        }
      } else {
        throw new Error('Invalid date format')
      }
      
      console.log('Fetching daily breakdown for date:', dateStr, 'original:', date)
      const response = await apiClient.get<any>(`/ai-analytics/daily/${dateStr}`)
      if (response.success) {
        setDailyBreakdown(response)
      } else {
        toast({
          title: "Error",
          description: "Failed to load daily breakdown",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Failed to fetch daily breakdown:", error)
      toast({
        title: "Error",
        description: "Failed to load daily breakdown",
        variant: "destructive"
      })
    } finally {
      setLoadingBreakdown(false)
    }
  }

  const handleDateClick = (date: string) => {
    setSelectedDate(date)
    void fetchDailyBreakdown(date)
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
                      {(() => {
                        const rate = aiSummary?.overallSuccessRate 
                          ? (typeof aiSummary.overallSuccessRate === 'number' ? aiSummary.overallSuccessRate : parseFloat(aiSummary.overallSuccessRate) || 0)
                          : 0
                        return (
                          <>
                            <div className={`text-3xl font-bold ${rate >= 95 ? 'text-green-600' : 'text-yellow-600'}`}>
                              {aiSummary?.overallSuccessRate ? `${rate.toFixed(1)}%` : 'N/A'}
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {aiSummary?.totalRequests ? `${formatNumber(aiSummary.totalRequests)} total requests` : 'No data yet'}
                            </p>
                          </>
                        )
                      })()}
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
                          <>
                            <UsageLineChart data={modelUsageData} providerStats={providerStats} getProviderColor={getProviderColor} />
                            
                            {/* Usage Over Time Table */}
                            <div className="mt-8">
                              <h3 className="text-lg font-semibold mb-4">Usage Details by Date</h3>
                              <div className="overflow-x-auto border rounded-lg">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="border-b bg-muted/50">
                                      <th className="text-left p-3 font-medium">Date</th>
                                      {providerStats.map((provider) => (
                                        <th key={provider.provider_name} className="text-right p-3 font-medium">
                                          {provider.provider_name}
                                        </th>
                                      ))}
                                      <th className="text-right p-3 font-medium">Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {modelUsageData.map((row, index) => {
                                      // Calculate total for this row
                                      const rowTotal = providerStats.reduce((sum, provider) => {
                                        return sum + (Number(row[provider.provider_name] || 0))
                                      }, 0)
                                      
                                      // Extract date string for the breakdown API call
                                      // row.date should already be a string in YYYY-MM-DD format from the backend
                                      // IMPORTANT: Use UTC methods to avoid timezone shifts
                                      let dateForApi: string
                                      if (typeof row.date === 'string') {
                                        // Already a string, use it directly (should be YYYY-MM-DD)
                                        dateForApi = row.date.split('T')[0]
                                      } else if (row.date instanceof Date) {
                                        // Use UTC methods to avoid timezone conversion
                                        const year = row.date.getUTCFullYear()
                                        const month = String(row.date.getUTCMonth() + 1).padStart(2, '0')
                                        const day = String(row.date.getUTCDate()).padStart(2, '0')
                                        dateForApi = `${year}-${month}-${day}`
                                      } else {
                                        // Fallback: parse as UTC
                                        const parsed = new Date(String(row.date) + 'T00:00:00Z')
                                        const year = parsed.getUTCFullYear()
                                        const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
                                        const day = String(parsed.getUTCDate()).padStart(2, '0')
                                        dateForApi = `${year}-${month}-${day}`
                                      }
                                      
                                      // Debug log for January 21st
                                      if (dateForApi === '2026-01-21') {
                                        console.log('January 21st click - dateForApi:', dateForApi, 'row.date:', row.date, 'type:', typeof row.date)
                                      }
                                      
                                      return (
                                        <tr 
                                          key={index} 
                                          className="border-b hover:bg-muted/30 cursor-pointer"
                                          onClick={() => {
                                            console.log('Date clicked:', dateForApi, 'original row.date:', row.date)
                                            handleDateClick(dateForApi)
                                          }}
                                        >
                                          <td className="p-3 font-medium">
                                            {/* Bug 5 Fix: Parse date string as UTC to avoid timezone issues */}
                                            {(() => {
                                              // row.date is a string in 'YYYY-MM-DD' format from backend TO_CHAR
                                              const dateStr = typeof row.date === 'string' ? row.date : String(row.date)
                                              // Parse as UTC to avoid local timezone interpretation
                                              const [year, month, day] = dateStr.split('-').map(Number)
                                              const utcDate = new Date(Date.UTC(year, month - 1, day))
                                              return utcDate.toLocaleDateString('en-US', { 
                                                year: 'numeric', 
                                                month: 'short', 
                                                day: 'numeric',
                                                timeZone: 'UTC'
                                              })
                                            })()}
                                          </td>
                                          {providerStats.map((provider) => (
                                            <td key={provider.provider_name} className="text-right p-3">
                                              {formatNumber(row[provider.provider_name] || 0)}
                                            </td>
                                          ))}
                                          <td className="text-right p-3 font-semibold">
                                            {formatNumber(rowTotal)}
                                          </td>
                                        </tr>
                                      )
                                    })}
                                    {/* Summary row */}
                                    {modelUsageData.length > 0 && (
                                      <tr className="border-t-2 bg-muted/50 font-semibold">
                                        <td className="p-3">Total</td>
                                        {providerStats.map((provider) => {
                                          const providerTotal = modelUsageData.reduce((sum, row) => {
                                            return sum + (Number(row[provider.provider_name] || 0))
                                          }, 0)
                                          return (
                                            <td key={provider.provider_name} className="text-right p-3">
                                              {formatNumber(providerTotal)}
                                            </td>
                                          )
                                        })}
                                        <td className="text-right p-3">
                                          {formatNumber(
                                            modelUsageData.reduce((sum, row) => {
                                              return sum + providerStats.reduce((rowSum, provider) => {
                                                return rowSum + (Number(row[provider.provider_name] || 0))
                                              }, 0)
                                            }, 0)
                                          )}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </>
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

                    {/* Daily Breakdown Dialog */}
                    <Dialog open={selectedDate !== null} onOpenChange={(open) => !open && setSelectedDate(null)}>
                      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>
                            Daily Breakdown - {selectedDate ? new Date(selectedDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            }) : ''}
                          </DialogTitle>
                          <DialogDescription>
                            Detailed analysis of AI usage for this date
                          </DialogDescription>
                        </DialogHeader>
                        {loadingBreakdown ? (
                          <div className="flex items-center justify-center py-8">
                            <RefreshCw className="h-8 w-8 animate-spin" />
                            <p className="ml-2 text-muted-foreground">Loading breakdown...</p>
                          </div>
                        ) : dailyBreakdown ? (
                          <div className="space-y-6">
                            {/* Summary */}
                            <Card>
                              <CardHeader>
                                <CardTitle>Summary</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Requests</p>
                                    <p className="text-2xl font-bold">{formatNumber(dailyBreakdown.summary?.total_requests || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Tokens</p>
                                    <p className="text-2xl font-bold">{formatNumber(dailyBreakdown.summary?.total_tokens || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Avg Response</p>
                                    <p className="text-2xl font-bold">{formatDuration(dailyBreakdown.summary?.avg_response_time || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Success Rate</p>
                                    <p className="text-2xl font-bold">{formatPercent(dailyBreakdown.summary?.success_rate || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Unique Users</p>
                                    <p className="text-2xl font-bold">{dailyBreakdown.summary?.unique_users || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Unique Projects</p>
                                    <p className="text-2xl font-bold">{dailyBreakdown.summary?.unique_projects || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Unique Providers</p>
                                    <p className="text-2xl font-bold">{dailyBreakdown.summary?.unique_providers || 0}</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>

                            {/* Hourly Breakdown */}
                            {dailyBreakdown.hourly && dailyBreakdown.hourly.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>Hourly Breakdown</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">Hour</th>
                                          <th className="text-right p-2">Requests</th>
                                          <th className="text-right p-2">Tokens</th>
                                          <th className="text-right p-2">Avg Response</th>
                                          <th className="text-right p-2">Success Rate</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dailyBreakdown.hourly.map((hour: any, idx: number) => (
                                          <tr key={idx} className="border-b hover:bg-muted/30">
                                            <td className="p-2">{hour.hour}:00</td>
                                            <td className="p-2 text-right">{formatNumber(hour.request_count || 0)}</td>
                                            <td className="p-2 text-right">{formatNumber(hour.total_tokens || 0)}</td>
                                            <td className="p-2 text-right">{formatDuration(hour.avg_response_time || 0)}</td>
                                            <td className="p-2 text-right">{formatPercent(hour.success_rate || 0)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* By Provider */}
                            {dailyBreakdown.byProvider && dailyBreakdown.byProvider.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>By Provider</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">Provider</th>
                                          <th className="text-right p-2">Requests</th>
                                          <th className="text-right p-2">Tokens</th>
                                          <th className="text-right p-2">Avg Response</th>
                                          <th className="text-right p-2">Success Rate</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dailyBreakdown.byProvider.map((provider: any, idx: number) => (
                                          <tr key={idx} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-medium">{provider.provider_name}</td>
                                            <td className="p-2 text-right">{formatNumber(provider.request_count || 0)}</td>
                                            <td className="p-2 text-right">{formatNumber(provider.total_tokens || 0)}</td>
                                            <td className="p-2 text-right">{formatDuration(provider.avg_response_time || 0)}</td>
                                            <td className="p-2 text-right">{formatPercent(provider.success_rate || 0)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* By Model */}
                            {dailyBreakdown.byModel && dailyBreakdown.byModel.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>By Model</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">Model</th>
                                          <th className="text-left p-2">Provider</th>
                                          <th className="text-right p-2">Requests</th>
                                          <th className="text-right p-2">Tokens</th>
                                          <th className="text-right p-2">Avg Response</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dailyBreakdown.byModel.map((model: any, idx: number) => (
                                          <tr key={idx} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-medium">{model.model_name}</td>
                                            <td className="p-2">{model.provider_name}</td>
                                            <td className="p-2 text-right">{formatNumber(model.request_count || 0)}</td>
                                            <td className="p-2 text-right">{formatNumber(model.total_tokens || 0)}</td>
                                            <td className="p-2 text-right">{formatDuration(model.avg_response_time || 0)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* By User */}
                            {dailyBreakdown.byUser && dailyBreakdown.byUser.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>By User</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">User</th>
                                          <th className="text-right p-2">Requests</th>
                                          <th className="text-right p-2">Tokens</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dailyBreakdown.byUser.map((user: any, idx: number) => (
                                          <tr key={idx} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-medium">{user.user_name}</td>
                                            <td className="p-2 text-right">{formatNumber(user.request_count || 0)}</td>
                                            <td className="p-2 text-right">{formatNumber(user.total_tokens || 0)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* By Project */}
                            {dailyBreakdown.byProject && dailyBreakdown.byProject.length > 0 && (
                              <Card>
                                <CardHeader>
                                  <CardTitle>By Project</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left p-2">Project</th>
                                          <th className="text-right p-2">Requests</th>
                                          <th className="text-right p-2">Tokens</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dailyBreakdown.byProject.map((project: any, idx: number) => (
                                          <tr key={idx} className="border-b hover:bg-muted/30">
                                            <td className="p-2 font-medium">{project.project_name}</td>
                                            <td className="p-2 text-right">{formatNumber(project.request_count || 0)}</td>
                                            <td className="p-2 text-right">{formatNumber(project.total_tokens || 0)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        ) : null}
                      </DialogContent>
                    </Dialog>
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
                            <ProviderBarChart data={providerStats} />
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
                            <ProviderPieChart data={providerStats} getProviderColor={getProviderColor} formatNumber={formatNumber} />
                          ) : (
                            <div className="h-80 flex items-center justify-center">
                              <div className="text-center">
                                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
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
                                      {(() => {
                                        const rate = typeof provider.success_rate === 'number' ? provider.success_rate : parseFloat(provider.success_rate) || 0
                                        return (
                                          <span className={rate >= 95 ? 'text-green-600 font-semibold' : rate >= 90 ? 'text-blue-600' : 'text-yellow-600'}>
                                            {rate.toFixed(1)}%
                                          </span>
                                        )
                                      })()}
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Model Usage - Requests</CardTitle>
                          <CardDescription>
                            Number of AI requests per model
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {modelStats.length > 0 ? (
                            <ModelBarChart data={modelStats} dataKey="usage_count" xKey="model_name" />
                          ) : (
                            <div className="h-80 flex items-center justify-center">
                              <div className="text-center">
                                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No model data yet</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Model Usage - Tokens</CardTitle>
                          <CardDescription>
                            Total tokens processed per model
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {modelStats.length > 0 ? (
                            <ModelBarChart data={modelStats} dataKey="total_tokens" xKey="model_name" tickFormatter={(v: any) => formatNumber(v)} />
                          ) : (
                            <div className="h-80 flex items-center justify-center">
                              <div className="text-center">
                                <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">No model data yet</p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

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
                                      {(() => {
                                        const rate = typeof model.success_rate === 'number' ? model.success_rate : parseFloat(model.success_rate) || 0
                                        return (
                                          <span className={rate >= 95 ? 'text-green-600 font-semibold' : rate >= 90 ? 'text-blue-600' : 'text-yellow-600'}>
                                            {rate.toFixed(1)}%
                                          </span>
                                        )
                                      })()}
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
                                <p className="text-xs">✅ {(() => {
                                  const rate = typeof modelStats[0].success_rate === 'number' ? modelStats[0].success_rate : parseFloat(modelStats[0].success_rate) || 0
                                  return rate.toFixed(1)
                                })()}% success rate</p>
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
                                  const mostReliable = [...modelStats].sort((a, b) => {
                                    const aRate = typeof a.success_rate === 'number' ? a.success_rate : parseFloat(a.success_rate) || 0
                                    const bRate = typeof b.success_rate === 'number' ? b.success_rate : parseFloat(b.success_rate) || 0
                                    return bRate - aRate
                                  })[0]
                                  const rate = typeof mostReliable.success_rate === 'number' ? mostReliable.success_rate : parseFloat(mostReliable.success_rate) || 0
                                  return (
                                    <>
                                      <p className="text-xl font-bold">{mostReliable.model_name}</p>
                                      <p className="text-xs text-purple-600 mt-1">{rate.toFixed(1)}% success rate</p>
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
                                  {aiSummary?.totalRequests && typeof aiSummary.totalTokens === 'number' 
                                    ? formatNumber(Math.round((aiSummary.totalTokens as number) / aiSummary.totalRequests)) 
                                    : '0'}
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
                              {(() => {
                                const responseTime = aiSummary?.avgResponseTime 
                                  ? (typeof aiSummary.avgResponseTime === 'number' ? aiSummary.avgResponseTime : parseFloat(aiSummary.avgResponseTime) || 0)
                                  : 0
                                return (
                                  <>
                                    <p className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                                      {aiSummary?.avgResponseTime ? formatDuration(responseTime) : 'N/A'}
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                      {responseTime < 2000 ? 'Excellent' : responseTime < 5000 ? 'Good' : responseTime > 0 ? 'Needs improvement' : 'No data'}
                                    </p>
                                  </>
                                )
                              })()}
                            </div>
                            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
                              <p className="text-sm text-muted-foreground">Success Rate</p>
                              {(() => {
                                const rate = aiSummary?.overallSuccessRate 
                                  ? (typeof aiSummary.overallSuccessRate === 'number' ? aiSummary.overallSuccessRate : parseFloat(aiSummary.overallSuccessRate) || 0)
                                  : 0
                                return (
                                  <>
                                    <p className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                                      {aiSummary?.overallSuccessRate ? `${rate.toFixed(1)}%` : 'N/A'}
                                    </p>
                                    <p className="text-xs text-purple-600 mt-1">
                                      {rate >= 95 ? 'Excellent' : rate >= 90 ? 'Good' : 'Monitor closely'}
                                    </p>
                                  </>
                                )
                              })()}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-sm font-medium">Provider Reliability</p>
                            <div className="space-y-2">
                              {providerStats.length > 0 ? (
                                providerStats.slice(0, 5).map((provider, index) => {
                                  const rate = typeof provider.success_rate === 'number' ? provider.success_rate : parseFloat(provider.success_rate) || 0
                                  return (
                                    <div key={index}>
                                      <div className="flex justify-between text-xs mb-1">
                                        <span>{provider.provider_name}</span>
                                        <span className="font-medium">{rate.toFixed(1)}% success</span>
                                      </div>
                                      <div className="w-full bg-muted rounded-full h-2">
                                        <div 
                                          className={`h-2 rounded-full ${
                                            rate >= 95 ? 'bg-green-500' : 
                                            rate >= 90 ? 'bg-blue-500' : 'bg-yellow-500'
                                          }`} 
                                          style={{ width: `${rate}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  )
                                })
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
                                const mostReliable = [...providerStats].sort((a, b) => {
                                  const aRate = typeof a.success_rate === 'number' ? a.success_rate : parseFloat(a.success_rate) || 0
                                  const bRate = typeof b.success_rate === 'number' ? b.success_rate : parseFloat(b.success_rate) || 0
                                  return bRate - aRate
                                })[0]
                                const rate = typeof mostReliable.success_rate === 'number' ? mostReliable.success_rate : parseFloat(mostReliable.success_rate) || 0
                                return (
                                  <div className="p-4 border-l-4 border-l-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded">
                                    <div className="flex items-start gap-3">
                                      <Activity className="h-5 w-5 text-orange-600 mt-0.5" />
                                      <div>
                                        <h4 className="font-medium text-orange-900 dark:text-orange-100">Most Reliable: {mostReliable.provider_name}</h4>
                                        <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                                          {rate.toFixed(1)}% success rate across {formatNumber(mostReliable.usage_count)} requests
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
                                    .sort((a, b) => Number(b.usage_count) - Number(a.usage_count))
                                    .slice(0, 3)
                                    .map((hourData, index) => {
                                      const maxUsage = hourlyUsage.reduce((max, h) => Math.max(max, Number(h.usage_count) || 0), 0)
                                      const percentage = (Number(hourData.usage_count) / maxUsage) * 100
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
