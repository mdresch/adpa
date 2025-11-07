-- Migration: Escalation Matrix System for Drift Detection
-- TASK-742: Escalation matrix based on severity
-- Phase 2: Advanced Alerts (DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
-- 
-- This migration creates the infrastructure for severity-based escalation
-- routing for drift detection alerts (budget overruns, scope creep, etc.)

BEGIN;

-- Enable pgcrypto extension for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- UP Migration
-- ============================================================================

-- Escalation Matrix Configuration Table
-- Defines escalation rules based on drift type and severity thresholds
CREATE TABLE IF NOT EXISTS escalation_matrix (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Escalation Rule Identity
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    drift_type VARCHAR(50) NOT NULL CHECK (drift_type IN (
        'budget_overrun', 'scope_creep', 'timeline_delay', 
        'quality_degradation', 'technical_drift', 'resource_drift'
    )),
    
    -- Severity Threshold Configuration
    -- For budget_overrun and scope_creep: percentage variance (0-100)
    -- For others: severity level matching
    threshold_min DECIMAL(10,2) NOT NULL DEFAULT 0.0,
    threshold_max DECIMAL(10,2) DEFAULT NULL, -- NULL means infinity
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('warning', 'high', 'critical', 'emergency')),
    
    -- Escalation Configuration
    escalate_to JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of roles: ["PM", "Sponsor", "CFO", "CEO", "Board"]
    deadline_hours INTEGER NOT NULL DEFAULT 72, -- Hours to respond
    
    -- Notification Channels
    channels JSONB NOT NULL DEFAULT '["email", "dashboard"]'::jsonb, -- Array: ["email", "slack", "sms", "dashboard", "meeting"]
    auto_create_cr BOOLEAN DEFAULT FALSE, -- Automatically create Change Request
    require_meeting BOOLEAN DEFAULT FALSE, -- Require emergency meeting
    
    -- Metadata
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 0, -- Lower number = higher priority for overlapping rules
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Description for admins
    description TEXT,
    
    CONSTRAINT valid_threshold_range CHECK (threshold_min >= 0 AND (threshold_max IS NULL OR threshold_max > threshold_min))
);

COMMENT ON TABLE escalation_matrix IS 'Configurable escalation rules for drift detection alerts based on severity thresholds';
COMMENT ON COLUMN escalation_matrix.threshold_min IS 'Minimum threshold percentage (e.g., 5.0 for 5% budget overrun)';
COMMENT ON COLUMN escalation_matrix.threshold_max IS 'Maximum threshold percentage (NULL = no upper limit)';
COMMENT ON COLUMN escalation_matrix.escalate_to IS 'JSON array of roles to escalate to: ["PM", "Sponsor", "CFO", "CTO", "CEO", "Board"]';
COMMENT ON COLUMN escalation_matrix.channels IS 'JSON array of notification channels: ["email", "slack", "sms", "dashboard", "meeting"]';

-- Escalation Alerts Table
-- Tracks actual escalation events triggered by drift detection
CREATE TABLE IF NOT EXISTS escalation_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Link to drift detection and escalation rule
    drift_detection_id UUID NOT NULL REFERENCES baseline_drift_detection(id) ON DELETE CASCADE,
    escalation_rule_id UUID NOT NULL REFERENCES escalation_matrix(id),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Alert Details
    alert_type VARCHAR(50) NOT NULL, -- Same as drift_type from escalation_matrix
    severity_level VARCHAR(20) NOT NULL, -- warning, high, critical, emergency
    variance_percentage DECIMAL(10,2), -- Actual percentage for budget/scope
    
    -- Escalation Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'notified', 'acknowledged', 'in_progress', 'resolved', 'expired'
    )),
    
    -- Recipients and Notifications
    escalated_to JSONB NOT NULL, -- Actual list of users/roles notified
    notification_channels JSONB NOT NULL, -- Channels used for this alert
    
    -- Notification Tracking
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP,
    slack_sent BOOLEAN DEFAULT FALSE,
    slack_sent_at TIMESTAMP,
    sms_sent BOOLEAN DEFAULT FALSE,
    sms_sent_at TIMESTAMP,
    dashboard_alert BOOLEAN DEFAULT TRUE,
    meeting_scheduled BOOLEAN DEFAULT FALSE,
    meeting_scheduled_at TIMESTAMP,
    
    -- Response Tracking
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMP,
    deadline TIMESTAMP NOT NULL, -- When response is required by
    response_notes TEXT,
    
    -- Change Request Integration
    change_request_id UUID, -- Link to auto-created change request
    change_request_created BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    
    -- Alert Summary (for quick reference)
    alert_summary TEXT NOT NULL,
    alert_details JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE escalation_alerts IS 'Tracks escalation alerts triggered by drift detection based on escalation matrix rules';
COMMENT ON COLUMN escalation_alerts.variance_percentage IS 'Actual variance percentage that triggered the alert (for budget overrun, scope creep)';
COMMENT ON COLUMN escalation_alerts.deadline IS 'Timestamp by which response is required based on escalation rule deadline_hours';

-- Escalation Alert History Table
-- Audit log of all actions taken on escalation alerts
CREATE TABLE IF NOT EXISTS escalation_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES escalation_alerts(id) ON DELETE CASCADE,
    
    -- Action Details
    action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
        'created', 'notified', 'acknowledged', 'escalated', 'resolved', 
        'expired', 'status_changed', 'note_added', 'meeting_scheduled'
    )),
    action_description TEXT NOT NULL,
    
    -- Actor
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMP DEFAULT NOW(),
    
    -- Action Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE escalation_alert_history IS 'Audit trail of all actions performed on escalation alerts';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_escalation_matrix_drift_type ON escalation_matrix(drift_type);
