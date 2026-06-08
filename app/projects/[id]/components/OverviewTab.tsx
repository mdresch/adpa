"use client"

import { Suspense, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  Shield,
  Zap,
  Layers,
  Gauge,
  Award,
  Database,
  Calendar,
} from "lucide-react"
import dynamic from 'next/dynamic'
import { AnimatedGrid, AnimatedGridItem, AnimatedCard } from "@/components/animated-layout"

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
  const [pmbok7Metrics, setPmbok7Metrics] = useState<Record<string, number> | null>(null)
  const [pmbok6Compliance, setPmbok6Compliance] = useState<{
    processCoverage: number
    deliverableCoverage: number
    activeProcessCount: number
    presentDeliverableCount: number
    processes: any[]
  } | null>(null)
  const [baselineReadiness, setBaselineReadiness] = useState<{
    isReady: boolean
    lifecyclePhase: 'initiation' | 'planning' | 'ready_to_baseline'
    statusLabel: string
    coveragePercent: number
    dataMaturityMet: boolean
    hasCharter: boolean
    hasApprovedActiveBaseline: boolean
    hasTripleConstraint: boolean
    formalPlanningDocCount: number
    totalEntities: number
    missingReason: string | null
    nextSteps: string[]
  } | null>(null)
  const [qualityMetrics, setQualityMetrics] = useState<DocumentQualityMetrics | null>(null)
  const [issueStats, setIssueStats] = useState<IssueStats | null>(null)
  const [loadingGovernanceMetrics, setLoadingGovernanceMetrics] = useState(true)
  const [loadingQualityMetrics, setLoadingQualityMetrics] = useState(true)

  // Calculate team members count from stakeholders
  const teamMembers = stakeholders.filter(s =>
    s.stakeholder_type === 'internal' && s.is_team_member === true
  )

  // Governance metrics (PMBOK/baseline) load first; quality + issues load in parallel without blocking them.
  useEffect(() => {
    const fetchGovernanceMetrics = async () => {
      try {
        setLoadingGovernanceMetrics(true)
        const token = localStorage.getItem('auth_token')
        const extractionResponse = await fetch(getApiUrl(`/project-data-extraction/${projectId}/summary`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        if (extractionResponse.ok) {
          const extractionData = await extractionResponse.json()
          if (extractionData.success) {
            if (extractionData.pmbok8DomainCounts) {
              setPmbok8Metrics(extractionData.pmbok8DomainCounts)
            }
            if (extractionData.pmbok7DomainCounts) {
              setPmbok7Metrics(extractionData.pmbok7DomainCounts)
            }
            if (extractionData.pmbok6Compliance) {
              setPmbok6Compliance(extractionData.pmbok6Compliance)
            }
            setBaselineReadiness(extractionData.baselineReadiness || null)
          }
        }
      } catch (error) {
        console.error('Failed to fetch governance metrics:', error)
      } finally {
        setLoadingGovernanceMetrics(false)
      }
    }

    const fetchQualityAndIssues = async () => {
      try {
        setLoadingQualityMetrics(true)
        const token = localStorage.getItem('auth_token')

        const documentsResponse = await apiClient.getProjectDocuments(projectId, { limit: 1000 })
        const documents = documentsResponse.documents || []

        let totalCompliance = 0
        let assessedCount = 0
        const grades: string[] = []

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
          const docQualityMetrics = doc.generation_metadata?.qualityMetrics
          if (docQualityMetrics) {
            const overallQuality = docQualityMetrics.overallQuality || docQualityMetrics.standardsCompliance || 0
            if (overallQuality > 0) {
              totalCompliance += overallQuality
              assessedCount++

              if (overallQuality >= 90) grades.push('A')
              else if (overallQuality >= 80) grades.push('B')
              else if (overallQuality >= 70) grades.push('C')
              else if (overallQuality >= 60) grades.push('D')
              else grades.push('F')

              dimensionSums.completeness += docQualityMetrics.completeness || 0
              dimensionSums.structureScore += docQualityMetrics.structureScore || 0
              dimensionSums.formattingScore += docQualityMetrics.formattingScore || 0
              dimensionSums.contentDepth += docQualityMetrics.contentDepth || 0
              dimensionSums.accuracy += docQualityMetrics.accuracy || 0
              dimensionSums.consistency += docQualityMetrics.consistency || 0
              dimensionSums.contextRelevance += docQualityMetrics.contextRelevance || 0
              dimensionSums.professionalQuality += docQualityMetrics.professionalQuality || 0
              dimensionSums.standardsCompliance += docQualityMetrics.standardsCompliance || 0
              dimensionSums.complexityScore += docQualityMetrics.complexityScore || 0
            }
          }
        })

        if (assessedCount > 0) {
          const avgCompliance = totalCompliance / assessedCount
          const gradeCounts: { A: number; B: number; C: number; D: number; F: number } = { A: 0, B: 0, C: 0, D: 0, F: 0 }
          grades.forEach(g => {
            if (g in gradeCounts) {
              gradeCounts[g as keyof typeof gradeCounts]++
            }
          })
          const avgGradeIndex = Math.round(avgCompliance / 20)
          const gradeOrder = ['F', 'D', 'C', 'B', 'A']
          const avgGrade = gradeOrder[Math.min(avgGradeIndex, 4)]

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
      } catch (error) {
        console.error('Failed to fetch quality metrics:', error)
      } finally {
        setLoadingQualityMetrics(false)
      }
    }

    void fetchGovernanceMetrics()
    void fetchQualityAndIssues()
  }, [projectId])

  // Define minimum entity thresholds required to achieve a "Green Light" (Full Coverage)
  // for each PMBOK 8 Performance Domain based on enterprise standard baselines.
  const PMBOK_THRESHOLDS = {
    stakeholders: 25,
    team: 15,
    developmentApproach: 5,
    planning: 30,
    projectWork: 20,
    delivery: 20,
    measurement: 15,
    uncertainty: 20
  }

  // Tier 2 Knowledge Domain Thresholds
  const PMBOK7_THRESHOLDS: Record<string, number> = {
    governance: 10,
    scope: 25,
    schedule: 15,
    finance: 10,
    resources: 15,
    risk: 20,
    stakeholdersOps: 15
  }

  // Calculate PMBOK 8 domain coverage percentage
  const calculateDomainCoverage = () => {
    if (!pmbok8Metrics) return 0
    const domains = [
      pmbok8Metrics.stakeholders >= PMBOK_THRESHOLDS.stakeholders,
      pmbok8Metrics.team >= PMBOK_THRESHOLDS.team,
      pmbok8Metrics.developmentApproach >= PMBOK_THRESHOLDS.developmentApproach,
      pmbok8Metrics.planning >= PMBOK_THRESHOLDS.planning,
      pmbok8Metrics.projectWork >= PMBOK_THRESHOLDS.projectWork,
      pmbok8Metrics.delivery >= PMBOK_THRESHOLDS.delivery,
      pmbok8Metrics.measurement >= PMBOK_THRESHOLDS.measurement,
      pmbok8Metrics.uncertainty >= PMBOK_THRESHOLDS.uncertainty
    ]
    const coveredDomains = domains.filter(Boolean).length
    return Math.round((coveredDomains / 8) * 100)
  }

  const domainCoverage = calculateDomainCoverage()

  return (
    <div className="space-y-4">
      {/* Baseline Readiness & Primary Performance Domains */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Baseline Readiness Checklist */}
        <AnimatedCard className="xl:col-span-1 border-2 border-primary/10 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-950/50 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className={`p-1.5 rounded-md ${baselineReadiness?.isReady ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                <CheckCircle className="h-4 w-4" />
              </div>
              Project Baseline Readiness
            </CardTitle>
            <CardDescription className="text-[11px]">
              PMBOK lifecycle gate — separate from extracted entity volume
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className={`text-2xl font-black mb-1 ${baselineReadiness?.isReady ? 'text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}>
                {baselineReadiness?.isReady ? 'CERTIFIED' : baselineReadiness?.statusLabel ?? 'Loading…'}
              </div>
              <Badge variant={baselineReadiness?.isReady ? "default" : "secondary"} className={baselineReadiness?.isReady ? "bg-emerald-500" : ""}>
                {baselineReadiness?.isReady
                  ? "Green Light: Ready to Baseline"
                  : baselineReadiness?.lifecyclePhase === 'planning'
                    ? "Planning phase — baseline approval pending"
                    : "Initiation / planning criteria not yet met"}
              </Badge>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Baseline gates</p>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {baselineReadiness?.hasCharter ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  Project Charter Active
                </span>
                <span className="font-mono font-bold text-slate-500">{baselineReadiness?.hasCharter ? 'YES' : 'NO'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {baselineReadiness?.hasApprovedActiveBaseline ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  Approved Active Baseline
                </span>
                <span className="font-mono font-bold text-slate-500">{baselineReadiness?.hasApprovedActiveBaseline ? 'YES' : 'NO'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {baselineReadiness?.hasTripleConstraint ? <CheckCircle className="h-3 w-3 text-emerald-500" /> : <AlertTriangle className="h-3 w-3 text-amber-500" />}
                  Scope + Schedule + Cost Baselines
                </span>
                <span className="font-mono font-bold text-slate-500">{baselineReadiness?.hasTripleConstraint ? 'YES' : 'NO'}</span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 pt-1">Data maturity (informational)</p>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {baselineReadiness?.dataMaturityMet ? <CheckCircle className="h-3 w-3 text-blue-500" /> : <AlertTriangle className="h-3 w-3 text-slate-400" />}
                  Entity Domain Coverage
                </span>
                <span className="font-mono font-bold text-slate-500">{baselineReadiness?.coveragePercent || 0}% / 60%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  {baselineReadiness?.dataMaturityMet ? <CheckCircle className="h-3 w-3 text-blue-500" /> : <AlertTriangle className="h-3 w-3 text-slate-400" />}
                  Extracted Entity Volume
                </span>
                <span className="font-mono font-bold text-slate-500">{baselineReadiness?.totalEntities || 0} / 350</span>
              </div>
            </div>

            {baselineReadiness?.missingReason ? (
              <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-[10px] text-amber-800 dark:text-amber-200 font-medium">
                ⚠️ {baselineReadiness.missingReason}
              </div>
            ) : null}
            {!baselineReadiness?.isReady && baselineReadiness?.nextSteps?.length ? (
              <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
                <p className="font-semibold mb-1">Next steps</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {baselineReadiness.nextSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </AnimatedCard>

        {/* PMBOK 8 Performance Domains */}
        <AnimatedCard className="xl:col-span-2 relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20" />
          <CardHeader className="relative z-10 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-blue-100 dark:bg-blue-900/30">
                <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              Tier 1: PMBOK 8th Edition Performance Domains
            </CardTitle>
            <CardDescription className="text-[11px]">Outcome-focused entity distribution across the project lifecycle</CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            {loadingGovernanceMetrics ? (
              <div className="text-center py-4 text-muted-foreground text-xs italic">Loading performance metrics...</div>
            ) : pmbok8Metrics ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tighter">Performance Maturity index</span>
                    <span className="text-xs font-mono font-bold">{domainCoverage}%</span>
                  </div>
                  <Progress value={domainCoverage} className="h-1.5" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  {[
                    { key: 'stakeholders', label: 'Stakeholders', icon: Users, color: 'blue' },
                    { key: 'team', label: 'Team', icon: Shield, color: 'green' },
                    { key: 'developmentApproach', label: 'Dev Approach', icon: Zap, color: 'purple' },
                    { key: 'planning', label: 'Planning', icon: Target, color: 'orange' },
                    { key: 'projectWork', label: 'Project Work', icon: Activity, color: 'cyan' },
                    { key: 'delivery', label: 'Delivery', icon: CheckCircle, color: 'emerald' },
                    { key: 'measurement', label: 'Measurement', icon: Gauge, color: 'indigo' },
                    { key: 'uncertainty', label: 'Uncertainty', icon: AlertTriangle, color: 'red' }
                  ].map(({ key, label, icon: Icon, color }) => {
                    const count = pmbok8Metrics[key as keyof PMBOK8DomainMetrics] || 0
                    const threshold = PMBOK_THRESHOLDS[key as keyof typeof PMBOK_THRESHOLDS]
                    const isMet = count >= threshold
                    
                    const colorClasses: Record<string, string> = {
                      blue: 'text-blue-500', green: 'text-green-500', purple: 'text-purple-500',
                      orange: 'text-orange-500', cyan: 'text-cyan-500', emerald: 'text-emerald-500',
                      indigo: 'text-indigo-500', red: 'text-red-500'
                    }

                    return (
                      <div key={key} className={`p-2 rounded-lg border bg-white dark:bg-slate-900/50 transition-all ${isMet ? 'border-emerald-200 dark:border-emerald-900/50 shadow-sm' : 'border-slate-100 dark:border-slate-800'}`}>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <Icon className={`h-3 w-3 ${colorClasses[color]}`} />
                            <div className={`h-1.5 w-1.5 rounded-full ${isMet ? 'bg-emerald-500 animate-pulse' : count > 0 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                          </div>
                          <div className="text-[10px] font-bold text-slate-500 truncate leading-none mt-1">{label}</div>
                          <div className="flex items-baseline gap-1 mt-0.5">
                            <span className={`text-sm font-black font-mono ${isMet ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>{Math.round(count)}</span>
                            <span className="text-[9px] text-slate-400 font-mono">/ {threshold}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-xs">No performance metrics available.</div>
            )}
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Tier 2 & Tier 3 Maturity Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tier 2: PMBOK Knowledge Domains */}
        <AnimatedCard className="border-2 border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-slate-200 dark:bg-slate-800">
                <Database className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              </div>
              Tier 2: PMBOK Knowledge Domains
            </CardTitle>
            <CardDescription className="text-[11px]">Knowledge-area focused entity distribution and process coverage</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingGovernanceMetrics ? (
              <div className="text-center py-4 text-muted-foreground text-xs italic">Loading knowledge metrics...</div>
            ) : pmbok7Metrics ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'governance', label: 'Gov', icon: Shield, threshold: 10, color: 'blue' },
                  { key: 'scope', label: 'Scope', icon: Target, threshold: 25, color: 'orange' },
                  { key: 'schedule', label: 'Sched', icon: Calendar, threshold: 15, color: 'emerald' },
                  { key: 'finance', label: 'Fin', icon: DollarSign, threshold: 10, color: 'green' },
                  { key: 'resources', label: 'Res', icon: Users, threshold: 15, color: 'indigo' },
                  { key: 'risk', label: 'Risk', icon: AlertTriangle, threshold: 20, color: 'red' },
                  { key: 'stakeholdersOps', label: 'Ops', icon: Activity, threshold: 15, color: 'cyan' }
                ].map(({ key, label, icon: Icon, threshold, color }) => {
                  const count = pmbok7Metrics[key] || 0
                  const isMet = count >= threshold
                  return (
                    <div key={key} className={`p-2 rounded-lg border bg-white dark:bg-slate-900/80 ${isMet ? 'border-emerald-500/30' : 'border-slate-200 dark:border-slate-800'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <Icon className="h-3 w-3 opacity-70" />
                        <div className={`h-1.5 w-1.5 rounded-full ${isMet ? 'bg-emerald-500 animate-pulse' : count > 0 ? 'bg-amber-400' : 'bg-slate-200'}`} />
                      </div>
                      <div className="text-[9px] font-bold text-slate-500 uppercase truncate">{label}</div>
                      <div className="flex items-baseline gap-0.5 mt-0.5">
                        <span className="text-xs font-black">{Math.round(count)}</span>
                        <span className="text-[8px] text-slate-400">/{threshold}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-xs">No knowledge metrics available.</div>
            )}
          </CardContent>
        </AnimatedCard>

        {/* Tier 3: PMBOK 6th Edition Compliance Summary */}
        <AnimatedCard className="border-2 border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-amber-100 dark:bg-amber-900/30">
                  <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                Tier 3: PMBOK 6th Edition Compliance
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] font-bold text-primary"
                onClick={() => window.location.href = `/pmbok6?projectId=${projectId}`}
              >
                Deep Dive →
              </Button>
            </CardTitle>
            <CardDescription className="text-[11px]">Strict process activation and deliverable verification</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Process Activation</span>
                  <span className="text-xs font-mono font-bold text-amber-600">{pmbok6Compliance?.activeProcessCount || 0} / 49</span>
                </div>
                <Progress value={pmbok6Compliance?.processCoverage || 0} className="h-1.5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Deliverable Coverage</span>
                  <span className="text-xs font-mono font-bold text-blue-600">{pmbok6Compliance?.presentDeliverableCount || 0} / 94</span>
                </div>
                <Progress value={pmbok6Compliance?.deliverableCoverage || 0} className="h-1.5" />
              </div>
            </div>

            <div className="p-2 rounded bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
              <h5 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Recently Activated Processes</h5>
              <div className="flex flex-wrap gap-1.5">
                {pmbok6Compliance?.processes && pmbok6Compliance.processes.filter(p => p.status === 'ACTIVE').length > 0 ? (
                  pmbok6Compliance.processes.filter(p => p.status === 'ACTIVE').slice(0, 4).map(p => (
                    <Badge key={p.code} variant="secondary" className="text-[9px] bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30">
                      {p.code} {p.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground italic">No processes active yet.</span>
                )}
              </div>
            </div>
          </CardContent>
        </AnimatedCard>
      </div>

      {/* Key project KPIs — compact row after governance maturity */}
      <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AnimatedGridItem>
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full">
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
        </AnimatedGridItem>

        <AnimatedGridItem>
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg h-full">
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
        </AnimatedGridItem>

        <AnimatedGridItem>
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
        </AnimatedGridItem>

        <AnimatedGridItem>
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
        </AnimatedGridItem>

        <AnimatedGridItem>
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
        </AnimatedGridItem>

        {issueStats ? (
          <AnimatedGridItem>
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
          </AnimatedGridItem>
        ) : null}
      </AnimatedGrid>

      {/* Document Quality Assessment */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
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
            {loadingQualityMetrics ? (
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
