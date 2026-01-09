"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { apiClient } from "@/lib/api"
import { getApiUrl } from "@/lib/api-url"
import { toast } from "sonner"
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  Filter,
  Download,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  DollarSign,
  Users,
  FileText,
} from "lucide-react"
import { useRouter } from "next/navigation"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"

interface Risk {
  id: string
  title: string
  description: string
  category: string
  probability: string
  impact: string
  risk_level: string
  status: string
  mitigation_strategy?: string
  contingency_plan?: string
  owner?: string
  project_id?: string
  project_name?: string
  program_id?: string
  program_name?: string
  financial_impact?: number
  schedule_impact_days?: number
  exceeds_threshold?: boolean
  cross_program?: boolean
  systemic_risk?: boolean
  last_review_date?: string
  monthly_review_status?: string
  next_review_due_date?: string
  mitigation_plan_count?: number
  completed_mitigation_count?: number
  avg_mitigation_completion?: number
  overall_mitigation_completion?: number
  related_issues_count?: number
  active_related_issues_count?: number
  // Document source tracking
  source_document_id?: string
  source_document_name?: string
  risk_origin?: string
  created_at: string
  updated_at: string
}

interface MitigationPlan {
  risk_id: string
  risk_title: string
  risk_category: string
  probability: string
  impact: string
  risk_status: string
  mitigation_plan_id: string
  mitigation_title: string
  action_type: string
  mitigation_status: string
  completion_percentage: number
  mitigation_priority: string
  expected_effectiveness?: number
  owner_name?: string
  assigned_to_name?: string
  planned_start_date?: string
  planned_completion_date?: string
  actual_start_date?: string
  actual_completion_date?: string
  due_date?: string
  is_overdue: boolean
  mitigation_created_at: string
  mitigation_updated_at: string
}

interface RiskSummary {
  program_id?: string
  program_name?: string
  total_risks: number
  critical_risks: number
  high_risks: number
  medium_risks: number
  low_risks: number
  open_risks: number
  mitigated_risks: number
  closed_risks: number
  systemic_risks: number
  cross_program_risks: number
  portfolio_level_risks: number
  systemic_level_risks: number
  total_financial_exposure: number
  avg_probability_score: number
  overdue_reviews: number
  risks_needing_review: number
  risks_exceeding_threshold: number
  total_mitigation_plans: number
  completed_mitigation_plans: number
  avg_mitigation_completion: number
}

interface ReviewCompliance {
  program_id?: string
  program_name?: string
  review_month: string
  total_active_risks: number
  reviewed_this_month: number
  not_reviewed_this_month: number
  never_reviewed: number
  overdue_reviews: number
  completed_reviews: number
  pending_reviews: number
  compliance_percentage: number
  compliance_status: string
}

const SEVERITY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
}

const STATUS_COLORS = {
  identified: '#6b7280',
  assessed: '#3b82f6',
  mitigated: '#22c55e',
  accepted: '#f59e0b',
  transferred: '#8b5cf6',
  closed: '#9ca3af',
}

