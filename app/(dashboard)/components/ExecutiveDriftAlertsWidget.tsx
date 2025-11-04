/**
 * Executive Drift Alerts Widget
 * TASK-744: Executive Dashboard Integration
 * 
 * Displays critical drift alerts, budget overruns, and positive drift opportunities
 * for executive visibility
 */

"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DriftAlert {
  id: string
  project_id: string
  project_name: string
  detection_type: string
  drift_severity: 'low' | 'medium' | 'high' | 'critical'
  drift_description: string
  drift_impact: string
  detection_date: string
  status: string
  document_title: string
  baseline_version: string
}

interface BudgetAlert {
  id: string
  project_id: string
  project_name: string
  drift_severity: 'low' | 'medium' | 'high' | 'critical'
  drift_description: string
  drift_impact: string
  budget: number
  cost_baseline: any
}

interface PositiveDriftOpportunity {
  id: string
  project_id: string
  project_name: string
  opportunity_type: string
  title: string
  description: string
  potential_value: string
  novelty_score: number
  patentability_score: number
  status: string
  created_at: string
}

interface ExecutiveSummary {
  drift_statistics: {
    total_drift: number
    critical_drift: number
    high_drift: number
    unaddressed_drift: number
    budget_overruns: number
    scope_creep: number
    schedule_delays: number
  }
  innovation_statistics: {
    total_opportunities: number
    patent_opportunities: number
    efficiency_improvements: number
    cost_savings: number
    avg_novelty_score: number
  }
  project_health: {
    total_projects: number
    active_projects: number
    projects_at_risk: number
  }
}

