"use client"

import * as React from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import {
  BookOpen,
  Search,
  Filter,
  Layers,
  FileText,
  ChevronRight,
  Loader2,
  Info,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { getApiUrl } from "@/lib/api-url"
import { toast } from '@/lib/notify'
import { ProcessDetailDialog } from "./components/ProcessDetailDialog"
import { ProcessCard } from "./components/ProcessCard"

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
  const [processes, setProcesses] = React.useState<Process[]>([])
  const [processGroups, setProcessGroups] = React.useState<ProcessGroup[]>([])
  const [knowledgeAreas, setKnowledgeAreas] = React.useState<KnowledgeArea[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedProcessGroup, setSelectedProcessGroup] = React.useState<string | null>(null)
  const [selectedKnowledgeArea, setSelectedKnowledgeArea] = React.useState<string | null>(null)
  const [selectedProcess, setSelectedProcess] = React.useState<Process | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = React.useState(false)

  fetchData()
}, [isAuthenticated])
if (!isAuthenticated) return

const fetchData = async () => {
  try {
    setLoading(true)
    const token = localStorage.getItem("auth_token")

    // Fetch process groups
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

    // Fetch knowledge areas
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

    // Fetch processes
    await fetchProcesses()
  } catch (error) {
    console.error("Failed to fetch PMBOK 6 data:", error)
    toast.error("Failed to load PMBOK 6 processes")
  } finally {
    setLoading(false)
  }
}

fetchData()
  }, [isAuthenticated])

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
  return processes.some((p) => p.process_group.id === pg.id)
})

const filteredKnowledgeAreas = knowledgeAreas.filter((ka) => {
  if (!selectedProcessGroup) return true
  return processes.some((p) => p.knowledge_area.id === ka.id)
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

return (
  <div className="flex h-screen bg-background">
    <Sidebar />
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <BookOpen className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">PMBOK 6th Edition Process Library</h1>
                <p className="text-muted-foreground">
                  Reference guide for all 49 PMBOK 6th Edition processes
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Processes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processes.length}</div>
                <p className="text-xs text-muted-foreground">PMBOK 6th Edition</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Process Groups</CardTitle>
                <Layers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{processGroups.length}</div>
                <p className="text-xs text-muted-foreground">5 groups</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Knowledge Areas</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{knowledgeAreas.length}</div>
                <p className="text-xs text-muted-foreground">10 areas</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>Filter processes by group, knowledge area, or search</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search processes..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium mb-2 block">Process Group</label>
                  <select
                    value={selectedProcessGroup || ""}
                    onChange={(e) => setSelectedProcessGroup(e.target.value || null)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Process Groups</option>
                    {filteredProcessGroups.map((pg) => (
                      <option key={pg.id} value={pg.id}>
                        {pg.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Knowledge Area</label>
                  <select
                    value={selectedKnowledgeArea || ""}
                    onChange={(e) => setSelectedKnowledgeArea(e.target.value || null)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">All Knowledge Areas</option>
                    {filteredKnowledgeAreas.map((ka) => (
                      <option key={ka.id} value={ka.id}>
                        {ka.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(selectedProcessGroup || selectedKnowledgeArea || searchTerm) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedProcessGroup(null)
                    setSelectedKnowledgeArea(null)
                    setSearchTerm("")
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Processes Grid */}
          {loading ? (
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading processes...</span>
                </div>
              </CardContent>
            </Card>
          ) : processes.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <div className="text-center text-muted-foreground">
                  <Info className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No processes found matching your filters.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {processes.map((process) => (
                <ProcessCard
                  key={process.id}
                  process={process}
                  onClick={() => handleProcessClick(process)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Process Detail Dialog */}
        {selectedProcess && (
          <ProcessDetailDialog
            process={selectedProcess}
            open={detailDialogOpen}
            onOpenChange={setDetailDialogOpen}
          />
        )}
      </main>
    </div>
  </div>
)
}

