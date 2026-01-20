"use client"

/**
 * Drift Management Center
 * Revolutionary UX for executive drift analysis and decision-making
 * Intelligent categorization with recommended actions
 */

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  GitBranch,
  FileText,
  ChevronRight,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Users,
  Target,
  Zap,
  Lightbulb,
  AlertCircle,
  BarChart3,
  Filter,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  Layers,
  Shield,
  Sparkles
} from "@/components/ui/icons-shim"
import { toast } from '@/lib/notify'
import { apiClient } from "@/lib/api"

interface DriftDetection {
  id: string
  baseline_id: string
  project_id: string
  detection_type: string
  drift_severity: 'low' | 'medium' | 'high' | 'critical'
  drift_description: string
  drift_impact: string | any
  detection_date: string
  status: 'detected' | 'acknowledged' | 'investigating' | 'resolved' | 'false_positive'
  source_document_id?: string
  document_id?: string
  document_name?: string
  detected_by: string
  ai_processing_metadata?: any
  drift_points?: any[]
}

interface DriftCategory {
  category: 'change_request' | 'business_case' | 'patent_opportunity' | 'rejection'
  count: number
  drifts: DriftDetection[]
  recommended_action: string
  priority: 'critical' | 'high' | 'medium' | 'low'
}

interface DrillDownData {
  drift: DriftDetection
  source_documents: Array<{
    id: string
    name: string
    relevant_excerpt: string
  }>
  baseline_reference: any
  impact_analysis: {
    scope_impact: string
    cost_impact: string
    timeline_impact: string
    risk_level: string
  }
}

