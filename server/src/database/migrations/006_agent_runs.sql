-- Agent Management System Tables
-- Run this migration to enable agent run persistence.

-- Top-level orchestration run record
CREATE TABLE IF NOT EXISTS agent_runs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID,                              -- NULL for global/unscoped runs
  goal          TEXT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'  -- pending|running|completed|failed|cancelled
                  CHECK (status IN ('pending','running','completed','failed','cancelled')),
  start_phase   INTEGER NOT NULL DEFAULT 1,        -- Allow restarting from a specific phase
  summary       TEXT,                              -- Final synthesis narrative
  consensus_score NUMERIC(4,3),                   -- 0.000–1.000 ECS consensus
  created_by    TEXT,                              -- user id or 'system'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agent_runs_project_id_idx ON agent_runs(project_id);
CREATE INDEX IF NOT EXISTS agent_runs_status_idx     ON agent_runs(status);
CREATE INDEX IF NOT EXISTS agent_runs_created_at_idx ON agent_runs(created_at DESC);

-- Per-phase record within a run
CREATE TABLE IF NOT EXISTS agent_run_phases (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  phase_number  INTEGER NOT NULL,           -- 1–10
  phase_name    VARCHAR(120) NOT NULL,
  domain        VARCHAR(50) NOT NULL,       -- pmbok|discovery|integration|general
  status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','running','completed','failed','skipped')),
  final_answer  TEXT,
  review_notes  TEXT,
  consensus_score NUMERIC(4,3),
  duration_ms   INTEGER,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS agent_run_phases_run_id_idx ON agent_run_phases(run_id);
CREATE UNIQUE INDEX IF NOT EXISTS agent_run_phases_run_phase_idx ON agent_run_phases(run_id, phase_number);

-- Individual streaming events within a phase
CREATE TABLE IF NOT EXISTS agent_run_events (
  id            BIGSERIAL PRIMARY KEY,
  run_id        UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  phase_id      UUID REFERENCES agent_run_phases(id) ON DELETE CASCADE,
  event_type    VARCHAR(30) NOT NULL       -- thought|action|observation|review|error|guidance
                  CHECK (event_type IN ('thought','action','observation','review','error','guidance','consensus','phase_start','phase_complete','run_complete')),
  content       TEXT NOT NULL,
  metadata      JSONB,                     -- e.g. tool name, args, duration
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_run_events_run_id_idx   ON agent_run_events(run_id);
CREATE INDEX IF NOT EXISTS agent_run_events_phase_id_idx ON agent_run_events(phase_id);
CREATE INDEX IF NOT EXISTS agent_run_events_created_at_idx ON agent_run_events(created_at);
