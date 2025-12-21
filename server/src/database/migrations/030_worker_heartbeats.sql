-- Create worker_heartbeats table for real-time resource monitoring
CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id TEXT PRIMARY KEY,
  worker_process_id INTEGER NOT NULL,
  queue_name TEXT NOT NULL,
  cpu_usage_percent FLOAT NOT NULL,
  memory_usage_mb FLOAT NOT NULL,
  last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_worker_heartbeats_last_heartbeat ON worker_heartbeats(last_heartbeat);

COMMENT ON TABLE worker_heartbeats IS 'Tracks active worker heartbeats and their resource usage (CPU/Memory)';
