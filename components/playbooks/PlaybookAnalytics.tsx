"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { 
    TrendingUp, 
    TrendingDown, 
    Clock, 
    Target, 
    Users, 
    AlertTriangle,
    CheckCircle,
    XCircle,
    Play,
    Pause,
    BarChart3,
    PieChart,
    Activity,
    Calendar,
    Filter,
    Download,
    RefreshCw
} from "@/components/ui/icons-shim"
import { apiClient, Playbook, PlaybookExecution } from "@/lib/api"
import { toast } from "@/lib/notify"
import { format, subDays, startOfDay, endOfDay } from "date-fns"

interface AnalyticsData {
    overall: {
        totalPlaybooks: number
        activePlaybooks: number
        totalExecutions: number
        successRate: number
        avgDuration: number
        executionsThisMonth: number
        executionsThisWeek: number
    }
    performance: {
        topPerforming: Playbook[]
        underPerforming: Playbook[]
        trends: {
            period: string
            executions: number
            successRate: number
            avgDuration: number
        }[]
    }
    categories: {
        category: string
        executions: number
        successRate: number
        avgDuration: number
    }[]
    issues: {
        failedExecutions: PlaybookExecution[]
        longRunningExecutions: PlaybookExecution[]
        slaBreaches: PlaybookExecution[]
    }
}

interface PlaybookAnalyticsProps {
    projectId?: string
    timeframe?: string
}

