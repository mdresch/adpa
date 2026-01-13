"use client"

import { useEffect, useState } from "react"
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
  Award
} from "lucide-react"
import dynamic from 'next/dynamic'

const GenericPieChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.GenericPieChart), { ssr: false })
const MultiBarChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.MultiBarChart), { ssr: false })
const SimpleLineChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.SimpleLineChart), { ssr: false })
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
        if (extractionResponse.ok) {
          const extractionData = await extractionResponse.json()
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
        }

        // Fetch document quality metrics
        const documentsResponse = await apiClient.getProjectDocuments(projectId, { limit: 1000 })
        const documents = documentsResponse.documents || []
        
        let totalCompliance = 0
        let assessedCount = 0
        const grades: string[] = []

        documents.forEach((doc: any) => {
          const qualityMetrics = doc.generation_metadata?.qualityMetrics
          if (qualityMetrics) {
            // Calculate compliance from standardsCompliance or overallQuality
            const compliance = qualityMetrics.standardsCompliance || qualityMetrics.overallQuality || 0
            if (compliance > 0) {
              totalCompliance += compliance
              assessedCount++
              
              // Determine grade
              if (compliance >= 90) grades.push('A')
              else if (compliance >= 80) grades.push('B')
              else if (compliance >= 70) grades.push('C')
              else if (compliance >= 60) grades.push('D')
              else grades.push('F')
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

          setQualityMetrics({
            averageCompliance: Math.round(avgCompliance),
            averageGrade: avgGrade,
            totalAssessed: assessedCount
          })
        }

        // Fetch issue stats
        try {
          const issuesResponse = await fetch(getApiUrl(`/issues/stats/${projectId}`), {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
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
        console.error('Failed to fetch metrics:', error)
      } finally {
        setLoadingMetrics(false)
      }
    }

    fetchMetrics()
  }, [projectId])

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress}%</div>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
            </div>
            <p className="text-xs text-muted-foreground">Total allocated</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Manager</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{managerName || 'Not assigned'}</div>
            <p className="text-xs text-muted-foreground">Project manager</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              {stakeholders.length > 0 ? `${stakeholders.length} total stakeholders` : 'No stakeholders'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documentStats.totalDocuments}</div>
            <p className="text-xs text-muted-foreground">Generated docs</p>
          </CardContent>
        </Card>

        {issueStats && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{issueStats.total_issues}</div>
              <p className="text-xs text-muted-foreground">
                {issueStats.open_issues} open, {issueStats.critical_issues} critical
                {issueStats.overdue_issues > 0 && `, ${issueStats.overdue_issues} overdue`}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* PMBOK 8 Performance Domains & Document Quality */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PMBOK 8 Performance Domains */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              PMBOK 8th Edition Performance Domains
            </CardTitle>
            <CardDescription>Coverage across 8 performance domains</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Document Quality Assessment
            </CardTitle>
            <CardDescription>Average compliance and grade based on quality assessments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingMetrics ? (
              <div className="text-center py-4 text-muted-foreground">Loading quality metrics...</div>
            ) : qualityMetrics ? (
              <>
                <div className="text-center py-6">
                  <div className="text-5xl font-bold mb-2" style={{
                    color: qualityMetrics.averageGrade === 'A' ? '#10b981' :
                           qualityMetrics.averageGrade === 'B' ? '#3b82f6' :
                           qualityMetrics.averageGrade === 'C' ? '#f59e0b' :
                           qualityMetrics.averageGrade === 'D' ? '#ef4444' : '#6b7280'
                  }}>
                    {qualityMetrics.averageGrade}
                  </div>
                  <p className="text-sm text-muted-foreground">Average Grade</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Average Compliance</span>
                      <Badge variant={qualityMetrics.averageCompliance >= 80 ? "default" : qualityMetrics.averageCompliance >= 60 ? "secondary" : "destructive"}>
                        {qualityMetrics.averageCompliance}%
                      </Badge>
                    </div>
                    <Progress 
                      value={qualityMetrics.averageCompliance} 
                      className="h-2"
                    />
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Documents Assessed</span>
                      <span className="font-medium">{qualityMetrics.totalAssessed} / {documentStats.totalDocuments}</span>
                    </div>
                    {qualityMetrics.totalAssessed < documentStats.totalDocuments && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {documentStats.totalDocuments - qualityMetrics.totalAssessed} documents pending assessment
                      </p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <Award className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No quality assessments available</p>
                <p className="text-xs mt-1">Quality metrics are calculated from document generation metadata</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Document Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-primary" />
              Document Status Distribution
            </CardTitle>
            <CardDescription>Breakdown of document statuses</CardDescription>
          </CardHeader>
          <CardContent>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Project Health Indicators
            </CardTitle>
            <CardDescription>PMBOK-aligned project performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

      {/* Project Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Members
            </CardTitle>
          </CardHeader>
          <CardContent>
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
