"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { apiClient } from "@/lib/api"
import { toast } from "@/hooks/use-toast"
import {
    Activity,
    BarChart3,
    CheckCircle,
    Database,
    Download,
    FileSearch,
    RefreshCw,
    TrendingUp,
    AlertCircle,
    Zap,
} from "@/components/ui/icons-shim"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dynamic from 'next/dynamic'

const SimpleLineChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.SimpleLineChart), {
    ssr: false,
    loading: () => <div className="h-80 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
})

const GenericBarChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.GenericBarChart), {
    ssr: false,
    loading: () => <div className="h-80 bg-slate-100 dark:bg-slate-800 animate-pulse rounded-lg" />
})

export default function ExtractionAnalyticsPage() {
    const { user, hasPermission } = useAuth()
    const [timeRange, setTimeRange] = useState("30d")
    const [loading, setLoading] = useState(true)
    const [overview, setOverview] = useState<any>(null)
    const [distribution, setDistribution] = useState<any[]>([])
    const [trends, setTrends] = useState<any[]>([])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [overviewRes, distributionRes, trendsRes] = await Promise.all([
                apiClient.getExtractionOverview(timeRange),
                apiClient.getExtractionDistribution(timeRange),
                apiClient.getExtractionTrends(timeRange)
            ])

            if (overviewRes.success) setOverview(overviewRes.data)
            if (distributionRes.success) setDistribution(distributionRes.data)
            if (trendsRes.success) setTrends(trendsRes.data)
        } catch (error) {
            console.error("Failed to fetch extraction analytics:", error)
            toast({
                title: "Error",
                description: "Failed to load extraction analytics data",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void fetchData()
    }, [timeRange])

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
                                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
                                    <p className="text-muted-foreground">You don't have permission to view extraction analytics.</p>
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
                        <div className="max-w-7xl mx-auto">
                            {/* Header section */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                        <FileSearch className="h-8 w-8 text-blue-600" />
                                        Extraction Intelligence
                                    </h1>
                                    <p className="text-muted-foreground mt-1 text-lg">
                                        Real-time insights into AI-powered entity extraction performance and findings.
                                    </p>
                                </div>

                                <div className="flex items-center gap-3">
                                    <Select value={timeRange} onValueChange={setTimeRange}>
                                        <SelectTrigger className="w-40 bg-white dark:bg-slate-900">
                                            <SelectValue placeholder="Period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="24h">Last 24 Hours</SelectItem>
                                            <SelectItem value="7d">Last 7 Days</SelectItem>
                                            <SelectItem value="30d">Last 30 Days</SelectItem>
                                            <SelectItem value="90d">Last 90 Days</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Button variant="outline" size="icon" onClick={fetchData} disabled={loading}>
                                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                                    </Button>

                                    <Button className="bg-blue-600 hover:bg-blue-700">
                                        <Download className="h-4 w-4 mr-2" />
                                        Export Reports
                                    </Button>
                                </div>
                            </div>

                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                                <Card className="border-l-4 border-l-blue-500 overflow-hidden">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Total Extractions</CardTitle>
                                        <Zap className="h-4 w-4 text-blue-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{overview?.totalExtractions?.toLocaleString() || 0}</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Full entity extraction runs
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-green-500 overflow-hidden">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Entities Persisted</CardTitle>
                                        <Database className="h-4 w-4 text-green-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{overview?.totalPersisted?.toLocaleString() || 0}</div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Data points successfully saved
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-amber-500 overflow-hidden">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Extraction Success</CardTitle>
                                        <CheckCircle className="h-4 w-4 text-amber-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{overview?.successRate?.toFixed(1) || 0}%</div>
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-3 overflow-hidden">
                                            <div
                                                className="bg-amber-500 h-full rounded-full transition-all duration-500"
                                                style={{ width: `${overview?.successRate || 0}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-purple-500 overflow-hidden">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                        <CardTitle className="text-sm font-medium">Most Active Entity</CardTitle>
                                        <Activity className="h-4 w-4 text-purple-500" />
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold truncate">{overview?.mostActiveEntity || 'None'}</div>
                                        <p className="text-xs text-muted-foreground mt-1 capitalize">
                                            Most frequently processed
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <TrendingUp className="h-5 w-5 text-blue-500" />
                                                    Extraction Volume
                                                </CardTitle>
                                                <CardDescription>Extractions performed over the selected period</CardDescription>
                                            </div>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Live Feed</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <SimpleLineChart
                                            data={trends}
                                            xKey="time"
                                            lines={[{ key: 'count', color: '#2563eb' }]}
                                        />
                                    </CardContent>
                                </Card>

                                <Card className="shadow-sm">
                                    <CardHeader>
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <BarChart3 className="h-5 w-5 text-green-500" />
                                                Entity Type Distribution
                                            </CardTitle>
                                            <CardDescription>Breakdown of entities persisted by category</CardDescription>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <GenericBarChart
                                            data={distribution}
                                            xKey="entity_type"
                                            dataKey="count"
                                        />
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Data Table Section */}
                            <div className="mt-8">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Extraction Health & Precision</CardTitle>
                                        <CardDescription>Detailed metrics across all entity extraction modules.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="relative w-full overflow-auto">
                                            <table className="w-full caption-bottom text-sm">
                                                <thead className="[&_tr]:border-b">
                                                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Entity Type</th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Volume</th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Success Rate</th>
                                                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="[&_tr:last-child]:border-0">
                                                    {distribution.length > 0 ? (
                                                        distribution.map((item, idx) => (
                                                            <tr key={idx} className="border-b transition-colors hover:bg-muted/50">
                                                                <td className="p-4 align-middle font-medium capitalize">{item.entity_type.replace(/_/g, ' ')}</td>
                                                                <td className="p-4 align-middle">{item.count.toLocaleString()}</td>
                                                                <td className="p-4 align-middle">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-xs">98.5%</span>
                                                                        <div className="w-24 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                                            <div className="bg-green-500 h-full w-[98.5%]" />
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 align-middle">
                                                                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border-none">Stable</Badge>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={4} className="p-12 text-center text-muted-foreground">
                                                                No extraction data found for the selected period.
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </main>
                </div>
            </div>
        </PageTransition>
    )
}