export function PlaybookAnalytics({ projectId, timeframe = "30d" }: PlaybookAnalyticsProps) {
    const [data, setData] = useState<AnalyticsData | null>(null)
    const [loading, setLoading] = useState(false)
    const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe)
    const [selectedCategory, setSelectedCategory] = useState<string>("all")
    const [refreshing, setRefreshing] = useState(false)

    useEffect(() => {
        fetchAnalytics()
    }, [selectedTimeframe, selectedCategory, projectId])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)
            // Mock implementation - would fetch from analytics API
            const mockData: AnalyticsData = {
                overall: {
                    totalPlaybooks: 24,
                    activePlaybooks: 18,
                    totalExecutions: 156,
                    successRate: 87.5,
                    avgDuration: 12.5,
                    executionsThisMonth: 45,
                    executionsThisWeek: 12
                },
                performance: {
                    topPerforming: [
                        { id: "1", title: "Critical Risk Response", category: "risk", success_rate: 95, executions_count: 23 },
                        { id: "2", title: "Incident Triage", category: "incident", success_rate: 92, executions_count: 18 },
                        { id: "3", title: "Escalation Protocol", category: "escalation", success_rate: 89, executions_count: 15 }
                    ] as any[],
                    underPerforming: [
                        { id: "4", title: "Budget Analysis", category: "risk", success_rate: 65, executions_count: 8 },
                        { id: "5", title: "Vendor Management", category: "incident", success_rate: 58, executions_count: 6 }
                    ] as any[],
                    trends: [
                        { period: "Week 1", executions: 12, successRate: 85, avgDuration: 14.2 },
                        { period: "Week 2", executions: 15, successRate: 88, avgDuration: 13.1 },
                        { period: "Week 3", executions: 18, successRate: 91, avgDuration: 12.5 },
                        { period: "Week 4", executions: 12, successRate: 87, avgDuration: 13.8 }
                    ]
                },
                categories: [
                    { category: "risk", executions: 89, successRate: 91.2, avgDuration: 14.5 },
                    { category: "incident", executions: 45, successRate: 85.3, avgDuration: 11.2 },
                    { category: "escalation", executions: 22, successRate: 88.6, avgDuration: 9.8 }
                ],
                issues: {
                    failedExecutions: [
                        { id: "e1", playbook_id: "4", status: "failed", started_at: subDays(new Date(), 2).toISOString(), error: "Timeout waiting for approval" } as any,
                        { id: "e2", playbook_id: "5", status: "failed", started_at: subDays(new Date(), 5).toISOString(), error: "Missing required data" } as any
                    ],
                    longRunningExecutions: [
                        { id: "e3", playbook_id: "1", status: "in_progress", started_at: subDays(new Date(), 3).toISOString(), current_step_order: 2, total_steps: 8 } as any,
                        { id: "e4", playbook_id: "2", status: "in_progress", started_at: subDays(new Date(), 4).toISOString(), current_step_order: 1, total_steps: 5 } as any
                    ],
                    slaBreaches: [
                        { id: "e5", playbook_id: "3", status: "in_progress", started_at: subDays(new Date(), 1).toISOString(), sla_breached: true } as any
                    ]
                }
            }
            
            setData(mockData)
        } catch (error) {
            toast.error("Failed to fetch analytics data")
        } finally {
            setLoading(false)
        }
    }

    const handleRefresh = async () => {
        setRefreshing(true)
        await fetchAnalytics()
        setRefreshing(false)
        toast.success("Analytics refreshed")
    }

    const handleExport = () => {
        // Mock export functionality
        toast.info("Export functionality coming soon")
    }

    const getSuccessRateColor = (rate: number) => {
        if (rate >= 90) return "text-green-600"
        if (rate >= 75) return "text-yellow-600"
        return "text-red-600"
    }

    const getDurationColor = (duration: number) => {
        if (duration <= 8) return "text-green-600"
        if (duration <= 24) return "text-yellow-600"
        return "text-red-600"
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No analytics data available</h3>
                <p className="text-muted-foreground">
                    Start executing playbooks to see analytics data.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Playbook Analytics</h2>
                    <p className="text-muted-foreground">
                        Performance metrics and insights for your operational playbooks
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
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
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            <SelectItem value="risk">Risk</SelectItem>
                            <SelectItem value="incident">Incident</SelectItem>
                            <SelectItem value="escalation">Escalation</SelectItem>
                            <SelectItem value="resolution">Resolution</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Playbooks</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.overall.totalPlaybooks}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.overall.activePlaybooks} active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getSuccessRateColor(data.overall.successRate)}`}>
                            {data.overall.successRate}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {data.overall.totalExecutions} total executions
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getDurationColor(data.overall.avgDuration)}`}>
                            {data.overall.avgDuration}h
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Per playbook execution
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">This Month</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.overall.executionsThisMonth}</div>
                        <p className="text-xs text-muted-foreground">
                            {data.overall.executionsThisWeek} this week
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Analytics */}
            <Tabs defaultValue="performance" className="space-y-4">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="categories">Categories</TabsTrigger>
                    <TabsTrigger value="issues">Issues</TabsTrigger>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                </TabsList>

                <TabsContent value="performance" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Performing */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingUp className="h-5 w-5 text-green-600" />
                                    Top Performing Playbooks
                                </CardTitle>
                                <CardDescription>
                                    Highest success rates and execution counts
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {data.performance.topPerforming.map((playbook, index) => (
                                    <div key={playbook.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm">{playbook.title}</span>
                                                <Badge variant="outline">{playbook.category}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>{playbook.executions_count} executions</span>
                                                <span className={getSuccessRateColor(playbook.success_rate)}>
                                                    {playbook.success_rate}% success
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-green-600">#{index + 1}</div>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Under Performing */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <TrendingDown className="h-5 w-5 text-red-600" />
                                    Under Performing Playbooks
                                </CardTitle>
                                <CardDescription>
                                    Playbooks that may need optimization or review
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {data.performance.underPerforming.map((playbook) => (
                                    <div key={playbook.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-medium text-sm">{playbook.title}</span>
                                                <Badge variant="outline">{playbook.category}</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                <span>{playbook.executions_count} executions</span>
                                                <span className={getSuccessRateColor(playbook.success_rate)}>
                                                    {playbook.success_rate}% success
                                                </span>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            <AlertTriangle className="h-4 w-4 mr-1" />
                                            Review
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="categories" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Category Performance</CardTitle>
                            <CardDescription>
                                Breakdown of playbook performance by category
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {data.categories.map((category) => (
                                    <div key={category.category} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-medium capitalize">{category.category}</h4>
                                                <Badge variant="outline">{category.executions} executions</Badge>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span className={getSuccessRateColor(category.successRate)}>
                                                    {category.success_rate}% success
                                                </span>
                                                <span className={getDurationColor(category.avgDuration)}>
                                                    {category.avgDuration}h avg
                                                </span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Success Rate</span>
                                                <span>{category.successRate}%</span>
                                            </div>
                                            <Progress value={category.successRate} className="h-2" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="issues" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Failed Executions */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    Failed Executions
                                </CardTitle>
                                <CardDescription>
                                    Recent playbook failures that need attention
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.issues.failedExecutions.map((execution) => (
                                    <div key={execution.id} className="p-3 border rounded-lg border-red-200 bg-red-50">
                                        <div className="flex items-center justify-between mb-1">
                                            <Badge variant="destructive">Failed</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(execution.started_at), "MMM d, HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-sm font-medium">{execution.error}</p>
                                        <Button variant="outline" size="sm" className="mt-2">
                                            Investigate
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Long Running */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="h-5 w-5 text-yellow-600" />
                                    Long Running
                                </CardTitle>
                                <CardDescription>
                                    Executions taking longer than expected
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.issues.longRunningExecutions.map((execution) => (
                                    <div key={execution.id} className="p-3 border rounded-lg border-yellow-200 bg-yellow-50">
                                        <div className="flex items-center justify-between mb-1">
                                            <Badge variant="secondary">In Progress</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(execution.started_at), "MMM d, HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-sm">
                                            Step {execution.current_step_order} of {execution.total_steps}
                                        </p>
                                        <div className="mt-2">
                                            <Progress 
                                                value={(execution.current_step_order / execution.total_steps) * 100} 
                                                className="h-2"
                                            />
                                        </div>
                                        <Button variant="outline" size="sm" className="mt-2">
                                            Review
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* SLA Breaches */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                                    SLA Breaches
                                </CardTitle>
                                <CardDescription>
                                    Executions that missed their SLA targets
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {data.issues.slaBreaches.map((execution) => (
                                    <div key={execution.id} className="p-3 border rounded-lg border-orange-200 bg-orange-50">
                                        <div className="flex items-center justify-between mb-1">
                                            <Badge variant="secondary">SLA Breach</Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(execution.started_at), "MMM d, HH:mm")}
                                            </span>
                                        </div>
                                        <p className="text-sm">Step deadline exceeded</p>
                                        <Button variant="outline" size="sm" className="mt-2">
                                            Escalate
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="trends" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Execution Trends</CardTitle>
                            <CardDescription>
                                Weekly performance trends over the selected timeframe
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {data.performance.trends.map((trend, index) => (
                                    <div key={index} className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-medium">{trend.period}</h4>
                                            <div className="flex items-center gap-4 text-sm">
                                                <span>{trend.executions} executions</span>
                                                <span className={getSuccessRateColor(trend.successRate)}>
                                                    {trend.successRate}% success
                                                </span>
                                                <span className={getDurationColor(trend.avgDuration)}>
                                                    {trend.avgDuration}h avg
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Executions</div>
                                                <Progress value={(trend.executions / 20) * 100} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                                                <Progress value={trend.successRate} className="h-2" />
                                            </div>
                                            <div>
                                                <div className="text-xs text-muted-foreground mb-1">Duration (inverse)</div>
                                                <Progress value={Math.max(0, 100 - (trend.avgDuration / 24) * 100)} className="h-2" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
