# Quality Audit System - Database Migrations

**Version**: 1.0  
**Date**: November 3, 2025  
**Status**: Production Ready

---

## Overview

This directory contains database migrations for the **Quality Control Gate** system, which provides:
1. **Automated quality audits** for all AI-generated documents
2. **Template improvement suggestions** based on quality patterns
3. **Template version control** with quality tracking

---

## Migration Files

### Core Migrations (Run in order)

| File | Description | Tables Created |
|------|-------------|----------------|
| `310_create_quality_audits.sql` | Quality audit system | `quality_audits` + updates to `documents` |
| `311_create_template_improvements.sql` | Template improvement tracking | `template_improvement_suggestions`, `template_versions` |

### Rollback Migration

| File | Description |
|------|-------------|
| `312_rollback_quality_system.sql` | Complete rollback of quality system (⚠️ Destructive) |

---

## Quick Start

### 1. Run Migrations (PowerShell)

```powershell
cd server\scripts
.\run-quality-migrations.ps1
```

### 2. Validate Schema

```powershell
cd server\scripts
.\test-quality-schema.ps1
```

### 3. Manual Migration (psql)

```bash
# Set DATABASE_URL environment variable
export DATABASE_URL="postgresql://user:password@host:5432/database"

# Run migrations
psql $DATABASE_URL -f migrations/310_create_quality_audits.sql
psql $DATABASE_URL -f migrations/311_create_template_improvements.sql

# Test
psql $DATABASE_URL -f migrations/test-quality-schema.sql
```

---

## Database Schema

### quality_audits

Stores automated quality assessment results for every generated document.

**Key Columns**:
- `overall_score` (0-100): Weighted average across 6 dimensions
- `overall_grade` (A-F): Letter grade for quick filtering
- `completeness_score`, `consistency_score`, `professional_quality_score`, `standards_compliance_score`, `accuracy_score`, `context_relevance_score`
- `findings` (JSONB): Detailed findings per dimension
- `issues` (JSONB): Array of identified issues with severity
- `recommendations` (JSONB): Actionable improvement suggestions

**Indexes**:
- `idx_quality_audits_document`: Lookup audit by document
- `idx_quality_audits_grade`: Filter by grade (A, B, C, D, F)
- `idx_quality_audits_score`: Sort by quality score
- `idx_quality_audits_date`: Time-series queries
- `idx_quality_audits_provider`: Provider comparison

---

### template_improvement_suggestions

Tracks AI-generated suggestions for improving templates based on quality audit patterns.

**Key Columns**:
- `template_id`: Which template needs improvement
- `documents_analyzed`: Number of audits analyzed (min 5 required)
- `current_avg_quality`: Average quality before improvements
- `common_issues` (JSONB): Issues appearing in >20% of audits
- `suggested_improvements` (JSONB): Specific, actionable changes
- `expected_quality_gain`: Predicted improvement (0-100 points)
- `priority`: critical | high | medium | low
- `status`: pending_review → approved → implemented | rejected

**Workflow**:
1. Weekly job analyzes template performance
2. AI generates improvement suggestions
3. Admin reviews in dashboard
4. Approved suggestions implemented
5. Quality tracked for 30 days
6. Actual vs. predicted improvement calculated

---

### template_versions

Version control for templates with quality tracking.

**Key Columns**:
- `version_number`: Sequential version (1, 2, 3, ...)
- `content`: Full template content for this version
- `avg_quality_before`: Quality before this version
- `avg_quality_after`: Quality 30 days after deployment
- `improvement_percentage`: Actual quality gain
- `improvement_suggestion_id`: Link to suggestion that led to this version
- `active`: Only one version active per template

**Features**:
- Automatic trigger ensures only one active version per template
- A/B testing: Compare quality before/after
- Rollback capability: Reactivate previous version if needed

---

### documents (Updated)

Added quality status columns for quick filtering and dashboards.

**New Columns**:
- `quality_audit_id`: Reference to latest quality audit
- `quality_status`: passed (≥85%) | warning (70-84%) | failed (<70%) | pending | not_audited
- `quality_score`: Cached overall score for fast sorting

**Indexes**:
- `idx_documents_quality_status`: Filter by status
- `idx_documents_quality_score`: Sort by score
- `idx_documents_quality_composite`: Dashboard queries

---

## Quality Scoring System

### Overall Score Calculation

**Weighted Average**:
- Completeness: 20%
- Consistency: 15%
- Professional Quality: 20%
- Standards Compliance: 20%
- Accuracy: 15%
- Context Relevance: 10%

**Total**: 100%

### Grading Scale

| Grade | Score Range | Quality Level | Action |
|-------|-------------|---------------|--------|
| A | 90-100% | Excellent | ✅ Approved - Ready for use |
| B | 80-89% | Good | ✅ Approved - Minor polish recommended |
| C | 70-79% | Acceptable | ⚠️ Warning - Review recommended |
| D | 60-69% | Below Standard | 🔴 Failed - Significant revision needed |
| F | < 60% | Unsatisfactory | 🔴 Failed - Re-generation required |

---

## Sample Queries

### Get audit for a document

```sql
SELECT 
  qa.*,
  d.title as document_title
FROM quality_audits qa
JOIN documents d ON qa.document_id = d.id
WHERE qa.document_id = 'document-uuid'
ORDER BY qa.audited_at DESC
LIMIT 1;
```

