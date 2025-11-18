"use client"

import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { ReviewMeeting, ReviewSchedule } from '@/lib/api';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isPast } from 'date-fns';

interface ReviewCalendarProps {
  programId: string;
  meetings: ReviewMeeting[];
  schedule: ReviewSchedule | null;
  onMeetingClick: (meeting: ReviewMeeting) => void;
  onRefresh: () => void;
}

export function ReviewCalendar({ meetings, schedule, onMeetingClick }: ReviewCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const meetingsByDate = useMemo(() => {
    const map = new Map<string, ReviewMeeting[]>();
    meetings.forEach(meeting => {
      const dateKey = format(new Date(meeting.scheduled_date), 'yyyy-MM-dd');
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(meeting);
    });
    return map;
  }, [meetings]);

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const getStatusColor = (status: ReviewMeeting['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'postponed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={prevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h3 className="text-lg font-semibold">
                {format(currentDate, 'MMMM yyyy')}
              </h3>
              <Button variant="outline" size="icon" onClick={nextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
              Today
            </Button>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {/* Day Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}

            {/* Calendar Days */}
            {daysInMonth.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayMeetings = meetingsByDate.get(dateKey) || [];
              const isCurrentDay = isToday(day);
              const isPastDay = isPast(day) && !isCurrentDay;

              return (
                <div
                  key={dateKey}
                  className={`min-h-[100px] border rounded-lg p-2 ${
                    isCurrentDay ? 'bg-blue-50 border-blue-300' : isPastDay ? 'bg-gray-50' : 'bg-white'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${isCurrentDay ? 'text-blue-600' : ''}`}>
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayMeetings.slice(0, 2).map(meeting => (
                      <div
                        key={meeting.id}
                        onClick={() => onMeetingClick(meeting)}
                        className="text-xs p-1 rounded cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ backgroundColor: meeting.status === 'completed' ? '#dcfce7' : '#fef3c7' }}
                      >
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span className="truncate">
                            {meeting.start_time ? format(new Date(`2000-01-01 ${meeting.start_time}`), 'h:mm a') : 'TBD'}
                          </span>
                        </div>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(meeting.status)}`}>
                          {meeting.status}
                        </Badge>
                      </div>
                    ))}
                    {dayMeetings.length > 2 && (
                      <div className="text-xs text-muted-foreground">
                        +{dayMeetings.length - 2} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <div className="text-sm font-medium">Status:</div>
            <Badge variant="outline" className="bg-slate-100 text-slate-800">Scheduled</Badge>
            <Badge variant="outline" className="bg-blue-100 text-blue-800">In Progress</Badge>
            <Badge variant="outline" className="bg-green-100 text-green-800">Completed</Badge>
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">Postponed</Badge>
            <Badge variant="outline" className="bg-gray-100 text-gray-800">Cancelled</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

