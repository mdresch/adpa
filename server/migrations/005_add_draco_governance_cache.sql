-- 005_add_draco_governance_cache.sql
-- Caching Registry V7 governance reports for the DRACO Board.

CREATE TABLE IF NOT EXISTS draco_governance_cache (
    project_id TEXT PRIMARY KEY,
    health_score FLOAT NOT NULL,
    report_json JSONB NOT NULL,
    report_hash TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    stale BOOLEAN DEFAULT FALSE
);

COMMENT ON TABLE draco_governance_cache IS 'Read-model cache for PMBOK Registry V7 governance reports, consumed by the DRACO Board.';
