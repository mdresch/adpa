"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, Zap, Shield, AlertCircle, RefreshCw } from "lucide-react"
import { apiClient } from "@/lib/api"
import dynamic from 'next/dynamic'

// Dynamically import charts to avoid SSR issues
const SimpleLineChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.SimpleLineChart), { ssr: false })
const GenericPieChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.GenericPieChart), { ssr: false })

interface DigitalTwinAnalyticsTabProps {
    projectId: string
}

interface DriftTrend {
    date: string
    count: number
    severity: string
}

interface InnovationStats {
    totalOpportunities: number
    identifiedValue: number
    realizedValue: number
    avgNoveltyScore: number
}

interface HealthScore {
    overallScore: number
    driftImpact: number
    resolutionRate: number
    baselineAge: number
}

export function DigitalTwinAnalyticsTab({ projectId }: DigitalTwinAnalyticsTabProps) {
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [driftTrends, setDriftTrends] = useState<any[]>([])
    const [driftBreakdown, setDriftBreakdown] = useState<any[]>([])
    const [innovationStats, setInnovationStats] = useState<InnovationStats | null>(null)
    const [healthScore, setHealthScore] = useState<HealthScore | null>(null)
    const [error, setError] = useState<string | null>(null)

    const fetchData = async () => {
        try {
            setLoading(true)
            setError(null)

            const [trendsRes, innovationRes, healthRes] = await Promise.all([
                apiClient.get<any>(`/digital-twin/analytics/${projectId}/drift-trends?days=30`),
                apiClient.get<any>(`/digital-twin/analytics/${projectId}/innovation-stats`),
                apiClient.get<any>(`/digital-twin/analytics/${projectId}/health-score`)
            ])

            // Process trends data for chart
            // Group by date, but simple line chart expects [{ date, critical, high, ... }]
            const groupedTrends: Record<string, any> = {}
            trendsRes.trends.forEach((t: DriftTrend) => {
                if (!groupedTrends[t.date]) {
                    groupedTrends[t.date] = { date: t.date, critical: 0, high: 0, medium: 0, low: 0 }
                }
                groupedTrends[t.date][t.severity] = (groupedTrends[t.date][t.severity] || 0) + t.count
            })

            setDriftTrends(Object.values(groupedTrends).sort((a, b) => a.date.localeCompare(b.date)))

            // Process breakdown data for pie chart
            const colors: Record<string, string> = {
                'cost_drift': '#EF4444',
                'schedule_drift': '#F59E0B',
                'scope_drift': '#3B82F6',
                'quality_drift': '#10B981',
                'unknown': '#6B7280'
            }

            setDriftBreakdown(trendsRes.breakdown.map((b: any) => ({
                name: b.category.replace('_', ' ').toUpperCase(),
                value: parseInt(b.count, 10),
                color: colors[b.category] || colors.unknown
            })))

            setInnovationStats(innovationRes.stats)
            setHealthScore(healthRes.health)
        } catch (err: any) {
            console.error('[DT-ANALYTICS] Error loading data:', err)
            setError(err.message || 'Failed to load analytics data')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }

    useEffect(() => {
        if (projectId) {
            fetchData()
        }
    }, [projectId])

    const handleRefresh = () => {
        setRefreshing(true)
        fetchData()
    }

    if (loading && !refreshing) {
        return (
            <div className="flex flex-col items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Aggregating Digital Twin metrics...</p>
            </div>
        )
    }

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'text-green-600'
        if (score >= 60) return 'text-yellow-600'
        return 'text-red-600'
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Digital Twin Analytics</h2>
                    <p className="text-muted-foreground">Monitoring drift, innovation, and baseline health.</p>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    title="Refresh statistics"
                >
                    <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3 text-red-800">
                            <AlertCircle className="h-5 w-5" />
                            <p>{error}</p>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Baseline Health</CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${getHealthColor(healthScore?.overallScore || 0)}`}>
                            {healthScore?.overallScore}%
                        </div>
                        <Progress value={healthScore?.overallScore} className="h-2 mt-2" />
                        <p className="text-xs text-muted-foreground mt-2">
                            Based on unresolved drift & baseline age
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Innovation Value</CardTitle>
                        <Zap className="h-4 w-4 text-yellow-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${innovationStats?.identifiedValue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {innovationStats?.totalOpportunities} opportunities identified
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-[10px]">
                                {Math.round((innovationStats?.avgNoveltyScore || 0) * 100)}% Novelty
                            </Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{healthScore?.resolutionRate}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Drift resolved vs detected (90d)
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Drift</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {driftBreakdown.reduce((acc, curr) => acc + curr.value, 0)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active detections in this project
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Drift Trends (30 Days)</CardTitle>
                        <CardDescription>Daily occurrences of drift by severity</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {driftTrends.length > 0 ? (
                            <SimpleLineChart
                                data={driftTrends}
                                xKey="date"
                                lines={[
                                    { key: 'critical', color: '#EF4444' },
                                    { key: 'high', color: '#F59E0B' },
                                    { key: 'medium', color: '#3B82F6' },
                                    { key: 'low', color: '#10B981' }
                                ]}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No drift data for this period
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Drift Categories</CardTitle>
                        <CardDescription>Distribution across project dimensions</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px]">
                        {driftBreakdown.length > 0 ? (
                            <GenericPieChart
                                data={driftBreakdown}
                                dataKey="value"
                                labelFormatter={(entry: any) => `${entry.name}: ${entry.value}`}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                No category data available
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Card className="border-blue-200 bg-blue-50/30">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-blue-600" />
                        <CardTitle>Live Telemetry Simulator</CardTitle>
                    </div>
                    <CardDescription>
                        Simulate real-time events from Digital Twin providers to test proactive automation.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-6 md:grid-cols-3">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Badge variant="secondary">Bentley iTwin</Badge>
                                Infrastructure
                            </h4>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => simulateEvent('bentley/structural', { stressLevel: 0.95 })}
                                    className="text-xs py-2 px-3 bg-white border border-blue-200 hover:bg-blue-50 rounded shadow-sm text-left transition-colors"
                                >
                                    🔴 Trigger Critical Stress (Structural)
                                </button>
                                <button
                                    onClick={() => simulateEvent('bentley/structural', { stressLevel: 0.45 })}
                                    className="text-xs py-2 px-3 bg-white border border-blue-200 hover:bg-blue-50 rounded shadow-sm text-left transition-colors"
                                >
                                    🟢 Normal Load Update
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold flex items-center gap-2">
                                <Badge variant="secondary">Azure DT</Badge>
                                Supply Chain
                            </h4>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => simulateEvent('azure/inventory', { capacityPercent: 12 })}
                                    className="text-xs py-2 px-3 bg-white border border-blue-200 hover:bg-blue-50 rounded shadow-sm text-left transition-colors"
                                >
                                    🔴 Low Inventory Alert (&lt;20%)
                                </button>
                                <button
                                    onClick={() => simulateEvent('azure/logistics', { delayHours: 48 })}
                                    className="text-xs py-2 px-3 bg-white border border-blue-200 hover:bg-blue-50 rounded shadow-sm text-left transition-colors"
                                >
                                    ⚠️ Major Logistics Delay (48h)
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center border-l pl-6 border-blue-100 italic text-xs text-muted-foreground">
                            <p>Proactive Automation Workflow:</p>
                            <ol className="list-decimal ml-4 mt-2 space-y-1">
                                <li>Connector receives telemetry</li>
                                <li>ADPA detects drift from baseline</li>
                                <li>Escalation sends Teams alert</li>
                                <li>Auto-CR creation (if critical)</li>
                            </ol>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div >
    )

    async function simulateEvent(type: string, payload: any) {
        try {
            setRefreshing(true)
            // Fetch first available asset for this project to use as a target
            const assetsRes = await apiClient.get<any>(`/digital-twin/assets/${projectId}`)
            const asset = assetsRes.assets[0]

            if (!asset) {
                alert("No Digital Twin assets found for this project to simulate events against.")
                return
            }

            await apiClient.post(`/digital-twin-connectors/simulate/${type}`, {
                assetId: asset.id,
                externalId: asset.external_id,
                ...payload
            })

            // Notification or visual feedback could be added here
            setTimeout(() => {
                fetchData() // Refresh dashboard after simulation
            }, 1500)
        } catch (err: any) {
            console.error('[SIMULATOR] Failed:', err)
            alert("Simulation failed. Check console for details.")
        } finally {
            setRefreshing(false)
        }
    }
}
