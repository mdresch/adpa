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
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Edit Project
            </DialogTitle>
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
                  onChange={(e) => onProjectChange(project ? { ...project, name: e.target.value } : null)}
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
                  onChange={(e) => onProjectChange(project ? { ...project, priority: e.target.value } : null)}
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
                  onChange={(e) => onProjectChange(project ? { ...project, framework: e.target.value } : null)}
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
                  onChange={(e) => onProjectChange(project ? { ...project, status: e.target.value } : null)}
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
                onChange={(e) => onProjectChange(project ? { ...project, description: e.target.value } : null)}
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
                  onChange={(e) => onProjectChange(project ? { ...project, start_date: e.target.value } : null)}
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
                  onChange={(e) => onProjectChange(project ? { ...project, end_date: e.target.value } : null)}
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
                  onChange={(e) => onProjectChange(project ? { ...project, budget: Number(e.target.value) } : null)}
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

