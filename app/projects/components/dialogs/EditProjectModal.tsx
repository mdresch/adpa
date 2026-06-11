"use client"

import React, { useEffect, useState } from "react"
import { apiClient, Project } from "@/lib/api"
import { toast } from "@/lib/notify"
import { EditProjectDialog } from "../EditProjectDialog"
import { normalizeProjectDate } from "../../utils/project-dates"

interface EditProjectModalProps {
  project: Project | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function EditProjectModal({ project, isOpen, onClose, onSuccess }: EditProjectModalProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    if (isOpen && project) {
      setEditingProject({
        ...project,
        start_date: normalizeProjectDate(project.start_date),
        end_date: normalizeProjectDate(project.end_date),
      })
    }
  }, [isOpen, project])

  const handleClose = (open: boolean) => {
    if (!open && !updating) {
      onClose()
    }
  }

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!editingProject?.name || !editingProject?.framework) {
      toast.error("Please fill in required fields (Name and Framework)")
      return
    }

    if (editingProject.start_date && editingProject.end_date) {
      const startDate = new Date(editingProject.start_date)
      const endDate = new Date(editingProject.end_date)
      if (endDate <= startDate) {
        toast.error("End date must be after start date")
        return
      }
    }

    if (editingProject.budget && isNaN(parseFloat(editingProject.budget.toString()))) {
      toast.error("Please enter a valid budget amount")
      return
    }

    try {
      setUpdating(true)
      const projectData = {
        ...editingProject,
        budget: editingProject.budget ? parseFloat(editingProject.budget.toString()) : undefined,
        start_date: editingProject.start_date || undefined,
        end_date: editingProject.end_date || undefined,
      }

      await apiClient.updateProject(editingProject.id, projectData)
      toast.success("Project updated successfully!")
      onClose()
      onSuccess()
    } catch (error) {
      console.error("Failed to update project:", error)
      toast.error("Failed to update project. Please try again.")
    } finally {
      setUpdating(false)
    }
  }

  return (
    <EditProjectDialog
      open={isOpen}
      onOpenChange={handleClose}
      project={editingProject}
      onProjectChange={setEditingProject}
      onSubmit={handleUpdateProject}
      updating={updating}
    />
  )
}
