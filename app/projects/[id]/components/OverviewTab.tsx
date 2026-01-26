"use client"

import { Suspense, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Activity, 
  DollarSign, 
  Users, 
  FileText, 
  PieChart as PieChartIcon, 
  BarChart3, 
  Target,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  Layers,
  Gauge,
  Award,
  Database,
  Lightbulb,
  Calendar,
  Code,
  Settings,
  Lock
} from "lucide-react"
import dynamic from 'next/dynamic'

function ChartPlaceholder() {
  return <div className="h-80 min-h-[200px] w-full animate-pulse rounded bg-muted" aria-hidden="true" />
}

const GenericPieChart = dynamic(
  () => import('@/components/charts/RechartsWrappers').then((m) => m.GenericPieChart),
  { ssr: false, loading: ChartPlaceholder }
)
const MultiBarChart = dynamic(
  () => import('@/components/charts/RechartsWrappers').then((m) => m.MultiBarChart),
  { ssr: false, loading: ChartPlaceholder }
)
const SimpleLineChart = dynamic(
  () => import('@/components/charts/RechartsWrappers').then((m) => m.SimpleLineChart),
  { ssr: false, loading: ChartPlaceholder }
)
import { Project, apiClient } from "@/lib/api"
import { getApiUrl } from "@/lib/api-url"

interface Stakeholder {
  id: string
  engagement_approach: string
  stakeholder_type: 'internal' | 'external'
  is_team_member?: boolean
  [key: string]: any
}

interface DocumentStats {
  totalDocuments: number
  counts: {
    draft: number
    review: number
    published: number
    archived: number
  }
}

interface PMBOK8DomainMetrics {
  team: number
  developmentApproach: number
  projectWork: number
  measurement: number
  uncertainty: number
  stakeholders: number
  planning: number
  delivery: number
}

interface DocumentQualityMetrics {
  averageCompliance: number
  averageGrade: string
  totalAssessed: number
  dimensionAverages: {
    completeness: number
    structureScore: number
    formattingScore: number
    contentDepth: number
    accuracy: number
    consistency: number
    contextRelevance: number
    professionalQuality: number
    standardsCompliance: number
    complexityScore: number
  }
  gradeDistribution: {
    A: number
    B: number
    C: number
    D: number
    F: number
  }
}

interface IssueStats {
  total_issues: number
  open_issues: number
  critical_issues: number
  overdue_issues: number
}

interface OverviewTabProps {
  project: Project
  progress: number
  managerName: string
  documentStats: DocumentStats
  stakeholders: Stakeholder[]
  projectId: string
}

