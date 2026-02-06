'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api'
import { toast } from '@/lib/notify'

// This should match the interface in LessonsTab.tsx, but is redefined here for modularity
interface LessonItem {
  id?: string
  title: string
  description: string
  category: string
  impact: 'low' | 'medium' | 'high' | 'critical'
  positive_or_negative: boolean
  status: 'identified' | 'documented' | 'shared' | 'applied' | 'archived'
  severity: 'low' | 'medium' | 'high' | 'critical'
  phase: string
  date_identified?: string
  shared_with_org: boolean
}

interface LessonDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (lesson: LessonItem) => void
  projectId: string
  lesson?: LessonItem | null
}

const initialState: Omit<LessonItem, 'id'> = {
  title: '',
  description: '',
  category: '',
  impact: 'medium',
  positive_or_negative: true,
  status: 'identified',
  severity: 'medium',
  phase: '',
  shared_with_org: false,
};

export default function LessonDialog({ isOpen, onClose, onSave, projectId, lesson }: LessonDialogProps) {
  const [formData, setFormData] = useState(initialState);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (lesson) {
      setFormData({
        title: lesson.title,
        description: lesson.description,
        category: lesson.category,
        impact: lesson.impact,
        positive_or_negative: lesson.positive_or_negative,
        status: lesson.status || 'identified',
        severity: lesson.severity || 'medium',
        phase: lesson.phase || '',
        shared_with_org: lesson.shared_with_org || false,
      });
    } else {
      setFormData(initialState);
    }
  }, [lesson, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleBooleanChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value === 'true' }));
  };

  const handleSubmit = async () => {
    try {
      setIsSaving(true);
      const payload = { ...formData, project_id: projectId };
      let response: { success: boolean; data?: any; error?: string };

      if (lesson?.id) {
        // Update existing lesson
        response = await apiClient.put(`lessons/lessons/${lesson.id}`, payload);
      } else {
        // Create new lesson
        response = await apiClient.post(`lessons/projects/${projectId}/lessons`, payload);
      }

      if (response && response.success) {
        toast.success(`Lesson ${lesson?.id ? 'updated' : 'created'} successfully`);
        onSave(response.data);
        onClose();
      } else {
        throw new Error(response?.error || 'Failed to save lesson');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      toast.error(`Failed to save lesson: ${errorMessage}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Edit Lesson' : 'Create New Lesson'}</DialogTitle>
          <DialogDescription>
            Document a valuable experience to improve future project outcomes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input id="title" name="title" value={formData.title} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Textarea id="description" name="description" value={formData.description} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Input id="category" name="category" value={formData.category} onChange={handleChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="impact" className="text-right">
              Impact
            </Label>
            <Select name="impact" value={formData.impact} onValueChange={(value: string) => handleSelectChange('impact', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select impact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="severity" className="text-right">
              Severity
            </Label>
            <Select name="severity" value={formData.severity} onValueChange={(value: string) => handleSelectChange('severity', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select name="status" value={formData.status} onValueChange={(value: string) => handleSelectChange('status', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="identified">Identified</SelectItem>
                <SelectItem value="documented">Documented</SelectItem>
                <SelectItem value="shared">Shared</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="phase" className="text-right">
              Phase
            </Label>
            <Input id="phase" name="phase" value={formData.phase} onChange={handleChange} className="col-span-3" placeholder="e.g. Planning, Execution" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="shared_with_org" className="text-right">
              Shared
            </Label>
            <div className="flex items-center space-x-2 col-span-3">
              <input
                type="checkbox"
                id="shared_with_org"
                name="shared_with_org"
                checked={formData.shared_with_org}
                onChange={(e) => setFormData(prev => ({ ...prev, shared_with_org: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="shared_with_org" className="text-sm text-gray-700">Share with organization</label>
            </div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="positive_or_negative" className="text-right">
              Outcome
            </Label>
            <Select name="positive_or_negative" value={String(formData.positive_or_negative)} onValueChange={(value: string) => handleBooleanChange('positive_or_negative', value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select outcome" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Positive</SelectItem>
                <SelectItem value="false">Negative</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Lesson'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog >
  );
}
