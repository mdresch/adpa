-- Migration: Multi-Channel Notification System
-- TASK-741: Multi-channel notifications (email, Slack, SMS, Teams)
-- Description: Implements notification preferences and delivery tracking for drift detection alerts

BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Notification Channels Table
-- ============================================================================
-- Stores available notification channels and their configuration
CREATE TABLE IF NOT EXISTS notification_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    requires_config BOOLEAN DEFAULT false,
    config_schema JSONB DEFAULT NULL, -- JSON schema for channel-specific config
    icon VARCHAR(50) DEFAULT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE notification_channels IS 'Available notification channels (email, Slack, SMS, Teams)';
COMMENT ON COLUMN notification_channels.config_schema IS 'JSON schema defining required configuration for this channel';

-- ============================================================================
-- Notification Preferences Table
-- ============================================================================
-- User or system-level notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Preference Details
    channel_id UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    notification_type VARCHAR(100) NOT NULL, -- e.g., 'budget_overrun', 'positive_drift', 'scope_drift'
    
    -- Channel-Specific Settings
    is_enabled BOOLEAN DEFAULT true,
    destination TEXT, -- email address, phone number, webhook URL, Teams channel, etc.
    channel_config JSONB DEFAULT NULL, -- Channel-specific configuration
    
    -- Filtering and Rules
    severity_filter VARCHAR(20)[] DEFAULT NULL, -- Array of severities: ['critical', 'high', 'medium', 'low']
    quiet_hours_start TIME DEFAULT NULL,
    quiet_hours_end TIME DEFAULT NULL,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_user_channel_type UNIQUE (user_id, channel_id, notification_type, project_id)
);

COMMENT ON TABLE notification_preferences IS 'User notification preferences for different channels and alert types';
COMMENT ON COLUMN notification_preferences.destination IS 'Channel-specific destination (email, phone, webhook URL)';
COMMENT ON COLUMN notification_preferences.severity_filter IS 'Array of severities this preference applies to';

-- ============================================================================
-- Notification Templates Table
-- ============================================================================
-- Templates for different notification types across channels
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    notification_type VARCHAR(100) NOT NULL,
    channel_id UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    
    -- Template Content (stored as Markdown)
    subject_template TEXT DEFAULT NULL, -- For email, SMS preview
    body_template TEXT NOT NULL, -- Markdown format with variable placeholders
    
    -- Teams/Slack Specific
    adaptive_card_template JSONB DEFAULT NULL, -- For Teams Adaptive Cards
    slack_blocks_template JSONB DEFAULT NULL, -- For Slack Block Kit
    
    -- Template Metadata
    version VARCHAR(20) DEFAULT '1.0',
    is_active BOOLEAN DEFAULT true,
    variables JSONB DEFAULT NULL, -- Array of available template variables
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    CONSTRAINT unique_template_name_channel UNIQUE (name, channel_id, version)
);

COMMENT ON TABLE notification_templates IS 'Notification templates with Markdown content and platform-specific formatting';
COMMENT ON COLUMN notification_templates.body_template IS 'Markdown template with {{variable}} placeholders';
COMMENT ON COLUMN notification_templates.adaptive_card_template IS 'Microsoft Teams Adaptive Card JSON template';

-- ============================================================================
-- Notification Log Table
-- ============================================================================
-- Tracks all sent notifications for audit and retry
CREATE TABLE IF NOT EXISTS notification_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Reference to source
    reference_type VARCHAR(50) NOT NULL, -- 'drift_detection', 'change_request', 'budget_alert'
    reference_id UUID NOT NULL, -- ID of the drift detection, CR, etc.
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Notification Details
    notification_type VARCHAR(100) NOT NULL,
    channel_id UUID NOT NULL REFERENCES notification_channels(id) ON DELETE CASCADE,
    recipient_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    destination TEXT NOT NULL, -- Actual destination used
    
    -- Content
    subject TEXT DEFAULT NULL,
    body TEXT NOT NULL, -- Rendered content
    metadata JSONB DEFAULT NULL, -- Channel-specific metadata
    
    -- Delivery Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
    sent_at TIMESTAMP DEFAULT NULL,
    delivered_at TIMESTAMP DEFAULT NULL,
    failed_at TIMESTAMP DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    retry_count INTEGER DEFAULT 0,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE notification_log IS 'Audit log of all sent notifications with delivery tracking';
COMMENT ON COLUMN notification_log.reference_type IS 'Type of entity that triggered the notification';
COMMENT ON COLUMN notification_log.reference_id IS 'ID of the entity that triggered the notification';

