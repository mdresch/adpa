"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
// @ts-expect-error - useParams is available in Next.js 14
import { useParams, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { BaselineGanttChart } from "@/components/BaselineGanttChart"
import { BaselineManagement } from "./components/BaselineManagement"
import { ProjectDataExtraction } from "./components/ProjectDataExtraction"
import { PerformanceDashboard } from "@/components/project/PerformanceDashboard"
import { StakeholdersTab } from "./components/StakeholdersTab"
import { TeamAgreementsTab } from "./components/TeamAgreementsTab"
import { DevelopmentApproachTab } from "./components/DevelopmentApproachTab"
import LessonsTab from "./components/LessonsTab"
import { VariablesTab } from "./components/VariablesTab"
import { TimelineTab } from "./components/TimelineTab"
import { OverviewTab } from "./components/OverviewTab"
import { DocumentsTab } from "./components/DocumentsTab"
import { ProjectContextTab } from "./components/ProjectContextTab"
import ProjectFinancialsTab from "@/components/project/ProjectFinancialsTab"
import { ProjectRisksTab } from "@/components/project/ProjectRisksTab"
import { ProjectIssuesTab } from "@/components/project/ProjectIssuesTab"
import { ComplianceSecurityTab } from "./components/ComplianceSecurityTab"
import { IntegrationsTab } from "./components/IntegrationsTab"
import { DigitalTwinAnalyticsTab } from "./components/DigitalTwinAnalyticsTab"
import { TemplateConflictDialog } from "@/components/document/TemplateConflictDialog"
import { apiClient, Project, Template } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { toast } from '@/lib/notify'
import { useRouter } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FolderOpen,
  FileText,
  Plus,
  Search,
  Edit,
  Download,
  Trash2,
  Calendar,
  Users,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Loader2,
  TrendingUp,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Grid,
  List,
  Zap,
  XCircle,
  RefreshCw,
  Settings,
  Copy,
  Lightbulb,
  Database,
  Shield,
  ExternalLink,
} from "@/components/ui/icons-shim"
import { Users2, Code, Layers } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import dynamic from 'next/dynamic'

const SimpleLineChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.SimpleLineChart), { ssr: false })
const MultiBarChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.MultiBarChart), { ssr: false })
const GenericPieChart = dynamic(() => import('@/components/charts/RechartsWrappers').then(m => m.GenericPieChart), { ssr: false })

// Status configuration for template badges
const statusConfig = {
  draft: { emoji: '⚪', label: 'Draft', color: 'secondary', variant: 'secondary' as const },
  testing: { emoji: '🔵', label: 'Testing', color: 'blue', variant: 'default' as const },
  compliance: { emoji: '🟣', label: 'Compliance', color: 'purple', variant: 'default' as const },
  validated: { emoji: '🟡', label: 'Validated', color: 'yellow', variant: 'default' as const },
  production: { emoji: '🟢', label: 'Production', color: 'green', variant: 'default' as const },
  archived: { emoji: '📦', label: 'Archived', color: 'gray', variant: 'secondary' as const },
  deprecated: { emoji: '🔴', label: 'Deprecated', color: 'red', variant: 'destructive' as const },
}

const healthConfig = {
  'Excellent': { color: 'text-green-600', bgColor: 'bg-green-50', icon: '⭐' },
  'Good': { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: '✓' },
  'Fair': { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: '◐' },
  'Needs Improvement': { color: 'text-orange-600', bgColor: 'bg-orange-50', icon: '⚠' },
}

interface Document {
  id: string
  project_id: string
  name: string
  content?: any
  template_id?: string
  template_name?: string
  status: string
  version: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
  priority_rank?: number
  dependency_level?: number
  character_count?: number
  word_count?: number
  document?: any
}

interface Stakeholder {
  id: string
  project_id: string
  name?: string
  role: string
  department?: string
  email: string
  phone?: string
  interest_level: 'high' | 'medium' | 'low'
  influence_level: 'high' | 'medium' | 'low'
  engagement_approach: 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'
  communication_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'
  stakeholder_type: 'internal' | 'external'
  stakeholder_category: 'primary' | 'secondary'
  expectations?: string
  potential_impact?: string
  is_team_member?: boolean
  created_at: string
  updated_at: string
}

// Extended Project interface to include settings and metadata
interface ExtendedProject extends Project {
  settings?: any
  metadata?: any
}

// CR-2026-001: Baseline Management Component - extracted to components/BaselineManagement.tsx

