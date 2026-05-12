"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Database, FileText, Calendar, User, AlertTriangle } from "lucide-react"
import { apiClient } from "@/lib/api"
import { getProjectSourceDocumentPath } from "@/lib/documents/document-routes"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from '@/lib/notify'

interface ExtractedEntity {
  id: string
  entity_type: string
  entity_name: string
  entity_data: Record<string, any>
  extraction_confidence?: number
  extraction_method?: string
  ai_provider?: string
  ai_model?: string
  related_entity_ids?: string[]
  source_document_id?: string
  created_at?: string
  updated_at?: string
}

export default function EntityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { isAuthenticated } = useAuth()
  
  const projectId = params?.id as string
  const entityId = params?.entityId as string
  
  const [entity, setEntity] = useState<ExtractedEntity | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingVerification, setPendingVerification] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isAuthenticated) return
    loadEntity()
  }, [entityId, isAuthenticated])

  const loadEntity = async () => {
    try {
      setLoading(true)
      const response = await apiClient.request<{ success: boolean; data: ExtractedEntity }>(
        `/entities/${entityId}`
      )
      
      if (response.success && response.data) {
        setEntity(response.data)
      } else {
        toast.error('Entity not found')
        router.push(`/projects/${projectId}`)
      }
    } catch (error: any) {
      console.error('Failed to load entity:', error)
      toast.error(error.message || 'Failed to load entity')
      router.push(`/projects/${projectId}`)
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (verified: boolean) => {
    if (!entity) return

    const confidence = entity.extraction_confidence || 50
    
    // Check if confirmation is required for low confidence verification
    if (verified && confidence < 50) {
      setPendingVerification(verified)
      setShowConfirmDialog(true)
      return
    }

    // Proceed with verification
    await performVerification(verified)
  }

  const performVerification = async (verified: boolean) => {
    try {
      setVerifying(true)
      const response = await apiClient.request<{ success: boolean; error?: string; requiresConfirmation?: boolean }>(
        `/entities/${entityId}/verify`,
        {
          method: 'POST',
          body: JSON.stringify({ 
            verified,
            confirmed: true // Always confirm when called from dialog
          })
        }
      )
      
      if (response.error === 'CONFIRMATION_REQUIRED') {
        setPendingVerification(verified)
        setShowConfirmDialog(true)
        return
      }
      
      toast.success(`Entity ${verified ? 'verified' : 'unverified'}`)
      await loadEntity()
    } catch (error: any) {
      if (error.message?.includes('CONFIRMATION_REQUIRED')) {
        setPendingVerification(verified)
        setShowConfirmDialog(true)
      } else {
        toast.error(error.message || 'Failed to verify entity')
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleConfirmVerification = async () => {
    if (pendingVerification !== null) {
      await performVerification(pendingVerification)
      setShowConfirmDialog(false)
      setPendingVerification(null)
    }
  }

  const getEntityTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      stakeholder: 'Stakeholder',
      deliverable: 'Deliverable',
      milestone: 'Milestone',
      risk: 'Risk',
      requirement: 'Requirement',
      activity: 'Activity',
      assumption: 'Assumption',
      constraint: 'Constraint',
      dependency: 'Dependency',
      resource: 'Resource'
    }
    return labels[type] || type.charAt(0).toUpperCase() + type.slice(1)
  }

  const getEntityTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      stakeholder: 'bg-blue-100 text-blue-800',
      deliverable: 'bg-green-100 text-green-800',
      milestone: 'bg-purple-100 text-purple-800',
      risk: 'bg-red-100 text-red-800',
      requirement: 'bg-yellow-100 text-yellow-800',
      activity: 'bg-indigo-100 text-indigo-800',
      assumption: 'bg-orange-100 text-orange-800',
      constraint: 'bg-pink-100 text-pink-800',
      dependency: 'bg-cyan-100 text-cyan-800',
      resource: 'bg-teal-100 text-teal-800'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!entity) {
    return (
      <div className="h-screen bg-background flex overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Entity Not Found</h2>
                <p className="text-muted-foreground mb-4">The entity you're looking for doesn't exist or has been deleted.</p>
                <Button onClick={() => router.push(`/projects/${projectId}`)}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Project
                </Button>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <PageTransition>
            <div className="max-w-5xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/projects/${projectId}`)}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Project
                      </Button>
                    </div>
                    <h1 className="text-3xl font-bold">{entity.entity_name}</h1>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={getEntityTypeColor(entity.entity_type)}>
                        {getEntityTypeLabel(entity.entity_type)}
                      </Badge>
                      {entity.extraction_confidence && (
                        <Badge variant="outline">
                          Confidence: {entity.extraction_confidence}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleVerify(true)}
                      disabled={verifying}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/entities?projectId=${projectId}`)}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      View All Entities
                    </Button>
                  </div>
                </div>
              </motion.div>

              <AnimatedLayout>
                <AnimatedCard>
                  <CardHeader>
                    <CardTitle>Entity Details</CardTitle>
                    <CardDescription>Complete information about this extracted entity</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Entity Data */}
                    <div>
                      <h3 className="text-lg font-semibold mb-3">Entity Information</h3>
                      <div className="bg-muted p-4 rounded-lg">
                        <pre className="text-sm overflow-x-auto">
                          {JSON.stringify(entity.entity_data, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-1">Extraction Method</h4>
                        <p className="text-sm">{entity.extraction_method || 'N/A'}</p>
                      </div>
                      {entity.ai_provider && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">AI Provider</h4>
                          <p className="text-sm">{entity.ai_provider} {entity.ai_model && `(${entity.ai_model})`}</p>
                        </div>
                      )}
                      {entity.source_document_id && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Source Document</h4>
                          <Button
                            variant="link"
                            className="p-0 h-auto"
                            onClick={() => router.push(getProjectSourceDocumentPath(projectId, entity.source_document_id))}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View Document
                          </Button>
                        </div>
                      )}
                      {entity.created_at && (
                        <div>
                          <h4 className="text-sm font-medium text-muted-foreground mb-1">Created</h4>
                          <p className="text-sm">{new Date(entity.created_at).toLocaleString()}</p>
                        </div>
                      )}
                    </div>

                    {/* Related Entities */}
                    {entity.related_entity_ids && entity.related_entity_ids.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-3">Related Entities</h3>
                        <div className="space-y-2">
                          {entity.related_entity_ids.map((relatedId) => (
                            <Button
                              key={relatedId}
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/projects/${projectId}/entities/${relatedId}`)}
                            >
                              <Database className="h-4 w-4 mr-2" />
                              {relatedId.substring(0, 8)}...
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </AnimatedCard>
              </AnimatedLayout>
            </div>
          </PageTransition>
        </main>
      </div>

      {/* Confirmation Dialog for Low Confidence Verification */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Low Confidence Entity
            </DialogTitle>
            <DialogDescription>
              This entity has a low confidence score ({entity?.extraction_confidence || 0}%). 
              Are you sure you want to verify it?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Low confidence entities may contain inaccurate or incomplete information. 
              Please review the entity data carefully before verifying.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false)
                setPendingVerification(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleConfirmVerification}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Yes, Verify Anyway
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

