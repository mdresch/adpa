"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Activity, 
  BarChart3, 
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Brain
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface ModelAnalytics {
  success: boolean
  model: {
    id: string
    name: string
    providerId: string
    providerName: string
  }
  period: string
  summary: {
    totalRequests: number
    totalTokens: number
    promptTokens: number
    completionTokens: number
    successfulRequests: number
    failedRequests: number
    successRate: number
    avgResponseTime: number
    avgTokensPerRequest: number
  }
  usageOverTime: Array<{
    date: string
    usage_count: number
    total_tokens: number
    prompt_tokens: number
    completion_tokens: number
    avg_response_time: number
    successful_requests: number
    failed_requests: number
  }>
  errorAnalysis: Array<{
    error_type: string
    error_message: string
    error_count: number
    last_occurrence: string
  }>
  promptAnalysis: Array<{
    prompt_length: number
    count: number
  }>
}

interface ModelAnalyticsTabProps {
  providerId: string
  modelName: string
}

export function ModelAnalyticsTab({ providerId, modelName }: ModelAnalyticsTabProps) {
  const [analytics, setAnalytics] = useState<ModelAnalytics | null>(null)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<"7d" | "30d" | "90d" | "1y">("30d")
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadModelAnalytics = async (period: string = analyticsPeriod) => {
    setLoadingAnalytics(true)
    setError(null)
    try {
      const response = await apiClient.get<any>(`/ai-analytics/models/${providerId}/${modelName}?period=${period}`, {
        suppressNotFoundError: true,
      })
      if (response.success) {
        setAnalytics(response)
      } else {
        setError("Failed to load analytics")
      }
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.status === 404) {
        setError("Model analytics endpoint is not enabled in this deployment")
        return
      }
      console.error("Error loading model analytics:", err)
      setError(err.message || "Failed to load analytics")
    } finally {
      setLoadingAnalytics(false)
    }
  }

  useEffect(() => {
    if (providerId && modelName) {
      loadModelAnalytics()
    }
  }, [providerId, modelName])

  useEffect(() => {
    if (providerId && modelName && analyticsPeriod) {
      loadModelAnalytics(analyticsPeriod)
    }
  }, [analyticsPeriod])

  if (loadingAnalytics && !analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Activity className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !analytics) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Analytics</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => loadModelAnalytics()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analytics || !analytics.summary || analytics.summary.totalRequests === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Usage Data Yet</h3>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Use this model to generate documents and analytics will appear here automatically.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const summary = analytics.summary
  const periodLabel = analyticsPeriod === '7d' ? '7 days' : analyticsPeriod === '30d' ? '30 days' : analyticsPeriod === '90d' ? '90 days' : '1 year'

  // Format chart data
  const usageChartData = analytics.usageOverTime?.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    requests: Number(day.usage_count || 0),
    tokens: Number(day.total_tokens || 0),
    avgTime: Number(day.avg_response_time || 0) / 1000, // Convert to seconds
  })) || []

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Analytics</h2>
          <p className="text-sm text-muted-foreground">Usage statistics for {modelName}</p>
        </div>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <Button
              key={period}
              variant={analyticsPeriod === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => setAnalyticsPeriod(period)}
              disabled={loadingAnalytics}
            >
              {period === '7d' && '7 Days'}
              {period === '30d' && '30 Days'}
              {period === '90d' && '90 Days'}
              {period === '1y' && '1 Year'}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {Number(summary.totalRequests || 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Last {periodLabel}
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
              {(() => {
                const tokens = Number(summary.totalTokens || 0)
                if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`
                if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`
                return tokens.toLocaleString()
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Tokens processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Response Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {(() => {
                const ms = Number(summary.avgResponseTime || 0)
                if (ms < 1000) return `${Math.round(ms)}ms`
                return `${(ms / 1000).toFixed(1)}s`
              })()}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average latency
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
            <div className={`text-3xl font-bold ${Number(summary.successRate || 0) >= 99 ? 'text-green-600' : Number(summary.successRate || 0) >= 95 ? 'text-yellow-600' : 'text-red-600'}`}>
              {Number(summary.successRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Successful requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Over Time Chart */}
      {usageChartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Usage Over Time
            </CardTitle>
            <CardDescription>
              Daily requests and token usage for the selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={usageChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="requests" stroke="#8884d8" name="Requests" />
                <Line yAxisId="right" type="monotone" dataKey="tokens" stroke="#82ca9d" name="Tokens" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Token Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Token Usage Breakdown
            </CardTitle>
            <CardDescription>
              Input vs Output tokens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Prompt Tokens</span>
                  <span className="text-sm font-medium">
                    {Number(summary.promptTokens || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Number(summary.totalTokens || 0) > 0 
                        ? (Number(summary.promptTokens || 0) / Number(summary.totalTokens || 1)) * 100 
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Completion Tokens</span>
                  <span className="text-sm font-medium">
                    {Number(summary.completionTokens || 0).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Number(summary.totalTokens || 0) > 0 
                        ? (Number(summary.completionTokens || 0) / Number(summary.totalTokens || 1)) * 100 
                        : 0}%`
                    }}
                  ></div>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Tokens</span>
                  <span className="text-lg font-bold">
                    {Number(summary.totalTokens || 0).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg {Number(summary.avgTokensPerRequest || 0).toLocaleString()} tokens per request
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Performance Metrics
            </CardTitle>
            <CardDescription>
              Speed and reliability statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Response Time</span>
                  <Badge variant="outline" className="text-xs">
                    {(() => {
                      const ms = Number(summary.avgResponseTime || 0)
                      if (ms < 2000) return "Excellent"
                      if (ms < 5000) return "Good"
                      return "Slow"
                    })()}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {(() => {
                    const ms = Number(summary.avgResponseTime || 0)
                    if (ms < 1000) return `${Math.round(ms)}ms`
                    return `${(ms / 1000).toFixed(2)}s`
                  })()}
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, Math.max(0, 100 - ((Number(summary.avgResponseTime || 0) / 1000) / 10) * 100))}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Lower is better • Target: &lt; 2s
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Reliability</span>
                  <Badge variant="outline" className="text-xs">
                    {Number(summary.successRate || 0) >= 99 ? "Excellent" :
                     Number(summary.successRate || 0) >= 95 ? "Good" :
                     "Needs Attention"}
                  </Badge>
                </div>
                <div className="text-2xl font-bold">
                  {Number(summary.successRate || 0).toFixed(1)}%
                </div>
                <div className="mt-2 w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Number(summary.successRate || 0)}%`
                    }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Success rate • Target: &gt; 99%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Analysis */}
      {analytics.errorAnalysis && analytics.errorAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Analysis
            </CardTitle>
            <CardDescription>
              Most common errors and their frequency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.errorAnalysis.slice(0, 10).map((error, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">{error.error_type || 'Unknown Error'}</span>
                    <Badge variant="destructive">{Number(error.error_count || 0)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{error.error_message || 'No message'}</p>
                  <p className="text-xs text-muted-foreground">
                    Last: {new Date(error.last_occurrence).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Request Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Request Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Number(summary.successfulRequests || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Successful</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {Number(summary.failedRequests || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Failed</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {Number(summary.avgTokensPerRequest || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Avg Tokens/Req</p>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold">
                {(() => {
                  const ms = Number(summary.avgResponseTime || 0)
                  if (ms < 1000) return `${Math.round(ms)}ms`
                  return `${(ms / 1000).toFixed(1)}s`
                })()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Avg Response</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

