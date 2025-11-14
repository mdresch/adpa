"use client"

/**
 * Portfolio OKR Dashboard
 * TASK-1283: OKR dashboard UI
 * 
 * Features:
 * - View OKRs at all levels (organization, portfolio, program, project)
 * - Display OKR progress and key results
 * - Create and edit OKRs
 * - Manage key results
 * - Filter by level and period
 * - Visual progress tracking
 */

import { useState, useEffect } from 'react'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { apiClient } from '@/lib/api'
import {
  Target,
  Plus,
  RefreshCw,
  Filter,
  Download,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3
} from 'lucide-react'
import { OKRCard } from '@/components/okr/OKRCard'
import { OKRDialog } from '@/components/okr/OKRDialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface OKR {
  id: string
  organization_id?: string | null
  strategic_goal_id?: string | null
  parent_okr_id?: string | null
  level: 'organization' | 'portfolio' | 'program' | 'project'
  entity_id?: string | null
  entity_type?: 'program' | 'project' | null
  objective_title: string
  objective_description?: string | null
  objective_category?: 'strategic' | 'operational' | 'innovation' | null
  okr_period?: string | null
  period_start?: string | null
  period_end?: string | null
  owner_id?: string | null
  owner_name?: string | null
  owner_role?: string | null
  confidence_level?: number | null
  progress_percentage?: number | null
  status?: 'on-track' | 'at-risk' | 'behind' | 'achieved' | 'not-started' | null
  is_stretch_goal: boolean
  priority?: 'critical' | 'high' | 'medium' | 'low' | null
  created_at: string
  updated_at: string
  key_results?: KeyResult[]
}

interface KeyResult {
  id: string
  okr_id: string
  key_result_title: string
  key_result_description?: string | null
  metric_name?: string | null
  metric_unit?: string | null
  baseline_value?: number | null
  target_value: number
  current_value: number
  stretch_target?: number | null
  progress_percentage?: number | null
  progress_status?: 'not-started' | 'in-progress' | 'achieved' | 'at-risk' | 'behind' | null
  measurement_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  last_measured_at?: string | null
  next_measurement_date?: string | null
  owner_id?: string | null
  contributing_projects?: string[] | null
  created_at: string
  updated_at: string
}

export default function OKRDashboardPage() {
  const [okrs, setOKRs] = useState<OKR[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedLevel, setSelectedLevel] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingOKR, setEditingOKR] = useState<OKR | null>(null)

  useEffect(() => {
    void fetchOKRs()
  }, [selectedLevel, selectedPeriod])

  const fetchOKRs = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      
      if (selectedLevel !== 'all') {
        params.append('level', selectedLevel)
      }
      
      if (selectedPeriod !== 'all') {
        params.append('okr_period', selectedPeriod)
      }
      
      params.append('include_key_results', 'true')

      const response = await apiClient.get<{
        success: boolean
        data: OKR[]
        count: number
      }>(`/okrs?${params.toString()}`)

      if (response && response.success && response.data) {
        setOKRs(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch OKRs:', error)
      toast.error('Failed to load OKRs')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleCreateOKR = () => {
    setEditingOKR(null)
    setIsDialogOpen(true)
  }

  const handleEditOKR = (okr: OKR) => {
    setEditingOKR(okr)
    setIsDialogOpen(true)
  }

  const handleOKRSaved = () => {
    setIsDialogOpen(false)
    setEditingOKR(null)
    void fetchOKRs()
  }

  const handleDeleteOKR = async (okrId: string) => {
    if (!confirm('Are you sure you want to delete this OKR? This will also delete all associated key results.')) {
      return
    }

    try {
      const response = await apiClient.delete(`/okrs/${okrId}`)
      if (response && response.success) {
        toast.success('OKR deleted successfully')
        void fetchOKRs()
      }
    } catch (error) {
      console.error('Failed to delete OKR:', error)
      toast.error('Failed to delete OKR')
    }
  }

  const getStatusColor = (status: string | null | undefined) => {
    switch (status) {
      case 'achieved':
        return 'bg-green-500/10 text-green-700 border-green-500/20'
      case 'on-track':
        return 'bg-blue-500/10 text-blue-700 border-blue-500/20'
      case 'at-risk':
        return 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20'
      case 'behind':
        return 'bg-red-500/10 text-red-700 border-red-500/20'
      case 'not-started':
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
      default:
        return 'bg-gray-500/10 text-gray-700 border-gray-500/20'
    }
  }

  const getStatusIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'achieved':
        return <CheckCircle2 className="h-4 w-4" />
      case 'on-track':
        return <TrendingUp className="h-4 w-4" />
      case 'at-risk':
        return <AlertCircle className="h-4 w-4" />
      case 'behind':
        return <AlertCircle className="h-4 w-4" />
      case 'not-started':
        return <Clock className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  // Calculate summary statistics
  const stats = {
    total: okrs.length,
    achieved: okrs.filter(o => o.status === 'achieved').length,
    onTrack: okrs.filter(o => o.status === 'on-track').length,
    atRisk: okrs.filter(o => o.status === 'at-risk').length,
    behind: okrs.filter(o => o.status === 'behind').length,
    avgProgress: okrs.length > 0
      ? okrs.reduce((sum, o) => sum + (parseFloat(String(o.progress_percentage || 0))), 0) / okrs.length
      : 0,
  }

  // Get unique periods for filter
  const periods = Array.from(new Set(okrs.map(o => o.okr_period).filter(Boolean))) as string[]

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
              <div>
                <h1 className="text-3xl font-bold">Portfolio OKRs</h1>
                <p className="text-muted-foreground">Objectives and Key Results tracking</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={fetchOKRs}
                  disabled={refreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Button onClick={handleCreateOKR}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add OKR
                </Button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total OKRs</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Achieved</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{stats.achieved}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">On Track</CardTitle>
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{stats.onTrack}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">At Risk</CardTitle>
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.atRisk}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Behind</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.behind}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.avgProgress.toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Level:</label>
                    <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="organization">Organization</SelectItem>
                        <SelectItem value="portfolio">Portfolio</SelectItem>
                        <SelectItem value="program">Program</SelectItem>
                        <SelectItem value="project">Project</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">Period:</label>
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="All Periods" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Periods</SelectItem>
                        {periods.map(period => (
                          <SelectItem key={period} value={period}>
                            {period}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* OKR List */}
            {okrs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No OKRs Found</h3>
                  <p className="text-muted-foreground mb-4">
                    {selectedLevel !== 'all' || selectedPeriod !== 'all'
                      ? 'Try adjusting your filters'
                      : 'Get started by creating your first OKR'}
                  </p>
                  <Button onClick={handleCreateOKR}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create OKR
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {okrs.map(okr => (
                  <OKRCard
                    key={okr.id}
                    okr={okr}
                    onEdit={() => handleEditOKR(okr)}
                    onDelete={() => handleDeleteOKR(okr.id)}
                    onRefresh={fetchOKRs}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* OKR Dialog */}
      <OKRDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        okr={editingOKR}
        onSaved={handleOKRSaved}
      />
    </div>
  )
}