CREATE INDEX IF NOT EXISTS idx_escalation_matrix_severity ON escalation_matrix(severity_level);
CREATE INDEX IF NOT EXISTS idx_escalation_matrix_active ON escalation_matrix(is_active);
CREATE INDEX IF NOT EXISTS idx_escalation_matrix_priority ON escalation_matrix(priority);

CREATE INDEX IF NOT EXISTS idx_escalation_alerts_project ON escalation_alerts(project_id);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_drift ON escalation_alerts(drift_detection_id);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_status ON escalation_alerts(status);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_severity ON escalation_alerts(severity_level);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_deadline ON escalation_alerts(deadline);
CREATE INDEX IF NOT EXISTS idx_escalation_alerts_created ON escalation_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_escalation_history_alert ON escalation_alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_action ON escalation_alert_history(action_type);
CREATE INDEX IF NOT EXISTS idx_escalation_history_performed ON escalation_alert_history(performed_at);

-- ============================================================================
-- Seed Data: Default Escalation Rules
-- ============================================================================

-- Budget Overrun Escalation Rules (from DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
INSERT INTO escalation_matrix (rule_name, drift_type, threshold_min, threshold_max, severity_level, escalate_to, deadline_hours, channels, auto_create_cr, require_meeting, description, priority)
VALUES 
    -- 0-5%: Warning
    ('Budget Overrun: 0-5% Warning', 'budget_overrun', 0.0, 5.0, 'warning', 
     '["PM", "Finance Controller"]'::jsonb, 72, '["email", "dashboard"]'::jsonb, 
     false, false, 
     'Budget variance between 0-5% triggers warning to PM and Finance Controller with 3-day response deadline', 
     10),
    
    -- 5-10%: Critical
    ('Budget Overrun: 5-10% Critical', 'budget_overrun', 5.0, 10.0, 'critical', 
     '["Sponsor", "CFO", "PM"]'::jsonb, 24, '["email", "slack", "dashboard"]'::jsonb, 
     true, false, 
     'Budget variance between 5-10% triggers critical alert to Sponsor, CFO, and PM with 24-hour deadline and auto-CR', 
     20),
    
    -- 10-25%: Critical with Meeting
    ('Budget Overrun: 10-25% Critical+Meeting', 'budget_overrun', 10.0, 25.0, 'critical', 
     '["Sponsor", "CFO", "CTO"]'::jsonb, 12, '["email", "slack", "dashboard", "meeting"]'::jsonb, 
     true, true, 
     'Budget variance between 10-25% triggers critical alert with emergency meeting requirement', 
     30),
    
    -- 25%+: Emergency
    ('Budget Overrun: 25%+ Emergency', 'budget_overrun', 25.0, NULL, 'emergency', 
     '["CEO", "CFO", "Board"]'::jsonb, 6, '["email", "slack", "sms", "dashboard", "meeting"]'::jsonb, 
     true, true, 
     'Budget variance 25% or greater triggers emergency alert to CEO, CFO, and Board with all notification channels', 
     40);

-- Scope Creep Escalation Rules (from DRIFT_TO_CHANGE_REQUEST_WORKFLOW.md)
INSERT INTO escalation_matrix (rule_name, drift_type, threshold_min, threshold_max, severity_level, escalate_to, deadline_hours, channels, auto_create_cr, require_meeting, description, priority)
VALUES 
    -- 0-10%: Warning
    ('Scope Creep: 0-10% Warning', 'scope_creep', 0.0, 10.0, 'warning', 
     '["PM", "Sponsor"]'::jsonb, 72, '["email", "dashboard"]'::jsonb, 
     false, false, 
     'Scope increase between 0-10% triggers warning with optional CR creation', 
     10),
    
    -- 10-25%: High
    ('Scope Creep: 10-25% High', 'scope_creep', 10.0, 25.0, 'high', 
     '["Sponsor", "Program Manager"]'::jsonb, 48, '["email", "slack", "dashboard"]'::jsonb, 
     true, false, 
     'Scope increase between 10-25% triggers high alert with automatic CR creation', 
     20),
    
    -- 25-50%: Critical
    ('Scope Creep: 25-50% Critical', 'scope_creep', 25.0, 50.0, 'critical', 
     '["Sponsor", "CFO", "CTO"]'::jsonb, 24, '["email", "slack", "dashboard"]'::jsonb, 
     true, false, 
     'Scope increase between 25-50% triggers critical alert with mandatory CR', 
     30),
    
    -- 50%+: Emergency
    ('Scope Creep: 50%+ Emergency', 'scope_creep', 50.0, NULL, 'emergency', 
     '["CEO", "CFO", "Board"]'::jsonb, 12, '["email", "slack", "sms", "dashboard", "meeting"]'::jsonb, 
     true, true, 
     'Scope increase 50% or greater triggers emergency alert with meeting requirement', 
     40);

COMMIT;

-- ============================================================================
-- DOWN Migration (for rollback)
-- ============================================================================

-- To rollback this migration, run:
-- BEGIN;
-- DROP TABLE IF EXISTS escalation_alert_history CASCADE;
-- DROP TABLE IF EXISTS escalation_alerts CASCADE;
-- DROP TABLE IF EXISTS escalation_matrix CASCADE;
-- COMMIT;
