# Template Analytics Operational Runbook

**Version**: 1.0.0  
**Last Updated**: December 22, 2025  
**Audience**: DevOps, System Administrators, Support Engineers

---

## Overview

This runbook provides operational procedures for maintaining and troubleshooting the Template Analytics system in production environments.

---

## System Architecture

### Components

1. **DocumentPurposeService**: Computes document-level entity counts and domain assignments
2. **TemplateAnalyticsService**: Aggregates template-level profiles from document data
3. **Database Views**: `document_entity_counts`, `aggregated_template_entity_view`
4. **Database Tables**: `documents` (extended), `template_entity_profile`

### Data Flow

```
Entity Extraction → Document Purpose Assignment → Template Profile Aggregation
```

---

## Health Checks

### Daily Health Check

```bash
# 1. Check for templates with missing analytics
curl -X GET \
  'http://localhost:5000/api/template-analytics/analytics/diagnostic/{template-id}' \
  -H 'Authorization: Bearer <admin-token>' \
  | jq '.recommendations'

# 2. Check server logs for errors
grep -i "template.*analytics\|purpose.*error" server/logs/error.log | tail -20

# 3. Verify database views
psql $DATABASE_URL -c "
  SELECT COUNT(*) FROM aggregated_template_entity_view;
"
```

### Weekly Health Check

```bash
# 1. Count templates without profiles
psql $DATABASE_URL -c "
  SELECT COUNT(*) 
  FROM templates t
  LEFT JOIN template_entity_profile tep ON t.id = tep.template_id
  WHERE tep.template_id IS NULL
    AND EXISTS (
      SELECT 1 FROM documents d WHERE d.template_id = t.id
    );
"

# 2. Check for stale analytics (not updated in 30 days)
psql $DATABASE_URL -c "
  SELECT 
    tep.template_id,
    t.name,
    tep.updated_at,
    NOW() - tep.updated_at as age
  FROM template_entity_profile tep
  JOIN templates t ON tep.template_id = t.id
  WHERE tep.updated_at < NOW() - INTERVAL '30 days'
  ORDER BY age DESC;
"
```

---

## Maintenance Procedures

### Routine Maintenance

#### Weekly: Refresh Analytics for Active Projects

```bash
# Get list of active projects (with recent document activity)
psql $DATABASE_URL -c "
  SELECT DISTINCT project_id
  FROM documents
  WHERE updated_at > NOW() - INTERVAL '7 days'
    AND template_id IS NOT NULL;
" | while read project_id; do
  curl -X POST \
    "http://localhost:5000/api/template-analytics/analytics/rebuild-document-purposes/$project_id" \
    -H 'Authorization: Bearer <admin-token>'
done
```

#### Monthly: Full System Health Rebuild

```bash
# Rebuild all template profiles (run during off-peak hours)
curl -X POST \
  'http://localhost:5000/api/template-analytics/analytics/rebuild-all' \
  -H 'Authorization: Bearer <admin-token>'
```

### Database Maintenance

#### Index Maintenance

```sql
-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_documents_template_id 
ON documents(template_id) 
WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_project_id 
ON documents(project_id);

CREATE INDEX IF NOT EXISTS idx_documents_entity_counts 
ON documents USING gin(entity_counts) 
WHERE entity_counts != '{}'::jsonb;

-- Analyze tables for query optimization
ANALYZE documents;
ANALYZE template_entity_profile;
```

#### View Refresh

```sql
-- Views are automatically updated, but can be refreshed if needed
REFRESH MATERIALIZED VIEW IF EXISTS aggregated_template_entity_view;
-- Note: This view is not materialized, but the query can be optimized
```

---

## Monitoring

### Key Metrics to Monitor

1. **Analytics Update Success Rate**
   ```sql
   -- Percentage of extraction jobs that successfully update analytics
   SELECT 
     COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*) as success_rate
   FROM jobs
   WHERE queue_name = 'project-data-extraction'
     AND created_at > NOW() - INTERVAL '24 hours';
   ```

2. **Templates Without Analytics**
   ```sql
   -- Count of templates with documents but no analytics
   SELECT COUNT(*)
   FROM templates t
   WHERE EXISTS (
     SELECT 1 FROM documents d WHERE d.template_id = t.id
   )
   AND NOT EXISTS (
     SELECT 1 FROM template_entity_profile tep WHERE tep.template_id = t.id
   );
   ```

3. **Average Rebuild Time**
   ```bash
   # Monitor rebuild endpoint response times
   # Add to monitoring system (e.g., Prometheus, DataDog)
   ```

### Alerting Thresholds

