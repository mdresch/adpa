"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Edit,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Download,
  Eye,
  MoreHorizontal,
  Trash2,
  Loader2,
  Zap,
  Wand2,
} from "lucide-react"
import { AnimatedGrid, AnimatedGridItem, AnimatedLayout } from "@/components/animated-layout"
import { Document, apiClient, Project } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { GenerateDocumentModal } from "../../components/dialogs/GenerateDocumentModal"

interface DocumentStats {
  totalDocuments: number
  counts: {
    draft: number
    published: number
    review: number
    archived: number
  }
}

interface DocumentsPagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface ActiveJobInfo {
  jobId: string
  documentId: string | null
  documentName: string | null
  status: string
  progress: number
  type: string
}

interface DocumentsTabProps {
  projectId: string
  documentStats: DocumentStats
  searchTerm: string
  setSearchTerm: (term: string) => void
  documentsLoading: boolean
  displayDocuments: Document[]
  handleEditDocument: (id: string) => void
  handleDownloadDocument: (id: string) => void
  handleDeleteDocument: (id: string) => void
  documentsPagination: DocumentsPagination
  handlePageChange: (page: number) => void
  project?: Project
}

const getStatusIcon = (status: string, isProcessing?: boolean) => {
  if (isProcessing) {
    return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
  }
  switch (status) {
    case "completed":
    case "published":
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case "in-progress":
      return <Clock className="h-4 w-4 text-blue-500" />
    case "draft":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case "failed":
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <FileText className="h-4 w-4 text-muted-foreground" />
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
    case "published":
      return "default"
    case "in-progress":
      return "secondary"
    case "draft":
      return "outline"
    case "failed":
      return "destructive"
    default:
      return "secondary"
  }
}

