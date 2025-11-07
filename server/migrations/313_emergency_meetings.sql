-- Migration 313: Emergency Meeting Auto-Scheduling
-- Purpose: Auto-schedule emergency meetings when critical drift is detected
-- Date: November 4, 2025
-- Reference: DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md (TASK-743)
-- Flow: Drift Detection → Budget Overrun → Auto-Generate Meeting → Notify Stakeholders

-- ================================================================
-- UP Migration
-- ================================================================

BEGIN;

-- Ensure pgcrypto extension exists for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ================================================================
-- Emergency Meetings Table
-- ================================================================

CREATE TABLE IF NOT EXISTS emergency_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Meeting Identification
  meeting_id VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "EMRG-2025-001"
  title VARCHAR(255) NOT NULL,
  
  -- Source of Emergency
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  drift_record_id UUID REFERENCES baseline_drift_detection(id) ON DELETE SET NULL,
  change_request_id UUID REFERENCES documents(id) ON DELETE SET NULL,  -- Auto-generated CR
  
  -- Meeting Classification
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('warning', 'critical', 'emergency')),
  meeting_type VARCHAR(50) NOT NULL DEFAULT 'budget_overrun' CHECK (meeting_type IN (
    'budget_overrun',
    'scope_creep',
    'timeline_delay',
    'quality_issue',
    'risk_escalation',
    'general_emergency'
  )),
  
  -- Trigger Context
  trigger_reason TEXT NOT NULL,  -- Why meeting was scheduled (Markdown format)
  overrun_amount DECIMAL(15,2),  -- $ amount if budget overrun
  overrun_percentage DECIMAL(5,2),  -- % if budget/scope overrun
  
  -- Meeting Details
  agenda JSONB NOT NULL,  -- Meeting agenda items and discussion points
  required_attendees JSONB NOT NULL DEFAULT '[]'::jsonb,  -- Array of user IDs/roles
  optional_attendees JSONB DEFAULT '[]'::jsonb,
  
  -- Scheduling
  scheduled_date TIMESTAMP NOT NULL,
  scheduled_duration_minutes INTEGER DEFAULT 60,
  meeting_url TEXT,  -- Virtual meeting link
  location TEXT,  -- Physical location if applicable
  
  -- Status Tracking
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',
    'notified',
    'confirmed',
    'in_progress',
    'completed',
    'cancelled',
    'rescheduled'
  )),
  
  -- Notification Tracking
  notifications_sent JSONB DEFAULT '[]'::jsonb,  -- Array of notification records
  email_sent BOOLEAN DEFAULT FALSE,
  slack_sent BOOLEAN DEFAULT FALSE,
  sms_sent BOOLEAN DEFAULT FALSE,
  dashboard_alert_sent BOOLEAN DEFAULT FALSE,
  
  -- Meeting Outcomes
  meeting_notes TEXT,  -- Meeting minutes/notes (Markdown format)
  decisions_made JSONB,  -- Array of decisions/actions
  action_items JSONB,  -- Follow-up actions with owners
  resolution TEXT,  -- Final resolution (Markdown format)
  
  -- Escalation
  escalation_level INTEGER DEFAULT 1,  -- 1=Manager, 2=Director, 3=VP, 4=C-Level, 5=Board
  escalated_to JSONB,  -- Array of escalation recipients
  escalated_at TIMESTAMP,
  
  -- Auto-scheduling Metadata
  auto_scheduled BOOLEAN DEFAULT TRUE,
  auto_scheduled_by VARCHAR(50) DEFAULT 'drift_detection_system',
  scheduling_algorithm VARCHAR(100),  -- Algorithm/logic used for scheduling
  
  -- AI Processing Metadata
  ai_processing_metadata JSONB,  -- AI-generated agenda, recommendations, etc.
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT
);

-- ================================================================
-- Meeting Attendees Table (for tracking confirmations)
-- ================================================================

