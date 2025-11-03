/**
 * Quality Dashboard Page
 * System-wide quality metrics, trends, and provider comparison
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Award,
  Activity,
  DollarSign,
  Zap
} from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'

interface QualityStats {
  total_audits: number
  average_score: number
  grade_a_count: number
  grade_b_count: number
  grade_c_count: number
  grade_d_count: number
  grade_f_count: number
  avg_completeness: number
  avg_consistency: number
  avg_professional_quality: number
  avg_standards_compliance: number
  avg_accuracy: number
  avg_context_relevance: number
}

interface ProviderQuality {
  ai_provider: string
  ai_model: string
  audit_count: number
  avg_quality: number
  min_quality: number
  max_quality: number
  avg_cost: number
  avg_time_ms: number
}

interface CommonIssue {
  dimension: string
  description: string
  severity: string
  frequency: number
}

export default function QualityDashboardPage() {
  const [stats, setStats] = useState<QualityStats | null>(null)
  const [providerComparison, setProviderComparison] = useState<ProviderQuality[]>([])
  const [commonIssues, setCommonIssues] = useState<CommonIssue[]>([])
  const [loading, setLoading] = useState(true)
  const { token } = useAuth()

  useEffect(() => {
    loadDashboardData().catch((error) => {
      console.error('Failed to load dashboard data:', error)
    })
  }, [token])

  const loadDashboardData = async () => {
    try {
      setLoading(true)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

      const [statsRes, providersRes, issuesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/quality-audits/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/quality-audits/provider-comparison`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/quality-audits/common-issues?limit=15`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      const [statsData, providersData, issuesData] = await Promise.all([
        statsRes.json(),
        providersRes.json(),
        issuesRes.json()
      ])

      if (statsData.success) setStats(statsData.stats)
      if (providersData.success) setProviderComparison(providersData.providers)
      if (issuesData.success) setCommonIssues(issuesData.issues)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-sm text-gray-600">Loading quality dashboard...</p>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No quality audit data available yet.</p>
            <p className="text-sm text-gray-500 mt-2">
              Generate some documents to see quality metrics!
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare chart data
  const gradeDistribution = [
    { name: 'A (90-100%)', value: stats.grade_a_count, color: '#10b981' },
    { name: 'B (80-89%)', value: stats.grade_b_count, color: '#84cc16' },
    { name: 'C (70-79%)', value: stats.grade_c_count, color: '#eab308' },
    { name: 'D (60-69%)', value: stats.grade_d_count, color: '#f97316' },
    { name: 'F (<60%)', value: stats.grade_f_count, color: '#ef4444' }
  ]

  const dimensionalScores = [
    { dimension: 'Completeness', score: stats.avg_completeness, weight: '20%' },
    { dimension: 'Consistency', score: stats.avg_consistency, weight: '15%' },
    { dimension: 'Professional', score: stats.avg_professional_quality, weight: '20%' },
    { dimension: 'Standards', score: stats.avg_standards_compliance, weight: '20%' },
    { dimension: 'Accuracy', score: stats.avg_accuracy, weight: '15%' },
    { dimension: 'Relevance', score: stats.avg_context_relevance, weight: '10%' }
  ]

  const passRate = ((stats.grade_a_count + stats.grade_b_count) / stats.total_audits) * 100

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="h-8 w-8 text-purple-600" />
        <div>
          <h1 className="text-3xl font-bold">Quality Control Dashboard</h1>
          <p className="text-gray-600">30-day rolling quality metrics and trends</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <SummaryCard
          icon={<Activity className="h-6 w-6 text-blue-600" />}
          title="Total Audits"
          value={stats.total_audits.toLocaleString()}
          subtitle="Last 30 days"
          color="blue"
        />
        
        <SummaryCard
          icon={<Award className="h-6 w-6 text-green-600" />}
          title="Average Quality"
          value={`${stats.average_score}%`}
          subtitle={`Grade ${calculateGrade(stats.average_score)}`}
          color="green"
        />
        
        <SummaryCard
          icon={<CheckCircle className="h-6 w-6 text-emerald-600" />}
          title="Pass Rate"
          value={`${passRate.toFixed(1)}%`}
          subtitle="Grades A & B"
          color="emerald"
        />
        
        <SummaryCard
          icon={<AlertTriangle className="h-6 w-6 text-yellow-600" />}
          title="Need Review"
          value={stats.grade_c_count + stats.grade_d_count + stats.grade_f_count}
          subtitle="Grades C, D, F"
          color="yellow"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Grade Distribution</CardTitle>
            <CardDescription>Quality grades across all audits</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={gradeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {gradeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dimensional Scores */}
        <Card>
          <CardHeader>
            <CardTitle>Quality Dimensions</CardTitle>
            <CardDescription>Average scores by dimension</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dimensionalScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dimension" angle={-45} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Provider Comparison */}
      {providerComparison.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>AI Provider Quality Comparison</CardTitle>
            <CardDescription>Quality performance by AI provider and model</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold">Provider</th>
                    <th className="text-left py-3 px-4 font-semibold">Model</th>
                    <th className="text-center py-3 px-4 font-semibold">Audits</th>
                    <th className="text-center py-3 px-4 font-semibold">Avg Quality</th>
                    <th className="text-center py-3 px-4 font-semibold">Range</th>
                    <th className="text-center py-3 px-4 font-semibold">Avg Cost</th>
                    <th className="text-center py-3 px-4 font-semibold">Avg Time</th>
                  </tr>
                </thead>
                <tbody>
                  {providerComparison.map((provider, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{provider.ai_provider}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{provider.ai_model}</td>
                      <td className="py-3 px-4 text-center">{provider.audit_count}</td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={getQualityBadgeClass(provider.avg_quality)}>
                          {provider.avg_quality}%
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {provider.min_quality}-{provider.max_quality}%
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        ${provider.avg_cost.toFixed(4)}
                      </td>
                      <td className="py-3 px-4 text-center text-sm">
                        {(provider.avg_time_ms / 1000).toFixed(1)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Common Issues */}
      {commonIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Most Common Quality Issues</CardTitle>
            <CardDescription>Top quality issues across all audits (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {commonIssues.slice(0, 10).map((issue, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-lg font-semibold text-gray-500">#{idx + 1}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {issue.dimension}
                        </Badge>
                        <Badge className={getSeverityBadgeClass(issue.severity)}>
                          {issue.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{issue.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{issue.frequency}</div>
                    <div className="text-xs text-gray-500">occurrences</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/**
 * Summary Card Component
 */
type ColorVariant = 'blue' | 'green' | 'emerald' | 'yellow' | 'purple'

function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  color
}: {
  icon: React.ReactNode
  title: string
  value: string | number
  subtitle: string
  color: ColorVariant
}) {
  const colorClasses: Record<ColorVariant, string> = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    emerald: 'from-emerald-500 to-emerald-600',
    yellow: 'from-yellow-500 to-yellow-600',
    purple: 'from-purple-500 to-purple-600'
  }

  const safeColor: ColorVariant = ['blue', 'green', 'emerald', 'yellow', 'purple'].includes(color) ? color : 'blue'

  return (
    <Card className={`bg-gradient-to-br ${colorClasses[safeColor]} text-white border-0`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm opacity-90 mb-1">{title}</p>
            <p className="text-3xl font-bold mb-1">{value}</p>
            <p className="text-xs opacity-75">{subtitle}</p>
          </div>
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Helper Functions
 */
function calculateGrade(score: number): string {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function getQualityBadgeClass(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-800 border-green-300'
  if (score >= 80) return 'bg-green-50 text-green-700 border-green-200'
  if (score >= 70) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
  if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-300'
  return 'bg-red-100 text-red-800 border-red-300'
}

type SeverityLevel = 'critical' | 'major' | 'minor'

function getSeverityBadgeClass(severity: string): string {
  const classes: Record<SeverityLevel, string> = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    major: 'bg-orange-100 text-orange-800 border-orange-300',
    minor: 'bg-yellow-100 text-yellow-800 border-yellow-300'
  }
  const safeSeverity: SeverityLevel = ['critical', 'major', 'minor'].includes(severity) ? (severity as SeverityLevel) : 'minor'
  return classes[safeSeverity]
}

