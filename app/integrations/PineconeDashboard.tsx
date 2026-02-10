"use client"

import React from "react"
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
  Activity,
  Database
} from "lucide-react"
import { toast } from "sonner"

interface PineconeStats {
  indexStats: {
    totalVectorCount?: number;
    dimensionCount?: number;
    indexFullness?: number;
    namespaces?: Record<string, { vectorCount: number }>;
  };
  indexName: string;
  environment: string;
}

interface PineconeDashboardProps {
  integrationId: string | null;
}

export function PineconeDashboard({ integrationId }: PineconeDashboardProps) {
  const [stats, setStats] = React.useState<PineconeStats | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [searchNamespace, setSearchNamespace] = React.useState("all")
  const [searchResults, setSearchResults] = React.useState<any[]>([])
  const [searching, setSearching] = React.useState(false)

  const fetchStats = async () => {
    if (!integrationId) return

    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const response = await fetch(`/api/integrations/${integrationId}/pinecone/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error("Failed to fetch Pinecone statistics")
      }

      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Dashboard error:", error)
      toast.error("Failed to load Pinecone statistics")
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!integrationId || !searchQuery.trim()) return

    setSearching(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const response = await fetch(`/api/integrations/${integrationId}/pinecone/search`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: searchQuery,
          namespace: searchNamespace === "all" ? "" : searchNamespace,
          topK: 5
        })
      })

      if (!response.ok) {
        throw new Error("Search failed")
      }

      const data = await response.json()
      setSearchResults(data.matches || [])
      if (data.matches?.length === 0) {
        toast.info("No matches found")
      }
    } catch (error) {
      console.error("Search error:", error)
      toast.error("Failed to perform vector search")
    } finally {
      setSearching(false)
    }
  }

  const handleSync = async () => {
    if (!integrationId) return

    setSyncing(true)
    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        throw new Error("Failed to start sync")
      }

      const result = await response.json()

      if (result.success) {
        const syncedCount = result.details?.synced_items || 0
        toast.success(`Sync completed! ${syncedCount} vectors synced`)
        // Refresh stats after sync
        await fetchStats()
      } else {
        toast.error(`Sync failed: ${result.details?.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Sync error:", error)
      toast.error("Failed to sync Pinecone data")
    } finally {
      setSyncing(false)
    }
  }

  React.useEffect(() => {
    fetchStats()
  }, [integrationId])

  if (!integrationId) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center">
          <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pinecone Integration</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Configure a Pinecone integration to view vector database analytics
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
            <span className="ml-2 text-sm text-muted-foreground">Loading statistics...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalVectors = stats?.indexStats?.totalVectorCount || 0
  const dimensions = stats?.indexStats?.dimensionCount || 1024
  const indexFullness = stats?.indexStats?.indexFullness || 0
  const namespaces = stats?.indexStats?.namespaces || {}

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-green-600" />
                Pinecone Vector Analytics
              </CardTitle>
              <CardDescription>
                Monitor vector store health and embedding coverage
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Vectors */}
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-800">Total Vectors</span>
                  <Layers className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold text-green-900">
                  {totalVectors.toLocaleString()}
                </div>
                <div className="text-xs text-green-700 mt-1">
                  {dimensions}D vectors
                </div>
              </CardContent>
            </Card>

            {/* Index Fullness */}
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-800">Index Fullness</span>
                  <Activity className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {(indexFullness * 100).toFixed(1)}%
                </div>
                <div className="text-xs text-blue-700 mt-1">
                  Storage utilization
                </div>
              </CardContent>
            </Card>

            {/* Namespaces */}
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-800">Namespaces</span>
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-900">
                  {Object.keys(namespaces).length}
                </div>
                <div className="text-xs text-purple-700 mt-1">
                  Active namespaces
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Namespace Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-semibold mb-3">Namespace Distribution</h4>
              <div className="space-y-2">
                {Object.keys(namespaces).length > 0 ? (
                  Object.entries(namespaces).map(([namespace, data]: [string, any]) => (
                    <div key={namespace} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex flex-col">
                        <span className="text-sm font-mono font-bold capitalize">{namespace || '(default)'}</span>
                        <span className="text-xs text-muted-foreground">Type: {namespace === 'chunks' ? 'Document Chunks' : namespace}</span>
                      </div>
                      <Badge variant="secondary" className="px-3 py-1 text-sm bg-background border-none shadow-sm">
                        {data.vectorCount?.toLocaleString() || 0} vectors
                      </Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">No namespaced data yet</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold mb-3">Storage Health</h4>
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium">Capacity Used</span>
                    <span className="text-xs font-bold">{(indexFullness * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={indexFullness * 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 border rounded bg-background">
                    <p className="text-muted-foreground">Total Vectors</p>
                    <p className="font-bold">{totalVectors.toLocaleString()}</p>
                  </div>
                  <div className="p-2 border rounded bg-background">
                    <p className="text-muted-foreground">Dimensions</p>
                    <p className="font-bold">{dimensions}D</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-muted" />

          {/* Search sandbox */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              Search Sandbox
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Enter query to test vector search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={searchNamespace}
                onChange={(e) => setSearchNamespace(e.target.value)}
              >
                <option value="all">All Namespaces</option>
                {Object.keys(namespaces).map(ns => (
                  <option key={ns} value={ns}>{ns}</option>
                ))}
              </select>
              <Button size="sm" onClick={handleSearch} disabled={searching}>
                {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">Top Matches</h4>
                <div className="grid grid-cols-1 gap-2">
                  {searchResults.map((match: any, idx: number) => (
                    <div key={idx} className="p-3 border rounded-lg text-sm hover:bg-muted/50 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-semibold text-blue-600">Score: {(match.score * 100).toFixed(1)}%</span>
                        <Badge variant="outline" className="text-[10px]">{match.metadata?.type || 'unknown'}</Badge>
                      </div>
                      <p className="font-medium">{match.metadata?.title || match.metadata?.name || match.id}</p>
                      {match.metadata?.text && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{match.metadata.text}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Deployment Details */}
          <Card className="bg-muted/20 border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                <div>
                  <span>Index:</span>
                  <p className="font-mono text-foreground mt-0.5">{stats?.indexName}</p>
                </div>
                <div>
                  <span>Env:</span>
                  <p className="text-foreground mt-0.5">{stats?.environment}</p>
                </div>
                <div>
                  <span>Provider:</span>
                  <p className="text-foreground mt-0.5">Serverless (AWS/GCP)</p>
                </div>
                <div>
                  <span>Status:</span>
                  <p className="text-green-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Healthy
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}

