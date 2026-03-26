/**
 * ProjectsGrid Component
 * Grid layout for displaying project cards with loading state
 */

import React from "react"
import { Loader2 } from "@/components/ui/icons-shim"
import { AnimatedGrid } from "@/components/animated-layout"
import { ProjectCard } from "./ProjectCard"
import { ProjectCardSkeleton } from "./ProjectCardSkeleton"
import type { ProjectsGridProps } from "../types"

export function ProjectsGrid({
  projects,
  loading,
  onEdit,
  onDelete,
  onArchive,
  onGenerateDocument,
  onUploadDocument
}: ProjectsGridProps) {
  // Loading state
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state handled by parent
  if (projects.length === 0) {
    return null
  }

  // Projects grid
  return (
    <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          index={index}
          onEdit={onEdit}
          onDelete={onDelete}
          onArchive={onArchive}
          onGenerateDocument={onGenerateDocument}
          onUploadDocument={onUploadDocument}
        />
      ))}
    </AnimatedGrid>
  )
}

