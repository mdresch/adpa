"use client"

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Settings,
  TrendingUp,
  FileText,
  Loader2
} from 'lucide-react';
import { toast } from '@/lib/notify';
import { apiClient, ReviewSchedule, ReviewMeeting, ReviewCompliance } from '@/lib/api';
import { ReviewScheduleConfig } from './ReviewScheduleConfig';
import { ReviewCalendar } from './ReviewCalendar';
import { ReviewComplianceDashboard } from './ReviewComplianceDashboard';
import { ReviewMeetingDialog } from './ReviewMeetingDialog';

interface ReviewSchedulingTabProps {
  programId: string;
}

export function ReviewSchedulingTab({ programId }: ReviewSchedulingTabProps) {
  const [schedule, setSchedule] = useState<ReviewSchedule | null>(null);
  const [allSchedules, setAllSchedules] = useState<ReviewSchedule[]>([]);
  const [meetings, setMeetings] = useState<ReviewMeeting[]>([]);
  const [compliance, setCompliance] = useState<ReviewCompliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('schedule');
  const [meetingDialogOpen, setMeetingDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ReviewMeeting | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch schedule (try portfolio_performance first, but any schedule will work)
      const scheduleResponse = await apiClient.getReviewSchedule(programId, 'portfolio_performance');
      setSchedule(scheduleResponse.data);

      // Fetch all schedules for the program (by trying each review type)
      const reviewTypes = ['portfolio_performance', 'program_performance', 'strategic', 'governance'];
      const schedulesPromises = reviewTypes.map(type => 
        apiClient.getReviewSchedule(programId, type)
          .then(res => res.data)
          .catch(() => null)
      );
      const schedulesResults = await Promise.all(schedulesPromises);
      const schedules = schedulesResults.filter(s => s !== null) as ReviewSchedule[];
      setAllSchedules(schedules);
      
      // Debug logging
      if (schedules.length > 0) {
        console.log(`[Review Scheduling] Found ${schedules.length} schedule(s) for program`, schedules.map(s => s.review_type));
      } else {
        console.log('[Review Scheduling] No schedules found for program');
      }

      // Fetch meetings
      const meetingsResponse = await apiClient.getReviewMeetings(programId, { limit: 50 });
      setMeetings(meetingsResponse.data || []);

      // Fetch compliance
      const complianceResponse = await apiClient.getReviewCompliance(programId);
      setCompliance(complianceResponse.data || []);
    } catch (error: any) {
      console.error('Failed to fetch review data:', error);
      toast.error('Failed to load review scheduling data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [programId]);

  const handleScheduleUpdate = () => {
    fetchData();
  };

  const handleMeetingCreate = () => {
    setSelectedMeeting(null);
    setMeetingDialogOpen(true);
  };

  const handleMeetingEdit = (meeting: ReviewMeeting) => {
    setSelectedMeeting(meeting);
    setMeetingDialogOpen(true);
  };

  const handleMeetingSave = () => {
    setMeetingDialogOpen(false);
    setSelectedMeeting(null);
    fetchData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeCompliance = compliance.find(c => c.review_type === 'portfolio_performance') || compliance[0];

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Review Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {schedule ? (
                <>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-2xl font-bold">{schedule.frequency}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Not configured</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{meetings.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Compliance Status</CardTitle>
          </CardHeader>
          <CardContent>
            {activeCompliance ? (
              <div className="flex items-center gap-2">
                {activeCompliance.compliance_status === 'on-track' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : activeCompliance.compliance_status === 'overdue' ? (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                ) : (
                  <Clock className="h-4 w-4 text-yellow-600" />
                )}
                <Badge
                  variant={
                    activeCompliance.compliance_status === 'on-track'
                      ? 'default'
                      : activeCompliance.compliance_status === 'overdue'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {activeCompliance.compliance_status.replace('-', ' ')}
                </Badge>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">No data</span>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">On-Time Rate</CardTitle>
          </CardHeader>
          <CardContent>
            {activeCompliance && activeCompliance.total_reviews_held > 0 ? (
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-2xl font-bold">
                  {Math.round((activeCompliance.on_time_reviews / activeCompliance.total_reviews_held) * 100)}%
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">N/A</span>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="schedule">
            <Settings className="h-4 w-4 mr-2" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="calendar">
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <TrendingUp className="h-4 w-4 mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="space-y-4">
          <ReviewScheduleConfig
            programId={programId}
            schedule={schedule}
            onUpdate={handleScheduleUpdate}
          />
        </TabsContent>

        <TabsContent value="calendar" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Review Calendar</h3>
              <p className="text-sm text-muted-foreground">
                View and manage scheduled review meetings
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!schedule && compliance.length === 0 && (
                <span className="text-xs text-muted-foreground mr-2">
                  Configure a schedule first
                </span>
              )}
              <Button 
                onClick={handleMeetingCreate} 
                disabled={compliance.length === 0}
                title={compliance.length === 0 ? 'Please configure a review schedule first' : ''}
              >
                <Plus className="h-4 w-4 mr-2" />
                Schedule Review
              </Button>
            </div>
          </div>
          <ReviewCalendar
            programId={programId}
            meetings={meetings}
            schedule={schedule}
            onMeetingClick={handleMeetingEdit}
            onRefresh={fetchData}
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <ReviewComplianceDashboard
            programId={programId}
            compliance={compliance}
            meetings={meetings}
            onScheduleReview={handleMeetingCreate}
          />
        </TabsContent>
      </Tabs>

      {/* Meeting Dialog */}
      {meetingDialogOpen && (
        <ReviewMeetingDialog
          programId={programId}
          meeting={selectedMeeting}
          schedule={schedule}
          schedules={allSchedules}
          open={meetingDialogOpen}
          onOpenChange={setMeetingDialogOpen}
          onSave={handleMeetingSave}
        />
      )}
    </div>
  );
}

