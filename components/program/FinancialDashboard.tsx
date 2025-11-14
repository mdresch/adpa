"use client"

/**
 * Financial Dashboard Component
 * 
 * Displays comprehensive financial metrics for a program including:
 * - Budget summary (total, spent, forecast, remaining)
 * - EVM (Earned Value Management) metrics
 * - ROI analysis
 * - Cost performance trends
 * 
 * Phase 3A: Financial Management & EVM Dashboard
 */

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Activity,
  CheckCircle,
  XCircle,
  Loader2,
  Download
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// ================================================================
// TYPES & INTERFACES
// ================================================================

export interface FinancialSummary {
  programId: string
  programName: string
  totalBudget: number
  totalSpent: number
  totalForecast: number
  remainingBudget: number
  budgetUtilization: number
  laborBudget: number
  materialsBudget: number
  equipmentBudget: number
  overheadBudget: number
  contingencyBudget: number
  budgetStatus: string
  totalProjects: number
  activeProjects: number
}

export interface EVMMetrics {
  PV: number          // Planned Value
  EV: number          // Earned Value
  AC: number          // Actual Cost
  SV: number          // Schedule Variance
  CV: number          // Cost Variance
  SPI: number         // Schedule Performance Index
  CPI: number         // Cost Performance Index
  BAC: number         // Budget at Completion
  EAC: number         // Estimate at Completion
  ETC: number         // Estimate to Complete
  VAC: number         // Variance at Completion
  TCPI: number        // To-Complete Performance Index
  TCPI_EAC: number
  performanceStatus: 'on-track' | 'at-risk' | 'critical' | 'unknown'
  reportingDate: string
  programId: string
}

export interface FinancialAnalysis {
  programId: string
  analysisDate: string
  totalInvestment: number
  sunkCosts: number
  remainingCosts: number
  totalExpectedBenefits: number
  realizedBenefits: number
  projectedBenefits: number
  roiPercent: number
  npv: number
  paybackPeriodMonths: number
  benefitCostRatio: number
  continueRecommendation: boolean
  recommendationRationale?: string
}

export interface FinancialDashboardData {
  summary: FinancialSummary
  evm: EVMMetrics
  analysis: FinancialAnalysis
}

interface FinancialDashboardProps {
  programId: string
  data?: FinancialDashboardData
  loading?: boolean
  onRefresh?: () => void
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return `$${value.toFixed(0)}`
}

function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}

function getHealthColor(value: number, threshold: 'good' | 'warning' | 'critical'): string {
  if (threshold === 'good') {
    if (value >= 0.95) return 'text-green-600'
    if (value >= 0.85) return 'text-yellow-600'
    return 'text-red-600'
  }
  return 'text-gray-600'
}

