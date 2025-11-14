"use client"

/**
 * Program Prioritization Page
 * TASK-328: Frontend UI for portfolio prioritization
 * 
 * Features:
 * - View project rankings
 * - Score projects on criteria
 * - Filter and sort rankings
 * - Export rankings
 */

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { PrioritizationMatrix } from '@/components/program/PrioritizationMatrix'
import { ScoringInterface } from '@/components/program/ScoringInterface'
import { PairwiseComparisonMatrix } from '@/components/program/PairwiseComparisonMatrix'
import { RankingsTable } from '@/components/program/RankingsTable'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import {
  BarChart3,
  Target,
  TrendingUp,
  Download,
  RefreshCw,
  ArrowLeft,
  Settings
} from 'lucide-react'
import Link from 'next/link'

interface Program {
  id: string
  name: string
  description?: string
}

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

export default function ProgramPrioritizationPage() {
  const params = useParams()
  const programId = params?.id as string

  const [program, setProgram] = useState<Program | null>(null)
  const [rankings, setRankings] = useState<Ranking[]>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string; program_id?: string }>>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  useEffect(() => {
    if (programId) {
      void fetchProgram()
      void fetchRankings()
      void fetchProjects()
    }
  }, [programId])

  const fetchProgram = async () => {
    try {
      // Use apiClient.getProgram() which handles the response format correctly
      const program = await apiClient.getProgram(programId)
      if (program) {
        setProgram(program)
      }
    } catch (error) {
      console.error('Failed to fetch program:', error)
      toast.error('Failed to load program')
    }
  }

  const fetchRankings = async () => {
    try {
      setRefreshing(true)
      const response = await apiClient.get<{
        success: boolean
        data: Ranking[]
        pagination: { total: number }
      }>(`/prioritization/rankings?program_id=${programId}`)

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

  const fetchProjects = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean
        data: Array<{ id: string; name: string; program_id?: string }>
      }>(`/programs/${programId}/projects`)

      if (response && response.success && response.data) {
        setProjects(response.data)
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
                <Link href={`/programs/${programId}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Program
                  </Button>
                </Link>
                <div>
                  <h1 className="text-3xl font-bold">Portfolio Prioritization</h1>
                  {program && (
                    <p className="text-muted-foreground">{program.name}</p>
                  )}
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
                  <Target className="h-4 w-4 text-muted-foreground" />
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
                <TabsTrigger value="scoring">Score Projects</TabsTrigger>
                <TabsTrigger value="pairwise">Pairwise Comparison</TabsTrigger>
              </TabsList>

              <TabsContent value="rankings" className="space-y-4">
                <RankingsTable
                  rankings={rankings}
                  onProjectClick={(projectId) => setSelectedProjectId(projectId)}
                />
              </TabsContent>

              <TabsContent value="scoring" className="space-y-4">
                <ScoringInterface
                  programId={programId}
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
                  programId={programId}
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