### Get all documents with quality issues

```sql
SELECT 
  d.id,
  d.title,
  d.quality_score,
  d.quality_status,
  qa.overall_grade,
  qa.issues
FROM documents d
JOIN quality_audits qa ON d.quality_audit_id = qa.id
WHERE d.quality_score < 85
ORDER BY d.quality_score ASC;
```

### Get average quality by AI provider

```sql
SELECT 
  ai_provider,
  COUNT(*) as audit_count,
  AVG(overall_score) as avg_quality,
  MIN(overall_score) as min_quality,
  MAX(overall_score) as max_quality
FROM quality_audits
WHERE audited_at > NOW() - INTERVAL '30 days'
GROUP BY ai_provider
ORDER BY avg_quality DESC;
```

### Get common issues across all audits

```sql
SELECT 
  issue->>'dimension' as dimension,
  issue->>'description' as description,
  issue->>'severity' as severity,
  COUNT(*) as frequency
FROM quality_audits, jsonb_array_elements(issues) as issue
WHERE audited_at > NOW() - INTERVAL '30 days'
GROUP BY dimension, description, severity
ORDER BY frequency DESC
LIMIT 20;
```

### Get pending improvement suggestions

```sql
SELECT 
  tis.id,
  dt.name as template_name,
  tis.documents_analyzed,
  tis.current_avg_quality,
  tis.expected_quality_gain,
  tis.priority,
  tis.created_at
FROM template_improvement_suggestions tis
JOIN document_templates dt ON tis.template_id = dt.id
WHERE tis.status = 'pending_review'
ORDER BY 
  CASE tis.priority
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  tis.created_at DESC;
```

### Get template quality improvement history

```sql
SELECT 
  tv.version_number,
  tv.changes_summary,
  tv.avg_quality_before,
  tv.avg_quality_after,
  tv.improvement_percentage,
  tv.created_at,
  u.name as created_by_name
FROM template_versions tv
LEFT JOIN users u ON tv.created_by = u.id
WHERE tv.template_id = 'template-uuid'
ORDER BY tv.version_number DESC;
```

---

## Rollback Procedure

⚠️ **WARNING**: Rollback will delete all quality audit data and template improvement suggestions.

### Option 1: PowerShell Script

```powershell
# Backup first!
psql $env:DATABASE_URL -c "\copy quality_audits TO 'quality_audits_backup.csv' CSV HEADER"

# Rollback
psql $env:DATABASE_URL -f migrations/312_rollback_quality_system.sql
```

### Option 2: Manual Rollback

```bash
# Backup
pg_dump -t quality_audits -t template_improvement_suggestions -t template_versions $DATABASE_URL > quality_system_backup.sql

# Rollback
psql $DATABASE_URL -f migrations/312_rollback_quality_system.sql
```

---

## Performance Considerations

### Indexes

All critical queries are indexed:
- Document lookup: O(log n) via `idx_quality_audits_document`
- Quality filtering: O(log n) via `idx_quality_audits_score`
- Time-series: O(log n) via `idx_quality_audits_date`

### Storage

Estimated storage per audit:
- Base row: ~500 bytes
- JSONB findings: ~2-5 KB (depending on detail)
- JSONB issues: ~1-3 KB (5-10 issues typical)
- **Total**: ~5-10 KB per audit

**Example**:
- 10,000 documents audited → ~50-100 MB
- 100,000 documents audited → ~500 MB - 1 GB

### Cleanup Strategy

```sql
-- Archive audits older than 1 year
CREATE TABLE quality_audits_archive AS 
SELECT * FROM quality_audits 
WHERE audited_at < NOW() - INTERVAL '1 year';

-- Delete archived audits
DELETE FROM quality_audits 
WHERE audited_at < NOW() - INTERVAL '1 year';
```

---

## Troubleshooting

### Migration fails with "relation already exists"

The migrations use `IF NOT EXISTS` clauses, so they're idempotent. If you see this error, it means tables already exist. You can:
1. Check existing schema: `\d quality_audits` in psql
2. Run rollback if needed: `312_rollback_quality_system.sql`
3. Re-run migrations

### Permission errors

Ensure your database user has:
```sql
GRANT CREATE ON SCHEMA public TO your_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_user;
```

### psql command not found

Install PostgreSQL client:
- **Windows**: Download from https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql`
- **Linux**: `sudo apt-get install postgresql-client`

---

## Next Steps After Migration

1. ✅ **Validate schema**: Run `test-quality-schema.ps1`
2. ⏭️ **Implement services**:
   - `server/src/services/qualityAuditService.ts`
   - `server/src/services/templateImprovementService.ts`
3. ⏭️ **Add API routes**:
   - `server/src/routes/qualityAuditRoutes.ts`
4. ⏭️ **Integrate with generation**:
   - Update `processFlowService.ts` to trigger audits
5. ⏭️ **Build UI components**:
   - Quality badge component
   - Quality audit modal
   - Template improvement dashboard

---

## References

- **Design Document**: `docs/07-architecture/QUALITY_CONTROL_GATE_DESIGN.md`
- **Implementation Guide**: `docs/06-features/QUALITY_AUDIT_IMPLEMENTATION.md`
- **API Documentation**: `docs/05-integrations/QUALITY_AUDIT_API.md`

---

**Status**: ✅ Ready for Production  
**Last Updated**: November 3, 2025  
**Version**: 1.0.0

