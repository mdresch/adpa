-- Migration: Performance Indices for Phase 5
-- Description: Adds indexes to optimize dashboard and project queries

-- 1. Projects table optimizations
CREATE INDEX IF NOT EXISTS idx_projects_program_id ON projects(program_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
-- GIN index for JSONB team_members query: projects.team_members ? $1::text
CREATE INDEX IF NOT EXISTS idx_projects_team_members ON projects USING GIN (team_members);

-- 2. Programs table optimizations (Table identified via ProjectRepository.ts usage)
-- Note: If this table was created dynamically, this will ensure it's indexed
CREATE INDEX IF NOT EXISTS idx_programs_portfolio_id ON programs(portfolio_id);

-- 3. Audit Log optimizations for AI usage tracking
-- audit_logs was merged into audit_log; equivalent index (idx_audit_actor_user on
-- actor_user_id, action) is created in the baseline schema, so no action needed here.

-- 4. Analytics Events optimizations
-- Current usage: INSERT and potential future reporting
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
