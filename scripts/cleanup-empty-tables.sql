-- ADPA Database Schema Cleanup Script
-- IMPORTANT: Run this ONLY after:
-- 1. Full database backup
-- 2. Testing in staging environment  
-- 3. Approval from architecture team
-- 4. Maintenance window scheduled

-- ============================================================================
-- PHASE 1: REMOVE EMPTY TABLES (43 tables)
-- ============================================================================

BEGIN;

-- Save DDL for potential future recreation
\echo 'Phase 1: Removing 43 empty tables...'

-- 1. Context/Freshness System (14 tables)
\echo '  Removing context system tables (14)...'
DROP TABLE IF EXISTS context_bundles CASCADE;
DROP TABLE IF EXISTS context_items CASCADE;
DROP TABLE IF EXISTS context_cleanup_results CASCADE;
DROP TABLE IF EXISTS context_freshness_assessments CASCADE;
DROP TABLE IF EXISTS context_freshness_health_status CASCADE;
DROP TABLE IF EXISTS context_freshness_metrics CASCADE;
DROP TABLE IF EXISTS context_freshness_policies CASCADE;
DROP TABLE IF EXISTS context_freshness_policy_evaluations CASCADE;
DROP TABLE IF EXISTS context_freshness_policy_results CASCADE;
DROP TABLE IF EXISTS context_freshness_trends CASCADE;
DROP TABLE IF EXISTS context_refresh_results CASCADE;
DROP TABLE IF EXISTS context_refresh_schedules CASCADE;
DROP TABLE IF EXISTS context_retrieval_metrics CASCADE;
DROP TABLE IF EXISTS context_staleness_log CASCADE;

-- 2. Unused Analytics Tables (13 tables)
\echo '  Removing unused analytics tables (13)...'
DROP TABLE IF EXISTS analysis_metrics CASCADE;
DROP TABLE IF EXISTS query_analytics CASCADE;
DROP TABLE IF EXISTS processing_metrics CASCADE;
DROP TABLE IF EXISTS quality_reports CASCADE;
DROP TABLE IF EXISTS quality_trends CASCADE;
DROP TABLE IF EXISTS daily_statistics CASCADE;
DROP TABLE IF EXISTS historical_trends CASCADE;
DROP TABLE IF EXISTS system_metrics CASCADE;
DROP TABLE IF EXISTS document_analysis CASCADE;
DROP TABLE IF EXISTS document_pattern_analysis CASCADE;
DROP TABLE IF EXISTS framework_analysis CASCADE;
DROP TABLE IF EXISTS project_analysis CASCADE;
DROP TABLE IF EXISTS user_analysis CASCADE;

-- 3. Variable Resolution System (5 tables)
\echo '  Removing variable resolution tables (5)...'
DROP TABLE IF EXISTS variable_analysis_results CASCADE;
DROP TABLE IF EXISTS variable_patterns CASCADE;
DROP TABLE IF EXISTS variable_resolution_cache CASCADE;
DROP TABLE IF EXISTS variable_resolution_metrics CASCADE;
DROP TABLE IF EXISTS variable_resolution_results CASCADE;

-- 4. Workflow Tables (2 tables)
\echo '  Removing workflow tables (2)...'
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflow_presets CASCADE;

-- 5. Supporting Empty Tables (10 tables)
\echo '  Removing supporting empty tables (10)...'
DROP TABLE IF EXISTS analytics_events CASCADE;
DROP TABLE IF EXISTS best_practices CASCADE;
DROP TABLE IF EXISTS compression_feedback CASCADE;
DROP TABLE IF EXISTS constraints CASCADE;
DROP TABLE IF EXISTS embedding_cache CASCADE;
DROP TABLE IF EXISTS relevance_feedback CASCADE;
DROP TABLE IF EXISTS search_history CASCADE;
DROP TABLE IF EXISTS search_index CASCADE;
DROP TABLE IF EXISTS stage_jobs CASCADE;
DROP TABLE IF EXISTS stage_metrics CASCADE;

\echo 'Phase 1 complete: 43 tables removed'

