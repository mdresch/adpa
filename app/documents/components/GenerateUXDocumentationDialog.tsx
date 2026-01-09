/**
 * Generate UX Documentation Dialog
 * Component for generating user manuals and guides highlighting daily activities
 */

"use client"

import React, { useState, useEffect } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2 } from "@/components/ui/icons-shim"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"

interface GenerateUXDocumentationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId?: string
  onSuccess?: () => void
}

interface Template {
  id: string
  name: string
  description: string
  estimated_time: string
  best_for: string
}

interface Audience {
  id: string
  name: string
}

export function GenerateUXDocumentationDialog({
  open,
  onOpenChange,
  projectId,
  onSuccess,
}: GenerateUXDocumentationDialogProps) {
  const [loading, setLoading] = useState(false)
  const [templates, setTemplates] = useState<Template[]>([])
  const [audiences, setAudiences] = useState<Audience[]>([])
  const [generating, setGenerating] = useState(false)

  const [formData, setFormData] = useState({
    document_type: "daily_activities",
    target_audience: "all",
    output_format: "markdown",
    tone: "professional",
    include_examples: true,
    save_as_document: false,
  })

  // Load templates and audiences on mount
  useEffect(() => {
    if (open) {
      loadTemplates()
    }
  }, [open])

  const loadTemplates = async () => {
    try {
      const response = await apiClient.get<{ success: boolean; data: { templates: Template[]; audiences: Audience[] } }>("/api/ux-documentation/templates")
      if (response.success && response.data) {
        setTemplates(response.data.templates || [])
        setAudiences(response.data.audiences || [])
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load templates")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)

    try {
      const payload = {
        ...formData,
        project_id: projectId,
      }

      const response = await apiClient.post<{ success: boolean; data: any; error?: string }>("/api/ux-documentation/generate", payload)

      if (response.success) {
        toast.success("UX documentation generated successfully!")

        // Open the generated document in a new tab or navigate to it
        if (response.data?.content) {
          // Create a blob and download or open in new window
          const blob = new Blob([response.data.content], { type: "text/markdown" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = `${response.data.title || "ux-documentation"}.md`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(url)
        }

        onSuccess?.()
        onOpenChange(false)
      } else {
        throw new Error(response.error || "Failed to generate documentation")
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to generate UX documentation")
    } finally {
      setGenerating(false)
    }
  }

  const selectedTemplate = templates.find((t) => t.id === formData.document_type)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] glass border-0 shadow-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Generate UX Documentation
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Create user manuals and guides highlighting how ADPA contributes to daily
              activities.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Document Type */}
            <div>
              <Label htmlFor="document-type" className="text-sm font-semibold">
                Document Type *
              </Label>
              <Select
                value={formData.document_type}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, document_type: value })
                }
              >
                <SelectTrigger id="document-type" className="mt-2">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        <div className="text-xs text-slate-500">
                          {template.description}
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTemplate && (
                <p className="text-xs text-slate-500 mt-1">
                  {selectedTemplate.estimated_time} • {selectedTemplate.best_for}
                </p>
              )}
            </div>

            {/* Target Audience */}
            <div>
              <Label htmlFor="target-audience" className="text-sm font-semibold">
                Target Audience *
              </Label>
              <Select
                value={formData.target_audience}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, target_audience: value })
                }
              >
                <SelectTrigger id="target-audience" className="mt-2">
                  <SelectValue placeholder="Select target audience" />
                </SelectTrigger>
                <SelectContent>
                  {audiences.map((audience) => (
                    <SelectItem key={audience.id} value={audience.id}>
                      {audience.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Output Format */}
            <div>
              <Label htmlFor="output-format" className="text-sm font-semibold">
                Output Format *
              </Label>
              <Select
                value={formData.output_format}
                onValueChange={(value: string) =>
                  setFormData({ ...formData, output_format: value })
                }
              >
                <SelectTrigger id="output-format" className="mt-2">
                  <SelectValue placeholder="Select output format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="markdown">Markdown (.md)</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="docx">Word (.docx)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div>
              <Label htmlFor="tone" className="text-sm font-semibold">
                Tone
              </Label>
              <Select
                value={formData.tone}
                onValueChange={(value: string) => setFormData({ ...formData, tone: value })}
              >
                <SelectTrigger id="tone" className="mt-2">
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="friendly">Friendly</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Options</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="include-examples"
                  checked={formData.include_examples}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setFormData({ ...formData, include_examples: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Label
                  htmlFor="include-examples"
                  className="text-sm font-normal cursor-pointer"
                >
                  Include examples and use cases
                </Label>
              </div>
              {projectId && (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="save-as-document"
                    checked={formData.save_as_document}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setFormData({ ...formData, save_as_document: e.target.checked })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <Label
                    htmlFor="save-as-document"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Save as project document
                  </Label>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={generating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={generating || loading}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Documentation"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

