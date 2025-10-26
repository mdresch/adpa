/**
 * GenerateDocumentDialog Component
 * AI-powered document generation dialog with template selection and progress tracking
 */

import React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Wand2, AlertCircle, CheckCircle } from "@/components/ui/icons-shim"
import type { GenerateDocumentDialogProps } from "../types"

// Status and health configurations
const statusConfig = {
  draft: { emoji: '⚪', label: 'Draft', variant: 'secondary' as const },
  testing: { emoji: '🔵', label: 'Testing', variant: 'default' as const },
  compliance: { emoji: '🟣', label: 'Compliance', variant: 'default' as const },
  validated: { emoji: '🟡', label: 'Validated', variant: 'default' as const },
  production: { emoji: '🟢', label: 'Production', variant: 'default' as const },
  archived: { emoji: '📦', label: 'Archived', variant: 'secondary' as const },
  deprecated: { emoji: '🔴', label: 'Deprecated', variant: 'destructive' as const },
}

const healthConfig = {
  'Excellent': { color: 'text-green-600', bgColor: 'bg-green-50', icon: '⭐' },
  'Good': { color: 'text-blue-600', bgColor: 'bg-blue-50', icon: '✓' },
  'Fair': { color: 'text-yellow-600', bgColor: 'bg-yellow-50', icon: '◐' },
  'Needs Improvement': { color: 'text-orange-600', bgColor: 'bg-orange-50', icon: '⚠' },
}

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  project,
  templates,
  form,
  onFormChange,
  onSubmit,
  generating,
  progress
}: GenerateDocumentDialogProps) {
  const selectedTemplate = templates.find(t => t.id === form.template_id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Generate Document
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Generate a new document for {project?.name} using AI
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Document Name */}
            <div>
              <Label htmlFor="doc-name" className="text-sm font-semibold">
                Document Name *
              </Label>
              <Input
                id="doc-name"
                placeholder="Enter document name"
                value={form.name}
                onChange={(e) => onFormChange({ ...form, name: e.target.value })}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Template Selection */}
            <div>
              <Label htmlFor="template-select" className="text-sm font-semibold">
                Template (Optional)
              </Label>
              <select 
                id="template-select"
                title="Select a template"
                className="flex h-10 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm mt-2 focus:border-blue-500 transition-colors"
                value={form.template_id}
                onChange={(e) => onFormChange({ ...form, template_id: e.target.value })}
              >
                <option value="">Select a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.development_status && statusConfig[template.development_status as keyof typeof statusConfig] 
                      ? statusConfig[template.development_status as keyof typeof statusConfig].emoji + ' ' 
                      : ''}
                    {template.name} ({template.framework})
                    {template.development_status === 'production' ? ' ✓' : ''}
                  </option>
                ))}
              </select>
              
              {/* Template Status Information Panel */}
              {selectedTemplate && (
                <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Template Status:</span>
                      {selectedTemplate.development_status && statusConfig[selectedTemplate.development_status as keyof typeof statusConfig] && (
                        <Badge variant={statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].variant}>
                          {statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].emoji}{' '}
                          {statusConfig[selectedTemplate.development_status as keyof typeof statusConfig].label}
                        </Badge>
                      )}
                    </div>
                    {selectedTemplate.health_rating && healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig] && (
                      <Badge variant="outline" className={`text-xs ${healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].color}`}>
                        {healthConfig[selectedTemplate.health_rating as keyof typeof healthConfig].icon}{' '}
                        {selectedTemplate.health_rating}
                      </Badge>
                    )}
                  </div>
                  
                  {selectedTemplate.validation_count !== undefined && selectedTemplate.validation_count > 0 && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Success Rate</span>
                        <span className="font-semibold">
                          {selectedTemplate.success_rate !== undefined 
                            ? `${Number(selectedTemplate.success_rate).toFixed(1)}%`
                            : selectedTemplate.success_count && selectedTemplate.validation_count
                              ? `${Math.round((selectedTemplate.success_count / selectedTemplate.validation_count) * 100)}%`
                              : 'N/A'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Test Runs</span>
                        <span className="font-semibold">{selectedTemplate.validation_count}</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Warning for non-production templates */}
                  {selectedTemplate.development_status && selectedTemplate.development_status !== 'production' && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                      <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                          {selectedTemplate.development_status === 'draft' && 'Draft Template - Untested'}
                          {selectedTemplate.development_status === 'testing' && 'Testing Template - Limited validation'}
                          {selectedTemplate.development_status === 'validated' && 'Validated Template - Not yet production-ready'}
                          {selectedTemplate.development_status === 'deprecated' && 'Deprecated Template - Not recommended'}
                        </p>
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                          This template is still being tested. Results may vary in quality.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* Success indicator for production templates */}
                  {selectedTemplate.development_status === 'production' && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-green-800 dark:text-green-200">
                          Production Template - Fully Validated
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          This template has been thoroughly tested and is ready for production use.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Generation Prompt */}
            <div>
              <Label htmlFor="generation-prompt" className="text-sm font-semibold">
                Generation Prompt *
              </Label>
              <Textarea
                id="generation-prompt"
                placeholder="Describe what you want the document to contain..."
                value={form.prompt}
                onChange={(e) => onFormChange({ ...form, prompt: e.target.value })}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                rows={4}
                required
              />
            </div>
            
            {/* Progress Indicator */}
            {generating && progress.step > 0 && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">
                    Step {progress.step} of {progress.totalSteps}
                  </span>
                  <span className="text-muted-foreground">
                    {progress.percentage}%
                  </span>
                </div>
                <Progress value={progress.percentage} className="h-2" />
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">
                    {progress.message}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="submit"
              disabled={generating}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              {generating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Wand2 className="h-4 w-4 mr-2" />
              Generate Document
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

