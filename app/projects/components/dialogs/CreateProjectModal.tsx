"use client"

import React, { useEffect, useState } from "react"
import { apiClient } from "@/lib/api"
import { toast } from "@/lib/notify"
import { CreateProjectDialog } from "../CreateProjectDialog"
import type { NewProjectForm } from "../../types"
import {
  clearProjectDraftFromSession,
  getDefaultNewProjectForm,
  readProjectDraftFromSession,
} from "../../utils/project-draft"

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialForm?: NewProjectForm | null
}

export function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
  initialForm,
}: CreateProjectModalProps) {
  const [newProject, setNewProject] = useState<NewProjectForm>(getDefaultNewProjectForm())
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (isOpen && initialForm) {
      setNewProject(initialForm)
    }
  }, [isOpen, initialForm])

  const handleClose = (open: boolean) => {
    if (!open && !creating) {
      onClose()
    }
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newProject.name || !newProject.framework) {
      toast.error("Please fill in required fields (Name and Framework)")
      return
    }

    if (newProject.start_date && newProject.end_date) {
      const startDate = new Date(newProject.start_date)
      const endDate = new Date(newProject.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    if (newProject.budget && isNaN(parseFloat(newProject.budget))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setCreating(true)
      const projectData = {
        ...newProject,
        team_members: newProject.manager ? [newProject.manager] : [],
        budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
        start_date: newProject.start_date || undefined,
        end_date: newProject.end_date || undefined,
      }

      const createdProject = await apiClient.createProject(projectData)
      const projectDraft = readProjectDraftFromSession()

      if (projectDraft) {
        try {
          const draft = projectDraft
          const content = draft.content || ""

          if (content && createdProject?.id) {
            try {
              const documentData = {
                name: draft.templateName || `${newProject.name} - Business Case`,
                content,
                template_id: draft.templateId || null,
                status: "draft" as const,
                metadata: draft.metadata || {},
              }

              await apiClient.createDocument(createdProject.id, documentData)
              toast.success(`Project created with ${draft.templateName || "initial document"}!`)
            } catch (docCreateError: unknown) {
              toast.error(
                `Project created, but document failed to save: ${
                  docCreateError instanceof Error ? docCreateError.message : "Unknown error"
                }`
              )
            }
          } else {
            toast.success("Project created successfully!")
          }

          clearProjectDraftFromSession()
        } catch {
          toast.error(
            "Project created, but initial document could not be saved. You can upload it manually."
          )
        }
      } else {
        toast.success("Project created successfully!")
      }

      setNewProject(getDefaultNewProjectForm())
      onClose()
      onSuccess()
    } catch (error) {
      console.error("Failed to create project:", error)
      toast.error("Failed to create project. Please try again.")
    } finally {
      setCreating(false)
    }
  }

  return (
    <CreateProjectDialog
      open={isOpen}
      onOpenChange={handleClose}
      newProject={newProject}
      onProjectChange={setNewProject}
      onSubmit={handleCreateProject}
      creating={creating}
    />
  )
}
