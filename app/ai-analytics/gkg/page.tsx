"use client"

import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { apiClient } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RefreshCw, Database, FileText, Layers, Lightbulb } from "@/components/ui/icons-shim"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"

interface GkgProjectSummary {
  projectId: string
  name: string
  unitCount: number
  documentCount: number
  entityTypes: string[]
}

interface TopDocumentForContext {
  documentId: string
  title: string
  projectId: string
  projectName: string
  unitCount: number
}

interface EntityTypeCount {
  entityType: string
  count: number
}

interface GkgSummaryResponse {
  status: string
  totalProjects: number
  totalDocuments: number
  totalUnits: number
  topProjects: GkgProjectSummary[]
  topDocumentsForContext?: TopDocumentForContext[]
  entityTypeCounts?: EntityTypeCount[]
}

export default function GkgAnalyticsPage() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [summary, setSummary] = useState<GkgSummaryResponse | null>(null)

  const loadSummary = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      const data = await apiClient.get<GkgSummaryResponse>("/gkg/summary")
      setSummary(data)
    } catch (error: any) {
      console.error("Failed to load GKG summary:", error)
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to load Governance Knowledge Graph summary"
      toast({
        title: "GKG summary error",
        description: message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void loadSummary(false)
  }, [])

  const formatNumber = (value: number | string | undefined | null) => {
    if (value === null || value === undefined) return "0"
    const num = typeof value === "number" ? value : Number(value) || 0
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
    return num.toString()
  }

  const isEmpty = !summary || (summary.totalProjects === 0 && summary.totalDocuments === 0 && summary.totalUnits === 0)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <PageTransition>
          <main className="flex-1 p-6 md:p-10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
                  <Database className="h-6 w-6" />
                  Governance Knowledge Graph
                </h1>
                <p className="text-muted-foreground mt-1">
                  High-level view of projects, documents, and semantic units indexed in Neo4j.
                </p>
              </div>
              <div className="flex items-center gap-2">
                {user && (
                  <Badge variant="outline" className="text-xs">
                    {user.email}
                  </Badge>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadSummary(true)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Refreshing
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </>
                  )}
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-muted-foreground">Loading GKG summary…</p>
                </div>
              </div>
            ) : isEmpty ? (
              <Card>
                <CardHeader>
                  <CardTitle>No GKG data yet</CardTitle>
                  <CardDescription>
                    Run an extraction and then use the GKG sync buttons on a project&apos;s Integrations tab to populate the graph.
                  </CardDescription>
                </CardHeader>
              </Card>
            ) : (
              <>
                {/* Overview cards */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Total projects in GKG</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-3xl font-bold">
                          {formatNumber(summary?.totalProjects)}
                        </div>
                      </div>
                      <Layers className="h-8 w-8 text-muted-foreground" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Documents indexed</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-3xl font-bold">
                          {formatNumber(summary?.totalDocuments)}
                        </div>
                      </div>
                      <FileText className="h-8 w-8 text-muted-foreground" />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardDescription>Semantic units</CardDescription>
                    </CardHeader>
                    <CardContent className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-3xl font-bold">
                          {formatNumber(summary?.totalUnits)}
                        </div>
                      </div>
                      <Database className="h-8 w-8 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </div>

                {/* Top projects table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top projects by semantic coverage</CardTitle>
                    <CardDescription>
                      Projects ordered by number of SemanticUnit nodes (requirements, risks, stakeholders, etc.).
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-4">Project</th>
                            <th className="py-2 pr-4">Semantic units</th>
                            <th className="py-2 pr-4">Documents</th>
                            <th className="py-2">Entity types</th>
                          </tr>
                        </thead>
                        <tbody>
                          {summary?.topProjects?.map((p) => (
                            <tr key={p.projectId} className="border-b last:border-0">
                              <td className="py-2 pr-4 align-top">
                                <div className="font-medium truncate max-w-xs" title={p.name}>
                                  {p.name}
                                </div>
                                <div className="text-xs text-muted-foreground font-mono truncate max-w-xs" title={p.projectId}>
                                  {p.projectId}
                                </div>
                              </td>
                              <td className="py-2 pr-4 align-top">
                                {formatNumber(p.unitCount)}
                              </td>
                              <td className="py-2 pr-4 align-top">
                                {formatNumber(p.documentCount)}
                              </td>
                              <td className="py-2 align-top">
                                <div className="flex flex-wrap gap-1">
                                  {p.entityTypes && p.entityTypes.length > 0 ? (
                                    p.entityTypes.map((t) => (
                                      <Badge key={t} variant="outline" className="text-xs">
                                        {t}
                                      </Badge>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Context for document generation */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    <h2 className="text-lg font-semibold">Context for document generation</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Use these widgets to choose the best sources for LLM context when a document is submitted for generation. Prioritize documents and entity types that give the model the most relevant, structured input.
                  </p>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Best source documents for LLM context</CardTitle>
                        <CardDescription>
                          Documents with the most linked semantic units. When generating a new document, supply context from these for richer, traceable output.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {summary?.topDocumentsForContext?.length ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                  <th className="py-2 pr-2">Document</th>
                                  <th className="py-2 pr-2">Project</th>
                                  <th className="py-2 text-right">Units</th>
                                </tr>
                              </thead>
                              <tbody>
                                {summary.topDocumentsForContext.map((d) => (
                                  <tr key={d.documentId} className="border-b last:border-0">
                                    <td className="py-2 pr-2">
                                      <span className="truncate max-w-[180px] block" title={String(d.title)}>
                                        {d.title ?? d.documentId}
                                      </span>
                                    </td>
                                    <td className="py-2 pr-2 text-muted-foreground truncate max-w-[120px]" title={String(d.projectName)}>
                                      {d.projectName}
                                    </td>
                                    <td className="py-2 text-right font-medium">{formatNumber(d.unitCount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No documents with extracted units yet. Run GKG sync on projects with extraction data.</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Entity types available for context</CardTitle>
                        <CardDescription>
                          Include these entity types in your context window when generating documents. More types = broader governance and traceability context.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {summary?.entityTypeCounts?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {summary.entityTypeCounts.map((e) => (
                              <Badge key={e.entityType} variant="secondary" className="text-xs">
                                {e.entityType}: {formatNumber(e.count)}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No entity types in GKG yet.</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-amber-500/30 bg-amber-500/5">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Context tips for document generation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 list-disc list-inside text-muted-foreground">
                        <li>Prioritize documents with 100+ semantic units when building the context window for generation.</li>
                        <li>Include Requirement, Risk, and Stakeholder entities for governance and charter-style documents.</li>
                        <li>Use the same project&apos;s documents first; add dependent projects if DEPENDS_ON edges exist.</li>
                        <li>Traceability: prefer units that have EXTRACTED_FROM links so the LLM can reference source documents.</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </main>
        </PageTransition>
      </div>
    </div>
  )
}