export function ExecutiveDriftAlertsWidget() {
  const router = useRouter()
  const [driftAlerts, setDriftAlerts] = useState<DriftAlert[]>([])
  const [budgetAlerts, setBudgetAlerts] = useState<BudgetAlert[]>([])
  const [opportunities, setOpportunities] = useState<PositiveDriftOpportunity[]>([])
  const [summary, setSummary] = useState<ExecutiveSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExecutiveDashboardData()
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchExecutiveDashboardData, 120000)
    return () => clearInterval(interval)
  }, [])

  const fetchExecutiveDashboardData = async () => {
    try {
      const [summaryData, alertsData, budgetData, opportunitiesData] = await Promise.all([
        fetch('/api/executive-dashboard/summary', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(r => r.json()),
        fetch('/api/executive-dashboard/drift-alerts?severity=critical&limit=5', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(r => r.json()),
        fetch('/api/executive-dashboard/budget-alerts', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(r => r.json()),
        fetch('/api/executive-dashboard/positive-drift', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }).then(r => r.json())
      ])

      setSummary(summaryData)
      setDriftAlerts(alertsData.alerts || [])
      setBudgetAlerts(budgetData.budget_alerts || [])
      setOpportunities(opportunitiesData.opportunities || [])
    } catch (error) {
      console.error('Failed to fetch executive dashboard data:', error)
      toast.error('Failed to load executive dashboard')
    } finally {
      setLoading(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'high':
        return 'text-orange-500 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'text-blue-500 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      default:
        return 'text-slate-500 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'medium':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      case 'low':
        return <Clock className="h-5 w-5 text-blue-500" />
      default:
        return <CheckCircle className="h-5 w-5 text-slate-500" />
    }
  }

  if (loading) {
    return (
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5" />
            <span>Executive Dashboard</span>
          </CardTitle>
          <CardDescription>Loading drift alerts and opportunities...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Drift Alerts Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className={`border-2 ${summary.drift_statistics.critical_drift > 0 ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="flex items-center space-x-2">
                    <AlertTriangle className={`h-4 w-4 ${summary.drift_statistics.critical_drift > 0 ? 'text-red-500' : 'text-slate-500'}`} />
                    <span>Drift Alerts</span>
                  </span>
                  {summary.drift_statistics.critical_drift > 0 && (
                    <Badge variant="destructive" className="animate-pulse">
                      {summary.drift_statistics.critical_drift} Critical
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Total Unresolved</span>
                    <span className="text-2xl font-bold">{summary.drift_statistics.total_drift}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-orange-500 font-semibold">{summary.drift_statistics.high_drift}</div>
                      <div className="text-slate-500">High</div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-500 font-semibold">{summary.drift_statistics.budget_overruns}</div>
                      <div className="text-slate-500">Budget</div>
                    </div>
                    <div className="text-center">
                      <div className="text-yellow-500 font-semibold">{summary.drift_statistics.scope_creep}</div>
                      <div className="text-slate-500">Scope</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Innovation Opportunities Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card className="border-2 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  <span>Opportunities</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Positive Drift</span>
                    <span className="text-2xl font-bold text-emerald-600">{summary.innovation_statistics.total_opportunities}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-emerald-600 font-semibold">{summary.innovation_statistics.patent_opportunities}</div>
                      <div className="text-slate-500">Patents</div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-600 font-semibold">{summary.innovation_statistics.efficiency_improvements}</div>
                      <div className="text-slate-500">Efficiency</div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-600 font-semibold">{summary.innovation_statistics.cost_savings}</div>
                      <div className="text-slate-500">Savings</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Project Health Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className={`border-2 ${summary.project_health.projects_at_risk > 0 ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10' : 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'}`}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center space-x-2">
                  <TrendingUp className={`h-4 w-4 ${summary.project_health.projects_at_risk > 0 ? 'text-orange-500' : 'text-blue-500'}`} />
                  <span>Project Health</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400">Active Projects</span>
                    <span className="text-2xl font-bold">{summary.project_health.active_projects}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-orange-500 font-semibold">{summary.project_health.projects_at_risk}</div>
                      <div className="text-slate-500">At Risk</div>
                    </div>
                    <div className="text-center">
                      <div className="text-blue-500 font-semibold">{summary.project_health.active_projects - summary.project_health.projects_at_risk}</div>
                      <div className="text-slate-500">Healthy</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Critical Drift Alerts */}
      {driftAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                    <span>Critical Drift Alerts</span>
                  </CardTitle>
                  <CardDescription>Issues requiring immediate attention</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/projects')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {driftAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                    onClick={() => router.push(`/projects/${alert.project_id}`)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${getSeverityColor(alert.drift_severity)} hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        {getSeverityIcon(alert.drift_severity)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                              {alert.project_name}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {alert.detection_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {alert.drift_description}
                          </p>
                          {alert.drift_impact && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                              Impact: {alert.drift_impact}
                            </p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-xs text-slate-500">
                            <span>Detected: {new Date(alert.detection_date).toLocaleDateString()}</span>
                            {alert.document_title && <span>Doc: {alert.document_title}</span>}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Budget Overrun Alerts */}
      {budgetAlerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <DollarSign className="h-5 w-5 text-red-500" />
                    <span>Budget Overrun Alerts</span>
                  </CardTitle>
                  <CardDescription>Projects exceeding budget baseline</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/portfolio')}
                >
                  Portfolio View
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {budgetAlerts.map((alert, index) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                    onClick={() => router.push(`/projects/${alert.project_id}`)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${getSeverityColor(alert.drift_severity)} hover:shadow-md`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <ArrowDownRight className="h-5 w-5 text-red-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-100 mb-1">
                            {alert.project_name}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {alert.drift_description}
                          </p>
                          {alert.budget && (
                            <div className="mt-2 text-xs text-slate-600 dark:text-slate-400">
                              Budget: ${alert.budget.toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Positive Drift Opportunities */}
      {opportunities.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Sparkles className="h-5 w-5 text-emerald-500" />
                    <span>Innovation Opportunities</span>
                  </CardTitle>
                  <CardDescription>Positive drift and efficiency improvements</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/projects')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {opportunities.map((opp, index) => (
                  <motion.div
                    key={opp.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ x: 4 }}
                    onClick={() => router.push(`/projects/${opp.project_id}`)}
                    className="p-4 rounded-lg border-2 border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 cursor-pointer hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="font-semibold text-slate-800 dark:text-slate-100">
                              {opp.title}
                            </p>
                            <Badge variant="outline" className="text-xs bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300">
                              {opp.opportunity_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                            {opp.project_name}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {opp.description}
                          </p>
                          {opp.potential_value && (
                            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              Value: {opp.potential_value}
                            </div>
                          )}
                          <div className="flex items-center space-x-3 mt-2">
                            {opp.novelty_score && (
                              <div className="text-xs text-slate-500">
                                Novelty: {(opp.novelty_score * 100).toFixed(0)}%
                              </div>
                            )}
                            {opp.patentability_score > 0 && (
                              <div className="text-xs text-slate-500">
                                Patent Potential: {(opp.patentability_score * 100).toFixed(0)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 text-slate-400 flex-shrink-0 ml-2" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* No Alerts State */}
      {driftAlerts.length === 0 && budgetAlerts.length === 0 && opportunities.length === 0 && (
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
                All Clear!
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                No critical alerts or drift detected at this time
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
