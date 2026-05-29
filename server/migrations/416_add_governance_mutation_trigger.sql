BEGIN;

CREATE OR REPLACE FUNCTION fn_notify_governance_control_mutation()
RETURNS TRIGGER AS $$
DECLARE
    payload JSONB;
    historical_trend JSONB;
    failure_logs JSONB;
    doc_type_string TEXT;
BEGIN
    -- Extract the primary document tier from the array safely
    IF NEW.target_document_types IS NOT NULL AND array_length(NEW.target_document_types, 1) > 0 THEN
        doc_type_string := NEW.target_document_types[1];
    ELSE
        doc_type_string := 'TECHNICAL_SPEC';
    END IF;

    -- Only fire the trigger if the status flips to INEFFECTIVE
    IF (NEW.control_effectiveness_status = 'INEFFECTIVE' AND 
        (OLD.control_effectiveness_status IS DISTINCT FROM 'INEFFECTIVE' OR OLD.control_effectiveness_status IS NULL)) THEN
        
        -- Gather previous execution snapshots (using rule_control_effectiveness)
        SELECT COALESCE(jsonb_agg(t), '[]'::jsonb) INTO historical_trend 
        FROM (
            SELECT effectiveness_score, timestamp 
            FROM rule_control_effectiveness 
            WHERE rule_code = NEW.rule_code 
            ORDER BY timestamp DESC LIMIT 15
        ) t;

        -- Pull error entries from the audit ledger
        SELECT COALESCE(jsonb_agg(f), '[]'::jsonb) INTO failure_logs 
        FROM (
            SELECT evidence_validation_report->>'findings' as error, event_type 
            FROM governance_audit_ledger 
            WHERE rule_code = NEW.rule_code 
            ORDER BY timestamp DESC LIMIT 3
        ) f;

        -- Build the standard ControlDegradationPayload from execution_schema JSONB properties
        payload := jsonb_build_object(
            'ruleCode', NEW.rule_code,
            'documentType', doc_type_string,
            'minimumRequiredScore', COALESCE((NEW.execution_schema->>'minimumRequiredScore')::int, (NEW.execution_schema->>'min_score')::int, 90),
            'mandatoryKeywords', COALESCE(NEW.execution_schema->'mandatoryKeywords', NEW.execution_schema->'required_keywords', '[]'::jsonb),
            'historicalTrend', historical_trend,
            'failureLogs', failure_logs
        );

        PERFORM pg_notify('governance_control_mutation', payload::text);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_policy_library_effectiveness_mutation ON policy_library;
CREATE TRIGGER trg_policy_library_effectiveness_mutation
    AFTER UPDATE ON policy_library
    FOR EACH ROW
    EXECUTE FUNCTION fn_notify_governance_control_mutation();

COMMIT;
