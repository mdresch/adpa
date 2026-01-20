"use client"

/**
 * Portfolio Prioritization Page
 * Portfolio-level prioritization across all programs and projects
 * 
 * Features:
 * - View project rankings across entire portfolio
 * - Score projects on criteria
 * - Pairwise comparison
 * - Filter and sort rankings
 * - Export rankings
 */

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ScoringInterface } from '@/components/program/ScoringInterface'
import { PairwiseComparisonMatrix } from '@/components/program/PairwiseComparisonMatrix'
import { RankingsTable } from '@/components/program/RankingsTable'
import { toast } from '@/lib/notify'
import { apiClient } from '@/lib/api'
import {
  BarChart3,
  Target,
  TrendingUp,
  Download,
  RefreshCw,
  ArrowLeft,
  Settings,
  Building2
} from 'lucide-react'
import Link from 'next/link'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts'

interface Ranking {
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

interface Project {
  id: string
  name: string
  description?: string
  status?: string
  framework?: string
  program_id?: string
}

export default function PortfolioPrioritizationPage() {
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    void fetchRankings()
    void fetchAllProjects()
  }, [])

  const fetchRankings = async () => {
    try {
      setRefreshing(true)
      const response = await apiClient.get<{
        success: boolean
        data: Ranking[]
        pagination: { total: number }
      }>('/prioritization/rankings') // No program_id filter = all projects

      if (response && response.success && response.data) {
        setRankings(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch rankings:', error)
      toast.error('Failed to load rankings')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const fetchAllProjects = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean
        projects: Project[]
        pagination: { total: number }
      }>('/projects?limit=1000')

      if (response && response.projects) {
        setProjects(response.projects)
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      // Don't show error toast - projects might not be required for rankings
    }
  }

  const handleScoreSaved = () => {
    void fetchRankings()
    setSelectedProjectId(null)
  }

  const handleExportRankings = async () => {
    try {
      // TODO: Implement export functionality
      toast.info('Export functionality coming soon')
    } catch (error) {
      console.error('Failed to export rankings:', error)
      toast.error('Failed to export rankings')
    }
  }

  const getPriorityTierColor = (tier: string) => {
    switch (tier) {
      case 'Critical':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'High':
        return 'bg-orange-500/10 text-orange-700 border-orange-500/20'
      case 'Medium':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'Low':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <Skeleton className="h-10 w-64" />
              <Skeleton className="h-96 w-full" />
            </div>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/portfolio">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Portfolio
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold">Portfolio Prioritization</h1>
                  <p className="text-muted-foreground">Prioritize projects across all programs</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={fetchRankings}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleExportRankings}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Link href="/admin/prioritization-criteria">
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Criteria
                  </Button>
                </Link>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{rankings.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Critical Priority</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rankings.filter(r => r.priority_tier === 'Critical').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Priority</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rankings.filter(r => r.priority_tier === 'High').length}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {rankings.length > 0
                      ? (rankings.reduce((sum, r) => sum + parseFloat(String(r.total_score || 0)), 0) / rankings.length).toFixed(2)
                      : '0.00'}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="rankings" className="space-y-4">
              <TabsList>
                <TabsTrigger value="rankings">Rankings</TabsTrigger>
                <TabsTrigger value="visualization">Visualization</TabsTrigger>
                <TabsTrigger value="scoring">Score Projects</TabsTrigger>
                <TabsTrigger value="pairwise">Pairwise Comparison</TabsTrigger>
              </TabsList>

              <TabsContent value="rankings" className="space-y-4">
                <RankingsTable
                  rankings={rankings}
                  onProjectClick={(projectId) => setSelectedProjectId(projectId)}
                />
              </TabsContent>

              <TabsContent value="visualization" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Project Prioritization Scatter Plot</CardTitle>
                    <CardDescription>
                      Total Score vs Rank (bubble size = criteria count, color = priority tier)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {rankings.length > 0 ? (
                      <ResponsiveContainer width="100%" height={500}>
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
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload as Ranking & { criteria_count: number }
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
                          <Scatter name="Projects" data={rankings.map(r => ({
                            ...r,
                            total_score: parseFloat(String(r.total_score || 0)),
                            criteria_count: r.criteria_count || 0
                          }))}>
                            {rankings.map((entry, index) => {
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
                    ) : (
                      <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                        <div className="text-center">
                          <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>No project rankings available</p>
                          <p className="text-sm mt-2">Score some projects to see the visualization</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scoring" className="space-y-4">
                <ScoringInterface
                  programId="" // Empty for portfolio-level (all projects)
                  projects={projects}
                  initialProjectId={selectedProjectId}
                  onScoreSaved={() => {
                    handleScoreSaved()
                    setSelectedProjectId(null)
                  }}
                />
              </TabsContent>

              <TabsContent value="pairwise" className="space-y-4">
                <PairwiseComparisonMatrix
                  programId="" // Empty for portfolio-level
                  projects={projects}
                  onComplete={(rankings) => {
                    toast.success('Pairwise comparison complete! Rankings calculated.')
                    // Refresh rankings to show new results
                    void fetchRankings()
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}

