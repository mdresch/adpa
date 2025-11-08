-- Migration 322: Approval Workflow System
-- TASK-745: Approval workflow integration
-- Implements formal approval workflows for change requests from drift detection

BEGIN;

-- Create extension if not exists (for UUID generation)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- APPROVAL WORKFLOWS TABLE
-- ============================================================================
-- Defines approval workflow templates and routing rules

CREATE TABLE IF NOT EXISTS approval_workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workflow identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    workflow_type VARCHAR(50) NOT NULL CHECK (workflow_type IN (
        'positive_drift',      -- Opportunity CRs from efficiency improvements
        'negative_drift',      -- Corrective action CRs
        'budget_overrun',      -- Budget overrun CRs
        'scope_change',        -- Scope change CRs
        'timeline_change',     -- Timeline/schedule change CRs
        'technical_change',    -- Technical baseline changes
        'general_cr'           -- Generic change requests
    )),
    
    -- Routing configuration
    routing_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Example: {"severity_threshold": "high", "auto_escalate": true}
    
    -- Approval stages (ordered list of approval steps)
    approval_stages JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Example: [
    --   {"stage": 1, "role": "project_sponsor", "required": true},
    --   {"stage": 2, "role": "cfo", "required_if": "budget_impact > 100000"},
    --   {"stage": 3, "role": "cto", "required_if": "technical_change"}
    -- ]
    
    -- SLA configuration
    sla_hours INTEGER NOT NULL DEFAULT 72,
    critical_sla_hours INTEGER DEFAULT 24,
    emergency_sla_hours INTEGER DEFAULT 12,
    
    -- Escalation rules
    escalation_enabled BOOLEAN DEFAULT TRUE,
    escalation_after_hours INTEGER DEFAULT 48,
    escalation_to VARCHAR(100)[],  -- Array of roles to escalate to
    
    -- Notification configuration
    notification_channels VARCHAR(50)[] DEFAULT ARRAY['email'],
    -- Supported: 'email', 'slack', 'sms', 'dashboard'
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- APPROVAL REQUESTS TABLE
-- ============================================================================
-- Individual approval requests (instances of workflows)

CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Workflow reference
    workflow_id UUID REFERENCES approval_workflows(id) ON DELETE SET NULL,
    
    -- Request identification
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'positive_drift',
        'negative_drift',
        'budget_overrun',
        'scope_change',
        'timeline_change',
        'technical_change',
        'general_cr'
    )),
    
    -- Related entities
    change_request_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    drift_record_id UUID REFERENCES baseline_drift_detection(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Request details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    impact_summary JSONB,  -- Financial, timeline, scope, risk impacts
    
    -- Current approval stage
    current_stage INTEGER DEFAULT 1,
    total_stages INTEGER NOT NULL,
    
    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',           -- Awaiting first approver
        'in_progress',       -- Partially approved, awaiting more approvers
        'approved',          -- All required approvals obtained
        'rejected',          -- Rejected by an approver
        'cancelled',         -- Cancelled by requester
        'expired',           -- Exceeded SLA without approval
        'escalated'          -- Escalated to higher authority
    )),
    
    -- Priority and severity
    priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical', 'emergency')),
    severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- SLA tracking
    sla_deadline TIMESTAMP,
    escalation_deadline TIMESTAMP,
    
    -- Timestamps
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    
    -- Decision details
    final_decision VARCHAR(50),
    decision_notes TEXT,
    decided_by UUID REFERENCES users(id),
    decided_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- APPROVAL STEPS TABLE
-- ============================================================================
-- Individual approval steps within a request

CREATE TABLE IF NOT EXISTS approval_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent request
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    
    -- Step details
    step_order INTEGER NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_description TEXT,
    
    -- Approver assignment
    approver_role VARCHAR(100),  -- Role required to approve
    approver_user_id UUID REFERENCES users(id),  -- Specific user assigned
    
    -- Optional/required
    is_required BOOLEAN DEFAULT TRUE,
    is_conditional BOOLEAN DEFAULT FALSE,
    condition_expression TEXT,  -- e.g., "budget_impact > 100000"
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'approved',
        'rejected',
        'skipped',
        'delegated'
    )),
    
    -- Decision
    decision VARCHAR(50),
    decision_notes TEXT,
    conditions TEXT[],  -- Array of conditions/requirements for approval
    
    -- Timestamps
    assigned_at TIMESTAMP DEFAULT NOW(),
    responded_at TIMESTAMP,
    
    -- Delegation
    delegated_to UUID REFERENCES users(id),
    delegated_at TIMESTAMP,
    delegated_reason TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE (approval_request_id, step_order)
);

