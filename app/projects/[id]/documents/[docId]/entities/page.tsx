"use client"

import { useState, useEffect } from "react"
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
} from "@/components/ui/icons-shim"
import { useAuth } from "@/contexts/AuthContext"
import { getApiUrl } from "@/lib/api-url"
import { toast } from "sonner"

interface EntityCounts {
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
  deliverables: number
  scopeItems: number
  activities: number
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
}

interface EntityData {
  [key: string]: any[]
}

const entityTypes = [
  // Legacy entities (PMBOK 7)
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

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/auth/login")
      return
    }
    void fetchDocumentEntities()
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

    // Special handling for source_document_id - show clickable link
    if (key === 'source_document_id' && value) {
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}/documents/${value}`)}
            className="flex items-center gap-1"
          >
            <FileText className="h-4 w-4" />
            View Source Document
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
        <Header />
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
                  <p className="text-sm text-muted-foreground">
                    Run AI extraction from the project's Extraction tab to extract entities from this document.
                  </p>
                </CardContent>
              </AnimatedCard>
            ) : (
              <div className="space-y-6">
                {/* Summary Card */}
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Extraction Summary
                    </CardTitle>
                    <CardDescription>
                      Total entities extracted from this document
                    </CardDescription>
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

