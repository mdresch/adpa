"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    RefreshCw,
    Network,
    Link as LinkIcon,
    CheckCircle2,
    AlertCircle,
    Activity
} from "lucide-react"
import { toast } from "sonner"
import { Database } from "@/components/ui/icons-shim"

interface Neo4jStats {
    totalNodes: number;
    totalRelationships: number;
    status: 'active' | 'unavailable' | 'unknown';
    database: string;
}

interface Neo4jDashboardProps {
    integrationId: string | null;
}

export function Neo4jDashboard({ integrationId }: Neo4jDashboardProps) {
    const [stats, setStats] = useState<Neo4jStats | null>(null)
    const [loading, setLoading] = useState(false)

    const fetchStats = async () => {
        if (!integrationId) return

        setLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            // Using placeholder endpoints until the backend integration is fully implemented
            const response = await fetch(`/api/integrations/${integrationId}/neo4j/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error("Failed to fetch Neo4j statistics")
            }

            const data = await response.json()
            setStats(data)
        } catch (error) {
            console.error("Dashboard error:", error)
            // Mocking some fallback stats for visual demonstration if the endpoint isn't ready
            setStats({
                totalNodes: 0,
                totalRelationships: 0,
                status: 'unavailable',
                database: 'neo4j'
            })
            toast.error("Failed to load Neo4j statistics")
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
                        No active Neo4j integration found.
                    </p>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Neo4j Analysis</h2>
                    <p className="text-muted-foreground">
                        Monitor Graph Database health and entity coverage.
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

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
                        <Network className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalNodes ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">Entities in graph</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Relationships</CardTitle>
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.totalRelationships ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">Connections between entities</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                        <Badge
                            variant={
                                stats?.status === 'active' ? 'default' : 'destructive'
                            }
                        >
                            {stats?.status ?? 'unknown'}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium flex items-center gap-2">
                            {stats?.status === 'active' ? (
                                <><CheckCircle2 className="h-4 w-4 text-green-500" /> Connected</>
                            ) : (
                                <><AlertCircle className="h-4 w-4 text-red-500" /> Action Required</>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            AuraDB Instance
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
                        <span className="font-mono">{stats?.database ?? 'neo4j'}</span>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Graph Search</h3>
                <GraphSearch integrationId={integrationId} />
            </div>
        </div>
    )
}

function GraphSearch({ integrationId }: { integrationId: string }) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const [searching, setSearching] = useState(false)

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setSearching(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const response = await fetch(`/api/integrations/${integrationId}/neo4j/search`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query })
            })

            const data = await response.json()
            if (data.success) {
                setResults(data.matches || [])
                if (data.matches?.length === 0) {
                    toast.info("No matching nodes found")
                }
            } else {
                toast.error(data.message || "Search failed")
            }
        } catch (error) {
            console.error("Search error:", error)
            toast.error("Failed to perform graph search")
        } finally {
            setSearching(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Test Graph Query</CardTitle>
                    <CardDescription>
                        Search for specific entities or run a test query.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., 'Project Alpha nodes'"
                            className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                        />
                        <Button type="submit" disabled={searching}>
                            {searching ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Querying...
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
                                    <div className="font-medium">
                                        {result.labels?.join(', ') || 'Node'}
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                        ID: {result.id}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="py-4">
                                {result.properties && (
                                    <div className="text-sm grid grid-cols-2 gap-2">
                                        {Object.entries(result.properties).map(([key, value]) => (
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
