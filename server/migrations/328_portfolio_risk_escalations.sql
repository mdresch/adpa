-- Migration 328: Portfolio risk escalation tables & register view
-- Date: 2025-12-01
-- Purpose: Provide PMI Phase 4C portfolio risk register, escalation matrix, and routing logs

BEGIN;

-- 1. Create risk escalation policy catalog
CREATE TABLE IF NOT EXISTS risk_escalation_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    severity_levels TEXT[] DEFAULT ARRAY[]::TEXT[],
    probability_levels TEXT[] DEFAULT ARRAY[]::TEXT[],
    impact_levels TEXT[] DEFAULT ARRAY[]::TEXT[],
    financial_exposure_min NUMERIC(15,2),
    financial_exposure_max NUMERIC(15,2),
    schedule_impact_min INTEGER,
    schedule_impact_max INTEGER,
    systemic_only BOOLEAN DEFAULT FALSE,
    auto_trigger BOOLEAN DEFAULT TRUE,
    sla_hours INTEGER DEFAULT 24 CHECK (sla_hours > 0),
    notification_channel VARCHAR(50) DEFAULT 'email',
    escalation_type VARCHAR(50) DEFAULT 'risk',
    active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_escalation_policies_active
    ON risk_escalation_policies(active, escalation_type);

COMMENT ON TABLE risk_escalation_policies IS 'Defines threshold rules for risk escalation (severity, exposure, SLA).';

-- 2. Escalation steps (routing path per policy)
CREATE TABLE IF NOT EXISTS risk_escalation_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES risk_escalation_policies(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    role_name VARCHAR(120),
    notify_team VARCHAR(120),
    notify_user_id UUID REFERENCES users(id),
    channel VARCHAR(50) DEFAULT 'email',
    sla_hours INTEGER DEFAULT 24 CHECK (sla_hours > 0),
    instructions TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(policy_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_risk_escalation_steps_policy
    ON risk_escalation_steps(policy_id, step_order);

COMMENT ON TABLE risk_escalation_steps IS 'Ordered routing rules for each escalation policy.';

-- 3. Escalation events & step history
CREATE TABLE IF NOT EXISTS risk_escalation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    portfolio_risk_id UUID NOT NULL REFERENCES portfolio_risks(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES risk_escalation_policies(id) ON DELETE RESTRICT,
    current_step_id UUID REFERENCES risk_escalation_steps(id),
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'acknowledged', 'in_progress', 'overdue', 'resolved', 'cancelled')),
    triggered_by UUID REFERENCES users(id),
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_by UUID REFERENCES users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_risk_escalation_events_status
    ON risk_escalation_events(status, triggered_at DESC);

CREATE TABLE IF NOT EXISTS risk_escalation_event_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES risk_escalation_events(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES risk_escalation_steps(id) ON DELETE CASCADE,
    completed_by UUID REFERENCES users(id),
    completed_at TIMESTAMPTZ,
    status VARCHAR(30) DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'acknowledged', 'skipped', 'completed')),
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_risk_escalation_event_steps_event
    ON risk_escalation_event_steps(event_id, status);

-- 4. Extend portfolio_risks with escalation + aggregation fields
ALTER TABLE portfolio_risks
    ADD COLUMN IF NOT EXISTS severity VARCHAR(20),
    ADD COLUMN IF NOT EXISTS probability_level VARCHAR(20),
    ADD COLUMN IF NOT EXISTS financial_exposure NUMERIC(15,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS schedule_impact_days INTEGER,
    ADD COLUMN IF NOT EXISTS systemic BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS escalation_status VARCHAR(30) DEFAULT 'not_triggered'
        CHECK (escalation_status IN ('not_triggered', 'pending', 'acknowledged', 'overdue', 'resolved')),
    ADD COLUMN IF NOT EXISTS escalation_policy_id UUID,
    ADD COLUMN IF NOT EXISTS threshold_breach_reason TEXT,
    ADD COLUMN IF NOT EXISTS source_risk_ids UUID[] DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS mitigation_completion NUMERIC(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS aggregated_metrics JSONB DEFAULT '{}'::JSONB;

ALTER TABLE portfolio_risks
    ADD CONSTRAINT fk_portfolio_risks_escalation_policy
        FOREIGN KEY (escalation_policy_id) REFERENCES risk_escalation_policies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_portfolio_risks_escalation_status
    ON portfolio_risks(escalation_status, portfolio_id);

-- 5. Portfolio risk register view (aggregates mitigations & exposures)
CREATE OR REPLACE VIEW portfolio_risk_register AS
SELECT
    pr.id,
    pr.portfolio_id,
    pr.risk_title,
    pr.risk_description,
    pr.risk_category,
    pr.risk_status,
    pr.impact_level,
    pr.likelihood_level,
    pr.severity,
    pr.probability_level,
    pr.financial_exposure,
    pr.schedule_impact_days,
    pr.systemic,
    pr.escalation_status,
    pr.escalation_policy_id,
    pr.threshold_breach_reason,
    pr.last_reviewed_at,
    pr.next_review_due,
    pr.review_notes,
    mp.mitigation_plan_count,
    mp.mitigation_completed_count,
    mp.avg_completion_percentage,
    agg.aggregated_financial_impact,
    agg.max_probability_level,
    agg.max_impact_level,
    pr.source_risk_ids
FROM portfolio_risks pr
LEFT JOIN LATERAL (
    SELECT
        COUNT(*) AS mitigation_plan_count,
        COUNT(*) FILTER (WHERE status = 'completed') AS mitigation_completed_count,
        COALESCE(AVG(completion_percentage), 0) AS avg_completion_percentage
    FROM mitigation_plans mp
    WHERE pr.source_risk_ids IS NOT NULL
      AND mp.risk_id = ANY(pr.source_risk_ids)
) mp ON TRUE
LEFT JOIN LATERAL (
    SELECT
        COALESCE(SUM(COALESCE(r.financial_impact, 0)), pr.financial_exposure) AS aggregated_financial_impact,
        MAX(r.probability) AS max_probability_level,
        MAX(r.impact) AS max_impact_level
    FROM risks r
    WHERE pr.source_risk_ids IS NOT NULL
      AND r.id = ANY(pr.source_risk_ids)
) agg ON TRUE;

COMMENT ON VIEW portfolio_risk_register IS 'Operational view combining portfolio risk metadata, mitigations, and escalation context.';

-- 6. Threshold breach helper view
CREATE OR REPLACE VIEW portfolio_risk_threshold_breaches AS
SELECT
    pr.id AS portfolio_risk_id,
    pr.portfolio_id,
    pr.risk_title,
    pr.severity,
    pr.financial_exposure,
    pr.schedule_impact_days,
    pr.escalation_status,
    pr.threshold_breach_reason,
    rep.name AS policy_name,
    rep.sla_hours,
    rep.notification_channel
FROM portfolio_risks pr
LEFT JOIN risk_escalation_policies rep ON rep.id = pr.escalation_policy_id
WHERE pr.threshold_breach_reason IS NOT NULL
   OR pr.escalation_status IN ('pending', 'acknowledged', 'overdue');

COMMENT ON VIEW portfolio_risk_threshold_breaches IS 'Lists risks that breached defined escalation thresholds.';

COMMIT;