export function OverviewTab({ 
  project, 
  progress, 
  managerName, 
  documentStats, 
  stakeholders,
  projectId
}: OverviewTabProps) {
  const [pmbok8Metrics, setPmbok8Metrics] = useState<PMBOK8DomainMetrics | null>(null)
  const [qualityMetrics, setQualityMetrics] = useState<DocumentQualityMetrics | null>(null)
  const [issueStats, setIssueStats] = useState<IssueStats | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)
  const [additionalMetrics, setAdditionalMetrics] = useState<{
    aiExtractions: number
    lessonsCount: number
    performanceKpi: string | null
    stakeholdersCount: number
    teamAgreementsCount: number
    developmentApproachCount: number
    baselineDate: string | null
    financialsKpi: string | null
    timelineStartDate: string | null
    risksCount: number
    complianceSecurityCount: number
    integrationsCount: number
    digitalTwinsCount: number
    driftCount: number
    criticalDriftCount: number
  }>({
    aiExtractions: 0,
    lessonsCount: 0,
    performanceKpi: null,
    stakeholdersCount: 0,
    teamAgreementsCount: 0,
    developmentApproachCount: 0,
    baselineDate: null,
    financialsKpi: null,
    timelineStartDate: null,
    risksCount: 0,
    complianceSecurityCount: 0,
    integrationsCount: 0,
    digitalTwinsCount: 0,
    driftCount: 0,
    criticalDriftCount: 0,
  })

  // Calculate team members count from stakeholders
  const teamMembers = stakeholders.filter(s => 
    s.stakeholder_type === 'internal' && s.is_team_member === true
  )

  // Fetch PMBOK 8 domain metrics and document quality metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoadingMetrics(true)
        
        // Fetch PMBOK 8 domain metrics from extraction API
        const token = localStorage.getItem('auth_token')
        const extractionResponse = await fetch(getApiUrl(`/project-data-extraction/${projectId}/summary`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        let extractionData: any = null
        if (extractionResponse.ok) {
          extractionData = await extractionResponse.json()
          if (extractionData.success && extractionData.pmbok8DomainCounts) {
            setPmbok8Metrics({
              team: extractionData.pmbok8DomainCounts.team || 0,
              developmentApproach: extractionData.pmbok8DomainCounts.developmentApproach || 0,
              projectWork: extractionData.pmbok8DomainCounts.projectWork || 0,
              measurement: extractionData.pmbok8DomainCounts.measurement || 0,
              uncertainty: extractionData.pmbok8DomainCounts.uncertainty || 0,
              stakeholders: extractionData.entityCounts?.stakeholders || 0,
              planning: (extractionData.entityCounts?.milestones || 0) + (extractionData.entityCounts?.requirements || 0),
              delivery: (extractionData.entityCounts?.deliverables || 0) + (extractionData.entityCounts?.successCriteria || 0)
            })
          }
          
          // Set metrics from extraction data
          if (extractionData.success) {
            const entityCounts = extractionData.entityCounts || {}
            setAdditionalMetrics(prev => ({
              ...prev,
              aiExtractions: extractionData.totalEntities || 0,
              stakeholdersCount: entityCounts.stakeholders || stakeholders.length,
              teamAgreementsCount: entityCounts.teamAgreements || entityCounts.team_agreements || 0,
              developmentApproachCount: entityCounts.developmentApproaches || entityCounts.development_approaches || 0,
              risksCount: entityCounts.risks || 0,
              complianceSecurityCount: entityCounts.complianceSecurity || entityCounts.compliance_security || 0,
            }))
          }
        }

        // Fetch document quality metrics
        const documentsResponse = await apiClient.getProjectDocuments(projectId, { limit: 1000 })
        const documents = documentsResponse.documents || []
        
        let totalCompliance = 0
        let assessedCount = 0
        const grades: string[] = []
        
        // Aggregate all quality dimensions
        const dimensionSums = {
          completeness: 0,
          structureScore: 0,
          formattingScore: 0,
          contentDepth: 0,
          accuracy: 0,
          consistency: 0,
          contextRelevance: 0,
          professionalQuality: 0,
          standardsCompliance: 0,
          complexityScore: 0
        }

        documents.forEach((doc: any) => {
          const qualityMetrics = doc.generation_metadata?.qualityMetrics
          if (qualityMetrics) {
            // Use overallQuality as primary metric, fallback to standardsCompliance
            const overallQuality = qualityMetrics.overallQuality || qualityMetrics.standardsCompliance || 0
            if (overallQuality > 0) {
              totalCompliance += overallQuality
              assessedCount++
              
              // Determine grade
              if (overallQuality >= 90) grades.push('A')
              else if (overallQuality >= 80) grades.push('B')
              else if (overallQuality >= 70) grades.push('C')
              else if (overallQuality >= 60) grades.push('D')
              else grades.push('F')
              
              // Sum all dimensions
              dimensionSums.completeness += qualityMetrics.completeness || 0
              dimensionSums.structureScore += qualityMetrics.structureScore || 0
              dimensionSums.formattingScore += qualityMetrics.formattingScore || 0
              dimensionSums.contentDepth += qualityMetrics.contentDepth || 0
              dimensionSums.accuracy += qualityMetrics.accuracy || 0
              dimensionSums.consistency += qualityMetrics.consistency || 0
              dimensionSums.contextRelevance += qualityMetrics.contextRelevance || 0
              dimensionSums.professionalQuality += qualityMetrics.professionalQuality || 0
              dimensionSums.standardsCompliance += qualityMetrics.standardsCompliance || 0
              dimensionSums.complexityScore += qualityMetrics.complexityScore || 0
            }
          }
        })

        if (assessedCount > 0) {
          const avgCompliance = totalCompliance / assessedCount
          // Calculate average grade
          const gradeCounts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
          grades.forEach(g => gradeCounts[g]++)
          const avgGradeIndex = Math.round(avgCompliance / 20) // 0-4 scale
          const gradeOrder = ['F', 'D', 'C', 'B', 'A']
          const avgGrade = gradeOrder[Math.min(avgGradeIndex, 4)]

          // Calculate dimension averages
          const dimensionAverages = {
            completeness: Math.round(dimensionSums.completeness / assessedCount),
            structureScore: Math.round(dimensionSums.structureScore / assessedCount),
            formattingScore: Math.round(dimensionSums.formattingScore / assessedCount),
            contentDepth: Math.round(dimensionSums.contentDepth / assessedCount),
            accuracy: Math.round(dimensionSums.accuracy / assessedCount),
            consistency: Math.round(dimensionSums.consistency / assessedCount),
            contextRelevance: Math.round(dimensionSums.contextRelevance / assessedCount),
            professionalQuality: Math.round(dimensionSums.professionalQuality / assessedCount),
            standardsCompliance: Math.round(dimensionSums.standardsCompliance / assessedCount),
            complexityScore: Math.round(dimensionSums.complexityScore / assessedCount)
          }

          setQualityMetrics({
            averageCompliance: Math.round(avgCompliance),
            averageGrade: avgGrade,
            totalAssessed: assessedCount,
            dimensionAverages,
            gradeDistribution: gradeCounts
          })
        }

        // Fetch issue stats
        try {
          const issuesResponse = await fetch(getApiUrl(`/issues/stats/${projectId}`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
          if (issuesResponse.ok) {
            const issuesData = await issuesResponse.json()
            setIssueStats(issuesData.data || null)
          }
        } catch (error) {
          console.error('Failed to fetch issue stats:', error)
        }

        // Fetch additional metrics in parallel
        const [
          lessonsRes,
          baselinesRes,
          performanceRes,
          projectRes,
          projectIntegrationsRes,
          digitalTwinsRes,
          driftRes,
        ] = await Promise.allSettled([
          fetch(getApiUrl(`/lessons/projects/${projectId}/lessons`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(getApiUrl(`/baselines/project/${projectId}/active`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(getApiUrl(`/performance-actuals/${projectId}/summary`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(getApiUrl(`/projects/${projectId}`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(getApiUrl(`/projects/${projectId}/integrations`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(getApiUrl(`/digital-twin/assets?projectId=${projectId}`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
          fetch(getApiUrl(`/projects/${projectId}/drift-detections?limit=100`), {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          }),
        ])

        // Process lessons count
        if (lessonsRes.status === 'fulfilled' && lessonsRes.value.ok) {
          const lessonsData = await lessonsRes.value.json()
          setAdditionalMetrics(prev => ({
            ...prev,
            lessonsCount: lessonsData.data?.length || lessonsData.count || 0,
          }))
        }

        // Process baseline date
        if (baselinesRes.status === 'fulfilled' && baselinesRes.value.ok) {
          const baselineData = await baselinesRes.value.json()
          const activeBaseline = baselineData.baseline || baselineData.data
          if (activeBaseline?.approved_at || activeBaseline?.created_at) {
            const date = activeBaseline.approved_at || activeBaseline.created_at
            setAdditionalMetrics(prev => ({
              ...prev,
              baselineDate: new Date(date).toLocaleDateString(),
            }))
          }
        }

        // Process performance KPI (SPI/CPI)
        if (performanceRes.status === 'fulfilled' && performanceRes.value.ok) {
          const perfData = await performanceRes.value.json()
          const summary = perfData.data
          if (summary) {
            const spi = summary.schedule?.performance_index
            const cpi = summary.cost?.performance_index
            let kpi = null
            if (spi !== null && cpi !== null) {
              kpi = `SPI: ${spi.toFixed(2)}, CPI: ${cpi.toFixed(2)}`
            } else if (spi !== null) {
              kpi = `SPI: ${spi.toFixed(2)}`
            } else if (cpi !== null) {
              kpi = `CPI: ${cpi.toFixed(2)}`
            }
            setAdditionalMetrics(prev => ({ ...prev, performanceKpi: kpi }))
          }
        }

        // Process project data (financials, timeline)
        if (projectRes.status === 'fulfilled' && projectRes.value.ok) {
          const projectData = await projectRes.value.json()
          const proj = projectData.project || projectData.data || projectData
          
          // Financials KPI (budget utilization)
          if (proj.budget && proj.actual_cost !== undefined) {
            const utilization = proj.budget > 0 ? ((proj.actual_cost / proj.budget) * 100).toFixed(1) : '0'
            setAdditionalMetrics(prev => ({
              ...prev,
              financialsKpi: `${utilization}% utilized`,
              timelineStartDate: proj.start_date ? new Date(proj.start_date).toLocaleDateString() : null,
            }))
          } else if (proj.start_date) {
            setAdditionalMetrics(prev => ({
              ...prev,
              timelineStartDate: new Date(proj.start_date).toLocaleDateString(),
            }))
          }
        }

        // Process project integrations count
        if (projectIntegrationsRes.status === 'fulfilled' && projectIntegrationsRes.value.ok) {
          try {
            const integrationsData = await projectIntegrationsRes.value.json()
            // Count enabled integrations from project_integrations
            const integrations = integrationsData.integrations || integrationsData.data || integrationsData
            let count = 0
            if (Array.isArray(integrations)) {
              count = integrations.length
            } else if (typeof integrations === 'object') {
              // Count enabled integration flags (confluence_enabled, jira_enabled, etc.)
              const enabledFlags = [
                integrations.confluence_enabled,
                integrations.jira_enabled,
                integrations.sharepoint_enabled,
                integrations.github_enabled,
                integrations.notion_enabled,
              ].filter(Boolean).length
              count = enabledFlags
            }
            setAdditionalMetrics(prev => ({ ...prev, integrationsCount: count }))
          } catch (err) {
            console.error('Failed to parse integrations data:', err)
          }
        }

        // Process digital twins count
        if (digitalTwinsRes.status === 'fulfilled' && digitalTwinsRes.value.ok) {
          const dtData = await digitalTwinsRes.value.json()
          setAdditionalMetrics(prev => ({
            ...prev,
            digitalTwinsCount: Array.isArray(dtData) ? dtData.length : (dtData.data?.length || dtData.count || 0),
          }))
        }

        // Process drift detections
        if (driftRes.status === 'fulfilled' && driftRes.value.ok) {
          try {
            const driftData = await driftRes.value.json()
            const drifts = driftData.drifts || driftData.data || []
            // Filter out resolved/false_positive drifts for active count
            const activeDrifts = drifts.filter((d: any) => 
              d.status !== 'resolved' && d.status !== 'false_positive' && d.status !== 'dismissed'
            )
            const criticalDrifts = activeDrifts.filter((d: any) => 
              d.drift_severity === 'critical' || d.drift_severity === 'high'
            )
            setAdditionalMetrics(prev => ({
              ...prev,
              driftCount: activeDrifts.length,
              criticalDriftCount: criticalDrifts.length,
            }))
          } catch (err) {
            console.error('Failed to parse drift data:', err)
          }
        }

      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setLoadingMetrics(false)
      }
    }

    fetchMetrics()
  }, [projectId, stakeholders.length])

  // Calculate PMBOK 8 domain coverage percentage
  const calculateDomainCoverage = () => {
    if (!pmbok8Metrics) return 0
    const domains = [
      pmbok8Metrics.stakeholders > 0,
      pmbok8Metrics.team > 0,
      pmbok8Metrics.developmentApproach > 0,
      pmbok8Metrics.planning > 0,
      pmbok8Metrics.projectWork > 0,
      pmbok8Metrics.delivery > 0,
      pmbok8Metrics.measurement > 0,
      pmbok8Metrics.uncertainty > 0
    ]
    const coveredDomains = domains.filter(Boolean).length
    return Math.round((coveredDomains / 8) * 100)
  }

  const domainCoverage = calculateDomainCoverage()

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">
              {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground">Total allocated</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Manager</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-lg font-bold">{managerName || 'Not assigned'}</div>
            <p className="text-xs text-muted-foreground">Project manager</p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-50/50 to-transparent dark:from-cyan-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/30">
              <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              {stakeholders.length > 0 ? `${stakeholders.length} total stakeholders` : 'No stakeholders'}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
              <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{documentStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Generated docs</p>
          </CardContent>
        </Card>

        {issueStats && (
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-950/20" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-medium">Issues</CardTitle>
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-2xl font-bold">{issueStats.total_issues}</div>
              <p className="text-xs text-muted-foreground">
                {issueStats.open_issues} open, {issueStats.critical_issues} critical
                {issueStats.overdue_issues > 0 && `, ${issueStats.overdue_issues} overdue`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* AI Extractions */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">AI Extractions</CardTitle>
            <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
              <Database className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.aiExtractions}</div>
            <p className="text-xs text-muted-foreground">Total entities extracted</p>
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Lessons</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Lightbulb className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.lessonsCount}</div>
            <p className="text-xs text-muted-foreground">Lessons learned</p>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-lg font-bold">{additionalMetrics.performanceKpi || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">SPI / CPI</p>
          </CardContent>
        </Card>

        {/* Number of Stakeholders */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-transparent dark:from-teal-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Stakeholders</CardTitle>
            <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/30">
              <Users className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.stakeholdersCount || stakeholders.length}</div>
            <p className="text-xs text-muted-foreground">Total identified</p>
          </CardContent>
        </Card>

        {/* Team Agreements */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-50/50 to-transparent dark:from-sky-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Team Agreements</CardTitle>
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Users className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.teamAgreementsCount}</div>
            <p className="text-xs text-muted-foreground">Team agreements</p>
          </CardContent>
        </Card>

        {/* Development Approach */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-50/50 to-transparent dark:from-fuchsia-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Development Approach</CardTitle>
            <div className="p-2 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30">
              <Code className="h-4 w-4 text-fuchsia-600 dark:text-fuchsia-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.developmentApproachCount}</div>
            <p className="text-xs text-muted-foreground">Approaches defined</p>
          </CardContent>
        </Card>

        {/* Baseline Date */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Baseline Date</CardTitle>
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-lg font-bold">{additionalMetrics.baselineDate || 'Not set'}</div>
            <p className="text-xs text-muted-foreground">Active baseline</p>
          </CardContent>
        </Card>

        {/* Financials KPI */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-lime-50/50 to-transparent dark:from-lime-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Financials KPI</CardTitle>
            <div className="p-2 rounded-lg bg-lime-100 dark:bg-lime-900/30">
              <DollarSign className="h-4 w-4 text-lime-600 dark:text-lime-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-lg font-bold">{additionalMetrics.financialsKpi || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">Budget utilization</p>
          </CardContent>
        </Card>

        {/* Timeline Start Date */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-transparent dark:from-pink-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Timeline Start</CardTitle>
            <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/30">
              <Calendar className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-lg font-bold">{additionalMetrics.timelineStartDate || project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}</div>
            <p className="text-xs text-muted-foreground">Project start date</p>
          </CardContent>
        </Card>

        {/* Number of Risks */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/50 to-transparent dark:from-orange-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Risks</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.risksCount}</div>
            <p className="text-xs text-muted-foreground">Identified risks</p>
          </CardContent>
        </Card>

        {/* Compliance & Security */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent dark:from-slate-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Compliance & Security</CardTitle>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/30">
              <Lock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.complianceSecurityCount}</div>
            <p className="text-xs text-muted-foreground">Security items</p>
          </CardContent>
        </Card>

        {/* Number of Integrations */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent dark:from-blue-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Integrations</CardTitle>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Settings className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.integrationsCount}</div>
            <p className="text-xs text-muted-foreground">Connected systems</p>
          </CardContent>
        </Card>

        {/* Number of Digital Twins */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent dark:from-indigo-950/20" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Digital Twins</CardTitle>
            <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
              <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">{additionalMetrics.digitalTwinsCount}</div>
            <p className="text-xs text-muted-foreground">Digital twin assets</p>
          </CardContent>
        </Card>

        {/* Drift Detected */}
        <Card className={`relative overflow-hidden border-2 transition-all duration-300 hover:shadow-lg ${
          additionalMetrics.driftCount > 0 
            ? 'border-orange-500/50 hover:border-orange-500 dark:border-orange-400/50' 
            : 'hover:border-primary/50'
        }`}>
          <div className={`absolute inset-0 bg-gradient-to-br ${
            additionalMetrics.driftCount > 0
              ? 'from-orange-50/70 to-red-50/50 dark:from-orange-950/30 dark:to-red-950/20'
              : 'from-amber-50/50 to-transparent dark:from-amber-950/20'
          }`} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium">Drift Detected</CardTitle>
            <div className={`p-2 rounded-lg ${
              additionalMetrics.driftCount > 0
                ? 'bg-orange-100 dark:bg-orange-900/30 animate-pulse'
                : 'bg-amber-100 dark:bg-amber-900/30'
            }`}>
              <AlertTriangle className={`h-4 w-4 ${
                additionalMetrics.driftCount > 0
                  ? 'text-orange-600 dark:text-orange-400'
                  : 'text-amber-600 dark:text-amber-400'
              }`} />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-bold">
              {additionalMetrics.driftCount > 0 ? (
                <span className="text-orange-600 dark:text-orange-400">{additionalMetrics.driftCount}</span>
              ) : (
                <span className="text-muted-foreground">0</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {additionalMetrics.driftCount > 0 ? (
                <>
                  {additionalMetrics.criticalDriftCount > 0 && (
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">
                      {additionalMetrics.criticalDriftCount} critical
                    </span>
                  )}
                  {additionalMetrics.criticalDriftCount > 0 && additionalMetrics.driftCount > additionalMetrics.criticalDriftCount && ' • '}
                  {additionalMetrics.driftCount > additionalMetrics.criticalDriftCount && (
                    <span>{additionalMetrics.driftCount - additionalMetrics.criticalDriftCount} other</span>
                  )}
                </>
              ) : (
                'No drift detected'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* PMBOK 8 Performance Domains & Document Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PMBOK 8 Performance Domains */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20" />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Layers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              PMBOK 8th Edition Performance Domains
            </CardTitle>
            <CardDescription>Coverage across 8 performance domains</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            {loadingMetrics ? (
              <div className="text-center py-4 text-muted-foreground">Loading domain metrics...</div>
            ) : pmbok8Metrics ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Domain Coverage</span>
                    <Badge variant={domainCoverage >= 75 ? "default" : domainCoverage >= 50 ? "secondary" : "outline"}>
                      {domainCoverage}%
                    </Badge>
                  </div>
                  <Progress value={domainCoverage} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <span>Stakeholders Domain</span>
                    </div>
                    <Badge variant={pmbok8Metrics.stakeholders > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.stakeholders} entities
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <span>Team Domain</span>
                    </div>
                    <Badge variant={pmbok8Metrics.team > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.team} agreements
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      <span>Development Approach</span>
                    </div>
                    <Badge variant={pmbok8Metrics.developmentApproach > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.developmentApproach} approaches
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-500" />
                      <span>Planning Domain</span>
                    </div>
                    <Badge variant={pmbok8Metrics.planning > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.planning} items
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-cyan-500" />
                      <span>Project Work Domain</span>
                    </div>
                    <Badge variant={pmbok8Metrics.projectWork > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.projectWork} items
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span>Delivery Domain</span>
                    </div>
                    <Badge variant={pmbok8Metrics.delivery > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.delivery} items
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-indigo-500" />
                      <span>Measurement Domain</span>
                    </div>
                    <Badge variant={pmbok8Metrics.measurement > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.measurement} metrics
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      <span>Uncertainty Domain</span>
                    </div>
                    <Badge variant={pmbok8Metrics.uncertainty > 0 ? "default" : "outline"}>
                      {pmbok8Metrics.uncertainty} items
                    </Badge>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                No domain metrics available. Run AI extraction to populate.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Quality Metrics */}
        <Card className="relative overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-purple-50/30 to-transparent dark:from-primary/10 dark:via-purple-950/30" />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Award className="h-5 w-5 text-primary" />
              </div>
              Document Quality Assessment
            </CardTitle>
            <CardDescription>Comprehensive 10-dimension quality analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative z-10">
            {loadingMetrics ? (
              <div className="text-center py-4 text-muted-foreground">Loading quality metrics...</div>
            ) : qualityMetrics ? (
              <>
                {/* Overall Grade Display */}
                <div className="text-center py-4 bg-gradient-to-br from-primary/10 to-purple-100/50 dark:from-primary/20 dark:to-purple-950/50 rounded-lg border border-primary/20">
                  <div className="text-6xl font-bold mb-2" style={{
                    color: qualityMetrics.averageGrade === 'A' ? '#10b981' :
                           qualityMetrics.averageGrade === 'B' ? '#3b82f6' :
                           qualityMetrics.averageGrade === 'C' ? '#f59e0b' :
                           qualityMetrics.averageGrade === 'D' ? '#ef4444' : '#6b7280'
                  }}>
                    {qualityMetrics.averageGrade}
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Quality Grade</p>
                  <div className="mt-2">
                    <Badge 
                      variant={qualityMetrics.averageCompliance >= 80 ? "default" : qualityMetrics.averageCompliance >= 60 ? "secondary" : "destructive"}
                      className="text-sm px-3 py-1"
                    >
                      {qualityMetrics.averageCompliance}% Average
                    </Badge>
                  </div>
                </div>

                {/* Quality Dimensions Grid */}
                {qualityMetrics.dimensionAverages && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Quality Dimensions</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'completeness', label: 'Completeness', icon: CheckCircle, color: 'blue' },
                        { key: 'structureScore', label: 'Structure', icon: Layers, color: 'purple' },
                        { key: 'formattingScore', label: 'Formatting', icon: FileText, color: 'green' },
                        { key: 'contentDepth', label: 'Content Depth', icon: BarChart3, color: 'orange' },
                        { key: 'accuracy', label: 'Accuracy', icon: Target, color: 'red' },
                        { key: 'consistency', label: 'Consistency', icon: Gauge, color: 'indigo' },
                        { key: 'contextRelevance', label: 'Context', icon: Zap, color: 'yellow' },
                        { key: 'professionalQuality', label: 'Professional', icon: Award, color: 'pink' },
                        { key: 'standardsCompliance', label: 'Standards', icon: Shield, color: 'cyan' },
                        { key: 'complexityScore', label: 'Complexity', icon: Activity, color: 'slate' }
                      ].map(({ key, label, icon: Icon, color }) => {
                        const value = qualityMetrics.dimensionAverages[key as keyof typeof qualityMetrics.dimensionAverages] || 0
                        const colorClasses = {
                          blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
                          purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
                          green: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
                          orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
                          red: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
                          indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
                          yellow: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
                          pink: 'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
                          cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400',
                          slate: 'bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400'
                        }
                        return (
                          <div key={key} className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className={`p-1 rounded ${colorClasses[color as keyof typeof colorClasses]}`}>
                                  <Icon className="h-3 w-3" />
                                </div>
                                <span className="text-xs font-medium">{label}</span>
                              </div>
                              <span className="text-xs font-semibold">{value}%</span>
                            </div>
                            <Progress value={value} className="h-1.5" />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Grade Distribution */}
                {qualityMetrics.gradeDistribution && (
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">Grade Distribution</h4>
                    <div className="space-y-2">
                      {Object.entries(qualityMetrics.gradeDistribution).map(([grade, count]) => {
                        const total = Object.values(qualityMetrics.gradeDistribution).reduce((a, b) => a + b, 0)
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                        const gradeColors: Record<string, string> = {
                          A: 'bg-green-500',
                          B: 'bg-blue-500',
                          C: 'bg-yellow-500',
                          D: 'bg-orange-500',
                          F: 'bg-red-500'
                        }
                        return (
                          <div key={grade} className="flex items-center gap-3">
                            <div className="w-8 text-center">
                              <span className="text-sm font-bold">{grade}</span>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <div className={`h-2 rounded-full ${gradeColors[grade] || 'bg-gray-500'}`} style={{ width: `${percentage}%` }} />
                                <span className="text-xs text-muted-foreground ml-2">{count} ({percentage}%)</span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Assessment Summary */}
                <div className="pt-4 border-t bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Documents Assessed</span>
                    <span className="font-semibold">{qualityMetrics.totalAssessed} / {documentStats.totalDocuments}</span>
                  </div>
                  {qualityMetrics.totalAssessed < documentStats.totalDocuments && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {documentStats.totalDocuments - qualityMetrics.totalAssessed} documents pending assessment
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <div className="p-4 rounded-full bg-muted/50 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Award className="h-8 w-8 opacity-50" />
                </div>
                <p className="text-sm font-medium">No quality assessments available</p>
                <p className="text-xs mt-1">Quality metrics are calculated from document generation metadata</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Suspense fallback={<ChartPlaceholder />}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Document Status Distribution */}
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-pink-50/30 dark:from-purple-950/20 dark:to-pink-950/20" />
            <CardHeader className="relative z-10">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                  <PieChartIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                Document Status Distribution
              </CardTitle>
              <CardDescription>Breakdown of document statuses</CardDescription>
            </CardHeader>
            <CardContent className="relative z-10">
              <GenericPieChart
              data={[
                { name: 'Draft', value: documentStats.counts.draft, color: '#f97316' },
                { name: 'Review', value: documentStats.counts.review, color: '#a855f7' },
                { name: 'Published', value: documentStats.counts.published, color: '#10b981' },
                { name: 'Archived', value: documentStats.counts.archived, color: '#6b7280' },
              ]}
              dataKey="value"
              colorKey="color"
              labelFormatter={(e: any) => (e.value > 0 ? `${e.name}: ${e.value}` : '')}
            />
          </CardContent>
        </Card>

        {/* Project Health */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/20" />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              Project Health Indicators
            </CardTitle>
            <CardDescription>PMBOK-aligned project performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            {/* Documentation Completion Rate */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Documentation Completion</span>
                <div className="text-right">
                  <Badge variant={documentStats.counts.published / Math.max(documentStats.totalDocuments, 1) >= 0.7 ? "default" : "secondary"}>
                    {documentStats.counts.published} / {documentStats.totalDocuments}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round((documentStats.counts.published / Math.max(documentStats.totalDocuments, 1)) * 100)}% Complete
                  </p>
                </div>
              </div>
              <Progress value={(documentStats.counts.published / Math.max(documentStats.totalDocuments, 1)) * 100} className="h-2" />
            </div>
            
            {/* Document Quality (Draft vs Published ratio) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Document Quality Index</span>
                <div className="text-right">
                  <Badge variant={documentStats.counts.draft / Math.max(documentStats.totalDocuments, 1) <= 0.3 ? "default" : "secondary"}>
                    {documentStats.counts.draft} Draft
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(((documentStats.counts.published + documentStats.counts.review) / Math.max(documentStats.totalDocuments, 1)) * 100)}% Finalized
                  </p>
                </div>
              </div>
              <Progress value={((documentStats.counts.published + documentStats.counts.review) / Math.max(documentStats.totalDocuments, 1)) * 100} className="h-2" />
            </div>
            
            {/* Stakeholder Engagement */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Stakeholder Engagement</span>
                <div className="text-right">
                  <Badge variant={stakeholders.length >= 5 ? "default" : stakeholders.length >= 3 ? "secondary" : "destructive"}>
                    {stakeholders.length} Identified
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stakeholders.filter(s => s.engagement_approach === 'manage_closely').length} High Priority
                  </p>
                </div>
              </div>
              <Progress value={Math.min(stakeholders.length * 10, 100)} className="h-2" />
            </div>
            
            {/* Project Timeline Health */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Timeline Health</span>
                <div className="text-right">
                  <Badge variant={(() => {
                    if (!project.start_date || !project.end_date) return "secondary"
                    const now = new Date()
                    const start = new Date(project.start_date)
                    const end = new Date(project.end_date)
                    const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                    const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                    const timeProgress = (elapsedDays / totalDays) * 100
                    const workProgress = progress
                    
                    if (workProgress >= timeProgress) return "default" // On track or ahead
                    if (workProgress >= timeProgress - 10) return "secondary" // Slightly behind
                    return "destructive" // Significantly behind
                  })()}>
                    {(() => {
                      if (!project.start_date || !project.end_date) return "Not Set"
                      const now = new Date()
                      const start = new Date(project.start_date)
                      const end = new Date(project.end_date)
                      const totalDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                      const elapsedDays = (now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                      const timeProgress = (elapsedDays / totalDays) * 100
                      const workProgress = progress
                      
                      if (workProgress >= timeProgress) return "On Schedule"
                      if (workProgress >= timeProgress - 10) return "At Risk"
                      return "Behind Schedule"
                    })()}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {project.start_date && project.end_date ? (() => {
                      const now = new Date()
                      const end = new Date(project.end_date)
                      const daysRemaining = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      return daysRemaining > 0 ? `${daysRemaining} days left` : `${Math.abs(daysRemaining)} days overdue`
                    })() : 'No timeline set'}
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
        </div>
      </Suspense>

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50/30 to-amber-50/30 dark:from-orange-950/20 dark:to-amber-950/20" />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Target className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 relative z-10">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Framework</p>
                <p className="text-sm font-semibold">{project.framework || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Priority</p>
                <Badge variant={project.priority === 'high' ? 'destructive' : project.priority === 'medium' ? 'secondary' : 'outline'}>
                  {project.priority?.toUpperCase() || 'MEDIUM'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Status</p>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status?.toUpperCase() || 'ACTIVE'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{new Date(project.created_at).toLocaleDateString()}</p>
              </div>
            </div>
            {project.description && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Description</p>
                <p className="text-sm">{project.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Members */}
        <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-50/30 to-pink-50/30 dark:from-rose-950/20 dark:to-pink-950/20" />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <Users className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            {teamMembers.length > 0 ? (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name || member.role}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-2">No team members assigned</p>
                <p className="text-xs text-muted-foreground">
                  Mark internal stakeholders as "Team Member" in the Stakeholders tab
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
