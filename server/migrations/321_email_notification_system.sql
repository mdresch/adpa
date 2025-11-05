-- Migration: Email Notification System
-- TASK-739: Email notification system for drift detection
-- Implements email notification tracking and preferences

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Email Notification Logs Table
CREATE TABLE IF NOT EXISTS email_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Notification Metadata
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'positive_drift_opportunity',
        'budget_overrun_alert',
        'scope_creep_alert',
        'timeline_delay_alert',
        'quality_degradation_alert',
        'technical_drift_alert',
        'change_request_notification',
        'escalation_alert',
        'general_notification'
    )),
    severity VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical', 'emergency')),
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
    
    -- Recipients
    recipient_emails TEXT[] NOT NULL, -- Array of email addresses
    recipient_roles TEXT[], -- Array of roles (for audit purposes)
    cc_emails TEXT[], -- CC recipients
    
    -- Email Content
    subject TEXT NOT NULL,
    body_text TEXT, -- Plain text version
    body_html TEXT, -- HTML version
    
    -- Context
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    drift_detection_id UUID REFERENCES baseline_drift_detections(id) ON DELETE SET NULL,
    change_request_id UUID, -- May reference change_requests if that table exists
    escalation_alert_id UUID REFERENCES escalation_alerts(id) ON DELETE SET NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional context data
    
    -- Status Tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Email Notification Preferences Table
CREATE TABLE IF NOT EXISTS email_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Notification Type Preferences (enable/disable specific types)
    positive_drift_enabled BOOLEAN DEFAULT TRUE,
    budget_overrun_enabled BOOLEAN DEFAULT TRUE,
    scope_creep_enabled BOOLEAN DEFAULT TRUE,
    timeline_delay_enabled BOOLEAN DEFAULT TRUE,
    quality_degradation_enabled BOOLEAN DEFAULT TRUE,
    technical_drift_enabled BOOLEAN DEFAULT TRUE,
    change_request_enabled BOOLEAN DEFAULT TRUE,
    escalation_alert_enabled BOOLEAN DEFAULT TRUE,
    general_notification_enabled BOOLEAN DEFAULT TRUE,
    
    -- Severity Filters (minimum severity to receive)
    min_severity_level VARCHAR(20) DEFAULT 'normal' CHECK (min_severity_level IN ('low', 'normal', 'high', 'critical', 'emergency')),
    
    -- Delivery Preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    digest_mode BOOLEAN DEFAULT FALSE, -- If true, batch notifications into daily digest
    digest_time TIME DEFAULT '09:00:00', -- Time to send daily digest
    
    -- Project-specific preferences
    project_filters JSONB DEFAULT '[]'::jsonb, -- Array of project IDs to filter (empty = all projects)
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_preferences UNIQUE (user_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_notification_type ON email_notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_severity ON email_notification_logs(severity);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_project_id ON email_notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_drift_detection_id ON email_notification_logs(drift_detection_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_notification_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_prefs_user_id ON email_notification_preferences(user_id);

-- Comments for documentation
COMMENT ON TABLE email_notification_logs IS 'Tracks all email notifications sent by the system for audit and debugging';
COMMENT ON TABLE email_notification_preferences IS 'User preferences for email notifications';

COMMENT ON COLUMN email_notification_logs.notification_type IS 'Type of notification being sent';
COMMENT ON COLUMN email_notification_logs.severity IS 'Severity level of the notification';
COMMENT ON COLUMN email_notification_logs.priority IS 'Email priority (affects mail client handling)';
COMMENT ON COLUMN email_notification_logs.recipient_emails IS 'Array of email addresses that received this notification';
COMMENT ON COLUMN email_notification_logs.metadata IS 'Additional context data in JSON format';
COMMENT ON COLUMN email_notification_logs.status IS 'Current delivery status of the email';

COMMENT ON COLUMN email_notification_preferences.digest_mode IS 'If enabled, batch notifications into daily digest instead of real-time';
COMMENT ON COLUMN email_notification_preferences.project_filters IS 'JSON array of project IDs to receive notifications for (empty = all projects)';

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_notification_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER email_notification_logs_updated_at
    BEFORE UPDATE ON email_notification_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_email_notification_updated_at();

CREATE TRIGGER email_notification_preferences_updated_at
    BEFORE UPDATE ON email_notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_email_notification_updated_at();

COMMIT;

-- Rollback section (for reference)
-- BEGIN;
-- DROP TRIGGER IF EXISTS email_notification_preferences_updated_at ON email_notification_preferences;
-- DROP TRIGGER IF EXISTS email_notification_logs_updated_at ON email_notification_logs;
-- DROP FUNCTION IF EXISTS update_email_notification_updated_at();
-- DROP TABLE IF EXISTS email_notification_preferences;
-- DROP TABLE IF EXISTS email_notification_logs;
-- COMMIT;
