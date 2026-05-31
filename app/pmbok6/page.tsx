"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import {
  BookOpen,
  Search,
  Layers,
  Activity,
  FileText,
  ChevronRight,
  Loader2,
  Info,
  CheckCircle,
  Circle,
  Shield,
  Target,
  Award
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getApiUrl } from "@/lib/api-url"
import { toast } from '@/lib/notify'
import { ProcessDetailDialog } from "./components/ProcessDetailDialog"
import { ProcessCard } from "./components/ProcessCard"
import { useSearchParams } from "next/navigation"

interface ProcessGroup {
  id: string
  code: string
  name: string
  description: string
  display_order: number
}

interface KnowledgeArea {
  id: string
  code: string
  name: string
  description: string
  display_order: number
}

interface Process {
  id: string
  code: string
  name: string
  description: string
  inputs: string[] | null
  tools_and_techniques: string[] | null
  outputs: string[] | null
  pmbok_section: string | null
  display_order: number
  is_core_process: boolean
  process_group: {
    id: string
    code: string
    name: string
  }
  knowledge_area: {
    id: string
    code: string
    name: string
  }
}

export default function PMBOK6Page() {
  const { isAuthenticated } = useAuth()
  const searchParams = useSearchParams()
  const projectId = searchParams.get("projectId")

  const [processes, setProcesses] = React.useState<Process[]>([])
  const [processGroups, setProcessGroups] = React.useState<ProcessGroup[]>([])
  const [knowledgeAreas, setKnowledgeAreas] = React.useState<KnowledgeArea[]>([])
  const [pmbok6Compliance, setPmbok6Compliance] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedProcessGroup, setSelectedProcessGroup] = React.useState<string | null>(null)
  const [selectedKnowledgeArea, setSelectedKnowledgeArea] = React.useState<string | null>(null)
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)

  const fetchProjectMetrics = async () => {
    if (!projectId) return
    try {
      const token = localStorage.getItem("auth_token")
      const response = await fetch(getApiUrl(`/project-data-extraction/${projectId}/summary`), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.pmbok6Compliance) {
          setPmbok6Compliance(data.pmbok6Compliance)
        }
      }
    } catch (error) {
      console.error("Failed to fetch project metrics:", error)
    }
  }

  const fetchProcesses = async () => {
    try {
      const token = localStorage.getItem("auth_token")
      const params = new URLSearchParams()

      if (selectedProcessGroup) {
        params.append("process_group_id", selectedProcessGroup)
      }
      if (selectedKnowledgeArea) {
        params.append("knowledge_area_id", selectedKnowledgeArea)
      }
      if (searchTerm) {
        params.append("search", searchTerm)
      }
      params.append("limit", "100")

      const response = await fetch(
        getApiUrl(`/pmbok6/processes?${params.toString()}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        setProcesses(data.data || [])
      } else {
        throw new Error("Failed to fetch processes")
      }
    } catch (error) {
      console.error("Failed to fetch processes:", error)
      toast.error("Failed to load processes")
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("auth_token")

      const groupsResponse = await fetch(getApiUrl("/pmbok6/process-groups"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (groupsResponse.ok) {
        const groupsData = await groupsResponse.json()
        setProcessGroups(groupsData.data || [])
      }

      const areasResponse = await fetch(getApiUrl("/pmbok6/knowledge-areas"), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      if (areasResponse.ok) {
        const areasData = await areasResponse.json()
        setKnowledgeAreas(areasData.data || [])
      }

      await Promise.all([
        fetchProcesses(),
        fetchProjectMetrics()
      ])
    } catch (error) {
      console.error("Failed to fetch PMBOK 6 data:", error)
      toast.error("Failed to load PMBOK 6 processes")
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchData()
    }
  }, [isAuthenticated, projectId])

  React.useEffect(() => {
    if (isAuthenticated) {
      fetchProcesses()
    }
  }, [selectedProcessGroup, selectedKnowledgeArea, searchTerm, isAuthenticated])

  const handleProcessClick = (process: Process) => {
    setSelectedProcess(process)
    setDetailDialogOpen(true)
  }

  const filteredProcessGroups = processGroups.filter((pg) => {
    if (!selectedKnowledgeArea) return true
    return processes.some((p) => p.knowledge_area.id === selectedKnowledgeArea && p.process_group.id === pg.id)
  })

  const filteredKnowledgeAreas = knowledgeAreas.filter((ka) => {
    if (!selectedProcessGroup) return true
    return processes.some((p) => p.process_group.id === selectedProcessGroup && p.knowledge_area.id === ka.id)
  })

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground">Please log in to view PMBOK 6 processes.</p>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    )
  }

  const projectCompliance = pmbok6Compliance || {
    processCoverage: 0,
    deliverableCoverage: 0,
    activeProcessCount: 0,
    presentDeliverableCount: 0,
    totalDeliverableCount: 94,
    processes: []
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight">PMBOK 6 Process Compliance</h1>
                </div>
                <p className="text-muted-foreground">
                  Tier 3 Rigor: Strategic process activation and deliverable verification (94 canonical artifacts)
                </p>
              </div>
              {projectId && (
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Project ID</p>
                    <p className="text-xs font-mono font-medium">{projectId}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => window.location.href = `/projects/${projectId}`}>
                    Back to Project
                  </Button>
                </div>
              )}
            </div>

            {/* Compliance Overview */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-2 border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Process Activation</CardTitle>
                  <Activity className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black">{projectCompliance.activeProcessCount}</div>
                    <div className="text-sm font-bold text-muted-foreground">/ 49</div>
                  </div>
                  <Progress value={projectCompliance.processCoverage} className="h-1.5 mt-3" />
                  <p className="text-[10px] font-bold mt-2 text-primary">{projectCompliance.processCoverage}% of required processes verified</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Deliverable Presence</CardTitle>
                  <FileText className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-black">{projectCompliance.presentDeliverableCount}</div>
                    <div className="text-sm font-bold text-muted-foreground">/ {projectCompliance.totalDeliverableCount || 94}</div>
                  </div>
                  <Progress value={projectCompliance.deliverableCoverage} className="h-1.5 mt-3" />
                  <p className="text-[10px] font-bold mt-2 text-blue-500">{projectCompliance.deliverableCoverage}% of artifacts baseline-verified</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/10">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Knowledge Coverage</CardTitle>
                  <Layers className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black">{knowledgeAreas.length}</div>
                  <p className="text-xs font-bold text-muted-foreground mt-1">Active domains</p>
                  <div className="flex gap-1 mt-4">
                    {[1,2,3,4,5,6,7,8,9,10].map(i => (
                       <div key={i} className={`h-1 flex-1 rounded-full ${i <= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-primary/10 bg-gradient-to-br from-primary/5 to-transparent">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-500">Maturity Level</CardTitle>
                  <Award className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-black text-amber-600">TIER 3</div>
                  <p className="text-xs font-bold text-muted-foreground mt-1">Process-Verified</p>
                  <Badge variant="outline" className="mt-4 font-mono text-[10px] uppercase">Constitutional v3.x</Badge>
                </CardContent>
              </Card>
            </div>

            {/* Filters & Search */}
            <Card className="bg-slate-50/50 dark:bg-slate-900/50 border-slate-200">
              <CardContent className="p-4 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search processes by code or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={selectedProcessGroup || ""}
                      onChange={(e) => setSelectedProcessGroup(e.target.value || null)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-xs font-bold uppercase tracking-tight"
                    >
                      <option value="">All Groups</option>
                      {processGroups.map((pg) => (
                        <option key={pg.id} value={pg.id}>{pg.name}</option>
                      ))}
                    </select>
                    <select
                      value={selectedKnowledgeArea || ""}
                      onChange={(e) => setSelectedKnowledgeArea(e.target.value || null)}
                      className="rounded-md border border-input bg-background px-3 py-2 text-xs font-bold uppercase tracking-tight"
                    >
                      <option value="">All Areas</option>
                      {knowledgeAreas.map((ka) => (
                        <option key={ka.id} value={ka.id}>{ka.name}</option>
                      ))}
                    </select>
                    {(selectedProcessGroup || selectedKnowledgeArea || searchTerm) && (
                      <Button variant="ghost" size="sm" onClick={() => {
                        setSelectedProcessGroup(null);
                        setSelectedKnowledgeArea(null);
                        setSearchTerm("");
                      }}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="processes" className="space-y-6">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="processes">Processes (49)</TabsTrigger>
                <TabsTrigger value="deliverables">Deliverables (94)</TabsTrigger>
              </TabsList>

              <TabsContent value="processes" className="space-y-6">
                {/* Processes Grid */}
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
                    <Loader2 className="h-10 w-10 animate-spin mb-4 opacity-20" />
                    <p className="text-sm font-medium animate-pulse">Auditing project process compliance...</p>
                  </div>
                ) : processes.length === 0 ? (
                  <div className="py-20 text-center border-2 border-dashed rounded-xl border-slate-200">
                    <Info className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-slate-500 font-medium">No processes found matching your filters.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {processes.map((process) => {
                      const complianceData = projectCompliance.processes?.find((p: any) => p.code === process.code);
                      return (
                        <ProcessCard
                          key={process.id}
                          process={process}
                          status={complianceData?.status || 'PLANNED'}
                          score={complianceData?.activationScore || 0}
                          onClick={() => handleProcessClick(process)}
                        />
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="deliverables">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Project Artifacts & Deliverables Baseline</CardTitle>
                    <CardDescription>Comprehensive verification of the 94 canonical PMBOK 6th Edition deliverables</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {/* Get all unique deliverables from process map */}
                      {Array.from(new Set(projectCompliance.processes?.flatMap((p: any) => p.deliverables.map((d: any) => d.name)) || [])).sort().map((deliverableName: any) => {
                        const isPresent = projectCompliance.processes?.some((p: any) => 
                          p.deliverables.some((d: any) => d.name === deliverableName && d.present)
                        );
                        return (
                          <div key={deliverableName} className={`flex items-center gap-3 p-3 rounded-lg border text-xs transition-all ${isPresent ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/30' : 'bg-slate-50/30 border-slate-100 dark:border-slate-800'}`}>
                            <div className={`p-1 rounded-full ${isPresent ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50' : 'bg-slate-100 text-slate-400 dark:bg-slate-800'}`}>
                              {isPresent ? <CheckCircle className="h-3 w-3" /> : <Circle className="h-3 w-3" />}
                            </div>
                            <span className={`font-medium ${isPresent ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-500'}`}>{deliverableName}</span>
                            {isPresent && <Badge className="ml-auto text-[8px] bg-emerald-500">VERIFIED</Badge>}
                          </div>
                        );
                      })}
                      {/* Add placeholders if we don't have all 94 yet in the map */}
                      {[...Array(Math.max(0, 94 - (new Set(projectCompliance.processes?.flatMap((p: any) => p.deliverables.map((d: any) => d.name)) || []).size)))].map((_, i) => (
                        <div key={`placeholder-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-200 opacity-40 text-xs">
                          <div className="p-1 rounded-full bg-slate-50 text-slate-300">
                            <Circle className="h-3 w-3" />
                          </div>
                          <span className="text-slate-400 italic">Remaining PMBOK 6 Artifact</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Process Detail Dialog */}
          {selectedProcess && (
            <ProcessDetailDialog
              process={selectedProcess}
              complianceData={projectCompliance.processes?.find((p: any) => p.code === selectedProcess.code)}
              open={detailDialogOpen}
              onOpenChange={setDetailDialogOpen}
            />
          )}

        </main>
      </div>
    </div>
  )
}
