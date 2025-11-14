"use client"

/**
 * Key Result Dialog Component
 * Create and edit key result form
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
import { apiClient } from '@/lib/api'
import { toast } from 'sonner'

interface KeyResult {
  id: string
  okr_id: string
  key_result_title: string
  key_result_description?: string | null
  metric_name?: string | null
  metric_unit?: string | null
  baseline_value?: number | null
  target_value: number
  current_value: number
  stretch_target?: number | null
  progress_percentage?: number | null
  progress_status?: 'not-started' | 'in-progress' | 'achieved' | 'at-risk' | 'behind' | null
  measurement_frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | null
  next_measurement_date?: string | null
  owner_id?: string | null
  contributing_projects?: string[] | null
}

interface KeyResultDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  okrId: string
  keyResult?: KeyResult | null
  onSaved: () => void
}

export function KeyResultDialog({ open, onOpenChange, okrId, keyResult, onSaved }: KeyResultDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    key_result_title: '',
    key_result_description: '',
    metric_name: '',
    metric_unit: 'count' as 'count' | 'percentage' | 'dollars' | 'days' | string,
    baseline_value: '',
    target_value: '',
    current_value: '',
    stretch_target: '',
    measurement_frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'quarterly' | undefined,
    next_measurement_date: '',
  })

  useEffect(() => {
    if (keyResult) {
      setFormData({
        key_result_title: keyResult.key_result_title || '',
        key_result_description: keyResult.key_result_description || '',
        metric_name: keyResult.metric_name || '',
        metric_unit: keyResult.metric_unit || 'count',
        baseline_value: keyResult.baseline_value?.toString() || '',
        target_value: keyResult.target_value?.toString() || '',
        current_value: keyResult.current_value?.toString() || '',
        stretch_target: keyResult.stretch_target?.toString() || '',
        measurement_frequency: keyResult.measurement_frequency || 'monthly',
        next_measurement_date: keyResult.next_measurement_date ? keyResult.next_measurement_date.split('T')[0] : '',
      })
    } else {
      // Reset form for new key result
      setFormData({
        key_result_title: '',
        key_result_description: '',
        metric_name: '',
        metric_unit: 'count',
        baseline_value: '',
        target_value: '',
        current_value: '',
        stretch_target: '',
        measurement_frequency: 'monthly',
        next_measurement_date: '',
      })
    }
  }, [keyResult, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload: any = {
        key_result_title: formData.key_result_title,
        target_value: parseFloat(formData.target_value),
      }

      if (formData.key_result_description) {
        payload.key_result_description = formData.key_result_description
      }
      if (formData.metric_name) {
        payload.metric_name = formData.metric_name
      }
      if (formData.metric_unit) {
        payload.metric_unit = formData.metric_unit
      }
      if (formData.baseline_value) {
        payload.baseline_value = parseFloat(formData.baseline_value)
      }
      if (formData.current_value) {
        payload.current_value = parseFloat(formData.current_value)
      }
      if (formData.stretch_target) {
        payload.stretch_target = parseFloat(formData.stretch_target)
      }
      if (formData.measurement_frequency) {
        payload.measurement_frequency = formData.measurement_frequency
      }
      if (formData.next_measurement_date) {
        payload.next_measurement_date = formData.next_measurement_date
      }

      let response
      if (keyResult) {
        response = await apiClient.put(`/okrs/key-results/${keyResult.id}`, payload)
      } else {
        response = await apiClient.post(`/okrs/${okrId}/key-results`, payload)
      }

      if (response && response.success) {
        toast.success(keyResult ? 'Key result updated successfully' : 'Key result created successfully')
        onSaved()
      } else {
        throw new Error(response?.error || 'Failed to save key result')
      }
    } catch (error: any) {
      console.error('Failed to save key result:', error)
      toast.error(error.message || 'Failed to save key result')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{keyResult ? 'Edit Key Result' : 'Create New Key Result'}</DialogTitle>
          <DialogDescription>
            Define a measurable outcome that proves the objective is achieved
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key_result_title">Key Result Title *</Label>
            <Input
              id="key_result_title"
              value={formData.key_result_title}
              onChange={(e) => setFormData({ ...formData, key_result_title: e.target.value })}
              placeholder="e.g., Achieve 10,000 enterprise customers"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="key_result_description">Description</Label>
            <Textarea
              id="key_result_description"
              value={formData.key_result_description}
              onChange={(e) => setFormData({ ...formData, key_result_description: e.target.value })}
              placeholder="Describe what success looks like..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="metric_name">Metric Name</Label>
              <Input
                id="metric_name"
                value={formData.metric_name}
                onChange={(e) => setFormData({ ...formData, metric_name: e.target.value })}
                placeholder="e.g., Enterprise Customers"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="metric_unit">Metric Unit</Label>
              <Select
                value={formData.metric_unit}
                onValueChange={(value) => setFormData({ ...formData, metric_unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="count">Count</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="dollars">Dollars</SelectItem>
                  <SelectItem value="days">Days</SelectItem>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseline_value">Baseline Value</Label>
              <Input
                id="baseline_value"
                type="number"
                step="any"
                value={formData.baseline_value}
                onChange={(e) => setFormData({ ...formData, baseline_value: e.target.value })}
                placeholder="Starting point"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target_value">Target Value *</Label>
              <Input
                id="target_value"
                type="number"
                step="any"
                value={formData.target_value}
                onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                placeholder="Goal to achieve"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="current_value">Current Value</Label>
              <Input
                id="current_value"
                type="number"
                step="any"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: e.target.value })}
                placeholder="Current progress"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stretch_target">Stretch Target</Label>
              <Input
                id="stretch_target"
                type="number"
                step="any"
                value={formData.stretch_target}
                onChange={(e) => setFormData({ ...formData, stretch_target: e.target.value })}
                placeholder="Aspirational goal"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="measurement_frequency">Measurement Frequency</Label>
              <Select
                value={formData.measurement_frequency}
                onValueChange={(value: any) => setFormData({ ...formData, measurement_frequency: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_measurement_date">Next Measurement Date</Label>
              <Input
                id="next_measurement_date"
                type="date"
                value={formData.next_measurement_date}
                onChange={(e) => setFormData({ ...formData, next_measurement_date: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : keyResult ? 'Update Key Result' : 'Create Key Result'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

