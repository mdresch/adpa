"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
    RefreshCw,
    FileText,
    Layers,
    CheckCircle2,
    AlertCircle,
    Clock,
    Activity
} from "lucide-react"
import { toast } from "sonner"
import { Database } from "@/components/ui/icons-shim"

interface MongoDBStats {
    documents: number;
    chunks: number;
    embeddedChunks: number;
    embeddingPercentage: number;
    indexStatus: 'active' | 'building' | 'missing' | 'unavailable' | 'unknown';
    database: string;
}

interface MongoDBDashboardProps {
    integrationId: string | null;
}

export function MongoDBDashboard({ integrationId }: MongoDBDashboardProps) {
    const [stats, setStats] = useState<MongoDBStats | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchStats = async () => {
        if (!integrationId) return

        setLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const response = await fetch(`/api/integrations/${integrationId}/mongodb/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error("Failed to fetch MongoDB statistics")
            }

            const data = await response.json()
            setStats(data)
        } catch (error) {
            console.error("Dashboard error:", error)
            toast.error("Failed to load MongoDB statistics")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [integrationId])

    if (!integrationId) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                    <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-20" />
                    <p className="text-muted-foreground italic">
                        No active MongoDB integration found.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">MongoDB Analysis</h2>
                    <p className="text-muted-foreground">
                        Monitor Vector Store health and embedding coverage.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchStats}
                    disabled={loading}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.documents ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">In RAG collection</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.chunks ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats && stats.documents > 0
                                ? `~${Math.round(stats.chunks / stats.documents)} per document`
                                : 'Ready for sync'}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Embedding Coverage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.embeddingPercentage ?? '...'}%</div>
                        <div className="mt-2">
                            <Progress value={stats?.embeddingPercentage ?? 0} className="h-2" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Index Status</CardTitle>
                        <Badge
                            variant={
                                stats?.indexStatus === 'active' ? 'default' :
                                    stats?.indexStatus === 'building' ? 'outline' : 'destructive'
                            }
                        >
                            {stats?.indexStatus ?? 'unknown'}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium flex items-center gap-2">
                            {stats?.indexStatus === 'active' ? (
                                <><CheckCircle2 className="h-4 w-4 text-green-500" /> Vector Search Ready</>
                            ) : stats?.indexStatus === 'building' ? (
                                <><Clock className="h-4 w-4 text-amber-500 animate-pulse" /> Index Building...</>
                            ) : (
                                <><AlertCircle className="h-4 w-4 text-red-500" /> Action Required</>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Atlas vector_search_index
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="bg-muted/30">
                <CardHeader>
                    <CardTitle className="text-lg">Deployment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Database Name:</span>
                        <span className="font-mono">{stats?.database ?? '...'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Embedded Chunks:</span>
                        <span>{stats?.embeddedChunks ?? '...'} / {stats?.chunks ?? '...'}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-muted-foreground italic">Note: Embeddings are generated asynchronously via Atlas Triggers.</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