- **Critical**: > 10% of templates missing analytics
- **Warning**: > 5% of extraction jobs failing analytics updates
- **Info**: Rebuild operations taking > 5 minutes

---

## Incident Response

### Issue: Analytics Not Updating

**Symptoms**: New documents don't show in template analytics

**Response**:

1. **Check Extraction Job Status**:
   ```bash
   # Verify extraction jobs are completing
   psql $DATABASE_URL -c "
     SELECT status, COUNT(*) 
     FROM jobs 
     WHERE queue_name = 'project-data-extraction'
       AND created_at > NOW() - INTERVAL '1 hour'
     GROUP BY status;
   "
   ```

2. **Check Server Logs**:
   ```bash
   grep "EXTRACTION-PARENT.*Rebuilding" server/logs/combined.log | tail -20
   ```

3. **Manual Rebuild**:
   ```bash
   # Rebuild for affected project
   POST /api/template-analytics/analytics/rebuild-document-purposes/:projectId
   ```

### Issue: project-data-extraction DLQ at maximum messages

**Symptoms**: Dead-letter queue `project-data-extraction.dlq` has reached its max message limit (e.g. 20,000); new failed extraction jobs cannot be moved to the DLQ and may be dropped or cause errors.

**Response**:

1. **Purge the DLQ** (clears all failed messages so the queue is under the limit again):
   ```bash
   cd server
   npx ts-node scripts/purge-extraction-dlq.ts
   ```
   Or with Node: `node --import ts-node/esm scripts/purge-extraction-dlq.ts`

2. **Raise the DLQ limit** (optional, for future): Set `QUEUE_PROJECT_DATA_EXTRACTION_DLQ_MAX_LENGTH` (e.g. `50000`) in `server/.env`. This only applies when the queue is **created**; if the queue already exists with a broker policy, purge and delete the DLQ (via RabbitMQ management or `rabbitmqctl delete_queue project-data-extraction.dlq`), then restart the server so the queue is recreated with the new limit.

3. **Investigate root cause**: Check logs and failed jobs to reduce extraction failures so the DLQ does not fill again.

---

### Why extraction jobs cause the majority of failures

**Reasons**:

1. **Volume**: Each extraction run creates many **child jobs** (one per entity type, e.g. 60+). A single parent run can enqueue dozens of children; any child that fails after retries goes to the DLQ, so extraction contributes many more failed messages than other queues.
2. **External dependencies**: Child jobs call **AI providers** (OpenAI, Google, etc.). Timeouts, rate limits (429), and provider errors (5xx) are common and cause failures.
3. **Heavy work**: Each child loads project documents, builds prompts, calls the model, parses JSON, and writes to the DB. Large documents, token limits, or DB constraints can cause failures.
4. **Retries**: Extraction queue uses **2 attempts** and 5s backoff. Transient errors (e.g. brief rate limit) may still land in the DLQ if both attempts fail.

**Common failure causes** (check `error_message` on failed jobs and `[EXTRACTION-CHILD]` in logs):

| Cause | Example | Mitigation |
|-------|---------|------------|
| AI rate limit | 429, "rate limit" | Increase backoff; reduce concurrency (QUEUE_PREFETCH); use a provider with higher quota. |
| AI timeout | ETIMEDOUT, "timeout" | Increase AI client timeout; use smaller documents or chunking. |
| Token / length | "max_tokens", "context length" | Reduce document size sent to AI or increase max_tokens in extraction config. |
| JSON parse | "Unexpected token", "JSON" | AI returned invalid JSON; add retry or stricter prompt/output validation. |
| DB constraint | Unique violation, NOT NULL | Fix data or schema; ensure deduplication before insert. |
| No documents | "No documents found" | Job may complete with 0 entities (orchestrator returns []); if it throws, ensure project has documents. |

**Operational steps**:

- **Query failed extraction jobs** (last 24h):
  ```sql
  SELECT id, type, status, error_message, created_at
  FROM jobs
  WHERE queue_name = 'project-data-extraction' AND status = 'failed'
    AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 100;
  ```
- **Group by error_message** to find the most frequent failure reason.
- **Adjust retries**: Child jobs are enqueued with `attempts: 3` and exponential backoff in `ExtractionOrchestrationService`; the main queue worker uses 2 attempts. Consider increasing extraction queue `defaultAttempts` (e.g. to 3) in `queueService.ts` for more retries on transient errors.
- **Purge DLQ** when it hits the limit (see "Issue: project-data-extraction DLQ at maximum messages" above).

---

### Issue: Database Performance Degradation

**Symptoms**: Slow queries, high CPU usage during rebuilds

