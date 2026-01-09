"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { ArrowUpRight, Search, Plus, FileText, BarChart3 } from "lucide-react"
import { Target } from "@/components/ui/icons-shim"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from "recharts"

interface PortfolioMetrics {
  totalValue: number
  valueChange: number
  programCount: { total: number; green: number; amber: number; red: number }
  totalInvestment: number
  resourceUtilization: number
}

interface OKR {
  objective: string
  quarter: string
  keyResults: Array<{
    name: string
    current: number
    target: number
    unit: string
  }>
  confidence: string
  owner: string
  dueDate: string
}

interface Program {
  id: string
  name: string
  description?: string
  status: 'green' | 'amber' | 'red'
  budget?: number
  project_count?: number
  health?: number
  priority?: number
  owner_name?: string
}

interface ProjectRanking {
  project_id: string
  project_name: string
  program_id?: string | null
  program_name?: string | null
  total_score: number
  rank: number
  priority_tier: 'Critical' | 'High' | 'Medium' | 'Low'
  criteria_count: number
  last_scored_at?: string | null
}

export default function PortfolioDashboard() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [projectRankings, setProjectRankings] = useState<ProjectRanking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  // Calculate portfolio metrics from programs
  const portfolioMetrics: PortfolioMetrics = {
    totalValue: programs.reduce((sum, p) => sum + (p.budget || 0), 0) * 2, // 2x budget as value estimate
    valueChange: 12, // TODO: Calculate from historical data
    programCount: {
      total: programs.length,
      green: programs.filter(p => p.status === 'green').length,
      amber: programs.filter(p => p.status === 'amber').length,
      red: programs.filter(p => p.status === 'red').length,
    },
    totalInvestment: programs.reduce((sum, p) => sum + (p.budget || 0), 0),
    resourceUtilization: 82, // TODO: Calculate from actual resource data
  }

  // Sample OKRs (TODO: Fetch from API in Week 9)
  const okrs: OKR[] = [
    {
      objective: "Scale Customer Base",
      quarter: "Q4 2025",
      keyResults: [
        { name: "Reach 10k customers", current: 7500, target: 10000, unit: "customers" },
        { name: "Achieve 95% CSAT", current: 92, target: 95, unit: "%" },
        { name: "$50M ARR", current: 38, target: 50, unit: "$M" },
      ],
      confidence: "high",
      owner: "CEO",
      dueDate: "Dec 31, 2025",
    },
  ]

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
      return
    }

    if (isAuthenticated) {
      void fetchPrograms()
      void fetchProjectRankings()
    }
  }, [isAuthenticated, authLoading, router])

  const fetchProjectRankings = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean
        data: ProjectRanking[]
        pagination: { total: number }
      }>('/prioritization/rankings?limit=1000')

      if (response && response.success && response.data) {
        setProjectRankings(response.data)
      } else {
        setProjectRankings([])
      }
    } catch (error) {
      console.error('Failed to fetch project rankings:', error)
      setProjectRankings([]) // Ensure state is reset on error
      // Don't show error toast - rankings might not be available yet
    }
  }

  const fetchPrograms = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs?limit=1000`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch programs')

      const data = await response.json()
      setPrograms(data.data || [])
    } catch (error) {
      console.error('Failed to fetch programs:', error)
      toast.error('Failed to load programs')
    } finally {
      setLoading(false)
    }
  }

  const filteredPrograms = programs.filter((program) =>
    program.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const sortedPrograms = [...filteredPrograms].sort((a, b) => {
    if (!sortColumn) return 0
    const aValue = a[sortColumn as keyof Program]
    const bValue = b[sortColumn as keyof Program]
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortDirection === "asc" ? aValue - bValue : bValue - aValue
    }
    return 0
  })

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

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

  // Prepare data for charts
  const budgetAllocation = programs.map((p, idx) => ({
    name: p.name,
    value: p.budget || 0,
    color: ['#16a34a', '#d97706', '#dc2626', '#2563eb', '#8b5cf6'][idx % 5]
  }))

  const prioritizationData = programs.map(p => ({
    name: p.name,
    strategic: (p.priority || 2.5) * 20, // Convert 0-5 score to 0-100
    value: (p.health || 50),
    budget: p.budget || 1000000,
    health: p.health || 50,
    status: p.status
  }))

  // Sample investment timeline (TODO: Get from financial data)
  const investmentTimeline = [
    { quarter: "Q1 24", baseline: 5000000, actual: 5200000 },
    { quarter: "Q2 24", baseline: 10000000, actual: 9800000 },
    { quarter: "Q3 24", baseline: 15000000, actual: 15500000 },
    { quarter: "Q4 24", baseline: 20000000, actual: 19200000 },
    { quarter: "Q1 25", baseline: portfolioMetrics.totalInvestment, actual: portfolioMetrics.totalInvestment },
  ]

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading portfolio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          {/* Header */}
          <header className="border-b border-border bg-card">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Portfolio Command Center</h1>
                  <p className="text-sm text-muted-foreground mt-1">Dashboard / Portfolio</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => router.push('/portfolio/prioritize')}>
                    <Target className="h-4 w-4 mr-2" />
                    Prioritize Projects
                  </Button>
                  <Button variant="outline" onClick={() => router.push('/portfolio/okrs')}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    OKRs
                  </Button>
                  <Button variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export Report
                  </Button>
                  <Button onClick={() => router.push('/programs?action=new')}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Program
                  </Button>
                </div>
              </div>
            </div>
          </header>

          <div className="container mx-auto px-6 py-8 space-y-8">
            {/* Strategic KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    ${(portfolioMetrics.totalValue / 1000000).toFixed(0)}M
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+{portfolioMetrics.valueChange}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Programs Health</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">{portfolioMetrics.programCount.total}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span>🟢 {portfolioMetrics.programCount.green}</span>
                    <span>🟡 {portfolioMetrics.programCount.amber}</span>
                    <span>🔴 {portfolioMetrics.programCount.red}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Investment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">
                    ${(portfolioMetrics.totalInvestment / 1000000).toFixed(1)}M
                  </div>
                  <p className="text-sm text-muted-foreground">Across {portfolioMetrics.programCount.total} programs</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Resource Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground mb-2">{portfolioMetrics.resourceUtilization}%</div>
                  <Progress value={portfolioMetrics.resourceUtilization} className="h-2 mt-2" />
                </CardContent>
              </Card>
            </div>

            {/* OKRs & Strategic Goals */}
            <Card>
              <CardHeader>
                <CardTitle>OKRs & Strategic Goals</CardTitle>
                <CardDescription>Quarterly objectives and key results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {okrs.map((okr, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          🎯 Objective: {okr.objective} ({okr.quarter})
                        </h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Confidence: 🟢 {okr.confidence}</span>
                        <span>Owner: {okr.owner}</span>
                        <span>Due: {okr.dueDate}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {okr.keyResults.map((kr, krIdx) => (
                        <div key={krIdx}>
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-foreground">○ {kr.name}</span>
                            <span className="text-muted-foreground">
                              {kr.current.toLocaleString()} / {kr.target.toLocaleString()} {kr.unit}
                            </span>
                          </div>
                          <Progress value={(kr.current / kr.target) * 100} className="h-2" />
                          <p className="text-xs text-muted-foreground mt-1">
                            {Math.round((kr.current / kr.target) * 100)}% complete
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Prioritization Matrix */}
            <Card>
              <CardHeader>
                <CardTitle>Program Prioritization Matrix</CardTitle>
                <CardDescription>
                  Strategic Alignment vs Value Contribution (bubble size = budget, color = health)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      type="number"
                      dataKey="strategic"
                      name="Strategic Alignment"
                      domain={[0, 100]}
                      className="stroke-muted-foreground"
                      label={{ value: "Strategic Alignment →", position: "bottom", offset: 0 }}
                    />
                    <YAxis
                      type="number"
                      dataKey="value"
                      name="Value Contribution"
                      domain={[0, 100]}
                      className="stroke-muted-foreground"
                      label={{ value: "Value Contribution ↑", angle: -90, position: "left" }}
                    />
                    <ZAxis type="number" dataKey="budget" range={[400, 2000]} />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as typeof prioritizationData[0]
                          return (
                            <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                              <p className="font-semibold text-foreground">{data.name}</p>
                              <p className="text-sm text-muted-foreground">Strategic: {data.strategic}%</p>
                              <p className="text-sm text-muted-foreground">Value: {data.value}%</p>
                              <p className="text-sm text-muted-foreground">
                                Budget: ${(data.budget / 1000000).toFixed(1)}M
                              </p>
                              <p className="text-sm text-muted-foreground">Health: {data.health}%</p>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Scatter name="Programs" data={prioritizationData}>
                      {prioritizationData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.status === "green" ? "#16a34a" : entry.status === "amber" ? "#d97706" : "#dc2626"}
                          className="cursor-pointer hover:opacity-80"
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p>Criteria Weights: Strategic Alignment: 30% | Value Contribution: 25% | Risk: 15% | Resource: 20% | Urgency: 10%</p>
                </div>
              </CardContent>
            </Card>

            {/* Project Prioritization Scatter Plot */}
            {projectRankings.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Project Prioritization Matrix</CardTitle>
                  <CardDescription>
                    Total Score vs Rank (bubble size = criteria count, color = priority tier)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis
                        type="number"
                        dataKey="total_score"
                        name="Total Score"
                        domain={[0, 5]}
                        className="stroke-muted-foreground"
                        label={{ value: "Total Priority Score →", position: "bottom", offset: 10 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="rank"
                        name="Rank"
                        domain={(dataMin: number, dataMax: number) => [Math.max(0, dataMin - 1), dataMax + 1]}
                        reversed
                        className="stroke-muted-foreground"
                        label={{ value: "Rank ↑", angle: -90, position: "left", offset: 10 }}
                      />
                      <ZAxis type="number" dataKey="criteria_count" range={[200, 1000]} />
                      <Tooltip
                        cursor={{ strokeDasharray: "3 3" }}
                        content={({ active, payload }: any) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload as ProjectRanking & { criteria_count: number }
                            return (
                              <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
                                <p className="font-semibold text-foreground">{data.project_name}</p>
                                {data.program_name && (
                                  <p className="text-sm text-muted-foreground">Program: {data.program_name}</p>
                                )}
                                <p className="text-sm text-muted-foreground">Total Score: {parseFloat(String(data.total_score || 0)).toFixed(2)}</p>
                                <p className="text-sm text-muted-foreground">Rank: #{data.rank}</p>
                                <p className="text-sm text-muted-foreground">Priority Tier: {data.priority_tier}</p>
                                <p className="text-sm text-muted-foreground">Criteria Count: {data.criteria_count}</p>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Scatter name="Projects" data={projectRankings.map(r => ({
                        ...r,
                        total_score: parseFloat(String(r.total_score || 0)),
                        criteria_count: r.criteria_count || 0
                      }))}>
                        {projectRankings.map((entry, index) => {
                          const colorMap = {
                            'Critical': '#dc2626',
                            'High': '#f97316',
                            'Medium': '#eab308',
                            'Low': '#22c55e'
                          }
                          return (
                            <Cell
                              key={`cell-${index}`}
                              fill={colorMap[entry.priority_tier] || '#94a3b8'}
                              className="cursor-pointer hover:opacity-80"
                            />
                          )
                        })}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Programs Overview Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Programs Overview</CardTitle>
                    <CardDescription>All active programs in the portfolio</CardDescription>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search programs..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Program Name</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                        <th
                          className="text-left p-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => handleSort("budget")}
                        >
                          Budget {sortColumn === "budget" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th
                          className="text-left p-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => handleSort("project_count")}
                        >
                          Projects {sortColumn === "project_count" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th
                          className="text-left p-3 text-sm font-medium text-muted-foreground cursor-pointer hover:text-foreground"
                          onClick={() => handleSort("health")}
                        >
                          Health Score {sortColumn === "health" && (sortDirection === "asc" ? "↑" : "↓")}
                        </th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Owner</th>
                        <th className="text-right p-3 text-sm font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPrograms.map((program) => (
                        <tr key={program.id} className="border-t border-border hover:bg-muted/50 cursor-pointer">
                          <td className="p-3">
                            <button
                              onClick={() => router.push(`/programs/${program.id}`)}
                              className="font-medium text-foreground hover:text-primary hover:underline text-left"
                            >
                              {program.name}
                            </button>
                          </td>
                          <td className="p-3">
                            <Badge className={getStatusColor(program.status)}>
                              {getStatusIcon(program.status)} {program.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-3 text-foreground">
                            ${program.budget ? (program.budget / 1000000).toFixed(1) : '0.0'}M
                          </td>
                          <td className="p-3 text-foreground">{program.project_count || 0}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Progress value={program.health || 50} className="h-2 w-20" />
                              <span className="text-sm text-foreground">{program.health || 50}%</span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{program.owner_name || 'Unassigned'}</td>
                          <td className="p-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => router.push(`/programs/${program.id}`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Financial Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Budget by Program</CardTitle>
                  <CardDescription>Budget allocation across programs</CardDescription>
                </CardHeader>
                <CardContent>
                  {budgetAllocation.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={budgetAllocation}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {budgetAllocation.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => `$${(value / 1000000).toFixed(1)}M`}
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No budget data available
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Investment Timeline</CardTitle>
                  <CardDescription>Baseline vs actual spending over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={investmentTimeline}>
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
                      <Area
                        type="monotone"
                        dataKey="baseline"
                        stackId="1"
                        stroke="#94a3b8"
                        fill="#94a3b8"
                        fillOpacity={0.3}
                        name="Baseline"
                      />
                      <Area
                        type="monotone"
                        dataKey="actual"
                        stackId="2"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.6}
                        name="Actual"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Risk & Compliance Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle>Risk & Compliance Dashboard</CardTitle>
                <CardDescription>Portfolio-wide risks and compliance status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Portfolio Risks</h4>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">23 Total</span>
                    <Badge className="bg-red-100 text-red-800 border-red-300">5 Critical</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">12 High</Badge>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-300">6 Medium</Badge>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">EU Compliance Status</h4>
                  <div className="flex items-center gap-3 text-sm">
                    <Badge className="bg-green-100 text-green-800 border-green-300">✓ AI Act</Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-300">✓ CSRD</Badge>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">⚠ NIS2</Badge>
                    <Badge className="bg-green-100 text-green-800 border-green-300">✓ DORA</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