CREATE TABLE IF NOT EXISTS meeting_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES emergency_meetings(id) ON DELETE CASCADE,
  
  -- Attendee Details
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(100),  -- Project role (Sponsor, PM, CFO, etc.)
  
  -- Attendance
  required BOOLEAN DEFAULT TRUE,
  confirmed BOOLEAN DEFAULT FALSE,
  confirmed_at TIMESTAMP,
  attended BOOLEAN DEFAULT FALSE,
  
  -- Notification Status
  invitation_sent BOOLEAN DEFAULT FALSE,
  invitation_sent_at TIMESTAMP,
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMP,
  
  -- Response
  response VARCHAR(20) CHECK (response IN ('accepted', 'declined', 'tentative', 'no_response')),
  response_received_at TIMESTAMP,
  response_notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT unique_meeting_attendee UNIQUE(meeting_id, user_id)
);

-- ================================================================
-- Meeting Escalation History
-- ================================================================

CREATE TABLE IF NOT EXISTS meeting_escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES emergency_meetings(id) ON DELETE CASCADE,
  
  -- Escalation Details
  from_level INTEGER NOT NULL,
  to_level INTEGER NOT NULL,
  escalated_by UUID REFERENCES users(id),
  escalated_to JSONB NOT NULL,  -- Array of recipients
  
  -- Reason
  escalation_reason TEXT NOT NULL,
  urgency VARCHAR(20) NOT NULL CHECK (urgency IN ('normal', 'high', 'urgent', 'critical')),
  
  -- Notification
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_channels JSONB,  -- Array of channels used (email, sms, slack)
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- Indexes for Performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_emergency_meetings_project_id ON emergency_meetings(project_id);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_drift_record ON emergency_meetings(drift_record_id);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_severity ON emergency_meetings(severity);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_status ON emergency_meetings(status);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_scheduled_date ON emergency_meetings(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_created_at ON emergency_meetings(created_at);
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_meeting_id ON emergency_meetings(meeting_id);

CREATE INDEX IF NOT EXISTS idx_meeting_attendees_meeting_id ON meeting_attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_user_id ON meeting_attendees(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_confirmed ON meeting_attendees(confirmed);
CREATE INDEX IF NOT EXISTS idx_meeting_attendees_required ON meeting_attendees(required);

CREATE INDEX IF NOT EXISTS idx_meeting_escalation_meeting_id ON meeting_escalation_history(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_escalation_created_at ON meeting_escalation_history(created_at);

-- Full-text search for meeting content
CREATE INDEX IF NOT EXISTS idx_emergency_meetings_search 
  ON emergency_meetings USING gin(to_tsvector('english', 
    coalesce(title, '') || ' ' || 
    coalesce(trigger_reason, '') || ' ' || 
    coalesce(resolution, '')
  ));

-- ================================================================
-- Comments for Documentation
-- ================================================================

COMMENT ON TABLE emergency_meetings IS 'Auto-scheduled emergency meetings triggered by critical drift detection';
COMMENT ON COLUMN emergency_meetings.meeting_id IS 'Unique meeting identifier (e.g., EMRG-2025-001)';
COMMENT ON COLUMN emergency_meetings.severity IS 'Emergency severity: warning (5-10%), critical (10-25%), emergency (25%+)';
COMMENT ON COLUMN emergency_meetings.trigger_reason IS 'Markdown formatted explanation of why meeting was scheduled';
COMMENT ON COLUMN emergency_meetings.agenda IS 'JSONB array of agenda items with discussion points';
COMMENT ON COLUMN emergency_meetings.required_attendees IS 'JSONB array of user IDs or roles that must attend';
COMMENT ON COLUMN emergency_meetings.escalation_level IS '1=Manager, 2=Director, 3=VP, 4=C-Level, 5=Board';
COMMENT ON COLUMN emergency_meetings.auto_scheduled IS 'True if meeting was auto-scheduled by drift detection';

COMMENT ON TABLE meeting_attendees IS 'Tracks individual attendee confirmations and responses for emergency meetings';
COMMENT ON COLUMN meeting_attendees.required IS 'Whether attendance is required (vs optional)';
COMMENT ON COLUMN meeting_attendees.confirmed IS 'Whether attendee has confirmed attendance';

COMMENT ON TABLE meeting_escalation_history IS 'Audit trail of meeting escalations to higher management levels';

COMMIT;

-- ================================================================
-- DOWN Migration
-- ================================================================

-- To rollback: DROP TABLE meeting_escalation_history, meeting_attendees, emergency_meetings CASCADE;
