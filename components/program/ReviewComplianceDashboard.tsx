"use client"

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Clock, TrendingUp, Calendar, Plus } from 'lucide-react';
import { ReviewCompliance, ReviewMeeting } from '@/lib/api';
import { format } from 'date-fns';

interface ReviewComplianceDashboardProps {
  programId: string;
  compliance: ReviewCompliance[];
  meetings: ReviewMeeting[];
  onScheduleReview?: () => void;
}

export function ReviewComplianceDashboard({ compliance, meetings, onScheduleReview }: ReviewComplianceDashboardProps) {
  if (compliance.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No review schedules configured yet.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Configure a review schedule to track compliance.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {compliance.map((comp) => {
        const onTimeRate = comp.total_reviews_held > 0
          ? Math.round((comp.on_time_reviews / comp.total_reviews_held) * 100)
          : 0;

        const completionRate = comp.total_reviews_held > 0
          ? Math.round((comp.completed_reviews / comp.total_reviews_held) * 100)
          : 0;

        return (
          <Card key={comp.schedule_id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg capitalize">
                    {comp.review_type.replace('_', ' ')} Reviews
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Frequency: {comp.frequency}
                  </p>
                </div>
                <Badge
                  variant={
                    comp.compliance_status === 'on-track'
                      ? 'default'
                      : comp.compliance_status === 'overdue'
                      ? 'destructive'
                      : 'secondary'
                  }
                  className="text-sm"
                >
                  {comp.compliance_status === 'on-track' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                  {comp.compliance_status === 'overdue' && <AlertCircle className="h-3 w-3 mr-1" />}
                  {comp.compliance_status === 'no-reviews' && <Clock className="h-3 w-3 mr-1" />}
                  {comp.compliance_status.replace('-', ' ')}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Total Reviews</div>
                  <div className="text-2xl font-bold">{comp.total_reviews_held}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">On-Time Rate</div>
                  <div className="text-2xl font-bold">{onTimeRate}%</div>
                  <Progress value={onTimeRate} className="mt-2" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Completion Rate</div>
                  <div className="text-2xl font-bold">{completionRate}%</div>
                  <Progress value={completionRate} className="mt-2" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Completed Reviews</div>
                  <div className="text-2xl font-bold">{comp.completed_reviews}</div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="h-4 w-4" />
                    Last Review Date
                  </div>
                  <div className="text-lg font-semibold">
                    {comp.last_review_date
                      ? format(new Date(comp.last_review_date), 'MMM d, yyyy')
                      : 'Never'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <TrendingUp className="h-4 w-4" />
                    Next Review Due
                  </div>
                  <div className="text-lg font-semibold">
                    {comp.next_review_due_date
                      ? format(new Date(comp.next_review_due_date), 'MMM d, yyyy')
                      : 'Not scheduled'}
                  </div>
                  {comp.next_review_due_date && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {comp.compliance_status === 'overdue' && (
                        <span className="text-red-600">Overdue</span>
                      )}
                      {comp.compliance_status === 'on-track' && (
                        <span className="text-green-600">On track</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* PMI Compliance Status */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">PMI Compliance Status</div>
                    <p className="text-xs text-muted-foreground">
                      Regular review cadence (monthly/quarterly)
                    </p>
                  </div>
                  {comp.compliance_status === 'on-track' && comp.total_reviews_held >= 3 && comp.completed_reviews >= 3 ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Compliant
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs Reviews
                    </Badge>
                  )}
                </div>
                
                {/* Call to Action for No Reviews */}
                {comp.total_reviews_held === 0 && onScheduleReview && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium text-blue-900 mb-1">
                          No reviews scheduled yet
                        </div>
                        <p className="text-xs text-blue-700">
                          Schedule your first {comp.review_type.replace('_', ' ')} review to start tracking compliance.
                          {comp.frequency === 'monthly' && ' Schedule monthly reviews to maintain PMI compliance.'}
                          {comp.frequency === 'quarterly' && ' Schedule quarterly reviews to maintain PMI compliance.'}
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={onScheduleReview}
                        className="ml-4"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Schedule Review
                      </Button>
                    </div>
                  </div>
                )}

                {/* Guidance for Incomplete Reviews */}
                {comp.total_reviews_held > 0 && comp.completed_reviews < comp.total_reviews_held && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-yellow-900 mb-1">
                          Mark Reviews as Completed
                        </div>
                        <p className="text-xs text-yellow-700">
                          You have {comp.total_reviews_held} review{comp.total_reviews_held !== 1 ? 's' : ''} scheduled, 
                          but {comp.total_reviews_held - comp.completed_reviews} {comp.total_reviews_held - comp.completed_reviews === 1 ? 'has' : 'have'} not been marked as completed. 
                          Go to the Calendar tab to update review status and mark them as completed to track compliance accurately.
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          💡 Tip: After a review meeting, update the review status to "completed" and mark whether it was held on-time to improve your compliance metrics.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Progress Indicator */}
                {comp.total_reviews_held > 0 && comp.completed_reviews < 3 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Progress to PMI Compliance</span>
                      <span>{comp.completed_reviews} / 3 completed reviews</span>
                    </div>
                    <Progress value={(comp.completed_reviews / 3) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      Need {3 - comp.completed_reviews} more completed review{3 - comp.completed_reviews !== 1 ? 's' : ''} to achieve PMI compliance
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

