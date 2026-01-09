/**
 * EditProjectDialog Component
 * Form for editing an existing project with all metadata fields
 */

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "@/components/ui/icons-shim"
import type { EditProjectDialogProps } from "../types"

export function EditProjectDialog({
  open,
  onOpenChange,
  project,
  onProjectChange,
  onSubmit,
  updating
}: EditProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Edit Project
              </DialogTitle>
              {/* Settings icon to open Project Settings */}
              {project?.id && (
                <a
                  href={`/projects/${project.id}/settings`}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 underline-offset-2 hover:underline"
                  title="Open Project Settings"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M11.983 2a1 1 0 01.993.883l.007.117v1.333a8.001 8.001 0 013.04 1.258l.943-.944a1 1 0 011.414 0l.083.094 1.886 2.126a1 1 0 010 1.32l-.083.094-.944.943a8.001 8.001 0 011.258 3.04h1.333a1 1 0 01.117 1.993l-.117.007h-1.333a8.001 8.001 0 01-1.258 3.04l.944.943a1 1 0 01.083 1.32l-.083.094-1.886 2.126a1 1 0 01-1.497.028l-.083-.094-.943-.944a8.001 8.001 0 01-3.04 1.258v1.333a1 1 0 01-1.993.117l-.007-.117v-1.333a8.001 8.001 0 01-3.04-1.258l-.943.944a1 1 0 01-1.497-.028l-.083-.094L3.64 18.8a1 1 0 01-.028-1.497l.094-.083.944-.943A8.001 8.001 0 013.39 13.156H2.056a1 1 0 01-.117-1.993l.117-.007H3.39a8.001 8.001 0 011.258-3.04l-.944-.943a1 1 0 01-.028-1.497l.094-.083L5.65 3.467a1 1 0 011.32-.083l.094.083.943.944A8.001 8.001 0 0111.046 4.3V2.999a1 1 0 01.937-.999zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" clipRule="evenodd" />
                  </svg>
                  Settings
                </a>
              )}
            </div>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Update project details and settings.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Name and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-project-name" className="text-sm font-semibold">
                  Project Name *
                </Label>
                <Input
                  id="edit-project-name"
                  placeholder="Enter project name"
                  value={project?.name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProjectChange(project ? { ...project, name: e.target.value } : null)}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-priority" className="text-sm font-semibold">
                  Priority
                </Label>
                <select 
                  id="edit-priority"
                  title="Priority"
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                  value={project?.priority || "medium"}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProjectChange(project ? { ...project, priority: e.target.value } : null)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Framework and Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-framework" className="text-sm font-semibold">
                  Framework *
                </Label>
                <select 
                  id="edit-framework"
                  title="Framework"
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                  value={project?.framework || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProjectChange(project ? { ...project, framework: e.target.value } : null)}
                  required
                >
                  <option value="">Select framework</option>
                  <option value="BABOK v3">BABOK v3</option>
                  <option value="PMBOK 7">PMBOK 7</option>
                  <option value="DMBOK 2.0">DMBOK 2.0</option>
                </select>
              </div>
              <div>
                <Label htmlFor="edit-status" className="text-sm font-semibold">
                  Status
                </Label>
                <select 
                  id="edit-status"
                  title="Project Status"
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                  value={project?.status || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProjectChange(project ? { ...project, status: e.target.value } : null)}
                >
                  <option value="active">Active</option>
                  <option value="planning">Planning</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="edit-description" className="text-sm font-semibold">
                Description
              </Label>
              <Textarea
                id="edit-description"
                placeholder="Describe the project objectives and scope"
                value={project?.description || ""}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onProjectChange(project ? { ...project, description: e.target.value } : null)}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Dates and Budget */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-start-date" className="text-sm font-semibold">
                  Start Date
                </Label>
                <Input
                  id="edit-start-date"
                  type="date"
                  value={project?.start_date || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProjectChange(project ? { ...project, start_date: e.target.value } : null)}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <Label htmlFor="edit-end-date" className="text-sm font-semibold">
                  End Date
                </Label>
                <Input
                  id="edit-end-date"
                  type="date"
                  value={project?.end_date || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProjectChange(project ? { ...project, end_date: e.target.value } : null)}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <Label htmlFor="edit-budget" className="text-sm font-semibold">
                  Budget
                </Label>
                <Input
                  id="edit-budget"
                  placeholder="$0"
                  value={project?.budget?.toString() || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => onProjectChange(project ? { ...project, budget: Number(e.target.value) } : null)}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={updating}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              {updating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

