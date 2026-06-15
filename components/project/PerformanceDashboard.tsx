"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, TrendingUp, AlertCircle, CheckCircle, BarChart3, Clock } from "lucide-react"
import { apiClient } from "@/lib/api"
import { cn } from "@/lib/utils"
import { PerformanceEntryDialog } from "./PerformanceEntryDialog"

interface PerformanceDashboardProps {
  projectId: string
}

interface PerformanceSummary {
  total_measurements: number
  entity_types_count: number
  unique_entities_count: number
  schedule: {
    avg_variance_days: number
    avg_variance_percent: number
    performance_index: number | null
    status: 'ahead' | 'behind' | 'unknown'
  }
  cost: {
    avg_variance: number
    avg_variance_percent: number
    performance_index: number | null
    status: 'under_budget' | 'over_budget' | 'unknown'
  }
  progress: {
    avg_variance: number
  }
  quality: {
    avg_score: number | null
    total_defects: number
    total_rework_hours: number
  }
  overall_health: 'healthy' | 'at_risk' | 'unhealthy' | 'unknown'
}

interface PerformanceActual {
  id: string
  entity_type: 'milestone' | 'deliverable' | 'activity' | 'phase' | 'resource'
  entity_name: string
  planned_start_date: string | null
  actual_start_date: string | null
  planned_end_date: string | null
  actual_end_date: string | null
  schedule_variance_days: number | null
  schedule_variance_percent: number | null
  planned_cost: number | null
  actual_cost: number | null
  cost_variance: number | null
  cost_variance_percent: number | null
  planned_progress_percent: number | null
  actual_progress_percent: number | null
  progress_variance: number | null
  quality_score: number | null
  defects_found: number | null
  rework_hours: number | null
  measurement_date: string
  notes: string | null
}