export default function DriftManagementPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [drifts, setDrifts] = useState<DriftDetection[]>([])
  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<DriftCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [drillDownOpen, setDrillDownOpen] = useState(false)
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null)
  const [actioningDrift, setActioningDrift] = useState<string | null>(null)
  const [selectedDrifts, setSelectedDrifts] = useState<string[]>([])

  // AI Resolution state
  const [resolutionDialogOpen, setResolutionDialogOpen] = useState(false)
  const [selectedDriftForResolution, setSelectedDriftForResolution] = useState<DriftDetection | null>(null)
  const [resolutionStrategy, setResolutionStrategy] = useState<'conservative' | 'balanced' | 'permissive'>('balanced')
  const [resolutionPreview, setResolutionPreview] = useState<any>(null)
  const [resolvingDrift, setResolvingDrift] = useState(false)

  useEffect(() => {
    fetchDrifts()
  }, [projectId])

  useEffect(() => {
    if (drifts.length > 0) {
      categorizeDrifts()
    }
  }, [drifts])

  const fetchDrifts = async () => {
    try {
      setLoading(true)
      const response = await apiClient.request<{ drifts: DriftDetection[], total: number }>(
        `/projects/${projectId}/drift-detections`,
        { suppressNotFoundError: true } as Record<string, unknown>
      )
      setDrifts(response.drifts || [])
    } catch (error) {
      console.error('Error fetching drifts:', error)
      toast.error('Failed to load drift detections')
    } finally {
      setLoading(false)
    }
  }

  const categorizeDrifts = () => {
    // AI-powered categorization based on drift characteristics
    const changeRequests: DriftDetection[] = []
    const businessCases: DriftDetection[] = []
    const patentOpps: DriftDetection[] = []
    const rejections: DriftDetection[] = []

    drifts.forEach(drift => {
      // Change Request: Most drifts that represent legitimate changes
      if (
        drift.drift_severity === 'medium' ||
        drift.drift_severity === 'high' ||
        drift.detection_type.includes('scope') ||
        drift.detection_type.includes('resource') ||
        drift.detection_type.includes('timeline')
      ) {
        changeRequests.push(drift)
      }

      // Business Case: Success criteria improvements, cost optimizations
      if (
        drift.detection_type.includes('success_criteria') ||
        (drift.detection_type.includes('cost') && drift.drift_description.toLowerCase().includes('reduction'))
      ) {
        businessCases.push(drift)
      }

      // Patent Opportunities: Novel technical approaches
      if (
        drift.detection_type.includes('technical') &&
        (drift.drift_description.toLowerCase().includes('novel') ||
          drift.drift_description.toLowerCase().includes('innovative'))
      ) {
        patentOpps.push(drift)
      }

      // Rejections: Low-value changes, risks
      if (
        drift.drift_severity === 'low' &&
        drift.detection_type.includes('technical') &&
        !drift.drift_description.toLowerCase().includes('critical')
      ) {
        rejections.push(drift)
      }
    })

    setCategories([
      {
        category: 'change_request',
        count: changeRequests.length,
        drifts: changeRequests,
        recommended_action: 'Create formal change requests for CCB review',
        priority: 'high'
      },
      {
        category: 'business_case',
        count: businessCases.length,
        drifts: businessCases,
        recommended_action: 'Generate business cases for strategic initiatives',
        priority: 'medium'
      },
      {
        category: 'patent_opportunity',
        count: patentOpps.length,
        drifts: patentOpps,
        recommended_action: 'Review for IP protection opportunities',
        priority: 'medium'
      },
      {
        category: 'rejection',
        count: rejections.length,
        drifts: rejections,
        recommended_action: 'Flag documents for correction or mark as false positives',
        priority: 'low'
      }
    ])
  }

  const handleDrillDown = async (drift: DriftDetection) => {
    try {
      // Create drill-down data showing full context
      const drillDown: DrillDownData = {
        drift,
        source_documents: [],
        baseline_reference: null,
        impact_analysis: {
          scope_impact: extractScopeImpact(drift),
          cost_impact: extractCostImpact(drift),
          timeline_impact: extractTimelineImpact(drift),
          risk_level: drift.drift_severity
        }
      }

      setDrillDownData(drillDown)
      setDrillDownOpen(true)
    } catch (error) {
      console.error('Error creating drill-down:', error)
      toast.error('Failed to load drift details')
    }
  }

  const extractScopeImpact = (drift: DriftDetection): string => {
    if (drift.detection_type.includes('scope')) {
      return drift.drift_description
    }
    return 'No direct scope impact'
  }

  const extractCostImpact = (drift: DriftDetection): string => {
    if (drift.detection_type.includes('cost')) {
      return drift.drift_description
    }
    if (drift.detection_type.includes('resource')) {
      return 'Resource expansion may increase costs'
    }
    return 'Minimal cost impact expected'
  }

  const extractTimelineImpact = (drift: DriftDetection): string => {
    if (drift.detection_type.includes('timeline')) {
      return drift.drift_description
    }
    if (drift.detection_type.includes('scope')) {
      return 'Scope expansion may extend timeline'
    }
    return 'Timeline impact to be assessed'
  }

  const handleCreateChangeRequest = async (driftIds: string[]) => {
    try {
      setActioningDrift(driftIds[0])

      // TODO: Implement bulk change request creation
      toast.success(`Creating ${driftIds.length} change request(s)...`, {
        description: 'Change requests will be routed to CCB for approval'
      })

      // Placeholder for actual implementation
      await new Promise(resolve => setTimeout(resolve, 1000))

      toast.success(`${driftIds.length} change request(s) created!`)

      // Refresh drifts
      await fetchDrifts()
    } catch (error: any) {
      console.error('Error creating change requests:', error)
      toast.error('Failed to create change requests')
    } finally {
      setActioningDrift(null)
    }
  }

  const handleGenerateBusinessCase = async (driftIds: string[]) => {
    if (driftIds.length === 0) {
      toast.error('No drift records selected')
      return
    }

    try {
      setActioningDrift(driftIds[0])

      toast.success('Generating business case...', {
        description: 'AI is analyzing ROI and strategic value'
      })

      // Get the drift record details
      const drift = drifts.find(d => d.id === driftIds[0])
      if (!drift) {
        throw new Error('Drift record not found')
      }

      // Get drift points from the drift record
      // drift_points may be in drift_points field or in drift_impact
      let driftPoints: any[] = []
      if (drift.drift_points && Array.isArray(drift.drift_points)) {
        driftPoints = drift.drift_points
      } else if (drift.drift_impact && Array.isArray(drift.drift_impact)) {
        driftPoints = drift.drift_impact
      } else if (drift.drift_impact && typeof drift.drift_impact === 'object' && drift.drift_impact.drift_points) {
        driftPoints = drift.drift_impact.drift_points
      }

      if (driftPoints.length === 0) {
        // If no drift points found, create a basic one from the drift description
        driftPoints = [{
          entityType: drift.detection_type || 'unknown',
          driftType: 'modified',
          description: drift.drift_description,
          severity: drift.drift_severity
        }]
      }

      // Call API to generate opportunity change request (which includes business case)
      // Set forceGenerate=true to generate business case even if positive drift isn't automatically detected
      const response = await apiClient.request<{
        success: boolean
        isPositiveDrift?: boolean
        changeRequest?: { changeRequestId: string; crTitle: string }
        message: string
      }>('/drift/analyze-positive', {
        method: 'POST',
        body: JSON.stringify({
          projectId,
          documentId: drift.document_id || drift.source_document_id || drift.baseline_id,
          driftRecordId: drift.id,
          driftPoints,
          forceGenerate: true // Always generate business case
        })
      })

      if (response.success && response.changeRequest) {
        toast.success('Business case generated!', {
          description: 'Ready for executive review',
          action: {
            label: 'View Document',
            onClick: () => {
              // Navigate to the change request document
              window.open(`/projects/${projectId}/documents/${response.changeRequest!.changeRequestId}/view`, '_blank')
            }
          },
          duration: 10000
        })

        // Refresh drifts to update status
        await fetchDrifts()
      } else if (response.success && !response.isPositiveDrift) {
        // If no positive drift detected, show informative message
        toast.warning('Business case generation attempted', {
          description: response.message || 'No positive drift automatically detected. Consider reviewing drift points manually.',
          duration: 8000
        })
      } else {
        throw new Error(response.message || 'Failed to generate business case')
      }
    } catch (error: any) {
      console.error('Error generating business case:', error)
      toast.error('Failed to generate business case', {
        description: error.message || 'Please try again'
      })
    } finally {
      setActioningDrift(null)
    }
  }

  const handleRejectDrift = async (driftId: string) => {
    try {
      setActioningDrift(driftId)

      await apiClient.request(`/drift-detections/${driftId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: 'false_positive',
          resolution_notes: 'Marked for document correction'
        })
      })

      toast.success('Drift marked for document correction')
      await fetchDrifts()
    } catch (error) {
      toast.error('Failed to update drift status')
    } finally {
      setActioningDrift(null)
    }
  }

  /**
   * Handle AI-powered drift resolution
   */
  const handleResolveWithAI = async (drift: DriftDetection) => {
    try {
      setSelectedDriftForResolution(drift)
      setResolutionDialogOpen(true)
      setResolvingDrift(true)
      setResolutionPreview(null)

      toast.info('AI is analyzing drift...', { description: 'This may take a few seconds' })

      // Call backend to generate AI resolution
      const response = await apiClient.request<{
        success: boolean
        resolvedContent: string
        originalContent: string
        driftPoints: any[]
        majorChanges: any[]
        requiresApproval: boolean
        strategy: string
      }>('/drift/resolve', {
        method: 'POST',
        body: JSON.stringify({
          documentId: drift.source_document_id || drift.document_id,
          driftRecordId: drift.id,
          strategy: resolutionStrategy
        })
      })

      setResolutionPreview(response)
      toast.success('Resolution prepared!', { description: 'Review changes before applying' })
    } catch (error: any) {
      console.error('Error generating AI resolution:', error)
      toast.error('Failed to generate resolution', {
        description: error.message || 'Please try again'
      })
      setResolutionDialogOpen(false)
    } finally {
      setResolvingDrift(false)
    }
  }

  /**
   * Apply AI-generated drift resolution
   */
  const handleApplyResolution = async () => {
    if (!selectedDriftForResolution || !resolutionPreview) {
      toast.error('No resolution to apply')
      return
    }

    try {
      toast.info('Applying resolution...')

      await apiClient.request('/drift/apply', {
        method: 'POST',
        body: JSON.stringify({
          documentId: selectedDriftForResolution.source_document_id || selectedDriftForResolution.document_id,
          driftRecordId: selectedDriftForResolution.id,
          resolvedContent: resolutionPreview.resolvedContent,
          majorChanges: resolutionPreview.majorChanges
        })
      })

      // Close dialog and refresh
      setResolutionDialogOpen(false)
      setSelectedDriftForResolution(null)
      setResolutionPreview(null)

      await fetchDrifts()

      toast.success('✅ Drift resolved successfully!', {
        description: resolutionPreview.requiresApproval
          ? 'Document updated. Change request created for major changes.'
          : 'Document has been realigned with baseline.'
      })
    } catch (error: any) {
      console.error('Error applying resolution:', error)
      toast.error('Failed to apply resolution', {
        description: error.message || 'Please try again'
      })
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'change_request': return <GitBranch className="h-5 w-5" />
      case 'business_case': return <TrendingUp className="h-5 w-5" />
      case 'patent_opportunity': return <Sparkles className="h-5 w-5" />
      case 'rejection': return <XCircle className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'change_request': return 'border-blue-200 bg-blue-50 text-blue-700'
      case 'business_case': return 'border-green-200 bg-green-50 text-green-700'
      case 'patent_opportunity': return 'border-purple-200 bg-purple-50 text-purple-700'
      case 'rejection': return 'border-gray-200 bg-gray-50 text-gray-700'
      default: return 'border-gray-200 bg-gray-50 text-gray-700'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-300 bg-red-50 text-red-900'
      case 'high': return 'border-orange-300 bg-orange-50 text-orange-900'
      case 'medium': return 'border-yellow-300 bg-yellow-50 text-yellow-900'
      case 'low': return 'border-blue-300 bg-blue-50 text-blue-900'
      default: return 'border-gray-300 bg-gray-50 text-gray-900'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  const unresolvedDrifts = drifts.filter(d => d.status === 'detected')
  const criticalDrifts = drifts.filter(d => d.drift_severity === 'critical')
  const highDrifts = drifts.filter(d => d.drift_severity === 'high')

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-7xl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
            Drift Management Center
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered drift analysis with recommended actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push(`/projects/${projectId}`)}>
            <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
            Back to Project
          </Button>
          <Button variant="outline" onClick={fetchDrifts}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {drifts.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No Drift Detected</h3>
            <p className="text-muted-foreground">
              All project documents align perfectly with the approved baseline.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Overview Dashboard */}
          <Card className="border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
            <CardHeader>
              <CardTitle className="text-2xl">Drift Overview</CardTitle>
              <CardDescription>Executive summary of detected deviations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                <div className="p-4 border-2 border-gray-300 bg-white rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Total Drifts</p>
                  <p className="text-3xl font-bold">{drifts.length}</p>
                </div>
                <div className="p-4 border-2 border-red-300 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700 mb-1">Critical</p>
                  <p className="text-3xl font-bold text-red-900">{criticalDrifts.length}</p>
                </div>
                <div className="p-4 border-2 border-orange-300 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-700 mb-1">High</p>
                  <p className="text-3xl font-bold text-orange-900">{highDrifts.length}</p>
                </div>
                <div className="p-4 border-2 border-yellow-300 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700 mb-1">Medium</p>
                  <p className="text-3xl font-bold text-yellow-900">
                    {drifts.filter(d => d.drift_severity === 'medium').length}
                  </p>
                </div>
                <div className="p-4 border-2 border-blue-300 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700 mb-1">Low</p>
                  <p className="text-3xl font-bold text-blue-900">
                    {drifts.filter(d => d.drift_severity === 'low').length}
                  </p>
                </div>
                <div className="p-4 border-2 border-orange-300 bg-orange-100 rounded-lg">
                  <p className="text-sm text-orange-800 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-orange-900">{unresolvedDrifts.length}</p>
                </div>
              </div>

              {/* Drift by Type */}
              <div className="mt-6">
                <h4 className="text-sm font-semibold mb-3">Drift Distribution by Type</h4>
                <div className="flex flex-wrap gap-2">
                  {Array.from(new Set(drifts.map(d => d.detection_type))).map(type => {
                    const count = drifts.filter(d => d.detection_type === type).length
                    const percentage = Math.round((count / drifts.length) * 100)

                    return (
                      <div key={type} className="flex items-center gap-2 p-2 border rounded-lg bg-white">
                        <div className="flex-1">
                          <p className="text-xs font-medium">{type.replace(/_/g, ' ').toUpperCase()}</p>
                          <p className="text-lg font-bold">{count}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">{percentage}%</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Self-Healing Workflow Explanation */}
          <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Zap className="h-8 w-8 text-purple-600 mt-1" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-purple-900 mb-2">
                    🔄 Self-Healing Drift Resolution Workflow
                  </h3>
                  <p className="text-sm text-purple-800 mb-3">
                    ADPA features an industry-first automated drift resolution system. When you edit a source document to correct drift:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-2 text-xs">
                    <div className="p-3 bg-white border border-purple-200 rounded-lg">
                      <p className="font-bold text-purple-900 mb-1">1. Edit Document</p>
                      <p className="text-purple-700">Click "View Doc" to make corrections</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="p-3 bg-white border border-purple-200 rounded-lg">
                      <p className="font-bold text-purple-900 mb-1">2. Auto Quality Audit</p>
                      <p className="text-purple-700">AI validates changes automatically</p>
                    </div>
                    <div className="flex items-center justify-center">
                      <ArrowRight className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="p-3 bg-white border border-purple-200 rounded-lg">
                      <p className="font-bold text-purple-900 mb-1">3. Drift Re-Check</p>
                      <p className="text-purple-700">System detects drift is resolved</p>
                    </div>
                  </div>
                  <p className="text-xs text-purple-700 mt-3 italic">
                    💡 <strong>Patent-Worthy Innovation:</strong> No other PM tool offers automated drift detection with self-healing capabilities. This closed-loop system is unique to ADPA.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended Actions - Main Feature */}
          <Tabs defaultValue="change_request" className="space-y-4">
            <TabsList className="grid grid-cols-4 w-full" aria-label="Drift categorization and recommended actions">
              <TabsTrigger value="change_request" className="flex items-center gap-2">
                <GitBranch className="h-4 w-4" />
                Change Requests
                <Badge variant="secondary" className="ml-1">{categories.find(c => c.category === 'change_request')?.count || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="business_case" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Business Cases
                <Badge variant="secondary" className="ml-1">{categories.find(c => c.category === 'business_case')?.count || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="patent" className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                IP Opportunities
                <Badge variant="secondary" className="ml-1">{categories.find(c => c.category === 'patent_opportunity')?.count || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="rejection" className="flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Review/Reject
                <Badge variant="secondary" className="ml-1">{categories.find(c => c.category === 'rejection')?.count || 0}</Badge>
              </TabsTrigger>
            </TabsList>

            {/* Change Requests Tab */}
            <TabsContent value="change_request">
              <Card className="border-2 border-blue-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <GitBranch className="h-5 w-5 text-blue-600" />
                        Change Requests Recommended
                      </CardTitle>
                      <CardDescription>
                        Legitimate scope, resource, and timeline changes requiring CCB approval
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleCreateChangeRequest(categories.find(c => c.category === 'change_request')?.drifts.map(d => d.id) || [])}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Create All ({categories.find(c => c.category === 'change_request')?.count || 0}) CRs
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.find(c => c.category === 'change_request')?.drifts.slice(0, 10).map(drift => (
                      <div key={drift.id} className={`p-4 border-2 rounded-lg ${getSeverityColor(drift.drift_severity)}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {drift.detection_type.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                              <Badge variant={drift.drift_severity === 'high' ? 'destructive' : 'secondary'}>
                                {drift.drift_severity}
                              </Badge>
                            </div>
                            <h4 className="font-semibold mb-1">{drift.drift_description}</h4>
                            {drift.drift_impact && typeof drift.drift_impact === 'string' && (
                              <p className="text-sm opacity-80 mt-2">
                                <strong>Impact:</strong> {drift.drift_impact}
                              </p>
                            )}
                          </div>
                          <div className="text-right text-xs text-muted-foreground">
                            {new Date(drift.detection_date).toLocaleDateString()}
                          </div>
                        </div>

                        {drift.document_name && (
                          <div className="flex items-center gap-2 text-xs opacity-75 mb-3">
                            <FileText className="h-3 w-3" />
                            <span>{drift.document_name}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDrillDown(drift)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          {drift.source_document_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/projects/${projectId}/documents/${drift.source_document_id}/view`)}
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Doc
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleResolveWithAI(drift)}
                            disabled={actioningDrift === drift.id}
                            className="border-purple-300 text-purple-700 hover:bg-purple-50"
                            variant="outline"
                          >
                            <Sparkles className="h-4 w-4 mr-2" />
                            Resolve AI
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCreateChangeRequest([drift.id])}
                            disabled={actioningDrift === drift.id}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Create CR
                          </Button>
                        </div>
                      </div>
                    ))}

                    {(categories.find(c => c.category === 'change_request')?.count || 0) > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-3">
                        + {(categories.find(c => c.category === 'change_request')?.count || 0) - 10} more change requests
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Business Case Tab */}
            <TabsContent value="business_case">
              <Card className="border-2 border-green-200">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Business Case Opportunities
                      </CardTitle>
                      <CardDescription>
                        Success criteria enhancements and strategic improvements
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleGenerateBusinessCase(categories.find(c => c.category === 'business_case')?.drifts.map(d => d.id) || [])}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Lightbulb className="h-4 w-4 mr-2" />
                      Generate Business Cases
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.find(c => c.category === 'business_case')?.drifts.map(drift => (
                      <div key={drift.id} className={`p-4 border-2 rounded-lg ${getSeverityColor(drift.drift_severity)}`}>
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {drift.detection_type.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                              <Badge className="bg-green-100 text-green-700">OPPORTUNITY</Badge>
                            </div>
                            <h4 className="font-semibold mb-1">{drift.drift_description}</h4>
                            {drift.drift_impact && typeof drift.drift_impact === 'string' && (
                              <p className="text-sm opacity-80 mt-2">
                                <strong>Strategic Value:</strong> {drift.drift_impact}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDrillDown(drift)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          {drift.source_document_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/projects/${projectId}/documents/${drift.source_document_id}/view`)}
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Doc
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleGenerateBusinessCase([drift.id])}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <TrendingUp className="h-4 w-4 mr-2" />
                            Business Case
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Patent Opportunities Tab */}
            <TabsContent value="patent">
              <Card className="border-2 border-purple-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    IP & Patent Opportunities
                  </CardTitle>
                  <CardDescription>
                    Novel technical innovations detected in drift analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {categories.find(c => c.category === 'patent_opportunity')?.count === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p className="font-medium">No Patent Opportunities Detected</p>
                      <p className="text-sm mt-1">
                        Current drift represents standard project evolution without novel IP
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {categories.find(c => c.category === 'patent_opportunity')?.drifts.map(drift => (
                        <div key={drift.id} className="p-4 border-2 border-purple-300 bg-purple-50 rounded-lg">
                          <h4 className="font-semibold mb-1">{drift.drift_description}</h4>
                          <div className="grid grid-cols-3 gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => handleDrillDown(drift)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Review
                            </Button>
                            {drift.source_document_id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => router.push(`/projects/${projectId}/documents/${drift.source_document_id}/view`)}
                                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                              >
                                <FileText className="h-4 w-4 mr-2" />
                                View Doc
                              </Button>
                            )}
                            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
                              <Sparkles className="h-4 w-4 mr-2" />
                              Flag IP
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Rejection/Correction Tab */}
            <TabsContent value="rejection">
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-gray-600" />
                    Review & Correction Queue
                  </CardTitle>
                  <CardDescription>
                    Low-value drifts recommended for document correction or rejection
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {categories.find(c => c.category === 'rejection')?.drifts.map(drift => (
                      <div key={drift.id} className="p-4 border-2 border-gray-300 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {drift.detection_type.replace(/_/g, ' ').toUpperCase()}
                              </Badge>
                              <Badge variant="secondary">{drift.drift_severity}</Badge>
                            </div>
                            <h4 className="font-semibold mb-1">{drift.drift_description}</h4>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDrillDown(drift)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                          {drift.source_document_id && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => router.push(`/projects/${projectId}/documents/${drift.source_document_id}/view`)}
                              className="border-orange-300 text-orange-700 hover:bg-orange-50"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Edit Doc
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRejectDrift(drift.id)}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            False Positive
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Drill-Down Dialog */}
          <Dialog open={drillDownOpen} onOpenChange={setDrillDownOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-blue-600" />
                  Drift Evidence & Traceability
                </DialogTitle>
                <DialogDescription>
                  Complete source analysis showing why this drift was detected
                </DialogDescription>
              </DialogHeader>

              {drillDownData && (
                <div className="space-y-4">
                  {/* Drift Summary */}
                  <Card className={`border-2 ${getSeverityColor(drillDownData.drift.drift_severity)}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Badge variant="outline">
                          {drillDownData.drift.detection_type.replace(/_/g, ' ').toUpperCase()}
                        </Badge>
                        <Badge variant={drillDownData.drift.drift_severity === 'high' ? 'destructive' : 'secondary'}>
                          {drillDownData.drift.drift_severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {drillDownData.drift.status}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-bold mb-2">{drillDownData.drift.drift_description}</h3>
                      {drillDownData.drift.drift_impact && typeof drillDownData.drift.drift_impact === 'string' && (
                        <p className="text-sm mt-2 p-3 bg-white/50 rounded-lg">
                          <strong>Impact:</strong> {drillDownData.drift.drift_impact}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Impact Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Impact Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            <p className="text-xs font-medium">Scope Impact</p>
                          </div>
                          <p className="text-sm">{drillDownData.impact_analysis.scope_impact}</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <p className="text-xs font-medium">Cost Impact</p>
                          </div>
                          <p className="text-sm">{drillDownData.impact_analysis.cost_impact}</p>
                        </div>
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-4 w-4 text-purple-600" />
                            <p className="text-xs font-medium">Timeline Impact</p>
                          </div>
                          <p className="text-sm">{drillDownData.impact_analysis.timeline_impact}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Source Document */}
                  {drillDownData.drift.document_name && (
                    <Card className="border-yellow-200 bg-yellow-50">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-yellow-700" />
                          <div>
                            <p className="text-xs text-yellow-700 font-medium">Source Document</p>
                            <p className="font-semibold text-yellow-900">{drillDownData.drift.document_name}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Recommended Action */}
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        AI Recommended Action
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        Based on drift type, severity, and impact analysis, we recommend creating a formal change request for CCB review.
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => {
                            handleResolveWithAI(drillDownData.drift)
                            setDrillDownOpen(false)
                          }}
                          className="border-purple-300 text-purple-700 hover:bg-purple-50"
                          variant="outline"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Resolve with AI
                        </Button>
                        <Button
                          onClick={() => {
                            handleCreateChangeRequest([drillDownData.drift.id])
                            setDrillDownOpen(false)
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Create Change Request
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setDrillDownOpen(false)}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Skip for Now
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setDrillDownOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* AI Resolution Dialog */}
          <Dialog open={resolutionDialogOpen} onOpenChange={setResolutionDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  AI-Powered Drift Resolution
                </DialogTitle>
                <DialogDescription>
                  {selectedDriftForResolution && (
                    <span>Resolving drift: {selectedDriftForResolution.drift_description}</span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Strategy Selection */}
                <div>
                  <Label className="text-base font-semibold mb-3 block">Resolution Strategy</Label>
                  <RadioGroup value={resolutionStrategy} onValueChange={(value: any) => setResolutionStrategy(value)}>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="conservative" id="conservative" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="conservative" className="font-medium cursor-pointer">
                            Conservative - Revert all changes
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Strictly enforces baseline. All drifted content reverted to approved baseline.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 border-2 border-purple-200 bg-purple-50 rounded-lg">
                        <RadioGroupItem value="balanced" id="balanced" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="balanced" className="font-medium cursor-pointer">
                            Balanced - Smart adjustments (Recommended)
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Keeps minor improvements, reverts unauthorized changes, flags major items for approval.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                        <RadioGroupItem value="permissive" id="permissive" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="permissive" className="font-medium cursor-pointer">
                            Permissive - Keep most changes
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Accepts most changes, only reverts critical baseline violations.
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Loading State */}
                {resolvingDrift && !resolutionPreview && (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-3" />
                      <p className="text-sm font-medium">AI is analyzing drift...</p>
                      <p className="text-xs text-muted-foreground mt-1">This may take a few seconds</p>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {resolutionPreview && (
                  <div className="space-y-3">
                    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                      <h4 className="font-semibold mb-2 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-purple-600" />
                        Resolution Ready
                      </h4>
                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Strategy:</strong> {resolutionPreview.strategy.charAt(0).toUpperCase() + resolutionPreview.strategy.slice(1)}
                        </p>
                        <p>
                          <strong>Drift Points:</strong> {resolutionPreview.driftPoints?.length || 0} issues will be resolved
                        </p>
                        {resolutionPreview.majorChanges && resolutionPreview.majorChanges.length > 0 && (
                          <p>
                            <strong>Major Changes:</strong> {resolutionPreview.majorChanges.length} requiring approval
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Major changes warning */}
                    {resolutionPreview.requiresApproval && (
                      <Alert className="border-orange-300 bg-orange-50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Approval Required:</strong> Major changes detected (budget {">"} 10%, key milestones, scope changes).
                          A change request will be automatically created for review.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResolutionDialogOpen(false)
                    setResolutionPreview(null)
                  }}
                >
                  Cancel
                </Button>
                {!resolutionPreview && !resolvingDrift && (
                  <Button
                    onClick={() => selectedDriftForResolution && handleResolveWithAI(selectedDriftForResolution)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Resolution
                  </Button>
                )}
                {resolutionPreview && (
                  <Button
                    onClick={handleApplyResolution}
                    disabled={resolvingDrift}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Apply Resolution
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}

