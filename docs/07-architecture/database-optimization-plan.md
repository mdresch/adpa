# Database Schema Optimization Plan

**Date**: 2025-10-18  
**Status**: Proposed  
**Priority**: High

## Executive Summary

Current database contains **93 tables**, but only **27 (29%) are actively used**. This audit proposes removing or deferring **66 empty tables** to:
- Reduce schema complexity
- Improve maintainability  
- Enhance performance
- Simplify backups and migrations

## Current State

| Metric | Count |
|--------|-------|
| Total Tables | 93 |
| Active (with data) | 27 (29%) |
| Empty (unused) | 66 (71%) |
| Total DB Size | ~25 MB |

## Proposed Actions

### Phase 1: Immediate Cleanup (High Priority)

**Remove 50+ empty tables** that were pre-created but never used:

#### 1.1 Context/Freshness System (14 tables) - **REMOVE**
*These tables were planned for a context freshness feature that was never implemented:*

```sql
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
```

**Reason**: Feature not implemented, no plans to implement in near term.

#### 1.2 Unused Analytics Tables (12 tables) - **REMOVE**
*Analytics tables that were never populated:*

```sql
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
```

**Reason**: Existing `document_analytics`, `template_quality_metrics`, and `api_request_logs` provide sufficient analytics.

#### 1.3 Variable Resolution System (5 tables) - **REMOVE**
*Complex variable resolution system that wasn't needed:*

```sql
DROP TABLE IF EXISTS variable_analysis_results CASCADE;
DROP TABLE IF EXISTS variable_patterns CASCADE;
DROP TABLE IF EXISTS variable_resolution_cache CASCADE;
DROP TABLE IF EXISTS variable_resolution_metrics CASCADE;
DROP TABLE IF EXISTS variable_resolution_results CASCADE;
```

**Reason**: Template variable handling works with simpler approach.

#### 1.4 Unused Workflow Tables (2 tables) - **REMOVE**
```sql
DROP TABLE IF EXISTS workflow_executions CASCADE;
DROP TABLE IF EXISTS workflow_presets CASCADE;
```

**Reason**: Workflow functionality handled by `pipeline_executions` and `stage_executions`.

#### 1.5 Empty Supporting Tables (10 tables) - **REMOVE**
```sql
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
```

**Reason**: Functionality not used or handled elsewhere.

### Phase 2: Conditional Cleanup (Review Required)

**Tables to evaluate** based on planned features:

#### 2.1 User Personalization (7 tables) - **DEFER OR REMOVE**
*These tables support user personalization features not yet implemented:*

- `user_preferences` - Generic user preferences
- `user_collaboration_preferences` - Team collaboration settings
- `user_domain_knowledge` - Track user expertise areas
- `user_expertise` - Detailed expertise profiles
- `user_search_preferences` - Search customization
- `user_writing_style` - Writing style preferences
- `integration_sync_metadata` - Integration sync tracking

**Decision Required**: 
- **KEEP** if personalization features planned for next quarter
- **REMOVE** if not in roadmap

#### 2.2 Future Features (8 tables) - **DEFER**
*Tables for features that may be implemented later:*

- `integrations` - External integrations (Sharepoint, etc.)
- `milestones` - Project milestones (beyond phases)
- `phases` - Project phases
- `requirements` - Requirements tracking
- `risks` - Risk management
- `success_criteria` - Success criteria tracking
- `pipeline_configurations` - Pipeline config storage
- `template_versions` - Template versioning

**Recommendation**: Keep these tables but document they're for future use.

### Phase 3: Optimize Active Tables

**Tables with data that need optimization:**

#### 3.1 api_request_logs (13,589 rows)
```sql
-- Add partitioning by date for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_api_request_logs_timestamp 
  ON api_request_logs(timestamp) WHERE timestamp > NOW() - INTERVAL '30 days';

-- Archive old logs
DELETE FROM api_request_logs WHERE timestamp < NOW() - INTERVAL '90 days';
```

#### 3.2 user_activity_logs (642 rows)
```sql
-- Add composite index for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_activity_user_date 
  ON user_activity_logs(user_id, created_at DESC);
```

#### 3.3 stage_executions (160 rows)
```sql
-- Add index for pipeline lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_stage_executions_pipeline 
  ON stage_executions(pipeline_execution_id, stage_order);
```

#### 3.4 documents (70 rows)
```sql
-- Full-text search index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_content_fts 
  ON documents USING gin(to_tsvector('english', content::text));

-- Project + status lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_documents_project_status 
  ON documents(project_id, status) WHERE deleted_at IS NULL;
```

#### 3.5 templates (53 rows)
```sql
-- Framework and category lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_templates_framework_category 
  ON templates(framework, category) WHERE is_public = true;
```

## Implementation Plan

### Week 1: Backup & Validation
1. ✅ Full database backup
2. ✅ Export empty table DDL for reference
3. ✅ Validate no application code references empty tables

### Week 2: Phase 1 Cleanup
1. Drop context/freshness tables (14)
2. Drop unused analytics tables (12)  
3. Drop variable resolution tables (5)
4. Drop workflow tables (2)
5. Drop supporting tables (10)
6. **Total removed: 43 tables**

### Week 3: Phase 2 Review
1. Review user personalization roadmap
2. Decide: keep or remove 7 personalization tables
3. Document future-use tables

### Week 4: Phase 3 Optimization
1. Add recommended indexes
2. Archive old logs
3. Analyze query performance
4. Update ORM/migration scripts

## Expected Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Total Tables | 93 | ~50 | -46% |
| Empty Tables | 66 | ~15 | -77% |
| Schema Complexity | High | Medium | Better maintainability |
| Query Performance | Baseline | +15-30% | Optimized indexes |
| Backup Time | Baseline | -20% | Fewer tables |

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Code references empty tables | Low | Medium | Grep codebase before removal |
| Future feature needs table | Medium | Low | Keep DDL scripts for recreation |
| Migration rollback needed | Low | High | Full backup + test in staging |
| Performance regression | Low | Medium | Monitor queries post-optimization |

## Rollback Plan

If issues arise:
1. Restore from backup (full DB)
2. Or recreate specific tables from saved DDL
3. Revert index changes with `DROP INDEX`

## Next Steps

1. **Approve this plan** ✓ (awaiting approval)
2. **Create cleanup SQL scripts**
3. **Test in staging environment**
4. **Schedule maintenance window**
5. **Execute cleanup**
6. **Monitor & validate**

## Appendix A: Cleanup SQL Script

See: `scripts/cleanup-empty-tables.sql` (to be created)

## Appendix B: Keep-or-Remove Decision Matrix

| Table Group | Decision | Reason |
|-------------|----------|--------|
| Context System | ❌ Remove | Not implemented, no plans |
| Analytics (unused) | ❌ Remove | Duplicates existing analytics |
| Variable Resolution | ❌ Remove | Simpler approach works |
| User Personalization | ⏸️ Defer | Review roadmap |
| Future Features | ✅ Keep | Document as future-use |
| Core Active Tables | ✅ Keep | In active use |

---

**Prepared by**: Database Audit  
**Review**: Development Team  
**Approval**: Architecture Team

