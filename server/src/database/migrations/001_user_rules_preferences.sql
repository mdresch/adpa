-- User Rules and Preferences Migration
-- This migration adds comprehensive user rules and preferences management

-- User Rules table for custom business rules
CREATE TABLE user_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL, -- 'workflow', 'notification', 'access', 'automation', 'validation'
    conditions JSONB NOT NULL DEFAULT '{}', -- Rule conditions (when to apply)
    actions JSONB NOT NULL DEFAULT '{}', -- Actions to take when conditions are met
    priority INTEGER DEFAULT 0, -- Higher numbers = higher priority
    is_active BOOLEAN DEFAULT true,
    is_system_rule BOOLEAN DEFAULT false, -- System rules cannot be deleted by users
    scope VARCHAR(50) DEFAULT 'user', -- 'user', 'project', 'team', 'global'
    scope_id UUID, -- ID of the scope (project_id, team_id, etc.)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- User Preferences table for UI and behavior preferences
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'ui', 'notifications', 'workflow', 'integrations', 'security'
    preference_key VARCHAR(255) NOT NULL,
    preference_value JSONB NOT NULL,
    is_encrypted BOOLEAN DEFAULT false, -- For sensitive preferences
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, category, preference_key)
);

-- Rule Templates for common rule patterns
CREATE TABLE rule_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    template_conditions JSONB NOT NULL DEFAULT '{}',
    template_actions JSONB NOT NULL DEFAULT '{}',
    category VARCHAR(100), -- 'document_workflow', 'project_management', 'security', 'automation'
    is_system_template BOOLEAN DEFAULT false,
    is_public BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Rule Execution Log for auditing and debugging
CREATE TABLE rule_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_id UUID REFERENCES user_rules(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    execution_context JSONB NOT NULL DEFAULT '{}', -- Context when rule was triggered
    conditions_met BOOLEAN NOT NULL,
    actions_executed JSONB DEFAULT '[]',
    execution_time_ms INTEGER,
    status VARCHAR(20) DEFAULT 'success', -- 'success', 'failed', 'partial'
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Rule Groups for organizing related rules
CREATE TABLE user_rule_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7), -- Hex color code
    is_default BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Many-to-many relationship between rules and rule groups
CREATE TABLE user_rule_group_memberships (
    rule_id UUID REFERENCES user_rules(id) ON DELETE CASCADE,
    group_id UUID REFERENCES user_rule_groups(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rule_id, group_id)
);

-- Indexes for performance
CREATE INDEX idx_user_rules_user_id ON user_rules(user_id);
CREATE INDEX idx_user_rules_type ON user_rules(rule_type);
CREATE INDEX idx_user_rules_scope ON user_rules(scope, scope_id);
CREATE INDEX idx_user_rules_active ON user_rules(is_active);
CREATE INDEX idx_user_preferences_user_category ON user_preferences(user_id, category);
CREATE INDEX idx_rule_executions_rule_id ON rule_executions(rule_id);
CREATE INDEX idx_rule_executions_user_id ON rule_executions(user_id);
CREATE INDEX idx_rule_executions_executed_at ON rule_executions(executed_at);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_rules_updated_at BEFORE UPDATE ON user_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_rule_templates_updated_at BEFORE UPDATE ON rule_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_rule_groups_updated_at BEFORE UPDATE ON user_rule_groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default rule templates
INSERT INTO rule_templates (name, description, rule_type, template_conditions, template_actions, category, is_system_template) VALUES
(
    'Auto-approve Documents from Trusted Users',
    'Automatically approve documents created by users with specific roles',
    'workflow',
    '{"document_status": "pending_approval", "created_by_role": ["admin", "project_manager"]}',
    '{"action": "approve_document", "notify": true}',
    'document_workflow',
    true
),
(
    'Notify on High Priority Project Changes',
    'Send notifications when high priority projects are modified',
    'notification',
    '{"project_priority": "high", "change_type": ["status_change", "budget_change"]}',
    '{"action": "send_notification", "channels": ["email", "in_app"], "template": "high_priority_change"}',
    'project_management',
    true
),
(
    'Restrict Document Access by Department',
    'Limit document access based on user department',
    'access',
    '{"document_category": "confidential", "user_department": {"$not_in": ["legal", "executive"]}}',
    '{"action": "deny_access", "reason": "Department restriction"}',
    'security',
    true
),
(
    'Auto-assign Reviewers by Expertise',
    'Automatically assign document reviewers based on their expertise areas',
    'automation',
    '{"document_framework": {"$exists": true}, "document_status": "draft"}',
    '{"action": "assign_reviewers", "criteria": "expertise_match", "max_reviewers": 3}',
    'document_workflow',
    true
),
(
    'Schedule Regular Project Reports',
    'Automatically generate and send project reports on a schedule',
    'automation',
    '{"schedule": "weekly", "project_status": "active"}',
    '{"action": "generate_report", "template": "weekly_project_summary", "recipients": "project_stakeholders"}',
    'project_management',
    true
);

-- Insert default user preferences
INSERT INTO user_preferences (user_id, category, preference_key, preference_value) 
SELECT 
    u.id,
    'ui',
    'theme',
    '{"mode": "system", "primary_color": "blue", "sidebar_collapsed": false}'::jsonb
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up 
    WHERE up.user_id = u.id AND up.category = 'ui' AND up.preference_key = 'theme'
);

INSERT INTO user_preferences (user_id, category, preference_key, preference_value)
SELECT 
    u.id,
    'notifications',
    'default_settings',
    '{"email": true, "in_app": true, "push": false, "frequency": "immediate"}'::jsonb
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_preferences up 
    WHERE up.user_id = u.id AND up.category = 'notifications' AND up.preference_key = 'default_settings'
);

-- Create default rule group for each user
INSERT INTO user_rule_groups (user_id, name, description, is_default)
SELECT 
    u.id,
    'My Rules',
    'Default group for personal rules',
    true
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_rule_groups urg 
    WHERE urg.user_id = u.id AND urg.is_default = true
);
