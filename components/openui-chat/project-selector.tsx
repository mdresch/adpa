"use client"

import { FolderOpenDot } from "lucide-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OpenUIProject } from "@/lib/openui/library"

type ProjectSelectorProps = {
  projects: OpenUIProject[]
  selectedProjectId: string
  onChange: (projectId: string) => void
  disabled?: boolean
}

export function ProjectSelector({
  projects,
  selectedProjectId,
  onChange,
  disabled = false,
}: ProjectSelectorProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <FolderOpenDot className="h-4 w-4 text-emerald-600" />
        <span>Select a project</span>
      </div>
      <Select disabled={disabled} onValueChange={onChange} value={selectedProjectId}>
        <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/90 shadow-sm">
          <SelectValue placeholder="Choose an available project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{project.name}</span>
                <span className="truncate text-xs text-slate-500">
                  {project.framework || project.status || "Available project"}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}