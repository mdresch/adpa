"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    RefreshCw,
    Database,
    Code,
    FileCode,
    AlertCircle,
    CheckCircle2,
    Server,
    Zap,
    FileText,
    Layers,
    Activity,
    User
} from "@/components/ui/icons-shim"
import { toast } from "sonner"
import { RAGIngestionChart } from "./RAGIngestionChart"
import { PerformanceMetricsCard } from "./PerformanceMetricsCard"
import { ErrorLogPanel } from "./ErrorLogPanel"
import { RAGSearchPanel } from "./RAGSearchPanel"

interface EdgeFunctionStats {
    totalDocuments?: number;
    totalVectors?: number;
    documentsWithVectors?: number;
    avgChunksPerDoc?: string;
    activeDays?: number;
    lastIngestion?: string;
    firstIngestion?: string;
    totalEntities?: number;
    documentsWithEntities?: number;
    uniqueEntityTypes?: number;
}

interface SupabaseStats {
    database: {
        totalTables: number;
        totalRows: number;
        ragDocuments: number;
        entities: {
            total: number;
            documentsWithEntities: number;
            uniqueTypes: number;
        };
        databaseSize: number;
        tables: Array<{
            tablename: string;
            schemaname: string;
            size_bytes: string;
        }>;
    };
    edgeFunctions: {
        totalFunctions: number;
        deployedFunctions: number;
        functions: Array<{
            name: string;
            status: string;
            description: string;
            url: string;
            stats?: EdgeFunctionStats;
        }>;
    };
    mcpTools: Record<string, string>;
}

