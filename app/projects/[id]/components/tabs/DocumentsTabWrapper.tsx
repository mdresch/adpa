"use client"

import React, { useState, useEffect } from "react"
import { DocumentsTab } from "../DocumentsTab"
import { apiClient, Document } from "@/lib/api"
import { toast } from '@/lib/notify'
import { useWebSocket } from "@/contexts/WebSocketContext"

export default function DocumentsTabWrapper({ projectId }: { projectId: string }) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [documentsLoading, setDocumentsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [documentStats, setDocumentStats] = useState({
    totalDocuments: 0,
    counts: { draft: 0, published: 0, review: 0, archived: 0 }
  })
  const [documentsPagination, setDocumentsPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  })

  const { joinRoom, leaveRoom, on, off } = useWebSocket()

  const fetchDocuments = async () => {
    try {
      setDocumentsLoading(true)
      const params = {
        page: documentsPagination.page,
        limit: documentsPagination.limit,
        search: searchTerm || undefined,
      }
      const documentsData: any = await apiClient.getProjectDocuments(projectId, params)
      setDocuments(documentsData.documents || [])
      setDocumentsPagination(documentsData.pagination || {
        page: 1, limit: 10, total: 0, pages: 0,
      })
      await fetchDocumentStats()
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      setDocuments([])
    } finally {
      setDocumentsLoading(false)
    }
  }

  const fetchDocumentStats = async () => {
    try {
      const response: any = await apiClient.request(`/documents/project/${projectId}/stats`)
      const statsData = response.stats
      setDocumentStats({
        totalDocuments: Number(statsData.total_documents) || 0,
        counts: {
          draft: Number(statsData.draft_documents) || 0,
          published: Number(statsData.published_documents) || 0,
          review: Number(statsData.review_documents) || 0,
          archived: 0,
        },
      })
    } catch (error) {
      setDocumentStats({
        totalDocuments: documentsPagination.total || 0,
        counts: { draft: 0, published: 0, review: 0, archived: 0 }
      })
    }
  }

  // WebSocket Document Updates
  useEffect(() => {
    if (!projectId || projectId === 'undefined') return
    const room = `project:${projectId}`
    // We do NOT joinRoom here, ProjectSocketRoom handles that.
    // We just listen for events
    
    const recentNotifications = new Set<string>()

    const handleDocumentCreated = (data: any) => {
      try {
        const doc = data?.document
        if (doc && String(doc.project_id) === String(projectId)) {
          const notificationKey = `document-created-${doc.id || doc.name}`
          if (!recentNotifications.has(notificationKey)) {
            recentNotifications.add(notificationKey)
            toast.success(`New document created: ${doc.name}`)
            setTimeout(() => recentNotifications.delete(notificationKey), 5000)
          }
          fetchDocuments()
        }
      } catch (err) {}
    }

    const handleConflictResolved = (data: any) => {
      try {
        const notificationKey = `conflict-resolved-${data.conflictId}`
        if (!recentNotifications.has(notificationKey)) {
          recentNotifications.add(notificationKey)
          toast.success(`Conflict resolved using ${data.resolutionMethod}`)
          setTimeout(() => recentNotifications.delete(notificationKey), 5000)
        }
        fetchDocuments()
      } catch (err) {}
    }

    const handleRegenerationCompleted = (data: any) => {
      try {
        const notificationKey = `regeneration-completed-${data.versionId}`
        if (!recentNotifications.has(notificationKey)) {
          recentNotifications.add(notificationKey)
          toast.success(`Document "${data.documentName}" regeneration completed (v${data.versionNumber})`)
          setTimeout(() => recentNotifications.delete(notificationKey), 5000)
        }
        fetchDocuments()
      } catch (err) {}
    }

    on("document:created", handleDocumentCreated)
    on("document:conflict_resolved", handleConflictResolved)
    on("document:regeneration:completed", handleRegenerationCompleted)

    return () => {
      off("document:created", handleDocumentCreated)
      off("document:conflict_resolved", handleConflictResolved)
      off("document:regeneration:completed", handleRegenerationCompleted)
    }
  }, [projectId])

  useEffect(() => {
    fetchDocuments()
  }, [documentsPagination.page, searchTerm, projectId])

  const handleEditDocument = (documentId: string) => {
    window.location.href = `/projects/${projectId}/documents/${documentId}`
  }

  const handleDownloadDocument = async (documentId: string) => {
    try {
      const docData: any = await apiClient.getDocument(documentId)
      const content = typeof docData.content === 'string'
        ? docData.content
        : docData.content ? JSON.stringify(docData.content) : 'No content available'
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
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

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document? This action cannot be undone.")) return
    try {
      await apiClient.deleteDocument(documentId)
      toast.success("Document deleted successfully!")
      fetchDocuments()
    } catch (error) {
      toast.error("Failed to delete document")
    }
  }

  return (
    <DocumentsTab
      projectId={projectId}
      documentStats={documentStats}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      documentsLoading={documentsLoading}
      displayDocuments={documents}
      handleEditDocument={handleEditDocument}
      handleDownloadDocument={handleDownloadDocument}
      handleDeleteDocument={handleDeleteDocument}
      documentsPagination={documentsPagination}
      handlePageChange={(page) => setDocumentsPagination({ ...documentsPagination, page })}
    />
  )
}
