"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { 
  RadarChart, 
  Radar, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  CartesianGrid
} from "recharts"
import { 
  Users, 
  Code, 
  Briefcase, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Target,
  Zap,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Info
} from "lucide-react"
import { apiClient, type PMBOK8DomainAnalytics, type ProjectExtractionResults } from "@/lib/api"
import { toast } from '@/lib/notify'
import { Skeleton } from "@/components/ui/skeleton"

interface PMBOK8DomainDashboardProps {
  projectId: string
}

const DOMAIN_COLORS = {
  team: "#3b82f6", // Blue
  developmentApproach: "#8b5cf6", // Purple
  projectWork: "#10b981", // Green
  measurement: "#f59e0b", // Amber
  uncertainty: "#ef4444" // Red
}

const DOMAIN_ICONS = {
  team: Users,
  developmentApproach: Code,
  projectWork: Briefcase,
  measurement: TrendingUp,
  uncertainty: AlertTriangle
}

const DOMAIN_LABELS = {
  team: "Team Performance",
  developmentApproach: "Development Approach",
  projectWork: "Project Work",
  measurement: "Measurement",
  uncertainty: "Uncertainty"
}

export function PMBOK8DomainDashboard({ projectId }: PMBOK8DomainDashboardProps) {
  const [analytics, setAnalytics] = useState<PMBOK8DomainAnalytics | null>(null)
  const [extractionResults, setExtractionResults] = useState<ProjectExtractionResults | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const [analyticsData, extractionData] = await Promise.all([
        apiClient.getPMBOK8DomainAnalytics(projectId).catch(() => null),
        apiClient.request<ProjectExtractionResults>(`/project-data-extraction/results/${projectId}`).catch(() => null)
      ])
      
      setAnalytics(analyticsData)
      setExtractionResults(extractionData)
    } catch (error) {
      console.error('Failed to fetch PMBOK 8 domain data:', error)
      toast.error('Failed to load domain analytics')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [projectId])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!analytics && !extractionResults) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No PMBOK 8 Data Available</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Extract project entities to see PMBOK 8 Performance Domain analytics
          </p>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Prepare radar chart data
  const radarData = analytics ? [
    {
      domain: "Team",
      score: analytics.domains.team.health.score || 0,
      fullMark: 100
    },
    {
      domain: "Dev Approach",
      score: analytics.domains.developmentApproach.health.score || 0,
      fullMark: 100
    },
    {
      domain: "Project Work",
      score: analytics.domains.projectWork?.health?.score != null 
        ? analytics.domains.projectWork.health.score 
        : 0,
      fullMark: 100
    },
    {
      domain: "Measurement",
      score: analytics.domains.measurement.health.score || 0,
      fullMark: 100
    },
    {
      domain: "Uncertainty",
      score: analytics.domains.uncertainty.health.score || 0,
      fullMark: 100
    }
  ] : []

  // Prepare domain coverage data
  const coverageData = extractionResults ? [
    {
      name: "Team",
      value: extractionResults.pmbok8DomainCounts.team,
      color: DOMAIN_COLORS.team,
      covered: extractionResults.domainCoverage.team
    },
    {
      name: "Dev Approach",
      value: extractionResults.pmbok8DomainCounts.developmentApproach,
      color: DOMAIN_COLORS.developmentApproach,
      covered: extractionResults.domainCoverage.developmentApproach
    },
    {
      name: "Project Work",
      value: extractionResults.pmbok8DomainCounts.projectWork,
      color: DOMAIN_COLORS.projectWork,
      covered: extractionResults.domainCoverage.projectWork
    },
    {
      name: "Measurement",
      value: extractionResults.pmbok8DomainCounts.measurement,
      color: DOMAIN_COLORS.measurement,
      covered: extractionResults.domainCoverage.measurement
    },
    {
      name: "Uncertainty",
      value: extractionResults.pmbok8DomainCounts.uncertainty,
      color: DOMAIN_COLORS.uncertainty,
      covered: extractionResults.domainCoverage.uncertainty
    }
  ] : []

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'on_track':
      case 'managed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'needs_attention':
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'blocked':
      case 'inactive':
        return 'text-red-600 bg-red-50 border-red-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getInsights = () => {
    if (!analytics) return []
    
    const insights = []
    
    // Team domain insights
    if (analytics.domains.team.total_violations > 0) {
      insights.push({
        type: 'warning',
        domain: 'Team',
        message: `${analytics.domains.team.total_violations} team agreement violations detected. Review adherence and address root causes.`,
        icon: AlertTriangle,
        priority: 'high'
      })
    } else if (analytics.domains.team.avg_adherence_score && analytics.domains.team.avg_adherence_score >= 9) {
      insights.push({
        type: 'success',
        domain: 'Team',
        message: `Excellent team adherence score (${(Number(analytics.domains.team.avg_adherence_score) || 0).toFixed(1)}/10). Team agreements are well-followed.`,
        icon: CheckCircle2,
        priority: 'low'
      })
    }
    
    // Development approach insights
    if (analytics.domains.developmentApproach.avg_velocity && analytics.domains.developmentApproach.avg_velocity < 20) {
      insights.push({
        type: 'info',
        domain: 'Development Approach',
        message: `Low average velocity (${(Number(analytics.domains.developmentApproach.avg_velocity) || 0).toFixed(1)}). Consider process improvements or scope refinement.`,
        icon: Lightbulb,
        priority: 'medium'
      })
    } else if (analytics.domains.developmentApproach.avg_velocity && analytics.domains.developmentApproach.avg_velocity > 40) {
      insights.push({
        type: 'success',
        domain: 'Development Approach',
        message: `Strong velocity (${(Number(analytics.domains.developmentApproach.avg_velocity) || 0).toFixed(1)}). Team is delivering consistently.`,
        icon: Zap,
        priority: 'low'
      })
    }
    
    // Project work insights
    if (analytics.domains.projectWork?.workItems?.blocked_items && analytics.domains.projectWork.workItems.blocked_items > 0) {
      insights.push({
        type: 'warning',
        domain: 'Project Work',
        message: `${analytics.domains.projectWork.workItems.blocked_items} work items are blocked. Address blockers immediately to maintain momentum.`,
        icon: AlertTriangle,
        priority: 'high'
      })
    }
    
    if (analytics.domains.projectWork?.capacity?.avg_utilization && analytics.domains.projectWork.capacity.avg_utilization > 90) {
      insights.push({
        type: 'warning',
        domain: 'Project Work',
        message: `High capacity utilization (${(Number(analytics.domains.projectWork.capacity.avg_utilization) || 0).toFixed(1)}%). Risk of burnout. Consider resource allocation.`,
        icon: AlertTriangle,
        priority: 'medium'
      })
    }
    
    // Measurement insights
    if (analytics.domains.measurement.evm.avg_cpi && analytics.domains.measurement.evm.avg_cpi < 0.9) {
      insights.push({
        type: 'warning',
        domain: 'Measurement',
        message: `Cost Performance Index (CPI) is ${(Number(analytics.domains.measurement.evm.avg_cpi) || 0).toFixed(2)}. Budget overrun risk. Review cost controls.`,
        icon: TrendingUp,
        priority: 'high'
      })
    } else if (analytics.domains.measurement.evm.avg_cpi && analytics.domains.measurement.evm.avg_cpi > 1.1) {
      insights.push({
        type: 'info',
        domain: 'Measurement',
        message: `CPI is ${Number(analytics.domains.measurement.evm.avg_cpi).toFixed(2)}. Under budget. Consider reallocating savings.`,
        icon: TrendingUp,
        priority: 'low'
      })
    }
    
    if (analytics.domains.measurement.evm.avg_spi && analytics.domains.measurement.evm.avg_spi < 0.9) {
      insights.push({
        type: 'warning',
        domain: 'Measurement',
        message: `Schedule Performance Index (SPI) is ${Number(analytics.domains.measurement.evm.avg_spi).toFixed(2)}. Behind schedule. Review timeline.`,
        icon: Clock,
        priority: 'high'
      })
    }
    
    const measurementActuals = analytics.domains.measurement.actuals
    if (measurementActuals?.total_actuals > 0) {
      const scheduleVariance = measurementActuals.avg_schedule_variance_days ?? null
      if (scheduleVariance !== null && scheduleVariance < -1) {
        insights.push({
          type: 'warning',
          domain: 'Measurement',
          message: `Average schedule variance is ${scheduleVariance.toFixed(1)} days behind. Investigate delays in actual execution.`,
          icon: AlertTriangle,
          priority: 'high'
        })
      } else if (scheduleVariance !== null && scheduleVariance > 1) {
        insights.push({
          type: 'success',
          domain: 'Measurement',
          message: `Projects are ahead of schedule by ${scheduleVariance.toFixed(1)} days on average.`,
          icon: CheckCircle2,
          priority: 'low'
        })
      }

      if (measurementActuals.avg_cost_variance !== null && measurementActuals.avg_cost_variance < 0) {
        insights.push({
          type: 'warning',
          domain: 'Measurement',
          message: `Average cost variance is ${measurementActuals.avg_cost_variance.toFixed(0)} (over budget). Review spend controls.`,
          icon: AlertTriangle,
          priority: 'high'
        })
      }

      if (measurementActuals.avg_quality_score !== null) {
        if (measurementActuals.avg_quality_score < 7) {
          insights.push({
            type: 'warning',
            domain: 'Measurement',
            message: `Quality score averages ${measurementActuals.avg_quality_score.toFixed(1)}/10. Address defect and rework drivers.`,
            icon: AlertTriangle,
            priority: 'medium'
          })
        } else if (measurementActuals.avg_quality_score >= 8.5) {
          insights.push({
            type: 'success',
            domain: 'Measurement',
            message: `Quality holding strong at ${(measurementActuals.avg_quality_score).toFixed(1)}/10.`,
            icon: CheckCircle2,
            priority: 'low'
          })
        }
      }
    }

    // Uncertainty insights
    if (analytics.domains.uncertainty.realized_opportunities > 0) {
      insights.push({
        type: 'success',
        domain: 'Uncertainty',
        message: `${analytics.domains.uncertainty.realized_opportunities} opportunities realized. Great proactive management!`,
        icon: CheckCircle2,
        priority: 'low'
      })
    }
    
    if (analytics.domains.uncertainty.ineffective_responses > 0 && analytics.domains.uncertainty.total_risk_responses > 0) {
      const effectivenessRate = ((analytics.domains.uncertainty.effective_responses / analytics.domains.uncertainty.total_risk_responses) * 100).toFixed(0)
      if (parseFloat(effectivenessRate) < 50) {
        insights.push({
          type: 'warning',
          domain: 'Uncertainty',
          message: `Risk response effectiveness is ${effectivenessRate}%. Review and improve response strategies.`,
          icon: AlertTriangle,
          priority: 'medium'
        })
      }
    }
    
    // Sort by priority (high -> medium -> low)
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return insights.sort((a, b) => 
      priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
    )
  }

  const insights = getInsights()

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 bg-clip-text text-transparent">
            PMBOK 8 Performance Domains
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comprehensive analytics across all 5 performance domains
          </p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm" disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Overall Health Scorecard */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overall Health Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {typeof analytics.overallHealth.averageScore === 'number' && !isNaN(analytics.overallHealth.averageScore)
                    ? analytics.overallHealth.averageScore.toFixed(0)
                    : (Number(analytics.overallHealth.averageScore) || 0).toFixed(0)}
                </span>
                <span className="text-muted-foreground">/ 100</span>
              </div>
              <Progress 
                value={typeof analytics.overallHealth.averageScore === 'number' ? analytics.overallHealth.averageScore : Number(analytics.overallHealth.averageScore) || 0} 
                className="mt-3 h-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                {analytics.overallHealth.domainsCovered} of 5 domains covered
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Domain Coverage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {extractionResults?.pmbok8Total || 0}
                </span>
                <span className="text-muted-foreground">entities</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Across all PMBOK 8 domains
              </p>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">{insights.length}</span>
                <span className="text-muted-foreground">recommendations</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Actionable insights available
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Domain Health Radar Chart */}
      {analytics && radarData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Health Radar</CardTitle>
            <CardDescription>
              Visual overview of all 5 performance domains
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--muted-foreground))" opacity={0.3} />
                  <PolarAngleAxis 
                    dataKey="domain" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <PolarRadiusAxis 
                    angle={90} 
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  />
                  <Radar
                    name="Health Score"
                    dataKey="score"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.6}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Domain Cards Grid */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(analytics.domains).map(([key, domain]) => {
            const Icon = DOMAIN_ICONS[key as keyof typeof DOMAIN_ICONS]
            const color = DOMAIN_COLORS[key as keyof typeof DOMAIN_COLORS]
            const label = DOMAIN_LABELS[key as keyof typeof DOMAIN_LABELS]
            
            return (
              <Card key={key} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="h-5 w-5" style={{ color }} />
                      </div>
                      <CardTitle className="text-sm font-semibold">{label}</CardTitle>
                    </div>
                    <Badge className={getHealthColor(domain.health.status)}>
                      {domain.health.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Check if domain has data - for Development Approach, check total_approaches */}
                  {(() => {
                    const hasData = key === 'developmentApproach' 
                      ? (domain as any).total_approaches > 0
                      : domain.health.score !== null && domain.health.score !== undefined
                    
                    if (!hasData) {
                      return (
                        <div className="text-sm text-muted-foreground">
                          No data available
                        </div>
                      )
                    }
                    
                    return (
                      <>
                        {domain.health.score !== null && domain.health.score !== undefined ? (
                          <>
                            <div className="flex items-baseline gap-2">
                              <span className="text-3xl font-bold">
                                {typeof domain.health.score === 'number' && !isNaN(domain.health.score)
                                  ? domain.health.score.toFixed(0)
                                  : Number(domain.health.score) || 0}
                              </span>
                              <span className="text-muted-foreground text-sm">/ 100</span>
                            </div>
                            <Progress value={typeof domain.health.score === 'number' ? domain.health.score : Number(domain.health.score) || 0} className="h-2" />
                          </>
                        ) : key === 'developmentApproach' ? (
                          <div className="text-sm text-muted-foreground">
                            Approach configured (no performance metrics yet)
                          </div>
                        ) : null}
                      </>
                    )
                  })()}
                  
                  {/* Domain-specific metrics */}
                  <div className="pt-2 border-t space-y-1">
                    {key === 'team' && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Agreements:</span>
                          <span className="font-medium">{domain.total_agreements}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Adherence:</span>
                          <span className="font-medium">
                            {domain.avg_adherence_score != null && !isNaN(Number(domain.avg_adherence_score))
                              ? Number(domain.avg_adherence_score).toFixed(1)
                              : 'N/A'}/10
                          </span>
                        </div>
                      </>
                    )}
                    
                    {key === 'developmentApproach' && (
                      <>
                        {domain.approach && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Approach:</span>
                            <span className="font-medium">{domain.approach}</span>
                          </div>
                        )}
                        {domain.methodology && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Methodology:</span>
                            <span className="font-medium">{domain.methodology}</span>
                          </div>
                        )}
                        {domain.total_approaches > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Approaches:</span>
                            <span className="font-medium">{domain.total_approaches}</span>
                          </div>
                        )}
                        {domain.total_iterations != null && domain.total_iterations > 0 && (
                          <>
                            <div className="flex justify-between text-xs pt-1 border-t">
                              <span className="text-muted-foreground">Iterations:</span>
                              <span className="font-medium">{domain.total_iterations}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Completed:</span>
                              <span className="font-medium">{domain.completed_iterations ?? 0}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Avg Velocity:</span>
                              <span className="font-medium">
                                {domain.avg_velocity != null && !isNaN(Number(domain.avg_velocity))
                                  ? Number(domain.avg_velocity).toFixed(1)
                                  : 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                        {(!domain.total_iterations || domain.total_iterations === 0) && (
                          <div className="text-xs text-muted-foreground pt-1 border-t">
                            No iterations tracked yet
                          </div>
                        )}
                      </>
                    )}
                    
                    {key === 'projectWork' && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Work Items:</span>
                          <span className="font-medium">
                            {domain.workItems?.total_work_items ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Blocked:</span>
                          <span className="font-medium text-red-600">
                            {domain.workItems?.blocked_items ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">In Progress:</span>
                          <span className="font-medium">
                            {domain.workItems?.in_progress_items ?? 0}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Completed:</span>
                          <span className="font-medium">
                            {domain.workItems?.completed_items ?? 0}
                          </span>
                        </div>
                        {domain.capacity && (
                          <>
                            <div className="flex justify-between text-xs pt-1 border-t">
                              <span className="text-muted-foreground">Capacity Plans:</span>
                              <span className="font-medium">
                                {domain.capacity.total_capacity_plans ?? 0}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Avg Utilization:</span>
                              <span className="font-medium">
                                {domain.capacity.avg_utilization != null && !isNaN(Number(domain.capacity.avg_utilization))
                                  ? `${Number(domain.capacity.avg_utilization).toFixed(1)}%`
                                  : 'N/A'}
                              </span>
                            </div>
                          </>
                        )}
                      </>
                    )}
                    
                    {key === 'measurement' && (
                      <>
                        {domain.performance?.total_measurements != null && parseInt(domain.performance.total_measurements) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Measurements:</span>
                            <span className="font-medium">{domain.performance.total_measurements}</span>
                          </div>
                        )}
                        {domain.evm?.total_evm_records != null && parseInt(domain.evm.total_evm_records) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">EVM Records:</span>
                            <span className="font-medium">{domain.evm.total_evm_records}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs pt-1 border-t">
                          <span className="text-muted-foreground">CPI:</span>
                          <span className="font-medium">
                            {domain.evm?.avg_cpi != null && !isNaN(Number(domain.evm.avg_cpi)) 
                              ? Number(domain.evm.avg_cpi).toFixed(2) 
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">SPI:</span>
                          <span className="font-medium">
                            {domain.evm?.avg_spi != null && !isNaN(Number(domain.evm.avg_spi)) 
                              ? Number(domain.evm.avg_spi).toFixed(2) 
                              : 'N/A'}
                          </span>
                        </div>
                        {domain.performance?.on_track_count != null && parseInt(domain.performance.on_track_count) > 0 && (
                          <div className="flex justify-between text-xs pt-1 border-t">
                            <span className="text-muted-foreground">On Track:</span>
                            <span className="font-medium text-green-600">{domain.performance.on_track_count}</span>
                          </div>
                        )}
                        {domain.performance?.at_risk_count != null && parseInt(domain.performance.at_risk_count) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">At Risk:</span>
                            <span className="font-medium text-yellow-600">{domain.performance.at_risk_count}</span>
                          </div>
                        )}
                        {domain.performance?.off_track_count != null && parseInt(domain.performance.off_track_count) > 0 && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Off Track:</span>
                            <span className="font-medium text-red-600">{domain.performance.off_track_count}</span>
                          </div>
                        )}
                        {domain.actuals?.total_actuals ? (
                          <>
                            <div className="flex justify-between text-xs pt-1 border-t">
                              <span className="text-muted-foreground">Performance Actuals:</span>
                              <span className="font-medium">{domain.actuals.total_actuals}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Avg Schedule Var:</span>
                              <span className={`font-medium ${domain.actuals.avg_schedule_variance_days != null && domain.actuals.avg_schedule_variance_days < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {domain.actuals.avg_schedule_variance_days != null
                                  ? `${domain.actuals.avg_schedule_variance_days >= 0 ? '+' : ''}${domain.actuals.avg_schedule_variance_days.toFixed(1)}d`
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Avg Cost Var:</span>
                              <span className={`font-medium ${domain.actuals.avg_cost_variance != null && domain.actuals.avg_cost_variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {domain.actuals.avg_cost_variance != null
                                  ? `${domain.actuals.avg_cost_variance >= 0 ? '+' : ''}${domain.actuals.avg_cost_variance.toFixed(0)}`
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Avg Quality:</span>
                              <span className="font-medium">
                                {domain.actuals.avg_quality_score != null
                                  ? `${domain.actuals.avg_quality_score.toFixed(1)}/10`
                                  : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">Defects (total):</span>
                              <span className="font-medium text-red-600">{domain.actuals.total_defects ?? 0}</span>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground pt-1 border-t">
                            No performance actuals recorded
                          </div>
                        )}
                      </>
                    )}
                    
                    {key === 'uncertainty' && (
                      <>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Total Entities:</span>
                          <span className="font-medium">
                            {(domain.total_opportunities || 0) + (domain.total_risk_responses || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs pt-1 border-t">
                          <span className="text-muted-foreground">Opportunities:</span>
                          <span className="font-medium">{domain.total_opportunities || 0}</span>
                        </div>
                        {domain.realized_opportunities != null && parseInt(domain.realized_opportunities) > 0 && (
                          <div className="flex justify-between text-xs pl-4">
                            <span className="text-muted-foreground text-xs">Realized:</span>
                            <span className="font-medium text-green-600">{domain.realized_opportunities}</span>
                          </div>
                        )}
                        {domain.exploiting_opportunities != null && parseInt(domain.exploiting_opportunities) > 0 && (
                          <div className="flex justify-between text-xs pl-4">
                            <span className="text-muted-foreground text-xs">Exploiting:</span>
                            <span className="font-medium text-blue-600">{domain.exploiting_opportunities}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-xs pt-1 border-t">
                          <span className="text-muted-foreground">Risk Responses:</span>
                          <span className="font-medium">{domain.total_risk_responses || 0}</span>
                        </div>
                        {domain.effective_responses != null && parseInt(domain.effective_responses) > 0 && (
                          <div className="flex justify-between text-xs pl-4">
                            <span className="text-muted-foreground text-xs">Effective:</span>
                            <span className="font-medium text-green-600">{domain.effective_responses}</span>
                          </div>
                        )}
                        {domain.ineffective_responses != null && parseInt(domain.ineffective_responses) > 0 && (
                          <div className="flex justify-between text-xs pl-4">
                            <span className="text-muted-foreground text-xs">Ineffective:</span>
                            <span className="font-medium text-red-600">{domain.ineffective_responses}</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Domain Coverage Chart */}
      {extractionResults && coverageData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Domain Entity Coverage</CardTitle>
            <CardDescription>
              Number of entities extracted per performance domain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={coverageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fill: 'hsl(var(--foreground))', fontSize: 12 }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {coverageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights Panel */}
      {insights.length > 0 && (
        <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              Actionable Insights
            </CardTitle>
            <CardDescription>
              Recommendations based on your project's performance domain data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight, idx) => {
                const Icon = insight.icon
                const bgColor = 
                  insight.type === 'success' ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' :
                  insight.type === 'warning' ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800' :
                  'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
                
                const priorityBadge = insight.priority === 'high' ? '🔴 High' : 
                                     insight.priority === 'medium' ? '🟡 Medium' : 
                                     '🟢 Low'
                
                return (
                  <div 
                    key={idx}
                    className={`flex items-start gap-3 p-4 rounded-lg border-2 transition-all hover:shadow-md ${bgColor}`}
                  >
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'success' ? 'bg-green-100 dark:bg-green-900/30' :
                      insight.type === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <Icon className={`h-5 w-5 ${
                        insight.type === 'success' ? 'text-green-600 dark:text-green-400' :
                        insight.type === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-blue-600 dark:text-blue-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs font-semibold">
                          {insight.domain}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${
                            insight.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {priorityBadge}
                        </Badge>
                      </div>
                      <p className="text-sm font-medium leading-relaxed">{insight.message}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