-- ============================================================================
-- Notification Rules Table
-- ============================================================================
-- Automated notification rules based on conditions
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Rule Configuration
    trigger_type VARCHAR(100) NOT NULL, -- 'budget_overrun', 'scope_drift', etc.
    conditions JSONB NOT NULL, -- Conditions that must be met
    
    -- Target Channels
    channels UUID[] NOT NULL, -- Array of channel IDs to notify
    recipients JSONB NOT NULL, -- Array of user IDs or roles
    
    -- Rule Settings
    is_enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Higher priority rules execute first
    throttle_minutes INTEGER DEFAULT 0, -- Minimum minutes between notifications
    last_triggered_at TIMESTAMP DEFAULT NULL,
    
    -- Metadata
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE notification_rules IS 'Automated notification rules triggered by system events';
COMMENT ON COLUMN notification_rules.conditions IS 'JSONB object defining trigger conditions';
COMMENT ON COLUMN notification_rules.throttle_minutes IS 'Prevents notification spam by throttling repeated triggers';

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_notification_channels_enabled ON notification_channels(is_enabled);
CREATE INDEX IF NOT EXISTS idx_notification_channels_name ON notification_channels(name);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_project ON notification_preferences(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_channel ON notification_preferences(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_type ON notification_preferences(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_enabled ON notification_preferences(is_enabled);

CREATE INDEX IF NOT EXISTS idx_notification_templates_channel ON notification_templates(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_notification_log_reference ON notification_log(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_project ON notification_log(project_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_channel ON notification_log(channel_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient ON notification_log(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_status ON notification_log(status);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log(created_at);

CREATE INDEX IF NOT EXISTS idx_notification_rules_trigger ON notification_rules(trigger_type);
CREATE INDEX IF NOT EXISTS idx_notification_rules_enabled ON notification_rules(is_enabled);

-- ============================================================================
-- Seed Data: Notification Channels
-- ============================================================================
INSERT INTO notification_channels (name, display_name, description, is_enabled, requires_config, icon, sort_order) VALUES
    ('email', 'Email', 'Email notifications via SMTP', true, true, 'mail', 1),
    ('slack', 'Slack', 'Slack notifications via webhook or bot', true, true, 'slack', 2),
    ('teams', 'Microsoft Teams', 'Microsoft Teams notifications with Adaptive Cards', true, true, 'microsoft', 3),
    ('sms', 'SMS', 'SMS notifications via Twilio', true, true, 'message-square', 4)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Seed Data: Default Notification Templates
-- ============================================================================

-- Email Templates
INSERT INTO notification_templates (name, notification_type, channel_id, subject_template, body_template, variables) VALUES
(
    'budget_overrun_critical',
    'budget_overrun',
    (SELECT id FROM notification_channels WHERE name = 'email'),
    '🚨 CRITICAL: Budget Overrun Detected - {{projectName}}',
    '# 🚨 Critical Budget Overrun Alert

**Project:** {{projectName}}  
**Severity:** {{severity}}  
**Detected:** {{detectionDate}}

---

## Summary

- **Approved Budget:** ${{approvedBudget}}
- **Projected Cost:** ${{projectedCost}}
- **Overrun Amount:** ${{overrunAmount}} ({{overrunPercentage}}%)

## Impact

{{impactDescription}}

## Root Cause

{{rootCause}}

## Recommended Actions

{{recommendations}}

## Change Request

A Change Request has been auto-generated for your review:  
**CR ID:** {{changeRequestId}}

**Action Required:** Decision needed within {{deadline}}

[Review Change Request]({{reviewUrl}})

---

*This is an automated alert from ADPA Baseline & Drift Detection System*',
    '{"projectName": "string", "severity": "string", "detectionDate": "date", "approvedBudget": "number", "projectedCost": "number", "overrunAmount": "number", "overrunPercentage": "number", "impactDescription": "string", "rootCause": "string", "recommendations": "string", "changeRequestId": "string", "deadline": "string", "reviewUrl": "string"}'::jsonb
),
(
    'positive_drift_opportunity',
    'positive_drift',
    (SELECT id FROM notification_channels WHERE name = 'email'),
    '✨ Opportunity: Efficiency Improvement Detected - {{projectName}}',
    '# ✨ Positive Drift Detected - Opportunity!

**Project:** {{projectName}}  
**Drift Type:** {{driftType}}  
**Detected:** {{detectionDate}}

---

## What Happened

{{description}}

## Results

- **Cost Impact:** {{costImpact}}
- **Quality Impact:** {{qualityImpact}}
- **Timeline Impact:** {{timelineImpact}}

## Value

- **Current Project:** {{currentValue}}
- **If Replicated:** {{replicationValue}} ({{replicableProjectCount}} similar projects)

## Recommended Actions

{{recommendations}}

## Change Request

**CR ID:** {{changeRequestId}}

[Review Opportunity]({{reviewUrl}})

**Approval Required By:** {{deadline}}

---

*This is an automated alert from ADPA Baseline & Drift Detection System*',
    '{"projectName": "string", "driftType": "string", "detectionDate": "date", "description": "string", "costImpact": "string", "qualityImpact": "string", "timelineImpact": "string", "currentValue": "string", "replicationValue": "string", "replicableProjectCount": "number", "recommendations": "string", "changeRequestId": "string", "deadline": "string", "reviewUrl": "string"}'::jsonb
)
ON CONFLICT (name, channel_id, version) DO NOTHING;

-- Microsoft Teams Templates with Adaptive Cards
INSERT INTO notification_templates (name, notification_type, channel_id, subject_template, body_template, adaptive_card_template, variables) VALUES
(
    'budget_overrun_critical',
    'budget_overrun',
    (SELECT id FROM notification_channels WHERE name = 'teams'),
    '🚨 CRITICAL: Budget Overrun Detected',
    '**{{projectName}}** has exceeded budget by {{overrunPercentage}}%',
    '{
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4",
        "body": [
            {
                "type": "Container",
                "style": "attention",
                "items": [
                    {
                        "type": "TextBlock",
                        "text": "🚨 CRITICAL BUDGET OVERRUN",
                        "weight": "Bolder",
                        "size": "Large",
                        "color": "Attention"
                    }
                ]
            },
            {
                "type": "FactSet",
                "facts": [
                    {
                        "title": "Project:",
                        "value": "{{projectName}}"
                    },
                    {
                        "title": "Severity:",
                        "value": "{{severity}}"
                    },
                    {
                        "title": "Approved Budget:",
                        "value": "${{approvedBudget}}"
                    },
                    {
                        "title": "Projected Cost:",
                        "value": "${{projectedCost}}"
                    },
                    {
                        "title": "Overrun:",
                        "value": "${{overrunAmount}} ({{overrunPercentage}}%)"
                    }
                ]
            },
            {
                "type": "TextBlock",
                "text": "**Impact**",
                "weight": "Bolder",
                "spacing": "Medium"
            },
            {
                "type": "TextBlock",
                "text": "{{impactDescription}}",
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "**Root Cause**",
                "weight": "Bolder",
                "spacing": "Medium"
            },
            {
                "type": "TextBlock",
                "text": "{{rootCause}}",
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "**Change Request:** {{changeRequestId}}",
                "spacing": "Medium"
            },
            {
                "type": "TextBlock",
                "text": "⏰ **Decision Required:** {{deadline}}",
                "color": "Attention",
                "weight": "Bolder"
            }
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "Review Change Request",
                "url": "{{reviewUrl}}"
            }
        ]
    }'::jsonb,
    '{"projectName": "string", "severity": "string", "approvedBudget": "number", "projectedCost": "number", "overrunAmount": "number", "overrunPercentage": "number", "impactDescription": "string", "rootCause": "string", "changeRequestId": "string", "deadline": "string", "reviewUrl": "string"}'::jsonb
),
(
    'positive_drift_opportunity',
    'positive_drift',
    (SELECT id FROM notification_channels WHERE name = 'teams'),
    '✨ Opportunity: Efficiency Improvement Detected',
    '**{{projectName}}** - Efficiency improvement detected',
    '{
        "type": "AdaptiveCard",
        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
        "version": "1.4",
        "body": [
            {
                "type": "Container",
                "style": "good",
                "items": [
                    {
                        "type": "TextBlock",
                        "text": "✨ POSITIVE DRIFT DETECTED",
                        "weight": "Bolder",
                        "size": "Large",
                        "color": "Good"
                    }
                ]
            },
            {
                "type": "FactSet",
                "facts": [
                    {
                        "title": "Project:",
                        "value": "{{projectName}}"
                    },
                    {
                        "title": "Type:",
                        "value": "{{driftType}}"
                    },
                    {
                        "title": "Current Value:",
                        "value": "{{currentValue}}"
                    },
                    {
                        "title": "Replication Value:",
                        "value": "{{replicationValue}}"
                    },
                    {
                        "title": "Similar Projects:",
                        "value": "{{replicableProjectCount}}"
                    }
                ]
            },
            {
                "type": "TextBlock",
                "text": "**What Happened**",
                "weight": "Bolder",
                "spacing": "Medium"
            },
            {
                "type": "TextBlock",
                "text": "{{description}}",
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "**Results**",
                "weight": "Bolder",
                "spacing": "Medium"
            },
            {
                "type": "TextBlock",
                "text": "• Cost: {{costImpact}}\\n• Quality: {{qualityImpact}}\\n• Timeline: {{timelineImpact}}",
                "wrap": true
            },
            {
                "type": "TextBlock",
                "text": "**Change Request:** {{changeRequestId}}",
                "spacing": "Medium"
            },
            {
                "type": "TextBlock",
                "text": "⏰ **Approval Required By:** {{deadline}}",
                "weight": "Bolder"
            }
        ],
        "actions": [
            {
                "type": "Action.OpenUrl",
                "title": "Review Opportunity",
                "url": "{{reviewUrl}}"
            }
        ]
    }'::jsonb,
    '{"projectName": "string", "driftType": "string", "description": "string", "costImpact": "string", "qualityImpact": "string", "timelineImpact": "string", "currentValue": "string", "replicationValue": "string", "replicableProjectCount": "number", "changeRequestId": "string", "deadline": "string", "reviewUrl": "string"}'::jsonb
)
ON CONFLICT (name, channel_id, version) DO NOTHING;

-- Slack Templates with Block Kit
INSERT INTO notification_templates (name, notification_type, channel_id, subject_template, body_template, slack_blocks_template, variables) VALUES
(
    'budget_overrun_critical',
    'budget_overrun',
    (SELECT id FROM notification_channels WHERE name = 'slack'),
    NULL,
    '🚨 CRITICAL: Budget Overrun - {{projectName}}',
    '[
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": "🚨 CRITICAL BUDGET OVERRUN"
            }
        },
        {
            "type": "section",
            "fields": [
                {
                    "type": "mrkdwn",
                    "text": "*Project:*\\n{{projectName}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Severity:*\\n{{severity}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Approved Budget:*\\n${{approvedBudget}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Projected Cost:*\\n${{projectedCost}}"
                },
                {
                    "type": "mrkdwn",
                    "text": "*Overrun:*\\n${{overrunAmount}} ({{overrunPercentage}}%)"
                }
            ]
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Impact*\\n{{impactDescription}}"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Root Cause*\\n{{rootCause}}"
            }
        },
        {
            "type": "section",
            "text": {
                "type": "mrkdwn",
                "text": "*Change Request:* {{changeRequestId}}\\n⏰ *Decision Required:* {{deadline}}"
            }
        },
        {
            "type": "actions",
            "elements": [
                {
                    "type": "button",
                    "text": {
                        "type": "plain_text",
                        "text": "Review Change Request"
                    },
                    "url": "{{reviewUrl}}",
                    "style": "danger"
                }
            ]
        }
    ]'::jsonb,
    '{"projectName": "string", "severity": "string", "approvedBudget": "number", "projectedCost": "number", "overrunAmount": "number", "overrunPercentage": "number", "impactDescription": "string", "rootCause": "string", "changeRequestId": "string", "deadline": "string", "reviewUrl": "string"}'::jsonb
)
ON CONFLICT (name, channel_id, version) DO NOTHING;

COMMIT;

-- ============================================================================
-- DOWN Migration (Rollback)
-- ============================================================================
-- To rollback this migration, run the following:
/*
BEGIN;

DROP INDEX IF EXISTS idx_notification_rules_enabled;
DROP INDEX IF EXISTS idx_notification_rules_trigger;
DROP INDEX IF EXISTS idx_notification_log_created_at;
DROP INDEX IF EXISTS idx_notification_log_status;
DROP INDEX IF EXISTS idx_notification_log_recipient;
DROP INDEX IF EXISTS idx_notification_log_channel;
DROP INDEX IF EXISTS idx_notification_log_project;
DROP INDEX IF EXISTS idx_notification_log_reference;
DROP INDEX IF EXISTS idx_notification_templates_active;
DROP INDEX IF EXISTS idx_notification_templates_type;
DROP INDEX IF EXISTS idx_notification_templates_channel;
DROP INDEX IF EXISTS idx_notification_preferences_enabled;
DROP INDEX IF EXISTS idx_notification_preferences_type;
DROP INDEX IF EXISTS idx_notification_preferences_channel;
DROP INDEX IF EXISTS idx_notification_preferences_project;
DROP INDEX IF EXISTS idx_notification_preferences_user;
DROP INDEX IF EXISTS idx_notification_channels_name;
DROP INDEX IF EXISTS idx_notification_channels_enabled;

DROP TABLE IF EXISTS notification_rules;
DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS notification_templates;
DROP TABLE IF EXISTS notification_preferences;
DROP TABLE IF EXISTS notification_channels;

COMMIT;
*/
