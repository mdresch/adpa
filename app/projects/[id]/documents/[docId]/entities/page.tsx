"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { 
  trackEntityExtraction, 
  trackEntityHighlighting, 
  trackEntityNavigation,
  trackPageEngagement,
  trackFeatureUsage 
} from "@/lib/analytics/clarity"
import {
  FileText,
  ArrowLeft,
  Database,
  Loader2,
  Users,
  Target,
  AlertTriangle,
  Calendar,
  Lock,
  CheckCircle,
  Lightbulb,
  Code,
  Users2,
  GitBranch,
  Briefcase,
  TrendingUp,
  BarChart3,
  Zap,
  Shield,
  Activity,
  ListOrdered,
  Archive,
  DollarSign,
  FileCheck,
  Gauge,
  Rocket,
  Wrench,
  Box,
  Layers,
  ClipboardList,
  Handshake,
  IterationCw,
  Info,
  Sparkles,
  // Additional icons for Knowledge Area Domains
  Building2,
  Ruler,
  Timer,
  Wallet,
  UserCog,
  ShieldAlert,
  MessageSquare,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { getApiUrl } from "@/lib/api-url"
import { toast } from '@/lib/notify'

interface EntityCounts {
  // Core entities (Legacy/PMBOK 7)
  stakeholders: number
  requirements: number
  risks: number
  milestones: number
  constraints: number
  successCriteria: number
  bestPractices: number
  phases: number
  resources: number
  technologies: number
  qualityStandards: number
  complianceSecurity: number
  deliverables: number
  scopeItems: number
  activities: number
  // PMBOK 8 Performance Domain entities
  teamAgreements: number
  developmentApproaches: number
  projectIterations: number
  workItems: number
  capacityPlans: number
  performanceMeasurements: number
  earnedValueMetrics: number
  opportunities: number
  riskResponses: number
  performanceActuals: number
  // PMBOK 8 Knowledge Area Domain entities (Tier 2)
  // Governance Domain
  governanceDecisions: number
  approvalWorkflows: number
  steeringCommittees: number
  changeControlBoards: number
  policyCompliance: number
  // Scope Domain
  scopeBaselines: number
  wbsNodes: number
  scopeChangeRequests: number
  requirementsTraceability: number
  scopeVerification: number
  // Schedule Domain
  scheduleBaselines: number
  scheduleActivities: number
  criticalPathActivities: number
  scheduleVariances: number
  scheduleForecasts: number
  // Finance Domain
  budgetBaselines: number
  costActuals: number
  costEstimates: number
  fundingTranches: number
  financialVariances: number
  procurementCosts: number
  // Resources Domain
  resourceAssignments: number
  resourcePool: number
  capacityForecasts: number
  utilizationRecords: number
  resourceConflicts: number
  onboardingOffboarding: number
  // Risk Domain
  riskAssessments: number
  riskResponsePlans: number
  riskTriggers: number
  riskReviews: number
  contingencyReserves: number
  riskMetrics: number
  // Stakeholders Ops Domain
  engagementActions: number
  communicationLogs: number
  satisfactionSurveys: number
  stakeholderIssues: number
  relationshipHealth: number
}

interface EntityData {
  [key: string]: any[]
}

type KnowledgeDomainKey =
  | 'governance'
  | 'scope'
  | 'schedule'
  | 'finance'
  | 'resources'
  | 'risk'
  | 'stakeholders_ops'

const KNOWLEDGE_DOMAIN_LABELS: Record<KnowledgeDomainKey, string> = {
  governance: 'Governance',
  scope: 'Scope',
  schedule: 'Schedule',
  finance: 'Finance',
  resources: 'Resources',
  risk: 'Risk',
  stakeholders_ops: 'Stakeholders Operations',
}

const KNOWLEDGE_DOMAIN_DESCRIPTIONS: Partial<Record<KnowledgeDomainKey, string>> = {
  governance: 'Decision-making, oversight, approvals, and compliance structures.',
  scope: 'What is in/out of scope, requirements, and deliverables.',
  schedule: 'Timeline, milestones, activities, and schedule control.',
  finance: 'Budget, costs, funding, and financial control.',
  resources: 'People, capacity, and other resources needed to deliver.',
  risk: 'Risks, responses, contingencies, and risk metrics.',
  stakeholders_ops: 'Stakeholder engagement, communication, and relationship health.',
}

const entityTypes = [
  // Core entities (Legacy/PMBOK 7)
  { key: 'stakeholders', label: 'Stakeholders', icon: Users, color: 'text-blue-500' },
  { key: 'requirements', label: 'Requirements', icon: Target, color: 'text-green-500' },
  { key: 'risks', label: 'Risks', icon: AlertTriangle, color: 'text-red-500' },
  { key: 'milestones', label: 'Milestones', icon: Calendar, color: 'text-purple-500' },
  { key: 'constraints', label: 'Constraints', icon: Lock, color: 'text-orange-500' },
  { key: 'successCriteria', label: 'Success Criteria', icon: CheckCircle, color: 'text-emerald-500' },
  { key: 'bestPractices', label: 'Best Practices', icon: Lightbulb, color: 'text-yellow-500' },
  { key: 'phases', label: 'Phases', icon: Layers, color: 'text-indigo-500' },
  { key: 'resources', label: 'Resources', icon: Briefcase, color: 'text-cyan-500' },
  { key: 'technologies', label: 'Technologies', icon: Code, color: 'text-pink-500' },
  { key: 'qualityStandards', label: 'Quality Standards', icon: Shield, color: 'text-teal-500' },
  { key: 'complianceSecurity', label: 'Compliance & Security', icon: Shield, color: 'text-amber-500' },
  { key: 'deliverables', label: 'Deliverables', icon: Box, color: 'text-amber-500' },
  { key: 'scopeItems', label: 'Scope Items', icon: ClipboardList, color: 'text-violet-500' },
  { key: 'activities', label: 'Activities', icon: Activity, color: 'text-rose-500' },
  // PMBOK 8 Performance Domain entities
  { key: 'teamAgreements', label: 'Team Agreements', icon: Handshake, color: 'text-blue-600' },
  { key: 'developmentApproaches', label: 'Development Approaches', icon: GitBranch, color: 'text-green-600' },
  { key: 'projectIterations', label: 'Project Iterations', icon: IterationCw, color: 'text-purple-600' },
  { key: 'workItems', label: 'Work Items', icon: ListOrdered, color: 'text-orange-600' },
  { key: 'capacityPlans', label: 'Capacity Plans', icon: Gauge, color: 'text-cyan-600' },
  { key: 'performanceMeasurements', label: 'Performance Measurements', icon: BarChart3, color: 'text-emerald-600' },
  { key: 'earnedValueMetrics', label: 'Earned Value Metrics', icon: TrendingUp, color: 'text-indigo-600' },
  { key: 'opportunities', label: 'Opportunities', icon: Rocket, color: 'text-yellow-600' },
  { key: 'riskResponses', label: 'Risk Responses', icon: Zap, color: 'text-red-600' },
  { key: 'performanceActuals', label: 'Performance Actuals', icon: Activity, color: 'text-pink-600' },
  // PMBOK 8 Knowledge Area Domain entities (Tier 2)
  // Governance Domain
  { key: 'governanceDecisions', label: 'Governance Decisions', icon: Building2, color: 'text-amber-600' },
  { key: 'approvalWorkflows', label: 'Approval Workflows', icon: CheckCircle2, color: 'text-amber-500' },
  { key: 'steeringCommittees', label: 'Steering Committees', icon: Users2, color: 'text-amber-600' },
  { key: 'changeControlBoards', label: 'Change Control Boards', icon: Shield, color: 'text-amber-500' },
  { key: 'policyCompliance', label: 'Policy Compliance', icon: Award, color: 'text-amber-600' },
  // Scope Domain
  { key: 'scopeBaselines', label: 'Scope Baselines', icon: Ruler, color: 'text-violet-600' },
  { key: 'wbsNodes', label: 'WBS Nodes', icon: GitBranch, color: 'text-violet-500' },
  { key: 'scopeChangeRequests', label: 'Scope Change Requests', icon: FileText, color: 'text-violet-600' },
  { key: 'requirementsTraceability', label: 'Requirements Traceability', icon: ListOrdered, color: 'text-violet-500' },
  { key: 'scopeVerification', label: 'Scope Verification', icon: CheckCircle, color: 'text-violet-600' },
  // Schedule Domain
  { key: 'scheduleBaselines', label: 'Schedule Baselines', icon: Timer, color: 'text-green-600' },
  { key: 'scheduleActivities', label: 'Schedule Activities', icon: Calendar, color: 'text-green-500' },
  { key: 'criticalPathActivities', label: 'Critical Path', icon: AlertCircle, color: 'text-green-600' },
  { key: 'scheduleVariances', label: 'Schedule Variances', icon: TrendingUp, color: 'text-green-500' },
  { key: 'scheduleForecasts', label: 'Schedule Forecasts', icon: Clock, color: 'text-green-600' },
  // Finance Domain
  { key: 'budgetBaselines', label: 'Budget Baselines', icon: Wallet, color: 'text-emerald-600' },
  { key: 'costActuals', label: 'Cost Actuals', icon: DollarSign, color: 'text-emerald-500' },
  { key: 'costEstimates', label: 'Cost Estimates', icon: BarChart3, color: 'text-emerald-600' },
  { key: 'fundingTranches', label: 'Funding Tranches', icon: Layers, color: 'text-emerald-500' },
  { key: 'financialVariances', label: 'Financial Variances', icon: TrendingUp, color: 'text-emerald-600' },
  { key: 'procurementCosts', label: 'Procurement Costs', icon: DollarSign, color: 'text-emerald-500' },
  // Resources Domain
  { key: 'resourceAssignments', label: 'Resource Assignments', icon: UserCog, color: 'text-teal-600' },
  { key: 'resourcePool', label: 'Resource Pool', icon: Users, color: 'text-teal-500' },
  { key: 'capacityForecasts', label: 'Capacity Forecasts', icon: TrendingUp, color: 'text-teal-600' },
  { key: 'utilizationRecords', label: 'Utilization Records', icon: BarChart3, color: 'text-teal-500' },
  { key: 'resourceConflicts', label: 'Resource Conflicts', icon: AlertTriangle, color: 'text-teal-600' },
  { key: 'onboardingOffboarding', label: 'Onboarding/Offboarding', icon: Users2, color: 'text-teal-500' },
  // Risk Domain
  { key: 'riskAssessments', label: 'Risk Assessments', icon: ShieldAlert, color: 'text-rose-600' },
  { key: 'riskResponsePlans', label: 'Risk Response Plans', icon: Shield, color: 'text-rose-500' },
  { key: 'riskTriggers', label: 'Risk Triggers', icon: Zap, color: 'text-rose-600' },
  { key: 'riskReviews', label: 'Risk Reviews', icon: FileText, color: 'text-rose-500' },
  { key: 'contingencyReserves', label: 'Contingency Reserves', icon: DollarSign, color: 'text-rose-600' },
  { key: 'riskMetrics', label: 'Risk Metrics', icon: BarChart3, color: 'text-rose-500' },
  // Stakeholders Ops Domain
  { key: 'engagementActions', label: 'Engagement Actions', icon: MessageSquare, color: 'text-sky-600' },
  { key: 'communicationLogs', label: 'Communication Logs', icon: FileText, color: 'text-sky-500' },
  { key: 'satisfactionSurveys', label: 'Satisfaction Surveys', icon: Award, color: 'text-sky-600' },
  { key: 'stakeholderIssues', label: 'Stakeholder Issues', icon: AlertCircle, color: 'text-sky-500' },
  { key: 'relationshipHealth', label: 'Relationship Health', icon: Activity, color: 'text-sky-600' },
]

export default function DocumentEntitiesPage() {
  const router = useRouter()
  const params = useParams()
  const projectId = params.id as string
  const docId = params.docId as string
  const { isAuthenticated, token } = useAuth()

  const [loading, setLoading] = useState(true)
  const [documentName, setDocumentName] = useState<string>("")
  const [entityCounts, setEntityCounts] = useState<EntityCounts | null>(null)
  const [entityData, setEntityData] = useState<EntityData>({})
  const [selectedEntityType, setSelectedEntityType] = useState<string | null>(null)
  const [totalEntities, setTotalEntities] = useState(0)
  const [primaryKnowledgeDomain, setPrimaryKnowledgeDomain] = useState<KnowledgeDomainKey | null>(null)
  const [secondaryKnowledgeDomains, setSecondaryKnowledgeDomains] = useState<KnowledgeDomainKey[]>([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState(0)
  const [extractionStatus, setExtractionStatus] = useState<string>("")
  const [currentJobId, setCurrentJobId] = useState<string | null>(null)
  // Ref to track if job completed to avoid stale closure in timeout
  const jobCompletedRef = useRef(false)
  // Refs to store interval and timeout IDs for proper cleanup
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const statusClearTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Cleanup function to clear both interval and timeout
  const cleanupPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current)
      pollTimeoutRef.current = null
    }
    if (statusClearTimeoutRef.current) {
      clearTimeout(statusClearTimeoutRef.current)
      statusClearTimeoutRef.current = null
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login")
      return
    }
    void fetchDocumentEntities()
    
    // Track page engagement
    const startTime = Date.now()
    let interactionCount = 0
    
    const handleInteraction = () => {
      interactionCount++
    }
    
    document.addEventListener('click', handleInteraction)
    document.addEventListener('scroll', handleInteraction)
    
    return () => {
      // Calculate engagement when page unloads
      const timeSpent = Math.floor((Date.now() - startTime) / 1000)
      trackPageEngagement(`/projects/${projectId}/documents/${docId}/entities`, timeSpent, interactionCount)
      
      document.removeEventListener('click', handleInteraction)
      document.removeEventListener('scroll', handleInteraction)
    }
    
    // Cleanup polling on unmount to prevent memory leaks and stale state updates
    return () => {
      cleanupPolling()
    }
  }, [docId, isAuthenticated, projectId])

  const fetchDocumentEntities = async () => {
    try {
      setLoading(true)
      const apiUrl = getApiUrl(`/project-data-extraction/document/${docId}/entities`)
      
      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch entities (${response.status})`)
      }

      const data = await response.json()
      
      setDocumentName(data.documentName || "Document")
      setEntityCounts(data.entityCounts || {})
      setEntityData(data.entities || {})
      setTotalEntities(data.totalEntities || 0)

      // Track entity extraction for each entity type
      if (data.entityCounts) {
        Object.entries(data.entityCounts).forEach(([entityType, count]) => {
          const entityCount = typeof count === 'number' ? count : 0
          if (entityCount > 0) {
            trackEntityExtraction(entityType, entityCount)
          }
        })
      }

      if (data.inferredPrimaryDomain) {
        const key = data.inferredPrimaryDomain as KnowledgeDomainKey
        setPrimaryKnowledgeDomain(key)
      } else {
        setPrimaryKnowledgeDomain(null)
      }

      if (Array.isArray(data.inferredSecondaryDomains)) {
        setSecondaryKnowledgeDomains(
          data.inferredSecondaryDomains.filter((d: string) =>
            Object.prototype.hasOwnProperty.call(KNOWLEDGE_DOMAIN_LABELS, d)
          ) as KnowledgeDomainKey[]
        )
      } else {
        setSecondaryKnowledgeDomains([])
      }
    } catch (error: any) {
      console.error('[DocumentEntities] Failed to fetch document entities:', error)
      toast.error(error.message || 'Failed to load document entities')
    } finally {
      setLoading(false)
    }
  }

  const getTotalEntities = () => {
    if (!entityCounts) return 0
    return Object.values(entityCounts).reduce((sum, count) => sum + count, 0)
  }

  const handleExtractEntities = async () => {
    // Clean up any existing polling before starting new extraction
    cleanupPolling()
    
    try {
      setIsExtracting(true)
      setExtractionProgress(0)
      setExtractionStatus("Starting extraction for this document...")
      
      const apiUrl = getApiUrl('/project-data-extraction/extract')
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          projectId,
          documentIds: [docId] // Extract only from this document
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || errorData.message || `Failed to start extraction (${response.status})`)
      }

      const data = await response.json()
      setCurrentJobId(data.jobId)
      setExtractionStatus("Extraction job started")
      toast.success("Extraction started! This may take 2-3 minutes...")

      // Poll job status
      pollJobStatus(data.jobId)
    } catch (error: any) {
      console.error('[DocumentEntities] Extraction failed:', error)
      toast.error(error.message || 'Failed to start extraction')
      setIsExtracting(false)
      setExtractionStatus("")
    }
  }

  const pollJobStatus = async (jobId: string) => {
    // Clean up any existing polling before starting new one
    cleanupPolling()
    
    // Reset completion flag for new job
    jobCompletedRef.current = false
    
    const pollInterval = setInterval(async () => {
      try {
        const apiUrl = getApiUrl(`/project-data-extraction/status/${jobId}`)
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token || localStorage.getItem('auth_token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to check job status')
        }

        const data = await response.json()
        const progress = data.progress || 0
        const status = data.status

        setExtractionProgress(progress)
        // Only set status message if we have a valid message or status
        // Prevents displaying "Status: undefined" to users
        if (data.message) {
          setExtractionStatus(data.message)
        } else if (status) {
          setExtractionStatus(`Status: ${status}`)
        } else {
          // Don't set status if both are undefined
          setExtractionStatus("")
        }

        if (status === 'completed') {
          // Guard against multiple completions (race condition with in-flight requests)
          // This prevents duplicate toast notifications when multiple polling requests
          // complete simultaneously or when WebSocket and polling both fire
          if (jobCompletedRef.current) {
            return // Already handled, skip this response
          }
          
          jobCompletedRef.current = true
          cleanupPolling() // Clear both interval and timeout
          setIsExtracting(false)
          setExtractionProgress(100)
          setExtractionStatus("Extraction completed!")
          toast.success("Entities extracted successfully!")
          
          // Refresh entity data
          await fetchDocumentEntities()
          
          // Clear status after a delay
          // Store timeout ID in ref for cleanup
          statusClearTimeoutRef.current = setTimeout(() => {
            setExtractionStatus("")
            setExtractionProgress(0)
            statusClearTimeoutRef.current = null // Clear ref after execution
          }, 3000)
        } else if (status === 'failed') {
          // Guard against multiple failures (race condition with in-flight requests)
          if (jobCompletedRef.current) {
            return // Already handled, skip this response
          }
          
          jobCompletedRef.current = true
          cleanupPolling() // Clear both interval and timeout
          setIsExtracting(false)
          setExtractionStatus("Extraction failed")
          toast.error(data.error_message || 'Extraction failed')
        }
      } catch (error) {
        console.error('[DocumentEntities] Failed to poll job status:', error)
        jobCompletedRef.current = true
        cleanupPolling() // Clear both interval and timeout
        setIsExtracting(false)
      }
    }, 2000) // Poll every 2 seconds
    
    // Store interval ID in ref for cleanup
    pollIntervalRef.current = pollInterval

    // Cleanup interval after 10 minutes
    // Use ref to check if job completed to avoid stale closure issue
    const timeoutId = setTimeout(() => {
      cleanupPolling() // This will clear both interval and timeout
      // Only show warning if job hasn't completed yet
      if (!jobCompletedRef.current) {
        setIsExtracting(false)
        toast.warning('Extraction is taking longer than expected. Please check the jobs page.')
      }
    }, 600000) // 10 minutes
    
    // Store timeout ID in ref for cleanup
    pollTimeoutRef.current = timeoutId
  }

  const renderEntityField = (key: string, value: any, entity: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">Not specified</span>
    }

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return <span className="text-muted-foreground italic">None</span>
      }
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((item, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {String(item)}
            </Badge>
          ))}
        </div>
      )
    }

    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? "default" : "secondary"}>
          {value ? "Yes" : "No"}
        </Badge>
      )
    }

    if (typeof value === 'object') {
      return (
        <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
          {JSON.stringify(value, null, 2)}
        </pre>
      )
    }

    // Handle dates
    if ((key.includes('date') || key.includes('Date')) && 
        !key.includes('updated_by') && 
        !key.includes('created_by')) {
      try {
        return new Date(value).toLocaleDateString()
      } catch {
        return String(value)
      }
    }

    // Special handling for source_document_id - show clickable link with highlighting
    if (key === 'source_document_id' && value) {
      const handleViewSourceDocument = () => {
        // Track entity highlighting usage
        trackEntityHighlighting('viewed')
        
        // Track entity navigation
        trackEntityNavigation('entities_page', 'document_viewer')
        
        // Track feature usage with metadata
        trackFeatureUsage('entity_source_navigation', 'clicked', {
          entity_type: selectedEntityType || 'unknown',
          has_location_data: entity.source_text_start !== null ? 'true' : 'false',
          document_id: value
        })
        
        // Navigate to the document viewer with highlighting parameters
        const params = new URLSearchParams()
        
        // Add highlighting parameters if available
        if (entity.source_text_start !== null && entity.source_text_start !== undefined) {
          params.append('highlightStart', entity.source_text_start.toString())
        }
        if (entity.source_text_end !== null && entity.source_text_end !== undefined) {
          params.append('highlightEnd', entity.source_text_end.toString())
        }
        if (entity.source_line_start !== null && entity.source_line_start !== undefined) {
          params.append('highlightLineStart', entity.source_line_start.toString())
        }
        if (entity.source_line_end !== null && entity.source_line_end !== undefined) {
          params.append('highlightLineEnd', entity.source_line_end.toString())
        }
        if (entity.source_snippet) {
          params.append('highlightSnippet', entity.source_snippet)
        }
        if (entity.entity_markdown_tag) {
          params.append('highlightTag', entity.entity_markdown_tag)
        }
        
        // Add entity info for context
        params.append('entityName', entity.name || entity.title || '')
        params.append('entityType', selectedEntityType || '')
        
        const queryString = params.toString()
        const viewUrl = `/projects/${projectId}/documents/${value}/view${queryString ? `?${queryString}` : ''}`
        
        router.push(viewUrl)
      }
      
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewSourceDocument}
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            View Source Document
            {entity.source_text_start !== null && entity.source_text_start !== undefined && (
              <span className="ml-1 px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                📍 Highlighted
              </span>
            )}
          </Button>
        </div>
      )
    }

    return <span className="break-words">{String(value)}</span>
  }

  const getEntityTypeLabel = (entityType: string): string => {
    const entity = entityTypes.find(e => e.key === entityType)
    return entity?.label || entityType
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={documentName || "Document Entities"} />

        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <PageTransition>
            <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/projects/${projectId}/documents/${docId}`)}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Metadata
                    </Button>
                  </div>
                  <h1 className="text-3xl font-bold">Document Entities</h1>
                  <p className="text-muted-foreground mt-1">
                    All entities extracted from "{documentName}"
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/projects/${projectId}/documents/${docId}`}>
                    <Button variant="outline">
                      <FileText className="h-4 w-4 mr-2" />
                      View Metadata
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="ml-4 text-muted-foreground">Loading entities...</p>
              </div>
            ) : (!entityCounts || totalEntities === 0) ? (
              <AnimatedCard>
                <CardContent className="py-12 text-center">
                  <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Entities Extracted</h3>
                  <p className="text-muted-foreground mb-4">
                    This document doesn't have any extracted entities yet.
                  </p>
                  <Button
                    onClick={handleExtractEntities}
                    disabled={isExtracting}
                    className="gap-2"
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Extract Entities from This Document
                      </>
                    )}
                  </Button>
                  {extractionStatus && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground">{extractionStatus}</p>
                      {extractionProgress > 0 && (
                        <div className="mt-2 w-full max-w-md mx-auto">
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${extractionProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{extractionProgress}%</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </AnimatedCard>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <AnimatedCard>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Database className="h-5 w-5" />
                          Extraction Summary
                        </CardTitle>
                        <CardDescription>
                          Total entities extracted from this document
                        </CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExtractEntities}
                        disabled={isExtracting}
                        className="gap-2"
                      >
                        {isExtracting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Extracting...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4" />
                            Re-extract
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="font-medium">Total Entities</span>
                      </div>
                      <Badge variant="secondary" className="text-lg font-bold">
                        {totalEntities}
                      </Badge>
                    </div>

                    {primaryKnowledgeDomain && (
                      <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-start">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-blue-600" />
                          <div className="flex flex-col">
                            <span className="font-medium">Primary Knowledge Domain</span>
                            <span className="text-xs text-muted-foreground">
                              Where this document is most heavily focused based on its extracted entities.
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-end">
                          <Badge variant="default" className="bg-blue-600 text-white">
                            {KNOWLEDGE_DOMAIN_LABELS[primaryKnowledgeDomain]}
                          </Badge>
                          {secondaryKnowledgeDomains.map((domain) => (
                            <Badge key={domain} variant="outline">
                              {KNOWLEDGE_DOMAIN_LABELS[domain]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {primaryKnowledgeDomain && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        This document primarily supports the{' '}
                        <span className="font-semibold">
                          {KNOWLEDGE_DOMAIN_LABELS[primaryKnowledgeDomain]}
                        </span>{' '}
                        domain
                        {secondaryKnowledgeDomains.length > 0 && (
                          <>
                            {' '}with important secondary contributions to{' '}
                            <span className="font-semibold">
                              {secondaryKnowledgeDomains.map((d) => KNOWLEDGE_DOMAIN_LABELS[d]).join(', ')}
                            </span>
                          </>
                        )}
                        .{' '}
                        {primaryKnowledgeDomain &&
                          KNOWLEDGE_DOMAIN_DESCRIPTIONS[primaryKnowledgeDomain] && (
                            <span>{KNOWLEDGE_DOMAIN_DESCRIPTIONS[primaryKnowledgeDomain]}</span>
                          )}
                      </p>
                    )}
                    {extractionStatus && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <p className="text-sm text-blue-900 dark:text-blue-100">{extractionStatus}</p>
                        {extractionProgress > 0 && (
                          <div className="mt-2">
                            <div className="h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-600 transition-all duration-300"
                                style={{ width: `${extractionProgress}%` }}
                              />
                            </div>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{extractionProgress}%</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>

                {/* Entity Types Grid */}
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle>Entity Types</CardTitle>
                    <CardDescription>
                      Click on any entity type to view details
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {entityTypes.map(({ key, label, icon: Icon, color }) => {
                        const count = entityCounts?.[key as keyof EntityCounts] || 0
                        const isClickable = count > 0
                        
                        return (
                          <div
                            key={key}
                            className={`p-3 rounded-lg border transition-all ${
                              isClickable
                                ? 'cursor-pointer hover:bg-muted hover:border-primary'
                                : 'opacity-50 cursor-not-allowed'
                            }`}
                            onClick={() => isClickable && setSelectedEntityType(key)}
                            role={isClickable ? 'button' : undefined}
                            tabIndex={isClickable ? 0 : undefined}
                            onKeyDown={(e) => {
                              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault()
                                setSelectedEntityType(key)
                              }
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={`h-4 w-4 ${color}`} />
                              <span className="text-sm font-medium">{label}</span>
                            </div>
                            <Badge variant={isClickable ? "default" : "outline"} className="mt-2">
                              {count}
                            </Badge>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </AnimatedCard>

                {/* Entity Details Tabs */}
                {selectedEntityType && entityData[selectedEntityType] && entityData[selectedEntityType].length > 0 && (
                  <AnimatedCard>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{getEntityTypeLabel(selectedEntityType)}</CardTitle>
                          <CardDescription>
                            {entityData[selectedEntityType].length} {getEntityTypeLabel(selectedEntityType).toLowerCase()} extracted from this document
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedEntityType(null)}
                        >
                          Close
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {entityData[selectedEntityType].map((entity, index) => (
                          <Card key={entity.id || index} className="overflow-hidden">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-base">
                                {entity.name || entity.title || entity.description?.substring(0, 50) || `${getEntityTypeLabel(selectedEntityType)} #${index + 1}`}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {Object.entries(entity)
                                .filter(([key]) => {
                                  // Exclude system fields
                                  if (['id', 'project_id', 'created_at', 'updated_at', 'extraction_metadata'].includes(key)) {
                                    return false
                                  }
                                  // Skip created_by and updated_by UUIDs if we have name fields
                                  if ((key === 'created_by' || key === 'updated_by') && 
                                      typeof entity[key] === 'string' && 
                                      entity[key].match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) &&
                                      entity[`${key}_name`]) {
                                    return false
                                  }
                                  return true
                                })
                                .map(([key, value]) => {
                                  // Prefer _name fields over UUID fields
                                  if ((key === 'created_by_name' || key === 'updated_by_name')) {
                                    const baseKey = key.replace('_name', '')
                                    if (entity[baseKey]) {
                                      key = baseKey
                                    }
                                  }
                                  
                                  const isLongContent = key === 'justification' || key === 'description' || (Array.isArray(value) && value.length > 0)
                                  return (
                                    <div key={key} className={isLongContent ? 'space-y-1' : 'grid grid-cols-3 gap-2 text-sm'}>
                                      <span className={`font-medium text-muted-foreground capitalize ${isLongContent ? 'block mb-1' : ''}`}>
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <div className={isLongContent ? 'w-full' : 'col-span-2 break-words'}>
                                        {renderEntityField(key, value, entity)}
                                      </div>
                                    </div>
                                  )
                                })}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </CardContent>
                  </AnimatedCard>
                )}
              </div>
            )}
            </div>
          </PageTransition>
        </main>
      </div>
    </div>
  )
}

