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
        setLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const statsPath = integrationId
                ? `/api/integrations/${integrationId}/mongodb/stats`
                : '/api/integrations/mongodb/stats'

            const response = await fetch(statsPath, {
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

            {!integrationId && (
                <Card className="border-dashed">
                    <CardContent className="py-4 text-center text-sm text-muted-foreground">
                        <Database className="h-5 w-5 inline-block mr-2 align-text-bottom opacity-60" />
                        Using server-level MongoDB analysis (no active MongoDB integration record found).
                    </CardContent>
                </Card>
            )}

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

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Semantic Search</h3>
                <VectorSearch integrationId={integrationId} />
            </div>
        </div>
    )
}

function VectorSearch({ integrationId }: { integrationId: string | null }) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setSearching(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const searchPath = integrationId
                ? `/api/integrations/${integrationId}/mongodb/search`
                : '/api/integrations/mongodb/search'

            const response = await fetch(searchPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query, topK: 5 })
            })

            const data = await response.json()
            if (data.success) {
                setResults(data.matches || [])
                if (data.matches?.length === 0) {
                    toast.info("No matching documents found")
                }
            } else {
                toast.error(data.message || "Search failed")
            }
        } catch (error) {
            console.error("Search error:", error)
            toast.error("Failed to perform search")
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Test Vector Search</CardTitle>
                    <CardDescription>
                        Enter a query to search existing embeddings using vector similarity.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., 'What are the project requirements?'"
                            className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                        />
                        <Button type="submit" disabled={searching}>
                            {searching ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                'Search'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {results.length > 0 && (
                <div className="grid gap-4">
                    {results.map((result, i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardHeader className="py-3 bg-muted/20">
                                <div className="flex justify-between items-start">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Score: {(result.score * 100).toFixed(1)}%
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        Chunk {i + 1}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="py-4">
                                <p className="text-sm whitespace-pre-wrap">{result.content}</p>
                                {result.metadata && (
                                    <div className="mt-2 pt-2 border-t text-xs text-muted-foreground grid grid-cols-2 gap-2">
                                        {Object.entries(result.metadata).map(([key, value]) => (
                                            <div key={key}>
                                                <span className="font-semibold">{key}:</span> {String(value)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
