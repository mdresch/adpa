"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CreateApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  projectId?: string
}

const REQUEST_TYPES = [
  { value: 'general_cr', label: 'General Change Request' },
  { value: 'scope_change', label: 'Scope Change' },
  { value: 'timeline_change', label: 'Timeline Change' },
  { value: 'budget_overrun', label: 'Budget Overrun' },
  { value: 'technical_change', label: 'Technical Change' },
  { value: 'positive_drift', label: 'Positive Drift (Opportunity)' },
  { value: 'negative_drift', label: 'Negative Drift (Corrective Action)' },
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
  { value: 'emergency', label: 'Emergency' },
]

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

export function CreateApprovalDialog({ open, onOpenChange, onSuccess, projectId }: CreateApprovalDialogProps) {
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    request_type: '',
    project_id: projectId || '',
    title: '',
    description: '',
    priority: 'medium',
    severity: 'medium',
    impact_summary: '',
  })

  useEffect(() => {
    if (open && !projectId) {
      fetchProjects()
    }
  }, [open, projectId])

  useEffect(() => {
    if (projectId) {
      setFormData(prev => ({ ...prev, project_id: projectId }))
    }
  }, [projectId])

  const fetchProjects = async () => {
    try {
      const response = await apiClient.getProjects({ page: 1, limit: 100 })
      setProjects(response.projects || [])
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.request_type || !formData.project_id || !formData.title || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      
      const impactSummary = formData.impact_summary 
        ? { notes: formData.impact_summary }
        : undefined

      await apiClient.post('/approvals', {
        request_type: formData.request_type,
        project_id: formData.project_id,
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        severity: formData.severity,
        impact_summary: impactSummary,
      })

      toast.success('Approval request created successfully')
      onOpenChange(false)
      onSuccess()
      
      // Reset form
      setFormData({
        request_type: '',
        project_id: projectId || '',
        title: '',
        description: '',
        priority: 'medium',
        severity: 'medium',
        impact_summary: '',
      })
    } catch (error: any) {
      console.error('Failed to create approval request:', error)
      toast.error(error.response?.data?.message || error.message || 'Failed to create approval request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Approval Request</DialogTitle>
          <DialogDescription>
            Create a new approval request for a change that requires stakeholder approval
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="request_type">Request Type *</Label>
              <Select
                value={formData.request_type}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, request_type: value }))}
                required
              >
                <SelectTrigger id="request_type">
                  <SelectValue placeholder="Select request type" />
                </SelectTrigger>
                <SelectContent>
                  {REQUEST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!projectId && (
              <div className="space-y-2">
                <Label htmlFor="project_id">Project *</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value: string) => setFormData(prev => ({ ...prev, project_id: value }))}
                  required
                >
                  <SelectTrigger id="project_id">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief title for the approval request"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Detailed description of what requires approval"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={formData.severity}
                onValueChange={(value: string) => setFormData(prev => ({ ...prev, severity: value }))}
              >
                <SelectTrigger id="severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="impact_summary">Impact Summary (Optional)</Label>
            <Textarea
              id="impact_summary"
              value={formData.impact_summary}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, impact_summary: e.target.value }))}
              placeholder="Describe the impact of this change (budget, timeline, scope, etc.)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Approval Request'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

