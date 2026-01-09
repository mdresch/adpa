'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Sidebar } from '@/components/sidebar'
import { Header } from '@/components/header'
import { PageTransition } from '@/components/page-transition'
import { AnimatedLayout, AnimatedCard } from '@/components/animated-layout'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  BarChart3, 
  FileText, 
  TriangleAlert, 
  CheckCircle,
  Download,
  Filter,
  Calendar,
  Target,
  Award,
  Activity,
  Sparkles,
  Loader2
} from '@/components/ui/icons-shim'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from 'sonner'
import { QualityTrendsChart } from '@/components/admin/QualityTrendsChart'
import { motion } from 'framer-motion'

interface QualityTrend {
  date: string
  avg_quality: number
  document_count: number
  templates_analyzed: number
}

interface TemplatePerformance {
  template_id: string
  template_name: string
  framework: string
  avg_quality: number
  document_count: number
  trend: 'up' | 'down' | 'stable'
  trend_percentage: number
}

interface ProviderPerformance {
  provider: string
  model: string
  avg_quality: number
  document_count: number
  avg_cost: number
}

interface SummaryStats {
  overall_avg_quality: number
  total_audits: number
  templates_with_issues: number
  sla_compliance: number
}

export default function QualityTrendsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30days')
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null)
  const [trendsData, setTrendsData] = useState<QualityTrend[]>([])
  const [templatePerformance, setTemplatePerformance] = useState<TemplatePerformance[]>([])
  const [providerPerformance, setProviderPerformance] = useState<ProviderPerformance[]>([])
  const [exportingCSV, setExportingCSV] = useState(false)

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('[Quality Trends] Auth still loading...')
      return
    }

    // Check if user is logged in
    if (!user) {
      console.log('[Quality Trends] No user found, redirecting to login')
      router.push('/auth/login')
      toast.error('Please login to continue')
      return
    }

    // Check if user is admin (check role directly)
    console.log('[Quality Trends] User loaded:', user.email, 'Role:', user.role)
    
    if (user.role !== 'admin') {
      console.log('[Quality Trends] User is not admin, redirecting to dashboard')
      router.push('/dashboard')
      toast.error('Access denied: Admin permission required')
      return
    }

    console.log('[Quality Trends] Admin verified, fetching data')
    fetchQualityTrends()
  }, [period, user, authLoading, router])

  const fetchQualityTrends = async () => {
    try {
      setLoading(true)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const token = localStorage.getItem('auth_token')

      const response = await fetch(
        `${API_BASE_URL}/admin/quality-trends?period=${period}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch quality trends')
      }

      const data = await response.json()

      setSummaryStats(data.summary)
      setTrendsData(data.by_time)
      setTemplatePerformance(data.by_template)
      setProviderPerformance(data.by_provider)

    } catch (error: any) {
      console.error('Failed to fetch quality trends:', error)
      toast.error(error.message || 'Failed to load quality trends')
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = async () => {
    try {
      setExportingCSV(true)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const token = localStorage.getItem('auth_token')

      const response = await fetch(
        `${API_BASE_URL}/admin/quality-trends/export?period=${period}&format=csv`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to export data')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `quality-trends-${period}-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success('Quality trends exported to CSV')

    } catch (error: any) {
      console.error('Failed to export CSV:', error)
      toast.error(error.message || 'Failed to export data')
    } finally {
      setExportingCSV(false)
    }
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getQualityBadge = (quality: number) => {
    if (quality >= 90) return <Badge className="bg-green-600">Excellent</Badge>
    if (quality >= 80) return <Badge className="bg-blue-600">Good</Badge>
    if (quality >= 70) return <Badge className="bg-yellow-600">Fair</Badge>
    return <Badge className="bg-red-600">Needs Improvement</Badge>
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading quality trends...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/admin')}
                        >
                          ← Back to Admin
                        </Button>
                      </div>
                      <h1 className="text-3xl font-bold flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-purple-500" />
                        Quality Trends Dashboard
                      </h1>
                      <p className="text-muted-foreground mt-2">
                        Monitor template quality performance and identify improvement opportunities
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Period Selector */}
                      <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px]">
                          <Calendar className="h-4 w-4 mr-2" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7days">Last 7 Days</SelectItem>
                          <SelectItem value="30days">Last 30 Days</SelectItem>
                          <SelectItem value="90days">Last 90 Days</SelectItem>
                          <SelectItem value="1year">Last Year</SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Export Button */}
                      <Button 
                        onClick={exportToCSV} 
                        disabled={exportingCSV}
                        variant="outline"
                      >
                        {exportingCSV ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Exporting...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Export CSV
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>

                {/* Summary Cards */}
                {summaryStats && (
                  <div className="grid grid-cols-4 gap-4">
                    <AnimatedCard>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Quality</p>
                            <p className="text-3xl font-bold mt-1">{Number(summaryStats.overall_avg_quality || 0)}%</p>
                          </div>
                          <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                            <Award className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                        <div className="mt-2">
                          {getQualityBadge(Number(summaryStats.overall_avg_quality || 0))}
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">SLA Compliance</p>
                            <p className="text-3xl font-bold mt-1">{Number(summaryStats.sla_compliance || 0)}%</p>
                          </div>
                          <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                            <Target className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                        <div className="mt-2">
                          <Badge variant={Number(summaryStats.sla_compliance || 0) >= 90 ? "default" : "destructive"}>
                            {Number(summaryStats.sla_compliance || 0) >= 90 ? '✅ On Track' : '⚠️ Below Target'}
                          </Badge>
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Audits</p>
                            <p className="text-3xl font-bold mt-1">{Number(summaryStats.total_audits || 0)}</p>
                          </div>
                          <div className="bg-purple-100 dark:bg-purple-900 p-3 rounded-full">
                            <FileText className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Last {String(period).replace('days', ' days').replace('year', ' year')}
                        </p>
                      </CardContent>
                    </AnimatedCard>

                    <AnimatedCard>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Templates with Issues</p>
                            <p className="text-3xl font-bold mt-1 text-orange-600">{Number(summaryStats.templates_with_issues || 0)}</p>
                          </div>
                          <div className="bg-orange-100 dark:bg-orange-900 p-3 rounded-full">
                            <TriangleAlert className="h-6 w-6 text-orange-600" />
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          Require attention
                        </p>
                      </CardContent>
                    </AnimatedCard>
                  </div>
                )}

                {/* Quality Over Time Chart */}
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Quality Trends Over Time
                    </CardTitle>
                    <CardDescription>
                      Average document quality scores across all templates
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {trendsData.length > 0 ? (
                      <QualityTrendsChart data={trendsData} />
                    ) : (
                      <div className="text-center py-12">
                        <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          No quality data available for the selected period
                        </p>
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>

                {/* Template Performance Table */}
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Template Performance
                    </CardTitle>
                    <CardDescription>
                      Quality metrics by template with trend indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {templatePerformance.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-5 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                          <div>Template</div>
                          <div className="text-center">Framework</div>
                          <div className="text-center">Avg Quality</div>
                          <div className="text-center">Documents</div>
                          <div className="text-center">Trend</div>
                        </div>
                        {templatePerformance.map((template) => (
                          <div
                            key={template.template_id}
                            className="grid grid-cols-5 gap-4 items-center p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <Link 
                                href={`/templates/${template.template_id}`}
                                className="font-medium text-sm text-primary hover:underline"
                              >
                                {String(template.template_name || 'Unknown Template')}
                              </Link>
                              <p className="text-xs text-muted-foreground">{String(template.template_id).substring(0, 8)}...</p>
                            </div>
                            <div className="text-center">
                              <Badge variant="outline">{String(template.framework || 'N/A')}</Badge>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-bold text-lg">{Number(template.avg_quality || 0)}%</span>
                                {getQualityBadge(Number(template.avg_quality || 0))}
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="font-medium">{Number(template.document_count || 0)}</span>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-1">
                                {getTrendIcon(template.trend)}
                                <span className={`text-sm font-medium ${
                                  template.trend === 'up' ? 'text-green-600' : 
                                  template.trend === 'down' ? 'text-red-600' : 
                                  'text-gray-600'
                                }`}>
                                  {(template.trend_percentage || 0) > 0 ? '+' : ''}{template.trend_percentage || 0}%
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          No template performance data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>

                {/* Provider Performance */}
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      AI Provider Performance
                    </CardTitle>
                    <CardDescription>
                      Quality scores by AI provider and model
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {providerPerformance.length > 0 ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground border-b pb-2">
                          <div>Provider / Model</div>
                          <div className="text-center">Avg Quality</div>
                          <div className="text-center">Documents</div>
                          <div className="text-center">Avg Cost</div>
                        </div>
                        {providerPerformance.map((provider, idx) => (
                          <div
                            key={idx}
                            className="grid grid-cols-4 gap-4 items-center p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div>
                              <p className="font-medium text-sm">{String(provider.provider || 'Unknown')}</p>
                              <p className="text-xs text-muted-foreground">{String(provider.model || 'N/A')}</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-bold text-lg">{Number(provider.avg_quality || 0)}%</span>
                                {getQualityBadge(Number(provider.avg_quality || 0))}
                              </div>
                            </div>
                            <div className="text-center">
                              <span className="font-medium">{Number(provider.document_count || 0)}</span>
                            </div>
                            <div className="text-center">
                              <span className="font-medium">${parseFloat(provider.avg_cost || 0).toFixed(4)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">
                          No provider performance data available
                        </p>
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>

              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}


