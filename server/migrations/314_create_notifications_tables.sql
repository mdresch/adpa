-- Migration: Create Notifications Tables
-- Adds channels, templates, preferences, rules, and log for multi-channel notifications

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- Channels
CREATE TABLE IF NOT EXISTS notification_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE, -- email, slack, teams, sms
  display_name VARCHAR(150) NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notification_channels IS 'Available notification channels';

-- Templates
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  notification_type VARCHAR(200) NOT NULL,
  channel_id UUID REFERENCES notification_channels(id) ON DELETE CASCADE,
  subject_template TEXT,
  body_template TEXT NOT NULL,
  adaptive_card_template JSONB,
  slack_blocks_template JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notification_templates IS 'Notification templates for different channels';

-- Preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  notification_type VARCHAR(200) DEFAULT NULL,
  project_id UUID DEFAULT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  severity_filter VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notification_preferences IS 'Per-user notification destinations and preferences';

-- Rules (simple rule engine table)
CREATE TABLE IF NOT EXISTS notification_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  notification_type VARCHAR(200) NOT NULL,
  channel_id UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
  conditions JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE notification_rules IS 'Automated rules for triggering notifications';

-- Notification log
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type VARCHAR(100) NOT NULL,
  reference_id UUID NOT NULL,
  project_id UUID DEFAULT NULL,
  notification_type VARCHAR(200) NOT NULL,
  channel_id UUID REFERENCES notification_channels(id) ON DELETE SET NULL,
  recipient_user_id UUID DEFAULT NULL REFERENCES users(id) ON DELETE SET NULL,
  destination TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending,sent,failed
  error_message TEXT DEFAULT NULL,
  sent_at TIMESTAMP,
  failed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_log_reference ON notification_log(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);

COMMENT ON TABLE notification_log IS 'Audit trail of notification deliveries and results';

COMMIT;

-- DOWN: drop tables
-- Note: DOWN section left as comments for manual rollback if needed
-- DROP TABLE IF EXISTS notification_log; DROP TABLE IF EXISTS notification_rules;
-- DROP TABLE IF EXISTS notification_preferences; DROP TABLE IF EXISTS notification_templates;
-- DROP TABLE IF EXISTS notification_channels;
