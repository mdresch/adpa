"use client"

/**
 * OKR Dialog Component
 * Create and edit OKR form
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface OKR {
  id: string
  organization_id?: string | null
  strategic_goal_id?: string | null
  parent_okr_id?: string | null
  level: 'organization' | 'portfolio' | 'program' | 'project'
  entity_id?: string | null
  entity_type?: 'program' | 'project' | null
  objective_title: string
  objective_description?: string | null
  objective_category?: 'strategic' | 'operational' | 'innovation' | null
  okr_period?: string | null
  period_start?: string | null
  period_end?: string | null
  owner_id?: string | null
  owner_name?: string | null
  owner_role?: string | null
  confidence_level?: number | null
  progress_percentage?: number | null
  status?: 'on-track' | 'at-risk' | 'behind' | 'achieved' | 'not-started' | null
  is_stretch_goal: boolean
  priority?: 'critical' | 'high' | 'medium' | 'low' | null
  created_at: string
  updated_at: string
}

interface OKRDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  okr?: OKR | null
  onSaved: () => void
}

export function OKRDialog({ open, onOpenChange, okr, onSaved }: OKRDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    objective_title: '',
    objective_description: '',
    level: 'organization' as 'organization' | 'portfolio' | 'program' | 'project',
    okr_period: '',
    period_start: '',
    period_end: '',
    owner_name: '',
    owner_role: '',
    confidence_level: '',
    is_stretch_goal: false,
    priority: 'medium' as 'critical' | 'high' | 'medium' | 'low',
    objective_category: 'strategic' as 'strategic' | 'operational' | 'innovation' | undefined,
  })

  useEffect(() => {
    if (okr) {
      setFormData({
        objective_title: okr.objective_title || '',
        objective_description: okr.objective_description || '',
        level: okr.level,
        okr_period: okr.okr_period || '',
        period_start: okr.period_start ? okr.period_start.split('T')[0] : '',
        period_end: okr.period_end ? okr.period_end.split('T')[0] : '',
        owner_name: okr.owner_name || '',
        owner_role: okr.owner_role || '',
        confidence_level: okr.confidence_level?.toString() || '',
        is_stretch_goal: okr.is_stretch_goal || false,
        priority: okr.priority || 'medium',
        objective_category: okr.objective_category || 'strategic',
      })
    } else {
      // Reset form for new OKR
      setFormData({
        objective_title: '',
        objective_description: '',
        level: 'organization',
        okr_period: '',
        period_start: '',
        period_end: '',
        owner_name: '',
        owner_role: '',
        confidence_level: '',
        is_stretch_goal: false,
        priority: 'medium',
        objective_category: 'strategic',
      })
    }
  }, [okr, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        objective_title: formData.objective_title,
        level: formData.level,
        objective_category: formData.objective_category,
        priority: formData.priority,
        is_stretch_goal: formData.is_stretch_goal,
      }

      if (formData.objective_description) {
        payload.objective_description = formData.objective_description
      }
      if (formData.okr_period) {
        payload.okr_period = formData.okr_period
      }
      if (formData.period_start) {
        payload.period_start = formData.period_start
      }
      if (formData.period_end) {
        payload.period_end = formData.period_end
      }
      if (formData.owner_name) {
        payload.owner_name = formData.owner_name
      }
      if (formData.owner_role) {
        payload.owner_role = formData.owner_role
      }
      if (formData.confidence_level) {
        payload.confidence_level = parseInt(formData.confidence_level, 10)
      }

      let response
      if (okr) {
        response = await apiClient.put(`/okrs/${okr.id}`, payload)
      } else {
        response = await apiClient.post('/okrs', payload)
      }

      if (response && response.success) {
        toast.success(okr ? 'OKR updated successfully' : 'OKR created successfully')
        onSaved()
      } else {
        throw new Error(response?.error || 'Failed to save OKR')
      }
    } catch (error: any) {
      console.error('Failed to save OKR:', error)
      toast.error(error.message || 'Failed to save OKR')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{okr ? 'Edit OKR' : 'Create New OKR'}</DialogTitle>
          <DialogDescription>
            {okr ? 'Update the objective and key results' : 'Define a new objective and its key results'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="objective_title">Objective Title *</Label>
            <Input
              id="objective_title"
              value={formData.objective_title}
              onChange={(e) => setFormData({ ...formData, objective_title: e.target.value })}
              placeholder="e.g., Become the leader in AI-powered document management"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="objective_description">Description</Label>
            <Textarea
              id="objective_description"
              value={formData.objective_description}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, objective_description: e.target.value })}
              placeholder="Describe what you want to achieve..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="level">Level *</Label>
              <Select
                value={formData.level}
                onValueChange={(value: any) => setFormData({ ...formData, level: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="program">Program</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="objective_category">Category</Label>
              <Select
                value={formData.objective_category}
                onValueChange={(value: any) => setFormData({ ...formData, objective_category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategic">Strategic</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="innovation">Innovation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="okr_period">Period</Label>
              <Input
                id="okr_period"
                value={formData.okr_period}
                onChange={(e) => setFormData({ ...formData, okr_period: e.target.value })}
                placeholder="e.g., Q1-2026, Annual-2026"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value: any) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period_start">Start Date</Label>
              <Input
                id="period_start"
                type="date"
                value={formData.period_start}
                onChange={(e) => setFormData({ ...formData, period_start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="period_end">End Date</Label>
              <Input
                id="period_end"
                type="date"
                value={formData.period_end}
                onChange={(e) => setFormData({ ...formData, period_end: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="owner_name">Owner Name</Label>
              <Input
                id="owner_name"
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="e.g., John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="owner_role">Owner Role</Label>
              <Input
                id="owner_role"
                value={formData.owner_role}
                onChange={(e) => setFormData({ ...formData, owner_role: e.target.value })}
                placeholder="e.g., CEO"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confidence_level">Confidence Level (0-100)</Label>
            <Input
              id="confidence_level"
              type="number"
              min="0"
              max="100"
              value={formData.confidence_level}
              onChange={(e) => setFormData({ ...formData, confidence_level: e.target.value })}
              placeholder="e.g., 65"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_stretch_goal"
              checked={formData.is_stretch_goal}
              onCheckedChange={(checked: boolean) => setFormData({ ...formData, is_stretch_goal: checked })}
            />
            <Label htmlFor="is_stretch_goal" className="cursor-pointer">
              Stretch Goal (aspirational target)
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : okr ? 'Update OKR' : 'Create OKR'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