export default function ProjectDetail() {
  const params = useParams()
  const searchParams = useSearchParams()
  const projectId = params?.id as string
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { joinRoom, leaveRoom } = useWebSocket()

  // Get initial tab from query parameter, default to "overview"
  const initialTab = searchParams?.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState<string>(initialTab)

  const [project, setProject] = useState<ExtendedProject | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [stakeholdersLoading, setStakeholdersLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  // Update active tab when query parameter changes
  useEffect(() => {
    const tabFromQuery = searchParams?.get('tab')
    if (tabFromQuery) {
      setActiveTab(tabFromQuery)
    }
  }, [searchParams])

  // Smart Document Versioning state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflictData, setConflictData] = useState<{
    existingDocument: any
    templateName: string
    generationData: any
  } | null>(null)
  const [documentsPagination, setDocumentsPagination] = useState<{
    page: number
    limit: number
    total: number
    pages: number
  }>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })
  const [documentStats, setDocumentStats] = useState<{
    totalDocuments: number
    counts: {
      draft: number
      published: number
      review: number
      archived: number
    }
  }>({
    totalDocuments: 0,
    counts: { draft: 0, published: 0, review: 0, archived: 0 }
  })
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [documentName, setDocumentName] = useState("")
  const [documentDescription, setDocumentDescription] = useState("")
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false)
  const [upgradeToProgramDialogOpen, setUpgradeToProgramDialogOpen] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  // AI Provider selection for document generation
  const [aiProviders, setAiProviders] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState("Mistral AI")
  const [selectedModel, setSelectedModel] = useState("mistral-large-latest")
  const [aiTemperature, setAiTemperature] = useState(0.7)
  const [updating, setUpdating] = useState(false)

  // Generation progress tracking
  const [generationProgress, setGenerationProgress] = useState({
    step: 0,
    totalSteps: 4,
    message: '',
    percentage: 0,
  })
  const [stakeholderDialogOpen, setStakeholderDialogOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState<Stakeholder | null>(null)
  const [savingStakeholder, setSavingStakeholder] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [linkingUser, setLinkingUser] = useState(false)

  // Document upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [usedTemplateIds, setUsedTemplateIds] = useState<Set<string>>(new Set())
  const [uploadForm, setUploadForm] = useState<{
    name: string
    file: File | null
    template_id: string
  }>({
    name: "",
    file: null,
    template_id: "",
  })

  // Edit form state
  const [editForm, setEditForm] = useState<{
    name: string
    description: string
    framework: string
    status: string
    priority: string
    start_date: string
    end_date: string
    budget: string
    manager: string
    team_members: string[] // Deprecated: kept for compatibility but not used
  }>({
    name: "",
    description: "",
    framework: "",
    status: "",
    priority: "",
    start_date: "",
    end_date: "",
    budget: "",
    manager: "",
    team_members: [] // Team members are now managed through stakeholders
  })

  // Stakeholder form state
  const [stakeholderForm, setStakeholderForm] = useState<{
    name: string
    role: string
    department: string
    email: string
    phone: string
    interest_level: 'high' | 'medium' | 'low'
    influence_level: 'high' | 'medium' | 'low'
    engagement_approach: 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'
    communication_frequency: 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'
    stakeholder_type: 'internal' | 'external'
    stakeholder_category: 'primary' | 'secondary'
    expectations: string
    potential_impact: string
    is_team_member: boolean
  }>({
    name: "",
    role: "",
    department: "",
    email: "",
    phone: "",
    interest_level: "medium",
    influence_level: "medium",
    engagement_approach: "keep_informed",
    communication_frequency: "weekly",
    stakeholder_type: "internal",
    stakeholder_category: "primary",
    expectations: "",
    potential_impact: "",
    is_team_member: false
  })

  // Fetch project data
  const fetchProject = async () => {
    try {
      setLoading(true)
      const projectData = await apiClient.getProject(projectId)
      setProject(projectData)

      // Also fetch documents and stakeholders for this project
      await Promise.all([fetchDocuments(), fetchStakeholders()])
    } catch (error) {
      console.error("Failed to fetch project:", error)
      toast.error("Failed to load project")
      // Don't set mock data - let the UI show error state
      setProject(null)
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch documents separately
  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true)
      const params = {
        page: documentsPagination.page,
        limit: documentsPagination.limit,
        search: searchTerm || undefined,
      }
      const documentsData = await apiClient.getProjectDocuments(projectId, params)
      setDocuments(documentsData.documents || [])
      setDocumentsPagination(documentsData.pagination || {
        page: 1,
        limit: 10,
        total: 0,
        pages: 0,
      })

      // Extract used template IDs from documents
      const usedTemplates = new Set<string>()
      if (documentsData.documents && Array.isArray(documentsData.documents)) {
        documentsData.documents.forEach((doc: Document) => {
          if (doc.template_id) {
            usedTemplates.add(doc.template_id)
          }
        })
      }
      setUsedTemplateIds(usedTemplates)

      // Fetch stats for accurate counts (not affected by pagination)
      await fetchDocumentStats()
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      // Don't show error toast for documents, just use empty array
      setDocuments([])
      setUsedTemplateIds(new Set())
    } finally {
      setDocumentsLoading(false)
    }
  }

  // Fetch document statistics (total counts by status)
  const fetchDocumentStats = async () => {
    try {
      const stats = await apiClient.request(`/documents/project/${projectId}/stats`)
      setDocumentStats({
        totalDocuments: stats.totalDocuments || 0,
        counts: {
          draft: stats.counts?.draft || stats.byStatus?.draft || 0,
          published: stats.counts?.published || stats.byStatus?.published || 0,
          review: stats.counts?.underReview || stats.byStatus?.review || 0,
          archived: stats.counts?.archived || stats.byStatus?.archived || 0,
        }
      })
    } catch (error) {
      console.error("Failed to fetch document stats:", error)
      // Fallback to paginated count if stats fail
      setDocumentStats({
        totalDocuments: documentsPagination.total || 0,
        counts: { draft: 0, published: 0, review: 0, archived: 0 }
      })
    }
  }

  // Fetch all used template IDs for the project (for template usage indicator)
  const fetchUsedTemplateIds = async () => {
    try {
      // Fetch all documents (with high limit) to get all template IDs
      const params = {
        page: 1,
        limit: 1000, // High limit to get all documents
      }
      const documentsData = await apiClient.getProjectDocuments(projectId, params)

      // Extract unique template IDs
      const usedTemplates = new Set<string>()
      if (documentsData.documents && Array.isArray(documentsData.documents)) {
        documentsData.documents.forEach((doc: Document) => {
          if (doc.template_id) {
            usedTemplates.add(doc.template_id)
          }
        })
      }
      setUsedTemplateIds(usedTemplates)
    } catch (error) {
      console.error("Failed to fetch used template IDs:", error)
      // Fallback to empty set
      setUsedTemplateIds(new Set())
    }
  }

  // Fetch stakeholders separately
  const fetchStakeholders = async () => {
    try {
      setStakeholdersLoading(true)
      const stakeholdersData = await apiClient.getProjectStakeholders(projectId)
      setStakeholders(Array.isArray(stakeholdersData.stakeholders) ? stakeholdersData.stakeholders : [])
    } catch (error) {
      console.error("Failed to fetch stakeholders:", error)
      // Fallback to empty array if API fails
      setStakeholders([])
    } finally {
      setStakeholdersLoading(false)
    }
  }

  // Returns template content based on selected template
  function getTemplateContent(templateId: string) {
    // Find template from the loaded templates
    const template = templates.find(t => t.id === templateId)

    if (template) {
      // Extract detailed sections based on template name
      let sections: string[] = []
      const templateName = template.name.toLowerCase()

      if (templateName.includes('integration management')) {
        sections = [
          'Executive Summary (200+ words): Project overview with name/manager/sponsor/dates/budget, 3-5 key measurable objectives, integration approach, expected benefits and ROI',
          'Project Charter (400+ words): Purpose and business justification, objectives table with success metrics, measurable success criteria, high-level requirements (functional/technical/performance/business), assumptions and constraints lists, key stakeholders table, initial risks',
          'Project Management Plan (800+ words covering ALL 9 knowledge areas): 2.1 Scope Management (collection, definition, WBS, validation, control), 2.2 Schedule Management (activities, sequencing, estimation, milestones table), 2.3 Cost Management (estimation, budget table, baseline, EVM), 2.4 Quality Management (standards, QA/QC, metrics table), 2.5 Resource Management (team structure table, acquisition, development), 2.6 Communications Management (stakeholder matrix, channels, schedule, tools), 2.7 Risk Management (identification, analysis, response, top risks table), 2.8 Procurement Management (items, vendors, contracts), 2.9 Stakeholder Engagement (stakeholder matrix, strategies)',
          'Integrated Change Control (300+ words): 7-step change control workflow, CCB structure with members table, change request form fields, impact assessment criteria (scope/schedule/cost/quality/risk/resources), approval criteria with 3 levels (PM/CCB/Sponsor thresholds)',
          'Project Work Performance (300+ words): KPI table with at least 6 KPIs (SPI, CPI, defects, coverage, velocity, satisfaction) with targets and measurement methods, data collection sources and methods, performance reporting (weekly status, monthly dashboard), corrective action triggers and process',
          'Integration Points (150+ words): System integrations (tools/APIs/platforms), Process integrations (workflows/handoffs)',
          'Approval Signatures: Table with Role | Name | Signature | Date columns, Document version and review schedule'
        ]
      } else if (templateName.includes('scope')) {
        sections = ['Scope Overview', 'Requirements Management', 'Scope Definition', 'WBS', 'Validation', 'Control']
      } else if (templateName.includes('schedule')) {
        sections = ['Schedule Overview', 'Activity Definition', 'Sequencing', 'Estimation', 'Development', 'Control']
      } else if (templateName.includes('cost') || templateName.includes('budget')) {
        sections = ['Cost Overview', 'Estimation Methods', 'Budget Baseline', 'Control Processes', 'Earned Value']
      } else if (templateName.includes('quality')) {
        sections = ['Quality Overview', 'Planning', 'Assurance', 'Control', 'Metrics', 'Improvement']
      } else if (templateName.includes('resource')) {
        sections = ['Resource Planning', 'Acquisition', 'Development', 'Management', 'Performance']
      } else if (templateName.includes('communication')) {
        sections = ['Communications Overview', 'Stakeholder Analysis', 'Channels & Methods', 'Schedule', 'Tools']
      } else if (templateName.includes('risk')) {
        sections = ['Risk Overview', 'Identification', 'Analysis', 'Response Planning', 'Monitoring & Control']
      } else if (templateName.includes('procurement')) {
        sections = ['Procurement Overview', 'Planning', 'Vendor Selection', 'Contract Management', 'Closeout']
      } else if (templateName.includes('stakeholder')) {
        sections = ['Stakeholder Identification', 'Analysis Matrix', 'Engagement Strategy', 'Management Plan']
      } else if (templateName.includes('charter')) {
        sections = ['Purpose & Justification', 'Objectives', 'Success Criteria', 'Requirements', 'Constraints']
      } else if (templateName.includes('business case')) {
        sections = ['Executive Summary', 'Problem Statement', 'Solution Options', 'Analysis', 'Recommendation']
      } else {
        sections = ['Overview', 'Objectives', 'Approach', 'Key Components', 'Implementation', 'Metrics']
      }

      return {
        title: template.name,
        sections: sections,
        framework: template.framework || 'General'
      }
    }

    return { title: documentName || "Document", sections: ['Overview', 'Details'], framework: 'General' }
  }

  // Handle template selection with conflict check
  const handleTemplateSelect = async (templateId: string) => {
    console.log('📋 [TEMPLATE-SELECT] Template selected:', templateId)
    setSelectedTemplate(templateId)

    // If no template selected (user cleared selection), return
    if (!templateId) {
      return
    }

    // Check for template conflict immediately
    console.log('🔍 [TEMPLATE-SELECT] Checking for conflicts...')
    try {
      const { getApiUrl } = await import('@/lib/api-url')
      const checkUrl = getApiUrl(`/document-generation/check-template`)
      const checkResp = await fetch(checkUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          projectId,
          templateId
        })
      })

      if (checkResp.status === 409) {
        // Template conflict detected!
        const conflictInfo = await checkResp.json()
        console.log('⚠️ [TEMPLATE-SELECT] Conflict detected - showing dialog')

        const template = templates.find(t => t.id === templateId)

        // We don't have the prompt yet, so we'll build it when needed
        setConflictData({
          existingDocument: conflictInfo.existing,
          templateName: template?.name || 'Unknown Template',
          generationData: {
            projectId,
            templateId,
            documentName,
            documentDescription,
            provider: selectedProvider,
            model: selectedModel,
            temperature: aiTemperature,
            // Note: userPrompt will be built when user selects action
          }
        })
        setConflictDialogOpen(true)
      } else {
        console.log('✅ [TEMPLATE-SELECT] No conflict - template is available')
      }
    } catch (checkError) {
      console.log('ℹ️ [TEMPLATE-SELECT] Conflict check failed, proceeding normally')
      // Continue normally if check fails
    }
  }

  // Create new document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🚀 [1/10] handleCreateDocument called')

    // CRITICAL FIX: Prevent duplicate submissions
    if (creatingDocument) {
      console.warn('⚠️ [GUARD] Already creating document, ignoring duplicate call')
      return
    }

    if (!documentName.trim()) {
      console.error('❌ [VALIDATION] Document name is empty')
      toast.error("Document name is required")
      return
    }
    console.log('✅ [2/10] Document name validated:', documentName)

    if (!selectedTemplate) {
      console.error('❌ [VALIDATION] No template selected')
      toast.error("Please select a template")
      return
    }
    console.log('✅ [3/10] Template validated:', selectedTemplate)

    try {
      setCreatingDocument(true)
      console.log('✅ [4/10] Creating document flag set to true')

      // Step 1: Preparing context
      setGenerationProgress({
        step: 1,
        totalSteps: 4,
        message: 'Preparing project context...',
        percentage: 25,
      })
      console.log('✅ [5/10] Progress indicator set to Step 1 (25%)')

      // Build a comprehensive prompt for the AI using template + project context
      const templateContent = getTemplateContent(selectedTemplate)
      const sections = Array.isArray(templateContent.sections) ? templateContent.sections : []
      const projectDesc = project?.description || 'No project description available.'
      const projectName = project?.name || 'Unknown Project'
      const framework = project?.framework || 'General'

      // Build detailed context
      const teamContext = project?.team_members?.length
        ? `Team Members: ${project.team_members.join(', ')}`
        : 'Team composition to be determined'
      const budgetContext = project?.budget
        ? `Budget: $${project.budget}`
        : 'Budget to be determined'
      const timelineContext = project?.start_date && project?.end_date
        ? `Timeline: ${project.start_date} to ${project.end_date}`
        : 'Timeline to be determined'

      // 🆕 SMART DOCUMENT LIBRARY CONTEXT - Prioritize relevant documents
      const getPrioritizedDocuments = (templateName: string, allDocs: Document[]) => {
        // 🆕 PROJECT LIFECYCLE ORDER - Documents in logical progression
        const lifecycleOrder: { [key: string]: number } = {
          'ideation': 1,
          'business case': 2,
          'project charter': 3,
          'charter': 3,
          'stakeholder': 4,
          'scope': 5,
          'requirement': 6,
          'schedule': 7,
          'cost': 8,
          'budget': 8,
          'resource': 9,
          'quality': 10,
          'risk': 11,
          'communication': 12,
          'procurement': 13,
          'integration': 14,
          'closeout': 15,
          'lessons': 16,
        }

        const priorities: { [key: string]: string[] } = {
          'ideation': [],
          'business case': ['ideation'],
          'charter': ['business case', 'ideation', 'stakeholder'],
          'stakeholder': ['charter', 'business case', 'ideation'],
          'scope': ['charter', 'stakeholder', 'business case', 'requirement'],
          'requirement': ['charter', 'stakeholder', 'business case'],
          'schedule': ['charter', 'scope', 'requirement', 'resource'],
          'cost': ['charter', 'scope', 'schedule', 'requirement', 'resource'],
          'budget': ['charter', 'scope', 'schedule', 'requirement', 'resource'],
          'resource': ['charter', 'scope', 'schedule', 'requirement'],
          'quality': ['charter', 'scope', 'requirement', 'stakeholder'],
          'risk': ['charter', 'stakeholder', 'scope', 'schedule', 'cost', 'requirement'],
          'communication': ['stakeholder', 'charter', 'scope'],
          'procurement': ['charter', 'scope', 'cost', 'risk', 'requirement'],
          'integration': ['charter', 'scope', 'schedule', 'cost', 'quality', 'risk', 'stakeholder'],
          'project management plan': ['charter', 'stakeholder', 'scope', 'schedule', 'cost', 'quality', 'resource', 'communication', 'risk', 'procurement'],
          'closeout': ['charter', 'scope', 'schedule', 'cost', 'quality', 'risk'],
          'lessons': ['charter', 'scope', 'schedule', 'cost', 'quality', 'risk', 'stakeholder'],
        }

        const templateLower = templateName.toLowerCase()
        let priorityKeywords: string[] = []

        // Find matching priority list
        for (const [key, keywords] of Object.entries(priorities)) {
          if (templateLower.includes(key)) {
            priorityKeywords = keywords
            break
          }
        }

        // If no specific priority, use general order
        if (priorityKeywords.length === 0) {
          priorityKeywords = ['charter', 'stakeholder', 'scope', 'risk', 'schedule', 'cost']
        }

        // Score and sort documents
        const scoredDocs = allDocs
          .filter(doc => doc.status === 'final' || doc.status === 'approved' || doc.status === 'draft')
          .map(doc => {
            const docName = (doc.name || '').toLowerCase()
            const templateNameLower = (doc.template_name || '').toLowerCase()

            let score = 0

            // 1. Priority keyword matching (highest weight)
            priorityKeywords.forEach((keyword, index) => {
              const priority = priorityKeywords.length - index
              if (docName.includes(keyword) || templateNameLower.includes(keyword)) {
                score += priority * 10
              }
            })

            // 2. Lifecycle order bonus - favor earlier documents (foundation)
            let docLifecyclePhase = 99 // Default high number (late)
            for (const [key, phase] of Object.entries(lifecycleOrder)) {
              if (docName.includes(key) || templateNameLower.includes(key)) {
                docLifecyclePhase = Math.min(docLifecyclePhase, phase)
              }
            }

            // Earlier documents get higher bonus (inverted: 16 - phase)
            const lifecycleBonus = Math.max(0, 16 - docLifecyclePhase)
            score += lifecycleBonus * 3 // Moderate weight

            // 3. Status boost (quality indicator)
            if (doc.status === 'approved') score += 10
            if (doc.status === 'final') score += 7
            if (doc.status === 'draft') score += 2

            return { doc, score, lifecyclePhase: docLifecyclePhase }
          })
          .filter(item => item.score > 0) // Only include relevant documents
          .sort((a, b) => {
            // Primary sort: by score (relevance + lifecycle + status)
            if (b.score !== a.score) return b.score - a.score
            // Secondary sort: by lifecycle order (earlier first)
            return a.lifecyclePhase - b.lifecyclePhase
          })
          .slice(0, 10) // 🆕 INCREASED LIMIT: Top 10 for complex dependencies
          .map(item => ({
            ...item.doc,
            priority_rank: item.score,
            dependency_level: Math.ceil(item.score / 20) // Group by dependency strength
          }))

        return scoredDocs
      }

      // 🆕 BUILD DOCUMENT LIBRARY CONTEXT
      let documentLibraryContext = ''
      const relevantDocs = getPrioritizedDocuments(templateContent.title, documents)

      // Get lifecycle phase for current template
      const getTemplatePhase = (name: string): { phase: number; name: string } => {
        const nameLower = name.toLowerCase()
        const phases: Record<string, number> = {
          'ideation': 1, 'business case': 2, 'charter': 3, 'stakeholder': 4,
          'scope': 5, 'requirement': 6, 'schedule': 7, 'cost': 8, 'budget': 8,
          'resource': 9, 'quality': 10, 'risk': 11, 'communication': 12,
          'procurement': 13, 'integration': 14, 'closeout': 15, 'lessons': 16
        }
        for (const [key, phase] of Object.entries(phases)) {
          if (nameLower.includes(key)) return { phase, name: key }
        }
        return { phase: 99, name: 'other' }
      }

      const currentTemplatePhase = getTemplatePhase(templateContent.title)

      console.log('📚 [CONTEXT-1/3] Document Library Analysis:')
      console.log('  Total documents in project:', documents.length)
      console.log('  Template being generated:', templateContent.title, `(Phase ${currentTemplatePhase.phase})`)
      console.log('  Prioritized documents selected:', relevantDocs.length, '(LIMIT: 10 for complex dependencies)')
      if (relevantDocs.length > 0) {
        console.log('  ')
        console.log('  📊 DOCUMENT DEPENDENCY MAP:')
        console.log('  ═══════════════════════════════════════════════════════')

        // Group by dependency level
        const dependencyGroups: { [key: number]: any[] } = {}
        relevantDocs.forEach(doc => {
          const level = (doc as any).dependency_level || 1
          if (!dependencyGroups[level]) dependencyGroups[level] = []
          dependencyGroups[level].push(doc)
        })

        const maxLevel = Math.max(...Object.keys(dependencyGroups).map(Number))

        for (let level = maxLevel; level >= 1; level--) {
          if (dependencyGroups[level]) {
            const strength = level === maxLevel ? '🔴 CRITICAL' :
              level >= maxLevel - 1 ? '🟠 HIGH' :
                level >= maxLevel - 2 ? '🟡 MEDIUM' : '🟢 LOW'
            console.log(`  `)
            console.log(`  ${strength} Dependency (Level ${level}):`)

            dependencyGroups[level].forEach((doc, idx) => {
              const docPhase = getTemplatePhase(doc.name)
              const phaseIcon = docPhase.phase < currentTemplatePhase.phase ? '⬅️' :
                docPhase.phase === currentTemplatePhase.phase ? '➡️' : '⬇️'
              const rank = (doc as any).priority_rank || 0
              console.log(`    ${phaseIcon} ${doc.name}`)
              console.log(`       Status: ${doc.status} | Phase ${docPhase.phase} | Score: ${rank}`)
            })
          }
        }

        console.log('  ')
        console.log('  ⬅️ = Earlier phase (foundation) | ➡️ = Same phase | ⬇️ = Later phase')
        console.log('  🔴 = Must reference | 🟠 = Should reference | 🟡 = May reference | 🟢 = Optional')
      }

      if (relevantDocs.length > 0) {
        documentLibraryContext = `\n\n**📚 Existing Project Documents (for reference and consistency):**\n`

        relevantDocs.forEach((doc, index) => {
          // Extract key information from document content
          const contentPreview = doc.content ? doc.content.substring(0, 1500) : ''
          const hasObjectives = contentPreview.toLowerCase().includes('objective')
          const hasRisks = contentPreview.toLowerCase().includes('risk')
          const hasStakeholders = contentPreview.toLowerCase().includes('stakeholder')

          documentLibraryContext += `\n${index + 1}. **${doc.name}** (${doc.template_name || 'Custom'}) - Status: ${doc.status}\n`

          // Add content summary with key sections
          if (contentPreview) {
            documentLibraryContext += `   Summary: ${contentPreview.replace(/\n/g, ' ').substring(0, 800)}...\n`

            // Highlight what's in this document
            const features = []
            if (hasObjectives) features.push('objectives')
            if (hasRisks) features.push('risks')
            if (hasStakeholders) features.push('stakeholders')
            if (features.length > 0) {
              documentLibraryContext += `   Contains: ${features.join(', ')}\n`
            }
          }
        })

        documentLibraryContext += `\n**📋 CONSISTENCY INSTRUCTIONS:**\n`
        documentLibraryContext += `- Review the existing documents above before generating new content\n`
        documentLibraryContext += `- Reuse objectives, stakeholders, risks, and metrics where they appear in existing documents\n`
        documentLibraryContext += `- Reference related documents explicitly (e.g., "As defined in the Project Charter..." or "See Risk Management Plan section 3.2...")\n`
        documentLibraryContext += `- Ensure all tables (stakeholders, risks, objectives) are consistent with data from existing documents\n`
        documentLibraryContext += `- If conflicts arise, prioritize information from approved documents over draft documents\n`
      }

      // 🆕 BUILD STAKEHOLDER CONTEXT
      let stakeholderContext = ''
      console.log('👥 [CONTEXT-2/3] Stakeholder Analysis:')
      console.log('  Stakeholders available:', stakeholders?.length || 0)

      if (stakeholders && stakeholders.length > 0) {
        console.log('  Stakeholder names:', stakeholders.map(s => s.name).join(', '))
        stakeholderContext = `\n\n**👥 Project Stakeholders (use these in stakeholder tables):**\n`

        stakeholders.forEach(sh => {
          stakeholderContext += `- **${sh.name}** (${sh.role || 'Team Member'})`
          if (sh.interest_level || sh.influence_level) {
            stakeholderContext += ` - Interest: ${sh.interest_level || 'Medium'}, Influence: ${sh.influence_level || 'Medium'}`
          }
          if (sh.email) {
            stakeholderContext += ` - Contact: ${sh.email}`
          }
          stakeholderContext += `\n`
        })

        stakeholderContext += `\n**📋 STAKEHOLDER INSTRUCTIONS:**\n`
        stakeholderContext += `- Use the actual stakeholders listed above in any stakeholder tables, matrices, or RACI charts\n`
        stakeholderContext += `- Include their roles, interest levels, and influence levels as specified\n`
        stakeholderContext += `- Do NOT create fictional stakeholders - use only the real stakeholders listed\n`
      }

      // 🆕 BUILD CUSTOM VARIABLES CONTEXT
      let customVariablesContext = ''
      const hasSettings = project?.settings && Object.keys(project.settings).length > 0
      const hasMetadata = project?.metadata && Object.keys(project.metadata).length > 0

      console.log('⚙️ [CONTEXT-3/3] Custom Variables Analysis:')
      console.log('  Settings available:', hasSettings ? Object.keys(project.settings).length : 0)
      console.log('  Metadata available:', hasMetadata ? Object.keys(project.metadata).length : 0)

      if (hasSettings || hasMetadata) {
        customVariablesContext = `\n\n**⚙️ Custom Project Variables:**\n`

        if (hasSettings) {
          customVariablesContext += `\nSettings:\n`
          Object.entries(project.settings).forEach(([key, value]) => {
            customVariablesContext += `- ${key}: ${value}\n`
          })
        }

        if (hasMetadata) {
          customVariablesContext += `\nMetadata:\n`
          Object.entries(project.metadata).forEach(([key, value]) => {
            customVariablesContext += `- ${key}: ${value}\n`
          })
        }

        customVariablesContext += `\n**📋 VARIABLE INSTRUCTIONS:**\n`
        customVariablesContext += `- Incorporate these custom variables where relevant to the document type\n`
        customVariablesContext += `- Use them to add project-specific details and context\n`
      }

      // Enhanced prompt with detailed instructions for comprehensive generation
      const aiPrompt = `You are a senior project management consultant with expertise in ${framework} methodology. Generate a comprehensive, production-ready ${templateContent.title} for the following project:

**Project Name**: ${projectName}
**Framework**: ${framework}
**Description**: ${projectDesc}
${teamContext}
${budgetContext}
${timelineContext}${documentLibraryContext}${stakeholderContext}${customVariablesContext}

**CRITICAL REQUIREMENTS - MUST FOLLOW:**
1. ✅ Generate a COMPLETE, DETAILED document with ALL sections FULLY populated (minimum 2000 words total)
2. ✅ Each section MUST meet its minimum word count requirement specified below
3. ✅ Include SPECIFIC, ACTIONABLE content with realistic data - NO placeholders like "[Insert X]" or "TBD"
4. ✅ Create at least 5-7 DETAILED TABLES with realistic data (objectives, KPIs, risks, stakeholders, budget, milestones, etc.)
5. ✅ Use professional ${framework} terminology and demonstrate deep methodology knowledge
6. ✅ Make this document EXECUTIVE-READY for immediate stakeholder presentation

**REQUIRED SECTIONS WITH MINIMUM LENGTHS:**
${sections.join('\n')}

**DETAILED FORMATTING REQUIREMENTS:**
📋 **Structure:**
- Main title: # ${templateContent.title}
- Section headers: ## for main sections (e.g., ## 1. Executive Summary)
- Subsection headers: ### for subsections (e.g., ### 1.1 Project Overview)
- Sub-subsection headers: #### for detailed items (e.g., #### 1.1.1 Background)

📊 **Tables (MINIMUM 5 TABLES REQUIRED):**
- Use Markdown table syntax: | Column 1 | Column 2 | Column 3 |
- Include headers with proper alignment
- Populate with realistic, project-specific data
- Examples: Objectives table, KPI table, Risk register, Stakeholder matrix, Budget breakdown, Milestone schedule, CCB members, etc.

📝 **Lists:**
- Numbered lists (1. 2. 3.) for: processes, steps, workflows, sequences
- Bullet lists (- or *) for: items, features, requirements, criteria
- Nested lists for hierarchical information

✨ **Emphasis:**
- **Bold** for section labels, key terms, and important metrics
- *Italic* for definitions and notes
- \`Code\` for technical terms or system names

📏 **Structure:**
- Horizontal rules (---) between major sections for visual separation
- Blank lines between paragraphs for readability
- Proper indentation for nested content

**CONTENT DEPTH REQUIREMENTS:**
- Executive Summary: 200-300 words with project overview, objectives, benefits
- Project Charter: 400-600 words with purpose, objectives table, requirements, constraints
- Project Management Plan: 800-1200 words covering ALL 9 knowledge areas with detailed subsections
- Each knowledge area subsection: 100-150 words minimum
- Change Control: 300-400 words with 7-step process, CCB table, criteria
- Performance Monitoring: 300-400 words with KPI table, reporting cadence
- Integration Points: 150-200 words listing systems and processes
- Approval section: Signature table with 4+ stakeholders

**QUALITY STANDARDS:**
✓ Professional tone suitable for executives and sponsors
✓ Specific metrics and success criteria (e.g., "95% accuracy" not "high accuracy")
✓ Realistic timelines and milestones
✓ Concrete examples relevant to ${projectDesc}
✓ Complete sentences and well-formed paragraphs
✓ No generic boilerplate - tailor everything to ${projectName}

**TABLES TO INCLUDE (with sample structure):**
1. Objectives Table: | Objective | Description | Success Metric | Target Date |
2. KPI Table: | KPI | Target | Measurement Method | Frequency | Owner |
3. Risk Register: | Risk | Probability | Impact | Mitigation Strategy | Owner |
4. Stakeholder Matrix: | Stakeholder | Role | Interest | Influence | Engagement Strategy |
5. Budget Table: | Category | Estimated Cost | Notes |
6. Milestone Schedule: | Milestone | Target Date | Dependencies | Status |
7. CCB Members: | Name | Role | Responsibilities | Contact |

Generate the COMPLETE, DETAILED ${templateContent.title} now. Remember: This must be a production-ready, stakeholder-presentable document with NO placeholders, minimum 2000 words total, and comprehensive coverage of all sections:`

      console.log('✅ [6/10] Prompt built. Length:', aiPrompt.length, 'chars')
      console.log('📝 Prompt preview:', aiPrompt.substring(0, 200) + '...')
      console.log('📊 [CONTEXT SUMMARY]')
      console.log('  ✅ Base project info included')
      console.log('  📚 Document library context:', relevantDocs.length, 'documents')
      console.log('  👥 Stakeholder context:', stakeholders?.length || 0, 'stakeholders')
      console.log('  ⚙️ Custom variables:', (hasSettings ? 'settings' : '') + (hasMetadata ? ' metadata' : '') || 'none')
      console.log('  📏 Estimated tokens:', Math.round(aiPrompt.length / 4))

      // Validate required fields before sending
      if (!selectedProvider || selectedProvider.trim() === '') {
        toast.error('Please select an AI provider')
        setCreatingDocument(false)
        return
      }

      if (!aiPrompt || aiPrompt.length < 10) {
        toast.error('Prompt is too short (minimum 10 characters)')
        setCreatingDocument(false)
        return
      }

      if (selectedTemplate && !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i.test(selectedTemplate)) {
        toast.error('Invalid template ID format')
        setCreatingDocument(false)
        return
      }

      if (aiTemperature < 0 || aiTemperature > 2) {
        toast.error('Temperature must be between 0 and 2')
        setCreatingDocument(false)
        return
      }

      // Enqueue AI generation job via jobs API
      let jobId: string | undefined

      try {
        console.log('🔄 [7/10] Attempting to enqueue job...')
        console.log('📊 Request payload validation:', {
          promptLength: aiPrompt.length,
          provider: selectedProvider,
          model: selectedModel,
          temperature: aiTemperature,
          templateId: selectedTemplate,
          hasProjectId: !!projectId
        })

        const { getApiUrl } = await import('@/lib/api-url')
        const apiUrl = getApiUrl('/ai/generate')
        console.log('📡 API URL:', apiUrl)

        const requestBody = {
          prompt: aiPrompt,
          provider: selectedProvider,
          model: selectedModel || undefined, // Only include if set
          temperature: aiTemperature,
          template_id: selectedTemplate || undefined, // Only include if set (valid UUID)
          variables: {
            project_id: projectId,
            project_name: project?.name || 'Unknown Project',
            template_name: templates.find(t => t.id === selectedTemplate)?.name || 'Unknown Template',
            framework: project?.framework || 'General'
          },
          project_id: projectId,
          project_name: project?.name || 'Unknown Project',
        }

        // Remove undefined values to avoid sending them
        Object.keys(requestBody).forEach(key => {
          if (requestBody[key as keyof typeof requestBody] === undefined) {
            delete requestBody[key as keyof typeof requestBody]
          }
        })

        const resp = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
          },
          body: JSON.stringify(requestBody),
        })

        if (resp.ok) {
          const body = await resp.json()
          jobId = body.jobId
          console.log('✅ Job queued successfully:', jobId)
          toast.success(`Document generation started! Job ID: ${jobId}`)

          // SUCCESS: Close dialog and let background worker create the document
          console.log('✅ Job queued, closing dialog')
          setDocumentName("")
          setDocumentDescription("")
          setSelectedTemplate("")
          setCreateDialogOpen(false)
          setCreatingDocument(false)

          // Refresh documents list after a short delay (worker needs time to process)
          setTimeout(async () => {
            await fetchDocuments()
          }, 3000)

          return // EXIT - document will be created by background worker
        } else {
          const errorBody = await resp.json().catch(() => ({}))
          console.error('❌ Failed to enqueue job (status ' + resp.status + ')', errorBody)
          const errorMsg = errorBody.error || `Job queue returned ${resp.status}`
          const details = errorBody.details ? `: ${JSON.stringify(errorBody.details)}` : ''
          throw new Error(errorMsg + details)
        }
      } catch (err: any) {
        console.error('❌ Failed to enqueue job:', err)
        const errorMessage = err.message || 'Failed to start document generation. Please try again.'
        toast.error(errorMessage)
        setCreatingDocument(false)
        return // EXIT on error
      }

      console.log('🔄 [8/10] Job queue unavailable, proceeding with direct generation...')

      // Fallback: synchronous generation via AI Gateway
      // Step 2: Generating content with AI
      setGenerationProgress({
        step: 2,
        totalSteps: 4,
        message: `Generating content with ${selectedProvider}...`,
        percentage: 50,
      })
      console.log('✅ [9/10] Progress indicator set to Step 2 (50%) - Starting AI generation')

      let generatedText: string | undefined
      let genResult: any = null  // Declare outside try block for metadata access later

      try {
        const template = templates.find(t => t.id === selectedTemplate)
        console.log('🤖 [AI-1/5] Starting AI generation...')
        console.log('📊 Provider:', selectedProvider, '| Model:', selectedModel, '| Temp:', aiTemperature)
        console.log('📋 Template:', template?.name || 'Unknown')
        console.log('🔗 Project:', project?.name || 'Unknown')

        console.log('🌐 [AI-2/5] Calling apiClient.generateContent()...')
        genResult = await apiClient.generateContent({
          prompt: aiPrompt,
          provider: selectedProvider,
          model: selectedModel,
          temperature: aiTemperature,
          template_id: selectedTemplate,
          // Additional context for metadata tracking
          variables: {
            project_id: projectId,
            project_name: project?.name || 'Unknown Project',
            template_name: template?.name || 'Unknown Template',
            framework: project?.framework || template?.framework || 'General'
          }
        })

        console.log('✅ [AI-3/5] API call completed. Response:', genResult)

        // Extract content from AI response
        console.log('🔍 [AI-4/5] Extracting content from response...')
        if (genResult?.result?.content) generatedText = genResult.result.content
        else if (genResult?.result?.text) generatedText = genResult.result.text
        else if (genResult?.content) generatedText = genResult.content
        else if (genResult?.text) generatedText = genResult.text
        else if (typeof genResult === 'string') generatedText = genResult
        else generatedText = JSON.stringify(genResult)

        console.log('✅ [AI-5/5] Content extracted! Length:', generatedText?.length || 0, 'chars')
        console.log('📝 Content preview:', generatedText?.substring(0, 100) + '...')

        // Log comprehensive metadata if available
        if (genResult?.metadata) {
          console.log('📊 Generation Metadata:', genResult.metadata)
        }
        if (genResult?.quality) {
          console.log('✨ Quality Metrics:', genResult.quality)
        }

        // Step 3: Content generated successfully
        console.log('✅ [10/10] Setting progress to Step 3 (75%) - Saving document...')
        setGenerationProgress({
          step: 3,
          totalSteps: 4,
          message: 'Content generated! Saving document...',
          percentage: 75,
        })
      } catch (aiError) {
        console.error('❌ [AI-ERROR] AI generation failed:', aiError)
        toast.error('AI generation failed. Please try again.')
        setCreatingDocument(false)
        setGenerationProgress({ step: 0, totalSteps: 4, message: '', percentage: 0 })
        return
      }

      // Extract metadata and quality from AI response
      const generationMetadata = genResult?.metadata || null
      const qualityMetrics = genResult?.quality || null
      console.log('📊 [SAVE-1/6] Metadata extracted:', { hasMetadata: !!generationMetadata, hasQuality: !!qualityMetrics })

      // 🆕 Build source documents metadata from context
      const sourceDocuments = relevantDocs.map((doc, index) => {
        // Determine lifecycle phase for this document
        const docNameLower = (doc.name || '').toLowerCase()
        const templateNameLower = (doc.template_name || '').toLowerCase()
        const lifecycleOrder: { [key: string]: number } = {
          'ideation': 1, 'business case': 2, 'charter': 3, 'stakeholder': 4,
          'scope': 5, 'requirement': 6, 'schedule': 7, 'cost': 8, 'budget': 8,
          'resource': 9, 'quality': 10, 'risk': 11, 'communication': 12,
          'procurement': 13, 'integration': 14, 'closeout': 15, 'lessons': 16
        }

        let phase = 99
        let phaseName = 'Other'
        for (const [key, phaseNum] of Object.entries(lifecycleOrder)) {
          if (docNameLower.includes(key) || templateNameLower.includes(key)) {
            if (phaseNum < phase) {
              phase = phaseNum
              phaseName = key.charAt(0).toUpperCase() + key.slice(1)
            }
          }
        }

        // Calculate reading metrics for this document
        const charCount = doc.character_count || (typeof doc.content === 'string' ? doc.content.length : 0)
        const wordCount = doc.word_count || Math.round(charCount / 5) // Estimate if not available
        const readingTimeMinutes = Math.round((wordCount / 250) * 10) / 10 // 250 words/min

        return {
          id: doc.id,
          title: doc.name,
          type: doc.template_name || 'Document',
          template_id: doc.template_id,
          status: doc.status,
          url: `/projects/${projectId}/documents/${doc.id}/view`,
          lifecycle_phase: phase,
          phase_name: phaseName,
          priority_rank: index + 1,
          character_count: charCount,
          word_count: wordCount,
          reading_time_minutes: readingTimeMinutes
        }
      })

      // 🆕 Add project context as a source document if project context is used
      // Project context is always used (name, description, framework, team, budget, timeline)
      if (project && (project.name || project.description || project.framework)) {
        const projectContextEntry = {
          id: `project_context:${projectId}`, // Unique identifier for project context
          title: `Project Context: ${projectName}`,
          type: 'Project Context',
          template_id: null,
          status: 'active',
          url: `/projects/${projectId}`, // Link to project page
          lifecycle_phase: 0, // Project context is foundational (phase 0)
          phase_name: 'Foundation',
          priority_rank: 0, // Highest priority - always first
          character_count: (projectDesc?.length || 0) + (projectName?.length || 0) + (framework?.length || 0),
          word_count: Math.round(((projectDesc?.length || 0) + (projectName?.length || 0) + (framework?.length || 0)) / 5),
          reading_time_minutes: 0,
          is_project_context: true // Flag to identify this as project context
        }
        // Insert at the beginning (highest priority)
        sourceDocuments.unshift(projectContextEntry)
      }

      console.log('📚 [SAVE-1.5/6] Source documents tracked:', sourceDocuments.length, 'documents')
      if (sourceDocuments.length > 0) {
        console.log('  Source document names:', sourceDocuments.map(d => d.title).join(', '))
      }

      const documentData = {
        name: documentName,
        content: generatedText || "# Document content not generated",
        template_id: selectedTemplate,
        status: 'draft' as const,
        generation_metadata: generationMetadata ? {
          ...generationMetadata,
          qualityMetrics: qualityMetrics,  // Changed from 'quality' to 'qualityMetrics'
          source_documents: sourceDocuments,
          context_stats: {
            total_documents_available: documents.length,
            documents_used_as_context: relevantDocs.length,
            project_context_used: true, // Project context is always used
            stakeholders_available: stakeholders?.length || 0,
            custom_settings_count: hasSettings ? Object.keys(project.settings).length : 0,
            custom_metadata_count: hasMetadata ? Object.keys(project.metadata).length : 0,
            estimated_context_tokens: Math.round(aiPrompt.length / 4)
          }
        } : {
          qualityMetrics: qualityMetrics,  // Added quality metrics even without other metadata
          source_documents: sourceDocuments,
          context_stats: {
            total_documents_available: documents.length,
            documents_used_as_context: relevantDocs.length,
            project_context_used: true, // Project context is always used
            stakeholders_available: stakeholders?.length || 0,
            custom_settings_count: hasSettings ? Object.keys(project.settings).length : 0,
            custom_metadata_count: hasMetadata ? Object.keys(project.metadata).length : 0,
            estimated_context_tokens: Math.round(aiPrompt.length / 4)
          }
        }
      }
      console.log('📄 [SAVE-2/6] Document data prepared:', {
        name: documentData.name,
        contentLength: documentData.content.length,
        templateId: documentData.template_id,
        hasMetadata: !!documentData.generation_metadata
      })

      console.log('🌐 [SAVE-3/6] Calling apiClient.generateDocument() with conflict detection...')

      try {
        // Use new endpoint that includes conflict detection
        const createResult = await apiClient.generateDocument({
          projectId,
          name: documentName,
          description: documentDescription,
          templateId: selectedTemplate,
          userPrompt: aiPrompt,
          provider: selectedProvider,
          model: selectedModel,
          temperature: aiTemperature,
          includeStakeholders: true,
          includeDocuments: true,
        })

        console.log('✅ [SAVE-4/6] Document created successfully! ID:', createResult?.document?.id || 'unknown')

        // Step 4: Complete!
        console.log('🎉 [SAVE-5/6] Setting progress to Step 4 (100%)')
        setGenerationProgress({
          step: 4,
          totalSteps: 4,
          message: 'Document created successfully! ✓',
          percentage: 100,
        })

        // Small delay to show success message
        await new Promise(resolve => setTimeout(resolve, 800))

        toast.success("Document created successfully!")
        console.log('✅ [SAVE-6/6] Success toast displayed')

        // Reset form
        console.log('🔄 [CLEANUP-1/3] Resetting form state...')
        setDocumentName("")
        setDocumentDescription("")
        setSelectedTemplate("")
        setCreateDialogOpen(false)
        setGenerationProgress({ step: 0, totalSteps: 4, message: '', percentage: 0 })

        // Refresh documents list
        console.log('🔄 [CLEANUP-2/3] Refreshing documents list...')
        await fetchDocuments()
        console.log('✅ [CLEANUP-3/3] All done! Document generation complete!')

      } catch (apiError: any) {
        // Check for template conflict (409 status)
        if (apiError.status === 409 && apiError.data?.code === 'TEMPLATE_ALREADY_USED') {
          console.log('⚠️ [CONFLICT] Template already used - showing conflict dialog')
          const template = templates.find(t => t.id === selectedTemplate)

          setConflictData({
            existingDocument: apiError.data.existing,
            templateName: template?.name || 'Unknown Template',
            generationData: {
              projectId,
              templateId: selectedTemplate,
              userPrompt: aiPrompt,
              provider: selectedProvider,
              model: selectedModel,
              temperature: aiTemperature,
            }
          })
          setConflictDialogOpen(true)
          setGenerationProgress({ step: 0, totalSteps: 4, message: '', percentage: 0 })
        } else {
          // Other API errors
          throw apiError
        }
      }

    } catch (error) {
      console.error("❌ [ERROR] Failed to create document:", error)
      console.error("❌ [ERROR] Error details:", {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })
      toast.error("Failed to create document")
      setGenerationProgress({ step: 0, totalSteps: 4, message: '', percentage: 0 })
    } finally {
      console.log('🏁 [FINALLY] Resetting creatingDocument flag')
      setCreatingDocument(false)
    }
  }

  // Handle template conflict resolution
  const handleConflictResolution = async (action: 'new-version' | 'separate' | 'view-existing') => {
    if (!conflictData) return

    try {
      switch (action) {
        case 'new-version':
          console.log('🔄 [CONFLICT-RESOLUTION] Creating new version...')
          setCreatingDocument(true)

          // Build AI prompt if not already provided
          let aiPrompt = conflictData.generationData.userPrompt

          if (!aiPrompt) {
            console.log('🔨 [CONFLICT-RESOLUTION] Building AI prompt...')
            // Build the prompt using existing logic
            const templateContent = getTemplateContent(conflictData.generationData.templateId)
            const sections = Array.isArray(templateContent.sections) ? templateContent.sections : []
            const projectDesc = project?.description || 'No project description available.'
            const projectName = project?.name || 'Unknown Project'
            const framework = project?.framework || 'General'

            aiPrompt = `You are a senior project management consultant with expertise in ${framework} methodology. Generate a comprehensive, production-ready ${templateContent.title} for the following project:

**Project Name**: ${projectName}
**Framework**: ${framework}
**Description**: ${projectDesc}

Generate the COMPLETE, DETAILED ${templateContent.title} now. This must be a production-ready, stakeholder-presentable document with comprehensive coverage of all sections.`
          }

          // Generate as new version of existing document
          const result = await apiClient.generateDocumentNewVersion({
            existingDocumentId: conflictData.existingDocument.id,
            projectId: conflictData.generationData.projectId,
            templateId: conflictData.generationData.templateId,
            userPrompt: aiPrompt,
            provider: conflictData.generationData.provider || selectedProvider,
            model: conflictData.generationData.model || selectedModel,
            temperature: conflictData.generationData.temperature || aiTemperature,
          })

          toast.success(
            `Document updated to v${result.newVersion}`,
            {
              description: result.driftDetected
                ? '⚠️ Baseline drift detected - review changes'
                : 'Version history preserved'
            }
          )

          console.log('✅ [CONFLICT-RESOLUTION] New version created:', result.newVersion)

          // Navigate to updated document in standard document editor
          router.push(`/projects/${projectId}/documents/${conflictData.existingDocument.id}/view`)
          break

        case 'separate':
          console.log('📄 [CONFLICT-RESOLUTION] Creating separate document...')
          setCreatingDocument(true)

          // Build AI prompt if not already provided (same logic as 'new-version')
          let separatePrompt = conflictData.generationData.userPrompt

          if (!separatePrompt) {
            console.log('🔨 [CONFLICT-RESOLUTION] Building AI prompt for separate document...')
            // Build the prompt using existing logic
            const templateContent = getTemplateContent(conflictData.generationData.templateId)
            const sections = Array.isArray(templateContent.sections) ? templateContent.sections : []
            const projectDesc = project?.description || 'No project description available.'
            const projectName = project?.name || 'Unknown Project'
            const framework = project?.framework || 'General'

            separatePrompt = `You are a senior project management consultant with expertise in ${framework} methodology. Generate a comprehensive, production-ready ${templateContent.title} for the following project:

**Project Name**: ${projectName}
**Framework**: ${framework}
**Description**: ${projectDesc}

Generate the COMPLETE, DETAILED ${templateContent.title} now. This must be a production-ready, stakeholder-presentable document with comprehensive coverage of all sections.`
          }

          // Create new document with modified name
          const newName = `${documentName} (Alternative)`
          const separateResult = await apiClient.generateDocument({
            projectId: conflictData.generationData.projectId,
            name: newName,
            description: documentDescription,
            templateId: conflictData.generationData.templateId,
            userPrompt: separatePrompt,
            provider: conflictData.generationData.provider,
            model: conflictData.generationData.model,
            temperature: conflictData.generationData.temperature,
            includeStakeholders: true,
            includeDocuments: true,
          })

          toast.success("Separate document created successfully!")
          console.log('✅ [CONFLICT-RESOLUTION] Separate document created')
          break

        case 'view-existing':
          console.log('👁️ [CONFLICT-RESOLUTION] Navigating to existing document...')
          // Navigate to existing document in standard document editor
          router.push(`/projects/${projectId}/documents/${conflictData.existingDocument.id}/view`)
          break
      }

      // Clean up
      setConflictDialogOpen(false)
      setConflictData(null)
      setCreateDialogOpen(false)
      setDocumentName("")
      setDocumentDescription("")
      setSelectedTemplate("")

      // Refresh documents list
      await fetchDocuments()

    } catch (error) {
      console.error("❌ [CONFLICT-RESOLUTION] Failed:", error)
      toast.error("Failed to resolve conflict")
    } finally {
      setCreatingDocument(false)
    }
  }

  // Delete document
  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) {
      return
    }

    try {
      await apiClient.deleteDocument(documentId)
      toast.success("Document deleted successfully!")
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to delete document:", error)
      toast.error("Failed to delete document")
    }
  }

  // Fetch templates for upload (fetch ALL templates, not just project framework)
  const fetchTemplatesForUpload = async () => {
    console.log('🔵 fetchTemplatesForUpload starting...')
    try {
      setLoadingTemplates(true)
      console.log('🔵 Calling apiClient.getTemplates with limit=100')
      const response = await apiClient.getTemplates({
        limit: 100  // Increased limit to get more templates
      })
      console.log('📊 Templates API response:', response)
      console.log('📊 Templates loaded for upload:', response.templates?.length || 0, 'templates')
      console.log('📊 Template names:', response.templates?.map(t => t.name) || [])
      setTemplates(Array.isArray(response.templates) ? response.templates : [])
      console.log('📊 Templates state set:', Array.isArray(response.templates) ? response.templates.length : 0)
    } catch (error) {
      console.error("❌ Failed to fetch templates:", error)
      toast.error("Failed to load templates")
      setTemplates([])
    } finally {
      setLoadingTemplates(false)
      console.log('🔵 fetchTemplatesForUpload completed')
    }
  }

  // Fetch AI providers for document generation
  const fetchAIProviders = async () => {
    try {
      const providers = await apiClient.getAIProviders()
      setAiProviders(providers || [])
      console.log('📊 AI Providers loaded:', providers?.length || 0)
    } catch (error) {
      console.error("Failed to fetch AI providers:", error)
      setAiProviders([])
    }
  }

  // Handle upload document button click
  const handleUploadDocumentClick = () => {
    console.log('🔵 Upload Document clicked - opening dialog and fetching templates...')
    setUploadForm({
      name: "",
      file: null,
      template_id: "",
    })
    setUploadDialogOpen(true)
    fetchTemplatesForUpload()
    console.log('🔵 fetchTemplatesForUpload() called')
  }

  // Upload document handler
  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!uploadForm.name || !uploadForm.file || !uploadForm.template_id) {
      toast.error("Please fill in all required fields including template selection")
      return
    }

    try {
      setUploadingDocument(true)

      // CRITICAL: Validate file object is actually a File, not a metadata object
      if (!(uploadForm.file instanceof File)) {
        console.error('❌ Invalid file object:', uploadForm.file)
        throw new Error("Invalid file object. Please select a valid file.")
      }

      // CRITICAL: For PDF/DOCX files, use the upload endpoint that converts to Markdown
      // For text files, we can create directly with Markdown content
      // Use case-insensitive file extension checks as primary detection method
      const fileName = uploadForm.file.name.toLowerCase()
      const fileType = uploadForm.file.type?.toLowerCase() || ''

      // Check file extension first (more reliable than MIME type)
      const isPDF = fileName.endsWith('.pdf')
      const isDOCX = fileName.endsWith('.docx') || fileName.endsWith('.doc')
      const isTXT = fileName.endsWith('.txt')
      const isMD = fileName.endsWith('.md') || fileName.endsWith('.markdown')

      // Also check MIME types as secondary check
      const isPDFMime = fileType === 'application/pdf'
      const isDOCXMime = fileType.includes('wordprocessingml') ||
        fileType.includes('msword') ||
        fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        fileType === 'application/msword'
      const isTextMime = fileType === 'text/plain' || fileType === 'text/markdown'

      // Determine file category (prioritize extension over MIME type)
      const isBinaryFile = isPDF || isDOCX || isPDFMime || isDOCXMime
      const isTextFile = isTXT || isMD || isTextMime

      console.log('📄 File upload detection:', {
        fileName: uploadForm.file.name,
        fileType: uploadForm.file.type,
        isPDF,
        isDOCX,
        isTXT,
        isMD,
        isBinaryFile,
        isTextFile
      })

      if (isBinaryFile) {
        // CRITICAL: Binary files MUST use the upload endpoint - never createDocument
        console.log('📤 Uploading binary file via file upload endpoint:', {
          fileName: uploadForm.file.name,
          fileType: uploadForm.file.type,
          fileSize: uploadForm.file.size
        })

        // Use the upload endpoint that converts PDFs/DOCX to Markdown
        const formData = new FormData()
        formData.append('files', uploadForm.file)
        formData.append('projectId', projectId)
        formData.append('assessmentName', uploadForm.name)

        // Get token from API client to ensure consistency
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        if (!token) {
          throw new Error('Authentication required. Please log in again.')
        }

        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/onboarding/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            },
            body: formData
          })

          if (!response.ok) {
            const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
            console.error('❌ Upload endpoint failed:', {
              status: response.status,
              statusText: response.statusText,
              error
            })
            throw new Error(error.error?.message || error.message || 'Failed to upload document via upload endpoint')
          }

          const result = await response.json()
          console.log('✅ Upload endpoint success:', result)

          toast.success("Document uploaded successfully! Processing will begin shortly.")
          setUploadDialogOpen(false)
          setUploadForm({
            name: "",
            file: null,
            template_id: "",
          })

          // Wait a moment for processing, then refresh documents
          setTimeout(() => {
            fetchDocuments()
          }, 2000)
        } catch (uploadError: any) {
          // CRITICAL: Never fall back to createDocument for binary files
          console.error('❌ Upload endpoint error - DO NOT fall back to createDocument:', uploadError)
          throw new Error(`Failed to upload binary file: ${uploadError.message}. Please try again or contact support.`)
        }
      } else if (isTextFile) {
        // FINAL SAFEGUARD: Double-check file extension before allowing createDocument
        // Even if detection says it's a text file, if it has a binary extension, reject it
        const fileNameLower = uploadForm.file.name.toLowerCase()
        if (fileNameLower.endsWith('.pdf') || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.doc')) {
          console.error('❌ SAFEGUARD TRIGGERED: File has binary extension but was detected as text file', {
            fileName: uploadForm.file.name,
            fileType: uploadForm.file.type,
            isBinaryFile,
            isTextFile
          })
          throw new Error(`File "${uploadForm.file.name}" appears to be a binary file (PDF/DOCX) but was not properly detected. Please use the upload endpoint.`)
        }

        // For text files, read content and create document directly with Markdown
        const textContent = await uploadForm.file.text()

        // CRITICAL: Ensure content is a string, never an object
        if (typeof textContent !== 'string') {
          throw new Error("Failed to read file content as text. Please ensure the file is a valid text or Markdown file.")
        }

        // CRITICAL: Double-check that we're not accidentally sending a file metadata object
        // This should never happen for text files, but add defensive check
        if (typeof textContent !== 'string' || textContent.trim() === '') {
          throw new Error("File content is empty or invalid. Cannot create document.")
        }

        // Ensure we're not sending any file metadata
        const documentData = {
          name: uploadForm.name,
          content: textContent, // Store as plain Markdown string (never an object)
          template_id: uploadForm.template_id,
          status: "draft"
        }

        // Final validation: ensure content is not a file metadata object
        if (typeof documentData.content === 'object' ||
          (typeof documentData.content === 'string' &&
            (documentData.content.includes('"fileName"') ||
              documentData.content.includes('"fileSize"') ||
              documentData.content.includes('"fileType"')))) {
          console.error('❌ Attempted to send file metadata as content:', documentData)
          throw new Error("Invalid content format. For binary files (PDF/DOCX), please use the upload button which handles conversion automatically.")
        }

        console.log('✅ Creating document with text content (not binary):', {
          fileName: uploadForm.file.name,
          contentLength: textContent.length,
          isBinaryFile,
          isTextFile
        })

        await apiClient.createDocument(projectId, documentData)

        toast.success("Document uploaded successfully!")
        setUploadDialogOpen(false)
        setUploadForm({
          name: "",
          file: null,
          template_id: "",
        })
        await fetchDocuments()
      } else {
        // If file type cannot be determined, reject it to prevent sending metadata objects
        console.error('❌ Unsupported file type:', {
          fileName: uploadForm.file.name,
          fileType: uploadForm.file.type,
          fileSize: uploadForm.file.size
        })
        throw new Error(`Unsupported file type: ${uploadForm.file.name}. Please upload PDF, DOCX, TXT, or Markdown files.`)
      }
    } catch (error: any) {
      console.error("❌ Failed to upload document:", {
        error: error.message,
        fileName: uploadForm.file?.name,
        fileType: uploadForm.file?.type,
        stack: error.stack
      })
      toast.error(error.message || "Failed to upload document. Please ensure the file is a PDF, DOCX, TXT, or Markdown file.")
    } finally {
      setUploadingDocument(false)
    }
  }

  // Legacy upload handler (for backward compatibility)
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Show template selection dialog instead of direct upload
    setUploadForm({
      name: file.name,
      file: file,
      template_id: "",
    })
    setUploadDialogOpen(true)
    fetchTemplatesForUpload()
  }

  // Edit document (redirect to editor)
  const handleEditDocument = (documentId: string) => {
    window.location.href = `/projects/${projectId}/documents/${documentId}`
  }

  // Download document
  const handleDownloadDocument = async (documentId: string) => {
    try {
      const docData = await apiClient.getDocument(documentId)

      // Create a blob with the document content
      const content = typeof docData.content === 'string'
        ? docData.content
        : docData.content ? JSON.stringify(docData.content) : 'No content available'

      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)

      // Create a temporary link and trigger download
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${docData.name}.txt`
      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)

      URL.revokeObjectURL(url)
      toast.success("Document downloaded successfully!")
    } catch (error) {
      console.error("Failed to download document:", error)
      toast.error("Failed to download document")
    }
  }

  // Upgrade project to program
  const handleUpgradeToProgram = async () => {
    if (!project) {
      toast.error("Project not found")
      return
    }

    // Check if already assigned to a program (program_id may be in project data)
    const projectWithProgram = project as Project & { program_id?: string }
    if (projectWithProgram.program_id) {
      toast.error("This project is already assigned to a program")
      setUpgradeToProgramDialogOpen(false)
      return
    }

    try {
      setUpgrading(true)

      const response = await apiClient.post<{
        success: boolean
        data: {
          program: { id: string; name: string }
          project: any
        }
      }>(`/projects/${projectId}/upgrade-to-program`, {})

      if (response.success && response.data) {
        const { program } = response.data

        toast.success(`Project upgraded to program: ${program.name}`)
        setUpgradeToProgramDialogOpen(false)
        setEditProjectDialogOpen(false)

        // Navigate to the new program
        router.push(`/programs/${program.id}`)
      } else {
        throw new Error("Failed to upgrade project")
      }
    } catch (error: any) {
      console.error("Failed to upgrade project to program:", error)

      if (error.response?.data?.error === "Project is already assigned to a program") {
        toast.error("This project is already assigned to a program")
      } else {
        toast.error(error.response?.data?.error || error.message || "Failed to upgrade project to program")
      }
    } finally {
      setUpgrading(false)
    }
  }

  // Handle opening edit dialog
  const handleEditProject = () => {
    if (!project) return

    // Format dates for input fields (YYYY-MM-DD)
    const formatDateForInput = (dateString?: string | null) => {
      if (!dateString) return ""
      try {
        // Handle different date formats that might come from the database
        const date = new Date(dateString)
        if (isNaN(date.getTime())) return ""

        // Ensure we get the date in local timezone for the input
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      } catch (error) {
        console.warn("Error formatting date:", dateString, error)
        return ""
      }
    }

    // Note: Manager and team members are now managed through stakeholders
    // Extract manager name from project owner if available
    const manager = (project as any).owner_name || ""

    setEditForm({
      name: project.name || "",
      description: project.description || "",
      framework: project.framework || "",
      status: project.status || "",
      priority: project.priority || "",
      start_date: formatDateForInput(project.start_date),
      end_date: formatDateForInput(project.end_date),
      budget: project.budget?.toString() || "",
      manager: manager,
      team_members: [] // Team members are now managed through stakeholders
    })

    setEditProjectDialogOpen(true)
  }

  // Update project
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editForm.name || !editForm.framework) {
      toast.error("Please fill in required fields (Name and Framework)")
      return
    }

    // Validate dates if provided
    if (editForm.start_date && editForm.end_date) {
      const startDate = new Date(editForm.start_date)
      const endDate = new Date(editForm.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    // Validate budget if provided
    if (editForm.budget && isNaN(parseFloat(editForm.budget))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setUpdating(true)

      const updateData = {
        name: editForm.name,
        description: editForm.description,
        framework: editForm.framework,
        status: editForm.status,
        priority: editForm.priority,
        start_date: editForm.start_date || undefined,
        end_date: editForm.end_date || undefined,
        budget: editForm.budget ? parseFloat(editForm.budget) : undefined
        // Note: team_members are now managed through stakeholders (is_team_member flag)
      }

      await apiClient.updateProject(projectId, updateData)

      toast.success("Project updated successfully!")
      setEditProjectDialogOpen(false)
      await fetchProject()
    } catch (error) {
      console.error("Failed to update project:", error)
      toast.error("Failed to update project. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  // Note: Team members are now managed through stakeholders (is_team_member flag)
  // Removed handleAddTeamMember and handleRemoveTeamMember functions

  // Fetch users for linking
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true)
      const usersList = await apiClient.getUsers()
      // Handle different response formats
      const usersArray = Array.isArray(usersList) ? usersList :
        Array.isArray(usersList?.users) ? usersList.users :
          Array.isArray(usersList?.data) ? usersList.data : []
      setUsers(usersArray)
    } catch (error) {
      console.error("Failed to fetch users:", error)
      setUsers([])
    } finally {
      setLoadingUsers(false)
    }
  }

  // Handle opening new stakeholder dialog
  const handleAddStakeholder = () => {
    setEditingStakeholder(null)
    setSelectedUserId("")
    setStakeholderForm({
      name: "",
      role: "",
      department: "",
      email: "",
      phone: "",
      interest_level: "medium",
      influence_level: "medium",
      engagement_approach: "keep_informed",
      communication_frequency: "weekly",
      stakeholder_type: "internal",
      stakeholder_category: "primary",
      expectations: "",
      potential_impact: "",
      is_team_member: false
    })
    setStakeholderDialogOpen(true)
    // Fetch users when dialog opens
    void fetchUsers()
  }

  // Handle closing stakeholder dialog
  const handleCloseStakeholderDialog = (open: boolean) => {
    setStakeholderDialogOpen(open)
    if (!open) {
      // Reset form when dialog closes
      setEditingStakeholder(null)
      setStakeholderForm({
        name: "",
        role: "",
        department: "",
        email: "",
        phone: "",
        interest_level: "medium",
        influence_level: "medium",
        engagement_approach: "keep_informed",
        communication_frequency: "weekly",
        stakeholder_type: "internal",
        stakeholder_category: "primary",
        expectations: "",
        potential_impact: "",
        is_team_member: false
      })
    }
  }

  // Handle opening edit stakeholder dialog
  const handleEditStakeholder = (stakeholder: Stakeholder) => {
    setEditingStakeholder(stakeholder)
    setSelectedUserId((stakeholder as any).user_id || "")
    setStakeholderForm({
      name: stakeholder.name ?? "",
      role: stakeholder.role ?? "",
      department: stakeholder.department ?? "",
      email: stakeholder.email ?? "",
      phone: stakeholder.phone ?? "",
      interest_level: stakeholder.interest_level ?? "medium",
      influence_level: stakeholder.influence_level ?? "medium",
      engagement_approach: stakeholder.engagement_approach ?? "keep_informed",
      communication_frequency: stakeholder.communication_frequency ?? "weekly",
      stakeholder_type: stakeholder.stakeholder_type ?? "internal",
      stakeholder_category: stakeholder.stakeholder_category ?? "primary",
      expectations: stakeholder.expectations ?? "",
      potential_impact: stakeholder.potential_impact ?? "",
      is_team_member: (stakeholder as any).is_team_member ?? false
    })
    setStakeholderDialogOpen(true)
    // Fetch users when dialog opens
    void fetchUsers()
  }

  // Save stakeholder (create or update)
  const handleSaveStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!stakeholderForm.role || !stakeholderForm.email) {
      toast.error("Please fill in required fields (Role, Email)")
      return
    }

    // Validate: Only internal stakeholders can be team members
    if (stakeholderForm.is_team_member && stakeholderForm.stakeholder_type !== 'internal') {
      toast.error("Only internal stakeholders can be marked as team members")
      return
    }

    try {
      setSavingStakeholder(true)

      let savedStakeholder: Stakeholder

      if (editingStakeholder) {
        // Update existing stakeholder
        const response = await apiClient.updateStakeholder(editingStakeholder.id, stakeholderForm)
        savedStakeholder = response.stakeholder
        toast.success("Stakeholder updated successfully!")
      } else {
        // Create new stakeholder
        const response = await apiClient.createStakeholder({
          project_id: projectId,
          ...stakeholderForm
        })
        savedStakeholder = response.stakeholder
        toast.success("Stakeholder added successfully!")
      }

      // If marked as team member, ensure they have a user account linked
      if (stakeholderForm.is_team_member) {
        // Check if stakeholder has user_id (from the saved response or existing stakeholder)
        const stakeholderId = savedStakeholder.id || editingStakeholder?.id
        const hasUserId = (savedStakeholder as any).user_id || (editingStakeholder as any)?.user_id

        if (!hasUserId) {
          // Try to find a user by email
          try {
            const users = await apiClient.getUsers()
            const matchingUser = users.find((u: any) =>
              u.email?.toLowerCase() === stakeholderForm.email.toLowerCase()
            )

            if (matchingUser) {
              // Link stakeholder to user
              await apiClient.linkStakeholderToUser(stakeholderId, matchingUser.id)
              toast.success("Stakeholder linked to user account automatically")
            } else {
              toast.warning(
                `Team member must have a user account. No user found with email ${stakeholderForm.email}. ` +
                `Please create a user account first or link an existing one.`
              )
            }
          } catch (linkError) {
            console.error("Failed to link stakeholder to user:", linkError)
            toast.warning(
              `Team member should have a user account. Could not automatically link to user with email ${stakeholderForm.email}. ` +
              `Please link manually after creating a user account.`
            )
          }
        }
      }

      handleCloseStakeholderDialog(false)
      // Refresh stakeholders list
      await fetchStakeholders()
    } catch (error) {
      console.error("Failed to save stakeholder:", error)
      toast.error("Failed to save stakeholder")
    } finally {
      setSavingStakeholder(false)
    }
  }

  // Link stakeholder to user manually
  const handleLinkUser = async () => {
    if (!selectedUserId) {
      toast.error("Please select a user account")
      return
    }

    if (!editingStakeholder) {
      toast.error("Please save the stakeholder first before linking to a user account")
      return
    }

    try {
      setLinkingUser(true)
      await apiClient.linkStakeholderToUser(editingStakeholder.id, selectedUserId)
      toast.success("Stakeholder linked to user account successfully!")
      // Refresh stakeholders to get updated data
      await fetchStakeholders()
      // Update editing stakeholder to reflect the link
      const updated = stakeholders.find(s => s.id === editingStakeholder.id)
      if (updated) {
        setEditingStakeholder(updated)
      }
    } catch (error: any) {
      console.error("Failed to link stakeholder to user:", error)
      toast.error(error.response?.data?.error || "Failed to link stakeholder to user account")
    } finally {
      setLinkingUser(false)
    }
  }

  // Delete stakeholder
  const handleDeleteStakeholder = async (stakeholderId: string) => {
    if (!confirm("Are you sure you want to delete this stakeholder? This action cannot be undone.")) {
      return
    }

    try {
      await apiClient.deleteStakeholder(stakeholderId)
      toast.success("Stakeholder deleted successfully!")
      // Refresh stakeholders list
      await fetchStakeholders()
    } catch (error) {
      console.error("Failed to delete stakeholder:", error)
      toast.error("Failed to delete stakeholder")
    }
  }

  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchProject()
    }
  }, [projectId, isAuthenticated])

  // Fetch documents when pagination or search changes
  useEffect(() => {
    if (isAuthenticated && projectId) {
      fetchDocuments()
    }
  }, [documentsPagination.page, searchTerm])

  // Listen for document events via WebSocket and refresh documents for this project
  const { on, off } = useWebSocket()
  useEffect(() => {
    if (!projectId || projectId === 'undefined') return
    const room = `project:${projectId}`
    joinRoom(room)

    // Track recent notifications to prevent duplicate toasts
    const recentNotifications = new Set<string>()

    const handleDocumentCreated = (data: { document?: { project_id: string; name: string; id?: string } }) => {
      try {
        const doc = data?.document
        if (doc && doc.project_id && doc.name && String(doc.project_id) === String(projectId)) {
          // Deduplicate: only show toast if we haven't shown it recently for this document
          const notificationKey = `document-created-${doc.id || doc.name}`
          if (!recentNotifications.has(notificationKey)) {
            recentNotifications.add(notificationKey)
            toast.success(`New document created: ${doc.name}`)
            // Remove from set after 5 seconds to allow re-notification if needed
            setTimeout(() => recentNotifications.delete(notificationKey), 5000)
          }
          fetchDocuments()
        }
      } catch (err) {
        console.warn('Error handling document:created event', err)
      }
    }

    const handleDriftDetected = (data: any) => {
      try {
        // Refresh documents and project data when drift is detected
        fetchDocuments()
        fetchProjectData()
      } catch (err) {
        console.warn('Error handling drift:detected event', err)
      }
    }

    // Conflict detection and resolution event handlers
    const handleConflictDetected = (data: {
      jobId: string;
      conflictId: string;
      conflictDetails: any;
      resolutionOptions: string[];
    }) => {
      try {
        const template = templates.find(t => t.id === data.conflictDetails.template?.id);
        setConflictData({
          existingDocument: data.conflictDetails.existingDocuments?.[0],
          templateName: template?.name || data.conflictDetails.template?.name || 'Unknown Template',
          generationData: {
            projectId,
            templateId: data.conflictDetails.template?.id,
            jobId: data.jobId,
            conflictId: data.conflictId,
          }
        });
        setConflictDialogOpen(true);
      } catch (err) {
        console.warn('Error handling document:regeneration:conflict_detected event', err);
      }
    };

    const handleConflictResolved = (data: {
      conflictId: string;
      resolutionMethod: string;
      documentId: string;
      newVersionId?: string;
    }) => {
      try {
        // Deduplicate: only show toast if we haven't shown it recently for this conflict
        const notificationKey = `conflict-resolved-${data.conflictId}`
        if (!recentNotifications.has(notificationKey)) {
          recentNotifications.add(notificationKey)
          toast.success(`Conflict resolved using ${data.resolutionMethod}`);
          // Remove from set after 5 seconds to allow re-notification if needed
          setTimeout(() => recentNotifications.delete(notificationKey), 5000)
        }
        fetchDocuments(); // Refresh documents to show updates
      } catch (err) {
        console.warn('Error handling document:conflict_resolved event', err);
      }
    };

    const handleRegenerationCompleted = (data: {
      jobId: string;
      versionId: string;
      versionNumber: string;
      documentName?: string;
    }) => {
      try {
        // Deduplicate: only show toast if we haven't shown it recently for this version
        const notificationKey = `regeneration-completed-${data.versionId}`
        if (!recentNotifications.has(notificationKey)) {
          recentNotifications.add(notificationKey)
          toast.success(`Document "${data.documentName}" regeneration completed (v${data.versionNumber})`);
          // Remove from set after 5 seconds to allow re-notification if needed
          setTimeout(() => recentNotifications.delete(notificationKey), 5000)
        }
        fetchDocuments(); // Refresh documents to show updates
      } catch (err) {
        console.warn('Error handling document:regeneration:completed event', err);
      }
    };

    on("document:created", handleDocumentCreated);
    on("drift:detected", handleDriftDetected);
    on("document:regeneration:conflict_detected", handleConflictDetected);
    on("document:conflict_resolved", handleConflictResolved);
    on("document:regeneration:completed", handleRegenerationCompleted);

    return () => {
      off("document:created", handleDocumentCreated);
      off("drift:detected", handleDriftDetected);
      off("document:regeneration:conflict_detected", handleConflictDetected);
      off("document:conflict_resolved", handleConflictResolved);
      off("document:regeneration:completed", handleRegenerationCompleted);
      leaveRoom(room);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, templates]) // Rejoin when projectId or templates change

  // Documents are now filtered server-side, so we use them directly
  const displayDocuments = documents

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "in-progress":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "draft":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in-progress":
        return "secondary"
      case "draft":
        return "outline"
      default:
        return "secondary"
    }
  }

  // Helper functions for stakeholder display
  const getInterestLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "destructive"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getInfluenceLevelColor = (level: string) => {
    switch (level) {
      case "high":
        return "default"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getEngagementApproachColor = (approach: string) => {
    switch (approach) {
      case "manage_closely":
        return "default"
      case "keep_satisfied":
        return "secondary"
      case "keep_informed":
        return "outline"
      case "monitor":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const formatEngagementApproach = (approach: string) => {
    switch (approach) {
      case "manage_closely":
        return "Manage Closely"
      case "keep_satisfied":
        return "Keep Satisfied"
      case "keep_informed":
        return "Keep Informed"
      case "monitor":
        return "Monitor"
      default:
        return approach
    }
  }

  const formatCommunicationFrequency = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "Daily"
      case "weekly":
        return "Weekly"
      case "bi_weekly":
        return "Bi-weekly"
      case "monthly":
        return "Monthly"
      case "as_needed":
        return "As Needed"
      default:
        return frequency
    }
  }

  // Calculate progress based on project timeline
  const getProjectProgress = () => {
    if (!project?.start_date || !project?.end_date) return 0

    const startDate = new Date(project.start_date)
    const endDate = new Date(project.end_date)
    const now = new Date()

    if (now < startDate) return 0
    if (now > endDate) return 100

    const totalDays = endDate.getTime() - startDate.getTime()
    const elapsedDays = now.getTime() - startDate.getTime()
    return Math.round((elapsedDays / totalDays) * 100)
  }

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to access this project.</p>
        </div>
      </div>
    )
  }

  if (!projectId || projectId === 'undefined') {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Invalid Project</h2>
              <p className="text-muted-foreground mb-4">No project ID provided.</p>
              <Button asChild>
                <Link href="/projects">Back to Projects</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading project...</span>
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!project) {
    if (loading) {
      return (
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading project...</p>
              </div>
            </main>
          </div>
        </div>
      )
    }
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Failed to Load Project</h2>
              <p className="text-muted-foreground mb-4">
                Unable to load project data. Please check your connection and try again.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => fetchProject()} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
                <Button asChild variant="outline">
                  <Link href="/projects">Back to Projects</Link>
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const progress = getProjectProgress()

  // Manager is now the project owner (creator)
  // Team members are now fetched from stakeholders (filtered by is_team_member flag)
  const managerName = (project as any).owner_name || 'Not assigned'

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Breadcrumb */}
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink href="/projects">Projects</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{project.name}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>

            {/* Project Header */}
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-3">
                  <FolderOpen className="h-8 w-8 text-primary" />
                  <div>
                    <h1 className="text-3xl font-bold">{project.name}</h1>
                    <p className="text-muted-foreground">{project.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge variant="default">{project.status}</Badge>
                  <Badge variant="outline">{project.framework}</Badge>
                  <Badge variant="secondary">{project.priority}</Badge>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleEditProject}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/projects/${projectId}/documents`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Document Library
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/projects/${projectId}/drift`}>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Drift Management
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href={`/projects/${projectId}/digital-twins`}>
                    <Layers className="h-4 w-4 mr-2" />
                    Digital Twins
                  </Link>
                </Button>
                <Dialog open={createDialogOpen} onOpenChange={(open: boolean) => {
                  setCreateDialogOpen(open)
                  if (open) {
                    fetchTemplatesForUpload()
                    fetchAIProviders()
                    fetchUsedTemplateIds() // Fetch used template IDs for usage indicator
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Generate Document
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <form onSubmit={handleCreateDocument}>
                      <DialogHeader>
                        <DialogTitle>Generate New Document</DialogTitle>
                        <DialogDescription>
                          Create a new document from available templates for this project.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div>
                          <Label htmlFor="template">Select Template</Label>
                          <select
                            id="template"
                            aria-label="Select Template"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                            value={selectedTemplate}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleTemplateSelect(e.target.value)}
                            required
                          >
                            <option value="">Choose a template</option>
                            {loadingTemplates ? (
                              <option disabled>Loading templates...</option>
                            ) : (
                              templates.map((template) => {
                                const isUsed = usedTemplateIds.has(template.id)
                                return (
                                  <option key={template.id} value={template.id}>
                                    {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig]
                                      ? statusConfig[template.development_status as keyof typeof statusConfig].emoji + ' '
                                      : ''}
                                    {template.name} ({template.framework})
                                    {template.development_status === 'production' ? ' ✓' : ''}
                                    {isUsed ? ' 📄 Used' : ' ✨ New'}
                                  </option>
                                )
                              })
                            )}
                          </select>

                          {/* Template Status Information Panel */}
                          {selectedTemplate && templates.find(t => t.id === selectedTemplate) && (() => {
                            const template = templates.find(t => t.id === selectedTemplate)!
                            return (
                              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Template Status:</span>
                                    {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] && (
                                      <Badge variant={statusConfig[template.development_status as keyof typeof statusConfig].variant}>
                                        <>{statusConfig[template.development_status as keyof typeof statusConfig].emoji} {statusConfig[template.development_status as keyof typeof statusConfig].label}</>
                                      </Badge>
                                    )}
                                  </div>
                                  {template.health_rating && healthConfig[template.health_rating as keyof typeof healthConfig] && (
                                    <Badge variant="outline" className={`text-xs ${healthConfig[template.health_rating as keyof typeof healthConfig].color}`}>
                                      <>{healthConfig[template.health_rating as keyof typeof healthConfig].icon} {template.health_rating}</>
                                    </Badge>
                                  )}
                                </div>

                                {template.validation_count !== undefined && template.validation_count > 0 && (
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground text-xs">Success Rate</span>
                                      <span className="font-semibold">
                                        {template.success_rate !== undefined
                                          ? `${Number(template.success_rate).toFixed(1)}%`
                                          : template.success_count && template.validation_count
                                            ? `${Math.round((template.success_count / template.validation_count) * 100)}%`
                                            : 'N/A'}
                                      </span>
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-muted-foreground text-xs">Test Runs</span>
                                      <span className="font-semibold">{template.validation_count}</span>
                                    </div>
                                  </div>
                                )}

                                {/* Warning for non-production templates */}
                                {template.development_status && template.development_status !== 'production' && (
                                  <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                                    <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                        {template.development_status === 'draft' && 'Draft Template - Untested'}
                                        {template.development_status === 'testing' && 'Testing Template - Limited validation'}
                                        {template.development_status === 'validated' && 'Validated Template - Not yet production-ready'}
                                        {template.development_status === 'deprecated' && 'Deprecated Template - Not recommended'}
                                      </p>
                                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                        This template is still being tested. Results may vary in quality.
                                      </p>
                                    </div>
                                  </div>
                                )}

                                {/* Success indicator for production templates */}
                                {template.development_status === 'production' && (
                                  <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                                    <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-green-800 dark:text-green-200">
                                        Production Template - Fully Validated
                                      </p>
                                      <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                        This template has been thoroughly tested and is ready for production use.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })()}
                        </div>
                        <div>
                          <Label htmlFor="doc-name">Document Name</Label>
                          <Input
                            id="doc-name"
                            placeholder="Enter document name"
                            className="mt-1"
                            value={documentName}
                            onChange={(e) => setDocumentName(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="doc-description">Description (Optional)</Label>
                          <Input
                            id="doc-description"
                            placeholder="Brief description of the document"
                            className="mt-1"
                            value={documentDescription}
                            onChange={(e) => setDocumentDescription(e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor="ai-provider">AI Provider</Label>
                          <select
                            id="ai-provider"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                            value={selectedProvider}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                              const provider = aiProviders.find(p => p.name === e.target.value)
                              setSelectedProvider(e.target.value)
                              if (provider && provider.models && provider.models.length > 0) {
                                setSelectedModel(provider.models[0])
                              }
                            }}
                          >
                            {aiProviders.filter(p => p.is_active).map((provider) => (
                              <option key={provider.id} value={provider.name}>
                                {provider.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="ai-model">Model</Label>
                          <select
                            id="ai-model"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                            value={selectedModel}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedModel(e.target.value)}
                          >
                            {aiProviders
                              .find(p => p.name === selectedProvider)
                              ?.models?.map((model: string) => (
                                <option key={model} value={model}>
                                  {model}
                                </option>
                              )) || <option value="">No models available</option>
                            }
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="ai-temperature">Temperature: {aiTemperature}</Label>
                          <input
                            id="ai-temperature"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={aiTemperature}
                            onChange={(e) => setAiTemperature(parseFloat(e.target.value))}
                            className="w-full mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Lower = more focused, Higher = more creative
                          </p>
                        </div>

                        {/* Progress Indicator */}
                        {creatingDocument && generationProgress.step > 0 && (
                          <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-medium text-foreground">
                                Step {generationProgress.step} of {generationProgress.totalSteps}
                              </span>
                              <span className="text-muted-foreground">
                                {generationProgress.percentage}%
                              </span>
                            </div>
                            <Progress value={generationProgress.percentage} className="h-2" />
                            <div className="flex items-center space-x-2">
                              <Loader2 className="h-4 w-4 animate-spin text-primary" />
                              <span className="text-sm text-muted-foreground">
                                {generationProgress.message}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit" disabled={creatingDocument}>
                          {creatingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {creatingDocument ? "Generating..." : "Generate Document"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
                <Dialog open={editProjectDialogOpen} onOpenChange={setEditProjectDialogOpen}>
                  <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdateProject}>
                      <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription>
                          Update project details, team members, and timeline.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-project-name" className="text-sm font-semibold">
                              Project Name *
                            </Label>
                            <Input
                              id="edit-project-name"
                              placeholder="Enter project name"
                              className="mt-2"
                              value={editForm.name}
                              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-priority" className="text-sm font-semibold">
                              Priority
                            </Label>
                            <select
                              id="edit-priority"
                              aria-label="Priority"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={editForm.priority}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(prev => ({ ...prev, priority: e.target.value }))}
                            >
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="edit-framework" className="text-sm font-semibold">
                              Framework *
                            </Label>
                            <select
                              id="edit-framework"
                              aria-label="Framework"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={editForm.framework}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(prev => ({ ...prev, framework: e.target.value }))}
                              required
                            >
                              <option value="">Select framework</option>
                              <option value="BABOK v3">BABOK v3</option>
                              <option value="PMBOK 7">PMBOK 7</option>
                              <option value="DMBOK 2.0">DMBOK 2.0</option>
                            </select>
                          </div>
                          <div>
                            <Label htmlFor="edit-status" className="text-sm font-semibold">
                              Status
                            </Label>
                            <select
                              id="edit-status"
                              aria-label="Status"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={editForm.status}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                            >
                              <option value="planning">Planning</option>
                              <option value="active">Active</option>
                              <option value="on-hold">On Hold</option>
                              <option value="completed">Completed</option>
                              <option value="archived">Archived</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="edit-description" className="text-sm font-semibold">
                            Description
                          </Label>
                          <Textarea
                            id="edit-description"
                            placeholder="Describe the project objectives and scope"
                            className="mt-2"
                            value={editForm.description}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                            rows={3}
                          />
                        </div>

                        {/* Timeline and Budget */}
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <Label htmlFor="edit-start-date" className="text-sm font-semibold">
                              Start Date
                            </Label>
                            <Input
                              id="edit-start-date"
                              type="date"
                              className="mt-2"
                              value={editForm.start_date}
                              onChange={(e) => setEditForm(prev => ({ ...prev, start_date: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-end-date" className="text-sm font-semibold">
                              End Date
                            </Label>
                            <Input
                              id="edit-end-date"
                              type="date"
                              className="mt-2"
                              value={editForm.end_date}
                              onChange={(e) => setEditForm(prev => ({ ...prev, end_date: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="edit-budget" className="text-sm font-semibold">
                              Budget
                            </Label>
                            <Input
                              id="edit-budget"
                              type="number"
                              placeholder="0"
                              className="mt-2"
                              value={editForm.budget}
                              onChange={(e) => setEditForm(prev => ({ ...prev, budget: e.target.value }))}
                            />
                          </div>
                        </div>

                        {/* Project Manager */}
                        <div>
                          <Label htmlFor="edit-manager" className="text-sm font-semibold">
                            Project Manager
                          </Label>
                          <Input
                            id="edit-manager"
                            placeholder="Enter project manager name"
                            className="mt-2"
                            value={editForm.manager}
                            onChange={(e) => setEditForm(prev => ({ ...prev, manager: e.target.value }))}
                          />
                        </div>

                        {/* Team Members Info */}
                        <div>
                          <Label className="text-sm font-semibold">Team Members</Label>
                          <p className="text-xs text-muted-foreground mt-1">
                            Team members are managed through the Stakeholders tab. Mark internal stakeholders as "Team Member" to include them here.
                          </p>
                        </div>
                      </div>
                      <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1">
                          {(project as Project & { program_id?: string })?.program_id ? (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditProjectDialogOpen(false)
                                router.push(`/programs/${(project as Project & { program_id?: string }).program_id}`)
                              }}
                              className="w-full sm:w-auto"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Go to Program
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setEditProjectDialogOpen(false)
                                setUpgradeToProgramDialogOpen(true)
                              }}
                              className="w-full sm:w-auto"
                            >
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Upgrade to Program
                            </Button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setEditProjectDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit" disabled={updating}>
                            {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {updating ? "Updating..." : "Update Project"}
                          </Button>
                        </div>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Upgrade to Program Confirmation Dialog */}
                <Dialog open={upgradeToProgramDialogOpen} onOpenChange={setUpgradeToProgramDialogOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Upgrade Project to Program</DialogTitle>
                      <DialogDescription>
                        This will create a new program from this project and link the project to it.
                        The program will be pre-populated with the project's details.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          <strong>Project:</strong> {project?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Program Name:</strong> {project?.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Budget:</strong> {project?.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Timeline:</strong> {project?.start_date && project?.end_date
                            ? `${new Date(project.start_date).toLocaleDateString()} - ${new Date(project.end_date).toLocaleDateString()}`
                            : 'Not set'}
                        </p>
                      </div>
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Note:</strong> After upgrading, you'll be redirected to the new program page.
                          The project will remain accessible and will be linked to the program.
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setUpgradeToProgramDialogOpen(false)}
                        disabled={upgrading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleUpgradeToProgram}
                        disabled={upgrading}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      >
                        {upgrading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {upgrading ? "Upgrading..." : "Upgrade to Program"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Stakeholder Dialog */}
                <Dialog open={stakeholderDialogOpen} onOpenChange={handleCloseStakeholderDialog}>
                  <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSaveStakeholder}>
                      <DialogHeader>
                        <DialogTitle>
                          {editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
                        </DialogTitle>
                        <DialogDescription>
                          {editingStakeholder
                            ? 'Update stakeholder information and PMBOK parameters.'
                            : 'Add a new stakeholder with their PMBOK management parameters. You can create placeholders for roles that need to be recruited by leaving the name field blank.'
                          }
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        {/* Basic Information */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stakeholder-role" className="text-sm font-semibold">
                              Role *
                            </Label>
                            <Input
                              id="stakeholder-role"
                              placeholder="Enter role/title (e.g., Project Manager, Business Analyst)"
                              className="mt-2"
                              value={stakeholderForm.role}
                              onChange={(e) => setStakeholderForm(prev => ({ ...prev, role: e.target.value }))}
                              required
                            />
                          </div>
                          <div>
                            <Label htmlFor="stakeholder-name" className="text-sm font-semibold">
                              Name (Optional)
                            </Label>
                            <Input
                              id="stakeholder-name"
                              placeholder="Enter stakeholder name (leave blank if to be recruited)"
                              className="mt-2"
                              value={stakeholderForm.name ?? ""}
                              onChange={(e) => setStakeholderForm(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stakeholder-department" className="text-sm font-semibold">
                              Department
                            </Label>
                            <Input
                              id="stakeholder-department"
                              placeholder="Enter department"
                              className="mt-2"
                              value={stakeholderForm.department ?? ""}
                              onChange={(e) => setStakeholderForm(prev => ({ ...prev, department: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="stakeholder-email" className="text-sm font-semibold">
                              Email *
                            </Label>
                            <Input
                              id="stakeholder-email"
                              type="email"
                              placeholder="Enter email address"
                              className="mt-2"
                              value={stakeholderForm.email}
                              onChange={(e) => setStakeholderForm(prev => ({ ...prev, email: e.target.value }))}
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="stakeholder-phone" className="text-sm font-semibold">
                              Phone
                            </Label>
                            <Input
                              id="stakeholder-phone"
                              placeholder="Enter phone number"
                              className="mt-2"
                              value={stakeholderForm.phone ?? ""}
                              onChange={(e) => setStakeholderForm(prev => ({ ...prev, phone: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="stakeholder-type" className="text-sm font-semibold">
                              Stakeholder Type
                            </Label>
                            <select
                              id="stakeholder-type"
                              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                              value={stakeholderForm.stakeholder_type}
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                const newType = e.target.value as 'internal' | 'external'
                                setStakeholderForm(prev => ({
                                  ...prev,
                                  stakeholder_type: newType,
                                  // Reset is_team_member if switching to external
                                  is_team_member: newType === 'external' ? false : prev.is_team_member
                                }))
                              }}
                            >
                              <option value="internal">Internal</option>
                              <option value="external">External</option>
                            </select>
                          </div>
                        </div>

                        {/* Team Member Checkbox - Only show for internal stakeholders */}
                        {stakeholderForm.stakeholder_type === 'internal' && (
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id="is-team-member"
                                checked={stakeholderForm.is_team_member}
                                onChange={(e) => setStakeholderForm(prev => ({ ...prev, is_team_member: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                              />
                              <Label htmlFor="is-team-member" className="text-sm font-medium cursor-pointer">
                                Mark as Team Member
                              </Label>
                              <span className="text-xs text-muted-foreground">
                                (Can be assigned to tasks)
                              </span>
                            </div>
                            {stakeholderForm.is_team_member && !(editingStakeholder as any)?.user_id && (
                              <div className="ml-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-2">
                                <div>
                                  <p className="font-medium mb-1">⚠️ User Account Required</p>
                                  <p className="mb-2">
                                    Team members must have a user account to be assigned to tasks.
                                    {stakeholderForm.email && (
                                      <> The system will attempt to automatically link a user account with email <strong>{stakeholderForm.email}</strong> when you save.</>
                                    )}
                                    {!stakeholderForm.email && (
                                      <> Please ensure the stakeholder has a user account with matching email.</>
                                    )}
                                  </p>
                                </div>
                                {editingStakeholder && (
                                  <div className="space-y-2 pt-2 border-t border-amber-300">
                                    <p className="font-medium">Link to User Account Manually:</p>
                                    {loadingUsers ? (
                                      <p className="text-amber-700">Loading users...</p>
                                    ) : users.length > 0 ? (
                                      <div className="flex gap-2">
                                        <select
                                          value={selectedUserId}
                                          onChange={(e) => setSelectedUserId(e.target.value)}
                                          className="flex-1 h-8 rounded-md border border-amber-300 bg-white px-2 text-xs"
                                        >
                                          <option value="">Select a user account...</option>
                                          {users.map((user) => (
                                            <option key={user.id} value={user.id}>
                                              {user.name || user.email} {user.email && user.name ? `(${user.email})` : ''}
                                            </option>
                                          ))}
                                        </select>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={handleLinkUser}
                                          disabled={!selectedUserId || linkingUser}
                                          className="text-xs h-8"
                                        >
                                          {linkingUser ? "Linking..." : "Link User"}
                                        </Button>
                                      </div>
                                    ) : (
                                      <p className="text-amber-700">No users available. Please create a user account first.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* PMBOK Parameters */}
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4">PMBOK Stakeholder Parameters</h3>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="interest-level" className="text-sm font-semibold">
                                Interest Level
                              </Label>
                              <select
                                id="interest-level"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.interest_level}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({ ...prev, interest_level: e.target.value as 'high' | 'medium' | 'low' }))}
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="influence-level" className="text-sm font-semibold">
                                Influence Level
                              </Label>
                              <select
                                id="influence-level"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.influence_level}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({ ...prev, influence_level: e.target.value as 'high' | 'medium' | 'low' }))}
                              >
                                <option value="high">High</option>
                                <option value="medium">Medium</option>
                                <option value="low">Low</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor="engagement-approach" className="text-sm font-semibold">
                                Engagement Approach
                              </Label>
                              <select
                                id="engagement-approach"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.engagement_approach}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({ ...prev, engagement_approach: e.target.value as 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor' }))}
                              >
                                <option value="manage_closely">Manage Closely</option>
                                <option value="keep_satisfied">Keep Satisfied</option>
                                <option value="keep_informed">Keep Informed</option>
                                <option value="monitor">Monitor</option>
                              </select>
                            </div>
                            <div>
                              <Label htmlFor="communication-frequency" className="text-sm font-semibold">
                                Communication Frequency
                              </Label>
                              <select
                                id="communication-frequency"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.communication_frequency}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({ ...prev, communication_frequency: e.target.value as 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed' }))}
                              >
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="bi_weekly">Bi-weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="as_needed">As Needed</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <Label htmlFor="stakeholder-category" className="text-sm font-semibold">
                                Stakeholder Category
                              </Label>
                              <select
                                id="stakeholder-category"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                                value={stakeholderForm.stakeholder_category}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({ ...prev, stakeholder_category: e.target.value as 'primary' | 'secondary' }))}
                              >
                                <option value="primary">Primary</option>
                                <option value="secondary">Secondary</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Expectations and Impact */}
                        <div className="border-t pt-4">
                          <h3 className="text-lg font-semibold mb-4">Stakeholder Analysis</h3>

                          <div className="space-y-4">
                            <div>
                              <Label htmlFor="expectations" className="text-sm font-semibold">
                                Expectations
                              </Label>
                              <Textarea
                                id="expectations"
                                placeholder="Describe what this stakeholder expects from the project"
                                className="mt-2"
                                value={stakeholderForm.expectations ?? ""}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStakeholderForm(prev => ({ ...prev, expectations: e.target.value }))}
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="potential-impact" className="text-sm font-semibold">
                                Potential Impact on Project
                              </Label>
                              <Textarea
                                id="potential-impact"
                                placeholder="Describe how this stakeholder can impact the project"
                                className="mt-2"
                                value={stakeholderForm.potential_impact ?? ""}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStakeholderForm(prev => ({ ...prev, potential_impact: e.target.value }))}
                                rows={3}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleCloseStakeholderDialog(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={savingStakeholder}>
                          {savingStakeholder && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {savingStakeholder ? "Saving..." : (editingStakeholder ? "Update Stakeholder" : "Add Stakeholder")}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Upload Document Dialog */}
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogContent className="sm:max-w-[600px]">
                    <form onSubmit={handleUploadDocumentSubmit}>
                      <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                          Upload a document to {project?.name}. Select a template to ensure proper metadata tagging.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-6 py-4">
                        <div>
                          <Label htmlFor="upload-doc-name" className="text-sm font-semibold">
                            Document Name *
                          </Label>
                          <Input
                            id="upload-doc-name"
                            placeholder="Enter document name"
                            value={uploadForm.name}
                            onChange={(e) => setUploadForm({ ...uploadForm, name: e.target.value })}
                            className="mt-2"
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="upload-template-select" className="text-sm font-semibold">
                            Template *
                          </Label>
                          <select
                            id="upload-template-select"
                            title="Select a template for metadata tagging"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-2"
                            value={uploadForm.template_id}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadForm({ ...uploadForm, template_id: e.target.value })}
                            required
                          >
                            <option value="">Select a template (required)</option>
                            {loadingTemplates ? (
                              <option disabled>Loading templates...</option>
                            ) : (
                              templates.map((template) => {
                                const isUsed = usedTemplateIds.has(template.id)
                                return (
                                  <option key={template.id} value={template.id}>
                                    {template.name} ({template.framework})
                                    {isUsed ? ' 📄 Used' : ' ✨ New'}
                                  </option>
                                )
                              })
                            )}
                          </select>
                          <p className="text-xs text-muted-foreground mt-1">
                            Template selection is required to ensure proper document metadata and review compliance
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="file-upload" className="text-sm font-semibold">
                            File *
                          </Label>
                          <Input
                            id="file-upload"
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.md"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null
                              setUploadForm({ ...uploadForm, file })
                            }}
                            className="mt-2"
                            required
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Supported formats: PDF, DOC, DOCX, TXT, MD
                          </p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setUploadDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={uploadingDocument}
                        >
                          {uploadingDocument && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Upload Document
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList aria-label="Project management sections">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="context">
                  <FileText className="h-4 w-4 mr-2" />
                  Project Context
                </TabsTrigger>
                <TabsTrigger value="extraction">
                  <Database className="h-4 w-4 mr-2" />
                  AI Extraction
                </TabsTrigger>
                <TabsTrigger value="lessons">
                  <Lightbulb className="h-4 w-4 mr-2" />
                  Lessons
                </TabsTrigger>
                <TabsTrigger value="performance">
                  <Activity className="h-4 w-4 mr-2" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
                <TabsTrigger value="team-agreements">
                  <Users2 className="h-4 w-4 mr-2" />
                  Team Agreements
                </TabsTrigger>
                <TabsTrigger value="development-approach">
                  <Code className="h-4 w-4 mr-2" />
                  Development Approach
                </TabsTrigger>
                <TabsTrigger value="baseline">Baseline</TabsTrigger>
                <TabsTrigger value="financials">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Financials
                </TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="risks">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Risks
                </TabsTrigger>
                <TabsTrigger value="issues">
                  <XCircle className="h-4 w-4 mr-2" />
                  Issues
                </TabsTrigger>
                <TabsTrigger value="compliance-security">
                  <Shield className="h-4 w-4 mr-2" />
                  Compliance & Security
                </TabsTrigger>
                <TabsTrigger value="integrations">
                  <Settings className="h-4 w-4 mr-2" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="digital-twins">
                  <Layers className="h-4 w-4 mr-2" />
                  Digital Twins
                </TabsTrigger>
                <TabsTrigger value="analytics-drift">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Drift & Innovation
                </TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4">
                <DocumentsTab
                  projectId={projectId}
                  documentStats={documentStats}
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  createDialogOpen={createDialogOpen}
                  setCreateDialogOpen={setCreateDialogOpen}
                  handleUploadDocumentClick={handleUploadDocumentClick}
                  handleDocumentUpload={handleDocumentUpload}
                  documentsLoading={documentsLoading}
                  displayDocuments={displayDocuments}
                  handleEditDocument={handleEditDocument}
                  handleDownloadDocument={handleDownloadDocument}
                  handleDeleteDocument={handleDeleteDocument}
                  documentsPagination={documentsPagination}
                  setDocumentsPagination={setDocumentsPagination}
                />
              </TabsContent>

              <TabsContent value="context" className="space-y-4">
                <ProjectContextTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="overview" className="space-y-4">
                <OverviewTab
                  project={project}
                  progress={progress}
                  managerName={managerName}
                  documentStats={documentStats}
                  stakeholders={stakeholders}
                  projectId={projectId}
                />
              </TabsContent>

              <TabsContent value="extraction" className="space-y-4">
                {/* AI Project Data Extraction - NEW RAG Integration */}
                <ProjectDataExtraction projectId={projectId} documents={documents} />
              </TabsContent>

              <TabsContent value="lessons" className="space-y-4">
                <LessonsTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                {/* Performance Dashboard - PMBOK 8 Measurement Domain */}
                <PerformanceDashboard projectId={projectId} />
              </TabsContent>

              <TabsContent value="stakeholders" className="space-y-4">
                <StakeholdersTab
                  stakeholders={stakeholders}
                  stakeholdersLoading={stakeholdersLoading}
                  projectId={projectId}
                  onAddStakeholder={handleAddStakeholder}
                  onEditStakeholder={handleEditStakeholder}
                  onDeleteStakeholder={handleDeleteStakeholder}
                />
              </TabsContent>

              <TabsContent value="team-agreements" className="space-y-4">
                <TeamAgreementsTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="development-approach" className="space-y-4">
                <DevelopmentApproachTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="baseline" className="space-y-4">
                {/* Baseline Tab - CR-2026-001 */}
                <BaselineManagement projectId={projectId} documents={documents} />
              </TabsContent>

              <TabsContent value="financials" className="space-y-4">
                {/* Financials Tab - Cost tracking and budgeting */}
                <ProjectFinancialsTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="variables" className="space-y-4">
                <VariablesTab
                  project={project}
                  documents={documents}
                  stakeholders={stakeholders}
                />
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <TimelineTab project={project} documents={documents} progress={progress} />
              </TabsContent>

              <TabsContent value="risks" className="space-y-4">
                <ProjectRisksTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="issues" className="space-y-4">
                <ProjectIssuesTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="compliance-security" className="space-y-4">
                <ComplianceSecurityTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="integrations" className="space-y-4">
                <IntegrationsTab projectId={projectId} />
              </TabsContent>

              <TabsContent value="digital-twins" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Digital Twins
                    </CardTitle>
                    <CardDescription>
                      Manage physical assets, events, state snapshots, and document triggers.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button asChild>
                      <Link href={`/projects/${projectId}/digital-twins`}>
                        <Layers className="h-4 w-4 mr-2" />
                        Manage Digital Twins
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics-drift" className="space-y-4">
                <DigitalTwinAnalyticsTab projectId={projectId} />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>

      {/* Smart Document Versioning - Template Conflict Dialog */}
      {conflictData && (
        <TemplateConflictDialog
          open={conflictDialogOpen}
          onOpenChange={setConflictDialogOpen}
          existingDocument={conflictData.existingDocument}
          templateName={conflictData.templateName}
          onAction={handleConflictResolution}
        />
      )}
    </div>
  )
}