-- ============================================================================
-- APPROVAL NOTIFICATIONS TABLE
-- ============================================================================
-- Tracks notifications sent for approval requests

CREATE TABLE IF NOT EXISTS approval_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Related entities
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    approval_step_id UUID REFERENCES approval_steps(id) ON DELETE CASCADE,
    
    -- Notification details
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'approval_requested',
        'approval_reminder',
        'approval_escalated',
        'approval_approved',
        'approval_rejected',
        'approval_expired',
        'approval_delegated'
    )),
    
    -- Channel and recipient
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('email', 'slack', 'sms', 'dashboard', 'webhook')),
    recipient_user_id UUID REFERENCES users(id),
    recipient_email VARCHAR(255),
    recipient_phone VARCHAR(50),
    
    -- Content
    subject VARCHAR(500),
    message TEXT NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason TEXT,
    
    -- Tracking
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- APPROVAL ESCALATIONS TABLE
-- ============================================================================
-- Tracks escalations of approval requests

CREATE TABLE IF NOT EXISTS approval_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Related approval request
    approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
    
    -- Escalation details
    escalation_type VARCHAR(50) NOT NULL CHECK (escalation_type IN (
        'sla_breach',        -- SLA deadline missed
        'manual',            -- Manually escalated
        'critical_severity', -- Critical/emergency priority
        'no_response'        -- Approver not responding
    )),
    
    -- Escalation path
    escalated_from_user_id UUID REFERENCES users(id),
    escalated_to_user_id UUID REFERENCES users(id),
    escalated_from_role VARCHAR(100),
    escalated_to_role VARCHAR(100),
    
    -- Reason and context
    reason TEXT NOT NULL,
    context JSONB,
    
    -- Resolution
    resolution_status VARCHAR(50) DEFAULT 'pending' CHECK (resolution_status IN (
        'pending',
        'resolved',
        'further_escalated'
    )),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- Timestamps
    escalated_at TIMESTAMP DEFAULT NOW(),
    escalated_by UUID REFERENCES users(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- APPROVAL AUDIT LOG TABLE
-- ============================================================================
-- Comprehensive audit trail for all approval actions

CREATE TABLE IF NOT EXISTS approval_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Related entities
    approval_request_id UUID REFERENCES approval_requests(id) ON DELETE CASCADE,
    approval_step_id UUID REFERENCES approval_steps(id) ON DELETE CASCADE,
    
    -- Action details
    action_type VARCHAR(100) NOT NULL,
    -- Examples: 'request_created', 'approval_granted', 'approval_rejected',
    --           'escalated', 'delegated', 'sla_breached', 'reminder_sent'
    
    action_description TEXT NOT NULL,
    
    -- Actor
    performed_by UUID REFERENCES users(id),
    performed_by_system BOOLEAN DEFAULT FALSE,
    
    -- Before/after state
    previous_state JSONB,
    new_state JSONB,
    
    -- Context
    ip_address VARCHAR(50),
    user_agent TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Approval workflows
CREATE INDEX IF NOT EXISTS idx_approval_workflows_type ON approval_workflows(workflow_type);
CREATE INDEX IF NOT EXISTS idx_approval_workflows_active ON approval_workflows(is_active);

-- Approval requests
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_priority ON approval_requests(priority);
CREATE INDEX IF NOT EXISTS idx_approval_requests_project ON approval_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_cr ON approval_requests(change_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_drift ON approval_requests(drift_record_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_sla ON approval_requests(sla_deadline) WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);

-- Approval steps
CREATE INDEX IF NOT EXISTS idx_approval_steps_request ON approval_steps(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_status ON approval_steps(status);
CREATE INDEX IF NOT EXISTS idx_approval_steps_approver ON approval_steps(approver_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_steps_role ON approval_steps(approver_role);

-- Approval notifications
CREATE INDEX IF NOT EXISTS idx_approval_notifications_request ON approval_notifications(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_recipient ON approval_notifications(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_status ON approval_notifications(status);
CREATE INDEX IF NOT EXISTS idx_approval_notifications_sent ON approval_notifications(sent_at DESC);

-- Approval escalations
CREATE INDEX IF NOT EXISTS idx_approval_escalations_request ON approval_escalations(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_escalations_status ON approval_escalations(resolution_status);
CREATE INDEX IF NOT EXISTS idx_approval_escalations_escalated_at ON approval_escalations(escalated_at DESC);

-- Approval audit log
CREATE INDEX IF NOT EXISTS idx_approval_audit_request ON approval_audit_log(approval_request_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_step ON approval_audit_log(approval_step_id);
CREATE INDEX IF NOT EXISTS idx_approval_audit_action ON approval_audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_approval_audit_created ON approval_audit_log(created_at DESC);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate SLA deadline based on priority
CREATE OR REPLACE FUNCTION calculate_approval_sla_deadline(
    p_priority VARCHAR,
    p_workflow_id UUID
) RETURNS TIMESTAMP AS $$
DECLARE
    v_sla_hours INTEGER;
BEGIN
    -- Get appropriate SLA hours based on priority
    CASE p_priority
        WHEN 'emergency' THEN
            SELECT emergency_sla_hours INTO v_sla_hours
            FROM approval_workflows WHERE id = p_workflow_id;
        WHEN 'critical' THEN
            SELECT critical_sla_hours INTO v_sla_hours
            FROM approval_workflows WHERE id = p_workflow_id;
        ELSE
            SELECT sla_hours INTO v_sla_hours
            FROM approval_workflows WHERE id = p_workflow_id;
    END CASE;
    
    -- Default to 72 hours if workflow not found
    v_sla_hours := COALESCE(v_sla_hours, 72);
    
    RETURN NOW() + (v_sla_hours || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Function to check if approval request SLA is breached
CREATE OR REPLACE FUNCTION check_approval_sla_breach(
    p_approval_request_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_sla_deadline TIMESTAMP;
    v_status VARCHAR;
BEGIN
    SELECT sla_deadline, status INTO v_sla_deadline, v_status
    FROM approval_requests
    WHERE id = p_approval_request_id;
    
    -- SLA breached if deadline passed and still pending/in_progress
    RETURN (
        v_sla_deadline IS NOT NULL AND
        v_sla_deadline < NOW() AND
        v_status IN ('pending', 'in_progress')
    );
END;
$$ LANGUAGE plpgsql;

-- Function to auto-advance approval request to next stage
CREATE OR REPLACE FUNCTION advance_approval_to_next_stage(
    p_approval_request_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_stage INTEGER;
    v_total_stages INTEGER;
    v_next_stage_exists BOOLEAN;
BEGIN
    -- Get current stage info
    SELECT current_stage, total_stages INTO v_current_stage, v_total_stages
    FROM approval_requests
    WHERE id = p_approval_request_id;
    
    -- Check if we have more stages
    IF v_current_stage >= v_total_stages THEN
        -- All stages complete, mark as approved
        UPDATE approval_requests
        SET status = 'approved',
            completed_at = NOW()
        WHERE id = p_approval_request_id;
        
        RETURN FALSE; -- No more stages
    END IF;
    
    -- Advance to next stage
    UPDATE approval_requests
    SET current_stage = current_stage + 1,
        status = 'in_progress'
    WHERE id = p_approval_request_id;
    
    RETURN TRUE; -- Advanced to next stage
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger to update approval_requests.updated_at
CREATE OR REPLACE FUNCTION trigger_update_approval_request_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER trigger_approval_requests_updated_at
    BEFORE UPDATE ON approval_requests
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_approval_request_timestamp();

-- Trigger to create audit log entry on approval step decision
CREATE OR REPLACE FUNCTION trigger_audit_approval_step_decision()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log when status changes to approved/rejected
    IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
        INSERT INTO approval_audit_log (
            approval_request_id,
            approval_step_id,
            action_type,
            action_description,
            performed_by,
            previous_state,
            new_state
        ) VALUES (
            NEW.approval_request_id,
            NEW.id,
            CASE WHEN NEW.status = 'approved' THEN 'approval_granted' ELSE 'approval_rejected' END,
            format('Step %s: %s', NEW.step_order, NEW.step_name),
            NEW.approver_user_id,
            jsonb_build_object('status', OLD.status, 'decision', OLD.decision),
            jsonb_build_object('status', NEW.status, 'decision', NEW.decision, 'notes', NEW.decision_notes)
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_approval_step_decision ON approval_steps;
CREATE TRIGGER trigger_audit_approval_step_decision
    AFTER UPDATE ON approval_steps
    FOR EACH ROW
    EXECUTE FUNCTION trigger_audit_approval_step_decision();

-- ============================================================================
-- SEED DEFAULT WORKFLOWS
-- ============================================================================

-- Insert default approval workflows

-- 1. Positive Drift Workflow (Opportunity CRs)
INSERT INTO approval_workflows (
    name,
    description,
    workflow_type,
    approval_stages,
    sla_hours,
    escalation_to,
    notification_channels
) VALUES (
    'Positive Drift - Opportunity Approval',
    'Approval workflow for efficiency improvements and innovation opportunities detected through drift analysis',
    'positive_drift',
    '[
        {"stage": 1, "role": "project_sponsor", "required": true},
        {"stage": 2, "role": "innovation_lead", "required": false},
        {"stage": 3, "role": "cto", "required_if": "technical_change"}
    ]'::jsonb,
    72,  -- 72 hours SLA for positive drift
    ARRAY['cto', 'cfo'],
    ARRAY['email', 'dashboard']
) ON CONFLICT DO NOTHING;

-- 2. Budget Overrun Workflow (Critical)
INSERT INTO approval_workflows (
    name,
    description,
    workflow_type,
    approval_stages,
    sla_hours,
    critical_sla_hours,
    emergency_sla_hours,
    escalation_to,
    notification_channels
) VALUES (
    'Budget Overrun - Corrective Action',
    'Urgent approval workflow for budget overrun change requests requiring immediate corrective action',
    'budget_overrun',
    '[
        {"stage": 1, "role": "project_sponsor", "required": true},
        {"stage": 2, "role": "cfo", "required": true},
        {"stage": 3, "role": "ceo", "required_if": "overrun_percentage > 25"}
    ]'::jsonb,
    24,  -- 24 hours standard
    12,  -- 12 hours critical
    6,   -- 6 hours emergency
    ARRAY['ceo', 'board_finance_committee'],
    ARRAY['email', 'slack', 'sms', 'dashboard']
) ON CONFLICT DO NOTHING;

-- 3. Negative Drift Workflow (General Corrective Action)
INSERT INTO approval_workflows (
    name,
    description,
    workflow_type,
    approval_stages,
    sla_hours,
    critical_sla_hours,
    escalation_to,
    notification_channels
) VALUES (
    'Negative Drift - Corrective Action',
    'Approval workflow for scope, timeline, or quality drift requiring corrective action',
    'negative_drift',
    '[
        {"stage": 1, "role": "project_sponsor", "required": true},
        {"stage": 2, "role": "program_manager", "required": true}
    ]'::jsonb,
    48,  -- 48 hours standard
    24,  -- 24 hours critical
    ARRAY['cto', 'cfo'],
    ARRAY['email', 'dashboard']
) ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE approval_workflows IS 'Defines approval workflow templates and routing rules for change requests (TASK-745)';
COMMENT ON TABLE approval_requests IS 'Individual approval request instances tracking the full approval lifecycle (TASK-745)';
COMMENT ON TABLE approval_steps IS 'Individual approval steps within each request, tracking approver decisions (TASK-745)';
COMMENT ON TABLE approval_notifications IS 'Tracks all notifications sent for approval requests across multiple channels (TASK-745)';
COMMENT ON TABLE approval_escalations IS 'Tracks escalations when approvals are delayed or require higher authority (TASK-745)';
COMMENT ON TABLE approval_audit_log IS 'Comprehensive audit trail for all approval-related actions (TASK-745)';

COMMENT ON FUNCTION calculate_approval_sla_deadline IS 'Calculates SLA deadline for approval request based on priority';
COMMENT ON FUNCTION check_approval_sla_breach IS 'Checks if an approval request has breached its SLA deadline';
COMMENT ON FUNCTION advance_approval_to_next_stage IS 'Advances an approval request to the next approval stage';

COMMIT;
