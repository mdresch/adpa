"use client"

import React, { useEffect, useState } from "react"
import { apiClient, Project, Template } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "@/lib/notify"
import {
  trackTemplateGeneration,
  trackFeatureUsage,
  trackPerformance,
  trackError,
} from "@/lib/analytics/clarity"
import { GenerateDocumentDialog } from "../GenerateDocumentDialog"
import type { DocumentGenerationForm, GenerationProgress } from "../../types"

interface GenerateDocumentModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
  aiProviders?: any[]
}

// Helper to get date + 5 working days
function getPlus5WorkingDaysDate(): string {
  const date = new Date();
  let addedDays = 0;
  while (addedDays < 5) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      addedDays++;
    }
  }
  return date.toISOString().split('T')[0];
}

const EMPTY_GENERATION_FORM: DocumentGenerationForm = {
  name: "",
  template_id: "",
  prompt: "",
  provider: "Groq AI",
  model: "llama-3.1-8b-instant",
  temperature: 0.7,
  max_tokens: 4000,
  project_id: "",
  user_id: "",
  document_ids: [],
  include_integrations: false,
  max_context_tokens: 2000,
  context_priority: "",
  custom_context: "",
}

const EMPTY_PROGRESS: GenerationProgress = {
  step: 0,
  totalSteps: 4,
  message: "",
  percentage: 0,
}

function buildInitialForm(project: Project, userId?: string, framework?: string): DocumentGenerationForm {
  return {
    name: `${project.name} - Generated Document`,
    template_id: "",
    prompt: `Generate a comprehensive document for the ${project.name} project using the ${project.framework} framework. Include project overview, objectives, timeline, and key deliverables.`,
    provider: "Groq AI",
    model: "llama-3.1-8b-instant",
    temperature: 0.7,
    max_tokens: 4000,
    project_id: project.id,
    user_id: "",
    document_ids: [],
    include_integrations: false,
    max_context_tokens: 2000,
    context_priority: "",
    custom_context: "",
    metadata: {
      author_id: userId,
      reviewers: userId ? [userId] : [],
      due_date: getPlus5WorkingDaysDate(),
      framework: framework || project.framework
    }
  }
}

export function GenerateDocumentModal({ project, isOpen, onClose, aiProviders = [] }: GenerateDocumentModalProps) {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<Template[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState<DocumentGenerationForm>(EMPTY_GENERATION_FORM)
  const [progress, setProgress] = useState<GenerationProgress>(EMPTY_PROGRESS)

  useEffect(() => {
    if (!isOpen || !project) return
    setForm(buildInitialForm(project, user?.id))
    setProgress(EMPTY_PROGRESS)

    let cancelled = false
    
    // Fetch users for the reviewer override dropdown
    apiClient.getUsers({ limit: 100 })
      .then((res: any) => {
        if (!cancelled) setUsers(res.users || [])
      })
      .catch(() => console.error("Failed to load users"))

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
    if (!open && !generating) {
      onClose()
    }
  }

  const handleGenerateDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!project) return

    if (!form.name || !form.prompt) {
      toast.error("Please fill in required fields")
      return
    }

    const startTime = Date.now()
    const templateName = templates.find((t) => t.id === form.template_id)?.name || "Custom"

    try {
      setGenerating(true)
      trackTemplateGeneration(templateName, "success")
      trackFeatureUsage("template_generation", "started", {
        project_id: project.id,
        template_name: templateName,
        provider: form.provider || "Groq AI",
        model: form.model || "llama-3.1-8b-instant",
      })

      setProgress({
        step: 1,
        totalSteps: 2,
        message: "Queueing document generation...",
        percentage: 50,
      })

      // Dispatch to the background queue
      await apiClient.post<{ jobId: string; async: boolean }>(`/document-generation/generate`, {
        projectId: project.id,
        name: form.name,
        templateId: form.template_id || undefined,
        userPrompt: form.prompt,
        provider: form.provider || "Groq AI",
        model: form.model || "llama-3.1-8b-instant",
        temperature: form.temperature || 0.7,
        max_tokens: form.max_tokens,
        async: true,
        generation_metadata: form.metadata,
      })

      setProgress({
        step: 2,
        totalSteps: 2,
        message: "Document generation queued!",
        percentage: 100,
      })

      toast.success("Document generation has been queued and will run in the background.")
      
      // Close modal immediately and let DocumentsTab overlay handle the rest
      setTimeout(() => {
        onClose()
      }, 500)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Failed to queue document generation:", error)
      trackTemplateGeneration(templateName, "failed")
      trackError("template_generation", errorMessage)
      trackFeatureUsage("template_generation", "failed", {
        project_id: project.id,
        template_name: templateName,
        provider: form.provider || "Groq AI",
        error_type: "generation_error",
      })
      toast.error("Failed to queue document generation")
      setProgress(EMPTY_PROGRESS)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <GenerateDocumentDialog
      open={isOpen}
      onOpenChange={handleClose}
      project={project}
      templates={templates}
      users={users}
      form={form}
      onFormChange={setForm}
      onSubmit={handleGenerateDocumentSubmit}
      generating={generating}
      progress={progress}
      aiProviders={aiProviders}
    />
  )
}
