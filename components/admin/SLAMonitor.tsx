'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  TrendingDown,
  RefreshCw,
  Calendar,
  FileText,
  Shield,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface SLAViolation {
  template_id: string
  template_name: string
  framework: string
  current_quality: number
  threshold: number
  violation_count: number
  last_violation: string
}

interface SLAStatus {
  overall_compliance: number
  thresholds: {
    critical: number
    warning: number
  }
  violations: SLAViolation[]
  trend: Array<{
    date: string
    total: number
    compliant: number
    compliance_rate: number
  }>
  status: 'compliant' | 'warning' | 'critical'
}

export function SLAMonitor() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [slaStatus, setSLAStatus] = useState<SLAStatus | null>(null)

  useEffect(() => {
    fetchSLAStatus()
  }, [])

  const fetchSLAStatus = async () => {
    try {
      setLoading(true)

      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
      const token = localStorage.getItem('auth_token')

      const response = await fetch(
        `${API_BASE_URL}/admin/sla-status`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch SLA status')
      }

      const data = await response.json()
      setSLAStatus(data)

    } catch (error: any) {
      console.error('Failed to fetch SLA status:', error)
      toast.error(error.message || 'Failed to load SLA status')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    fetchSLAStatus()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-600">✅ Compliant</Badge>
      case 'warning':
        return <Badge className="bg-yellow-600">⚠️ Warning</Badge>
      case 'critical':
        return <Badge className="bg-red-600">🚨 Critical</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 90) return 'text-green-600'
    if (compliance >= 75) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!slaStatus) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load SLA status</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overall Status Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-600" />
              <CardTitle>SLA Compliance Status</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {getStatusBadge(slaStatus.status)}
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          <CardDescription>
            Quality SLA monitoring - Last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Compliance */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950 dark:to-blue-950 rounded-lg p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Overall SLA Compliance</p>
                <div className={`text-5xl font-bold ${getComplianceColor(slaStatus.overall_compliance)}`}>
                  {slaStatus.overall_compliance}%
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-full p-4">
                <Shield className="h-12 w-12 text-purple-600" />
              </div>
            </div>
            <Progress 
              value={slaStatus.overall_compliance} 
              className="h-3"
            />
            <div className="mt-3 text-sm text-muted-foreground">
              Target: {slaStatus.thresholds.critical}% of documents above quality threshold
            </div>
          </div>

          <Separator />

          {/* SLA Thresholds */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium text-red-900 dark:text-red-100">Critical Threshold</p>
              </div>
              <p className="text-3xl font-bold text-red-600">{slaStatus.thresholds.critical}%</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                Documents must exceed this quality score
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">Warning Threshold</p>
              </div>
              <p className="text-3xl font-bold text-yellow-600">{slaStatus.thresholds.warning}%</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Warning issued if quality falls below
              </p>
            </div>
          </div>

          {/* Violations */}
          {slaStatus.violations.length > 0 ? (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Active SLA Violations ({slaStatus.violations.length})
              </h4>
              <div className="space-y-3">
                {slaStatus.violations.map((violation) => (
                  <Alert key={violation.template_id} variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center justify-between">
                      <span>{violation.template_name}</span>
                      <Badge variant="outline">{violation.framework}</Badge>
                    </AlertTitle>
                    <AlertDescription>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-xs text-muted-foreground">Current Quality</p>
                          <p className="text-2xl font-bold text-red-600">{violation.current_quality}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Below Threshold</p>
                          <p className="text-2xl font-bold">-{violation.threshold - violation.current_quality}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Violations (24h)</p>
                          <p className="text-2xl font-bold">{violation.violation_count}</p>
                        </div>
                      </div>
                      <p className="text-xs mt-2">
                        Last violation: {new Date(violation.last_violation).toLocaleString()}
                      </p>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          ) : (
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-900 dark:text-green-100">No Active Violations</AlertTitle>
              <AlertDescription className="text-green-800 dark:text-green-200">
                All templates are meeting SLA requirements. Keep up the good work!
              </AlertDescription>
            </Alert>
          )}

          {/* Compliance Trend */}
          {slaStatus.trend.length > 0 && (
            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                7-Day Compliance Trend
              </h4>
              <div className="space-y-2">
                {slaStatus.trend.map((day) => (
                  <div key={day.date} className="flex items-center gap-3 p-2 bg-muted/30 rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium">{new Date(day.date).toLocaleDateString()}</div>
                      <div className="text-xs text-muted-foreground">{day.compliant} / {day.total} compliant</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={day.compliance_rate} className="w-24 h-2" />
                      <span className={`text-sm font-bold ${getComplianceColor(day.compliance_rate)}`}>
                        {day.compliance_rate}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {slaStatus.violations.length > 0 ? (
            <div className="space-y-3">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Immediate Actions Required</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
                    <li>Review templates with quality violations</li>
                    <li>Check for recent changes that may have caused regression</li>
                    <li>Apply AI-generated template optimizations</li>
                    <li>Update system prompts or template content</li>
                    <li>Run quality audits on recently generated documents</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-600" />
              <p className="text-sm text-muted-foreground">
                No immediate actions required. All templates are meeting SLA requirements.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

