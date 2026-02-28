# Template Analytics - Quick Start Guide

## 🚀 Getting Started

### 1. Apply Database Migration

```bash
cd server
npx ts-node scripts/run-migration-700-template-purpose.ts
```

Or use the JavaScript version:
```bash
cd server  
node apply-template-migration.js
```

### 2. Restart Backend Services

After applying the migration, restart your backend to load the new functionality.

---

## 🔄 How It Works

### Automatic Operation

The system automatically runs after every extraction job:

1. **Document Extraction Completes** → Entities are saved to database
2. **Document Purpose Assignment** → `documents.entity_counts` and `inferred_*_domain` are updated
3. **Template Profile Update** → `template_entity_profile` is refreshed for affected templates

### Manual Operations

Use these admin endpoints when needed:

#### Rebuild Template Entity Profiles
```bash
POST /api/template-analytics/analytics/rebuild-entity-profiles
Authorization: Bearer <admin-token>
```

#### Rebuild Document Purposes for Project
```bash
POST /api/template-analytics/analytics/rebuild-document-purposes/{projectId}
Authorization: Bearer <admin-token>
```

#### Full Rebuild
```bash
POST /api/template-analytics/analytics/rebuild-all
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "projectId": "optional-project-uuid"
}
```

---

## 📊 Data Access

### Document-Level Data

Query document purposes:
```sql
SELECT 
  id,
  title,
  inferred_primary_domain,
  inferred_secondary_domains,
  entity_counts
FROM documents 
WHERE project_id = 'your-project-id';
```

### Template-Level Data

Query template profiles:
```sql
SELECT 
  template_id,
  total_documents,
  total_entities,
  avg_entity_counts,
  primary_knowledge_domain,
  secondary_knowledge_domains,
  knowledge_domain_coverage
FROM template_entity_profile;
```

### Helper Views

Use the convenient views:
```sql
-- Per-document entity counts
SELECT * FROM document_entity_counts 
WHERE project_id = 'your-project-id';

-- Aggregated template metrics  
SELECT * FROM aggregated_template_entity_view;
```

---

## 🎯 Use Cases

### 1. Project Domain Coverage Analysis

```sql
-- Get domain coverage for a project
SELECT 
  inferred_primary_domain,
  COUNT(*) as document_count,
  SUM((entity_counts->>'total')::int) as total_entities
FROM documents 
WHERE project_id = 'your-project-id'
  AND inferred_primary_domain IS NOT NULL
GROUP BY inferred_primary_domain
ORDER BY document_count DESC;
```

### 2. Template Effectiveness Analysis

```sql
-- Find most productive templates
SELECT 
  t.name,
  tep.total_documents,
  tep.total_entities,
  tep.primary_knowledge_domain,
  (tep.avg_entity_counts->>'total')::numeric as avg_entities_per_doc
FROM template_entity_profile tep
JOIN templates t ON t.id = tep.template_id
ORDER BY tep.total_entities DESC;
```

### 3. Baseline Readiness Check

```sql
-- Check domain coverage across project documents
SELECT 
  inferred_primary_domain,
  COUNT(*) as documents,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM documents 
WHERE project_id = 'your-project-id'
  AND inferred_primary_domain IS NOT NULL
GROUP BY inferred_primary_domain
ORDER BY documents DESC;
```

---

## 🔧 Troubleshooting

### Issue: Documents have no inferred domains

**Cause**: Documents may not have been processed through the new system yet.

**Solution**: 
```bash
POST /api/template-analytics/analytics/rebuild-document-purposes/{projectId}
```

### Issue: Template profiles are empty

**Cause**: Templates may not have been used to generate documents yet, or profiles need rebuilding.

**Solution**:
```bash
POST /api/template-analytics/analytics/rebuild-entity-profiles
```

### Issue: Entity counts are zero

**Cause**: Extraction may not have run, or entity tables may be empty.

**Solution**: 
1. Run extraction job for the project
2. Check that entities exist in database tables
3. Rebuild document purposes after extraction

---

## 📈 Monitoring

### Check System Health

```sql
-- Documents with inferred purposes
SELECT 
  COUNT(*) as total_documents,
  COUNT(inferred_primary_domain) as documents_with_purpose,
  ROUND(COUNT(inferred_primary_domain) * 100.0 / COUNT(*), 2) as coverage_percentage
FROM documents;

-- Template profiles status
SELECT 
  COUNT(*) as total_templates,
  COUNT(tep.template_id) as templates_with_profiles,
  ROUND(COUNT(tep.template_id) * 100.0 / COUNT(*), 2) as profile_coverage
FROM templates t
LEFT JOIN template_entity_profile tep ON t.id = tep.template_id;
```

### Performance Monitoring

```sql
-- Most recent updates
SELECT 
  template_id,
  total_documents,
  total_entities,
  updated_at
FROM template_entity_profile 
ORDER BY updated_at DESC 
LIMIT 10;
```

---

## 🎉 Success Indicators

You'll know the system is working when:

1. ✅ Documents have `inferred_primary_domain` values after extraction
2. ✅ Documents have populated `entity_counts` JSONB
3. ✅ Templates have records in `template_entity_profile` table
4. ✅ Template profiles show realistic `avg_entity_counts`
5. ✅ Domain coverage percentages make sense for your content

---

## 📞 Support

If you encounter issues:

1. Check the backend logs for extraction job completion
2. Verify database migration was applied successfully
3. Use the manual rebuild endpoints to refresh data
4. Check that entity extraction is working properly
5. Verify admin permissions for rebuild endpoints

The system is designed to be resilient and will automatically recover when extraction jobs run successfully.