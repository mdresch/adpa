"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Search, FileText, Download, AlertTriangle, CheckCircle2, Clock, Target, Sparkles, Activity, Calendar, DollarSign, ShieldCheck, Users } from "@/components/ui/icons-shim"
import { toast } from '@/lib/notify'
import { PMBOK8DomainDashboard } from "./PMBOK8DomainDashboard"
import { ProjectTeamView } from "./ProjectTeamView"
import { TaskGanttViewNew } from "./TaskGanttViewNew"
import { useTasks } from "@/hooks/use-tasks"
import { cn } from "@/lib/utils"

interface ProjectDashboardV0Props {
  projectId: string
}

interface ProjectData {
  id: string
  name: string
  description?: string
  status: string
  owner_name?: string
  progress?: number
}

interface Document {
  id: string
  name: string
  template_framework?: string
  version?: number
  created_at?: string
  updated_at?: string
  has_drift?: boolean
  extracted_count?: Record<string, number>
}

interface Baseline {
  id: string
  version: string
  status: string
  approved_at?: string
  entity_count?: number
  completeness_score?: number
  drift_count?: number
}

const milestones = [
  { name: "Requirements Complete", date: "Jan 15", status: "complete", note: "On Time" },
  { name: "Design Approved", date: "Feb 28", status: "complete", note: "5 days late" },
  { name: "Development Phase", date: "Mar 30", status: "in-progress", note: "In Progress (75%)" },
  { name: "Testing & QA", date: "Apr 30", status: "not-started", note: "Not Started" },
  { name: "Production Deployment", date: "May 15", status: "not-started", note: "Upcoming" },
]

// Entity type mapping for display
const ENTITY_TYPE_MAP: Record<string, { label: string; icon: string }> = {
  stakeholders: { label: "Stakeholders", icon: "👥" },
  requirements: { label: "Requirements", icon: "📋" },
  risks: { label: "Risks", icon: "⚠️" },
  milestones: { label: "Milestones", icon: "🎯" },
  constraints: { label: "Constraints", icon: "🚧" },
  successCriteria: { label: "Success Criteria", icon: "✨" },
  bestPractices: { label: "Best Practices", icon: "💡" },
  phases: { label: "Phases", icon: "📅" },
  resources: { label: "Resources", icon: "💰" },
  qualityStandards: { label: "Quality", icon: "✅" },
  complianceSecurity: { label: "Compliance & Security", icon: "🛡️" },
  deliverables: { label: "Deliverables", icon: "📦" },
  scopeItems: { label: "Scope Items", icon: "📋" },
  activities: { label: "Activities", icon: "📊" },
  technologies: { label: "Technologies", icon: "🔧" },
  teamAgreements: { label: "Team Agreements", icon: "🤝" },
  developmentApproaches: { label: "Development Approach", icon: "🧭" },
  projectIterations: { label: "Project Iterations", icon: "🔁" },
  workItems: { label: "Work Items", icon: "📌" },
  capacityPlans: { label: "Capacity Plans", icon: "🗂️" },
  performanceMeasurements: { label: "Performance Measurements", icon: "📈" },
  earnedValueMetrics: { label: "EVM Metrics", icon: "💹" },
  opportunities: { label: "Opportunities", icon: "🚀" },
  riskResponses: { label: "Risk Responses", icon: "🛠️" },
  performanceActuals: { label: "Performance Actuals", icon: "⚙️" }
}
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

