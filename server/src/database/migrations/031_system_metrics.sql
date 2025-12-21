
-- Migration: System Metrics Table
-- Phase 5: Resource Monitoring

CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    cpu_usage_percent FLOAT NOT NULL,
    memory_usage_percent FLOAT NOT NULL,
    disk_usage_percent FLOAT NOT NULL,
    network_usage_percent FLOAT NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for efficient time-range queries
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at);
