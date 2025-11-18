"use client"

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { apiClient, ReviewSchedule } from '@/lib/api';
import { Loader2, Save, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewScheduleConfigProps {
  programId: string;
  schedule: ReviewSchedule | null;
  onUpdate: () => void;
}

export function ReviewScheduleConfig({ programId, schedule, onUpdate }: ReviewScheduleConfigProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formData, setFormData] = useState({
    review_type: schedule?.review_type || 'portfolio_performance' as ReviewSchedule['review_type'],
    frequency: schedule?.frequency || 'monthly' as ReviewSchedule['frequency'],
    day_of_month: schedule?.day_of_month || undefined,
    day_of_week: schedule?.day_of_week || undefined,
    duration_minutes: schedule?.duration_minutes || 60,
    auto_generate_agenda: schedule?.auto_generate_agenda !== false,
    send_reminders: schedule?.send_reminders !== false,
    reminder_days_before: schedule?.reminder_days_before || [7, 1],
    is_active: schedule?.is_active !== false,
  });

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate: must have either day_of_month or day_of_week
      if (!formData.day_of_month && !formData.day_of_week) {
        toast.error('Please specify either day of month or day of week');
        return;
      }

      await apiClient.createReviewSchedule(programId, {
        ...formData,
        review_owner_id: user?.id,
        required_attendees: schedule?.required_attendees || [],
        optional_attendees: schedule?.optional_attendees || [],
      });

      toast.success('Review schedule saved successfully');
      onUpdate();
    } catch (error: any) {
      console.error('Failed to save review schedule:', error);
      toast.error(error.message || 'Failed to save review schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleReminderDaysChange = (value: string) => {
    const days = value.split(',').map(d => parseInt(d.trim())).filter(d => !isNaN(d));
    setFormData({ ...formData, reminder_days_before: days });
  };

  const handleGenerateMeetings = async () => {
    if (!schedule) return;

    try {
      setGenerating(true);
      const response = await apiClient.generateUpcomingMeetings(programId, schedule.id, 3);
      toast.success(response.message || `Generated ${response.data.length} upcoming meetings`);
      onUpdate();
    } catch (error: any) {
      console.error('Failed to generate meetings:', error);
      toast.error(error.message || 'Failed to generate meetings');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review Schedule Configuration</CardTitle>
        <CardDescription>
          Configure the regular review cadence for this program. PMI requires monthly or quarterly reviews.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="review_type">Review Type</Label>
            <Select
              value={formData.review_type}
              onValueChange={(value) => setFormData({ ...formData, review_type: value as ReviewSchedule['review_type'] })}
            >
              <SelectTrigger id="review_type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portfolio_performance">Portfolio Performance</SelectItem>
                <SelectItem value="program_performance">Program Performance</SelectItem>
                <SelectItem value="strategic">Strategic Review</SelectItem>
                <SelectItem value="governance">Governance Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency *</Label>
            <Select
              value={formData.frequency}
              onValueChange={(value) => setFormData({ ...formData, frequency: value as ReviewSchedule['frequency'] })}
            >
              <SelectTrigger id="frequency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="bi-annually">Bi-Annually</SelectItem>
                <SelectItem value="annually">Annually</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              PMI recommends monthly for active portfolios, quarterly for stable ones
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day_of_month">Day of Month</Label>
            <Input
              id="day_of_month"
              type="number"
              min="1"
              max="31"
              value={formData.day_of_month || ''}
              onChange={(e) => setFormData({ 
                ...formData, 
                day_of_month: e.target.value ? parseInt(e.target.value) : undefined,
                day_of_week: undefined // Clear day_of_week if day_of_month is set
              })}
              placeholder="e.g., 15 (15th of month)"
            />
            <p className="text-xs text-muted-foreground">
              Leave empty if using day of week instead
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="day_of_week">Day of Week</Label>
            <Select
              value={formData.day_of_week || ''}
              onValueChange={(value) => setFormData({ 
                ...formData, 
                day_of_week: value,
                day_of_month: undefined // Clear day_of_month if day_of_week is set
              })}
            >
              <SelectTrigger id="day_of_week">
                <SelectValue placeholder="Select day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monday">Monday</SelectItem>
                <SelectItem value="tuesday">Tuesday</SelectItem>
                <SelectItem value="wednesday">Wednesday</SelectItem>
                <SelectItem value="thursday">Thursday</SelectItem>
                <SelectItem value="friday">Friday</SelectItem>
                <SelectItem value="saturday">Saturday</SelectItem>
                <SelectItem value="sunday">Sunday</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Leave empty if using day of month instead
            </p>
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
            <Label htmlFor="reminder_days">Reminder Days Before</Label>
            <Input
              id="reminder_days"
              value={formData.reminder_days_before.join(', ')}
              onChange={(e) => handleReminderDaysChange(e.target.value)}
              placeholder="e.g., 7, 1 (7 days and 1 day before)"
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of days (e.g., 7, 1)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto_generate_agenda">Auto-generate Agenda</Label>
              <p className="text-xs text-muted-foreground">
                Automatically generate agenda items for reviews
              </p>
            </div>
            <Switch
              id="auto_generate_agenda"
              checked={formData.auto_generate_agenda}
              onCheckedChange={(checked) => setFormData({ ...formData, auto_generate_agenda: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="send_reminders">Send Reminders</Label>
              <p className="text-xs text-muted-foreground">
                Send email reminders to attendees
              </p>
            </div>
            <Switch
              id="send_reminders"
              checked={formData.send_reminders}
              onCheckedChange={(checked) => setFormData({ ...formData, send_reminders: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_active">Active Schedule</Label>
              <p className="text-xs text-muted-foreground">
                Enable or disable this review schedule
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {schedule && (
            <Button 
              variant="outline" 
              onClick={handleGenerateMeetings} 
              disabled={saving || generating}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Generate Upcoming Meetings
                </>
              )}
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || generating}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Schedule
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