function useActiveGenerationJobs(projectId: string) {
  const [activeJobs, setActiveJobs] = useState<ActiveJobInfo[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchActiveJobs = async () => {
    try {
      const [processingData, pendingData] = await Promise.all([
        apiClient.request('/jobs?status=processing&limit=50') as Promise<any>,
        apiClient.request('/jobs?status=pending&limit=50') as Promise<any>,
      ])

      const allJobs = [
        ...(processingData?.jobs || []),
        ...(pendingData?.jobs || []),
      ]

      const jobs: ActiveJobInfo[] = allJobs
        .filter((j: any) => ['ai-generate', 'document-regeneration'].includes(j.type))
        .map((j: any) => ({
          jobId: j.id,
          documentId: j.metadata?.document_id || null,
          documentName: j.documentName || j.metadata?.document_name || null,
          status: j.status,
          progress: j.progress || 0,
          type: j.type,
        }))

      setActiveJobs(jobs)
    } catch {
      // silent pass
    }
  }

  useEffect(() => {
    fetchActiveJobs()
    intervalRef.current = setInterval(fetchActiveJobs, 8000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [projectId])

  return activeJobs
}

export function DocumentsTab({
  projectId,
  documentStats,
  searchTerm,
  setSearchTerm,
  documentsLoading,
  displayDocuments,
  handleEditDocument,
  handleDownloadDocument,
  handleDeleteDocument,
  documentsPagination,
  handlePageChange,
  project,
}: DocumentsTabProps) {
  const activeJobs = useActiveGenerationJobs(projectId)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [aiProviders, setAiProviders] = useState<any[]>([])
  const { user } = useAuth()

  // 🚀 RESTORED: Auto-fetch active hardware orchestration models on view mount
  useEffect(() => {
    const fetchEcosystemProviders = async () => {
      try {
        const providers: any = await apiClient.request('/ai-providers')
        
        // Normalize array string types smoothly to match configuration expectations
        // Filter out inactive providers from the array so they don't appear in the dropdown
        const mapped = (providers || [])
          .filter((p: any) => p.is_active === true || p.isActive === true || p.active === true || p.status === 'active')
          .map((p: any) => {
          let modelsArray: any[] = []
          const sourceModels = p.configuration?.models || p.models;
          if (Array.isArray(sourceModels)) modelsArray = sourceModels
          else if (typeof sourceModels === 'string') {
            try { modelsArray = JSON.parse(sourceModels) } catch { modelsArray = sourceModels.split(',').map((s: string) => s.trim()) }
          }
          
          let stringModels = modelsArray.map(m => typeof m === 'object' && m !== null ? (m.id || m.name || JSON.stringify(m)) : String(m));
          const defaultModel = p.configuration?.default_model || p.model || stringModels[0] || "";
          
          if (stringModels.length === 0 && defaultModel) {
            stringModels = [defaultModel];
          }

          return { ...p, models: stringModels, default_model: defaultModel }
        })
        
        setAiProviders(mapped)
      } catch (err) {
        console.error("Failed to load automation engine settings:", err)
      }
    }
    fetchEcosystemProviders()
  }, [])

  const resolveUpdatedBy = (updatedBy: string | null | undefined, updatedByName?: string | null): string => {
    if (updatedByName && updatedByName.trim() !== '') return updatedByName
    if (!updatedBy) return '—'
    if (user?.id && updatedBy === user.id) {
      return user.name || user.email || 'You'
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(updatedBy)) {
      return `User ${updatedBy.slice(0, 8)}…`
    }
    return updatedBy
  }

  const getActiveJob = (docId: string, docName: string): ActiveJobInfo | undefined =>
    activeJobs.find(j =>
      (j.documentId && j.documentId === docId) ||
      (j.documentName && j.documentName.toLowerCase() === docName.toLowerCase())
    )

  return (
    <div className="space-y-4">
      {/* Document Stats Grid */}
      <AnimatedGrid className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnimatedGridItem>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Documents</p>
                  <p className="text-2xl font-bold">{documentStats.totalDocuments}</p>
                </div>
                <FileText className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </AnimatedGridItem>
        <AnimatedGridItem>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Draft</p>
                  <p className="text-2xl font-bold">{documentStats.counts.draft}</p>
                </div>
                <Edit className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </AnimatedGridItem>
        <AnimatedGridItem>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Published</p>
                  <p className="text-2xl font-bold">{documentStats.counts.published}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>
        </AnimatedGridItem>
        <AnimatedGridItem>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">In Review</p>
                  <p className="text-2xl font-bold">{documentStats.counts.review}</p>
                </div>
                <Clock className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </AnimatedGridItem>
      </AnimatedGrid>

      {/* Active Job Banner Feed */}
      {activeJobs.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40 px-4 py-2.5 text-sm text-blue-800 dark:text-blue-200">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-blue-500" />
          <span className="font-medium">
            {activeJobs.length === 1
              ? "1 document is currently being generated by AI"
              : `${activeJobs.length} documents are currently being generated by AI`}
          </span>
          <span className="text-blue-500 dark:text-blue-400">— this page refreshes automatically</span>
        </div>
      )}

      {/* Control Actions Bar */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="default" className="shrink-0" onClick={() => setIsGenerateModalOpen(true)}>
          <Wand2 className="h-4 w-4 mr-2" />
          Generate Document
        </Button>
      </div>

      {/* List Layout Rendering Branch */}
      {documentsLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm font-medium text-slate-500">Loading documents...</span>
        </div>
      ) : (
        <AnimatedLayout className="space-y-2">
          {activeJobs.map((job) => {
            const hasPersistedDoc = displayDocuments.some(
              doc => (job.documentId && doc.id === job.documentId) ||
                     (job.documentName && doc.name.toLowerCase() === job.documentName.toLowerCase())
            )
            if (hasPersistedDoc) return null

            return (
              <Card
                key={job.jobId}
                className="border-blue-200 dark:border-blue-800 bg-blue-50/10 hover:shadow-sm transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <Loader2 className="h-4 w-4 text-blue-500 animate-spin shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="font-semibold text-muted-foreground italic truncate">
                            {job.documentName || "Generating document..."}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 animate-pulse">
                            <Zap className="h-3 w-3" />
                            Generating… {job.progress > 0 ? `${job.progress}%` : ""}
                          </span>
                        </div>
                        <div className="mt-2 w-full max-w-xs">
                          <Progress value={job.progress} className="h-1.5" />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          AI is drafting this document. Page refreshes automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {displayDocuments.map((doc) => {
            const activeJob = getActiveJob(doc.id, doc.name)
            const isProcessing = !!activeJob

            return (
              <Card
                key={doc.id}
                className={`hover:shadow-sm transition-shadow ${isProcessing ? "border-blue-200 dark:border-blue-800" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      {getStatusIcon(doc.status, isProcessing)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <Link
                            href={`/projects/${projectId}/documents/${doc.id}`}
                            className="font-semibold hover:text-primary transition-colors truncate"
                          >
                            {doc.name}
                          </Link>

                          {isProcessing ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 border border-blue-300 dark:border-blue-700 animate-pulse">
                              <Zap className="h-3 w-3" />
                              Generating… {activeJob.progress > 0 ? `${activeJob.progress}%` : ""}
                            </span>
                          ) : (
                            <Badge variant={getStatusColor(doc.status)} className="text-xs">
                              {doc.status}
                            </Badge>
                          )}
                        </div>

                        {isProcessing && activeJob.progress > 0 && (
                          <div className="mt-1.5 w-full max-w-xs">
                            <Progress value={activeJob.progress} className="h-1.5" />
                          </div>
                        )}

                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span>v{doc.version}</span>
                          <span>•</span>
                          <span>Modified {new Date(doc.updated_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>by {resolveUpdatedBy(doc.updated_by, doc.updated_by_name)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      <Button variant="ghost" size="sm" asChild title="Edit Document">
                        <Link href={`/projects/${projectId}/documents/${doc.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild title="View in Rich Editor">
                        <Link href={`/projects/${projectId}/documents/${doc.id}/view`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>

                      <Button variant="ghost" size="sm" onClick={() => handleDownloadDocument(doc.id)}>
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
            )
          })}

          {displayDocuments.length === 0 && (
            <div className="text-center py-12 bg-gray-50/50 rounded-lg border-2 border-dashed">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-semibold mb-2">No documents found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : "No documents have been added to this project yet."
                }
              </p>
              {!searchTerm && (
                <Button variant="outline" onClick={() => setIsGenerateModalOpen(true)}>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Document
                </Button>
              )}
            </div>
          )}

          {/* Pagination control metrics footer section */}
          {displayDocuments.length > 0 && documentsPagination.pages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((documentsPagination.page - 1) * documentsPagination.limit) + 1} to {Math.min(documentsPagination.page * documentsPagination.limit, documentsPagination.total)} of {documentsPagination.total} documents
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(documentsPagination.page - 1)}
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
                  onClick={() => handlePageChange(documentsPagination.page + 1)}
                  disabled={documentsPagination.page >= documentsPagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </AnimatedLayout>
      )}
      
      {/* 🚀 RESTORED: Explicitly relays fetched aiProviders downwards to satisfy selection properties */}
      {project && (
        <GenerateDocumentModal
          project={project}
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          aiProviders={aiProviders}
        />
      )}
    </div>
  )
}
