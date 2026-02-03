"use client"

import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, TrendingUp, AlertCircle, CheckCircle, BarChart3, Clock } from "lucide-react"
import { cn } from "@/lib/utils"

interface PerformanceActual {
  id: string
  entity_type: 'milestone' | 'deliverable' | 'activity' | 'phase' | 'resource'
  entity_name: string
  planned_start_date: string | null
  actual_start_date: string | null
  planned_end_date: string | null
  actual_end_date: string | null
  planned_cost: number | null
  actual_cost: number | null
  planned_progress_percent: number | null
  actual_progress_percent: number | null
  quality_score: number | null
  defects_found: number | null
  rework_hours: number | null
  notes: string | null
}

interface PerformanceEntryDialogProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingActual?: PerformanceActual | null
}

export function PerformanceEntryDialog({ 
  projectId, 
  isOpen, 
  onClose, 
  onSuccess,
  editingActual 
}: PerformanceEntryDialogProps) {
  const [formData, setFormData] = useState<{
    entity_type: 'milestone' | 'deliverable' | 'activity' | 'phase' | 'resource'
    entity_name: string
    planned_start_date: string
    actual_start_date: string
    planned_end_date: string
    actual_end_date: string
    planned_cost: string
    actual_cost: string
    planned_progress_percent: string
    actual_progress_percent: string
    quality_score: string
    defects_found: string
    rework_hours: string
    notes: string
  }>({
    entity_type: 'milestone',
    entity_name: '',
    planned_start_date: '',
    actual_start_date: '',
    planned_end_date: '',
    actual_end_date: '',
    planned_cost: '',
    actual_cost: '',
    planned_progress_percent: '',
    actual_progress_percent: '',
    quality_score: '',
    defects_found: '',
    rework_hours: '',
    notes: ''
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize form when editingActual changes
  useEffect(() => {
    if (editingActual) {
      setFormData({
        entity_type: editingActual.entity_type,
        entity_name: editingActual.entity_name,
        planned_start_date: editingActual.planned_start_date ? editingActual.planned_start_date.split('T')[0] : '',
        actual_start_date: editingActual.actual_start_date ? editingActual.actual_start_date.split('T')[0] : '',
        planned_end_date: editingActual.planned_end_date ? editingActual.planned_end_date.split('T')[0] : '',
        actual_end_date: editingActual.actual_end_date ? editingActual.actual_end_date.split('T')[0] : '',
        planned_cost: editingActual.planned_cost?.toString() || '',
        actual_cost: editingActual.actual_cost?.toString() || '',
        planned_progress_percent: editingActual.planned_progress_percent?.toString() || '',
        actual_progress_percent: editingActual.actual_progress_percent?.toString() || '',
        quality_score: editingActual.quality_score?.toString() || '',
        defects_found: editingActual.defects_found?.toString() || '',
        rework_hours: editingActual.rework_hours?.toString() || '',
        notes: editingActual.notes || ''
      })
    } else {
      // Reset form for new entry
      setFormData({
        entity_type: 'milestone',
        entity_name: '',
        planned_start_date: '',
        actual_start_date: '',
        planned_end_date: '',
        actual_end_date: '',
        planned_cost: '',
        actual_cost: '',
        planned_progress_percent: '',
        actual_progress_percent: '',
        quality_score: '',
        defects_found: '',
        rework_hours: '',
        notes: ''
      })
    }
    setError(null)
  }, [editingActual, isOpen])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.entity_name.trim()) {
      setError('Entity name is required')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Prepare submission data
      const submissionData: any = {
        entity_type: formData.entity_type,
        entity_name: formData.entity_name.trim(),
        notes: formData.notes.trim() || null
      }

      // Add only non-empty fields
      if (formData.planned_start_date) submissionData.planned_start_date = formData.planned_start_date
      if (formData.actual_start_date) submissionData.actual_start_date = formData.actual_start_date
      if (formData.planned_end_date) submissionData.planned_end_date = formData.planned_end_date
      if (formData.actual_end_date) submissionData.actual_end_date = formData.actual_end_date
      if (formData.planned_cost) submissionData.planned_cost = parseFloat(formData.planned_cost)
      if (formData.actual_cost) submissionData.actual_cost = parseFloat(formData.actual_cost)
      if (formData.planned_progress_percent) submissionData.planned_progress_percent = parseFloat(formData.planned_progress_percent)
      if (formData.actual_progress_percent) submissionData.actual_progress_percent = parseFloat(formData.actual_progress_percent)
      if (formData.quality_score) submissionData.quality_score = parseFloat(formData.quality_score)
      if (formData.defects_found) submissionData.defects_found = parseInt(formData.defects_found)
      if (formData.rework_hours) submissionData.rework_hours = parseFloat(formData.rework_hours)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/performance-actuals/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submissionData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save performance actual')
      }

      onSuccess()
      onClose()
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save performance actual')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {editingActual ? (
              <>
                <BarChart3 className="h-5 w-5" />
                Edit Performance Actual
              </>
            ) : (
              <>
                <TrendingUp className="h-5 w-5" />
                Add Performance Actual
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {editingActual 
              ? `Update performance data for "${editingActual.entity_name}"`
              : 'Add new performance actual. Only fill in the fields you have data for.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entity Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Entity Information</h4>
              
              <div>
                <label className="block text-sm font-medium mb-2">Entity Type *</label>
                <select
                  value={formData.entity_type}
                  onChange={(e) => handleInputChange('entity_type', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="milestone">Milestone</option>
                  <option value="deliverable">Deliverable</option>
                  <option value="activity">Activity</option>
                  <option value="phase">Phase</option>
                  <option value="resource">Resource</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Entity Name *</label>
                <input
                  type="text"
                  value={formData.entity_name}
                  onChange={(e) => handleInputChange('entity_name', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="e.g., Testing Complete"
                  required
                />
              </div>
            </div>
            
            {/* Schedule Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Schedule</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Planned Start</label>
                  <input
                    type="date"
                    value={formData.planned_start_date}
                    onChange={(e) => handleInputChange('planned_start_date', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Actual Start</label>
                  <input
                    type="date"
                    value={formData.actual_start_date}
                    onChange={(e) => handleInputChange('actual_start_date', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Planned End</label>
                  <input
                    type="date"
                    value={formData.planned_end_date}
                    onChange={(e) => handleInputChange('planned_end_date', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Actual End</label>
                  <input
                    type="date"
                    value={formData.actual_end_date}
                    onChange={(e) => handleInputChange('actual_end_date', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Cost Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Cost</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Planned Cost ($)</label>
                  <input
                    type="number"
                    value={formData.planned_cost}
                    onChange={(e) => handleInputChange('planned_cost', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Actual Cost ($)</label>
                  <input
                    type="number"
                    value={formData.actual_cost}
                    onChange={(e) => handleInputChange('actual_cost', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
            
            {/* Progress Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Progress</h4>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Planned Progress (%)</label>
                  <input
                    type="number"
                    value={formData.planned_progress_percent}
                    onChange={(e) => handleInputChange('planned_progress_percent', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Actual Progress (%)</label>
                  <input
                    type="number"
                    value={formData.actual_progress_percent}
                    onChange={(e) => handleInputChange('actual_progress_percent', e.target.value)}
                    className="w-full p-2 border rounded-md"
                    placeholder="0-100"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quality Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Quality</h4>
              
              <div>
                <label className="block text-sm font-medium mb-2">Quality Score (1-10)</label>
                <input
                  type="number"
                  value={formData.quality_score}
                  onChange={(e) => handleInputChange('quality_score', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="1-10"
                  min="1"
                  max="10"
                  step="0.1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Defects Found</label>
                <input
                  type="number"
                  value={formData.defects_found}
                  onChange={(e) => handleInputChange('defects_found', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Rework Hours</label>
                <input
                  type="number"
                  value={formData.rework_hours}
                  onChange={(e) => handleInputChange('rework_hours', e.target.value)}
                  className="w-full p-2 border rounded-md"
                  placeholder="0.0"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            
            {/* Notes */}
            <div className="md:col-span-2 space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground">Notes</h4>
              <textarea
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                className="w-full p-2 border rounded-md"
                rows={4}
                placeholder="Additional context or notes about this performance actual..."
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {editingActual ? 'Updating...' : 'Adding...'}
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {editingActual ? 'Update' : 'Add'} Performance Actual
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
