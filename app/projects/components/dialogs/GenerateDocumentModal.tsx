"use client"

import React, { useEffect, useState } from "react"
import { apiClient, Project, Template } from "@/lib/api"
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

function buildInitialForm(project: Project): DocumentGenerationForm {
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
  }
}

export function GenerateDocumentModal({ project, isOpen, onClose }: GenerateDocumentModalProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState<DocumentGenerationForm>(EMPTY_GENERATION_FORM)
  const [progress, setProgress] = useState<GenerationProgress>(EMPTY_PROGRESS)

  useEffect(() => {
    if (!isOpen || !project) return
    setForm(buildInitialForm(project))
    setProgress(EMPTY_PROGRESS)

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
        totalSteps: 4,
        message: "Preparing project context...",
        percentage: 25,
      })
      await new Promise((resolve) => setTimeout(resolve, 300))

      setProgress({
        step: 2,
        totalSteps: 4,
        message: "Agentic Process: Planning & Drafting Sections...",
        percentage: 50,
      })

      const aiStartTime = Date.now()
      const aiResponse = await apiClient.generateContent({
        prompt: form.prompt,
        provider: form.provider || "Groq AI",
        model: form.model || "llama-3.1-8b-instant",
        temperature: form.temperature || 0.7,
        template_id: form.template_id || undefined,
      })
      const aiDuration = Date.now() - aiStartTime
      trackPerformance("ai_generation_time", aiDuration)

      const content =
        aiResponse.result?.content ||
        aiResponse.result?.text ||
        aiResponse.content ||
        aiResponse.text ||
        "# Document content not generated"

      setProgress({
        step: 3,
        totalSteps: 4,
        message: "Content generated! Saving document...",
        percentage: 75,
      })

      await apiClient.createDocument(project.id, {
        name: form.name,
        content,
        template_id: form.template_id || undefined,
        status: "draft",
      })

      setProgress({
        step: 4,
        totalSteps: 4,
        message: "Document created successfully! ✓",
        percentage: 100,
      })

      const totalDuration = Date.now() - startTime
      trackTemplateGeneration(templateName, "success")
      trackPerformance("template_generation_time", totalDuration)
      trackFeatureUsage("template_generation", "completed", {
        project_id: project.id,
        template_name: templateName,
        provider: form.provider || "Groq AI",
        generation_duration_ms: totalDuration.toString(),
        ai_duration_ms: aiDuration.toString(),
      })

      await new Promise((resolve) => setTimeout(resolve, 800))
      toast.success("Document generated successfully!")
      onClose()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      console.error("Failed to generate document:", error)
      trackTemplateGeneration(templateName, "failed")
      trackError("template_generation", errorMessage)
      trackFeatureUsage("template_generation", "failed", {
        project_id: project.id,
        template_name: templateName,
        provider: form.provider || "Groq AI",
        error_type: "generation_error",
      })
      toast.error("Failed to generate document")
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
      form={form}
      onFormChange={setForm}
      onSubmit={handleGenerateDocumentSubmit}
      generating={generating}
      progress={progress}
    />
  )
}
