-- Context Access Control Database Schema
-- Creates tables for role-based access control and security management

-- Roles Table
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    role_type VARCHAR(50) NOT NULL CHECK (role_type IN ('system', 'organization', 'project', 'context', 'custom')),
    permissions JSONB DEFAULT '[]',
    constraints JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL
);

-- Permissions Table
CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    action VARCHAR(50) NOT NULL CHECK (action IN ('read', 'write', 'update', 'delete', 'share', 'export', 'import', 'admin', 'audit')),
    resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN ('context_item', 'context_bundle', 'context_source', 'template', 'document', 'project', 'user', 'system', 'all')),
    resource_id VARCHAR(255),
    conditions JSONB DEFAULT '[]',
    constraints JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL
);

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    context_id UUID REFERENCES contexts(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    removed_at TIMESTAMP WITH TIME ZONE,
    removed_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, role_id, context_id)
);

-- User Permissions Table
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    context_id UUID REFERENCES contexts(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    granted_by VARCHAR(255) NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    revoked_by VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(user_id, permission_id, context_id)
);

-- Role Permissions Table
CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    assigned_by VARCHAR(255) NOT NULL,
    UNIQUE(role_id, permission_id)
);

-- Contexts Table (if not exists)
CREATE TABLE IF NOT EXISTS contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    security_level VARCHAR(20) DEFAULT 'internal' CHECK (security_level IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
    access_level VARCHAR(20) DEFAULT 'read_only' CHECK (access_level IN ('no_access', 'read_only', 'read_write', 'full_access', 'admin_access')),
    owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Access Attempts Table
CREATE TABLE IF NOT EXISTS access_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('read', 'write', 'update', 'delete', 'share', 'export', 'import', 'admin', 'audit')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'denied')),
    reason TEXT,
    duration INTEGER DEFAULT 0, -- in milliseconds
    metadata JSONB DEFAULT '{}'
);

-- Access Logs Table
CREATE TABLE IF NOT EXISTS access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL CHECK (action IN ('read', 'write', 'update', 'delete', 'share', 'export', 'import', 'admin', 'audit')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    result VARCHAR(20) NOT NULL CHECK (result IN ('success', 'failure', 'denied')),
    reason TEXT,
    duration INTEGER DEFAULT 0, -- in milliseconds
    security_level VARCHAR(20) DEFAULT 'internal' CHECK (security_level IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
    access_level VARCHAR(20) DEFAULT 'read_only' CHECK (access_level IN ('no_access', 'read_only', 'read_write', 'full_access', 'admin_access')),
    restrictions_applied JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}'
);

-- Security Policies Table
CREATE TABLE IF NOT EXISTS security_policies (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    policy_type VARCHAR(50) NOT NULL CHECK (policy_type IN ('access_control', 'data_classification', 'encryption', 'audit', 'compliance', 'incident_response', 'risk_management')),
    context_id UUID REFERENCES contexts(id) ON DELETE CASCADE,
    rules JSONB DEFAULT '[]',
    enforcement_level VARCHAR(20) DEFAULT 'strict' CHECK (enforcement_level IN ('strict', 'warning', 'informational')),
    violation_actions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL
);

-- Security Level Changes Table
CREATE TABLE IF NOT EXISTS security_level_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    old_security_level VARCHAR(20) NOT NULL CHECK (old_security_level IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
    new_security_level VARCHAR(20) NOT NULL CHECK (new_security_level IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL
);

-- Access Grant Log Table
CREATE TABLE IF NOT EXISTS access_grant_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]',
    granted_by VARCHAR(255) NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Access Revocation Log Table
CREATE TABLE IF NOT EXISTS access_revocation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]',
    revoked_by VARCHAR(255) NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Access Update Log Table
CREATE TABLE IF NOT EXISTS access_update_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    permissions JSONB DEFAULT '[]',
    updated_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Role Assignment Log Table
CREATE TABLE IF NOT EXISTS role_assignment_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    context_id UUID REFERENCES contexts(id) ON DELETE CASCADE,
    assigned_by VARCHAR(255) NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Role Removal Log Table
CREATE TABLE IF NOT EXISTS role_removal_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(255) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    context_id UUID REFERENCES contexts(id) ON DELETE CASCADE,
    removed_by VARCHAR(255) NOT NULL,
    removed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Permission Creation Log Table
