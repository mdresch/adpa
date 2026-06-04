"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
} from "lucide-react"
import { AnimatedGrid, AnimatedGridItem, AnimatedLayout } from "@/components/animated-layout"
import { Document, apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"

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
  setDocumentsPagination: React.Dispatch<React.SetStateAction<DocumentsPagination>>
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

/** Hook that polls /api/v1/jobs for active (pending/processing) generation jobs */
function useActiveGenerationJobs(projectId: string) {
  const [activeJobs, setActiveJobs] = useState<ActiveJobInfo[]>([])
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchActiveJobs = async () => {
    try {
      // Use apiClient (same as jobs monitor page) — it correctly hits /api/v1/jobs
      const [processingData, pendingData] = await Promise.all([
        apiClient.get('/jobs?status=processing&limit=50') as Promise<any>,
        apiClient.get('/jobs?status=pending&limit=50') as Promise<any>,
      ])

      const allJobs = [
        ...(processingData?.jobs || []),
        ...(pendingData?.jobs || []),
      ]

      console.log('[DocumentsTab] Active generation jobs raw:', allJobs.map((j: any) => ({
        id: j.id, type: j.type, status: j.status, progress: j.progress,
        documentName: j.documentName, docId: j.metadata?.document_id
      })))

      const jobs: ActiveJobInfo[] = allJobs
        .filter((j: any) => ['ai-generate', 'document-regeneration'].includes(j.type))
        .map((j: any) => ({
          jobId: j.id,
          documentId: j.metadata?.document_id || null,
          // documentName available even when documentId is null (job is still processing)
          documentName: j.documentName || j.metadata?.document_name || null,
          status: j.status,
          progress: j.progress || 0,
          type: j.type,
        }))

      console.log('[DocumentsTab] Mapped active jobs:', jobs)
      setActiveJobs(jobs)
    } catch {
      // silent — non-critical
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
  setDocumentsPagination,
}: DocumentsTabProps) {
  const activeJobs = useActiveGenerationJobs(projectId)

  const { user } = useAuth()

  /** Resolve a raw updated_by value (UUID or name) to a display string */
  const resolveUpdatedBy = (updatedBy: string | null | undefined, updatedByName?: string | null): string => {
    if (updatedByName && updatedByName.trim() !== '') return updatedByName
    if (!updatedBy) return '—'
    // If it's the currently logged-in user, use their display name
    if (user?.id && updatedBy === user.id) {
      return user.name || user.email || 'You'
    }
    // If it looks like a UUID, abbreviate it
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(updatedBy)) {
      return `User ${updatedBy.slice(0, 8)}…`
    }
    // It's already a human-readable name
    return updatedBy
  }

  /** Look up any active job for a given document id + name */
  const getActiveJob = (docId: string, docName: string): ActiveJobInfo | undefined =>
    activeJobs.find(j =>
      // Primary: match by document ID (works after doc is persisted)
      (j.documentId && j.documentId === docId) ||
      // Fallback: match by name (works during active generation before doc ID is saved)
      (j.documentName && j.documentName.toLowerCase() === docName.toLowerCase())
    )

  return (
    <div className="space-y-4">
      {/* Document Stats */}
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

      {/* Active job banner — shown when any generation job is running */}
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

      {/* Search area */}
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
      </div>

      {/* Loading state for documents */}
      {documentsLoading ? (
        <div className="flex justify-center items-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading documents...</span>
        </div>
      ) : (
        <AnimatedLayout className="space-y-2">
          {/* Active generating documents placeholder cards */}
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
                            <Zap className="h-3 w-3 animate-bounce" />
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

                          {/* Processing badge — replaces normal status badge when generating */}
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

                        {/* Progress bar for active generation */}
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
              <p className="text-muted-foreground">
                {searchTerm
                  ? "Try adjusting your search criteria"
                  : "No documents have been added to this project yet."
                }
              </p>
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
        </AnimatedLayout>
      )}
    </div>
  )
}
