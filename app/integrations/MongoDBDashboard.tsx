"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    RefreshCw,
    FileText,
    Layers,
    CheckCircle2,
    AlertCircle,
    Clock,
    Activity,
} from "lucide-react"
import { toast } from "sonner"
import { Database } from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"

interface MongoDBStats {
    documents: number
    chunks: number
    embeddedChunks: number
    embeddingPercentage: number
    indexStatus: string
    database: string
    configured?: boolean
    voyageConfigured?: boolean
    embeddingMode?: string
    searchReady?: boolean
    setupHint?: string
}

interface MongoDBDashboardProps {
    integrationId: string | null
}

type LoadState = "loading" | "ready" | "error"

export function MongoDBDashboard({ integrationId }: MongoDBDashboardProps) {
    const [stats, setStats] = useState<MongoDBStats | null>(null)
    const [loadState, setLoadState] = useState<LoadState>("loading")
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const statsPath = integrationId
        ? `/integrations/${integrationId}/mongodb/stats`
        : "/integrations/mongodb/stats"

    const fetchStats = useCallback(async () => {
        setLoadState("loading")
        setErrorMessage(null)
        try {
            const data = await apiClient.get<MongoDBStats>(statsPath)
            setStats(data)
            setLoadState("ready")
        } catch (error) {
            console.error("Dashboard error:", error)
            const message =
                error instanceof Error ? error.message : "Failed to load MongoDB statistics"
            setErrorMessage(message)
            setStats(null)
            setLoadState("error")
            toast.error(message)
        }
    }, [statsPath])

    useEffect(() => {
        void fetchStats()
    }, [fetchStats])

    const showSetup = loadState === "ready" && stats && (!stats.configured || stats.setupHint)

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
                    onClick={() => void fetchStats()}
                    disabled={loadState === "loading"}
                    className="gap-2"
                >
                    <RefreshCw className={`h-4 w-4 ${loadState === "loading" ? "animate-spin" : ""}`} />
                    Refresh
                </Button>
            </div>

            {!integrationId && (
                <Card className="border-dashed">
                    <CardContent className="py-4 text-center text-sm text-muted-foreground">
                        <Database className="h-5 w-5 inline-block mr-2 align-text-bottom opacity-60" />
                        No MongoDB integration record in the database yet. Stats use server env (
                        <code className="text-xs">MONGODB_URI</code>). On Overview, enable
                        &quot;MongoDB Vector Store&quot; before syncing.
                    </CardContent>
                </Card>
            )}

            {loadState === "error" && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Could not load MongoDB stats</AlertTitle>
                    <AlertDescription>
                        {errorMessage}
                        {errorMessage?.includes("403") || errorMessage?.toLowerCase().includes("permission")
                            ? " Your account needs integrations.read or integrations.view (admins have access automatically)."
                            : null}
                    </AlertDescription>
                </Alert>
            )}

            {showSetup && stats?.setupHint && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Setup required</AlertTitle>
                    <AlertDescription>{stats.setupHint}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadState === "loading" ? "…" : stats?.documents ?? "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">In RAG collection</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Chunks</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadState === "loading" ? "…" : stats?.chunks ?? "—"}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {stats && stats.documents > 0
                                ? `~${Math.round(stats.chunks / stats.documents)} per document`
                                : "Run sync from Overview"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Embedding Coverage</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {loadState === "loading" ? "…" : `${stats?.embeddingPercentage ?? 0}%`}
                        </div>
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
                                stats?.indexStatus === "active"
                                    ? "default"
                                    : stats?.indexStatus === "building"
                                      ? "outline"
                                      : "destructive"
                            }
                        >
                            {loadState === "loading" ? "…" : (stats?.indexStatus ?? "unknown")}
                        </Badge>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm font-medium flex items-center gap-2">
                            {stats?.indexStatus === "active" ? (
                                <>
                                    <CheckCircle2 className="h-4 w-4 text-green-500" /> Vector Search
                                    Ready
                                </>
                            ) : stats?.indexStatus === "building" ? (
                                <>
                                    <Clock className="h-4 w-4 text-amber-500 animate-pulse" /> Index
                                    Building…
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="h-4 w-4 text-red-500" /> Action Required
                                </>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {process.env.NEXT_PUBLIC_MONGODB_VECTOR_INDEX || "vector_search_index"}
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
                        <span className="font-mono">{stats?.database ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Embedded Chunks:</span>
                        <span>
                            {stats?.embeddedChunks ?? "—"} / {stats?.chunks ?? "—"}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Embedding mode:</span>
                        <span className="font-mono">{stats?.embeddingMode ?? "atlas"}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Voyage API (search):</span>
                        <span>{stats?.voyageConfigured ? "Configured" : "Missing on server"}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 mt-2">
                        <span className="text-muted-foreground italic">
                            Semantic search needs synced chunks with embeddings and an active vector
                            index.
                        </span>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Semantic Search</h3>
                <VectorSearch
                    integrationId={integrationId}
                    searchReady={stats?.searchReady}
                    setupHint={stats?.setupHint}
                />
            </div>
        </div>
    )
}

function VectorSearch({
    integrationId,
    searchReady,
    setupHint,
}: {
    integrationId: string | null
    searchReady?: boolean
    setupHint?: string
}) {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<
        Array<{ content: string; score?: number; metadata?: Record<string, unknown> }>
    >([])
    const [searching, setSearching] = useState(false)
    const [lastSearchNote, setLastSearchNote] = useState<string | null>(null)

    const searchPath = integrationId
        ? `/integrations/${integrationId}/mongodb/search`
        : "/integrations/mongodb/search"

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        setSearching(true)
        setLastSearchNote(null)
        setResults([])
        try {
            const data = await apiClient.post<{
                success: boolean
                matches?: Array<{
                    content: string
                    score?: number
                    metadata?: Record<string, unknown>
                }>
                message?: string
            }>(searchPath, { query: query.trim(), topK: 5 })

            if (data.success) {
                const matches = data.matches ?? []
                setResults(matches)
                if (matches.length === 0) {
                    setLastSearchNote(
                        "No matches for this query. Try different wording or sync more documents."
                    )
                    toast.info("No matching documents found")
                }
            } else {
                const msg = data.message || "Search failed"
                setLastSearchNote(msg)
                toast.error(msg)
            }
        } catch (error) {
            console.error("Search error:", error)
            const msg = error instanceof Error ? error.message : "Failed to perform search"
            setLastSearchNote(msg)
            toast.error(msg)
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
                <CardContent className="space-y-3">
                    {searchReady === false && setupHint && (
                        <p className="text-sm text-amber-600 dark:text-amber-500">{setupHint}</p>
                    )}
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="e.g., What are the project requirements?"
                            className="flex-1 px-3 py-2 border rounded-md text-sm bg-background"
                        />
                        <Button type="submit" disabled={searching}>
                            {searching ? (
                                <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Searching...
                                </>
                            ) : (
                                "Search"
                            )}
                        </Button>
                    </form>
                    {lastSearchNote && (
                        <p className="text-sm text-muted-foreground">{lastSearchNote}</p>
                    )}
                </CardContent>
            </Card>

            {results.length > 0 && (
                <div className="grid gap-4">
                    {results.map((result, i) => (
                        <Card key={i} className="overflow-hidden">
                            <CardHeader className="py-3 bg-muted/20">
                                <div className="flex justify-between items-start">
                                    <div className="text-sm font-medium text-muted-foreground">
                                        Score:{" "}
                                        {typeof result.score === "number"
                                            ? `${(result.score * 100).toFixed(1)}%`
                                            : "—"}
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
                                                <span className="font-semibold">{key}:</span>{" "}
                                                {String(value)}
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