**Response**:

1. **Check Active Rebuilds**:
   ```sql
   -- Find long-running queries
   SELECT pid, now() - pg_stat_activity.query_start AS duration, query
   FROM pg_stat_activity
   WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
     AND query LIKE '%template_entity_profile%';
   ```

2. **Cancel Long-Running Queries** (if needed):
   ```sql
   SELECT pg_cancel_backend(pid)
   FROM pg_stat_activity
   WHERE pid = <problematic_pid>;
   ```

3. **Optimize Rebuild Strategy**:
   - Use project-scoped rebuilds instead of system-wide
   - Schedule rebuilds during off-peak hours
   - Consider batching template updates

### Issue: Data Inconsistency

**Symptoms**: Analytics show incorrect domain coverage or entity counts

**Response**:

1. **Run Diagnostic**:
   ```bash
   GET /api/template-analytics/analytics/diagnostic/:templateId
   ```

2. **Compare with Source Data**:
   ```sql
   -- Compare document entity_counts with actual entities
   SELECT 
     d.id,
     d.name,
     (d.entity_counts->>'stakeholders')::int as doc_count,
     COUNT(s.id) as actual_count
   FROM documents d
   LEFT JOIN stakeholders s ON s.source_document_id = d.id
   WHERE d.template_id = 'template-id'
   GROUP BY d.id, d.name, d.entity_counts;
   ```

3. **Full Rebuild**:
   ```bash
   POST /api/template-analytics/analytics/rebuild-all
   # Body: { "projectId": "affected-project-id" }
   ```

---

## Backup and Recovery

### Backup Procedures

#### Daily Backup (Included in Database Backup)

```sql
-- Template analytics data is included in standard database backups
-- No additional backup needed
```

#### Pre-Maintenance Backup

```bash
# Before major rebuilds, export analytics data
psql $DATABASE_URL -c "
  COPY (
    SELECT * FROM template_entity_profile
  ) TO STDOUT WITH CSV HEADER
" > template_entity_profile_backup_$(date +%Y%m%d).csv
```

### Recovery Procedures

#### Restore Template Profiles

```sql
-- If needed, restore from backup
COPY template_entity_profile FROM '/path/to/backup.csv' WITH CSV HEADER;
```

#### Rebuild After Recovery

```bash
# After restoring, rebuild to ensure consistency
POST /api/template-analytics/analytics/rebuild-all
```

---

## Performance Tuning

### Database Optimization

```sql
-- Update statistics for query planner
ANALYZE documents;
ANALYZE template_entity_profile;

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM aggregated_template_entity_view
WHERE template_id = 'template-id';
```

### Application Optimization

1. **Batch Template Updates**: Update multiple templates in single transaction
2. **Async Processing**: Use background jobs for large rebuilds
3. **Caching**: Cache template profiles in Redis (if implemented)

---

## Scaling Considerations

### High-Volume Scenarios

1. **Partitioning**: Consider partitioning `documents` table by `project_id`
2. **Materialized Views**: Convert `aggregated_template_entity_view` to materialized view
3. **Background Jobs**: Move rebuilds to dedicated worker processes

### Multi-Region Deployment

1. **Replication**: Ensure analytics data is replicated across regions
2. **Consistency**: Use eventual consistency model for analytics updates
3. **Conflict Resolution**: Handle concurrent updates to same template

---

## Security Considerations

1. **Access Control**: All rebuild endpoints require admin authentication
2. **Audit Logging**: Log all rebuild operations for compliance
3. **Rate Limiting**: Consider rate limiting for rebuild endpoints
4. **Input Validation**: All UUIDs are validated before processing

---

## Change Management

### Before Deploying Changes

1. **Backup Analytics Data**
2. **Test in Staging Environment**
3. **Review Migration Scripts**
4. **Plan Rollback Strategy**

### After Deploying Changes

1. **Verify Analytics Still Working**
2. **Monitor Error Rates**
3. **Check Performance Metrics**
4. **Update Documentation**

---

## Related Documentation

- [Template Analytics API Reference](./TEMPLATE_ANALYTICS_API_REFERENCE.md)
- [Template Analytics Troubleshooting](./TEMPLATE_ANALYTICS_TROUBLESHOOTING.md)
- [Template Analytics Implementation](./TEMPLATE_ANALYTICS_IMPLEMENTATION_COMPLETE.md)

---

## Support Contacts

- **Technical Issues**: Check logs and diagnostic endpoints first
- **Data Issues**: Use troubleshooting guide
- **Performance Issues**: Review performance tuning section
- **Emergency**: Follow incident response procedures

