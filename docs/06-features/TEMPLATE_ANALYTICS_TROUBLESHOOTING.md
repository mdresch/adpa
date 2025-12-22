# Template Analytics Troubleshooting Guide

**Version**: 1.0.0  
**Last Updated**: December 22, 2025

---

## Overview

This guide helps diagnose and resolve common issues with the Template Analytics system, including missing data, inconsistent analytics, and rebuild failures.

---

## Quick Diagnostic Checklist

1. ✅ Check if documents have `entity_counts` populated
2. ✅ Verify `template_id` is set on documents
3. ✅ Confirm extraction jobs completed successfully
4. ✅ Check `template_entity_profile` table for template data
5. ✅ Review server logs for errors

---

## Common Issues

### Issue 1: "No entity production data available yet"

**Symptoms**:
- Template Purpose & Profile tab shows empty state
- Frontend displays "No entity production data available yet"

**Diagnosis**:
```bash
# Use diagnostic endpoint
GET /api/template-analytics/analytics/diagnostic/:templateId
```

**Check**:
- `documents.with_entity_counts` should be > 0
- `recommendations.needsExtraction` should be `false`

**Solutions**:

1. **Run Extraction** (if `needsExtraction: true`):
   ```bash
   # Navigate to project documents page
   # Click "Extract Entities" button
   # Wait for extraction job to complete
   ```

2. **Rebuild Analytics** (if extraction exists but analytics missing):
   ```bash
   # Use admin rebuild button in UI
   # Or via API:
   POST /api/template-analytics/analytics/rebuild-template/:templateId
   ```

3. **Verify Template Assignment**:
   ```sql
   -- Check if documents have template_id set
   SELECT COUNT(*) 
   FROM documents 
   WHERE template_id = 'your-template-id';
   ```

---

### Issue 2: Template Analytics Not Updating After Extraction

**Symptoms**:
- Extraction completes successfully
- Template analytics remain unchanged
- Entity counts visible in document entities page

**Diagnosis**:
```bash
# Check extraction job logs
# Look for: [EXTRACTION-PARENT] Rebuilding document purposes
# Look for: [EXTRACTION-PARENT] Updating template entity profile
```

**Solutions**:

1. **Check Extraction Orchestration Logs**:
   ```bash
   # Look for errors in:
   # server/logs/combined.log
   # Search for: EXTRACTION-PARENT
   ```

2. **Manual Rebuild**:
   ```bash
   # Rebuild for specific project
   POST /api/template-analytics/analytics/rebuild-document-purposes/:projectId
   
   # Then rebuild template
   POST /api/template-analytics/analytics/rebuild-template/:templateId
   ```

3. **Verify Database Connection**:
   ```sql
   -- Check if database pool is available
   SELECT 1;
   ```

---

### Issue 3: Inconsistent Domain Coverage

**Symptoms**:
- Domain coverage percentages don't match expected values
- Primary domain seems incorrect
- Secondary domains missing

**Diagnosis**:
```sql
-- Check entity_counts structure
SELECT 
  id,
  name,
  entity_counts,
  inferred_primary_domain,
  inferred_secondary_domains
FROM documents
WHERE template_id = 'your-template-id'
LIMIT 5;
```

**Solutions**:

1. **Verify Entity Weights**:
   ```typescript
   // Check ENTITY_DOMAIN_WEIGHTS in:
   // types/entity-domain-weights.ts
   // Ensure weights are correct for your entity types
   ```

2. **Rebuild with Fresh Data**:
   ```bash
   # Full rebuild for project
   POST /api/template-analytics/analytics/rebuild-all
   # Body: { "projectId": "your-project-id" }
   ```

3. **Check Entity Source Documents**:
   ```sql
   -- Verify entities have source_document_id
   SELECT 
     COUNT(*) as total,
     COUNT(CASE WHEN source_document_id IS NOT NULL THEN 1 END) as with_source
   FROM stakeholders
   WHERE project_id = 'your-project-id';
   ```

---

### Issue 4: Rebuild Endpoint Returns 500 Error

**Symptoms**:
- API returns 500 Internal Server Error
- Rebuild operations fail
- Server logs show errors

**Diagnosis**:
```bash
# Check server logs
tail -f server/logs/error.log
# Look for: Rebuild template analytics error
```

**Common Causes**:

1. **Database Connection Issues**:
   ```bash
   # Verify database is accessible
   psql $DATABASE_URL -c "SELECT 1;"
   ```

2. **Missing Database Views**:
   ```sql
   -- Check if views exist
   SELECT * FROM information_schema.views 
   WHERE table_name IN (
     'document_entity_counts',
     'aggregated_template_entity_view'
   );
   ```

3. **JSONB Serialization Errors**:
   ```bash
   # Check for: invalid input syntax for type json
   # Solution: Ensure JSONB fields are properly stringified
   ```

**Solutions**:

1. **Run Migration** (if views missing):
   ```bash
   cd server
   npx ts-node scripts/run-migration-700-template-purpose.ts
   ```

2. **Check Database Pool**:
   ```typescript
   // Verify pool is initialized
   import { getDatabasePool } from './database/connection'
   const pool = getDatabasePool()
   // Should not be null
   ```

3. **Review Error Details**:
   ```bash
   # Check full error stack in logs
   grep -A 20 "Rebuild template analytics error" server/logs/error.log
   ```

---

### Issue 5: Slow Rebuild Performance

**Symptoms**:
- Rebuild operations take very long
- Timeout errors
- High database CPU usage

