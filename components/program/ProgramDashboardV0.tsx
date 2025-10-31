"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Calendar, DollarSign, Search, FileText } from "lucide-react"
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { toast } from "sonner"

interface ProgramDashboardV0Props {
  programId: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: 'green' | 'amber' | 'red'
  budget?: number
  progress?: number
  document_count?: number
  owner_name?: string
}

interface ProgramData {
  id: string
  name: string
  description?: string
  status: 'green' | 'amber' | 'red'
  owner_name?: string
  budget?: number
  start_date?: string
  end_date?: string
}

export default function ProgramDashboardV0({ programId }: ProgramDashboardV0Props) {
  const router = useRouter()
  const [program, setProgram] = useState<ProgramData | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    void fetchProgramData()
    void fetchProjects()
  }, [programId])

  const fetchProgramData = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch program')
      
      const data = await response.json()
      setProgram(data.data)
    } catch (error) {
      console.error('Failed to fetch program:', error)
      toast.error('Failed to load program data')
    }
  }

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${programId}/projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch projects')
      
      const data = await response.json()
      setProjects(data.data || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      toast.error('Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sample health data (TODO: Fetch from API in Week 4)
  const health = {
    benefitsRealized: { value: 75, target: 80, status: "green" as const, label: "On Track" },
    riskStatus: { value: "Medium", count: 5, status: "amber" as const, label: "Monitor" },
    resourceUtilization: { value: 82, target: 85, status: "green" as const, label: "Efficient" },
    scheduleAdherence: { value: 90, target: 95, status: "green" as const, label: "On Schedule" },
    stakeholderSatisfaction: { value: 88, target: 90, status: "green" as const, label: "Positive" },
  }

  // Sample financial data (TODO: Implement in Week 1-2)
  const financial = {
    totalBudget: program?.budget || 5000000,
    allocated: (program?.budget || 5000000) * 0.72,
    remaining: (program?.budget || 5000000) * 0.28,
    evm: {
      pv: 3000000,
      ev: 2400000,
      ac: 2400000,
      cpi: 1.0,
      spi: 0.8,
      eac: program?.budget || 5000000,
    },
  }

  // Sample forecast data
  const forecastData = [
    { quarter: "Q1", baseline: 1000000, actual: 1000000, forecast: null },
    { quarter: "Q2", baseline: 2000000, actual: 1800000, forecast: null },
    { quarter: "Q3", baseline: 3000000, actual: 2400000, forecast: null },
    { quarter: "Q4", baseline: 4000000, actual: null, forecast: 3200000 },
    { quarter: "Q1 26", baseline: 4500000, actual: null, forecast: 4200000 },
    { quarter: "Q2 26", baseline: financial.totalBudget, actual: null, forecast: financial.totalBudget },
  ]

  // Sample resource allocation (TODO: Implement in Week 3-4)
  const resourceAllocation = [
    { name: "John Doe", jan: 100, feb: 100, mar: 60, apr: 0, may: 0, jun: 0 },
    { name: "Jane Smith", jan: 0, feb: 100, mar: 100, apr: 100, may: 0, jun: 0 },
    { name: "Mike Chen", jan: 100, feb: 100, mar: 100, apr: 100, may: 100, jun: 100 },
  ]

  const skills = [
    { name: "JavaScript", count: 15 },
    { name: "Python", count: 8 },
    { name: "React", count: 12 },
    { name: "Node.js", count: 10 },
    { name: "DevOps", count: 5 },
    { name: "PM", count: 3 },
    { name: "UX Design", count: 4 },
    { name: "Data Science", count: 6 },
    { name: "Cloud Architecture", count: 7 },
    { name: "Security", count: 4 },
    { name: "QA", count: 8 },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-green-100 text-green-800 border-green-300"
      case "amber":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "red":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "green":
        return "🟢"
      case "amber":
        return "🟡"
      case "red":
        return "🔴"
      default:
        return "⚪"
    }
  }

  if (!program) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/portfolio')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Portfolio
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-2xl font-semibold text-foreground">{program.name}</h1>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    Status: {getStatusIcon(program.status)} On Track
                  </span>
                  <span>|</span>
                  <span>Owner: {program.owner_name || 'Unassigned'}</span>
                  <span>|</span>
                  <span>${program.budget ? (program.budget / 1000000).toFixed(1) : '0.0'}M Budget</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Health Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Benefits Realized</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">{health.benefitsRealized.value}%</div>
              <Badge className={getStatusColor(health.benefitsRealized.status)}>
                {health.benefitsRealized.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">Target: {health.benefitsRealized.target}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Risk Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">{health.riskStatus.value}</div>
              <Badge className={getStatusColor(health.riskStatus.status)}>{health.riskStatus.label}</Badge>
              <p className="text-xs text-muted-foreground mt-2">{health.riskStatus.count} High Risks</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resource Utilization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">{health.resourceUtilization.value}%</div>
              <Badge className={getStatusColor(health.resourceUtilization.status)}>
                {health.resourceUtilization.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">Target: {health.resourceUtilization.target}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Schedule Adherence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">{health.scheduleAdherence.value}%</div>
              <Badge className={getStatusColor(health.scheduleAdherence.status)}>
                {health.scheduleAdherence.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">Target: {health.scheduleAdherence.target}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Stakeholder Satisfaction</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground mb-2">{health.stakeholderSatisfaction.value}%</div>
              <Badge className={getStatusColor(health.stakeholderSatisfaction.status)}>
                {health.stakeholderSatisfaction.label}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">Target: {health.stakeholderSatisfaction.target}%</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            <TabsTrigger value="financial">💰 Financial</TabsTrigger>
            <TabsTrigger value="resources">👥 Resources</TabsTrigger>
            <TabsTrigger value="health">📊 Health</TabsTrigger>
            <TabsTrigger value="benefits">🎯 Benefits</TabsTrigger>
            <TabsTrigger value="risks">⚠️ Risks</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Program Summary</CardTitle>
                  <CardDescription>Key metrics and status overview</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total Projects</span>
                    <span className="text-lg font-semibold">{projects.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Budget Utilization</span>
                    <span className="text-lg font-semibold">72%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Overall Health</span>
                    <Badge className="bg-green-100 text-green-800 border-green-300">Healthy</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates and milestones</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Portal Migration completed Phase 2</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-yellow-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Risk identified in Analytics Platform</p>
                      <p className="text-xs text-muted-foreground">5 hours ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">New resource allocated to Mobile App</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Program Projects</CardTitle>
                    <CardDescription>All projects assigned to this program</CardDescription>
                  </div>
                  <Button onClick={() => router.push(`/programs/${programId}?tab=projects`)}>
                    + Assign Project
                  </Button>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search projects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredProjects.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No projects assigned to this program yet.</p>
                    <Button className="mt-4" onClick={() => router.push(`/programs/${programId}?tab=projects`)}>
                      Assign Projects
                    </Button>
                  </div>
                ) : (
                  filteredProjects.map((project) => (
                    <Card key={project.id} className="border-border">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">{project.name}</h3>
                                <span className="text-xl">{getStatusIcon(project.status)}</span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">{project.description || 'No description'}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => router.push(`/projects/${project.id}`)}
                            >
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              Remove
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {project.document_count || 0} documents
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            ${project.budget ? (project.budget / 1000000).toFixed(1) : '0.0'}M
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {project.progress || 0}% complete
                          </span>
                        </div>
                        <div className="mt-3">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Owner: {project.owner_name || 'Unassigned'}</span>
                            <span>{project.progress || 0}%</span>
                          </div>
                          <Progress value={project.progress || 0} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            {/* Budget Rollup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    ${(financial.totalBudget / 1000000).toFixed(1)}M
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Allocated</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    ${(financial.allocated / 1000000).toFixed(1)}M
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {financial.totalBudget > 0 ? Math.round((financial.allocated / financial.totalBudget) * 100) : 0}%
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Remaining</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    ${(financial.remaining / 1000000).toFixed(1)}M
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {financial.totalBudget > 0 ? Math.round((financial.remaining / financial.totalBudget) * 100) : 0}%
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="pt-6">
                <Progress value={financial.totalBudget > 0 ? (financial.allocated / financial.totalBudget) * 100 : 0} className="h-3" />
              </CardContent>
            </Card>

            {/* EVM Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Earned Value Management (EVM)</CardTitle>
                <CardDescription>Performance measurement metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">PV (Planned)</p>
                    <p className="text-2xl font-bold text-foreground">${(financial.evm.pv / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">EV (Earned)</p>
                    <p className="text-2xl font-bold text-foreground">${(financial.evm.ev / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">AC (Actual)</p>
                    <p className="text-2xl font-bold text-foreground">${(financial.evm.ac / 1000000).toFixed(1)}M</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">CPI</p>
                    <p className="text-2xl font-bold text-green-600">{financial.evm.cpi.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">On Budget</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">SPI</p>
                    <p className="text-2xl font-bold text-yellow-600">{financial.evm.spi.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Behind</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">EAC</p>
                    <p className="text-2xl font-bold text-foreground">${(financial.evm.eac / 1000000).toFixed(1)}M</p>
                    <p className="text-xs text-muted-foreground">Estimate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cost Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Cost Breakdown by Project</CardTitle>
                <CardDescription>Budget allocation and spending across projects</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projects.map((project) => {
                    const spent = (project.budget || 0) * ((project.progress || 0) / 100)
                    const total = project.budget || 0
                    return (
                      <div key={project.id}>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="font-medium text-foreground">{project.name}</span>
                          <span className="text-muted-foreground">
                            ${(spent / 1000000).toFixed(1)}M / ${(total / 1000000).toFixed(1)}M
                          </span>
                        </div>
                        <Progress value={total > 0 ? (spent / total) * 100 : 0} className="h-2" />
                      </div>
                    )
                  })}
                  {projects.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No projects assigned yet
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Forecast Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Forecast</CardTitle>
                <CardDescription>Baseline vs actual spending with forecast projection</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={forecastData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="quarter" className="stroke-muted-foreground" fontSize={12} />
                    <YAxis
                      className="stroke-muted-foreground"
                      fontSize={12}
                      tickFormatter={(value) => `$${value / 1000000}M`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => `$${(value / 1000000).toFixed(1)}M`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="baseline"
                      stroke="#94a3b8"
                      strokeWidth={2}
                      dot={false}
                      name="Baseline"
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Actual"
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Forecast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Resources Tab */}
          <TabsContent value="resources" className="space-y-6">
            {/* Capacity Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Total Capacity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-foreground mb-2">45 FTE</div>
                  <p className="text-sm text-muted-foreground">Available: 8 FTE</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Utilization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-2">
                    <Progress value={82} className="h-3" />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">82% Efficient</span>
                    <span className="text-muted-foreground">Target: 80-85%</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-2">Overallocated: 2 people</p>
                </CardContent>
              </Card>
            </div>

            {/* Skills Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Skills Matrix</CardTitle>
                <CardDescription>Available skills and team composition</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill.name} variant="secondary" className="text-sm px-3 py-1">
                      {skill.name} {skill.count}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Resource Allocation Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Allocation Timeline</CardTitle>
                <CardDescription>Team member allocation across months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-7 gap-2 text-xs font-medium text-muted-foreground">
                    <div>Name</div>
                    <div className="text-center">Jan</div>
                    <div className="text-center">Feb</div>
                    <div className="text-center">Mar</div>
                    <div className="text-center">Apr</div>
                    <div className="text-center">May</div>
                    <div className="text-center">Jun</div>
                  </div>
                  {resourceAllocation.map((resource) => (
                    <div key={resource.name} className="grid grid-cols-7 gap-2 items-center">
                      <div className="text-sm font-medium text-foreground">{resource.name}</div>
                      {[resource.jan, resource.feb, resource.mar, resource.apr, resource.may, resource.jun].map(
                        (value, idx) => (
                          <div key={idx} className="h-8 rounded bg-muted relative overflow-hidden">
                            {value > 0 && (
                              <div className="absolute inset-0 bg-primary" style={{ width: `${value}%` }} />
                            )}
                          </div>
                        ),
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Health Tab */}
          <TabsContent value="health" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Program Health Dashboard</CardTitle>
                <CardDescription>Comprehensive health metrics and indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Detailed health metrics and trend analysis coming in Week 4...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Benefits Tab */}
          <TabsContent value="benefits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Benefits Realization</CardTitle>
                <CardDescription>Tracking expected vs realized benefits</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Benefits tracking and realization metrics coming in Week 7...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Risks Tab */}
          <TabsContent value="risks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Management</CardTitle>
                <CardDescription>Program risks and mitigation strategies</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Risk register and mitigation plans coming in Week 5...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

