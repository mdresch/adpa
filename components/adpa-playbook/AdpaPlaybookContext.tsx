"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Database, 
  FileText, 
  Users, 
  AlertTriangle, 
  Target,
  CheckCircle,
  RefreshCw
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

interface ContextMetadata {
  unitsCount: number
  documentsCount: number
  entityTypes: string[]
}

interface PlaybookContext {
  projectId: string
  projectName: string
  context: string
  metadata: ContextMetadata
}

interface EntityContext {
  projectId: string
  projectName: string
  entityType: string
  context: string
  metadata: {
    unitsCount: number
    documentsCount: number
  }
}

interface ContextSummary {
  projectId: string
  projectName: string
  entityAvailability: Record<string, number>
  totalEntities: number
  availableEntityTypes: string[]
  lastUpdated: string
}

export function AdpaPlaybookContext() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [context, setContext] = useState<PlaybookContext | null>(null)
  const [summary, setSummary] = useState<ContextSummary | null>(null)
  const [entityContexts, setEntityContexts] = useState<Record<string, EntityContext>>({})

  const loadContext = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }

      const [contextData, summaryData] = await Promise.all([
        apiClient.get<PlaybookContext>("/adpa-playbook-context"),
        apiClient.get<ContextSummary>("/adpa-playbook-context/summary")
      ])

      setContext(contextData)
      setSummary(summaryData)

      // Load available entity contexts
      if (summaryData.availableEntityTypes.length > 0) {
        const entityPromises = summaryData.availableEntityTypes.map(type =>
          apiClient.get<EntityContext>(`/adpa-playbook-context/entities/${type}`)
        )
        const entityData = await Promise.all(entityPromises)
        
        const entityMap: Record<string, EntityContext> = {}
        entityData.forEach(data => {
          entityMap[data.entityType] = data
        })
        setEntityContexts(entityMap)
      }

    } catch (error: any) {
      console.error("Failed to load ADPA Playbook context:", error)
      toast({
        title: "Context Loading Error",
        description: error?.response?.data?.error || "Failed to load playbook context",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadContext()
  }, [])

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case 'Requirement': return <Target className="h-4 w-4" />
      case 'Risk': return <AlertTriangle className="h-4 w-4" />
      case 'Stakeholder': return <Users className="h-4 w-4" />
      case 'Milestone': return <CheckCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const formatContextText = (text: string) => {
    return text.split('\n').map((line, index) => (
      <p key={index} className="text-sm leading-relaxed">
        {line || <br />}
      </p>
    ))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">ADPA Playbook Context</h2>
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ADPA Playbook Context</h2>
          <p className="text-muted-foreground">
            Semantic context from the ADPA Playbook Development project
          </p>
        </div>
        <Button
          onClick={() => loadContext(true)}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Entities</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalEntities}</div>
              <p className="text-xs text-muted-foreground">
                Across {summary.availableEntityTypes.length} types
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{context?.metadata.documentsCount || 0}</div>
              <p className="text-xs text-muted-foreground">
                Processed documents
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entity Types</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.availableEntityTypes.length}</div>
              <p className="text-xs text-muted-foreground">
                Available types
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">
                {new Date(summary.lastUpdated).toLocaleDateString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Context refresh
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Entity Type Availability */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Entity Type Availability</CardTitle>
            <CardDescription>
              Available semantic units in the ADPA Playbook project
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.entityAvailability).map(([type, count]) => (
                <Badge
                  key={type}
                  variant={count > 0 ? "default" : "secondary"}
                  className="flex items-center gap-1"
                >
                  {getEntityIcon(type)}
                  {type} ({count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Context Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="entities">Entity Details</TabsTrigger>
          {summary?.availableEntityTypes.map(type => (
            <TabsTrigger key={type} value={type.toLowerCase()}>
              {type}s
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Project Context Overview</CardTitle>
              <CardDescription>
                Comprehensive semantic context from the ADPA Playbook Development project
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {context ? formatContextText(context.context) : (
                  <p className="text-muted-foreground">No context available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entities">
          <div className="grid gap-4">
            {summary?.availableEntityTypes.map(type => (
              <Card key={type}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getEntityIcon(type)}
                    {type}s
                  </CardTitle>
                  <CardDescription>
                    {summary.entityAvailability[type]} {type.toLowerCase()}(s) found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm max-w-none">
                    {entityContexts[type] ? (
                      formatContextText(entityContexts[type].context)
                    ) : (
                      <p className="text-muted-foreground">No {type.toLowerCase()} context available</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {summary?.availableEntityTypes.map(type => (
          <TabsContent key={type} value={type.toLowerCase()}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getEntityIcon(type)}
                  {type}s
                </CardTitle>
                <CardDescription>
                  Detailed {type.toLowerCase()} information from the ADPA Playbook project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {entityContexts[type] ? (
                    formatContextText(entityContexts[type].context)
                  ) : (
                    <p className="text-muted-foreground">No {type.toLowerCase()} context available</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
