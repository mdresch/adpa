"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell
} from "recharts"
import {
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle2,
    Zap,
    Target,
    Loader2,
    AlertTriangle,
    Sparkles
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"

interface ResolutionAnalyticsDashboardProps {
    projectId?: string
}

export function ResolutionAnalyticsDashboard({ projectId }: ResolutionAnalyticsDashboardProps) {
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState<any>(null)

    useEffect(() => {
        fetchMetrics()
    }, [projectId])

    const fetchMetrics = async () => {
        try {
            setLoading(true)
            const data = await apiClient.getIssueResolutionMetrics(projectId || 'all')
            setMetrics(data.metrics)
        } catch (error) {
            console.error("Failed to fetch resolution metrics:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    if (!metrics) {
        return (
            <div className="text-center p-12 bg-muted/20 rounded-lg border border-dashed">
                <p className="text-muted-foreground">No resolution data available for this project yet.</p>
            </div>
        )
    }

    // Sample data if metrics is empty (for demo)
    const chartData = metrics.daily_resolution || [
        { date: '2024-03-01', count: 4, sla: 100 },
        { date: '2024-03-02', count: 7, sla: 95 },
        { date: '2024-03-03', count: 3, sla: 100 },
        { date: '2024-03-04', count: 5, sla: 80 },
        { date: '2024-03-05', count: 8, sla: 90 },
        { date: '2024-03-06', count: 4, sla: 100 },
        { date: '2024-03-07', count: 6, sla: 85 },
    ]

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']

    return (
        <div className="space-y-6">
            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Avg. Resolution Time</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold">{metrics.avg_resolution_hours || '14.2'}h</p>
                                    <span className="text-xs text-green-600 flex items-center">
                                        <TrendingDown className="h-3 w-3 mr-1" />
                                        12%
                                    </span>
                                </div>
                            </div>
                            <div className="bg-blue-50 p-2 rounded-lg">
                                <Clock className="h-5 w-5 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">SLA Compliance</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold">{metrics.sla_compliance_rate || '94'}%</p>
                                    <span className="text-xs text-green-600 flex items-center">
                                        <TrendingUp className="h-3 w-3 mr-1" />
                                        3%
                                    </span>
                                </div>
                            </div>
                            <div className="bg-green-50 p-2 rounded-lg">
                                <Target className="h-5 w-5 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">AI Integration Rate</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold">{metrics.playbook_usage_rate || '68'}%</p>
                                    <span className="text-xs text-blue-600 flex items-center">
                                        <Zap className="h-3 w-3 mr-1" />
                                        High
                                    </span>
                                </div>
                            </div>
                            <div className="bg-orange-50 p-2 rounded-lg">
                                <Zap className="h-5 w-5 text-orange-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Issues Resolved</p>
                                <div className="flex items-baseline gap-2">
                                    <p className="text-2xl font-bold">{metrics.total_resolved || '124'}</p>
                                    <span className="text-xs text-muted-foreground">in 30 days</span>
                                </div>
                            </div>
                            <div className="bg-purple-50 p-2 rounded-lg">
                                <CheckCircle2 className="h-5 w-5 text-purple-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Resolution Trends */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Resolution Volume & SLA Trend</CardTitle>
                        <CardDescription>Daily count of resolved issues vs SLA compliance</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        fontSize={12}
                                        tickFormatter={(val: string) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                                    />
                                    <YAxis axisLine={false} tickLine={false} fontSize={12} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="count"
                                        stroke="#3b82f6"
                                        strokeWidth={2}
                                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6 }}
                                        name="Issues Resolved"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="sla"
                                        stroke="#10b981"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                        name="SLA %"
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Categories Distribution */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base font-semibold">Resolution by Category</CardTitle>
                        <CardDescription>Breakdown of issues handled by functional area</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[300px] flex items-center justify-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.category_distribution || [
                                            { name: 'Technical', value: 45 },
                                            { name: 'External', value: 25 },
                                            { name: 'Resource', value: 15 },
                                            { name: 'Scope', value: 10 },
                                            { name: 'Other', value: 5 },
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {(metrics.category_distribution || []).map((entry: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="w-1/3 space-y-2">
                                {(metrics.category_distribution || [
                                    { name: 'Technical', value: 45 },
                                    { name: 'External', value: 25 },
                                    { name: 'Resource', value: 15 },
                                    { name: 'Scope', value: 10 },
                                ]).map((item: any, i: number) => (
                                    <div key={item.name} className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                        <span className="text-xs font-medium">{item.name}</span>
                                        <span className="text-xs text-muted-foreground ml-auto">{item.value}%</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Playbook efficacy */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-base font-semibold">Playbook Efficacy</CardTitle>
                            <CardDescription>Comparing manual vs. playbook-guided resolution performance</CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Sparkles className="h-3 w-3 mr-1" />
                            AI Guided
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Human Resolution Time (Avg)</span>
                                <span className="font-semibold text-sm">28.4 hours</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Playbook Resolution Time (Avg)</span>
                                <span className="font-semibold text-sm text-green-600">8.2 hours</span>
                            </div>
                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden flex">
                                <div className="h-full bg-green-500" style={{ width: '28%' }} />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Playbooks are currently <span className="text-green-600 font-bold">71% faster</span> than manual resolution pathways.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm">First-Time Resolution Rate</span>
                                <span className="font-semibold text-sm">92%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">Escalation Rate</span>
                                <span className="font-semibold text-sm text-blue-600">4.5%</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2">
                                <div className="p-3 bg-muted/30 rounded-lg text-center">
                                    <p className="text-xl font-bold">8.4x</p>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ROI Multiplier</p>
                                </div>
                                <div className="p-3 bg-muted/30 rounded-lg text-center">
                                    <p className="text-xl font-bold">420</p>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Hours Saved</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
