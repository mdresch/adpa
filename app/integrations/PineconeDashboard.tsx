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
  const [stats, setStats] = useState<PineconeStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)

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
        toast.success(`Sync completed! ${result.details?.synced_items || 0} vectors synced`)
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

  useEffect(() => {
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

          {/* Index Fullness Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Storage Utilization</span>
              <span className="text-sm font-bold">{(indexFullness * 100).toFixed(1)}%</span>
            </div>
            <Progress value={indexFullness * 100} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {totalVectors.toLocaleString()} vectors stored
            </p>
          </div>

          {/* Namespace Details */}
          {Object.keys(namespaces).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold mb-3">Namespace Distribution</h4>
              <div className="space-y-2">
                {Object.entries(namespaces).map(([namespace, data]) => (
                  <div key={namespace} className="flex items-center justify-between p-2 bg-muted rounded-lg">
                    <span className="text-sm font-mono">{namespace || '(default)'}</span>
                    <Badge variant="secondary">
                      {data.vectorCount?.toLocaleString() || 0} vectors
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deployment Details */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h4 className="text-sm font-semibold mb-3">Deployment Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Index Name:</span>
                  <p className="font-mono font-medium">{stats?.indexName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Environment:</span>
                  <p className="font-medium">{stats?.environment}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Vector Dimensions:</span>
                  <p className="font-medium">{dimensions}D</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Vectors:</span>
                  <p className="font-medium">{totalVectors.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  )
}
