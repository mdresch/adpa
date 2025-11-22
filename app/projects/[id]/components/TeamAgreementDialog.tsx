"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { apiClient } from "@/lib/api"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"
import type { ProjectTeamMember } from "./team-agreements.types"

interface TeamAgreement {
  id: string
  project_id: string
  title: string
  description: string
  category: 
    | 'working_hours'
    | 'communication'
    | 'decision_making'
    | 'conflict_resolution'
    | 'quality_standards'
    | 'meeting_norms'
    | 'code_of_conduct'
    | 'collaboration_tools'
    | 'response_times'
    | 'knowledge_sharing'
    | 'other'
  agreed_by?: string[]
  facilitated_by?: string
  effective_date: string
  review_frequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly' | 'annually' | 'as_needed'
  next_review_date?: string
  status: 'draft' | 'active' | 'under_review' | 'revised' | 'deprecated'
  adherence_score?: number
  violations_count?: number
  notes?: string
}

interface TeamAgreementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  agreement?: TeamAgreement | null
  teamMembers: ProjectTeamMember[]
  teamMembersLoading?: boolean
  onSuccess: () => void
}

export function TeamAgreementDialog({
  open,
  onOpenChange,
  projectId,
  agreement,
  teamMembers,
  teamMembersLoading = false,
  onSuccess
}: TeamAgreementDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'other' as TeamAgreement['category'],
    effective_date: new Date().toISOString().split('T')[0],
    review_frequency: '' as TeamAgreement['review_frequency'] | '',
    next_review_date: '',
    status: 'active' as TeamAgreement['status'],
    notes: '',
    agreed_by: [] as string[],
    facilitated_by: ''
  })

  useEffect(() => {
    if (agreement) {
      setFormData({
        title: agreement.title || '',
        description: agreement.description || '',
        category: agreement.category || 'other',
        effective_date: agreement.effective_date ? new Date(agreement.effective_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        review_frequency: agreement.review_frequency || '',
        next_review_date: agreement.next_review_date ? new Date(agreement.next_review_date).toISOString().split('T')[0] : '',
        status: agreement.status || 'active',
        notes: agreement.notes || '',
        agreed_by: agreement.agreed_by || [],
        facilitated_by: agreement.facilitated_by || ''
      })
    } else {
      setFormData({
        title: '',
        description: '',
        category: 'other',
        effective_date: new Date().toISOString().split('T')[0],
        review_frequency: '',
        next_review_date: '',
        status: 'active',
        notes: '',
        agreed_by: [],
        facilitated_by: ''
      })
    }
  }, [agreement, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)

      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        effective_date: new Date(formData.effective_date).toISOString(),
        status: formData.status,
        agreed_by: formData.agreed_by,
        facilitated_by: formData.facilitated_by || null
      }

      if (!agreement) {
        payload.project_id = projectId
      }

      // Only include optional fields if they have values
      if (formData.review_frequency && formData.review_frequency !== '') {
        payload.review_frequency = formData.review_frequency
      }
      if (formData.next_review_date && formData.next_review_date !== '') {
        payload.next_review_date = new Date(formData.next_review_date).toISOString()
      }
      if (formData.notes && formData.notes.trim() !== '') {
        payload.notes = formData.notes
      }

      if (agreement) {
        // Update existing agreement
        const response = await apiClient.put<{
          success: boolean
          data: TeamAgreement
        }>(`/team-agreements/${agreement.id}`, payload)

        if (response.success) {
          toast.success('Team agreement updated successfully')
          onSuccess()
          onOpenChange(false)
        } else {
          throw new Error('Failed to update agreement')
        }
      } else {
        // Create new agreement
        const response = await apiClient.post<{
          success: boolean
          data: TeamAgreement
        }>('/team-agreements', payload)

        if (response.success) {
          toast.success('Team agreement created successfully')
          onSuccess()
          onOpenChange(false)
        } else {
          throw new Error('Failed to create agreement')
        }
      }
    } catch (error: unknown) {
      console.error('Error saving agreement:', error)
      const message = error instanceof Error ? error.message : 'Failed to save team agreement'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {agreement ? 'Edit Team Agreement' : 'Create Team Agreement'}
          </DialogTitle>
          <DialogDescription>
            {agreement ? 'Update the team agreement details' : 'Add a new team working agreement or norm'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Core Working Hours"
              required
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the agreement in detail..."
              required
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value as TeamAgreement['category'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="working_hours">Working Hours</SelectItem>
                  <SelectItem value="communication">Communication</SelectItem>
                  <SelectItem value="decision_making">Decision Making</SelectItem>
                  <SelectItem value="conflict_resolution">Conflict Resolution</SelectItem>
                  <SelectItem value="quality_standards">Quality Standards</SelectItem>
                  <SelectItem value="meeting_norms">Meeting Norms</SelectItem>
                  <SelectItem value="code_of_conduct">Code of Conduct</SelectItem>
                  <SelectItem value="collaboration_tools">Collaboration Tools</SelectItem>
                  <SelectItem value="response_times">Response Times</SelectItem>
                  <SelectItem value="knowledge_sharing">Knowledge Sharing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as TeamAgreement['status'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_review">Under Review</SelectItem>
                  <SelectItem value="revised">Revised</SelectItem>
                  <SelectItem value="deprecated">Deprecated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="effective_date">Effective Date *</Label>
              <Input
                id="effective_date"
                type="date"
                value={formData.effective_date}
                onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="review_frequency">Review Frequency</Label>
              <Select
                value={formData.review_frequency || ''}
                onValueChange={(value) => setFormData({ ...formData, review_frequency: (value || '') as TeamAgreement['review_frequency'] | '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi_weekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annually">Annually</SelectItem>
                  <SelectItem value="as_needed">As Needed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.review_frequency && (
            <div className="space-y-2">
              <Label htmlFor="next_review_date">Next Review Date</Label>
              <Input
                id="next_review_date"
                type="date"
                value={formData.next_review_date}
                onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Agreed By</Label>
            {teamMembersLoading ? (
              <p className="text-sm text-muted-foreground">Loading team members…</p>
            ) : teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                Add team members to the project to assign agreement participants.
              </p>
            ) : (
              <>
                <ScrollArea className="max-h-48 border rounded-md">
                  <div className="divide-y">
                    {teamMembers.map((member) => {
                      const checked = formData.agreed_by.includes(member.id)
                      return (
                        <label key={member.id} className="flex items-start gap-2 px-3 py-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(value) => {
                              const isChecked = value === true
                              setFormData((prev) => ({
                                ...prev,
                                agreed_by: isChecked
                                  ? [...prev.agreed_by, member.id]
                                  : prev.agreed_by.filter((id) => id !== member.id)
                              }))
                            }}
                          />
                          <div>
                            <p className="font-medium text-foreground">
                              {member.name || member.email || 'Unnamed user'}
                            </p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground">{member.email}</p>
                            )}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </ScrollArea>
                {formData.agreed_by.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {formData.agreed_by.map((id) => {
                      const member = teamMembers.find((m) => m.id === id)
                      return (
                        <Badge key={id} variant="secondary">
                          {member?.name || member?.email || id}
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="facilitated_by">Facilitated By</Label>
            <Select
              value={formData.facilitated_by}
              onValueChange={(value) => setFormData({ ...formData, facilitated_by: value })}
              disabled={teamMembersLoading || teamMembers.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={teamMembers.length === 0 ? "Add team members to enable" : "Select facilitator"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {teamMembers.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name || member.email || member.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamMembers.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add project team members to assign a facilitator.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes or context..."
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
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {agreement ? 'Update' : 'Create'} Agreement
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