function getHealthBadgeColor(status: string): string {
  switch (status) {
    case 'on-track':
      return 'bg-green-100 text-green-800'
    case 'at-risk':
      return 'bg-yellow-100 text-yellow-800'
    case 'critical':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

function interpretCPI(cpi: number): string {
  if (cpi > 1.0) return `Under budget by ${((cpi - 1) * 100).toFixed(1)}%`
  if (cpi < 1.0) return `Over budget by ${((1 - cpi) * 100).toFixed(1)}%`
  return 'On budget'
}

function interpretSPI(spi: number): string {
  if (spi > 1.0) return `Ahead of schedule by ${((spi - 1) * 100).toFixed(1)}%`
  if (spi < 1.0) return `Behind schedule by ${((1 - spi) * 100).toFixed(1)}%`
  return 'On schedule'
}

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function FinancialDashboard({ 
  programId, 
  data, 
  loading = false,
  onRefresh 
}: FinancialDashboardProps) {
  const [isLoading, setIsLoading] = useState(loading)
  const [financialData, setFinancialData] = useState<FinancialDashboardData | null>(data || null)

  useEffect(() => {
    if (data) {
      setFinancialData(data)
      setIsLoading(false)
    } else if (!loading) {
      fetchFinancialData()
    }
  }, [data, programId])

  const fetchFinancialData = async () => {
    setIsLoading(true)
    try {
      const { getApiUrl } = await import('@/lib/api-url')
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      
      const response = await fetch(getApiUrl(`/programs/${programId}/financial-dashboard`), {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch financial data')
      }
      
      const result = await response.json()
      setFinancialData(result.data)
    } catch (error) {
      console.error('Failed to fetch financial data:', error)
      toast.error('Failed to load financial data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh()
    } else {
      fetchFinancialData()
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!financialData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <XCircle className="h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600 mb-4">No financial data available</p>
        <Button onClick={handleRefresh}>Load Data</Button>
      </div>
    )
  }

  const { summary, evm, analysis } = financialData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Financial Dashboard</h2>
          <p className="text-sm text-gray-600">{summary.programName}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Budget Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</div>
            <p className="text-xs text-gray-500 mt-1">
              {summary.totalProjects} projects ({summary.activeProjects} active)
            </p>
          </CardContent>
        </Card>

        {/* Spent to Date */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Spent to Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(summary.totalSpent)}
            </div>
            <Progress value={summary.budgetUtilization} className="mt-2" />
            <p className="text-xs text-gray-500 mt-1">
              {formatPercent(summary.budgetUtilization)} utilized
            </p>
          </CardContent>
        </Card>

        {/* Forecast at Completion */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Forecast at Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              summary.totalForecast > summary.totalBudget ? "text-red-600" : "text-green-600"
            )}>
              {formatCurrency(summary.totalForecast)}
            </div>
            {summary.totalForecast > summary.totalBudget && (
              <p className="text-xs text-red-600 mt-1 flex items-center">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {formatCurrency(summary.totalForecast - summary.totalBudget)} overrun projected
              </p>
            )}
          </CardContent>
        </Card>

        {/* Remaining Budget */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Remaining Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary.remainingBudget)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatPercent(100 - summary.budgetUtilization)} remaining
            </p>
          </CardContent>
        </Card>
      </div>

      {/* EVM Dashboard */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Earned Value Management (EVM)</CardTitle>
              <CardDescription>
                Performance metrics as of {new Date(evm.reportingDate).toLocaleDateString()}
              </CardDescription>
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-xs font-medium",
              getHealthBadgeColor(evm.performanceStatus)
            )}>
              {evm.performanceStatus.replace('-', ' ').toUpperCase()}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* PV, EV, AC */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Planned Value (PV)</p>
              <p className="text-xl font-bold">{formatCurrency(evm.PV)}</p>
              <p className="text-xs text-gray-500">What we planned to accomplish</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Earned Value (EV)</p>
              <p className="text-xl font-bold">{formatCurrency(evm.EV)}</p>
              <p className="text-xs text-gray-500">What we actually accomplished</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Actual Cost (AC)</p>
              <p className="text-xl font-bold">{formatCurrency(evm.AC)}</p>
              <p className="text-xs text-gray-500">What we actually spent</p>
            </div>
          </div>

          {/* Performance Indices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CPI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Cost Performance Index (CPI)</span>
                <span className={cn("text-lg font-bold", getHealthColor(evm.CPI, 'good'))}>
                  {evm.CPI.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(evm.CPI * 100, 150)} 
                className={cn(
                  evm.CPI >= 0.95 ? "bg-green-200" : evm.CPI >= 0.85 ? "bg-yellow-200" : "bg-red-200"
                )}
              />
              <p className="text-xs text-gray-600">{interpretCPI(evm.CPI)}</p>
              <p className="text-xs text-gray-500">Target: ≥ 1.0</p>
            </div>

            {/* SPI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Schedule Performance Index (SPI)</span>
                <span className={cn("text-lg font-bold", getHealthColor(evm.SPI, 'good'))}>
                  {evm.SPI.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(evm.SPI * 100, 150)}
                className={cn(
                  evm.SPI >= 0.95 ? "bg-green-200" : evm.SPI >= 0.85 ? "bg-yellow-200" : "bg-red-200"
                )}
              />
              <p className="text-xs text-gray-600">{interpretSPI(evm.SPI)}</p>
              <p className="text-xs text-gray-500">Target: ≥ 1.0</p>
            </div>
          </div>

          {/* Forecast Metrics */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Forecast & Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">EAC (Estimate at Completion)</p>
                <p className="font-bold mt-1">{formatCurrency(evm.EAC)}</p>
              </div>
              <div>
                <p className="text-gray-600">ETC (Estimate to Complete)</p>
                <p className="font-bold mt-1">{formatCurrency(evm.ETC)}</p>
              </div>
              <div>
                <p className="text-gray-600">VAC (Variance at Completion)</p>
                <p className={cn(
                  "font-bold mt-1",
                  evm.VAC >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(Math.abs(evm.VAC))}
                  {evm.VAC < 0 && " overrun"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">TCPI (To Complete)</p>
                <p className="font-bold mt-1">{evm.TCPI.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Alert if performance is poor */}
          {evm.performanceStatus !== 'on-track' && (
            <div className={cn(
              "rounded-lg p-4 flex items-start gap-3",
              evm.performanceStatus === 'critical' ? "bg-red-50 border border-red-200" : "bg-yellow-50 border border-yellow-200"
            )}>
              <AlertTriangle className={cn(
                "h-5 w-5 mt-0.5",
                evm.performanceStatus === 'critical' ? "text-red-600" : "text-yellow-600"
              )} />
              <div className="flex-1">
                <p className={cn(
                  "font-medium text-sm",
                  evm.performanceStatus === 'critical' ? "text-red-900" : "text-yellow-900"
                )}>
                  Performance Issue Detected
                </p>
                <p className={cn(
                  "text-sm mt-1",
                  evm.performanceStatus === 'critical' ? "text-red-700" : "text-yellow-700"
                )}>
                  {evm.performanceStatus === 'critical' 
                    ? 'Immediate action required: Both cost and schedule performance are below target thresholds.'
                    : 'Review recommended: Performance metrics indicate potential issues requiring attention.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ROI Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Financial Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Analysis</CardTitle>
            <CardDescription>Return on investment and benefit realization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">ROI</p>
                <p className={cn(
                  "text-2xl font-bold",
                  analysis.roiPercent > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatPercent(analysis.roiPercent, 1)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">NPV</p>
                <p className={cn(
                  "text-2xl font-bold",
                  analysis.npv > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {formatCurrency(analysis.npv)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payback Period</p>
                <p className="text-2xl font-bold">{analysis.paybackPeriodMonths} mo</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Benefit/Cost Ratio</p>
                <p className={cn(
                  "text-2xl font-bold",
                  analysis.benefitCostRatio > 1 ? "text-green-600" : "text-red-600"
                )}>
                  {analysis.benefitCostRatio.toFixed(2)}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                {analysis.continueRecommendation ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="font-medium">
                  {analysis.continueRecommendation ? 'Recommended to Continue' : 'Review Recommended'}
                </span>
              </div>
              <p className="text-sm text-gray-600">
                {analysis.recommendationRationale}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Budget Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Breakdown</CardTitle>
            <CardDescription>Allocation by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Labor */}
              {summary.laborBudget > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Labor</span>
                    <span className="font-medium">{formatCurrency(summary.laborBudget)}</span>
                  </div>
                  <Progress value={(summary.laborBudget / summary.totalBudget) * 100} />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercent((summary.laborBudget / summary.totalBudget) * 100)} of total
                  </p>
                </div>
              )}

              {/* Materials */}
              {summary.materialsBudget > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Materials</span>
                    <span className="font-medium">{formatCurrency(summary.materialsBudget)}</span>
                  </div>
                  <Progress value={(summary.materialsBudget / summary.totalBudget) * 100} />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercent((summary.materialsBudget / summary.totalBudget) * 100)} of total
                  </p>
                </div>
              )}

              {/* Equipment */}
              {summary.equipmentBudget > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Equipment</span>
                    <span className="font-medium">{formatCurrency(summary.equipmentBudget)}</span>
                  </div>
                  <Progress value={(summary.equipmentBudget / summary.totalBudget) * 100} />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercent((summary.equipmentBudget / summary.totalBudget) * 100)} of total
                  </p>
                </div>
              )}

              {/* Overhead */}
              {summary.overheadBudget > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Overhead</span>
                    <span className="font-medium">{formatCurrency(summary.overheadBudget)}</span>
                  </div>
                  <Progress value={(summary.overheadBudget / summary.totalBudget) * 100} />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercent((summary.overheadBudget / summary.totalBudget) * 100)} of total
                  </p>
                </div>
              )}

              {/* Contingency */}
              {summary.contingencyBudget > 0 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Contingency Reserve</span>
                    <span className="font-medium">{formatCurrency(summary.contingencyBudget)}</span>
                  </div>
                  <Progress value={(summary.contingencyBudget / summary.totalBudget) * 100} />
                  <p className="text-xs text-gray-500 mt-1">
                    {formatPercent((summary.contingencyBudget / summary.totalBudget) * 100)} of total
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