const StatCard = ({ title, value, status, label, subtext, icon: Icon, delay }: any) => (
  <Card className={cn("hover-lift animate-fade-in-up border-border/50 transition-all duration-300",
    status === 'green' && "bg-gradient-to-br from-green-50/50 to-transparent dark:from-green-900/10",
    status === 'amber' && "bg-gradient-to-br from-yellow-50/50 to-transparent dark:from-yellow-900/10",
    status === 'red' && "bg-gradient-to-br from-red-50/50 to-transparent dark:from-red-900/10"
  )} style={{ animationDelay: `${delay}ms` }}>
    <CardContent className="p-6">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2 rounded-lg ${status === 'green' ? 'bg-green-100/50 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
          status === 'amber' ? 'bg-yellow-100/50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
            'bg-gray-100/50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400'
          }`}>
          <Icon className="h-5 w-5" />
        </div>
        {label && (
          <Badge variant="outline" className={cn(
            status === 'green' && "border-green-200 text-green-700 dark:border-green-900 dark:text-green-400",
            status === 'amber' && "border-yellow-200 text-yellow-700 dark:border-yellow-900 dark:text-yellow-400",
          )}>
            {label}
          </Badge>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </div>
    </CardContent>
  </Card>
)

export default function ProjectDashboardV0({ projectId }: ProjectDashboardV0Props) {
  const router = useRouter()
  const [project, setProject] = useState<ProjectData | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [baselines, setBaselines] = useState<Baseline[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("overview")
  const [entityCounts, setEntityCounts] = useState<Record<string, number> | null>(null)
  const [pmbok8Summary, setPmbok8Summary] = useState<{
    totalEntities: number
    domainCoverage: Record<string, boolean>
    overallHealth: number | null
  } | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionStatus, setExtractionStatus] = useState<string>("")
  const [loadingEntities, setLoadingEntities] = useState(true)
  const { tasks, loading: tasksLoading } = useTasks(projectId)

  useEffect(() => {
    if (!projectId || projectId === 'undefined') return
    void fetchProjectData()
    void fetchDocuments()
    void fetchBaselines()
    void fetchPMBOK8Summary()
  }, [projectId])

  const fetchProjectData = async () => {
    if (!projectId || projectId === 'undefined') return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch project')

      const data = await response.json()
      setProject(data.project || data)
    } catch (error) {
      console.error('Failed to fetch project:', error)
      toast.error('Failed to load project data')
    }
  }

  const fetchDocuments = async () => {
    if (!projectId || projectId === 'undefined') return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/documents/project/${projectId}?limit=100`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch documents')

      const data = await response.json()
      setDocuments(data.documents || [])
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    }
  }

  const fetchBaselines = async () => {
    if (!projectId || projectId === 'undefined') return
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/baselines/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to fetch baselines')

      const data = await response.json()
      setBaselines(data.baselines || [])
    } catch (error) {
      console.error('Failed to fetch baselines:', error)
    }
  }

  const handleRunFullExtraction = async () => {
    if (!projectId || projectId === 'undefined') {
      toast.error('Invalid project')
      return
    }
    try {
      setIsExtracting(true)
      setExtractionProgress(0)
      setExtractionStatus("Starting extraction...")

      // Get AI providers to use default provider/model
      const providersResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/ai-providers`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })

      const providers = await providersResponse.json()

      // Find active provider with models (check both normalized and raw formats)
      const activeProvider = providers.find((p: any) => {
        const isActive = p.is_active || p.enabled
        const hasModels = (p.models && p.models.length > 0) ||
          (p.configuration?.models && p.configuration.models.length > 0)
        return isActive && hasModels
      })

      if (!activeProvider) {
        toast.error('No active AI providers with models configured. Please configure a provider first.')
        setIsExtracting(false)
        return
      }

      // Get provider type and model (handle both formats)
      const providerType = activeProvider.type || activeProvider.provider_type
      const models = activeProvider.models || activeProvider.configuration?.models || []
      const modelObj = models[0] || activeProvider.configuration?.model || activeProvider.model

      if (!providerType || !modelObj) {
        toast.error('Provider configuration incomplete. Please check AI provider settings.')
        setIsExtracting(false)
        return
      }

      // Extract model ID string from model object (if it's an object) or use as-is (if already a string)
      const modelId = typeof modelObj === 'string' ? modelObj : (modelObj.id || modelObj.name || modelObj.model_id || '')

      if (!modelId) {
        toast.error('Could not determine model ID. Please check AI provider settings.')
        setIsExtracting(false)
        return
      }

      // Build request body - omit documentIds if undefined (extract from all documents)
      const requestBody: any = {
        projectId,
        aiProvider: providerType,
        aiModel: modelId
      }
      // Only include documentIds if it's a valid array (not undefined/null)
      // If undefined, omit it to extract from all documents

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/project-data-extraction/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || errorData.error || 'Failed to start extraction')
      }

      const data = await response.json()
      setExtractionStatus("Extraction job started")
      toast.success("Extraction started! This may take 2-3 minutes...")

      // Poll job status
      const jobId = data.jobId
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/project-data-extraction/status/${jobId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            }
          })

          if (statusResponse.ok) {
            const statusData = await statusResponse.json()
            setExtractionProgress(statusData.progress || 0)
            setExtractionStatus(statusData.status || "Processing...")

            if (statusData.status === 'completed') {
              clearInterval(pollInterval)
              setIsExtracting(false)
              setExtractionProgress(100)
              toast.success(`Extraction complete! ${statusData.result?.totalEntities || 0} entities extracted.`)

              // Refresh data
              void fetchPMBOK8Summary()
            } else if (statusData.status === 'failed') {
              clearInterval(pollInterval)
              setIsExtracting(false)
              toast.error('Extraction failed. Please try again.')
            }
          }
        } catch (error) {
          console.error('Failed to poll extraction status:', error)
        }
      }, 2000) // Poll every 2 seconds

      // Cleanup interval after 5 minutes (safety timeout)
      setTimeout(() => {
        clearInterval(pollInterval)
        setIsExtracting(false)
        toast.info('Extraction is still running. Check the AI Extraction tab for progress.')
      }, 300000) // 5 minutes

    } catch (error) {
      console.error('Extraction failed:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to start extraction')
      setIsExtracting(false)
      setExtractionProgress(0)
      setExtractionStatus("")
    }
  }

  const fetchPMBOK8Summary = async () => {
    if (!projectId || projectId === 'undefined') return
    try {
      setLoadingEntities(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/project-data-extraction/results/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      })
      if (response.ok) {
        const data = await response.json()
        setPmbok8Summary({
          totalEntities: data.pmbok8Total || 0,
          domainCoverage: data.domainCoverage || {},
          overallHealth: null
        })
        // Store entity counts for dynamic display
        if (data.entityCounts) {
          setEntityCounts(data.entityCounts)
        }
      }
    } catch (error) {
      // Silently fail - PMBOK 8 data is optional
      console.debug('PMBOK 8 summary not available:', error)
    } finally {
      setLoadingEntities(false)
    }
  }

  const getDocumentActivityData = () => {
    const activityMap: Record<string, number> = {}
    // Initialize last 14 days
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      activityMap[dateStr] = 0
    }

    documents.forEach(doc => {
      if (doc.updated_at) {
        const dateStr = new Date(doc.updated_at).toISOString().split('T')[0]
        if (activityMap[dateStr] !== undefined) {
          activityMap[dateStr]++
        }
      }
    })

    return Object.entries(activityMap).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count
    }))
  }

  const getEntityDistributionData = () => {
    if (!entityCounts) return []
    return Object.entries(entityCounts)
      .filter(([key, val]) => val > 0)
      .map(([key, val]) => ({
        name: ENTITY_TYPE_MAP[key]?.label || key,
        value: val
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) // Top 10
  }

  // Build extracted entities array from API data
  const getExtractedEntities = () => {
    if (!entityCounts) {
      return []
    }

    return Object.entries(entityCounts)
      .filter(([key]) => ENTITY_TYPE_MAP[key])
      .map(([key, count]) => {
        const config = ENTITY_TYPE_MAP[key]
        // Determine status based on count (fresh if > 0, stale if 0)
        // Note: lastExtract would need to come from API if available
        return {
          type: config.label,
          icon: config.icon,
          count: count || 0,
          lastExtract: null, // Will be populated from extraction summary API if available
          status: count > 0 ? "fresh" : "stale" as "fresh" | "stale"
        }
      })
      .sort((a, b) => b.count - a.count) // Sort by count descending
  }

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Sample health data (TODO: Calculate from real metrics)
  const health = {
    schedule: { value: 90, target: 95, status: "green" as const, label: "On Track" },
    budget: { value: 105, target: 100, status: "amber" as const, label: "At Risk" },
    quality: { value: 95, target: 90, status: "green" as const, label: "Good" },
    risk: { level: "medium", highRisks: 5, status: "amber" as const },
    teamMorale: { value: 88, target: 85, status: "green" as const, label: "High" },
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "green":
        return "bg-green-100 text-green-800 border-green-300"
      case "amber":
        return "bg-yellow-100 text-yellow-800 border-yellow-300"
      case "red":
        return "bg-red-100 text-red-800 border-red-300"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case "complete":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "in-progress":
        return <Clock className="h-5 w-5 text-blue-600" />
      default:
        return <div className="h-5 w-5 rounded-full border-2 border-gray-400" />
    }
  }

  const totalEntities = entityCounts ? Object.values(entityCounts).reduce((sum, count) => sum + (count || 0), 0) : 0

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background/50 animate-fade-in-up">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border/40 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.back()} className="hover:bg-primary/5">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Program
              </Button>
              <div className="h-6 w-px bg-border/50" />
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-3">
                  {project.name}
                  <Badge variant="secondary" className="font-normal text-sm">
                    {project.status === 'active' ? <Activity className="h-3 w-3 mr-1 text-green-500" /> : null}
                    {project.status || 'Active'}
                  </Badge>
                </h1>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    {project.owner_name || 'Unassigned'}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    {project.progress || 0}% Complete
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Project Health Scorecard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-stagger">
          <StatCard
            title="Schedule"
            value={`${health.schedule.value}%`}
            status={health.schedule.status}
            label={health.schedule.label}
            subtext={`Target: ${health.schedule.target}%`}
            icon={Calendar}
            delay={100}
          />
          <StatCard
            title="Budget"
            value={`${health.budget.value}%`}
            status={health.budget.status}
            label={health.budget.label}
            subtext={`Target: ${health.budget.target}%`}
            icon={DollarSign}
            delay={200}
          />
          <StatCard
            title="Quality"
            value={`${health.quality.value}%`}
            status={health.quality.status}
            label={health.quality.label}
            subtext={`Target: ${health.quality.target}%`}
            icon={ShieldCheck}
            delay={300}
          />
          <StatCard
            title="Risks"
            value={health.risk.level}
            status={health.risk.status}
            label={`${health.risk.highRisks} High`}
            subtext="Risk Level"
            icon={AlertTriangle}
            delay={400}
          />
          <StatCard
            title="Team Morale"
            value={`${health.teamMorale.value}%`}
            status={health.teamMorale.status}
            label={health.teamMorale.label}
            subtext={`Target: ${health.teamMorale.target}%`}
            icon={Sparkles}
            delay={500}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="documents">📄 Documents</TabsTrigger>
            <TabsTrigger value="baselines">🎯 Baselines</TabsTrigger>
            <TabsTrigger value="ai-extract">🤖 AI Extract</TabsTrigger>
            <TabsTrigger value="pmbok8">🎯 PMBOK 8 Domains</TabsTrigger>
            <TabsTrigger value="analytics">📊 Analytics</TabsTrigger>
            <TabsTrigger value="timeline">📈 Timeline</TabsTrigger>
            <TabsTrigger value="team">👥 Team</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Milestones</CardTitle>
                <CardDescription>Project timeline and milestone tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      {getMilestoneIcon(milestone.status)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{milestone.name}</span>
                          <span className="text-sm text-muted-foreground">{milestone.date}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{milestone.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
                <CardDescription>Key metrics and status overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Overall Progress</span>
                  <span className="text-lg font-semibold">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} className="h-3" />
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Extracted Entities</p>
                    <p className="text-2xl font-bold text-foreground">{totalEntities}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PMBOK 8 Domain Summary */}
            {pmbok8Summary && pmbok8Summary.totalEntities > 0 && (
              <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/20 dark:to-blue-950/20">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-600" />
                        PMBOK 8 Performance Domains
                      </CardTitle>
                      <CardDescription>
                        {pmbok8Summary.totalEntities} entities across 5 performance domains
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setActiveTab("pmbok8")}
                    >
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-3">
                    {Object.entries(pmbok8Summary.domainCoverage).map(([domain, covered]) => {
                      const domainLabels: Record<string, string> = {
                        team: "Team",
                        developmentApproach: "Dev Approach",
                        projectWork: "Project Work",
                        measurement: "Measurement",
                        uncertainty: "Uncertainty"
                      }
                      return (
                        <div
                          key={domain}
                          className={`p-3 rounded-lg border-2 text-center transition-all ${covered
                            ? 'border-green-300 bg-green-50 dark:bg-green-950/20'
                            : 'border-gray-200 bg-gray-50 dark:bg-gray-950/20 opacity-50'
                            }`}
                        >
                          <div className={`text-2xl mb-1 ${covered ? '' : 'opacity-30'}`}>
                            {covered ? '✓' : '○'}
                          </div>
                          <div className="text-xs font-medium text-muted-foreground">
                            {domainLabels[domain] || domain}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {Object.values(pmbok8Summary.domainCoverage).filter(Boolean).length} of 5 domains covered
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveTab("pmbok8")}
                      className="text-purple-600 hover:text-purple-700"
                    >
                      View Full Analytics →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Document Library</CardTitle>
                    <CardDescription>Project documents with AI extraction</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export All
                    </Button>
                    <Button size="sm" onClick={() => router.push(`/documents/new?projectId=${projectId}`)}>
                      <FileText className="h-4 w-4 mr-2" />
                      New Document
                    </Button>
                  </div>
                </div>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {filteredDocuments.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No documents found.</p>
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <Card key={doc.id} className="border-border">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground mt-1" />
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-foreground">{doc.name}</h3>
                                {doc.version && (
                                  <Badge variant="secondary">v{doc.version}</Badge>
                                )}
                                {doc.has_drift && (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Drift Detected
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {doc.template_framework || 'Document'} | {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : 'No date'}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/documents/${doc.id}/view`)}
                            >
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/documents/${doc.id}/edit`)}
                            >
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              Baseline
                            </Button>
                          </div>
                        </div>
                        {doc.extracted_count && Object.keys(doc.extracted_count).length > 0 && (
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>🤖 Extracted:</span>
                            {Object.entries(doc.extracted_count).map(([key, value]) => (
                              <span key={key}>
                                {value} {key}
                              </span>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Baselines Tab */}
          <TabsContent value="baselines" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Baseline Management</CardTitle>
                <CardDescription>Create and manage project baselines from AI entities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-lg border border-border p-6 bg-muted/50">
                  <h3 className="font-semibold text-foreground mb-4">Available Entities for Baseline</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    {getExtractedEntities().map((entity, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="text-green-600">✓</span> {entity.count} {entity.type}
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Total: {totalEntities} entities from {documents.length} documents
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => router.push(`/projects/${projectId}?tab=baselines&action=create-from-entities`)}>
                      Create Baseline from Entities
                    </Button>
                    <Button variant="outline">Create from Docs</Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-foreground mb-4">Approved Baselines</h3>
                  <div className="space-y-4">
                    {baselines.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        No baselines created yet. Create one from your extracted entities above.
                      </p>
                    ) : (
                      baselines.map((baseline, idx) => (
                        <Card key={idx} className="border-border">
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <h4 className="font-semibold text-foreground">
                                    📌 Baseline v{baseline.version}
                                  </h4>
                                  {baseline.status === "approved" && (
                                    <Badge className="bg-primary text-white">Current</Badge>
                                  )}
                                  {baseline.status === "superseded" && <Badge variant="secondary">Superseded</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  Approved {baseline.approved_at ? new Date(baseline.approved_at).toLocaleDateString() : 'N/A'}
                                </p>
                                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>Created from {baseline.entity_count || 0} AI entities</span>
                                  <span>Completeness: {baseline.completeness_score || 0}%</span>
                                  {(baseline.drift_count || 0) > 0 && (
                                    <span className="text-yellow-600">
                                      Drift Status: {baseline.drift_count} changes
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm">
                                  View Details
                                </Button>
                                <Button variant="outline" size="sm">
                                  Compare
                                </Button>
                                {baseline.status === "approved" && (
                                  <Button variant="outline" size="sm">
                                    Revalidate
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Extraction Tab */}
          <TabsContent value="ai-extract" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>AI Extraction Dashboard</CardTitle>
                    <CardDescription>24 entity types extracted from PMBOK 8 standards (14 legacy + 10 Performance Domain entities)</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/projects/${projectId}?tab=extraction`)}
                    >
                      📊 View All Entities
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRunFullExtraction}
                      disabled={isExtracting || documents.length === 0}
                    >
                      {isExtracting ? (
                        <>
                          <Clock className="h-4 w-4 mr-2 animate-spin" />
                          Extracting... {extractionProgress}%
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Run Full Extraction
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isExtracting && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        {extractionStatus || "Extracting project entities..."}
                      </span>
                      <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                        {extractionProgress}%
                      </span>
                    </div>
                    <Progress value={extractionProgress} className="h-2" />
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                      This typically takes 2-3 minutes. Please wait...
                    </p>
                  </div>
                )}
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Entity Type</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Count</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Last Extract</th>
                        <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getExtractedEntities().map((entity, idx) => (
                        <tr key={idx} className="border-t border-border hover:bg-muted/50">
                          <td className="p-3">
                            <span className="text-foreground">
                              {entity.icon} {entity.type}
                            </span>
                          </td>
                          <td className="p-3 text-foreground font-semibold">{entity.count}</td>
                          <td className="p-3 text-muted-foreground">{entity.lastExtract || "—"}</td>
                          <td className="p-3">
                            <Badge
                              className={
                                entity.status === "fresh"
                                  ? "bg-green-100 text-green-800 border-green-300"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-300"
                              }
                            >
                              {entity.status === "fresh" ? "✓ Fresh" : "⟳ Stale"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      <tr className="border-t-2 border-border bg-muted/50 font-semibold">
                        <td className="p-3 text-foreground">TOTAL</td>
                        <td className="p-3 text-foreground">{totalEntities}</td>
                        <td className="p-3 text-muted-foreground">Coverage: 92%</td>
                        <td className="p-3"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PMBOK 8 Domains Tab */}
          <TabsContent value="pmbok8" className="space-y-6">
            <PMBOK8DomainDashboard projectId={projectId} />
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entity Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Entity Distribution</CardTitle>
                  <CardDescription>Breakdown of extracted project entities</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getEntityDistributionData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {getEntityDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      {/* <Legend /> */}
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Document Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Document Activity</CardTitle>
                  <CardDescription>Document updates over the last 14 days</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getDocumentActivityData()}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Burndown Chart (Mock) */}
              <Card>
                <CardHeader>
                  <CardTitle>Sprint Burndown</CardTitle>
                  <CardDescription>Remaining effort vs ideal burndown</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={[
                        { day: 'Day 1', ideal: 100, actual: 100 },
                        { day: 'Day 2', ideal: 90, actual: 95 },
                        { day: 'Day 3', ideal: 80, actual: 88 },
                        { day: 'Day 4', ideal: 70, actual: 72 },
                        { day: 'Day 5', ideal: 60, actual: 65 },
                        { day: 'Day 6', ideal: 50, actual: 45 },
                        { day: 'Day 7', ideal: 40, actual: 38 },
                        { day: 'Day 8', ideal: 30, actual: 30 },
                        { day: 'Day 9', ideal: 20, actual: 15 },
                        { day: 'Day 10', ideal: 10, actual: 8 },
                      ]}
                    >
                      <defs>
                        <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: 'var(--background)', borderColor: 'var(--border)' }}
                        itemStyle={{ color: 'var(--foreground)' }}
                      />
                      <Area type="monotone" dataKey="ideal" stroke="#82ca9d" fillOpacity={0} strokeDasharray="5 5" />
                      <Area type="monotone" dataKey="actual" stroke="#8884d8" fillOpacity={1} fill="url(#colorActual)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Risk Heat Map (Mock Grid) */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Heat Map</CardTitle>
                  <CardDescription>Risk distribution by probability and impact</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px] flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[300px]">
                    {/* Row 3 - High Impact */}
                    <div className="h-20 bg-yellow-200 dark:bg-yellow-900/30 rounded flex items-center justify-center border border-yellow-300">Target</div>
                    <div className="h-20 bg-orange-200 dark:bg-orange-900/30 rounded flex items-center justify-center border border-orange-300">Schedule</div>
                    <div className="h-20 bg-red-200 dark:bg-red-900/30 rounded flex items-center justify-center border border-red-300 font-bold">Budget (Critical)</div>

                    {/* Row 2 - Med Impact */}
                    <div className="h-20 bg-green-200 dark:bg-green-900/30 rounded flex items-center justify-center border border-green-300">Staffing</div>
                    <div className="h-20 bg-yellow-200 dark:bg-yellow-900/30 rounded flex items-center justify-center border border-yellow-300">Scope</div>
                    <div className="h-20 bg-orange-200 dark:bg-orange-900/30 rounded flex items-center justify-center border border-orange-300">Quality</div>

                    {/* Row 1 - Low Impact */}
                    <div className="h-20 bg-green-200 dark:bg-green-900/30 rounded flex items-center justify-center border border-green-300">Technology</div>
                    <div className="h-20 bg-green-200 dark:bg-green-900/30 rounded flex items-center justify-center border border-green-300">Compliance</div>
                    <div className="h-20 bg-yellow-200 dark:bg-yellow-900/30 rounded flex items-center justify-center border border-yellow-300">Legal</div>
                  </div>
                  <div className="absolute bottom-4 right-8 text-xs text-muted-foreground">
                    X: Probability | Y: Impact
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline" className="space-y-6 h-[calc(100vh-200px)]">
            {tasksLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <TaskGanttViewNew tasks={tasks} projectId={projectId} />
            )}
          </TabsContent>

          {/* Team Tab */}
          <TabsContent value="team" className="space-y-6">
            <ProjectTeamView projectId={projectId} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