**Diagnosis**:
```sql
-- Check document counts
SELECT 
  template_id,
  COUNT(*) as doc_count
FROM documents
WHERE template_id IS NOT NULL
GROUP BY template_id
ORDER BY doc_count DESC;
```

**Solutions**:

1. **Use Project-Scoped Rebuilds**:
   ```bash
   # Instead of system-wide, rebuild per project
   POST /api/template-analytics/analytics/rebuild-all
   # Body: { "projectId": "specific-project-id" }
   ```

2. **Rebuild During Off-Peak Hours**:
   ```bash
   # Schedule rebuilds for low-traffic periods
   # Use cron or scheduled tasks
   ```

3. **Optimize Database Queries**:
   ```sql
   -- Ensure indexes exist
   CREATE INDEX IF NOT EXISTS idx_documents_template_id 
   ON documents(template_id);
   
   CREATE INDEX IF NOT EXISTS idx_documents_project_id 
   ON documents(project_id);
   ```

---

## Diagnostic Workflow

### Step 1: Run Diagnostic Endpoint

```bash
GET /api/template-analytics/analytics/diagnostic/:templateId
```

### Step 2: Review Recommendations

Check the `recommendations` field:
- `needsExtraction`: Run extraction if true
- `needsRebuild`: Rebuild analytics if true
- `needsDocumentPurposeRebuild`: Rebuild document purposes if true

### Step 3: Check Sample Documents

Review `sampleDocuments` to verify:
- Documents have `template_id` set
- `entity_counts` are populated
- Entity counts structure is correct

### Step 4: Verify View Data

Check `viewData`:
- Should have `total_documents` > 0
- `avg_entity_counts` should be populated
- `total_entities` should match expectations

### Step 5: Check Profile Data

Verify `profileData`:
- `primary_knowledge_domain` should be set
- `knowledge_domain_coverage` should have values
- `performance_domain_coverage` should have values

---

## SQL Queries for Manual Diagnosis

### Check Document Entity Counts

```sql
-- Count documents with entity_counts
SELECT 
  template_id,
  COUNT(*) as total_docs,
  COUNT(CASE WHEN entity_counts != '{}'::jsonb THEN 1 END) as with_counts
FROM documents
WHERE template_id IS NOT NULL
GROUP BY template_id;
```

### Check Template Profile

```sql
-- View template entity profile
SELECT 
  tep.*,
  t.name as template_name
FROM template_entity_profile tep
JOIN templates t ON tep.template_id = t.id
WHERE tep.template_id = 'your-template-id';
```

### Check Entity Source Documents

```sql
-- Verify entities have source_document_id
SELECT 
  'stakeholders' as entity_type,
  COUNT(*) as total,
  COUNT(CASE WHEN source_document_id IS NOT NULL THEN 1 END) as with_source
FROM stakeholders
WHERE project_id = 'your-project-id'
UNION ALL
SELECT 
  'requirements',
  COUNT(*),
  COUNT(CASE WHEN source_document_id IS NOT NULL THEN 1 END)
FROM requirements
WHERE project_id = 'your-project-id';
```

### Check View Data

```sql
-- Check aggregated view
SELECT * 
FROM aggregated_template_entity_view
WHERE template_id = 'your-template-id';
```

---

## Log Analysis

### Key Log Patterns

**Successful Rebuild**:
```
[EXTRACTION-PARENT] Rebuilding document purposes for project {projectId}
[EXTRACTION-PARENT] Post-rebuild check: X/Y documents have entity_counts populated
[EXTRACTION-PARENT] Found N templates to update
[EXTRACTION-PARENT] Successfully updated N template entity profiles
```

**Failed Rebuild**:
```
[EXTRACTION-PARENT] Failed to rebuild document/template purpose analytics
error: {error details}
```

**Missing Data**:
```
[EXTRACTION-PARENT] No templates found for project {projectId}
[TemplateAnalytics] Template {templateId}: X documents, Y with entity_counts populated
```

### Search Logs

```bash
# Find rebuild operations
grep "EXTRACTION-PARENT" server/logs/combined.log

# Find template analytics updates
grep "TemplateAnalytics" server/logs/combined.log

# Find errors
grep "error" server/logs/error.log | grep -i "template\|analytics\|purpose"
```

---

## Prevention Best Practices

1. **Ensure Extraction Completes**: Always wait for extraction jobs to finish
2. **Verify Template Assignment**: Set `template_id` when creating documents
3. **Monitor Logs**: Regularly check for analytics errors
4. **Regular Rebuilds**: Schedule periodic rebuilds for large projects
5. **Database Maintenance**: Keep indexes updated and views refreshed

---

## Getting Help

If issues persist:

1. **Collect Diagnostic Data**:
   ```bash
   # Run diagnostic endpoint
   GET /api/template-analytics/analytics/diagnostic/:templateId
   ```

2. **Gather Logs**:
   ```bash
   # Recent errors
   tail -100 server/logs/error.log
   
   # Recent analytics operations
   grep -i "template\|analytics" server/logs/combined.log | tail -50
   ```

3. **Document Steps to Reproduce**:
   - What operation were you performing?
   - What was the expected result?
   - What actually happened?
   - Any error messages?

---

## Related Documentation

- [Template Analytics API Reference](./TEMPLATE_ANALYTICS_API_REFERENCE.md)
- [Template Analytics Implementation](./TEMPLATE_ANALYTICS_IMPLEMENTATION_COMPLETE.md)
- [Template Analytics Quick Start](./TEMPLATE_ANALYTICS_QUICK_START.md)

