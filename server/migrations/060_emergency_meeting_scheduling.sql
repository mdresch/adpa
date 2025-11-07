-- Migration: Emergency Meeting Auto-Scheduling
-- CR-2026-001: Drift-to-Change Request Workflow Enhancement
-- Implements auto-scheduling for emergency meetings when critical drift detected

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

BEGIN;

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Meetings Table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Meeting Identification
    title VARCHAR(255) NOT NULL,
    description TEXT,
    meeting_type VARCHAR(50) NOT NULL CHECK (meeting_type IN (
        'emergency_budget_overrun',
        'urgent_drift_review',
        'corrective_action',
        'opportunity_review',
        'baseline_approval',
        'regular_review'
    )),
    
    -- Scheduling
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    location VARCHAR(255), -- Physical location or meeting link
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
        'scheduled',
        'in_progress',
        'completed',
        'cancelled',
        'rescheduled'
    )),
    
    -- Related Entities
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    drift_record_id UUID, -- References drift_records table if exists
    change_request_id UUID, -- Link to auto-generated CR
    baseline_id UUID REFERENCES project_baselines(id) ON DELETE SET NULL,
    
    -- Meeting Context
    severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical', 'emergency')),
    urgency VARCHAR(20) DEFAULT 'normal' CHECK (urgency IN ('low', 'normal', 'high', 'urgent', 'emergency')),
    
    -- Agenda and Notes
    agenda JSONB DEFAULT '[]'::jsonb, -- Array of agenda items
    meeting_notes TEXT,
    decisions JSONB DEFAULT '[]'::jsonb, -- Array of decisions made
    action_items JSONB DEFAULT '[]'::jsonb, -- Array of follow-up actions
    
    -- Auto-Generation Metadata
    auto_generated BOOLEAN DEFAULT false,
    auto_scheduled_reason TEXT, -- Why this meeting was auto-scheduled
    alert_id UUID, -- Link to the alert that triggered this meeting
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    cancelled_at TIMESTAMP,
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,
    
    -- Constraints
    CONSTRAINT valid_meeting_time CHECK (scheduled_end > scheduled_start),
    CONSTRAINT valid_duration CHECK (duration_minutes > 0 AND duration_minutes <= 480)
);

-- Meeting Attendees Table
CREATE TABLE IF NOT EXISTS meeting_attendees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
    
    -- Attendee Information
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255), -- For external attendees
    name VARCHAR(255), -- For external attendees
    role VARCHAR(50) CHECK (role IN (
        'organizer',
        'required',
        'optional',
        'decision_maker',
        'subject_matter_expert',
        'observer'
    )),
    
    -- RSVP Status
    rsvp_status VARCHAR(20) DEFAULT 'pending' CHECK (rsvp_status IN (
        'pending',
        'accepted',
        'declined',
        'tentative',
        'no_response'
    )),
    rsvp_at TIMESTAMP,
    
    -- Attendance
    attended BOOLEAN DEFAULT false,
    attended_at TIMESTAMP,
    
    -- Metadata
    invited_at TIMESTAMP DEFAULT NOW(),
    notified BOOLEAN DEFAULT false,
    notification_sent_at TIMESTAMP,
    
    CONSTRAINT unique_meeting_attendee UNIQUE (meeting_id, user_id, email)
);

-- Budget Overrun Alerts Table
CREATE TABLE IF NOT EXISTS budget_overrun_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert Identification
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
        'budget_overrun',
        'scope_creep',
        'timeline_delay',
        'quality_degradation',
        'resource_shortage'
    )),
    
    -- Severity
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical', 'emergency')),
    
    -- Budget Details (for budget_overrun type)
    approved_budget DECIMAL(15, 2),
    projected_cost DECIMAL(15, 2),
    overrun_amount DECIMAL(15, 2),
    overrun_percentage DECIMAL(5, 2),
    
    -- Alert Context
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    impact_analysis JSONB DEFAULT '{}'::jsonb,
    root_cause JSONB DEFAULT '{}'::jsonb,
    corrective_options JSONB DEFAULT '[]'::jsonb,
    
    -- Related Entities
    drift_record_id UUID,
    change_request_id UUID,
    meeting_id UUID REFERENCES meetings(id) ON DELETE SET NULL,
    
    -- Escalation
    escalation_level INTEGER DEFAULT 1 CHECK (escalation_level >= 1 AND escalation_level <= 5),
    escalated_to JSONB DEFAULT '[]'::jsonb, -- Array of user roles/IDs to escalate to
    escalation_deadline TIMESTAMP,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN (
        'active',
        'acknowledged',
        'in_progress',
        'resolved',
        'dismissed'
    )),
    
    -- Resolution
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_overrun CHECK (
        alert_type != 'budget_overrun' OR 
        (approved_budget IS NOT NULL AND projected_cost IS NOT NULL)
    )
);

-- Notification Queue Table
CREATE TABLE IF NOT EXISTS notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification Type
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'meeting_invitation',
        'meeting_reminder',
        'meeting_cancelled',
        'budget_overrun_alert',
        'drift_detected',
        'change_request_created',
        'urgent_approval_required'
    )),
    
    -- Recipient
    recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255),
    recipient_name VARCHAR(255),
    
    -- Notification Content
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent', 'emergency')),
    
    -- Delivery Channels
    channels JSONB DEFAULT '["email"]'::jsonb, -- email, slack, sms, dashboard
    
    -- Related Entities
    meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
    alert_id UUID REFERENCES budget_overrun_alerts(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'sending',
        'sent',
        'failed',
        'cancelled'
    )),
    
    -- Delivery
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    
    -- Retry Logic
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    next_retry_at TIMESTAMP,
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_meetings_project_id ON meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_scheduled_start ON meetings(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_meetings_severity ON meetings(severity);
CREATE INDEX IF NOT EXISTS idx_meetings_auto_generated ON meetings(auto_generated);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_rsvp_status ON meeting_attendees(rsvp_status);

CREATE INDEX IF NOT EXISTS idx_budget_alerts_project_id ON budget_overrun_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_severity ON budget_overrun_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_status ON budget_overrun_alerts(status);
CREATE INDEX IF NOT EXISTS idx_budget_alerts_created_at ON budget_overrun_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_priority ON notification_queue(priority);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient_user ON notification_queue(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_next_retry ON notification_queue(next_retry_at) WHERE status = 'failed';

-- Comments
COMMENT ON TABLE meetings IS 'Auto-scheduled and manual meetings for project reviews and emergency sessions';
COMMENT ON TABLE meeting_attendees IS 'Attendees for meetings with RSVP tracking';
COMMENT ON TABLE budget_overrun_alerts IS 'Critical alerts for budget overruns and drift requiring immediate attention';
COMMENT ON TABLE notification_queue IS 'Queue for multi-channel notifications (email, Slack, SMS)';

COMMENT ON COLUMN meetings.auto_generated IS 'True if meeting was auto-scheduled by drift detection system';
COMMENT ON COLUMN meetings.alert_id IS 'Link to the budget overrun alert that triggered this meeting';
COMMENT ON COLUMN budget_overrun_alerts.escalation_level IS '1=PM, 2=Sponsor, 3=CFO, 4=CEO, 5=Board';

COMMIT;

-- ============================================================================
-- DOWN MIGRATION
-- ============================================================================

BEGIN;

-- Drop tables in reverse order
DROP TABLE IF EXISTS notification_queue CASCADE;
DROP TABLE IF EXISTS budget_overrun_alerts CASCADE;
DROP TABLE IF EXISTS meeting_attendees CASCADE;
DROP TABLE IF EXISTS meetings CASCADE;

COMMIT;
