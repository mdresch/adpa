-- Migration: Health Checks Table for integration testing and monitoring
-- Required for Issue 2.1 Test Harness

CREATE TABLE IF NOT EXISTS health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status VARCHAR(20) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for temporal queries
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp);
