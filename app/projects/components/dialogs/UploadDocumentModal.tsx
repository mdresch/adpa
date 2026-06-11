"use client"

import React, { useEffect, useState } from "react"
import { apiClient, Project, Template } from "@/lib/api"
import { getApiBaseUrl } from "@/lib/api-url"
import { toast } from "@/lib/notify"
import {
  trackDocumentUpload,
  trackFeatureUsage,
  trackPerformance,
  trackError,
} from "@/lib/analytics/clarity"
import { UploadDocumentDialog } from "../UploadDocumentDialog"
import type { DocumentUploadForm } from "../../types"

interface UploadDocumentModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const EMPTY_UPLOAD_FORM: DocumentUploadForm = {
  name: "",
  file: null,
  template_id: "",
}

export function UploadDocumentModal({
  project,
  isOpen,
  onClose,
  onSuccess,
}: UploadDocumentModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState<DocumentUploadForm>(EMPTY_UPLOAD_FORM)

  useEffect(() => {
    if (!isOpen || !project) return
    setForm(EMPTY_UPLOAD_FORM)

    let cancelled = false
    apiClient
      .getTemplates({ limit: 100 })
      .then((res) => {
        if (!cancelled) setTemplates(res.templates || [])
      })
      .catch(() => {
        if (!cancelled) {
          toast.error("Failed to load templates")
          setTemplates([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [isOpen, project])

  const handleClose = (open: boolean) => {
    if (!open && !uploading) {
      onClose()
    }
  }

  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project) return

    if (!form.name || !form.file || !form.template_id) {
      toast.error("Please fill in all required fields including template selection")
      return
    }

    if (!(form.file instanceof File)) {
      toast.error("Invalid file object. Please select a valid file.")
      return
    }

    const startTime = Date.now()
    const templateName = templates.find((t) => t.id === form.template_id)?.name || "Unknown"
    const fileName = form.file.name
    const fileSize = form.file.size

    try {
      setUploading(true)
      trackDocumentUpload("started", templateName)
      trackFeatureUsage("document_upload", "started", {
        project_id: project.id,
        template_name: templateName,
        file_name: fileName,
        file_size_bytes: fileSize.toString(),
      })

      const fileNameLower = form.file.name.toLowerCase()
      const fileType = form.file.type?.toLowerCase() || ""

      const isPDF = fileNameLower.endsWith(".pdf")
      const isDOCX = fileNameLower.endsWith(".docx") || fileNameLower.endsWith(".doc")
      const isTXT = fileNameLower.endsWith(".txt")
      const isMD = fileNameLower.endsWith(".md") || fileNameLower.endsWith(".markdown")

      const isPDFMime = fileType === "application/pdf"
      const isDOCXMime =
        fileType.includes("wordprocessingml") ||
        fileType.includes("msword") ||
        fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        fileType === "application/msword"
      const isTextMime = fileType === "text/plain" || fileType === "text/markdown"

      const isBinaryFile = isPDF || isDOCX || isPDFMime || isDOCXMime
      const isTextFile = isTXT || isMD || isTextMime

      if (isBinaryFile) {
        const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null
        if (!token) {
          throw new Error("Authentication required. Please log in again.")
        }

        const formData = new FormData()
        formData.append("files", form.file)
        formData.append("projectId", project.id)
        formData.append("assessmentName", form.name)

        const response = await fetch(`${getApiBaseUrl()}/onboarding/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }))
          throw new Error(error.error?.message || error.message || "Failed to upload document")
        }

        toast.success("Document uploaded successfully! Processing will begin shortly.")
        onClose()
        onSuccess()
        return
      }

      if (isTextFile) {
        const textContent = await form.file.text()

        if (typeof textContent !== "string" || textContent.trim() === "") {
          throw new Error("File content is empty or invalid. Cannot create document.")
        }

        const documentData = {
          name: form.name,
          content: textContent,
          template_id: form.template_id,
          status: "draft" as const,
        }

        if (
          typeof documentData.content === "object" ||
          (typeof documentData.content === "string" &&
            (documentData.content.includes('"fileName"') ||
              documentData.content.includes('"fileSize"') ||
              documentData.content.includes('"fileType"')))
        ) {
          throw new Error(
            "Invalid content format. For binary files (PDF/DOCX), please use the upload flow which handles conversion automatically."
          )
        }

        await apiClient.createDocument(project.id, documentData)

        const totalDuration = Date.now() - startTime
        trackDocumentUpload("success", templateName)
        trackPerformance("document_upload_time", totalDuration)
        trackFeatureUsage("document_upload", "completed", {
          project_id: project.id,
          template_name: templateName,
          file_name: fileName,
          file_size_bytes: fileSize.toString(),
          upload_duration_ms: totalDuration.toString(),
        })

        toast.success("Document uploaded successfully!")
        onClose()
        onSuccess()
        return
      }

      throw new Error(
        `Unsupported file type: ${form.file.name}. Please upload PDF, DOCX, TXT, or Markdown files.`
      )
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Failed to upload document:", error)
      trackDocumentUpload("failed", templateName)
      trackError("document_upload", errorMessage)
      trackFeatureUsage("document_upload", "failed", {
        project_id: project.id,
        template_name: templateName,
        file_name: fileName,
        error_type: "upload_error",
      })
      toast.error(
        errorMessage ||
          "Failed to upload document. Please ensure the file is a PDF, DOCX, TXT, or Markdown file."
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <UploadDocumentDialog
      open={isOpen}
      onOpenChange={handleClose}
      project={project}
      templates={templates}
      form={form}
      onFormChange={setForm}
      onSubmit={handleUploadDocumentSubmit}
      uploading={uploading}
    />
  )
}
