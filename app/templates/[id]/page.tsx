"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  FileText,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  BarChart3,
  Activity,
  ArrowRight,
  Edit,
  Copy,
  Eye,
  Zap,
  Calendar,
} from "@/components/ui/icons-shim"
import { Award, Target, ArrowUp, Brain, Archive, ClipboardCheck, Sparkles, Network, RefreshCw, Shield, Database } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { toast } from '@/lib/notify'
import { TemplateRecommendations } from "@/components/templates/TemplateRecommendations"
import { TemplateAuditsPanel } from "@/components/templates/TemplateAuditsPanel"
import { TemplatePromptSuggestionsPanel } from "@/components/templates/TemplatePromptSuggestionsPanel"

interface Template {
  id: string
  name: string
  description: string
  framework: string
  category: string
  development_status: 'draft' | 'testing' | 'compliance' | 'validated' | 'production' | 'archived' | 'deprecated'
  validation_count: number
  success_count: number
  success_rate: number
  health_rating: string
  quality_threshold: number
  prompt_version: number
  last_validated_at: string | null
  compliance_checked_at?: string | null
  framework_compliance_score?: number | null
  archived_at?: string | null
  is_public: boolean
  usage_count: number
  created_by: string
  created_by_name: string
  created_at: string
  updated_at: string
  // Template entity profile fields (from template_entity_profile)
  avg_entity_counts?: Record<string, number> | null
  primary_knowledge_domain?: string | null
  secondary_knowledge_domains?: string[] | null
  primary_performance_domain?: string | null
  knowledge_domain_coverage?: Record<string, number> | null
  performance_domain_coverage?: Record<string, number> | null
}

interface TemplateUsage {
  id: string
  document_id: string
  document_name: string | null
  document_status: string | null
  project_id: string | null
  project_name: string | null
  user_name: string | null
  used_at: string
  quality_score: number | null
  success: boolean
  word_count: number | null
  generation_time_ms: number | null
  ai_provider: string | null
  ai_model: string | null
}

const statusConfig = {
  draft: {
    label: '⚪ Draft',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'Newly created, untested',
    icon: Edit,
    nextStatus: 'testing',
    restrictions: 'One document at a time only',
  },
  testing: {
    label: '🔵 Testing',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    description: 'Under validation',
    icon: Activity,
    nextStatus: 'compliance',
    restrictions: 'One document at a time only',
    requiresValidation: 3,
    requiresSuccess: 75,
  },
  compliance: {
    label: '🟣 Compliance Review',
    emoji: '🟣',
    color: 'bg-purple-100 text-purple-800 border-purple-300',
    description: 'Framework alignment verification',
    icon: ClipboardCheck,
    nextStatus: 'validated',
    restrictions: 'Framework compliance verification required',
    requiresValidation: 5,
    requiresSuccess: 80,
    requiresCompliance: true,
  },
  validated: {
    label: '🟡 Validated',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    description: 'Compliance approved',
    icon: CheckCircle,
    nextStatus: 'production',
    restrictions: 'Ready for broader use',
    requiresValidation: 10,
    requiresSuccess: 90,
  },
  production: {
    label: '🟢 Production',
    color: 'bg-green-100 text-green-800 border-green-300',
    description: 'Production-ready',
    icon: Award,
    nextStatus: null,
    restrictions: 'Batch generation allowed (up to 10)',
  },
  archived: {
    label: '📦 Archived',
    emoji: '📦',
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    description: 'Archived and inactive',
    icon: Archive,
    nextStatus: null,
    restrictions: 'No longer in active use',
  },
  deprecated: {
    label: '🔴 Deprecated',
    color: 'bg-red-100 text-red-800 border-red-300',
    description: 'No longer recommended',
    icon: AlertTriangle,
    nextStatus: null,
    restrictions: 'Not recommended for use',
  },
}

const healthConfig = {
  'Excellent': { color: 'text-green-600', icon: Award },
  'Good': { color: 'text-blue-600', icon: CheckCircle },
  'Fair': { color: 'text-yellow-600', icon: Target },
  'Needs Improvement': { color: 'text-red-600', icon: AlertTriangle },
  'Not tested yet': { color: 'text-gray-600', icon: Clock },
}

