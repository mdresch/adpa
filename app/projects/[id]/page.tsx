"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
// @ts-expect-error - useParams is available in Next.js 14
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { apiClient, Project, Template } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { useWebSocket } from "@/contexts/WebSocketContext"
import { toast } from "sonner"
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
} from "@/components/ui/icons-shim"
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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts'

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
  created_at: string
  updated_at: string
}

// Extended Project interface to include settings and metadata
interface ExtendedProject extends Project {
  settings?: any
  metadata?: any
}

// CR-2026-001: Baseline Management Component
interface BaselineManagementProps {
  projectId: string
  documents: Document[]
}

function BaselineManagement({ projectId, documents }: BaselineManagementProps) {
  const [baseline, setBaseline] = useState<any>(null)
  const [baselines, setBaselines] = useState<any[]>([])
  const [drifts, setDrifts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [showExtractDialog, setShowExtractDialog] = useState(false)
  const [viewingBaseline, setViewingBaseline] = useState<any>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [formalDocument, setFormalDocument] = useState<string>('')
  const [missingDocuments, setMissingDocuments] = useState<any[]>([])
  const [showFormalDocDialog, setShowFormalDocDialog] = useState(false)

  // Fetch active baseline
  const fetchBaseline = async () => {
    try {
      const response = await apiClient.request<{ baseline: any }>(`/baselines/project/${projectId}/active`)
      setBaseline(response.baseline)
    } catch (error: any) {
      if (error?.status !== 404) {
        console.error('Error fetching baseline:', error)
      }
    }
  }

  // Fetch all baselines
  const fetchBaselines = async () => {
    try {
      const response = await apiClient.request<{ baselines: any[] }>(`/baselines/project/${projectId}`)
      setBaselines(response.baselines || [])
    } catch (error) {
      console.error('Error fetching baselines:', error)
    }
  }

  // Fetch drift detections
  const fetchDrifts = async () => {
    if (!baseline) return
    try {
      const response = await apiClient.request<{ drifts: any[] }>(`/baselines/${baseline.id}/drift`)
      setDrifts(response.drifts || [])
    } catch (error) {
      console.error('Error fetching drifts:', error)
    }
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchBaseline(), fetchBaselines()]).finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  useEffect(() => {
    if (baseline) {
      fetchDrifts()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseline])

  const handleExtractBaseline = async () => {
    if (documents.length === 0) {
      toast.error('No documents available to create baseline')
      return
    }

    setExtracting(true)
    try {
      await apiClient.request('/baselines/extract', {
        method: 'POST',
        body: JSON.stringify({
          project_id: projectId,
          document_ids: selectedDocuments.length > 0 ? selectedDocuments : undefined
        })
      })

      toast.success('Baseline extracted successfully!')
      setShowExtractDialog(false)
      setSelectedDocuments([])
      await fetchBaselines()
      await fetchBaseline()
    } catch (error: any) {
      console.error('Error extracting baseline:', error)
      toast.error(error?.message || 'Failed to extract baseline')
    } finally {
      setExtracting(false)
    }
  }

  const handleApproveBaseline = async (baselineId: string) => {
    try {
      await apiClient.request(`/baselines/${baselineId}/approve`, {
        method: 'POST'
      })
      toast.success('Baseline approved and activated!')
      await fetchBaseline()
      await fetchBaselines()
      setShowDetailsDialog(false)
    } catch (error: any) {
      console.error('Error approving baseline:', error)
      toast.error(error?.message || 'Failed to approve baseline')
    }
  }

  const handleDeclineBaseline = async (baselineId: string) => {
    const reason = prompt('Please provide a reason for declining this baseline (insights will be preserved):')
    if (!reason) {
      toast.error('Decline reason is required')
      return
    }

    try {
      await apiClient.request(`/baselines/${baselineId}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      })
      toast.success('Baseline declined and archived. Analysis preserved for future reference.')
      await fetchBaseline()
      await fetchBaselines()
      setShowDetailsDialog(false)
    } catch (error: any) {
      console.error('Error declining baseline:', error)
      toast.error(error?.message || 'Failed to decline baseline')
    }
  }

  const handleRerunBaseline = () => {
    // Close the details dialog and open the extract dialog with current documents selected
    setShowDetailsDialog(false)
    setSelectedDocuments(documents.map(d => d.id))
    setShowExtractDialog(true)
    toast.info('Select additional documents (like WBS, Activity List) to include in the re-extraction')
  }

  const handleViewBaseline = async (baselineId: string) => {
    try {
      const response = await apiClient.request<{ baseline: any }>(`/baselines/${baselineId}`)
      setViewingBaseline(response.baseline)
      setShowDetailsDialog(true)
    } catch (error: any) {
      console.error('Error fetching baseline:', error)
      toast.error('Failed to load baseline details')
    }
  }

  const handleGenerateFormalDocument = async (baselineId: string) => {
    try {
      const response = await apiClient.request<{ 
        document: string
        missing_documents: any[]
        project_name: string
      }>(`/baselines/${baselineId}/formal-document`)
      
      setFormalDocument(response.document)
      setMissingDocuments(response.missing_documents || [])
      setShowFormalDocDialog(true)
    } catch (error: any) {
      console.error('Error generating formal document:', error)
      toast.error('Failed to generate formal baseline document')
    }
  }

  const getDriftSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Baseline Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Project Baseline
              </CardTitle>
              <CardDescription>
                AI-extracted project baseline for drift detection
              </CardDescription>
            </div>
            {!baseline ? (
              <Button onClick={() => setShowExtractDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Baseline
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setShowExtractDialog(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Baseline
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {baseline ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Version</p>
                  <p className="text-lg font-semibold">{baseline.version}</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={baseline.status === 'active' ? 'default' : 'secondary'}>
                    {baseline.status}
                  </Badge>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <p className="text-lg font-semibold">{Math.round(baseline.extraction_confidence * 100)}%</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Completeness</p>
                  <p className="text-lg font-semibold">{Math.round(baseline.completeness_score * 100)}%</p>
                </div>
              </div>

              {/* Baseline Components */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {baseline.scope_baseline && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Scope Baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.scope_baseline.key_deliverables && (
                        <div>
                          <p className="font-medium">Deliverables:</p>
                          <ul className="list-disc list-inside text-muted-foreground">
                            {baseline.scope_baseline.key_deliverables.slice(0, 3).map((d: string, i: number) => (
                              <li key={i} className="truncate">{d}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {baseline.technical_baseline && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        Technical Baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.technical_baseline.technology_stack && (
                        <div>
                          <p className="font-medium">Tech Stack:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {baseline.technical_baseline.technology_stack.slice(0, 6).map((tech: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{tech}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {baseline.timeline_baseline && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Timeline Baseline
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.timeline_baseline.project_duration && (
                        <p><span className="font-medium">Duration:</span> {baseline.timeline_baseline.project_duration}</p>
                      )}
                      {baseline.timeline_baseline.key_milestones && (
                        <p className="text-muted-foreground">{baseline.timeline_baseline.key_milestones.length} milestones</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {baseline.success_criteria && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Success Criteria
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      {baseline.success_criteria.kpis && (
                        <p className="text-muted-foreground">{baseline.success_criteria.kpis.length} KPIs defined</p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium mb-1">No Baseline Created</p>
              <p className="text-sm">Create a baseline to enable automated drift detection</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extract/Update Baseline Dialog */}
      <Dialog open={showExtractDialog} onOpenChange={setShowExtractDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{baseline ? 'Update' : 'Extract'} Project Baseline</DialogTitle>
            <DialogDescription>
              AI will analyze your project documents to extract scope, technical, timeline, cost, and success criteria baselines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Documents (optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Leave empty to use all {documents.length} documents, or select specific documents:
              </p>
              <div className="max-h-64 overflow-y-auto border rounded-md p-2 space-y-1">
                {documents.map(doc => (
                  <label key={doc.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedDocuments.includes(doc.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDocuments([...selectedDocuments, doc.id])
                        } else {
                          setSelectedDocuments(selectedDocuments.filter(id => id !== doc.id))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{doc.name}</span>
                    {doc.template_name && (
                      <Badge variant="secondary" className="text-xs">{doc.template_name}</Badge>
                    )}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExtractDialog(false)} disabled={extracting}>
              Cancel
            </Button>
            <Button onClick={handleExtractBaseline} disabled={extracting}>
              {extracting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Extracting...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {baseline ? 'Update' : 'Extract'} Baseline
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drift Detections */}
      {baseline && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Drift Detections
              {drifts.length > 0 && (
                <Badge variant="destructive" className="ml-2">{drifts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              AI-detected deviations from the established baseline
            </CardDescription>
          </CardHeader>
          <CardContent>
            {drifts.length > 0 ? (
              <div className="space-y-3">
                {drifts.map(drift => (
                  <div key={drift.id} className={`p-4 border rounded-lg ${getDriftSeverityColor(drift.drift_severity)}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{drift.detection_type.replace('_', ' ')}</Badge>
                          <Badge variant="outline" className="text-xs">{drift.drift_severity}</Badge>
                        </div>
                        <p className="font-medium">{drift.drift_description}</p>
                        {drift.drift_impact && (
                          <p className="text-sm mt-1 opacity-75">Impact: {drift.drift_impact}</p>
                        )}
                      </div>
                      <div className="text-right text-xs opacity-75">
                        {new Date(drift.detection_date).toLocaleDateString()}
                      </div>
                    </div>
                    {drift.document_title && (
                      <p className="text-xs mt-2 opacity-75">
                        Source: {drift.document_title}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                <p className="font-medium mb-1">No Drift Detected</p>
                <p className="text-sm">All documents align with the baseline</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Baseline History */}
      {baselines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Baseline History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {baselines.map(b => (
                <div key={b.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {b.version}</span>
                      <Badge variant={b.status === 'active' ? 'default' : 'secondary'}>
                        {b.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Created {new Date(b.created_at).toLocaleDateString()} by {b.created_by_name}
                      {b.approved_at && ` • Approved ${new Date(b.approved_at).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewBaseline(b.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleGenerateFormalDocument(b.id)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Formal Document
                    </Button>
                    {b.status === 'draft' && (
                      <Button
                        size="sm"
                        onClick={() => handleApproveBaseline(b.id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Baseline Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Baseline Details - Version {viewingBaseline?.version}
            </DialogTitle>
            <DialogDescription>
              Review baseline components before approving
            </DialogDescription>
          </DialogHeader>
          
          {viewingBaseline && (
            <div className="space-y-4">
              {/* Overall Quality Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border rounded-lg bg-gradient-to-br from-blue-50 to-blue-100">
                  <p className="text-xs text-blue-700 font-medium">Extraction Confidence</p>
                  <p className="text-2xl font-bold text-blue-900">{Math.round((viewingBaseline.extraction_confidence || 0) * 100)}%</p>
                </div>
                <div className="p-3 border rounded-lg bg-gradient-to-br from-green-50 to-green-100">
                  <p className="text-xs text-green-700 font-medium">Overall Completeness</p>
                  <p className="text-2xl font-bold text-green-900">{Math.round((viewingBaseline.completeness_score || 0) * 100)}%</p>
                </div>
                <div className={`p-3 border rounded-lg ${
                  (viewingBaseline.consistency_score || 0) * 100 >= 70 ? 'bg-gradient-to-br from-purple-50 to-purple-100' :
                  (viewingBaseline.consistency_score || 0) * 100 >= 60 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
                  'bg-gradient-to-br from-red-50 to-red-100'
                }`}>
                  <p className={`text-xs font-medium ${
                    (viewingBaseline.consistency_score || 0) * 100 >= 70 ? 'text-purple-700' :
                    (viewingBaseline.consistency_score || 0) * 100 >= 60 ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>Consistency {(viewingBaseline.consistency_score || 0) * 100 < 60 && '⚠️'}</p>
                  <p className={`text-2xl font-bold ${
                    (viewingBaseline.consistency_score || 0) * 100 >= 70 ? 'text-purple-900' :
                    (viewingBaseline.consistency_score || 0) * 100 >= 60 ? 'text-yellow-900' :
                    'text-red-900'
                  }`}>{Math.round((viewingBaseline.consistency_score || 0) * 100)}%</p>
                </div>
              </div>

              {/* Quality Audit: Red Flags */}
              {viewingBaseline.ai_processing_metadata?.quality_audit?.red_flags?.length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-red-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      🚨 Critical Issues Detected ({viewingBaseline.ai_processing_metadata.quality_audit.red_flags.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {viewingBaseline.ai_processing_metadata.quality_audit.red_flags.map((flag: any, idx: number) => (
                      <div key={idx} className="p-3 border border-red-300 rounded-lg bg-white">
                        <div className="flex items-start justify-between mb-2">
                          <h5 className="font-semibold text-red-900">{flag.title}</h5>
                          <Badge variant={flag.severity === 'critical' ? 'destructive' : 'default'} className="ml-2">
                            {flag.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{flag.description}</p>
                        <div className="space-y-1 text-xs">
                          <p className="font-medium text-gray-900">Evidence:</p>
                          <ul className="list-disc list-inside text-gray-600 space-y-0.5">
                            {flag.evidence.map((e: string, i: number) => (
                              <li key={i}>{e}</li>
                            ))}
                          </ul>
                        </div>
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs font-medium text-yellow-900">Required Action:</p>
                          <p className="text-xs text-yellow-800 mt-1">{flag.required_action}</p>
                        </div>
                        {flag.blocking && (
                          <Badge variant="destructive" className="mt-2">
                            ⛔ BLOCKS APPROVAL
                          </Badge>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quality Audit: Warnings */}
              {viewingBaseline.ai_processing_metadata?.quality_audit?.warnings?.length > 0 && (
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-semibold text-yellow-900 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      ⚠️ Warnings ({viewingBaseline.ai_processing_metadata.quality_audit.warnings.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {viewingBaseline.ai_processing_metadata.quality_audit.warnings.map((warning: any, idx: number) => (
                      <div key={idx} className="p-2 border border-yellow-300 rounded bg-white text-sm">
                        <p className="font-medium text-yellow-900">{warning.title}</p>
                        <p className="text-gray-700 text-xs mt-1">{warning.description}</p>
                        <p className="text-gray-600 text-xs mt-1"><strong>Recommendation:</strong> {warning.recommendation}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Quality Audit: Feasibility Score */}
              {viewingBaseline.ai_processing_metadata?.quality_audit?.feasibility_score !== undefined && (
                <div className={`p-4 border rounded-lg ${
                  viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 70 ? 'bg-green-50 border-green-200' :
                  viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 50 ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Feasibility Assessment</p>
                      <p className="text-xs text-gray-600 mt-1">
                        {viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 70 ? 'Project is FEASIBLE as scoped' :
                         viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 50 ? 'Project feasibility is QUESTIONABLE' :
                         'Project is NOT FEASIBLE as currently scoped'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-3xl font-bold ${
                        viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 70 ? 'text-green-700' :
                        viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score >= 50 ? 'text-yellow-700' :
                        'text-red-700'
                      }`}>
                        {Math.round(viewingBaseline.ai_processing_metadata.quality_audit.feasibility_score)}%
                      </p>
                      <p className="text-xs text-gray-600">Feasibility Score</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Baseline Component Completeness Cards */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Baseline Component Completeness
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { name: 'Scope', key: 'scope_baseline', completeness: 100, color: 'blue' },
                    { name: 'Technical', key: 'technical_baseline', completeness: 100, color: 'green' },
                    { name: 'Schedule', key: 'timeline_baseline', completeness: 75, color: 'yellow' },
                    { name: 'Cost', key: 'cost_baseline', completeness: 50, color: 'orange' },
                    { name: 'Resource', key: 'resource_baseline', completeness: 60, color: 'purple' },
                    { name: 'Success Criteria', key: 'success_criteria', completeness: 90, color: 'emerald' }
                  ].map((component) => {
                    const hasData = viewingBaseline[component.key] && Object.keys(viewingBaseline[component.key]).length > 0
                    const colorClass = hasData
                      ? `border-${component.color}-200 bg-${component.color}-50`
                      : 'border-gray-200 bg-gray-50'
                    
                    return (
                      <div key={component.key} className={`p-2 border rounded-lg ${colorClass}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium">{component.name}</p>
                          <span className="text-xs">{hasData ? '✅' : '❌'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={hasData ? component.completeness : 0} className="h-1.5 flex-1" />
                          <span className="text-xs font-semibold">{hasData ? component.completeness : 0}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Scope Baseline */}
              {viewingBaseline.scope_baseline && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Target className="h-4 w-4" />
                      Scope Baseline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.scope_baseline.key_deliverables && (
                      <div>
                        <p className="font-medium mb-1">Key Deliverables:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.scope_baseline.key_deliverables.map((d: string, i: number) => (
                            <li key={i}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {viewingBaseline.scope_baseline.scope_boundaries && (
                      <div>
                        <p className="font-medium mb-1">Scope Boundaries:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.scope_baseline.scope_boundaries.map((b: string, i: number) => (
                            <li key={i}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Technical Baseline */}
              {viewingBaseline.technical_baseline && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Technical Baseline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.technical_baseline.technology_stack && (
                      <div>
                        <p className="font-medium mb-1">Technology Stack:</p>
                        <div className="flex flex-wrap gap-1">
                          {viewingBaseline.technical_baseline.technology_stack.map((tech: string, i: number) => (
                            <Badge key={i} variant="secondary">{tech}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {viewingBaseline.technical_baseline.architecture && (
                      <div>
                        <p className="font-medium mb-1">Architecture:</p>
                        <p className="text-muted-foreground">{viewingBaseline.technical_baseline.architecture}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Timeline Baseline */}
              {viewingBaseline.timeline_baseline && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Timeline Baseline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.timeline_baseline.project_duration && (
                      <div>
                        <p className="font-medium">Duration:</p>
                        <p className="text-muted-foreground">{viewingBaseline.timeline_baseline.project_duration}</p>
                      </div>
                    )}
                    {viewingBaseline.timeline_baseline.key_milestones && (
                      <div>
                        <p className="font-medium mb-1">Key Milestones:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.timeline_baseline.key_milestones.map((m: any, i: number) => (
                            <li key={i}>{m.name || m}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Success Criteria */}
              {viewingBaseline.success_criteria && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <CheckCircle className="h-4 w-4" />
                      Success Criteria
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm space-y-2">
                    {viewingBaseline.success_criteria.kpis && (
                      <div>
                        <p className="font-medium mb-1">KPIs:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {viewingBaseline.success_criteria.kpis.map((kpi: string, i: number) => (
                            <li key={i}>{kpi}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <DialogFooter className="flex justify-between">
            <div className="flex gap-2">
              {viewingBaseline?.status === 'draft' && (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => handleDeclineBaseline(viewingBaseline.id)}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline & Archive
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleRerunBaseline}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rerun with More Documents
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                Close
              </Button>
              {viewingBaseline?.status === 'draft' && (
                <Button onClick={() => handleApproveBaseline(viewingBaseline.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Baseline
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Formal Baseline Document Dialog */}
      <Dialog open={showFormalDocDialog} onOpenChange={setShowFormalDocDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Formal Project Baseline Document
            </DialogTitle>
            <DialogDescription>
              PMBOK-style baseline document with completeness assessment and recommendations
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="document" className="flex-1 overflow-hidden flex flex-col">
            <TabsList>
              <TabsTrigger value="document">Baseline Document</TabsTrigger>
              <TabsTrigger value="gaps">
                Missing Details
                {missingDocuments.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{missingDocuments.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="document" className="flex-1 overflow-y-auto prose prose-sm max-w-none p-4 border rounded-md bg-muted/30">
              <div className="bg-background p-6 rounded-lg">
                <pre className="whitespace-pre-wrap font-sans text-sm">{formalDocument}</pre>
              </div>
            </TabsContent>
            
            <TabsContent value="gaps" className="flex-1 overflow-y-auto p-4">
              {missingDocuments.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm font-medium text-orange-900">
                      {missingDocuments.length} Baseline Detail{missingDocuments.length > 1 ? 's' : ''} Missing
                    </p>
                    <p className="text-xs text-orange-700 mt-1">
                      Consider creating these documents to enhance baseline completeness and enable deeper project insights.
                    </p>
                  </div>
                  
                  {missingDocuments.map((doc, idx) => (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-orange-500" />
                              {doc.documentType}
                            </CardTitle>
                            <CardDescription className="text-xs mt-1">
                              {doc.purpose}
                            </CardDescription>
                          </div>
                          <Badge variant={
                            doc.priority === 'Critical' ? 'destructive' :
                            doc.priority === 'High' ? 'default' :
                            'secondary'
                          }>
                            {doc.priority}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-xs space-y-2">
                        <div>
                          <span className="font-medium">What it provides:</span>
                          <p className="text-muted-foreground mt-1">{doc.whatItProvides}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <FileText className="h-3 w-3 mr-1" />
                            {doc.template}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                  <p className="font-medium mb-1">Baseline is Complete!</p>
                  <p className="text-sm">All critical baseline components are present.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {missingDocuments.length > 0 && (
                <span>💡 Tip: Create missing documents to enhance baseline depth</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowFormalDocDialog(false)}>
                Close
              </Button>
              <Button onClick={() => {
                navigator.clipboard.writeText(formalDocument)
                toast.success('Baseline document copied to clipboard!')
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Document
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ProjectDetail() {
  const params = useParams()
  const projectId = params?.id as string
  const { isAuthenticated } = useAuth()

  const [project, setProject] = useState<ExtendedProject | null>(null)
  const [documents, setDocuments] = useState<Document[]>([])
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([])
  const [loading, setLoading] = useState(true)
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [stakeholdersLoading, setStakeholdersLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creatingDocument, setCreatingDocument] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [documentName, setDocumentName] = useState("")
  const [documentDescription, setDocumentDescription] = useState("")
  const [editProjectDialogOpen, setEditProjectDialogOpen] = useState(false)
  
  // AI Provider selection for document generation
  const [aiProviders, setAiProviders] = useState<any[]>([])
  const [selectedProvider, setSelectedProvider] = useState("Groq AI")
  const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant")
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
  
  // Document upload state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadingDocument, setUploadingDocument] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
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
    team_members: string[]
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
    team_members: []
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
    potential_impact: ""
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
      
      // Fallback to mock data
      setProject({
        id: projectId,
        name: "Customer Portal Redesign",
        description: "Complete redesign of the customer-facing portal with improved UX and new features",
        status: "active",
        framework: "PMBOK 7",
        priority: "high",
        owner_id: "user1",
        team_members: ["John Doe", "Jane Smith", "Mike Wilson", "Lisa Chen"],
        start_date: "2024-01-15",
        end_date: "2024-06-30",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-20T00:00:00Z",
      })
      
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
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      // Don't show error toast for documents, just use empty array
      setDocuments([])
    } finally {
      setDocumentsLoading(false)
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

  // Create new document
  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('🚀 [1/10] handleCreateDocument called')
    
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

      // Enqueue AI generation job via jobs API
      let jobId: string | undefined

      try {
        console.log('🔄 [7/10] Attempting to enqueue job...')
        const resp = await fetch('/api/jobs/ai-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            prompt: aiPrompt,
            templateId: selectedTemplate,
            name: documentName,
            description: documentDescription,
          }),
        })

        if (resp.ok) {
          const body = await resp.json()
          jobId = body.jobId
          console.log('✅ Job queued successfully:', jobId)
          toast.success('Document generation job queued — you can monitor it in Jobs')
        } else {
          console.warn('⚠️ Failed to enqueue job (status ' + resp.status + '), falling back to direct generation')
        }
      } catch (err) {
        console.warn('⚠️ Failed to enqueue job (exception), falling back to direct generation:', err)
      }

      // If we enqueued a job, just close dialog and refresh list (document will be created by worker)
      if (jobId) {
        console.log('✅ Job queued, skipping direct generation')
        setDocumentName("")
        setDocumentDescription("")
        setSelectedTemplate("")
        setCreateDialogOpen(false)
        await fetchDocuments()
        setCreatingDocument(false)
        return
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

      console.log('🌐 [SAVE-3/6] Calling apiClient.createDocument()...')
      const createResult = await apiClient.createDocument(projectId, documentData)
      console.log('✅ [SAVE-4/6] Document created successfully! ID:', createResult?.id || 'unknown')
      
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
      
      // Handle file content
      let content: any
      if (uploadForm.file.type === 'text/plain' || 
          uploadForm.file.type === 'application/json' ||
          uploadForm.file.name.endsWith('.txt') ||
          uploadForm.file.name.endsWith('.md')) {
        // Handle text files - wrap in object as expected by backend
        const textContent = await uploadForm.file.text()
        content = {
          text: textContent,
          fileName: uploadForm.file.name,
          fileType: uploadForm.file.type,
          uploadedAt: new Date().toISOString()
        }
      } else {
        content = {
          fileName: uploadForm.file.name,
          fileSize: uploadForm.file.size,
          fileType: uploadForm.file.type,
          uploadedAt: new Date().toISOString(),
          note: "Binary file uploaded - content stored separately"
        }
      }
      
      await apiClient.createDocument(projectId, {
        name: uploadForm.name,
        content: content,
        template_id: uploadForm.template_id,
        status: "draft"
      })
      
      toast.success("Document uploaded successfully!")
      setUploadDialogOpen(false)
      setUploadForm({
        name: "",
        file: null,
        template_id: "",
      })
      await fetchDocuments()
    } catch (error) {
      console.error("Failed to upload document:", error)
      toast.error("Failed to upload document")
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
    
    // Extract manager from team_members (assuming first member is manager)
    const manager = project.team_members && project.team_members.length > 0 ? project.team_members[0] : ""
    const teamMembers = project.team_members || []
    
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
      team_members: teamMembers
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
      
      // Prepare team members array (include manager as first member if specified)
      let teamMembers = [...editForm.team_members]
      if (editForm.manager && !teamMembers.includes(editForm.manager)) {
        teamMembers = [editForm.manager, ...teamMembers]
      }
      
      const updateData = {
        name: editForm.name,
        description: editForm.description,
        framework: editForm.framework,
        status: editForm.status,
        priority: editForm.priority,
        start_date: editForm.start_date || undefined,
        end_date: editForm.end_date || undefined,
        budget: editForm.budget ? parseFloat(editForm.budget) : undefined,
        team_members: teamMembers
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

  // Add team member
  const handleAddTeamMember = () => {
    const memberName = prompt("Enter team member name:")
    if (memberName && memberName.trim()) {
      const trimmedName = memberName.trim()
      // Check if member already exists
      if (editForm.team_members.includes(trimmedName)) {
        toast.error("Team member already exists")
        return
      }
      setEditForm(prev => ({
        ...prev,
        team_members: [...prev.team_members, trimmedName]
      }))
      toast.success("Team member added successfully")
    }
  }

  // Remove team member
  const handleRemoveTeamMember = (index: number) => {
    const memberName = editForm.team_members[index]
    setEditForm(prev => ({
      ...prev,
      team_members: prev.team_members.filter((_, i) => i !== index)
    }))
    toast.success(`Removed ${memberName} from team`)
  }

  // Handle opening new stakeholder dialog
  const handleAddStakeholder = () => {
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
      potential_impact: ""
    })
    setStakeholderDialogOpen(true)
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
        potential_impact: ""
      })
    }
  }

  // Handle opening edit stakeholder dialog
  const handleEditStakeholder = (stakeholder: Stakeholder) => {
    setEditingStakeholder(stakeholder)
    setStakeholderForm({
      name: stakeholder.name || "",
      role: stakeholder.role,
      department: stakeholder.department || "",
      email: stakeholder.email,
      phone: stakeholder.phone || "",
      interest_level: stakeholder.interest_level,
      influence_level: stakeholder.influence_level,
      engagement_approach: stakeholder.engagement_approach,
      communication_frequency: stakeholder.communication_frequency,
      stakeholder_type: stakeholder.stakeholder_type,
      stakeholder_category: stakeholder.stakeholder_category,
      expectations: stakeholder.expectations || "",
      potential_impact: stakeholder.potential_impact || ""
    })
    setStakeholderDialogOpen(true)
  }

  // Save stakeholder (create or update)
  const handleSaveStakeholder = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stakeholderForm.role || !stakeholderForm.email) {
      toast.error("Please fill in required fields (Role, Email)")
      return
    }

    try {
      setSavingStakeholder(true)
      
      if (editingStakeholder) {
        // Update existing stakeholder
        await apiClient.updateStakeholder(editingStakeholder.id, stakeholderForm)
        toast.success("Stakeholder updated successfully!")
      } else {
        // Create new stakeholder
        await apiClient.createStakeholder({
          project_id: projectId,
          ...stakeholderForm
        })
        toast.success("Stakeholder added successfully!")
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

  // Listen for document creation events via WebSocket and refresh documents for this project
  const { on, off } = useWebSocket()
  useEffect(() => {
    const handleDocumentCreated = (data: { document?: { project_id: string; name: string } }) => {
      try {
        const doc = data?.document
        if (doc && doc.project_id && doc.name && String(doc.project_id) === String(projectId)) {
          toast.success(`New document created: ${doc.name}`)
          fetchDocuments()
        }
      } catch (err) {
        console.warn('Error handling document:created event', err)
      }
    }

    on("document:created", handleDocumentCreated)

    return () => {
      off("document:created", handleDocumentCreated)
    }
  }, [projectId, on, off])

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
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
              <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
              <Button asChild>
                <Link href="/projects">Back to Projects</Link>
              </Button>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const progress = getProjectProgress()

  // Determine project manager and other members for Team tab ordering
  const managerName = (project as any).owner_name || (project.team_members && project.team_members.length > 0 ? project.team_members[0] : 'Not assigned')
  const otherMembers = project.team_members ? project.team_members.filter((m) => m !== managerName) : []

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
                <Dialog open={createDialogOpen} onOpenChange={(open: boolean) => {
                  setCreateDialogOpen(open)
                  if (open) {
                    fetchTemplatesForUpload()
                    fetchAIProviders()
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
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTemplate(e.target.value)}
                            required
                          >
                            <option value="">Choose a template</option>
                            {loadingTemplates ? (
                              <option disabled>Loading templates...</option>
                            ) : (
                              templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] 
                                    ? statusConfig[template.development_status as keyof typeof statusConfig].emoji + ' ' 
                                    : ''}
                                  {template.name} ({template.framework})
                                  {template.development_status === 'production' ? ' ✓' : ''}
                                </option>
                              ))
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumentName(e.target.value)}
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDocumentDescription(e.target.value)}
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAiTemperature(parseFloat(e.target.value))}
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
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({...prev, name: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(prev => ({...prev, priority: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(prev => ({...prev, framework: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditForm(prev => ({...prev, status: e.target.value}))}
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
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditForm(prev => ({...prev, description: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({...prev, start_date: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({...prev, end_date: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({...prev, budget: e.target.value}))}
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditForm(prev => ({...prev, manager: e.target.value}))}
                          />
                        </div>

                        {/* Team Members */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-sm font-semibold">Team Members</Label>
                            <Button type="button" variant="outline" size="sm" onClick={handleAddTeamMember}>
                              <Plus className="h-4 w-4 mr-1" />
                              Add Member
                            </Button>
                          </div>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {editForm.team_members.map((member, index) => (
                              <div key={index} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm">{member}</span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveTeamMember(index)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                            {editForm.team_members.length === 0 && (
                              <div className="text-center py-4 text-muted-foreground text-sm">
                                No team members added yet
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditProjectDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={updating}>
                          {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          {updating ? "Updating..." : "Update Project"}
                        </Button>
                      </DialogFooter>
                    </form>
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
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeholderForm(prev => ({...prev, role: e.target.value}))}
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
                              value={stakeholderForm.name}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeholderForm(prev => ({...prev, name: e.target.value}))}
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
                              value={stakeholderForm.department}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeholderForm(prev => ({...prev, department: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeholderForm(prev => ({...prev, email: e.target.value}))}
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
                              value={stakeholderForm.phone}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStakeholderForm(prev => ({...prev, phone: e.target.value}))}
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
                              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({...prev, stakeholder_type: e.target.value as 'internal' | 'external'}))}
                            >
                              <option value="internal">Internal</option>
                              <option value="external">External</option>
                            </select>
                          </div>
                        </div>

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
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({...prev, interest_level: e.target.value as 'high' | 'medium' | 'low'}))}
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
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({...prev, influence_level: e.target.value as 'high' | 'medium' | 'low'}))}
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
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({...prev, engagement_approach: e.target.value as 'manage_closely' | 'keep_satisfied' | 'keep_informed' | 'monitor'}))}
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
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({...prev, communication_frequency: e.target.value as 'daily' | 'weekly' | 'bi_weekly' | 'monthly' | 'as_needed'}))}
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
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStakeholderForm(prev => ({...prev, stakeholder_category: e.target.value as 'primary' | 'secondary'}))}
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
                                value={stakeholderForm.expectations}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStakeholderForm(prev => ({...prev, expectations: e.target.value}))}
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
                                value={stakeholderForm.potential_impact}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setStakeholderForm(prev => ({...prev, potential_impact: e.target.value}))}
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUploadForm({...uploadForm, name: e.target.value})}
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
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setUploadForm({...uploadForm, template_id: e.target.value})}
                            required
                          >
                            <option value="">Select a template (required)</option>
                            {loadingTemplates ? (
                              <option disabled>Loading templates...</option>
                            ) : (
                              templates.map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name} ({template.framework})
                                </option>
                              ))
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
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0] || null
                              setUploadForm({...uploadForm, file})
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

            <Tabs defaultValue="documents" className="space-y-4">
              <TabsList>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
                <TabsTrigger value="baseline">Baseline</TabsTrigger>
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
              </TabsList>

              <TabsContent value="documents" className="space-y-4">
                {/* Document Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                          <p className="text-2xl font-bold">{documents.length}</p>
                        </div>
                        <FileText className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Draft</p>
                          <p className="text-2xl font-bold">{documents.filter(d => d.status === 'draft').length}</p>
                        </div>
                        <Edit className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Published</p>
                          <p className="text-2xl font-bold">{documents.filter(d => d.status === 'published').length}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">In Review</p>
                          <p className="text-2xl font-bold">{documents.filter(d => d.status === 'review').length}</p>
                        </div>
                        <Clock className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search & Actions */}
                <div className="flex items-center space-x-4">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search documents..."
                      value={searchTerm}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Generate Document
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                  <Button variant="outline" onClick={handleUploadDocumentClick}>
                    <Download className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </div>

                {/* Loading state for documents */}
                {documentsLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading documents...</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayDocuments.map((doc) => (
                      <Card key={doc.id} className="hover:shadow-sm transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {getStatusIcon(doc.status)}
                              <div className="flex-1">
                                <div className="flex items-center space-x-2">
                                  <Link
                                    href={`/projects/${projectId}/documents/${doc.id}/view`}
                                    className="font-semibold hover:text-primary transition-colors"
                                  >
                                    {doc.name}
                                  </Link>
                                  <Badge variant={getStatusColor(doc.status)} className="text-xs">
                                    {doc.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                                  <span>v{doc.version}</span>
                                  <span>•</span>
                                  <span>Modified {new Date(doc.updated_at).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>by {doc.updated_by}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${projectId}/documents/${doc.id}`}>
                                  <Edit className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/projects/${projectId}/documents/${doc.id}/view`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="h-4 w-4" />
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleEditDocument(doc.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit in Text Editor
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/projects/${projectId}/documents/${doc.id}/view`}>
                                      <Eye className="h-4 w-4 mr-2" />
                                      View in Rich Editor
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDownloadDocument(doc.id)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-destructive"
                                    onClick={() => handleDeleteDocument(doc.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {displayDocuments.length === 0 && (
                      <div className="text-center py-8">
                        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                        <p className="text-muted-foreground mb-4">
                          {searchTerm 
                            ? "Try adjusting your search criteria" 
                            : "Start by generating your first document for this project"
                          }
                        </p>
                        {!searchTerm && (
                          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                            <DialogTrigger asChild>
                              <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Generate First Document
                              </Button>
                            </DialogTrigger>
                          </Dialog>
                        )}
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {displayDocuments.length > 0 && documentsPagination.pages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Showing {((documentsPagination.page - 1) * documentsPagination.limit) + 1} to {Math.min(documentsPagination.page * documentsPagination.limit, documentsPagination.total)} of {documentsPagination.total} documents
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocumentsPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                            disabled={documentsPagination.page <= 1}
                          >
                            Previous
                          </Button>
                          <span className="text-sm text-muted-foreground">
                            Page {documentsPagination.page} of {documentsPagination.pages}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDocumentsPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                            disabled={documentsPagination.page >= documentsPagination.pages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="overview" className="space-y-4">
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
                      <CardTitle className="text-sm font-medium">Team Size</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{project.team_members?.length || 0}</div>
                      <p className="text-xs text-muted-foreground">Team members</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Documents</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{documents.length}</div>
                      <p className="text-xs text-muted-foreground">Generated docs</p>
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
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Draft', value: documents.filter(d => d.status === 'draft').length, fill: '#f97316' },
                              { name: 'Review', value: documents.filter(d => d.status === 'review').length, fill: '#a855f7' },
                              { name: 'Published', value: documents.filter(d => d.status === 'published').length, fill: '#10b981' },
                              { name: 'Archived', value: documents.filter(d => d.status === 'archived').length, fill: '#6b7280' },
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={(entry: any) => entry.value > 0 ? `${entry.name}: ${entry.value}` : ''}
                            outerRadius={80}
                            dataKey="value"
                          >
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Project Health */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-primary" />
                        Project Health Indicators
                      </CardTitle>
                      <CardDescription>Key project metrics at a glance</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Schedule Performance</span>
                          <Badge variant={progress >= 80 ? "default" : progress >= 50 ? "secondary" : "destructive"}>
                            {progress >= 80 ? "On Track" : progress >= 50 ? "At Risk" : "Behind"}
                          </Badge>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Documentation Complete</span>
                          <Badge variant={documents.filter(d => d.status === 'published').length >= 5 ? "default" : "secondary"}>
                            {documents.filter(d => d.status === 'published').length} Published
                          </Badge>
                        </div>
                        <Progress value={(documents.filter(d => d.status === 'published').length / Math.max(documents.length, 1)) * 100} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Team Engagement</span>
                          <Badge variant="default">{project.team_members?.length || 0} Members</Badge>
                        </div>
                        <Progress value={Math.min((project.team_members?.length || 0) * 20, 100)} className="h-2" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Stakeholder Coverage</span>
                          <Badge variant={stakeholders.length >= 3 ? "default" : "secondary"}>
                            {stakeholders.length} Stakeholders
                          </Badge>
                        </div>
                        <Progress value={Math.min(stakeholders.length * 20, 100)} className="h-2" />
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
                      {project.team_members && project.team_members.length > 0 ? (
                        <div className="space-y-2">
                          {project.team_members.map((member, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                <Users className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{member}</p>
                                <p className="text-xs text-muted-foreground">Team Member</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No team members assigned</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="stakeholders" className="space-y-4">
                {/* Stakeholder Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Stakeholders</p>
                          <p className="text-2xl font-bold">{stakeholders.length}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">High Influence</p>
                          <p className="text-2xl font-bold">{stakeholders.filter(s => s.influence_level === 'high').length}</p>
                        </div>
                        <Zap className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Internal</p>
                          <p className="text-2xl font-bold">{stakeholders.filter(s => s.stakeholder_type === 'internal').length}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-emerald-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Primary</p>
                          <p className="text-2xl font-bold">{stakeholders.filter(s => s.stakeholder_category === 'primary').length}</p>
                        </div>
                        <Target className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Stakeholder Management</h2>
                    <p className="text-muted-foreground">Analyze and engage with project stakeholders</p>
                  </div>
                  <Button onClick={handleAddStakeholder}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stakeholder
                  </Button>
                </div>

                {/* Power/Interest Matrix */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Power/Interest Matrix
                    </CardTitle>
                    <CardDescription>Stakeholder positioning based on influence and interest levels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 p-4 border rounded-lg">
                      {/* High Interest, High Power - Manage Closely */}
                      <div className="p-4 border-2 border-red-300 bg-red-50 dark:bg-red-900/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <AlertCircle className="h-5 w-5 text-red-600" />
                          <h4 className="font-semibold text-red-900 dark:text-red-100">Manage Closely</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">High Interest • High Influence</p>
                        <div className="space-y-1">
                          {stakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'high').length > 0 ? (
                            stakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'high').map(s => (
                              <Badge key={s.id} variant="destructive" className="mr-1 mb-1">{s.role}</Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No stakeholders</p>
                          )}
                        </div>
                      </div>

                      {/* Low Interest, High Power - Keep Satisfied */}
                      <div className="p-4 border-2 border-yellow-300 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle className="h-5 w-5 text-yellow-600" />
                          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Keep Satisfied</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">Low Interest • High Influence</p>
                        <div className="space-y-1">
                          {stakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'high').length > 0 ? (
                            stakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'high').map(s => (
                              <Badge key={s.id} variant="secondary" className="mr-1 mb-1">{s.role}</Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No stakeholders</p>
                          )}
                        </div>
                      </div>

                      {/* High Interest, Low Power - Keep Informed */}
                      <div className="p-4 border-2 border-blue-300 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100">Keep Informed</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">High Interest • Low Influence</p>
                        <div className="space-y-1">
                          {stakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'low').length > 0 ? (
                            stakeholders.filter(s => s.interest_level === 'high' && s.influence_level === 'low').map(s => (
                              <Badge key={s.id} variant="default" className="mr-1 mb-1">{s.role}</Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No stakeholders</p>
                          )}
                        </div>
                      </div>

                      {/* Low Interest, Low Power - Monitor */}
                      <div className="p-4 border-2 border-gray-300 bg-gray-50 dark:bg-gray-900/10 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <Eye className="h-5 w-5 text-gray-600" />
                          <h4 className="font-semibold text-gray-900 dark:text-gray-100">Monitor</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">Low Interest • Low Influence</p>
                        <div className="space-y-1">
                          {stakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'low').length > 0 ? (
                            stakeholders.filter(s => s.interest_level === 'low' && s.influence_level === 'low').map(s => (
                              <Badge key={s.id} variant="outline" className="mr-1 mb-1">{s.role}</Badge>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground">No stakeholders</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Loading state for stakeholders */}
                {stakeholdersLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Loading stakeholders...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stakeholders.length > 0 ? (
                      stakeholders.map((stakeholder) => (
                        <Card key={stakeholder.id} className="hover:shadow-sm transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-4">
                                {/* Header with role as primary identifier */}
                                <div className="flex items-center space-x-4">
                                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Users className="h-6 w-6 text-primary" />
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-semibold">{stakeholder.role}</h3>
                                    <p className="text-muted-foreground">
                                      {stakeholder.name ? `${stakeholder.name} • ` : ''}{stakeholder.department}
                                    </p>
                                    <div className="flex items-center space-x-2 mt-1">
                                      <Badge variant={stakeholder.stakeholder_type === 'internal' ? 'default' : 'secondary'}>
                                        {stakeholder.stakeholder_type === 'internal' ? 'Internal' : 'External'}
                                      </Badge>
                                      <Badge variant={stakeholder.stakeholder_category === 'primary' ? 'default' : 'outline'}>
                                        {stakeholder.stakeholder_category === 'primary' ? 'Primary' : 'Secondary'}
                                      </Badge>
                                      {!stakeholder.name && (
                                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                                          To Be Recruited
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Contact Information */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Email</p>
                                    <p className="text-sm">{stakeholder.email}</p>
                                  </div>
                                  {stakeholder.phone && (
                                    <div>
                                      <p className="text-sm font-medium text-muted-foreground">Phone</p>
                                      <p className="text-sm">{stakeholder.phone}</p>
                                    </div>
                                  )}
                                </div>

                                {/* PMBOK Parameters */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Interest Level</p>
                                    <Badge variant={getInterestLevelColor(stakeholder.interest_level)}>
                                      {stakeholder.interest_level.charAt(0).toUpperCase() + stakeholder.interest_level.slice(1)}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Influence Level</p>
                                    <Badge variant={getInfluenceLevelColor(stakeholder.influence_level)}>
                                      {stakeholder.influence_level.charAt(0).toUpperCase() + stakeholder.influence_level.slice(1)}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Engagement Approach</p>
                                    <Badge variant={getEngagementApproachColor(stakeholder.engagement_approach)}>
                                      {formatEngagementApproach(stakeholder.engagement_approach)}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Communication</p>
                                    <Badge variant="outline">
                                      {formatCommunicationFrequency(stakeholder.communication_frequency)}
                                    </Badge>
                                  </div>
                                </div>

                                {/* Expectations and Impact */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Expectations</p>
                                    <p className="text-sm">{stakeholder.expectations || 'Not specified'}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-muted-foreground">Potential Impact</p>
                                    <p className="text-sm">{stakeholder.potential_impact || 'Not specified'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditStakeholder(stakeholder)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDeleteStakeholder(stakeholder.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No stakeholders found</h3>
                        <p className="text-muted-foreground mb-4">
                          Start by adding stakeholders or creating placeholders for roles that need to be recruited
                        </p>
                        <Button onClick={handleAddStakeholder}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Stakeholder
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="baseline" className="space-y-4">
                {/* Baseline Tab - CR-2026-001 */}
                <BaselineManagement projectId={projectId} documents={documents} />
              </TabsContent>

              <TabsContent value="variables" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      Project Variables & Metadata
                    </CardTitle>
                    <CardDescription>
                      Key project attributes and configuration variables that can be used in document generation
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Basic Information</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Project Name</p>
                              <p className="text-sm font-semibold">{project?.name || 'N/A'}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(project?.name || '')
                                toast.success('Copied to clipboard')
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
                              <p className="text-sm">{project?.description || 'No description'}</p>
                            </div>
                            {project?.description && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(project?.description || '')
                                  toast.success('Copied to clipboard')
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Project ID</p>
                              <p className="text-sm font-mono text-xs">{project?.id || 'N/A'}</p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => {
                                navigator.clipboard.writeText(project?.id || '')
                                toast.success('Copied to clipboard')
                              }}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Project Attributes */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Project Attributes</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Framework</p>
                              <Badge variant="outline">{project?.framework || 'N/A'}</Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Status</p>
                              <Badge>{project?.status || 'N/A'}</Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Priority</p>
                              <Badge variant={
                                project?.priority === 'high' ? 'destructive' : 
                                project?.priority === 'medium' ? 'default' : 
                                'secondary'
                              }>
                                {project?.priority || 'N/A'}
                              </Badge>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Owner</p>
                              <p className="text-sm">{project?.owner_name || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Timeline & Budget */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Timeline & Budget</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Start Date</p>
                              <p className="text-sm">
                                {project?.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">End Date</p>
                              <p className="text-sm">
                                {project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Budget</p>
                              <p className="text-sm font-semibold">
                                {project?.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Duration</p>
                              <p className="text-sm">
                                {project?.start_date && project?.end_date
                                  ? `${Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))} days`
                                  : 'Not set'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Team & Timestamps */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Team & Tracking</h3>
                        
                        <div className="space-y-3">
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Team Members</p>
                              <p className="text-sm">
                                {project?.team_members && project.team_members.length > 0 
                                  ? `${project.team_members.length} members`
                                  : 'No team members'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Created</p>
                              <p className="text-sm">
                                {project?.created_at ? new Date(project.created_at).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Last Updated</p>
                              <p className="text-sm">
                                {project?.updated_at ? new Date(project.updated_at).toLocaleString() : 'N/A'}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Documents</p>
                              <p className="text-sm font-semibold">{documents.length} documents</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                            <div className="flex-1">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Stakeholders</p>
                              <p className="text-sm font-semibold">{stakeholders.length} stakeholders</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Custom Variables from Settings & Metadata */}
                    {(project as any)?.settings && Object.keys((project as any).settings).length > 0 && (
                      <div className="mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Settings className="h-5 w-5" />
                              Custom Settings
                            </CardTitle>
                            <CardDescription>
                              Project-specific configuration settings
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.entries((project as any).settings).map(([key, value]) => (
                                <div key={key} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{key}</p>
                                    <p className="text-sm font-mono text-xs">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(typeof value === 'object' ? JSON.stringify(value) : String(value))
                                      toast.success('Copied to clipboard')
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                    
                    {(project as any)?.metadata && Object.keys((project as any).metadata).length > 0 && (
                      <div className="mt-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Database className="h-5 w-5" />
                              Custom Metadata
                            </CardTitle>
                            <CardDescription>
                              Additional project metadata and custom fields
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {Object.entries((project as any).metadata).map(([key, value]) => (
                                <div key={key} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-muted-foreground mb-1">{key}</p>
                                    <p className="text-sm font-mono text-xs">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                                  </div>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      navigator.clipboard.writeText(typeof value === 'object' ? JSON.stringify(value) : String(value))
                                      toast.success('Copied to clipboard')
                                    }}
                                  >
                                    <Copy className="h-4 w-4" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Variable Usage Guide */}
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Lightbulb className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                            Using Project Variables in Document Generation
                          </h4>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                            These variables are automatically available when generating documents for this project. You can reference them using template placeholders:
                          </p>
                          <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200 font-mono bg-blue-100 dark:bg-blue-900 p-3 rounded">
                            <p className="font-semibold mb-1">Standard Variables:</p>
                            <p>{"{{project_name}}"} → {project?.name}</p>
                            <p>{"{{project_framework}}"} → {project?.framework}</p>
                            <p>{"{{project_status}}"} → {project?.status}</p>
                            <p>{"{{project_priority}}"} → {project?.priority}</p>
                            <p>{"{{project_budget}}"} → {project?.budget ? `$${project.budget.toLocaleString()}` : 'Not set'}</p>
                            <p>{"{{project_owner}}"} → {project?.owner_name || 'N/A'}</p>
                            <p>{"{{start_date}}"} → {project?.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}</p>
                            <p>{"{{end_date}}"} → {project?.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}</p>
                            <p>{"{{document_count}}"} → {documents.length}</p>
                            <p>{"{{stakeholder_count}}"} → {stakeholders.length}</p>
                            
                            {(project as any)?.team_members && (project as any).team_members.length > 0 && (
                              <>
                                <p className="font-semibold mt-2 mb-1">Team Variables:</p>
                                <p>{"{{team_size}}"} → {(project as any).team_members.length}</p>
                              </>
                            )}
                            
                            {(project as any)?.settings && Object.keys((project as any).settings).length > 0 && (
                              <>
                                <p className="font-semibold mt-2 mb-1">Custom Settings:</p>
                                {Object.keys((project as any).settings).map(key => (
                                  <p key={key}>{"{{settings." + key + "}}"} → {String((project as any).settings[key])}</p>
                                ))}
                              </>
                            )}
                            
                            {(project as any)?.metadata && Object.keys((project as any).metadata).length > 0 && (
                              <>
                                <p className="font-semibold mt-2 mb-1">Custom Metadata:</p>
                                {Object.keys((project as any).metadata).map(key => (
                                  <p key={key}>{"{{metadata." + key + "}}"} → {String((project as any).metadata[key])}</p>
                                ))}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                {/* Timeline Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Duration</p>
                          <p className="text-2xl font-bold">
                            {project.start_date && project.end_date
                              ? `${Math.ceil((new Date(project.end_date).getTime() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))} mo`
                              : 'N/A'}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Days Elapsed</p>
                          <p className="text-2xl font-bold">
                            {project.start_date
                              ? Math.ceil((Date.now() - new Date(project.start_date).getTime()) / (1000 * 60 * 60 * 24))
                              : 'N/A'}
                          </p>
                        </div>
                        <Activity className="h-8 w-8 text-emerald-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Days Remaining</p>
                          <p className="text-2xl font-bold">
                            {project.end_date
                              ? Math.max(0, Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                              : 'N/A'}
                          </p>
                        </div>
                        <Calendar className="h-8 w-8 text-orange-500" />
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Status</p>
                          <Badge className="mt-1" variant={project.status === 'active' ? 'default' : 'secondary'}>
                            {project.status?.toUpperCase()}
                          </Badge>
                        </div>
                        <CheckCircle className="h-8 w-8 text-purple-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Project Phases */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-primary" />
                      Project Phases
                    </CardTitle>
                    <CardDescription>Key project lifecycle stages</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { phase: 'Initiation', status: 'completed', progress: 100, color: 'emerald' },
                        { phase: 'Planning', status: progress >= 25 ? 'completed' : 'in-progress', progress: Math.min(progress * 4, 100), color: 'blue' },
                        { phase: 'Execution', status: progress >= 50 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 25) * 4), color: 'purple' },
                        { phase: 'Monitoring & Control', status: progress >= 75 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 50) * 2), color: 'orange' },
                        { phase: 'Closure', status: progress >= 95 ? 'in-progress' : 'pending', progress: Math.max(0, (progress - 90) * 10), color: 'red' },
                      ].map((phaseData, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                phaseData.status === 'completed' ? 'bg-emerald-100 dark:bg-emerald-900/20' :
                                phaseData.status === 'in-progress' ? 'bg-blue-100 dark:bg-blue-900/20' :
                                'bg-gray-100 dark:bg-gray-900/20'
                              }`}>
                                {phaseData.status === 'completed' ? (
                                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                                ) : phaseData.status === 'in-progress' ? (
                                  <RefreshCw className="h-5 w-5 text-blue-600 animate-spin" />
                                ) : (
                                  <Clock className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold">{phaseData.phase}</p>
                                <p className="text-xs text-muted-foreground">
                                  {phaseData.status === 'completed' ? 'Completed' : 
                                   phaseData.status === 'in-progress' ? 'In Progress' : 
                                   'Not Started'}
                                </p>
                              </div>
                            </div>
                            <Badge variant={
                              phaseData.status === 'completed' ? 'default' :
                              phaseData.status === 'in-progress' ? 'secondary' :
                              'outline'
                            }>
                              {Math.round(phaseData.progress)}%
                            </Badge>
                          </div>
                          <Progress value={phaseData.progress} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Key Milestones */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Key Milestones
                      </CardTitle>
                      <CardDescription>Important project checkpoints</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {project.start_date && (
                          <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                              <CheckCircle className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold">Project Kickoff</p>
                                <Badge variant="default">Complete</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(project.start_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                        
                        <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                            <Activity className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold">Current Phase</p>
                              <Badge variant="secondary">Active</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground capitalize">{project.status || 'In Progress'}</p>
                          </div>
                        </div>

                        {documents.filter(d => d.status === 'published').length > 0 && (
                          <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center shrink-0">
                              <FileText className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold">Documentation Milestone</p>
                                <Badge variant="default">Complete</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {documents.filter(d => d.status === 'published').length} document(s) published
                              </p>
                            </div>
                          </div>
                        )}
                        
                        {project.end_date && (
                          <div className="flex items-start gap-4 p-3 rounded-lg border bg-muted/30">
                            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center shrink-0">
                              <Calendar className="h-5 w-5 text-orange-600" />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-semibold">Project Completion</p>
                                <Badge variant="outline">Scheduled</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(project.end_date).toLocaleDateString('en-US', { 
                                  year: 'numeric', 
                                  month: 'long', 
                                  day: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline Visualization */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        Project Timeline
                      </CardTitle>
                      <CardDescription>Visual project timeline</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        {/* Timeline Bar */}
                        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden relative">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-semibold text-white drop-shadow-md">
                              {progress}% Complete
                            </span>
                          </div>
                        </div>

                        {/* Timeline Labels */}
                        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                          <span>
                            {project.start_date 
                              ? new Date(project.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                              : 'Start'}
                          </span>
                          <span>
                            {project.end_date 
                              ? new Date(project.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                              : 'End'}
                          </span>
                        </div>

                        {/* Key Dates */}
                        <div className="mt-6 space-y-3">
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <span className="text-sm font-medium">Project Start</span>
                            <span className="text-sm text-muted-foreground">
                              {project.start_date 
                                ? new Date(project.start_date).toLocaleDateString()
                                : 'Not set'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <span className="text-sm font-medium">Today</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date().toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                            <span className="text-sm font-medium">Target End</span>
                            <span className="text-sm text-muted-foreground">
                              {project.end_date 
                                ? new Date(project.end_date).toLocaleDateString()
                                : 'Not set'}
                            </span>
                          </div>
                          
                          {project.start_date && project.end_date && (
                            <div className="flex items-center justify-between p-2 rounded-lg bg-primary/10">
                              <span className="text-sm font-medium">Time Remaining</span>
                              <span className="text-sm font-semibold text-primary">
                                {Math.max(0, Math.ceil((new Date(project.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} days
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
