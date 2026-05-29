BEGIN;

-- Drop table if it exists to ensure a clean slate for the upgraded schema
DROP TABLE IF EXISTS governance_audit_ledger;

CREATE TABLE IF NOT EXISTS governance_audit_ledger (
    audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    rule_code VARCHAR(100) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL,            -- 'DRACO_CANDIDATE' | 'COUNCIL_DEADLOCK'
    decision_status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING' | 'APPROVED' | 'REJECTED'
    consensus_achieved BOOLEAN NOT NULL,
    
    -- Adversarial Transcript Blocks
    evidence_validation_report JSONB NOT NULL,    -- Agent 4 Integrity Output
    purist_verdict JSONB NOT NULL,               -- Agent 1 Output
    realist_verdict JSONB NOT NULL,              -- Agent 2 Output
    arbitrator_verdict JSONB NOT NULL,           -- Agent 3 Output
    
    final_patch_payload JSONB DEFAULT NULL,     -- The generated candidate patch structure
    template_gate_context JSONB NOT NULL,        -- Minimum Required Scores & template weight parameters
    reviewed_by VARCHAR(255) DEFAULT NULL,       -- Human Auditor ID (e.g., Marcus Vance)
    resolved_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_gov_ledger_rule ON governance_audit_ledger(rule_code);
CREATE INDEX IF NOT EXISTS idx_gov_ledger_status ON governance_audit_ledger(decision_status);

COMMENT ON TABLE governance_audit_ledger IS 'Immutable ledger tracking adversarial 4-agent AI tribunal debates, template weight contexts, and human council voting states.';

COMMIT;
