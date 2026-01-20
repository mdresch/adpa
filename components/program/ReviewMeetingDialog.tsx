"use client"

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/lib/notify';
import { apiClient, ReviewMeeting, ReviewSchedule } from '@/lib/api';
import { Loader2, Save, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface ReviewMeetingDialogProps {
  programId: string;
  meeting: ReviewMeeting | null;
  schedule: ReviewSchedule | null;
  schedules?: ReviewSchedule[]; // All available schedules
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onDelete?: () => void; // Optional delete callback
}

export function ReviewMeetingDialog({
  programId,
  meeting,
  schedule,
  schedules = [],
  open,
  onOpenChange,
  onSave,
  onDelete,
}: ReviewMeetingDialogProps) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Initialize selected review type
  const [selectedReviewType, setSelectedReviewType] = useState<string>('');
  
  // Update selected review type when schedules or meeting changes
  useEffect(() => {
    if (meeting) {
      // For existing meetings, don't set review type (it's already associated)
      setSelectedReviewType('');
    } else if (schedules.length > 0) {
      // For new meetings, default to first available schedule
      setSelectedReviewType(schedules[0].review_type);
    } else if (schedule) {
      // Fallback to single schedule if available
      setSelectedReviewType(schedule.review_type);
    }
  }, [meeting, schedules, schedule]);
  // Helper function to convert date to yyyy-MM-dd format
  const formatDateForInput = (date: string | Date | undefined): string | undefined => {
    if (!date) return undefined;
    try {
      // If it's already in yyyy-MM-dd format, return as is
      if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
      }
      // Otherwise, parse and format
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return undefined;
      return format(dateObj, 'yyyy-MM-dd');
    } catch (error) {
      console.error('Error formatting date:', error);
      return undefined;
    }
  };

  const [formData, setFormData] = useState({
    scheduled_date: meeting ? formatDateForInput(meeting.scheduled_date) || format(new Date(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    actual_date: meeting ? formatDateForInput(meeting.actual_date) : undefined,
    start_time: meeting?.start_time || '09:00',
    end_time: meeting?.end_time || undefined,
    duration_minutes: meeting?.duration_minutes || schedule?.duration_minutes || 60,
    status: meeting?.status || 'scheduled' as ReviewMeeting['status'],
    notes: meeting?.notes || '',
    was_on_time: meeting?.was_on_time ?? undefined,
    was_complete: meeting?.was_complete ?? undefined,
  });

  // Update duration when review type changes
  useEffect(() => {
    if (selectedReviewType && schedules.length > 0) {
      const selectedSchedule = schedules.find(s => s.review_type === selectedReviewType);
      if (selectedSchedule && !meeting) {
        setFormData(prev => ({
          ...prev,
          duration_minutes: selectedSchedule.duration_minutes || prev.duration_minutes
        }));
      }
    }
  }, [selectedReviewType, schedules, meeting]);

  useEffect(() => {
    if (meeting) {
      setFormData({
        scheduled_date: formatDateForInput(meeting.scheduled_date) || format(new Date(), 'yyyy-MM-dd'),
        actual_date: formatDateForInput(meeting.actual_date),
        start_time: meeting.start_time || '09:00',
        end_time: meeting.end_time,
        duration_minutes: meeting.duration_minutes || 60,
        status: meeting.status,
        notes: meeting.notes || '',
        was_on_time: meeting.was_on_time,
        was_complete: meeting.was_complete,
      });
    } else {
      // Reset for new meeting
      setFormData({
        scheduled_date: format(new Date(), 'yyyy-MM-dd'),
        actual_date: undefined,
        start_time: '09:00',
        end_time: undefined,
        duration_minutes: schedule?.duration_minutes || 60,
        status: 'scheduled',
        notes: '',
        was_on_time: undefined,
        was_complete: undefined,
      });
    }
  }, [meeting, schedule]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate review type for new meetings
      if (!meeting && !selectedReviewType) {
        toast.error('Please select a review type');
        setSaving(false);
        return;
      }

      // Prepare data for API - ensure dates are in correct format
      const meetingData: any = {
        scheduled_date: formData.scheduled_date, // Already in yyyy-MM-dd format
        status: formData.status || 'scheduled',
        duration_minutes: formData.duration_minutes || 60,
      };

      // Add review_type for new meetings (required to associate with correct schedule)
      if (!meeting && selectedReviewType) {
        meetingData.review_type = selectedReviewType;
      }

      // Add optional fields only if they have values
      if (formData.actual_date) {
        meetingData.actual_date = formData.actual_date;
      }
      if (formData.start_time) {
        meetingData.start_time = formData.start_time;
      }
      if (formData.end_time) {
        meetingData.end_time = formData.end_time;
      }
      if (formData.notes) {
        meetingData.notes = formData.notes;
      }
      if (formData.was_on_time !== undefined) {
        meetingData.was_on_time = formData.was_on_time;
      }
      if (formData.was_complete !== undefined) {
        meetingData.was_complete = formData.was_complete;
      }

      if (meeting) {
        // Update existing meeting
        await apiClient.updateReviewMeeting(programId, meeting.id, meetingData);
        toast.success('Review meeting updated successfully');
      } else {
        // Create new meeting
        await apiClient.createReviewMeeting(programId, meetingData);
        toast.success('Review meeting created successfully');
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save review meeting:', error);
      
      // Extract detailed error message
      let errorMessage = 'Failed to save review meeting';
      if (error.response?.data) {
        if (error.response.data.details && Array.isArray(error.response.data.details)) {
          // Validation errors - show first error detail
          const firstError = error.response.data.details[0];
          errorMessage = `${firstError.field}: ${firstError.message}`;
        } else if (error.response.data.error?.message) {
          errorMessage = error.response.data.error.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!meeting) return;

    // Confirm deletion
    if (!confirm('Are you sure you want to delete this review meeting? This action cannot be undone and will also delete all associated decisions and action items.')) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.deleteReviewMeeting(programId, meeting.id);
      toast.success('Review meeting deleted successfully');
      onOpenChange(false);
      if (onDelete) {
        onDelete();
      } else {
        onSave(); // Refresh the list
      }
    } catch (error: any) {
      console.error('Failed to delete review meeting:', error);
      let errorMessage = 'Failed to delete review meeting';
      if (error.response?.data?.error?.message) {
        errorMessage = error.response.data.error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const calculateEndTime = () => {
    if (formData.start_time && formData.duration_minutes) {
      const [hours, minutes] = formData.start_time.split(':').map(Number);
      const startDate = new Date();
      startDate.setHours(hours, minutes, 0, 0);
      startDate.setMinutes(startDate.getMinutes() + formData.duration_minutes);
      return format(startDate, 'HH:mm');
    }
    return undefined;
  };

  useEffect(() => {
    if (formData.start_time && formData.duration_minutes && !formData.end_time) {
      const endTime = calculateEndTime();
      if (endTime) {
        setFormData(prev => ({ ...prev, end_time: endTime }));
      }
    }
  }, [formData.start_time, formData.duration_minutes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {meeting ? 'Edit Review Meeting' : 'Schedule Review Meeting'}
          </DialogTitle>
          <DialogDescription>
            {meeting
              ? 'Update review meeting details and outcomes'
              : 'Create a new review meeting for this program'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Review Type Selection (only for new meetings) */}
          {!meeting && (
            <div className="space-y-2">
              <Label htmlFor="review_type">Review Type *</Label>
              {schedules.length > 0 ? (
                <>
                  <Select
                    value={selectedReviewType}
                    onValueChange={(value: string) => {
                      setSelectedReviewType(value);
                      // Update duration when review type changes
                      const selectedSchedule = schedules.find(s => s.review_type === value);
                      if (selectedSchedule) {
                        setFormData(prev => ({
                          ...prev,
                          duration_minutes: selectedSchedule.duration_minutes || prev.duration_minutes
                        }));
                      }
                    }}
                    required
                  >
                    <SelectTrigger id="review_type" className="w-full">
                      <SelectValue placeholder="Select review type">
                        {selectedReviewType && schedules.find(s => s.review_type === selectedReviewType) && (
                          <span>
                            {schedules.find(s => s.review_type === selectedReviewType)!.review_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                            {' '}({schedules.find(s => s.review_type === selectedReviewType)!.frequency})
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {schedules.map((sched) => (
                        <SelectItem key={sched.id} value={sched.review_type}>
                          {sched.review_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} 
                          {' '}({sched.frequency})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select which review schedule this meeting belongs to. Each review type is tracked separately for compliance.
                  </p>
                </>
              ) : (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium mb-1">
                    ⚠️ No review schedules configured
                  </p>
                  <p className="text-xs text-yellow-700">
                    Please configure a review schedule first in the Schedule tab before scheduling meetings.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_date">Scheduled Date *</Label>
              <Input
                id="scheduled_date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="actual_date">Actual Date</Label>
              <Input
                id="actual_date"
                type="date"
                value={formData.actual_date || ''}
                onChange={(e) => setFormData({ ...formData, actual_date: e.target.value || undefined })}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty if meeting hasn't occurred yet
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time || ''}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value || undefined })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration_minutes">Duration (minutes)</Label>
              <Input
                id="duration_minutes"
                type="number"
                min="15"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: string) => setFormData({ ...formData, status: value as ReviewMeeting['status'] })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="postponed">Postponed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              placeholder="Meeting notes, outcomes, key discussion points..."
            />
          </div>

          {formData.status === 'completed' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="was_on_time">Was On Time</Label>
                  <p className="text-xs text-muted-foreground">
                    Was the review held on the scheduled date?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={formData.was_on_time === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, was_on_time: false })}
                  >
                    No
                  </Button>
                  <Button
                    variant={formData.was_on_time === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, was_on_time: true })}
                  >
                    Yes
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="was_complete">Was Complete</Label>
                  <p className="text-xs text-muted-foreground">
                    Were all agenda items covered?
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={formData.was_complete === false ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, was_complete: false })}
                  >
                    No
                  </Button>
                  <Button
                    variant={formData.was_complete === true ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, was_complete: true })}
                  >
                    Yes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            {meeting && (
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={saving || deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </>
                )}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || deleting}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || deleting || (!meeting && !selectedReviewType)}
                title={!meeting && !selectedReviewType ? 'Please select a review type' : ''}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {meeting ? 'Update' : 'Create'} Meeting
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