export function PerformanceDashboard({ projectId }: PerformanceDashboardProps) {
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [actuals, setActuals] = useState<PerformanceActual[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // Dialog state
  const [showEntryDialog, setShowEntryDialog] = useState(false)
  const [editingActual, setEditingActual] = useState<PerformanceActual | null>(null)

  useEffect(() => {
    if (!projectId || projectId === 'undefined') return
    void fetchData()
  }, [projectId])

  const fetchData = async () => {
    if (!projectId || projectId === 'undefined') return
    try {
      setLoading(true)
      setError(null)

      // Fetch summary and actuals in parallel using apiClient
      const [summaryData, actualsData] = await Promise.all([
        apiClient.get<{ data: PerformanceSummary }>(`/performance-actuals/${projectId}/summary`),
        apiClient.get<{ data: PerformanceActual[] }>(`/performance-actuals/${projectId}?limit=50`)
      ])

      setSummary(summaryData.data)
      setActuals(actualsData.data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load performance data')
      console.error('[PERFORMANCE-DASHBOARD] Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // Dialog handlers
  const handleAddNew = () => {
    setEditingActual(null)
    setShowEntryDialog(true)
  }

  const handleEdit = (actual: PerformanceActual) => {
    setEditingActual(actual)
    setShowEntryDialog(true)
  }

  const handleDialogClose = () => {
    setShowEntryDialog(false)
    setEditingActual(null)
  }

  const handleDialogSuccess = () => {
    setShowEntryDialog(false)
    setEditingActual(null)
    fetchData()
  }

  const getHealthColor = (value: number | null, type: 'spi' | 'cpi'): string => {
    if (value === null) return 'text-gray-500'
    if (type === 'spi') {
      return value >= 1.0 ? 'text-green-600' : value >= 0.85 ? 'text-yellow-600' : 'text-red-600'
    } else {
      return value >= 1.0 ? 'text-green-600' : value >= 0.85 ? 'text-yellow-600' : 'text-red-600'
    }
  }

  const getHealthBadge = (health: string) => {
    switch (health) {
      case 'healthy':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Healthy</Badge>
      case 'at_risk':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">At Risk</Badge>
      case 'unhealthy':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">Unhealthy</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === undefined) return 'N/A'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(value)
  }

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const interpretSPI = (spi: number | null): string => {
    if (spi === null) return 'No data available'
    if (spi >= 1.0) return `Ahead of schedule by ${((spi - 1) * 100).toFixed(1)}%`
    return `Behind schedule by ${((1 - spi) * 100).toFixed(1)}%`
  }

  const interpretCPI = (cpi: number | null): string => {
    if (cpi === null) return 'No data available'
    if (cpi >= 1.0) return `Under budget by ${((cpi - 1) * 100).toFixed(1)}%`
    return `Over budget by ${((1 - cpi) * 100).toFixed(1)}%`
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
          <p className="text-lg font-medium mb-1">Failed to Load Performance Data</p>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!summary || summary.total_measurements === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance Dashboard
          </CardTitle>
          <CardDescription>
            Track actual vs. planned performance across schedule, cost, scope, and quality
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-12 text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="font-medium mb-1">No Performance Data</p>
          <p className="text-sm">Run AI extraction to extract performance actuals from project documents</p>
        </CardContent>
      </Card>
    )
  }

  const spi = summary.schedule.performance_index
  const cpi = summary.cost.performance_index

  return (
    <div className="space-y-6">
      {/* Performance Entry Dialog */}
      <PerformanceEntryDialog
        projectId={projectId}
        isOpen={showEntryDialog}
        onClose={handleDialogClose}
        onSuccess={handleDialogSuccess}
        editingActual={editingActual}
      />
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Performance Dashboard
            </CardTitle>
            <CardDescription>
              Actual vs. planned performance metrics (PMBOK 8 Measurement Domain)
            </CardDescription>
          </div>
          <Button onClick={handleRefresh} variant="outline" size="sm" disabled={refreshing}>
            {refreshing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Refreshing...
              </>
            ) : (
              'Refresh'
            )}
          </Button>
        </CardHeader>
      </Card>

      {/* Overall Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Performance Summary</CardTitle>
          <CardDescription>
            {summary.total_measurements} measurement(s) across {summary.unique_entities_count} entity/entities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Floating Action Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              Add Performance Actual
            </Button>
          </div>

          {/* Performance Indices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SPI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Schedule Performance Index (SPI)
                </span>
                <span className={cn("text-2xl font-bold", getHealthColor(spi, 'spi'))}>
                  {spi !== null ? spi.toFixed(2) : 'N/A'}
                </span>
              </div>
              {spi !== null && (
                <>
                  <Progress 
                    value={Math.min(spi * 100, 150)} 
                    className={cn(
                      spi >= 1.0 ? "bg-green-200 dark:bg-green-900" : 
                      spi >= 0.85 ? "bg-yellow-200 dark:bg-yellow-900" : 
                      "bg-red-200 dark:bg-red-900"
                    )}
                  />
                  <p className="text-xs text-muted-foreground">{interpretSPI(spi)}</p>
                  <p className="text-xs text-muted-foreground">Target: ≥ 1.0</p>
                </>
              )}
            </div>

            {/* CPI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Cost Performance Index (CPI)
                </span>
                <span className={cn("text-2xl font-bold", getHealthColor(cpi, 'cpi'))}>
                  {cpi !== null ? cpi.toFixed(2) : 'N/A'}
                </span>
              </div>
              {cpi !== null && (
                <>
                  <Progress 
                    value={Math.min(cpi * 100, 150)} 
                    className={cn(
                      cpi >= 1.0 ? "bg-green-200 dark:bg-green-900" : 
                      cpi >= 0.85 ? "bg-yellow-200 dark:bg-yellow-900" : 
                      "bg-red-200 dark:bg-red-900"
                    )}
                  />
                  <p className="text-xs text-muted-foreground">{interpretCPI(cpi)}</p>
                  <p className="text-xs text-muted-foreground">Target: ≥ 1.0</p>
                </>
              )}
            </div>
          </div>

          {/* Overall Health */}
          <div className="flex items-center justify-between pt-4 border-t">
            <span className="text-sm font-medium">Overall Health</span>
            {getHealthBadge(summary.overall_health)}
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg Schedule Variance</p>
              <p className={cn(
                "text-lg font-semibold",
                summary.schedule.avg_variance_days >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {summary.schedule.avg_variance_days >= 0 ? '+' : ''}{summary.schedule.avg_variance_days.toFixed(1)} days
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg Cost Variance</p>
              <p className={cn(
                "text-lg font-semibold",
                summary.cost.avg_variance >= 0 ? "text-green-600" : "text-red-600"
              )}>
                {summary.cost.avg_variance >= 0 ? '+' : ''}{formatCurrency(summary.cost.avg_variance)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Avg Quality Score</p>
              <p className="text-lg font-semibold">
                {summary.quality.avg_score !== null ? `${summary.quality.avg_score.toFixed(1)}/10` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total Defects</p>
              <p className="text-lg font-semibold text-red-600">{summary.quality.total_defects}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schedule Variance Table */}
      {actuals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Schedule Variance
            </CardTitle>
            <CardDescription>
              Actual vs. planned dates for milestones, deliverables, and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Entity</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-left p-2 font-medium">Planned End</th>
                    <th className="text-left p-2 font-medium">Actual End</th>
                    <th className="text-right p-2 font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {actuals
                    .filter(a => a.planned_end_date || a.actual_end_date)
                    .slice(0, 10)
                    .map((actual) => (
                      <tr key={actual.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{actual.entity_name}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {actual.entity_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">
                          {formatDate(actual.planned_end_date)}
                        </td>
                        <td className="p-2">
                          {formatDate(actual.actual_end_date)}
                        </td>
                        <td className={cn(
                          "p-2 text-right font-medium",
                          actual.schedule_variance_days && actual.schedule_variance_days >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}>
                          {actual.schedule_variance_days !== null ? (
                            <>
                              {actual.schedule_variance_days >= 0 ? '+' : ''}
                              {actual.schedule_variance_days} days
                            </>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(actual)}
                            className="h-8 px-2"
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {actuals.filter(a => a.planned_end_date || a.actual_end_date).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No schedule variance data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cost Variance Table */}
      {actuals.some(a => a.planned_cost !== null || a.actual_cost !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Cost Variance
            </CardTitle>
            <CardDescription>
              Actual vs. planned costs for activities and deliverables
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Entity</th>
                    <th className="text-left p-2 font-medium">Type</th>
                    <th className="text-right p-2 font-medium">Planned Cost</th>
                    <th className="text-right p-2 font-medium">Actual Cost</th>
                    <th className="text-right p-2 font-medium">Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {actuals
                    .filter(a => a.planned_cost !== null || a.actual_cost !== null)
                    .slice(0, 10)
                    .map((actual) => (
                      <tr key={actual.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{actual.entity_name}</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {actual.entity_type}
                          </Badge>
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {formatCurrency(actual.planned_cost)}
                        </td>
                        <td className="p-2 text-right">
                          {formatCurrency(actual.actual_cost)}
                        </td>
                        <td className={cn(
                          "p-2 text-right font-medium",
                          actual.cost_variance && actual.cost_variance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}>
                          {actual.cost_variance !== null ? (
                            <>
                              {actual.cost_variance >= 0 ? '+' : ''}
                              {formatCurrency(actual.cost_variance)}
                            </>
                          ) : (
                            'N/A'
                          )}
                        </td>
                        <td className="p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(actual)}
                            className="h-8 px-2"
                          >
                            <BarChart3 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

