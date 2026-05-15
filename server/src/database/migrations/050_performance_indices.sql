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

-- 3. Audit Logs optimizations for AI usage tracking
-- Current query: WHERE user_id = $1 AND action = 'ai_generate'
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action);

-- 4. Analytics Events optimizations
-- Current usage: INSERT and potential future reporting
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_type ON analytics_events(user_id, event_type);