interface SupabaseDashboardProps {
    integrationId: string | null;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export function SupabaseDashboard({ integrationId }: SupabaseDashboardProps) {
    const [loading, setLoading] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [stats, setStats] = useState<SupabaseStats | null>(null)

    const fetchStats = async () => {
        if (!integrationId) return

        setLoading(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const response = await fetch(`/api/integrations/${integrationId}/supabase/stats`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error("Failed to fetch Supabase stats")
            }

            const data = await response.json()
            setStats(data)
        } catch (error) {
            console.error("Dashboard error:", error)
            toast.error("Failed to load Supabase statistics")
        } finally {
            setLoading(false)
        }
    }

    const syncAllToRAG = async () => {
        setSyncing(true)
        try {
            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const response = await fetch('/api/rag/sync-all', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (!response.ok) {
                throw new Error("Failed to sync documents to RAG")
            }

            const result = await response.json()
            toast.success(`RAG Sync Complete: ${result.succeeded} documents synced successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`)

            // Refresh stats after sync
            await fetchStats()
        } catch (error: any) {
            console.error("RAG sync error:", error)
            toast.error(error.message || "Failed to sync documents to RAG")
        } finally {
            setSyncing(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [integrationId])

    if (!integrationId) {
        return (
            <Card className="border-dashed">
                <CardContent className="py-10 text-center">
                    <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Supabase Integration</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Configure a Supabase integration to manage projects and edge functions
                    </p>
                </CardContent>
            </Card>
        )
    }

    if (loading && !stats) {
        return (
            <Card>
                <CardContent className="py-10">
                    <div className="flex items-center justify-center">
                        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading Supabase stats...</span>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Database className="h-6 w-6 text-emerald-600" />
                        Supabase Analytics
                    </h2>
                    <p className="text-muted-foreground">
                        Monitor database, Edge Functions, and RAG infrastructure
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

            {/* Stats Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Database Tables</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.database.totalTables ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.database.totalRows.toLocaleString() ?? '...'} total rows
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">RAG Documents</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.database.ragDocuments ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">In documents table</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Extracted Entities</CardTitle>
                        <User className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.database.entities.total ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.database.entities.uniqueTypes ?? '...'} unique types
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Edge Functions</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.edgeFunctions.deployedFunctions ?? '...'}</div>
                        <p className="text-xs text-muted-foreground">
                            {stats?.edgeFunctions.totalFunctions ?? '...'} total functions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Tabs */}
            <Tabs defaultValue="database" className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="database">Database</TabsTrigger>
                    <TabsTrigger value="functions">Edge Functions</TabsTrigger>
                    <TabsTrigger value="rag">RAG & Entities</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="search">Search</TabsTrigger>
                </TabsList>

                <TabsContent value="database" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Database Overview</CardTitle>
                            <CardDescription>
                                Total size: {stats ? formatBytes(stats.database.databaseSize) : '...'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {stats?.database.tables.slice(0, 10).map((table) => (
                                    <div key={`${table.schemaname}.${table.tablename}`} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                        <div className="flex items-center gap-2">
                                            <Database className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-mono text-sm">{table.tablename}</span>
                                        </div>
                                        <Badge variant="outline">{formatBytes(parseInt(table.size_bytes))}</Badge>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="functions" className="space-y-4">
                    <div className="grid gap-4">
                        {stats?.edgeFunctions.functions.map((func) => (
                            <Card key={func.name}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="flex items-center gap-2">
                                            <FileCode className="h-5 w-5 text-emerald-600" />
                                            {func.name}
                                        </CardTitle>
                                        <Badge variant={func.status === 'deployed' ? 'default' : 'secondary'}>
                                            {func.status}
                                        </Badge>
                                    </div>
                                    <CardDescription>{func.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Code className="h-4 w-4" />
                                            <code className="text-xs">{func.url}</code>
                                        </div>

                                        {/* RAG Function Stats */}
                                        {func.name === 'ingest-for-rag' && func.stats && (
                                            <div className="mt-4 space-y-3">
                                                <div className="text-sm font-medium">Ingestion Statistics</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="p-3 bg-muted/50 rounded">
                                                        <div className="text-xs text-muted-foreground">Total Documents</div>
                                                        <div className="text-lg font-bold">{func.stats.totalDocuments}</div>
                                                    </div>
                                                    <div className="p-3 bg-muted/50 rounded">
                                                        <div className="text-xs text-muted-foreground">Total Vectors</div>
                                                        <div className="text-lg font-bold">{func.stats.totalVectors}</div>
                                                    </div>
                                                    <div className="p-3 bg-muted/50 rounded">
                                                        <div className="text-xs text-muted-foreground">Avg Chunks/Doc</div>
                                                        <div className="text-lg font-bold">{func.stats.avgChunksPerDoc}</div>
                                                    </div>
                                                    <div className="p-3 bg-muted/50 rounded">
                                                        <div className="text-xs text-muted-foreground">Active Days</div>
                                                        <div className="text-lg font-bold">{func.stats.activeDays}</div>
                                                    </div>
                                                </div>
                                                {func.stats.lastIngestion && (
                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                        Last ingestion: {new Date(func.stats.lastIngestion).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Entity Extractor Stats */}
                                        {func.name === 'entity-extractor' && func.stats && (
                                            <div className="mt-4 space-y-3">
                                                <div className="text-sm font-medium">Extraction Statistics</div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="p-3 bg-muted/50 rounded">
                                                        <div className="text-xs text-muted-foreground">Total Entities</div>
                                                        <div className="text-lg font-bold">{func.stats.totalEntities}</div>
                                                    </div>
                                                    <div className="p-3 bg-muted/50 rounded">
                                                        <div className="text-xs text-muted-foreground">Documents</div>
                                                        <div className="text-lg font-bold">{func.stats.documentsWithEntities}</div>
                                                    </div>
                                                    <div className="p-3 bg-muted/50 rounded">
                                                        <div className="text-xs text-muted-foreground">Entity Types</div>
                                                        <div className="text-lg font-bold">{func.stats.uniqueEntityTypes}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="rag" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                    RAG Documents
                                </CardTitle>
                                <CardDescription>
                                    Sync all documents to vector database for RAG retrieval
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Total Documents:</span>
                                        <span className="font-bold">{stats?.database.ragDocuments ?? 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Table:</span>
                                        <code className="text-xs">documents</code>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Embedding Model:</span>
                                        <Badge variant="outline">Voyage AI</Badge>
                                    </div>
                                </div>
                                <Button
                                    onClick={syncAllToRAG}
                                    disabled={syncing}
                                    className="w-full gap-2"
                                    variant="default"
                                >
                                    <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                                    {syncing ? 'Syncing...' : 'Sync All to RAG'}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <User className="h-5 w-5 text-purple-600" />
                                    Entity Extraction
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Total Entities:</span>
                                    <span className="font-bold">{stats?.database.entities.total ?? 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Documents Processed:</span>
                                    <span className="font-bold">{stats?.database.entities.documentsWithEntities ?? 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Entity Types:</span>
                                    <Badge variant="outline">{stats?.database.entities.uniqueTypes ?? 0}</Badge>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="bg-muted/30">
                        <CardHeader>
                            <CardTitle className="text-lg">Infrastructure Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">RAG Ingestion:</span>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span>ingest-for-rag deployed</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Entity Extraction:</span>
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    <span>entity-extractor deployed</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between border-t pt-2 mt-2">
                                <span className="text-muted-foreground italic">
                                    Note: Edge Functions process documents asynchronously
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    {/* Document Ingestion Time-series Chart */}
                    <RAGIngestionChart integrationId={integrationId} days={7} />

                    {/* Performance Metrics */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Activity className="h-5 w-5 text-blue-600" />
                                Performance Metrics
                            </CardTitle>
                            <CardDescription>
                                Latency, throughput, and success rates for RAG operations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PerformanceMetricsCard refreshTrigger={undefined} />
                        </CardContent>
                    </Card>

                    {/* Error Logs */}
                    <ErrorLogPanel refreshTrigger={undefined} />
                </TabsContent>

                <TabsContent value="search" className="space-y-4">
                    <RAGSearchPanel />
                </TabsContent>
            </Tabs>
        </div>
    )
}
