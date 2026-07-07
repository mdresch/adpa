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
  provider: "",
  model: "",
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
    provider: "",
    model: "",
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

  // Default the AI provider/model to the first environment-active provider once the
  // list loads, instead of a hardcoded label (e.g. "Groq AI") that may not be configured
  // in every environment — submitting an inactive/unconfigured provider fails every time.
  useEffect(() => {
    if (!isOpen || form.provider || aiProviders.length === 0) return
    const first = aiProviders[0]
    const defaultModel = first.default_model || (first.models && first.models[0]) || ""
    setForm((f) => ({ ...f, provider: first.name || first.id, model: defaultModel }))
  }, [isOpen, aiProviders, form.provider])

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

    if (!form.provider || !form.model) {
      toast.error("No active AI provider is configured. Contact an administrator before generating documents.")
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
        provider: form.provider,
        model: form.model,
      })

      setProgress({
        step: 1,
        totalSteps: 2,
        message: form.template_id ? "Queueing document generation..." : "Generating document...",
        percentage: 50,
      })

      // Let the route decide sync vs. async (it forces async for any template-based
      // generation regardless of what we send here — see shouldRunAsync in
      // documentGeneration.ts). We only need to request it explicitly for the
      // prompt-only case if we ever want to force backgrounding; we don't, so the
      // route runs prompt-only requests synchronously and returns the document directly.
      const response = await apiClient.post<
        | { jobId: string; async: true; message?: string }
        | { message: string; document: Record<string, unknown> }
      >(`/document-generation/generate`, {
        projectId: project.id,
        name: form.name,
        templateId: form.template_id || undefined,
        userPrompt: form.prompt,
        provider: form.provider,
        model: form.model,
        temperature: form.temperature || 0.7,
        max_tokens: form.max_tokens,
        generation_metadata: form.metadata,
      })

      const wasQueued = 'jobId' in response && !!response.jobId

      setProgress({
        step: 2,
        totalSteps: 2,
        message: wasQueued ? "Document generation queued!" : "Document generated!",
        percentage: 100,
      })

      toast.success(
        wasQueued
          ? "Document generation has been queued and will run in the background."
          : "Document generated successfully."
      )

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
        provider: form.provider,
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