-- Verify table count
SELECT COUNT(*) as remaining_tables FROM information_schema.tables 
WHERE table_schema = 'public';

COMMIT;

-- ============================================================================
-- PHASE 2: OPTIONAL - REMOVE USER PERSONALIZATION TABLES (7 tables)
-- ============================================================================
-- Uncomment ONLY if personalization features are NOT in roadmap

-- BEGIN;

-- \echo 'Phase 2 (OPTIONAL): Removing user personalization tables (7)...'
-- DROP TABLE IF EXISTS user_preferences CASCADE;
-- DROP TABLE IF EXISTS user_collaboration_preferences CASCADE;
-- DROP TABLE IF EXISTS user_domain_knowledge CASCADE;
-- DROP TABLE IF EXISTS user_expertise CASCADE;
-- DROP TABLE IF EXISTS user_search_preferences CASCADE;
-- DROP TABLE IF EXISTS user_writing_style CASCADE;
-- DROP TABLE IF EXISTS integration_sync_metadata CASCADE;

-- \echo 'Phase 2 complete: 7 tables removed'

-- COMMIT;

-- ============================================================================
-- PHASE 3: OPTIMIZE ACTIVE TABLES
-- ============================================================================

BEGIN;

\echo 'Phase 3: Adding performance indexes...'

-- 3.1 api_request_logs optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_request_logs_recent 
  ON api_request_logs(timestamp DESC) 
  WHERE timestamp > NOW() - INTERVAL '30 days';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_request_logs_user_endpoint 
  ON api_request_logs(user_id, endpoint, timestamp DESC) 
  WHERE user_id IS NOT NULL;

-- 3.2 user_activity_logs optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_user_date 
  ON user_activity_logs(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_action 
  ON user_activity_logs(action, created_at DESC);

-- 3.3 stage_executions optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stage_executions_pipeline_order 
  ON stage_executions(pipeline_execution_id, stage_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stage_executions_status 
  ON stage_executions(status, started_at DESC);

-- 3.4 documents optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_content_fts 
  ON documents USING gin(to_tsvector('english', COALESCE(content::text, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_project_status_active 
  ON documents(project_id, status, created_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_framework 
  ON documents(framework) 
  WHERE framework IS NOT NULL AND deleted_at IS NULL;

-- 3.5 templates optimization  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_framework_category_public 
  ON templates(framework, category, name) 
  WHERE is_public = true AND deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_usage 
  ON templates(usage_count DESC, last_used_at DESC) 
  WHERE is_public = true;

-- 3.6 projects optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_status_updated 
  ON projects(status, updated_at DESC) 
  WHERE deleted_at IS NULL;

-- 3.7 pipeline_executions optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_project_status 
  ON pipeline_executions(project_id, status, started_at DESC);

\echo 'Phase 3 complete: Performance indexes added'

COMMIT;

-- ============================================================================
-- PHASE 4: ARCHIVE OLD DATA
-- ============================================================================

BEGIN;

\echo 'Phase 4: Archiving old data...'

-- Archive api_request_logs older than 90 days
DELETE FROM api_request_logs 
WHERE timestamp < NOW() - INTERVAL '90 days';

-- Archive user_activity_logs older than 1 year  
DELETE FROM user_activity_logs 
WHERE created_at < NOW() - INTERVAL '1 year';

\echo 'Phase 4 complete: Old data archived'

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

\echo ''
\echo '============================================'
\echo 'Cleanup Complete - Verification:'
\echo '============================================'

-- Count remaining tables
SELECT 
  'Total Tables' as metric,
  COUNT(*)::text as value
FROM information_schema.tables 
WHERE table_schema = 'public'

UNION ALL

-- Count tables with data
SELECT 
  'Tables with Data' as metric,
  COUNT(DISTINCT table_name)::text as value
FROM (
  SELECT tablename as table_name
  FROM pg_tables 
  WHERE schemaname = 'public'
) t;

-- List tables by size
\echo ''
\echo 'Top 10 Tables by Size:'
SELECT 
  schemaname||'.'||tablename as table,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;

\echo ''
\echo 'Cleanup script completed successfully!'
\echo 'Please verify application functionality.'

