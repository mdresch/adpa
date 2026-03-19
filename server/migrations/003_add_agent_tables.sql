-- Migration to add agent orchestration tables

BEGIN;

CREATE TABLE IF NOT EXISTS "agent_runs" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "project_id" UUID REFERENCES "projects"("id") ON DELETE SET NULL,
    "goal" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "summary" TEXT,
    "consensus_score" NUMERIC(5, 2),
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS "agent_run_phases" (
    "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    "run_id" UUID NOT NULL REFERENCES "agent_runs"("id") ON DELETE CASCADE,
    "phase_number" INTEGER NOT NULL,
    "phase_name" VARCHAR(255) NOT NULL,
    "domain" VARCHAR(100),
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "final_answer" TEXT,
    "duration_ms" BIGINT,
    "started_at" TIMESTAMP WITH TIME ZONE,
    "completed_at" TIMESTAMP WITH TIME ZONE,
    UNIQUE("run_id", "phase_number")
);

CREATE TABLE IF NOT EXISTS "agent_run_events" (
    "id" BIGSERIAL PRIMARY KEY,
    "phase_id" UUID NOT NULL REFERENCES "agent_run_phases"("id") ON DELETE CASCADE,
    "run_id" UUID NOT NULL, -- Denormalized for easier querying
    "type" VARCHAR(50) NOT NULL, -- 'thought', 'action', 'observation', 'error', 'review', 'consensus'
    "content" JSONB NOT NULL,
    "timestamp" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_project_id ON "agent_runs" ("project_id");
CREATE INDEX IF NOT EXISTS idx_agent_run_phases_run_id ON "agent_run_phases" ("run_id");
CREATE INDEX IF NOT EXISTS idx_agent_run_events_phase_id ON "agent_run_events" ("phase_id");
CREATE INDEX IF NOT EXISTS idx_agent_run_events_run_id ON "agent_run_events" ("run_id");

COMMIT;
