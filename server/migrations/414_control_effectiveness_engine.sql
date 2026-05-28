-- Up Migration
BEGIN;

-- 1. Extend core rules table with cached evaluation metrics
ALTER TABLE policy_library
ADD COLUMN IF NOT EXISTS control_effectiveness_score NUMERIC(4,3),
ADD COLUMN IF NOT EXISTS control_effectiveness_status TEXT,
ADD COLUMN IF NOT EXISTS last_effectiveness_update TIMESTAMP WITH TIME ZONE;

-- 2. Create historical ledger for audit traceability and trend lines
CREATE TABLE IF NOT EXISTS rule_control_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_code TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    override_rate NUMERIC(5,4),
    patch_success_rate NUMERIC(5,4),
    avg_compliance_score NUMERIC(5,4),
    effectiveness_score NUMERIC(4,3),
    effectiveness_status TEXT,
    total_invocations INT,
    user_override_count INT,
    successful_patches INT,
    metadata JSONB
);

-- 3. Create indices for auditor lookup speeds
CREATE INDEX IF NOT EXISTS idx_effectiveness_rule_code ON rule_control_effectiveness(rule_code);
CREATE INDEX IF NOT EXISTS idx_effectiveness_timestamp ON rule_control_effectiveness(timestamp);

-- 4. Create event notification function (JSONB-safe parsing)
CREATE OR REPLACE FUNCTION notify_telemetry_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger background workers if invocation telemetry actually increments
    IF (OLD.telemetry_metrics->>'totalRuns' IS DISTINCT FROM NEW.telemetry_metrics->>'totalRuns') THEN
        PERFORM pg_notify('telemetry_updated', NEW.rule_code);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach trigger safely
DROP TRIGGER IF EXISTS trg_rules_telemetry_changed ON policy_library;
CREATE TRIGGER trg_rules_telemetry_changed
    AFTER UPDATE ON policy_library
    FOR EACH ROW
    EXECUTE FUNCTION notify_telemetry_update();

COMMIT;