export default function TemplateDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, hasPermission } = useAuth()
  const templateId = params?.id as string
  
  const [template, setTemplate] = useState<Template | null>(null)
  const [recentUsage, setRecentUsage] = useState<TemplateUsage[]>([])
  const [versionHistory, setVersionHistory] = useState<any[]>([])
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [promoting, setPromoting] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [gkgData, setGkgData] = useState<{
    totalGeneratedDocuments: number
    totalDocuments: number
    unsyncedDocuments: number
    totalExtractedEntities: number
    totalUnits: number
    documents: { documentId: string; title: string; projectId: string; projectName: string; unitCount: number }[]
    entityTypeCounts: { entityType: string; count: number }[]
  } | null>(null)
  const [gkgLoading, setGkgLoading] = useState(false)
  const [gkgError, setGkgError] = useState<string | null>(null)

  useEffect(() => {
    if (templateId && templateId !== 'undefined') {
      fetchTemplate()
    }
  }, [templateId])

  const fetchGkgTemplate = async () => {
    if (!templateId || templateId === 'undefined') return
    setGkgLoading(true)
    setGkgError(null)
    try {
      const data = await apiClient.get<{
        status: string
        templateId: string
        totalGeneratedDocuments?: number
        totalDocuments: number
        unsyncedDocuments?: number
        totalExtractedEntities?: number
        totalUnits: number
        documents: { documentId: string; title: string; projectId: string; projectName: string; unitCount: number }[]
        entityTypeCounts: { entityType: string; count: number }[]
      }>(`/gkg/template/${templateId}`)
      setGkgData({
        totalGeneratedDocuments: data.totalGeneratedDocuments ?? data.totalDocuments,
        totalDocuments: data.totalDocuments,
        unsyncedDocuments: data.unsyncedDocuments ?? Math.max((data.totalGeneratedDocuments ?? data.totalDocuments) - data.totalDocuments, 0),
        totalExtractedEntities: data.totalExtractedEntities ?? data.totalUnits,
        totalUnits: data.totalUnits,
        documents: data.documents ?? [],
        entityTypeCounts: data.entityTypeCounts ?? [],
      })
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to load GKG data"
      setGkgError(msg)
      setGkgData(null)
    } finally {
      setGkgLoading(false)
    }
  }

  const fetchTemplate = async () => {
    if (!templateId || templateId === 'undefined') {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const response = await apiClient.request<any>(`/templates/${templateId}`, {
        method: 'GET',
      })
      
      if (response.template) {
        setTemplate(response.template)
      }
      
      if (response.recentUsage) {
        setRecentUsage(response.recentUsage)
      }
      
      if (response.versionHistory) {
        setVersionHistory(response.versionHistory)
      }
      
      if (response.optimizationHistory) {
        setOptimizationHistory(response.optimizationHistory)
      }
    } catch (error) {
      console.error('Failed to fetch template:', error)
      toast.error('Failed to load template')
    } finally {
      setLoading(false)
    }
  }

  const handlePromote = async () => {
    if (!template) return
    
    const config = statusConfig[template.development_status]
    if (!config.nextStatus) {
      toast.error('Template cannot be promoted from current status')
      return
    }

    try {
      setPromoting(true)
      
      const response = await apiClient.request(`/templates/${template.id}/promote`, {
        method: 'POST',
        body: JSON.stringify({
          reason: `Promotion to ${config.nextStatus}`,
        })
      })

      if (response.success) {
        toast.success(response.message || 'Template promoted successfully!')
        fetchTemplate() // Refresh to show new status
      } else {
        toast.error(response.message || 'Promotion failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to promote template')
    } finally {
      setPromoting(false)
    }
  }

  const handleArchive = async () => {
    if (!template) return
    
    const reason = prompt('Reason for archiving this template (optional):')
    
    try {
      setArchiving(true)
      
      const response = await apiClient.request(`/templates/${template.id}/archive`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason || 'Archived by user',
        })
      })

      if (response.success) {
        toast.success(response.message || 'Template archived successfully!')
        fetchTemplate() // Refresh to show archived status
      } else {
        toast.error(response.message || 'Archive failed')
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive template')
    } finally {
      setArchiving(false)
    }
  }

  const handleApproveCompliance = async () => {
    if (!template) return

    try {
      setPromoting(true)
      
      // Default compliance score of 95% (can be made configurable)
      const complianceScore = 95
      
      const response = await apiClient.request(`/templates/${template.id}/compliance/approve`, {
        method: 'POST',
        body: JSON.stringify({
          compliance_score: complianceScore,
          notes: `${template.framework} compliance approved by ${user?.name || 'reviewer'}. Generated documents follow framework structure, required sections are present and complete, terminology aligns with standards, and content quality meets expectations.`
        })
      })

      if (response.success) {
        toast.success(`${template.framework} compliance approved! Ready to promote to Validated.`)
        fetchTemplate() // Refresh to show compliance status
      } else {
        toast.error(response.message || 'Failed to approve compliance')
      }
    } catch (error) {
      console.error('Failed to approve compliance:', error)
      toast.error('Failed to approve compliance')
    } finally {
      setPromoting(false)
    }
  }

  const canPromote = (): boolean => {
    if (!template) return false
    
    const status = template.development_status
    const config = statusConfig[status]
    
    if (!config.nextStatus) return false
    if (status === 'draft') return true // Manual promotion
    if (status === 'archived') return false // Cannot promote from archived
    
    // Check validation requirements
    if (config.requiresValidation && template.validation_count < config.requiresValidation) return false
    if (config.requiresSuccess && successRate < config.requiresSuccess) return false
    
    // Check compliance requirement
    if (config.requiresCompliance && !template.compliance_checked_at) return false
    
    return true
  }

  const getPromotionMessage = (): string => {
    if (!template) return ''
    
    const status = template.development_status
    const config = statusConfig[status]
    
    if (!config.nextStatus) return 'Cannot promote further'
    if (status === 'draft') return 'Ready to promote to testing'
    
    if (config.requiresValidation && template.validation_count < config.requiresValidation) {
      const needed = config.requiresValidation - template.validation_count
      return `Need ${needed} more validation run${needed > 1 ? 's' : ''} (${template.validation_count}/${config.requiresValidation})`
    }
    
    if (config.requiresSuccess && template.success_rate < config.requiresSuccess) {
      return `Need ${config.requiresSuccess}%+ success rate (currently ${template.success_rate}%)`
    }
    
    return `Ready to promote to ${config.nextStatus}`
  }

  if (loading) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading template...</p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  if (!template) {
    return (
      <PageTransition>
        <div className="flex h-screen bg-background">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold mb-2">Template Not Found</h2>
                  <Button onClick={() => router.push('/templates')}>Back to Templates</Button>
                </div>
              </div>
            </main>
          </div>
        </div>
      </PageTransition>
    )
  }

  const currentConfig = statusConfig[template.development_status] || statusConfig.draft
  const healthInfo = healthConfig[template.health_rating] || healthConfig['Not tested yet']
  const HealthIcon = healthInfo.icon || Clock
  
  // Calculate success rate if not provided by backend
  const successRate = template.success_rate !== undefined && template.success_rate !== null
    ? Number(template.success_rate)
    : template.validation_count > 0
      ? Math.round((template.success_count / template.validation_count) * 100)
      : 0

  return (
    <PageTransition>
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="max-w-7xl mx-auto space-y-6">
                
                {/* Header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push('/templates')}
                        >
                          ← Back
                        </Button>
                      </div>
                      <h1 className="text-3xl font-bold flex items-center gap-3">
                        <FileText className="h-8 w-8 text-purple-500" />
                        {template.name}
                      </h1>
                      <p className="text-muted-foreground mt-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-3 mt-4">
                        <Badge variant="outline">{template.framework}</Badge>
                        <Badge variant="outline">{template.category}</Badge>
                        <Badge className={currentConfig.color}>
                          {currentConfig.label}
                        </Badge>
                        {template.is_public && <Badge variant="secondary">Public</Badge>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => router.push(`/templates/${template.id}/edit`)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      {template.development_status !== 'archived' && hasPermission('templates.update') && (
                        <Button 
                          variant="outline" 
                          onClick={handleArchive}
                          disabled={archiving}
                          className="border-orange-300 hover:bg-orange-50"
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          {archiving ? 'Archiving...' : 'Archive'}
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main Content */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Lifecycle Status */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="h-5 w-5" />
                          Development Lifecycle
                        </CardTitle>
                        <CardDescription>
                          Track template maturity and quality validation
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        
                        {/* Visual Lifecycle Timeline */}
                        <div className="relative">
                          <div className="flex items-center justify-between mb-8">
                            {(['draft', 'testing', 'compliance', 'validated', 'production'] as const).map((status, index) => {
                              const config = statusConfig[status]
                              const Icon = config.icon
                              const isActive = template.development_status === status
                              const lifecycleOrder = ['draft', 'testing', 'compliance', 'validated', 'production']
                              const currentIndex = lifecycleOrder.indexOf(template.development_status)
                              const isPast = currentIndex > index && template.development_status !== 'archived'
                              const isCurrent = isActive
                              
                              return (
                                <div key={status} className="flex-1 relative">
                                  <div className="flex flex-col items-center">
                                    {/* Circle indicator */}
                                    <div
                                      className={`
                                        w-12 h-12 rounded-full border-2 flex items-center justify-center mb-2 transition-all
                                        ${isCurrent ? config.color + ' ring-4 ring-offset-2 ring-offset-background' : ''}
                                        ${isPast ? 'bg-green-100 border-green-500' : ''}
                                        ${!isPast && !isCurrent ? 'bg-gray-100 border-gray-300' : ''}
                                      `}
                                    >
                                      <Icon className={`h-6 w-6 ${isCurrent || isPast ? '' : 'text-gray-400'}`} />
                                    </div>
                                    
                                    {/* Label */}
                                    <div className="text-center">
                                      <p className={`text-sm font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {config.label}
                                      </p>
                                      {isCurrent && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                          Current
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Connector line */}
                                  {index < 3 && (
                                    <div 
                                      className={`
                                        absolute top-6 left-1/2 h-0.5 w-full -z-10
                                        ${isPast ? 'bg-green-500' : 'bg-gray-300'}
                                      `}
                                    />
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Current Status Details */}
                        <div className="bg-muted rounded-lg p-4 space-y-3">
                          <div className="flex items-start gap-3">
                            <div className={`rounded-full p-2 ${currentConfig.color.replace('text-', 'bg-').replace('800', '500')}`}>
                              <currentConfig.icon className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{currentConfig.description}</h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                {currentConfig.restrictions}
                              </p>
                              
                              {/* Validation Progress */}
                              {template.development_status !== 'draft' && template.development_status !== 'deprecated' && (
                                <div className="space-y-2 mt-3">
                                  <div className="flex justify-between text-sm">
                                    <span>Validation Progress</span>
                                    <span className="font-medium">
                                      {template.validation_count} / {currentConfig.requiresValidation || template.validation_count || 0} runs
                                    </span>
                                  </div>
                                  <Progress 
                                    value={(template.validation_count / (currentConfig.requiresValidation || template.validation_count || 1)) * 100}
                                    className="h-2"
                                  />
                                  
                                  <div className="flex justify-between text-sm">
                                    <span>Success Rate</span>
                                    <span className="font-medium">
                                      {successRate}% / {currentConfig.requiresSuccess || 0}%
                                    </span>
                                  </div>
                                  <Progress 
                                    value={(successRate / (currentConfig.requiresSuccess || 100)) * 100}
                                    className="h-2"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Promotion Action */}
                        {currentConfig.nextStatus && template.development_status !== 'archived' && (
                          <div className="space-y-3 pt-4 border-t">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="font-medium mb-1">Next Stage: {statusConfig[currentConfig.nextStatus].label}</p>
                                <p className="text-sm text-muted-foreground">
                                  {getPromotionMessage()}
                                </p>
                              </div>
                              <Button
                                onClick={handlePromote}
                                disabled={!canPromote() || promoting}
                                className={canPromote() ? 'bg-green-600 hover:bg-green-700' : ''}
                              >
                                {promoting ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                    Promoting...
                                  </>
                                ) : (
                                  <>
                                    <ArrowUp className="h-4 w-4 mr-2" />
                                    Promote to {statusConfig[currentConfig.nextStatus].label}
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Archive Button - Available from any stage */}
                            <div className="flex items-center justify-between border-t pt-3">
                              <div className="flex-1">
                                <p className="font-medium mb-1 text-orange-700">Archive Template</p>
                                <p className="text-sm text-muted-foreground">
                                  Move to archive (can be done from any stage)
                                </p>
                              </div>
                              <Button
                                variant="outline"
                                onClick={handleArchive}
                                disabled={archiving}
                                className="border-orange-300 hover:bg-orange-50"
                              >
                                {archiving ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2" />
                                    Archiving...
                                  </>
                                ) : (
                                  <>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>
                    
                    {/* Compliance Review Panel (Only shown when in compliance stage) */}
                    {template.development_status === 'compliance' && (
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ClipboardCheck className="h-5 w-5 text-purple-600" />
                            Framework Compliance Review
                          </CardTitle>
                          <CardDescription>
                            Verify generated documents align with {template.framework} standards
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                            <h4 className="font-semibold mb-2">{template.framework} Compliance Checklist</h4>
                            <p className="text-sm text-muted-foreground mb-3">
                              Review generated documents to ensure they follow {template.framework} framework standards
                            </p>
                            
                            {/* Compliance status */}
                            {template.compliance_checked_at ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-green-700">
                                  <CheckCircle className="h-5 w-5" />
                                  <span className="font-medium">Compliance Approved</span>
                                </div>
                                <div className="text-sm space-y-1">
                                  <p>Score: {template.framework_compliance_score ? (template.framework_compliance_score * 100).toFixed(0) : 'N/A'}%</p>
                                  <p>Reviewed: {new Date(template.compliance_checked_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center gap-2 text-orange-700">
                                  <AlertTriangle className="h-5 w-5" />
                                  <span className="font-medium">Pending Review</span>
                                </div>
                                <p className="text-sm">
                                  Manual compliance review required before promotion to Validated stage
                                </p>
                                <div className="bg-white dark:bg-gray-900 rounded p-3">
                                  <p className="text-sm font-medium mb-2">Review Requirements:</p>
                                  <ul className="text-sm space-y-1 list-disc list-inside">
                                    <li>Generated documents follow {template.framework} structure</li>
                                    <li>Required sections are present and complete</li>
                                    <li>Terminology aligns with framework standards</li>
                                    <li>Content quality meets framework expectations</li>
                                  </ul>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  💡 Tip: Generate 3-5 sample documents with different prompts to verify consistency
                                </p>
                                
                                {/* Approve Compliance Button */}
                                <Button 
                                  onClick={() => handleApproveCompliance()}
                                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                  disabled={promoting}
                                >
                                  <ClipboardCheck className="h-4 w-4 mr-2" />
                                  Approve {template.framework} Compliance
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Template Details */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle>Template Details</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Tabs defaultValue="overview" onValueChange={(v) => v === "gkg" && !gkgData && !gkgLoading && !gkgError && fetchGkgTemplate()}>
                          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 xl:grid-cols-7">
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="content">Content</TabsTrigger>
                            <TabsTrigger value="variables">Purpose & Profile</TabsTrigger>
                            <TabsTrigger value="gkg">
                              <Network className="h-4 w-4 mr-1" />
                              GKG
                            </TabsTrigger>
                            <TabsTrigger value="recommendations">
                              <Sparkles className="h-4 w-4 mr-1" />
                              AI Review
                            </TabsTrigger>
                            <TabsTrigger value="audits">
                              <Shield className="h-4 w-4 mr-1" />
                              Audits
                            </TabsTrigger>
                            <TabsTrigger value="prompt-suggestions">
                              <Brain className="h-4 w-4 mr-1" />
                              Proposed
                            </TabsTrigger>
                          </TabsList>
                          
                          <TabsContent value="overview" className="space-y-4 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm text-muted-foreground">Framework</p>
                                <p className="font-medium">{template.framework}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Category</p>
                                <p className="font-medium">{template.category}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Created By</p>
                                <p className="font-medium">{template.created_by_name || 'Unknown'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Created</p>
                                <p className="font-medium">
                                  {new Date(template.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Last Updated</p>
                                <p className="font-medium">
                                  {new Date(template.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm text-muted-foreground">Prompt Version</p>
                                <p className="font-medium">v{template.prompt_version}</p>
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="content" className="mt-4 space-y-4">
                            {/* System Prompt (Main AI Guidance) */}
                            {(template as any).system_prompt && (
                              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <Brain className="h-5 w-5 text-blue-600" />
                                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                                    AI System Prompt
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    Main AI Guidance
                                  </Badge>
                                </div>
                                <div className="bg-white dark:bg-gray-900 rounded p-3 max-h-64 overflow-y-auto">
                                  <p className="text-sm whitespace-pre-wrap">
                                    {(template as any).system_prompt}
                                  </p>
                                </div>
                                <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
                                  This prompt guides the AI on how to generate content with this template.
                                </p>
                              </div>
                            )}
                            
                            {/* Template Paragraphs/Sections */}
                            {(template as any).template_paragraphs && (template as any).template_paragraphs.length > 0 && (
                              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <FileText className="h-5 w-5 text-purple-600" />
                                  <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                                    Template Sections
                                  </h4>
                                  <Badge variant="outline" className="text-xs">
                                    {(template as any).template_paragraphs.length} sections
                                  </Badge>
                                </div>
                                <div className="space-y-2">
                                  {(template as any).template_paragraphs.map((section: any, idx: number) => (
                                    <div key={idx} className="bg-white dark:bg-gray-900 rounded p-3">
                                      <p className="font-medium text-sm">{section.section_name}</p>
                                      {section.description && (
                                        <p className="text-xs text-muted-foreground mt-1">{section.description}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Content Blocks (Legacy/Alternative Format) */}
                            <div className="bg-muted rounded-lg p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                  Content Blocks
                                </p>
                                {template.content?.blocks?.length === 0 && (
                                  <Badge variant="secondary" className="text-xs">Empty</Badge>
                                )}
                              </div>
                              <div className="bg-background rounded p-3 max-h-64 overflow-y-auto">
                                {template.content?.blocks && template.content.blocks.length > 0 ? (
                                  <pre className="text-xs">
                                    {JSON.stringify(template.content.blocks, null, 2)}
                                  </pre>
                                ) : (
                                  <p className="text-sm text-muted-foreground italic">
                                    No content blocks defined. This template uses system prompt for AI guidance.
                                  </p>
                                )}
                              </div>
                            </div>
                            
                            {/* Raw Content (Debug View) */}
                            <details className="bg-muted rounded-lg p-4">
                              <summary className="text-sm font-medium cursor-pointer hover:text-foreground">
                                📋 Prompt Structure (Debug View)
                              </summary>
                              <div className="bg-background rounded p-4 mt-3 space-y-4 max-h-[600px] overflow-y-auto">
                                {/* System Prompt Section */}
                                {((template as any).system_prompt || (template.content as any)?.system_prompt) && (
                                  <div className="border-l-4 border-blue-500 pl-4 py-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Brain className="h-4 w-4 text-blue-600" />
                                      <h5 className="font-semibold text-sm">System Prompt</h5>
                                      <Badge variant="outline" className="text-xs">AI Guidance</Badge>
                                    </div>
                                    <div className="bg-muted rounded p-3 mt-2">
                                      <pre className="text-xs whitespace-pre-wrap font-mono">
                                        {(template as any).system_prompt || (template.content as any)?.system_prompt}
                                      </pre>
                                    </div>
                                  </div>
                                )}

                                {/* Template Paragraphs/Sections */}
                                {((template as any).template_paragraphs || (template.content as any)?.template_paragraphs) && (
                                  <div className="border-l-4 border-purple-500 pl-4 py-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="h-4 w-4 text-purple-600" />
                                      <h5 className="font-semibold text-sm">Template Sections Structure</h5>
                                      <Badge variant="outline" className="text-xs">
                                        {((template as any).template_paragraphs || (template.content as any)?.template_paragraphs || []).length} sections
                                      </Badge>
                                    </div>
                                    <div className="space-y-3 mt-3">
                                      {((template as any).template_paragraphs || (template.content as any)?.template_paragraphs || []).map((section: any, idx: number) => (
                                        <div key={idx} className="bg-muted rounded p-3 border border-purple-200 dark:border-purple-800">
                                          <div className="flex items-start justify-between mb-2">
                                            <div>
                                              <p className="font-medium text-sm">
                                                {idx + 1}. {section.section_name || 'Unnamed Section'}
                                              </p>
                                              <div className="flex gap-2 mt-1">
                                                <Badge variant="secondary" className="text-xs">
                                                  {section.section_type || 'paragraph'}
                                                </Badge>
                                                {section.required !== false && (
                                                  <Badge variant="outline" className="text-xs">Required</Badge>
                                                )}
                                                {section.order && (
                                                  <Badge variant="outline" className="text-xs">Order: {section.order}</Badge>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                          {section.description && (
                                            <p className="text-xs text-muted-foreground mt-2 mb-2">
                                              <span className="font-medium">Description:</span> {section.description}
                                            </p>
                                          )}
                                          {section.prompt_guidance && (
                                            <div className="bg-background rounded p-2 mt-2">
                                              <p className="text-xs font-medium text-muted-foreground mb-1">AI Guidance:</p>
                                              <p className="text-xs whitespace-pre-wrap font-mono">{section.prompt_guidance}</p>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Content Structure */}
                                {template.content && (
                                  <div className="border-l-4 border-green-500 pl-4 py-2">
                                    <div className="flex items-center gap-2 mb-2">
                                      <FileText className="h-4 w-4 text-green-600" />
                                      <h5 className="font-semibold text-sm">Content Structure</h5>
                                    </div>
                                    <div className="space-y-3 mt-3">
                                      {/* Markdown Content */}
                                      {(template.content as any)?.markdown && (
                                        <div className="bg-muted rounded p-3">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">Markdown Content:</p>
                                          <div className="bg-background rounded p-2 max-h-48 overflow-y-auto">
                                            <pre className="text-xs whitespace-pre-wrap font-mono">
                                              {(template.content as any).markdown}
                                            </pre>
                                          </div>
                                        </div>
                                      )}

                                      {/* Content Blocks */}
                                      {(template.content as any)?.blocks && Array.isArray((template.content as any).blocks) && (template.content as any).blocks.length > 0 && (
                                        <div className="bg-muted rounded p-3">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">
                                            Content Blocks ({((template.content as any).blocks || []).length}):
                                          </p>
                                          <div className="space-y-2">
                                            {((template.content as any).blocks || []).map((block: any, idx: number) => (
                                              <div key={idx} className="bg-background rounded p-2 border border-green-200 dark:border-green-800">
                                                <p className="text-xs font-medium mb-1">
                                                  Block {idx + 1}: {block.type || 'unknown'}
                                                </p>
                                                <pre className="text-xs whitespace-pre-wrap font-mono">
                                                  {JSON.stringify(block, null, 2)}
                                                </pre>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Other Content Fields */}
                                      {Object.keys(template.content || {}).filter(key => 
                                        !['markdown', 'blocks', 'system_prompt', 'template_paragraphs'].includes(key)
                                      ).length > 0 && (
                                        <div className="bg-muted rounded p-3">
                                          <p className="text-xs font-medium text-muted-foreground mb-2">Other Fields:</p>
                                          <div className="bg-background rounded p-2">
                                            <pre className="text-xs font-mono">
                                              {JSON.stringify(
                                                Object.fromEntries(
                                                  Object.entries(template.content || {}).filter(([key]) => 
                                                    !['markdown', 'blocks', 'system_prompt', 'template_paragraphs'].includes(key)
                                                  )
                                                ),
                                                null,
                                                2
                                              )}
                                            </pre>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Full Raw JSON (Collapsed by default) */}
                                <details className="border-l-4 border-gray-400 pl-4 py-2">
                                  <summary className="text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                                    🔍 Full Raw JSON (Advanced)
                                  </summary>
                                  <div className="bg-muted rounded p-3 mt-2 max-h-64 overflow-y-auto">
                                    <pre className="text-xs font-mono">
                                      {JSON.stringify(template.content || {}, null, 2)}
                                    </pre>
                                  </div>
                                </details>
                              </div>
                            </details>
                          </TabsContent>
                          
                          <TabsContent value="variables" className="mt-4">
                            <div className="bg-muted rounded-lg p-4 space-y-6">
                              {/* Purpose summary */}
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-medium">Template Purpose & Entity Profile</p>
                                  <p className="text-xs text-muted-foreground">
                                    Inferred from entities produced by documents that use this template.
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  {template.primary_knowledge_domain && (
                                    <Badge variant="outline" className="text-xs">
                                      Primary Knowledge Domain: {template.primary_knowledge_domain}
                                    </Badge>
                                  )}
                                  {template.primary_performance_domain && (
                                    <Badge variant="outline" className="text-xs">
                                      Primary Performance Domain: {template.primary_performance_domain}
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Domain coverage */}
                              {(template.knowledge_domain_coverage || template.performance_domain_coverage) && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="bg-background rounded p-3 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                      Knowledge Domains (what this template manages)
                                    </p>
                                    {template.knowledge_domain_coverage &&
                                    Object.keys(template.knowledge_domain_coverage).length > 0 ? (
                                      Object.entries(template.knowledge_domain_coverage)
                                        .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
                                        .map(([domain, weight]) => {
                                          const pct = (Number(weight) || 0) * 100
                                          return (
                                            <div key={domain} className="flex items-center justify-between text-xs">
                                              <span className="truncate mr-2">{domain}</span>
                                              <span className="font-medium">{pct.toFixed(1)}%</span>
                                            </div>
                                          )
                                        })
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        No knowledge-domain coverage data yet.
                                      </p>
                                    )}
                                  </div>

                                  <div className="bg-background rounded p-3 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground mb-1">
                                      Performance Domains (outcomes this template supports)
                                    </p>
                                    {template.performance_domain_coverage &&
                                    Object.keys(template.performance_domain_coverage).length > 0 ? (
                                      Object.entries(template.performance_domain_coverage)
                                        .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
                                        .map(([domain, weight]) => {
                                          const pct = (Number(weight) || 0) * 100
                                          return (
                                            <div key={domain} className="flex items-center justify-between text-xs">
                                              <span className="truncate mr-2">{domain}</span>
                                              <span className="font-medium">{pct.toFixed(1)}%</span>
                                            </div>
                                          )
                                        })
                                    ) : (
                                      <p className="text-xs text-muted-foreground">
                                        No performance-domain coverage data yet.
                                      </p>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Entity production profile */}
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                    <Database className="h-3 w-3" />
                                    Entity Production Profile
                                  </p>
                                  {template.validation_count > 0 && (
                                    <span className="text-[10px] text-slate-400 italic">Averages calculated from {template.validation_count} runs</span>
                                  )}
                                </div>
                                
                                {template.avg_entity_counts && Object.keys(template.avg_entity_counts).length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {Object.entries(template.avg_entity_counts)
                                      .sort(([, a], [, b]) => (Number(b) || 0) - (Number(a) || 0))
                                      .map(([entityType, avgCount]) => (
                                        <div
                                          key={entityType}
                                          className="bg-background rounded-lg p-3 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-sm"
                                        >
                                          <div className="min-w-0">
                                            <p className="font-bold text-sm capitalize">{entityType.replace(/_/g, ' ')}</p>
                                            <p className="text-[10px] text-muted-foreground truncate uppercase font-mono">
                                              ADPA-{entityType.substring(0, 3).toUpperCase()} Type
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-lg font-black text-primary">
                                              {(Number(avgCount) || 0).toFixed(1)}
                                            </span>
                                            <Badge variant="outline" className="text-[9px] bg-slate-50 dark:bg-slate-900 font-black">
                                              AVG/DOC
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-dashed rounded-xl p-8 text-center">
                                    <Database className="h-10 w-10 mx-auto text-slate-300 mb-3" />
                                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                                      No entity production data available yet. Generate documents with this template to build its PMBOK 8 footprint.
                                    </p>
                                    {user?.role === 'admin' || user?.role === 'super_admin' ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="mt-4"
                                        onClick={async () => {
                                          try {
                                            toast.info('Rebuilding template analytics...')
                                            const response = await apiClient.request(`/template-analytics/analytics/rebuild-template/${template.id}`, {
                                              method: 'POST'
                                            })
                                            await fetchTemplate()
                                            toast.success(response.message || 'Template analytics rebuilt successfully!')
                                          } catch (error: any) {
                                            console.error('Failed to rebuild template analytics:', error)
                                            toast.error(error?.message || 'Failed to rebuild template analytics')
                                          }
                                        }}
                                      >
                                        <Sparkles className="h-3.3 mr-2" />
                                        Force Rebuild Profile
                                      </Button>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TabsContent>
                          
                          <TabsContent value="gkg" className="mt-4 space-y-4">
                            <p className="text-sm text-muted-foreground">
                              Documents generated by this template and entities (semantic units) synchronized within the Governance Knowledge Graph. Run a GKG sync for projects that use this template to populate the graph baseline.
                            </p>
                            {gkgLoading && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Loading GKG data…
                              </div>
                            )}
                            {gkgError && (
                              <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>GKG unavailable</AlertTitle>
                                <AlertDescription>{gkgError}</AlertDescription>
                              </Alert>
                            )}
                            {!gkgLoading && !gkgError && gkgData && (
                              <>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                                  <div className="rounded-lg border bg-muted/50 p-4 shadow-sm">
                                    <p className="text-2xl font-bold">{gkgData.totalGeneratedDocuments}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Documents Generated</p>
                                  </div>
                                  <div className="rounded-lg border bg-muted/50 p-4 shadow-sm">
                                    <p className="text-2xl font-bold">{gkgData.totalDocuments}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Documents in Graph</p>
                                    {gkgData.unsyncedDocuments > 0 && (
                                      <p className="mt-1 text-[10px] text-amber-600 font-medium italic">
                                        {gkgData.unsyncedDocuments} pending sync
                                      </p>
                                    )}
                                  </div>
                                  <div className="rounded-lg border bg-muted/50 p-4 shadow-sm">
                                    <p className="text-2xl font-bold">{gkgData.totalExtractedEntities}</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">Entities Extracted</p>
                                  </div>
                                  <div className="rounded-lg border bg-primary/5 p-4 shadow-sm border-primary/20">
                                    <p className="text-2xl font-bold text-primary">{gkgData.totalUnits}</p>
                                    <p className="text-[10px] font-bold text-primary/70 uppercase tracking-wider mt-1">Entities in Graph</p>
                                  </div>
                                </div>
                                {gkgData.documents.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                                      <FileText className="h-4 w-4 text-blue-500" />
                                      Knowledge Graph Documents
                                    </h4>
                                    <ul className="space-y-2">
                                      {gkgData.documents.map((doc) => (
                                        <li key={doc.documentId} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border rounded-lg shadow-sm hover:border-primary/30 transition-colors">
                                          <div className="min-w-0">
                                            <a
                                              href={doc.projectId ? `/projects/${doc.projectId}/documents/${doc.documentId}` : "#"}
                                              className="font-bold text-sm text-primary hover:underline truncate block"
                                            >
                                              {doc.title || doc.documentId}
                                            </a>
                                            {doc.projectName && (
                                              <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{doc.projectName}</p>
                                            )}
                                          </div>
                                          <Badge variant="secondary" className="font-mono text-[10px]">{doc.unitCount} units</Badge>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {gkgData.entityTypeCounts.length > 0 && (
                                  <div>
                                    <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                                      <Network className="h-4 w-4 text-purple-500" />
                                      Semantic Entity Taxonomy
                                    </h4>
                                    <div className="flex flex-wrap gap-2">
                                      {gkgData.entityTypeCounts.map((e) => (
                                        <Badge key={e.entityType} variant="outline" className="bg-slate-50 dark:bg-slate-800 text-[10px] font-bold px-2 py-1">
                                          {e.entityType}: {e.count}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {gkgData.totalDocuments === 0 && (
                                  <div className="py-10 text-center rounded-lg border-2 border-dashed">
                                    <Info className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                                    <p className="text-sm text-muted-foreground">
                                      No documents linked to this template in the graph yet.
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">Sync projects that have generated documents with this template to populate the GKG.</p>
                                  </div>
                                )}
                              </>
                            )}
                            {!gkgLoading && !gkgError && !gkgData && (
                              <p className="text-sm text-muted-foreground">Select the GKG tab to load data.</p>
                            )}
                          </TabsContent>
                          <TabsContent value="recommendations" className="mt-4">
                            <TemplateRecommendations templateId={template.id} />
                          </TabsContent>
                          <TabsContent value="audits" className="mt-4">
                            <TemplateAuditsPanel templateId={template.id} />
                          </TabsContent>
                          <TabsContent value="prompt-suggestions" className="mt-4">
                            <TemplatePromptSuggestionsPanel templateId={template.id} />
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </AnimatedCard>

                    {/* Usage Analytics */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <BarChart3 className="h-5 w-5" />
                          Usage Analytics
                        </CardTitle>
                        <CardDescription>
                          Template usage patterns and performance metrics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-3xl font-bold text-blue-700 dark:text-blue-300">{template.validation_count}</p>
                            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Generations</p>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 rounded-lg border border-green-200 dark:border-green-800">
                            <p className="text-3xl font-bold text-green-700 dark:text-green-300">{successRate}%</p>
                            <p className="text-sm text-green-600 dark:text-green-400 mt-1">Success Rate</p>
                          </div>
                          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-3xl font-bold text-purple-700 dark:text-purple-300">{template.health_rating || 'Not tested'}</p>
                            <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">Health Rating</p>
                          </div>
                        </div>
                        
                        {template.validation_count > 0 ? (
                          <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Total Successful</span>
                              <span className="font-semibold text-green-600">{template.success_count} / {template.validation_count}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Quality Threshold</span>
                              <span className="font-semibold">{(template.quality_threshold * 100).toFixed(0)}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Current Version</span>
                              <span className="font-semibold">v{template.prompt_version}</span>
                            </div>
                            {template.last_validated_at && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last Generation</span>
                                <span className="font-semibold">{new Date(template.last_validated_at).toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="mt-4 p-6 bg-muted rounded-lg text-center">
                            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                            <p className="text-sm text-muted-foreground">
                              Generate documents to see usage analytics
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </AnimatedCard>
                  </div>

                  {/* Sidebar */}
                  <div className="space-y-6">
                    
                    {/* Health Status */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <HealthIcon className={`h-5 w-5 ${healthConfig[template.health_rating]?.color}`} />
                          Health Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className={`text-4xl font-bold mb-2 ${healthConfig[template.health_rating]?.color}`}>
                              {template.health_rating}
                            </div>
                            {template.validation_count > 0 && (
                              <p className="text-sm text-muted-foreground">
                                Based on {template.validation_count} validation run{template.validation_count > 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-muted-foreground">Success Rate</span>
                              <span className="text-lg font-semibold">{template.success_rate}%</span>
                            </div>
                            <Progress value={template.success_rate} className="h-2" />
                            
                            <div className="text-xs text-muted-foreground">
                              {template.success_count} successful out of {template.validation_count} total runs
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Quality Threshold</span>
                              <span className="font-medium">{(template.quality_threshold * 100).toFixed(0)}%</span>
                            </div>
                            {template.last_validated_at && (
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Last Validated</span>
                                <span className="font-medium">
                                  {new Date(template.last_validated_at).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* Quick Stats */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5" />
                          Quick Stats
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Document Generations</span>
                          </div>
                          <span className="font-bold">{template.usage_count}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Successful</span>
                          </div>
                          <span className="font-bold text-emerald-600">{template.success_count}</span>
                        </div>
                        
                        <div className="flex items-center justify-between border-t pt-2 mt-2">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Success Rate</span>
                          </div>
                          <span className="font-black text-primary">{successRate}%</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Visibility</span>
                          </div>
                          <Badge variant={template.is_public ? "default" : "secondary"} className="text-[10px] uppercase font-bold">
                            {template.is_public ? 'Public' : 'Private'}
                          </Badge>
                        </div>
                      </CardContent>
                    </AnimatedCard>

                    {/* Promotion Guidance */}
                    {currentConfig.nextStatus && (
                      <AnimatedCard>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <ArrowUp className="h-5 w-5" />
                            Promotion Guidance
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {canPromote() ? (
                            <Alert>
                              <CheckCircle className="h-4 w-4" />
                              <AlertTitle>Ready to Promote!</AlertTitle>
                              <AlertDescription>
                                This template meets all criteria for {statusConfig[currentConfig.nextStatus].label} status.
                              </AlertDescription>
                            </Alert>
                          ) : (
                            <Alert variant="destructive">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertTitle>Requirements Not Met</AlertTitle>
                              <AlertDescription className="space-y-2 mt-2">
                                <p>{getPromotionMessage()}</p>
                                
                                {currentConfig.requiresValidation && (
                                  <div className="mt-3">
                                    <p className="font-medium text-sm">To promote to {currentConfig.nextStatus}:</p>
                                    <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                                      <li>Run {currentConfig.requiresValidation}+ validation tests</li>
                                      <li>Achieve {currentConfig.requiresSuccess}%+ success rate</li>
                                    </ul>
                                  </div>
                                )}
                              </AlertDescription>
                            </Alert>
                          )}
                        </CardContent>
                      </AnimatedCard>
                    )}

                    {/* Recent Activity */}
                    <AnimatedCard>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Calendar className="h-5 w-5" />
                          Recent Activity
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* Template Optimizations & Versions */}
                          {optimizationHistory.length > 0 && optimizationHistory.map((opt) => (
                            <div 
                              key={opt.id}
                              className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800"
                            >
                              <div className="bg-purple-500 rounded-full p-2 mt-1">
                                <Zap className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">Template Optimized</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {opt.implemented_at 
                                    ? new Date(opt.implemented_at).toLocaleString()
                                    : new Date(opt.created_at).toLocaleString()}
                                </p>
                                {opt.implemented_by_name && (
                                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                    Applied by {opt.implemented_by_name}
                                  </p>
                                )}
                                {opt.expected_quality_gain && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    +{opt.expected_quality_gain}% Expected Quality Gain
                                  </p>
                                )}
                                {opt.current_avg_quality && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Quality: {opt.current_avg_quality}%
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}

                          {versionHistory.length > 0 && versionHistory.map((version) => (
                            <div 
                              key={version.id}
                              className={`flex items-start gap-3 p-3 rounded-lg border ${
                                version.is_optimization
                                  ? 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800'
                                  : 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800'
                              }`}
                            >
                              <div className={`rounded-full p-2 mt-1 ${
                                version.is_optimization
                                  ? 'bg-purple-500'
                                  : 'bg-blue-500'
                              }`}>
                                {version.is_optimization ? (
                                  <Zap className="h-4 w-4 text-white" />
                                ) : (
                                  <FileText className="h-4 w-4 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">
                                  {version.is_optimization ? 'Template Optimized' : 'Template Amended'} - v{version.version_number}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(version.created_at).toLocaleString()}
                                </p>
                                {version.created_by_name && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    By {version.created_by_name}
                                  </p>
                                )}
                                {version.change_summary && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {version.change_summary}
                                  </p>
                                )}
                                {version.expected_quality_gain && (
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                    +{version.expected_quality_gain}% Expected Quality Gain
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}

                          {/* Template Usage Entries */}
                          {recentUsage.length > 0 && recentUsage.map((usage) => (
                            <div 
                              key={usage.id}
                              className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900 transition-colors cursor-pointer"
                              onClick={() => {
                                if (usage.document_id && usage.project_id) {
                                  router.push(`/projects/${usage.project_id}/documents/${usage.document_id}`)
                                }
                              }}
                            >
                              <div className="bg-green-500 rounded-full p-2 mt-1">
                                <FileText className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">
                                      Template Used
                                    </p>
                                    {usage.document_name && (
                                      <p className="text-xs text-muted-foreground truncate mt-1">
                                        Document: {usage.document_name}
                                      </p>
                                    )}
                                    {usage.project_name && (
                                      <p className="text-xs text-muted-foreground truncate">
                                        Project: {usage.project_name}
                                      </p>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(usage.used_at).toLocaleString()}
                                    </p>
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                      {usage.quality_score !== null && (
                                        <span className={`text-xs px-2 py-1 rounded ${
                                          usage.success 
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                                        }`}>
                                          Quality: {usage.quality_score}%
                                        </span>
                                      )}
                                      {usage.success ? (
                                        <span className="text-xs text-green-600 dark:text-green-400">✓ Success</span>
                                      ) : (
                                        <span className="text-xs text-red-600 dark:text-red-400">✗ Failed</span>
                                      )}
                                      {usage.word_count && (
                                        <span className="text-xs text-muted-foreground">
                                          {usage.word_count.toLocaleString()} words
                                        </span>
                                      )}
                                    </div>
                                    {usage.document_id && (
                                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 flex items-center gap-1">
                                        <Eye className="h-3 w-3" />
                                        Click to view document details
                                      </p>
                                    )}
                                  </div>
                                  {usage.document_id && (
                                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Last Validation */}
                          {template.last_validated_at && (
                            <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                              <div className="bg-blue-500 rounded-full p-2 mt-1">
                                <CheckCircle className="h-4 w-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-sm">Latest Validation</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(template.last_validated_at).toLocaleString()}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                  ✓ Success • Quality: {template.health_rating}
                                </p>
                              </div>
                            </div>
                          )}
                          
                          {/* Status Change */}
                          <div className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="bg-purple-500 rounded-full p-2 mt-1">
                              <ArrowUp className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">Status: {statusConfig[template.development_status]?.emoji} {statusConfig[template.development_status]?.label}</p>
                              <p className="text-xs text-muted-foreground">
                                Updated: {new Date(template.updated_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                {currentConfig.description}
                              </p>
                            </div>
                          </div>
                          
                          {/* Template Created */}
                          <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800">
                            <div className="bg-gray-500 rounded-full p-2 mt-1">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold text-sm">Template Created</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(template.created_at).toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                By {template.created_by_name || 'Unknown'}
                              </p>
                            </div>
                          </div>

                          {/* Empty State */}
                          {recentUsage.length === 0 && 
                           versionHistory.length === 0 && 
                           optimizationHistory.length === 0 &&
                           template.validation_count === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p className="text-sm">No activity yet</p>
                              <p className="text-xs mt-1">Generate documents or apply optimizations to see activity</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </AnimatedCard>
                  </div>
                </div>
              </div>
            </AnimatedLayout>
          </main>
        </div>
      </div>
    </PageTransition>
  )
}

