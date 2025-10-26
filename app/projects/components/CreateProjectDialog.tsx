/**
 * CreateProjectDialog Component
 * Form for creating a new project with all metadata fields
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
import type { CreateProjectDialogProps } from "../types"

export function CreateProjectDialog({
  open,
  onOpenChange,
  newProject,
  onProjectChange,
  onSubmit,
  creating
}: CreateProjectDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Create New Project
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Create a new project with document library and template integration.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Name and Priority */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="project-name" className="text-sm font-semibold">
                  Project Name *
                </Label>
                <Input
                  id="project-name"
                  placeholder="Enter project name"
                  value={newProject.name}
                  onChange={(e) => onProjectChange({ ...newProject, name: e.target.value })}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority" className="text-sm font-semibold">
                  Priority
                </Label>
                <select 
                  id="priority"
                  title="Priority"
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                  value={newProject.priority}
                  onChange={(e) => onProjectChange({ ...newProject, priority: e.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>

            {/* Framework and Manager */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="framework" className="text-sm font-semibold">
                  Framework *
                </Label>
                <select 
                  id="framework"
                  title="Framework"
                  className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                  value={newProject.framework}
                  onChange={(e) => onProjectChange({ ...newProject, framework: e.target.value })}
                  required
                >
                  <option value="">Select framework</option>
                  <option value="BABOK v3">BABOK v3</option>
                  <option value="PMBOK 7">PMBOK 7</option>
                  <option value="DMBOK 2.0">DMBOK 2.0</option>
                </select>
              </div>
              <div>
                <Label htmlFor="manager" className="text-sm font-semibold">
                  Project Manager
                </Label>
                <Input
                  id="manager"
                  placeholder="Enter manager name"
                  value={newProject.manager}
                  onChange={(e) => onProjectChange({ ...newProject, manager: e.target.value })}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-semibold">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the project objectives and scope"
                value={newProject.description}
                onChange={(e) => onProjectChange({ ...newProject, description: e.target.value })}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Dates and Budget */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="start-date" className="text-sm font-semibold">
                  Start Date
                </Label>
                <Input
                  id="start-date"
                  type="date"
                  value={newProject.start_date}
                  onChange={(e) => onProjectChange({ ...newProject, start_date: e.target.value })}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="text-sm font-semibold">
                  End Date
                </Label>
                <Input
                  id="end-date"
                  type="date"
                  value={newProject.end_date}
                  onChange={(e) => onProjectChange({ ...newProject, end_date: e.target.value })}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <Label htmlFor="budget" className="text-sm font-semibold">
                  Budget
                </Label>
                <Input
                  id="budget"
                  placeholder="$0"
                  value={newProject.budget}
                  onChange={(e) => onProjectChange({ ...newProject, budget: e.target.value })}
                  className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={creating}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

