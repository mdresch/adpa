/**
 * UploadDocumentDialog Component
 * File upload dialog with template selection for proper metadata tagging
 */

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, FileUp } from "@/components/ui/icons-shim"
import type { UploadDocumentDialogProps } from "../types"

export function UploadDocumentDialog({
  open,
  onOpenChange,
  project,
  templates,
  form,
  onFormChange,
  onSubmit,
  uploading
}: UploadDocumentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Upload Document
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Upload a document to {project?.name}. Select a template to ensure proper metadata tagging.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Document Name */}
            <div>
              <Label htmlFor="upload-doc-name" className="text-sm font-semibold">
                Document Name *
              </Label>
              <Input
                id="upload-doc-name"
                placeholder="Enter document name"
                value={form.name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFormChange({ ...form, name: e.target.value })}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Template Selection (Required) */}
            <div>
              <Label htmlFor="upload-template-select" className="text-sm font-semibold">
                Template *
              </Label>
              <select 
                id="upload-template-select"
                title="Select a template for metadata tagging"
                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                value={form.template_id}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFormChange({ ...form, template_id: e.target.value })}
                required
              >
                <option value="">Select a template (required)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} ({template.framework})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Template selection is required to ensure proper document metadata and review compliance
              </p>
            </div>

            {/* File Upload */}
            <div>
              <Label htmlFor="file-upload" className="text-sm font-semibold">
                File *
              </Label>
              <Input
                id="file-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md"
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const file = e.target.files?.[0] || null
                  onFormChange({ ...form, file })
                }}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                required
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Supported formats: PDF, DOC, DOCX, TXT, MD
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={uploading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <FileUp className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