export default function RisksPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { isConnected } = useWebSocket()

  const [activeTab, setActiveTab] = useState<"registry" | "mitigation" | "summary" | "compliance">("registry")
  
  // Registry data
  const [risks, setRisks] = useState<Risk[]>([])
  const [loadingRisks, setLoadingRisks] = useState(false)
  
  // Mitigation report data
  const [mitigationPlans, setMitigationPlans] = useState<MitigationPlan[]>([])
  const [loadingMitigation, setLoadingMitigation] = useState(false)
  
  // Summary data
  const [summary, setSummary] = useState<RiskSummary[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)
  
  // Compliance data
  const [compliance, setCompliance] = useState<ReviewCompliance[]>([])
  const [loadingCompliance, setLoadingCompliance] = useState(false)
  
  // Filters
  const [projectFilter, setProjectFilter] = useState<string>("")
  const [programFilter, setProgramFilter] = useState<string>("")
  const [riskLevelFilter, setRiskLevelFilter] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [overdueOnly, setOverdueOnly] = useState(false)

  // Fetch risk registry
  const fetchRiskRegistry = async () => {
    try {
      setLoadingRisks(true)
      const params = new URLSearchParams()
      
      if (projectFilter) params.append('project_id', projectFilter)
      if (programFilter) params.append('program_id', programFilter)
      if (riskLevelFilter) params.append('risk_level', riskLevelFilter)
      if (statusFilter) params.append('status', statusFilter)
      
      const response = await fetch(`${getApiUrl('/risks/registry')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch risk registry')
      
      const data = await response.json()
      setRisks(data.data || [])
    } catch (error) {
      console.error("Failed to fetch risk registry:", error)
      toast.error("Failed to load risk registry")
    } finally {
      setLoadingRisks(false)
    }
  }

  // Fetch mitigation report
  const fetchMitigationReport = async () => {
    try {
      setLoadingMitigation(true)
      const params = new URLSearchParams()
      
      if (projectFilter) params.append('project_id', projectFilter)
      if (programFilter) params.append('program_id', programFilter)
      if (statusFilter) params.append('status', statusFilter)
      if (overdueOnly) params.append('overdue_only', 'true')
      
      const response = await fetch(`${getApiUrl('/risks/report')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch mitigation report')
      
      const data = await response.json()
      setMitigationPlans(data.data || [])
    } catch (error) {
      console.error("Failed to fetch mitigation report:", error)
      toast.error("Failed to load mitigation report")
    } finally {
      setLoadingMitigation(false)
    }
  }

  // Fetch risk summary
  const fetchRiskSummary = async () => {
    try {
      setLoadingSummary(true)
      const params = new URLSearchParams()
      
      if (programFilter) params.append('program_id', programFilter)
      
      const response = await fetch(`${getApiUrl('/risks/summary')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch risk summary')
      
      const data = await response.json()
      setSummary(data.data || [])
    } catch (error) {
      console.error("Failed to fetch risk summary:", error)
      toast.error("Failed to load risk summary")
    } finally {
      setLoadingSummary(false)
    }
  }

  // Fetch review compliance
  const fetchReviewCompliance = async () => {
    try {
      setLoadingCompliance(true)
      const params = new URLSearchParams()
      
      if (programFilter) params.append('program_id', programFilter)
      
      const response = await fetch(`${getApiUrl('/risks/review-compliance')}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      
      if (!response.ok) throw new Error('Failed to fetch review compliance')
      
      const data = await response.json()
      setCompliance(data.data || [])
    } catch (error) {
      console.error("Failed to fetch review compliance:", error)
      toast.error("Failed to load review compliance")
    } finally {
      setLoadingCompliance(false)
    }
  }

  useEffect(() => {
    if (activeTab === "registry") {
      fetchRiskRegistry()
    } else if (activeTab === "mitigation") {
      fetchMitigationReport()
    } else if (activeTab === "summary") {
      fetchRiskSummary()
    } else if (activeTab === "compliance") {
      fetchReviewCompliance()
    }
  }, [activeTab, projectFilter, programFilter, riskLevelFilter, statusFilter, overdueOnly])

  if (authLoading) {
    return <div>Loading...</div>
  }

  const overallSummary = summary.length > 0 ? summary.reduce((acc, s) => ({
    total_risks: acc.total_risks + s.total_risks,
    critical_risks: acc.critical_risks + s.critical_risks,
    high_risks: acc.high_risks + s.high_risks,
    medium_risks: acc.medium_risks + s.medium_risks,
    low_risks: acc.low_risks + s.low_risks,
    total_financial_exposure: acc.total_financial_exposure + (s.total_financial_exposure || 0),
    overdue_reviews: acc.overdue_reviews + s.overdue_reviews,
    risks_exceeding_threshold: acc.risks_exceeding_threshold + s.risks_exceeding_threshold,
    total_mitigation_plans: acc.total_mitigation_plans + s.total_mitigation_plans,
    completed_mitigation_plans: acc.completed_mitigation_plans + s.completed_mitigation_plans,
    avg_mitigation_completion: acc.avg_mitigation_completion + s.avg_mitigation_completion,
  }), {
    total_risks: 0,
    critical_risks: 0,
    high_risks: 0,
    medium_risks: 0,
    low_risks: 0,
    total_financial_exposure: 0,
    overdue_reviews: 0,
    risks_exceeding_threshold: 0,
    total_mitigation_plans: 0,
    completed_mitigation_plans: 0,
    avg_mitigation_completion: 0,
  }) : null

  const severityData = overallSummary ? [
    { name: 'Critical', value: overallSummary.critical_risks, color: SEVERITY_COLORS.critical },
    { name: 'High', value: overallSummary.high_risks, color: SEVERITY_COLORS.high },
    { name: 'Medium', value: overallSummary.medium_risks, color: SEVERITY_COLORS.medium },
    { name: 'Low', value: overallSummary.low_risks, color: SEVERITY_COLORS.low },
  ].filter(item => item.value > 0) : []

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-3xl font-bold">Risk Registry & Reporting</h1>
                    <p className="text-muted-foreground mt-1">
                      Comprehensive risk management with mitigation tracking
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => {
                      if (activeTab === "registry") fetchRiskRegistry()
                      else if (activeTab === "mitigation") fetchMitigationReport()
                      else if (activeTab === "summary") fetchRiskSummary()
                      else if (activeTab === "compliance") fetchReviewCompliance()
                    }}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>

                {/* Summary Cards */}
                {overallSummary && (
                  <AnimatedGrid cols={4}>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Total Risks</p>
                              <p className="text-2xl font-bold">{overallSummary.total_risks}</p>
                            </div>
                            <Shield className="h-8 w-8 text-muted-foreground" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Critical Risks</p>
                              <p className="text-2xl font-bold text-red-500">{overallSummary.critical_risks}</p>
                            </div>
                            <AlertTriangle className="h-8 w-8 text-red-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Mitigation Plans</p>
                              <p className="text-2xl font-bold">{overallSummary.total_mitigation_plans}</p>
                            </div>
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                    <AnimatedGridItem>
                      <Card>
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">Avg Completion</p>
                              <p className="text-2xl font-bold">
                                {overallSummary.total_mitigation_plans > 0
                                  ? Math.round(overallSummary.avg_mitigation_completion / summary.length)
                                  : 0}%
                              </p>
                            </div>
                            <TrendingUp className="h-8 w-8 text-blue-500" />
                          </div>
                        </CardContent>
                      </Card>
                    </AnimatedGridItem>
                  </AnimatedGrid>
                )}

                {/* Charts */}
                {severityData.length > 0 && (
                  <div className="grid grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Risks by Severity</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={severityData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, value }) => `${name}: ${value}`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {severityData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                    {overallSummary && overallSummary.total_financial_exposure > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Financial Exposure</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-center h-[300px]">
                            <div className="text-center">
                              <p className="text-4xl font-bold text-red-500">
                                ${(overallSummary.total_financial_exposure / 1000).toFixed(1)}K
                              </p>
                              <p className="text-muted-foreground mt-2">Total Financial Exposure</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                {/* Filters */}
                <Card>
                  <CardHeader>
                    <CardTitle>Filters</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-4">
                      <Select value={riskLevelFilter || "all"} onValueChange={(v: string) => setRiskLevelFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Risk Level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Levels</SelectItem>
                          <SelectItem value="project">Project</SelectItem>
                          <SelectItem value="program">Program</SelectItem>
                          <SelectItem value="portfolio">Portfolio</SelectItem>
                          <SelectItem value="systemic">Systemic</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={statusFilter || "all"} onValueChange={(v: string) => setStatusFilter(v === "all" ? "" : v)}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="identified">Identified</SelectItem>
                          <SelectItem value="assessed">Assessed</SelectItem>
                          <SelectItem value="mitigated">Mitigated</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="transferred">Transferred</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      {activeTab === "mitigation" && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="overdue-only"
                            checked={overdueOnly}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOverdueOnly(e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor="overdue-only">Overdue Only</Label>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as any)}>
                  <TabsList>
                    <TabsTrigger value="registry">Risk Registry</TabsTrigger>
                    <TabsTrigger value="mitigation">Mitigation Report</TabsTrigger>
                    <TabsTrigger value="summary">Risk Summary</TabsTrigger>
                    <TabsTrigger value="compliance">Review Compliance</TabsTrigger>
                  </TabsList>

                  {/* Risk Registry Tab */}
                  <TabsContent value="registry" className="space-y-4">
                    {loadingRisks ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">Loading risk registry...</div>
                        </CardContent>
                      </Card>
                    ) : risks.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No risks found</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {risks.map((risk) => {
                          const severity = risk.probability === 'high' && risk.impact === 'high' ? 'critical' :
                                          risk.probability === 'high' || risk.impact === 'high' ? 'high' :
                                          risk.probability === 'medium' && risk.impact === 'medium' ? 'medium' : 'low'
                          return (
                            <Card key={risk.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="pt-6">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <Badge style={{ backgroundColor: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] }}>
                                        {severity}
                                      </Badge>
                                      <Badge variant="outline">{risk.risk_level}</Badge>
                                      <Badge variant="outline">{risk.status}</Badge>
                                      {risk.exceeds_threshold && (
                                        <Badge variant="destructive">Exceeds Threshold</Badge>
                                      )}
                                      {risk.cross_program && (
                                        <Badge variant="outline">Cross-Program</Badge>
                                      )}
                                      {risk.systemic_risk && (
                                        <Badge variant="outline">Systemic</Badge>
                                      )}
                                      <h3 className="font-semibold text-lg">{risk.title}</h3>
                                    </div>
                                    <p className="text-muted-foreground mb-3">{risk.description}</p>
                                    {/* Document Source */}
                                    {risk.source_document_id && (
                                      <div className="mb-3 flex items-center gap-2">
                                        <Badge variant="secondary" className="text-xs">
                                          <FileText className="h-3 w-3 mr-1" />
                                          Extracted from:
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-auto p-1 text-xs text-blue-600 hover:text-blue-700"
                                          onClick={() => {
                                            if (risk.project_id && risk.source_document_id) {
                                              router.push(`/projects/${risk.project_id}/documents/${risk.source_document_id}`);
                                            }
                                          }}
                                          title={`View source document: ${risk.source_document_name || 'Document'}`}
                                        >
                                          <FileText className="h-3 w-3 mr-1" />
                                          <span className="max-w-[200px] truncate">
                                            {risk.source_document_name || 'View Document'}
                                          </span>
                                        </Button>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <span className="font-medium">Probability: </span>
                                        <span>{risk.probability}</span>
                                      </div>
                                      <div>
                                        <span className="font-medium">Impact: </span>
                                        <span>{risk.impact}</span>
                                      </div>
                                      {risk.financial_impact && (
                                        <div>
                                          <span className="font-medium">Financial: </span>
                                          <span>${(risk.financial_impact / 1000).toFixed(1)}K</span>
                                        </div>
                                      )}
                                      {risk.schedule_impact_days && (
                                        <div>
                                          <span className="font-medium">Schedule: </span>
                                          <span>{risk.schedule_impact_days} days</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                                      {risk.mitigation_plan_count !== undefined && (
                                        <span>
                                          Mitigation Plans: {risk.completed_mitigation_count}/{risk.mitigation_plan_count}
                                          {risk.overall_mitigation_completion !== undefined && (
                                            <span className="ml-2">
                                              ({risk.overall_mitigation_completion}% complete)
                                            </span>
                                          )}
                                        </span>
                                      )}
                                      {risk.related_issues_count !== undefined && risk.related_issues_count > 0 && (
                                        <span>
                                          Related Issues: {risk.active_related_issues_count}/{risk.related_issues_count}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </TabsContent>

                  {/* Mitigation Report Tab */}
                  <TabsContent value="mitigation" className="space-y-4">
                    {loadingMitigation ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">Loading mitigation report...</div>
                        </CardContent>
                      </Card>
                    ) : mitigationPlans.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No mitigation plans found</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {mitigationPlans.map((plan) => (
                          <Card key={plan.mitigation_plan_id} className="hover:shadow-md transition-shadow">
                            <CardContent className="pt-6">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <Badge>{plan.mitigation_priority}</Badge>
                                    <Badge variant="outline">{plan.mitigation_status}</Badge>
                                    <Badge variant="outline">{plan.action_type}</Badge>
                                    {plan.is_overdue && (
                                      <Badge variant="destructive">Overdue</Badge>
                                    )}
                                    <h3 className="font-semibold">{plan.mitigation_title}</h3>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    Risk: {plan.risk_title}
                                  </p>
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                                    <div>
                                      <span className="font-medium">Completion: </span>
                                      <span>{plan.completion_percentage}%</span>
                                    </div>
                                    {plan.expected_effectiveness && (
                                      <div>
                                        <span className="font-medium">Effectiveness: </span>
                                        <span>{plan.expected_effectiveness}%</span>
                                      </div>
                                    )}
                                    {plan.due_date && (
                                      <div>
                                        <span className="font-medium">Due: </span>
                                        <span>{new Date(plan.due_date).toLocaleDateString()}</span>
                                      </div>
                                    )}
                                    {plan.owner_name && (
                                      <div>
                                        <span className="font-medium">Owner: </span>
                                        <span>{plan.owner_name}</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className="bg-blue-600 h-2 rounded-full transition-all"
                                      style={{ width: `${plan.completion_percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Risk Summary Tab */}
                  <TabsContent value="summary" className="space-y-4">
                    {loadingSummary ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">Loading risk summary...</div>
                        </CardContent>
                      </Card>
                    ) : summary.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No summary data available</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {summary.map((s) => (
                          <Card key={s.program_id || 'overall'}>
                            <CardHeader>
                              <CardTitle>{s.program_name || 'Overall Summary'}</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Risks</p>
                                  <p className="text-2xl font-bold">{s.total_risks}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Critical</p>
                                  <p className="text-2xl font-bold text-red-500">{s.critical_risks}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">High</p>
                                  <p className="text-2xl font-bold text-orange-500">{s.high_risks}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Mitigation Plans</p>
                                  <p className="text-2xl font-bold">{s.total_mitigation_plans}</p>
                                </div>
                                {s.total_financial_exposure > 0 && (
                                  <div>
                                    <p className="text-sm text-muted-foreground">Financial Exposure</p>
                                    <p className="text-2xl font-bold">
                                      ${(s.total_financial_exposure / 1000).toFixed(1)}K
                                    </p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-sm text-muted-foreground">Avg Completion</p>
                                  <p className="text-2xl font-bold">
                                    {Math.round(s.avg_mitigation_completion)}%
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Overdue Reviews</p>
                                  <p className="text-2xl font-bold text-red-500">{s.overdue_reviews}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Exceeds Threshold</p>
                                  <p className="text-2xl font-bold text-red-500">{s.risks_exceeding_threshold}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* Review Compliance Tab */}
                  <TabsContent value="compliance" className="space-y-4">
                    {loadingCompliance ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">Loading compliance data...</div>
                        </CardContent>
                      </Card>
                    ) : compliance.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No compliance data available</p>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {compliance.map((c) => (
                          <Card key={c.program_id || 'overall'}>
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <CardTitle>{c.program_name || 'Overall Compliance'}</CardTitle>
                                <Badge
                                  variant={
                                    c.compliance_status === 'compliant' ? 'default' :
                                    c.compliance_status === 'mostly-compliant' ? 'secondary' :
                                    c.compliance_status === 'overdue' ? 'destructive' : 'outline'
                                  }
                                >
                                  {c.compliance_status.replace('-', ' ')}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Active Risks</p>
                                  <p className="text-2xl font-bold">{c.total_active_risks}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Reviewed This Month</p>
                                  <p className="text-2xl font-bold text-green-500">{c.reviewed_this_month}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Overdue Reviews</p>
                                  <p className="text-2xl font-bold text-red-500">{c.overdue_reviews}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Compliance Rate</p>
                                  <p className="text-2xl font-bold">
                                    {Number(c.compliance_percentage || 0).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <div className="mt-4 w-full bg-gray-200 rounded-full h-4">
                                <div
                                  className={`h-4 rounded-full transition-all ${
                                    c.compliance_percentage >= 80 ? 'bg-green-500' :
                                    c.compliance_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${c.compliance_percentage}%` }}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}

