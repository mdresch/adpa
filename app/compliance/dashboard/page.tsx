/**
 * Compliance Dashboard Page
 * SC-120: Compliance Dashboard and Trend Visibility
 * 
 * Displays standards compliance metrics, trends, and recommendations
 * for PMBOK, BABOK, and DMBOK standards packs.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getApiBaseUrl } from '@/lib/api-url'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart
} from 'recharts'
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  FileText,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  Clock,
  Target,
  BookOpen
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface ComplianceSummary {
  document_count: string
  validation_count: string
  average_score: string
  average_compliance: string
  total_critical_findings: string
  total_major_findings: string
  total_minor_findings: string
  compliant_count: string
  non_compliant_count: string
  partial_count: string
}

interface ValidationResult {
  id: string
  document_id: string
  document_title: string
  pack_name: string
  pack_type: string
  overall_score: number
  overall_status: string
  compliance_percentage: number
  grade: string
  critical_findings: number
  major_findings: number
  validated_at: string
}

interface TrendPoint {
  date: string
  average_score: number
  compliance_percentage: number
  document_count: number
  critical_findings: number
}

interface PackBreakdown {
  pack_type: string
  pack_name: string
  validation_count: number
  average_score: number
  compliance_rate: number
}

interface Recommendation {
  id: string
  title: string
  description: string
  document_title: string
  priority: string
  effort: string
  potential_score_improvement: number
  category_name: string
}

const COLORS = {
  COMPLIANT: '#22c55e',
  PARTIAL: '#eab308',
  NON_COMPLIANT: '#ef4444',
  PMBOK: '#3b82f6',
  BABOK: '#8b5cf6',
  DMBOK: '#ec4899',
  CUSTOM: '#6b7280'
}

const STATUS_COLORS: Record<string, string> = {
  COMPLIANT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  PARTIAL: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  NON_COMPLIANT: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
}

export default function ComplianceDashboardPage() {
  const [summary, setSummary] = useState<ComplianceSummary | null>(null)
  const [recentValidations, setRecentValidations] = useState<ValidationResult[]>([])
  const [trends, setTrends] = useState<TrendPoint[]>([])
  const [packBreakdown, setPackBreakdown] = useState<PackBreakdown[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPackType, setSelectedPackType] = useState<string>('all')
  const [dateRange, setDateRange] = useState<string>('30')
  const { user } = useAuth()

  useEffect(() => {
    loadDashboardData()
  }, [selectedPackType, dateRange])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('auth_token')
      const API_BASE_URL = getApiBaseUrl()

      const params = new URLSearchParams()
      if (selectedPackType !== 'all') {
        params.append('packTypes', selectedPackType)
      }

      const response = await fetch(`${API_BASE_URL}/compliance/dashboard?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (data.success) {
        setSummary(data.data.summary)
        setRecentValidations(data.data.recentValidations || [])
        setTrends(data.data.trends || [])
        setPackBreakdown(data.data.packBreakdown || [])
        setRecommendations(data.data.topRecommendations || [])
      }
    } catch (error) {
      console.error('Failed to load compliance dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600 dark:text-green-400'
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getGradeColor = (grade: string): string => {
    if (grade.startsWith('A')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    if (grade.startsWith('B')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
    if (grade.startsWith('C')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    })
  }

  const complianceDistribution = summary ? [
    { name: 'Compliant', value: parseInt(summary.compliant_count) || 0, color: COLORS.COMPLIANT },
    { name: 'Partial', value: parseInt(summary.partial_count) || 0, color: COLORS.PARTIAL },
    { name: 'Non-Compliant', value: parseInt(summary.non_compliant_count) || 0, color: COLORS.NON_COMPLIANT }
  ].filter(item => item.value > 0) : []

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Standards Compliance Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor compliance with PMBOK, BABOK, and DMBOK standards across your documents
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 h-9 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" asChild>
            <Link href="/governance">
              🏛️ Governance Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-1.5 h-9 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800" asChild>
            <Link href="/compliance/policy-library">
              📜 Policy Library
            </Link>
          </Button>
          <div className="h-6 w-px bg-slate-300 dark:bg-slate-700 hidden sm:block mx-1"></div>
          <Select value={selectedPackType} onValueChange={setSelectedPackType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Standards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Standards</SelectItem>
              <SelectItem value="PMBOK">PMBOK</SelectItem>
              <SelectItem value="BABOK">BABOK</SelectItem>
              <SelectItem value="DMBOK">DMBOK</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents Validated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.document_count || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.validation_count || 0} total validations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(parseFloat(summary?.average_score || '0'))}`}>
              {parseFloat(summary?.average_score || '0').toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {parseFloat(summary?.average_compliance || '0').toFixed(1)}% compliance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Findings</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {summary?.total_critical_findings || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.total_major_findings || 0} major findings
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliant Documents</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {summary?.compliant_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.partial_count || 0} partial, {summary?.non_compliant_count || 0} non-compliant
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Trend Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compliance Trend</CardTitle>
            <CardDescription>Average compliance score over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    className="text-xs"
                  />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                    labelFormatter={formatDate}
                  />
                  <Area
                    type="monotone"
                    dataKey="average_score"
                    stroke="#3b82f6"
                    fill="url(#colorScore)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Compliance Distribution</CardTitle>
            <CardDescription>Status breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={complianceDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {complianceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pack Breakdown and Recent Validations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pack Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Standards Pack Performance</CardTitle>
            <CardDescription>Average scores by standards pack</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={packBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis type="category" dataKey="pack_type" width={80} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Average Score']}
                  />
                  <Bar 
                    dataKey="average_score" 
                    fill="#3b82f6"
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {packBreakdown.map((pack) => (
                <div key={pack.pack_type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" style={{ color: COLORS[pack.pack_type as keyof typeof COLORS] || COLORS.CUSTOM }} />
                    <span>{pack.pack_name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">{pack.validation_count} validations</span>
                    <Badge variant="outline">{pack.compliance_rate?.toFixed(0)}% compliance</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Validations */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Validations</CardTitle>
            <CardDescription>Latest compliance checks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentValidations.slice(0, 5).map((validation) => (
                <div key={validation.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none truncate max-w-[200px]">
                      {validation.document_title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {validation.pack_name} • {formatDate(validation.validated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getGradeColor(validation.grade)}>
                      {validation.grade}
                    </Badge>
                    <Badge className={STATUS_COLORS[validation.overall_status] || STATUS_COLORS.PENDING}>
                      {validation.overall_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            {recentValidations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No validations yet</p>
                <p className="text-sm">Validate a document to see results here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Top Recommendations
          </CardTitle>
          <CardDescription>Prioritized compliance improvements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recommendations.map((rec) => (
              <div key={rec.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge className={PRIORITY_COLORS[rec.priority] || PRIORITY_COLORS.MEDIUM}>
                      {rec.priority}
                    </Badge>
                    <span className="text-sm font-medium">{rec.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Document: {rec.document_title}</span>
                    <span>Category: {rec.category_name}</span>
                    <span>Effort: {rec.effort}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-600">
                    +{rec.potential_score_improvement?.toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">potential</div>
                </div>
              </div>
            ))}
            {recommendations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                <p>No pending recommendations</p>
                <p className="text-sm">Your documents are well-compliant!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