CREATE TABLE IF NOT EXISTS permission_creation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    permission_name VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Permission Update Log Table
CREATE TABLE IF NOT EXISTS permission_update_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_id VARCHAR(255) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    updates JSONB DEFAULT '{}',
    updated_by VARCHAR(255) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Permission Deletion Log Table
CREATE TABLE IF NOT EXISTS permission_deletion_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_id VARCHAR(255) NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    deleted_by VARCHAR(255) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Security Level Change Log Table
CREATE TABLE IF NOT EXISTS security_level_change_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
    old_security_level VARCHAR(20) NOT NULL CHECK (old_security_level IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
    new_security_level VARCHAR(20) NOT NULL CHECK (new_security_level IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')),
    changed_by VARCHAR(255) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    reason TEXT NOT NULL
);

-- Access Reports Table
CREATE TABLE IF NOT EXISTS access_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id VARCHAR(255) UNIQUE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timeframe VARCHAR(20) NOT NULL,
    total_access_attempts INTEGER DEFAULT 0,
    successful_accesses INTEGER DEFAULT 0,
    failed_accesses INTEGER DEFAULT 0,
    denied_accesses INTEGER DEFAULT 0,
    access_by_user JSONB DEFAULT '[]',
    access_by_context JSONB DEFAULT '[]',
    access_by_action JSONB DEFAULT '[]',
    security_incidents JSONB DEFAULT '[]',
    compliance_violations JSONB DEFAULT '[]',
    risk_assessment JSONB DEFAULT '{}',
    recommendations JSONB DEFAULT '[]',
    trends JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Access Pattern Analysis Table
CREATE TABLE IF NOT EXISTS access_pattern_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id VARCHAR(255) UNIQUE NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    timeframe VARCHAR(20) NOT NULL,
    total_accesses INTEGER DEFAULT 0,
    unique_users INTEGER DEFAULT 0,
    unique_contexts INTEGER DEFAULT 0,
    access_patterns JSONB DEFAULT '[]',
    anomalies JSONB DEFAULT '[]',
    risk_indicators JSONB DEFAULT '[]',
    recommendations JSONB DEFAULT '[]',
    trends JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
CREATE INDEX IF NOT EXISTS idx_roles_role_type ON roles(role_type);
CREATE INDEX IF NOT EXISTS idx_roles_created_by ON roles(created_by);

CREATE INDEX IF NOT EXISTS idx_permissions_name ON permissions(name);
CREATE INDEX IF NOT EXISTS idx_permissions_action ON permissions(action);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_type ON permissions(resource_type);
CREATE INDEX IF NOT EXISTS idx_permissions_resource_id ON permissions(resource_id);
CREATE INDEX IF NOT EXISTS idx_permissions_is_active ON permissions(is_active);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_context_id ON user_roles(context_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_is_active ON user_roles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_roles_assigned_at ON user_roles(assigned_at);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission_id ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_context_id ON user_permissions(context_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_is_active ON user_permissions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_permissions_granted_at ON user_permissions(granted_at);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

CREATE INDEX IF NOT EXISTS idx_contexts_name ON contexts(name);
CREATE INDEX IF NOT EXISTS idx_contexts_type ON contexts(type);
CREATE INDEX IF NOT EXISTS idx_contexts_security_level ON contexts(security_level);
CREATE INDEX IF NOT EXISTS idx_contexts_owner_id ON contexts(owner_id);

CREATE INDEX IF NOT EXISTS idx_access_attempts_attempt_id ON access_attempts(attempt_id);
CREATE INDEX IF NOT EXISTS idx_access_attempts_user_id ON access_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_access_attempts_context_id ON access_attempts(context_id);
CREATE INDEX IF NOT EXISTS idx_access_attempts_action ON access_attempts(action);
CREATE INDEX IF NOT EXISTS idx_access_attempts_timestamp ON access_attempts(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_attempts_result ON access_attempts(result);

CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_context_id ON access_logs(context_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_action ON access_logs(action);
CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_access_logs_result ON access_logs(result);
CREATE INDEX IF NOT EXISTS idx_access_logs_security_level ON access_logs(security_level);
CREATE INDEX IF NOT EXISTS idx_access_logs_access_level ON access_logs(access_level);

CREATE INDEX IF NOT EXISTS idx_security_policies_name ON security_policies(name);
CREATE INDEX IF NOT EXISTS idx_security_policies_policy_type ON security_policies(policy_type);
CREATE INDEX IF NOT EXISTS idx_security_policies_context_id ON security_policies(context_id);

CREATE INDEX IF NOT EXISTS idx_security_level_changes_context_id ON security_level_changes(context_id);
CREATE INDEX IF NOT EXISTS idx_security_level_changes_changed_at ON security_level_changes(changed_at);

CREATE INDEX IF NOT EXISTS idx_access_grant_log_user_id ON access_grant_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_grant_log_context_id ON access_grant_log(context_id);
CREATE INDEX IF NOT EXISTS idx_access_grant_log_granted_at ON access_grant_log(granted_at);

CREATE INDEX IF NOT EXISTS idx_access_revocation_log_user_id ON access_revocation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_revocation_log_context_id ON access_revocation_log(context_id);
CREATE INDEX IF NOT EXISTS idx_access_revocation_log_revoked_at ON access_revocation_log(revoked_at);

CREATE INDEX IF NOT EXISTS idx_access_update_log_user_id ON access_update_log(user_id);
CREATE INDEX IF NOT EXISTS idx_access_update_log_context_id ON access_update_log(context_id);
CREATE INDEX IF NOT EXISTS idx_access_update_log_updated_at ON access_update_log(updated_at);

CREATE INDEX IF NOT EXISTS idx_role_assignment_log_user_id ON role_assignment_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_log_role_id ON role_assignment_log(role_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_log_assigned_at ON role_assignment_log(assigned_at);

CREATE INDEX IF NOT EXISTS idx_role_removal_log_user_id ON role_removal_log(user_id);
CREATE INDEX IF NOT EXISTS idx_role_removal_log_role_id ON role_removal_log(role_id);
CREATE INDEX IF NOT EXISTS idx_role_removal_log_removed_at ON role_removal_log(removed_at);

CREATE INDEX IF NOT EXISTS idx_permission_creation_log_permission_id ON permission_creation_log(permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_creation_log_created_at ON permission_creation_log(created_at);

CREATE INDEX IF NOT EXISTS idx_permission_update_log_permission_id ON permission_update_log(permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_update_log_updated_at ON permission_update_log(updated_at);

CREATE INDEX IF NOT EXISTS idx_permission_deletion_log_permission_id ON permission_deletion_log(permission_id);
CREATE INDEX IF NOT EXISTS idx_permission_deletion_log_deleted_at ON permission_deletion_log(deleted_at);

CREATE INDEX IF NOT EXISTS idx_security_level_change_log_context_id ON security_level_change_log(context_id);
CREATE INDEX IF NOT EXISTS idx_security_level_change_log_changed_at ON security_level_change_log(changed_at);

CREATE INDEX IF NOT EXISTS idx_access_reports_report_id ON access_reports(report_id);
CREATE INDEX IF NOT EXISTS idx_access_reports_generated_at ON access_reports(generated_at);
CREATE INDEX IF NOT EXISTS idx_access_reports_timeframe ON access_reports(timeframe);

CREATE INDEX IF NOT EXISTS idx_access_pattern_analysis_analysis_id ON access_pattern_analysis(analysis_id);
CREATE INDEX IF NOT EXISTS idx_access_pattern_analysis_analyzed_at ON access_pattern_analysis(analyzed_at);
CREATE INDEX IF NOT EXISTS idx_access_pattern_analysis_timeframe ON access_pattern_analysis(timeframe);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_permissions_updated_at BEFORE UPDATE ON permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contexts_updated_at BEFORE UPDATE ON contexts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_policies_updated_at BEFORE UPDATE ON security_policies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to clean up expired roles and permissions
CREATE OR REPLACE FUNCTION cleanup_expired_access_control()
RETURNS VOID AS $$
BEGIN
    -- Remove expired user roles
    UPDATE user_roles 
    SET is_active = false, removed_at = CURRENT_TIMESTAMP, removed_by = 'system'
    WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_active = true;
    
    -- Remove expired user permissions
    UPDATE user_permissions 
    SET is_active = false, revoked_at = CURRENT_TIMESTAMP, revoked_by = 'system'
    WHERE expires_at IS NOT NULL AND expires_at < NOW() AND is_active = true;
    
    -- Log cleanup activity
    INSERT INTO access_update_log (
        user_id, context_id, permissions, updated_by, updated_at, reason
    ) VALUES (
        'system', '00000000-0000-0000-0000-000000000000'::uuid, '[]', 'system', NOW(), 'Cleanup expired access control'
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to generate default roles and permissions
CREATE OR REPLACE FUNCTION create_default_roles_and_permissions()
RETURNS VOID AS $$
BEGIN
    -- Create default roles
    INSERT INTO roles (id, name, description, role_type, created_by) VALUES
    ('admin', 'Administrator', 'Full system administrator with all permissions', 'system', 'system'),
    ('manager', 'Manager', 'Project manager with management permissions', 'organization', 'system'),
    ('editor', 'Editor', 'Content editor with write permissions', 'project', 'system'),
    ('viewer', 'Viewer', 'Content viewer with read-only permissions', 'context', 'system'),
    ('user', 'User', 'Basic user with limited permissions', 'custom', 'system')
    ON CONFLICT (id) DO NOTHING;
    
    -- Create default permissions
    INSERT INTO permissions (id, name, description, action, resource_type, created_by) VALUES
    ('context.read', 'Read Context', 'Read access to context data', 'read', 'context_item', 'system'),
    ('context.write', 'Write Context', 'Write access to context data', 'write', 'context_item', 'system'),
    ('context.update', 'Update Context', 'Update access to context data', 'update', 'context_item', 'system'),
    ('context.delete', 'Delete Context', 'Delete access to context data', 'delete', 'context_item', 'system'),
    ('context.share', 'Share Context', 'Share access to context data', 'share', 'context_item', 'system'),
    ('context.export', 'Export Context', 'Export access to context data', 'export', 'context_item', 'system'),
    ('context.import', 'Import Context', 'Import access to context data', 'import', 'context_item', 'system'),
    ('context.admin', 'Admin Context', 'Administrative access to context data', 'admin', 'context_item', 'system'),
    ('context.audit', 'Audit Context', 'Audit access to context data', 'audit', 'context_item', 'system')
    ON CONFLICT (id) DO NOTHING;
    
    -- Assign permissions to roles
    INSERT INTO role_permissions (role_id, permission_id, assigned_by) VALUES
    ('admin', 'context.read', 'system'),
    ('admin', 'context.write', 'system'),
    ('admin', 'context.update', 'system'),
    ('admin', 'context.delete', 'system'),
    ('admin', 'context.share', 'system'),
    ('admin', 'context.export', 'system'),
    ('admin', 'context.import', 'system'),
    ('admin', 'context.admin', 'system'),
    ('admin', 'context.audit', 'system'),
    ('manager', 'context.read', 'system'),
    ('manager', 'context.write', 'system'),
    ('manager', 'context.update', 'system'),
    ('manager', 'context.share', 'system'),
    ('manager', 'context.export', 'system'),
    ('editor', 'context.read', 'system'),
    ('editor', 'context.write', 'system'),
    ('editor', 'context.update', 'system'),
    ('viewer', 'context.read', 'system'),
    ('user', 'context.read', 'system')
    ON CONFLICT (role_id, permission_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Execute function to create default roles and permissions
SELECT create_default_roles_and_permissions();

-- Add comments for documentation
COMMENT ON TABLE roles IS 'System roles with associated permissions and constraints';
COMMENT ON TABLE permissions IS 'Individual permissions for specific actions on resources';
COMMENT ON TABLE user_roles IS 'User role assignments with context-specific scope';
COMMENT ON TABLE user_permissions IS 'Direct user permission assignments';
COMMENT ON TABLE role_permissions IS 'Permission assignments to roles';
COMMENT ON TABLE contexts IS 'Context resources with security levels and access controls';
COMMENT ON TABLE access_attempts IS 'Log of all access attempts with results and metadata';
COMMENT ON TABLE access_logs IS 'Comprehensive access log with security and compliance information';
COMMENT ON TABLE security_policies IS 'Security policies and rules for access control';
COMMENT ON TABLE security_level_changes IS 'Log of security level changes for contexts';
COMMENT ON TABLE access_grant_log IS 'Log of access grants to users';
COMMENT ON TABLE access_revocation_log IS 'Log of access revocations from users';
COMMENT ON TABLE access_update_log IS 'Log of access updates for users';
COMMENT ON TABLE role_assignment_log IS 'Log of role assignments to users';
COMMENT ON TABLE role_removal_log IS 'Log of role removals from users';
COMMENT ON TABLE permission_creation_log IS 'Log of permission creation';
COMMENT ON TABLE permission_update_log IS 'Log of permission updates';
COMMENT ON TABLE permission_deletion_log IS 'Log of permission deletions';
COMMENT ON TABLE security_level_change_log IS 'Log of security level changes';
COMMENT ON TABLE access_reports IS 'Generated access reports with analytics and insights';
COMMENT ON TABLE access_pattern_analysis IS 'Analysis of access patterns and anomalies';

