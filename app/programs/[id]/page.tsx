"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { apiClient, Program, ProgramMetrics, Project } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { toast } from "sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FolderOpen,
  FileText,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  MoreHorizontal,
  TrendingUp,
  Target,
  BarChart3,
  Loader2,
  Settings,
  Archive,
  AlertTriangle,
} from "@/components/ui/icons-shim"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function ProgramDetailPage() {
  const params = useParams()
  const programId = params?.id as string
  const { isAuthenticated, user } = useAuth()

  const [program, setProgram] = useState<Program | null>(null)
  const [metrics, setMetrics] = useState<ProgramMetrics | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "green" as 'green' | 'amber' | 'red',
    start_date: "",
    end_date: "",
    budget: "",
    currency: "USD",
  })

  // Fetch program data
  const fetchProgram = async () => {
    try {
      setLoading(true)
      const data = await apiClient.request<Program>(`/programs/${programId}`)
      setProgram(data)
      setEditForm({
        name: data.name || "",
        description: data.description || "",
        status: data.status || "green",
        start_date: data.start_date || "",
        end_date: data.end_date || "",
        budget: data.budget?.toString() || "",
        currency: data.currency || "USD",
      })
    } catch (error) {
      console.error("Failed to fetch program:", error)
      toast.error("Failed to load program details")
    } finally {
      setLoading(false)
    }
  }

  // Fetch program metrics
  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true)
      const data = await apiClient.request<ProgramMetrics>(`/programs/${programId}/metrics`)
      setMetrics(data)
    } catch (error) {
      console.error("Failed to fetch metrics:", error)
      // Don't show error toast for metrics as they might not be available initially
    } finally {
      setMetricsLoading(false)
    }
  }

  // Fetch program projects
  const fetchProjects = async () => {
    try {
      setProjectsLoading(true)
      const data = await apiClient.request<{ projects: Project[] }>(`/programs/${programId}/projects`)
      setProjects(data.projects || [])
    } catch (error) {
      console.error("Failed to fetch projects:", error)
    } finally {
      setProjectsLoading(false)
    }
  }

  useEffect(() => {
    if (programId) {
      fetchProgram()
      fetchMetrics()
      fetchProjects()
    }
  }, [programId])

  // WebSocket real-time updates
  useEffect(() => {
    const socket = apiClient.getSocket()
    
    if (socket && programId) {
      socket.on('program:updated', (data: any) => {
        if (data.programId === programId) {
          fetchProgram()
          fetchMetrics()
          toast.success('Program updated')
        }
      })

      socket.on('program:status:changed', (data: any) => {
        if (data.programId === programId) {
          fetchProgram()
          toast.info(`Program status changed to ${data.status}`)
        }
      })

      socket.on('program:project:added', (data: any) => {
        if (data.programId === programId) {
          fetchProjects()
          fetchMetrics()
          toast.success('Project added to program')
        }
      })

      return () => {
        socket.off('program:updated')
        socket.off('program:status:changed')
        socket.off('program:project:added')
      }
    }
  }, [programId])

  const handleUpdateProgram = async () => {
    try {
      setUpdating(true)
      await apiClient.request(`/programs/${programId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          status: editForm.status,
          start_date: editForm.start_date || null,
          end_date: editForm.end_date || null,
          budget: editForm.budget ? parseFloat(editForm.budget) : null,
          currency: editForm.currency,
        })
      })
      toast.success('Program updated successfully')
      setEditDialogOpen(false)
      await fetchProgram()
    } catch (error: any) {
      console.error('Failed to update program:', error)
      toast.error(error?.message || 'Failed to update program')
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteProgram = async () => {
    try {
      setDeleting(true)
      await apiClient.request(`/programs/${programId}`, {
        method: 'DELETE'
      })
      toast.success('Program deleted successfully')
      setDeleteDialogOpen(false)
      // Redirect to programs list
      window.location.href = '/programs'
    } catch (error: any) {
      console.error('Failed to delete program:', error)
      toast.error(error?.message || 'Failed to delete program')
    } finally {
      setDeleting(false)
    }
  }

  if (loading || !program) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-8">
            <div className="container mx-auto space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  // RAG status configuration
  const ragConfig = {
    green: { 
      emoji: '🟢', 
      label: 'GREEN', 
      variant: 'default' as const,
      className: 'bg-green-100 text-green-800 border-green-300'
    },
    amber: { 
      emoji: '🟡', 
      label: 'AMBER', 
      variant: 'secondary' as const,
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    },
    red: { 
      emoji: '🔴', 
      label: 'RED', 
      variant: 'destructive' as const,
      className: 'bg-red-100 text-red-800 border-red-300'
    },
  }

  const statusInfo = ragConfig[program.status]

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8">
          <div className="container mx-auto space-y-6">
            {/* Breadcrumb and Header */}
            <div>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/programs">Programs</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{program.name}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              {/* Program Header */}
              <div className="mt-4 flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">{program.name}</h1>
                    {/* RAG Status Badge - Large and Prominent */}
                    <Badge className={`text-lg px-4 py-2 border-2 ${statusInfo.className}`}>
                      {statusInfo.emoji} {statusInfo.label}
                    </Badge>
                  </div>
                  {program.description && (
                    <p className="text-muted-foreground max-w-3xl">{program.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(true)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Archive className="h-4 w-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Budget Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    Budget
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : metrics ? (
                    <>
                      <div className="text-3xl font-bold">
                        ${metrics.budget.spent.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        of ${metrics.budget.total.toLocaleString()}
                      </div>
                      <Progress value={metrics.budget.percentSpent} className="mt-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        ${metrics.budget.remaining.toLocaleString()} remaining
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No budget data</div>
                  )}
                </CardContent>
              </Card>

              {/* Schedule Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : metrics ? (
                    <>
                      <div className="text-sm space-y-1">
                        <div>Start: {new Date(metrics.schedule.startDate).toLocaleDateString()}</div>
                        <div>End: {new Date(metrics.schedule.endDate).toLocaleDateString()}</div>
                      </div>
                      <Progress value={metrics.schedule.percentComplete} className="mt-2" />
                      <div className="text-xs text-muted-foreground mt-1">
                        {metrics.schedule.daysElapsed} days elapsed, {metrics.schedule.daysRemaining} remaining
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No schedule data</div>
                  )}
                </CardContent>
              </Card>

              {/* Projects Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-purple-600" />
                    Projects
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : metrics ? (
                    <>
                      <div className="text-3xl font-bold">{metrics.projects.total}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          {metrics.projects.green} Green
                        </Badge>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          {metrics.projects.amber} Amber
                        </Badge>
                        <Badge variant="destructive" className="bg-red-100 text-red-800">
                          {metrics.projects.red} Red
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No project data</div>
                  )}
                </CardContent>
              </Card>

              {/* Risks Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    Risks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : metrics ? (
                    <>
                      <div className="text-3xl font-bold">{metrics.risks.total}</div>
                      <div className="text-xs space-y-1 mt-2">
                        <div className="flex justify-between">
                          <span className="text-red-600">Critical:</span>
                          <span className="font-semibold">{metrics.risks.critical}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-orange-600">High:</span>
                          <span className="font-semibold">{metrics.risks.high}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-600">Medium:</span>
                          <span className="font-semibold">{metrics.risks.medium}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-600">Low:</span>
                          <span className="font-semibold">{metrics.risks.low}</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No risk data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Program Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        Program Description
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {program.description ? (
                        <div className="prose prose-sm max-w-none">
                          <p>{program.description}</p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No description available</p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Owner and Stakeholders */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Owner & Stakeholders
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{program.owner_name || 'Not assigned'}</p>
                            <p className="text-xs text-muted-foreground">Program Owner</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Milestones */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Key Milestones
                      </CardTitle>
                      <CardDescription>Next 3 upcoming milestones</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No milestones defined
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>Last 10 activities</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground text-center py-4">
                        No recent activity
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Program Projects</h2>
                    <p className="text-muted-foreground">
                      All projects associated with this program
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Existing Project
                    </Button>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create New Project
                    </Button>
                  </div>
                </div>

                {projectsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading projects...</span>
                  </div>
                ) : projects.length > 0 ? (
                  <Card>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Timeline</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {projects.map((project) => (
                          <TableRow key={project.id}>
                            <TableCell className="font-medium">
                              <Link 
                                href={`/projects/${project.id}`}
                                className="hover:underline"
                              >
                                {project.name}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                project.status === 'active' ? 'default' : 'secondary'
                              }>
                                {project.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {project.budget ? `$${project.budget.toLocaleString()}` : 'N/A'}
                            </TableCell>
                            <TableCell>
                              {project.start_date && project.end_date ? (
                                <div className="text-sm">
                                  {new Date(project.start_date).toLocaleDateString()} - {new Date(project.end_date).toLocaleDateString()}
                                </div>
                              ) : (
                                'Not set'
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={50} className="w-20" />
                                <span className="text-sm">50%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                asChild
                              >
                                <Link href={`/projects/${project.id}`}>
                                  View
                                </Link>
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No projects found</h3>
                      <p className="text-muted-foreground mb-4">
                        Start by adding existing projects or creating new ones
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Existing Project
                        </Button>
                        <Button variant="outline">
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Project
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Reports Tab */}
              <TabsContent value="reports" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Program Reports
                    </CardTitle>
                    <CardDescription>
                      Board reports, status updates, and program analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-8">
                      No reports available
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Settings Tab */}
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5 text-primary" />
                      Program Settings
                    </CardTitle>
                    <CardDescription>
                      Configure program settings and access control
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Settings configuration coming soon
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Edit Program Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Program</DialogTitle>
            <DialogDescription>
              Update program information and settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Program Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter program name"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter program description"
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="status">RAG Status</Label>
                <select
                  id="status"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as 'green' | 'amber' | 'red' })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="green">🟢 Green</option>
                  <option value="amber">🟡 Amber</option>
                  <option value="red">🔴 Red</option>
                </select>
              </div>
              <div>
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                  placeholder="Enter budget amount"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={editForm.start_date}
                  onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={updating}>
              Cancel
            </Button>
            <Button onClick={handleUpdateProgram} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Program'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Program Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Program</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProgram} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete Program'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
