# Manual Document Migration Guide

## Current Situation
- **Docker PostgreSQL**: 48 documents
- **Neon Database**: 1 document
- **Goal**: Move all 48 documents from Docker to Neon

## Migration Steps

### Step 1: Export Documents from Docker
Run this command to export all documents from Docker PostgreSQL:

```bash
docker exec -it adpa-postgres psql -U postgres -d adpa_db -c "
SELECT 'INSERT INTO documents VALUES (' ||
    '''' || id || ''', ' ||
    COALESCE('''' || project_id || '''', 'NULL') || ', ' ||
    '''' || REPLACE(name, '''', '''''') || ''', ' ||
    COALESCE('''' || template_id || '''', 'NULL') || ', ' ||
    version || ', ' ||
    '''' || status || ''', ' ||
    COALESCE('''' || file_path || '''', 'NULL') || ', ' ||
    COALESCE(file_size::text, 'NULL') || ', ' ||
    COALESCE('''' || mime_type || '''', 'NULL') || ', ' ||
    COALESCE('''' || framework || '''', 'NULL') || ', ' ||
    '''' || REPLACE(metadata::text, '''', '''''') || '''::jsonb, ' ||
    COALESCE('''' || created_by || '''', 'NULL') || ', ' ||
    COALESCE('''' || updated_by || '''', 'NULL') || ', ' ||
    '''' || created_at || ''', ' ||
    '''' || updated_at || ''', ' ||
    '''' || REPLACE(content::text, '''', '''''') || '''::jsonb, ' ||
    COALESCE(file_size::text, 'NULL') || ', ' ||
    '''' || REPLACE(name, '''', '''''') || ''', ' ||
    '''' || COALESCE(tags::text, '[]') || ''');' as insert_statement
FROM documents ORDER BY created_at;
" > document-inserts.sql
```

### Step 2: Create Migration SQL
Create a file called `migrate-documents.sql` with this content:

```sql
-- Document Migration to Neon
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Begin transaction
BEGIN;

-- Add your INSERT statements here (from Step 1)
-- Replace each INSERT with UPSERT:
-- INSERT INTO documents (...) VALUES (...) ON CONFLICT (id) DO UPDATE SET ...;

-- Example UPSERT pattern:
INSERT INTO documents (id, project_id, name, content, template_id, version, status, file_path, file_size, mime_type, framework, metadata, created_by, updated_by, created_at, updated_at)
VALUES ('document-id', 'project-id', 'document-name', 'content-json'::jsonb, 'template-id', 1, 'status', 'file-path', 0, 'mime-type', 'framework', 'metadata-json'::jsonb, 'created-by', 'updated-by', '2025-01-01 00:00:00', '2025-01-01 00:00:00')
ON CONFLICT (id) DO UPDATE SET
    project_id = EXCLUDED.project_id,
    name = EXCLUDED.name,
    content = EXCLUDED.content,
    template_id = EXCLUDED.template_id,
    version = EXCLUDED.version,
    status = EXCLUDED.status,
    file_path = EXCLUDED.file_path,
    file_size = EXCLUDED.file_size,
    mime_type = EXCLUDED.mime_type,
    framework = EXCLUDED.framework,
    metadata = EXCLUDED.metadata,
    created_by = EXCLUDED.created_by,
    updated_by = EXCLUDED.updated_by,
    updated_at = EXCLUDED.updated_at;

-- Verify migration
SELECT 'Documents after migration:' as info, COUNT(*) as count FROM documents;

-- Commit transaction
COMMIT;
```

### Step 3: Execute Migration
Run the migration against your Neon database:

```bash
psql "postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require" -f migrate-documents.sql
```

### Step 4: Verify Migration
Check that you now have 48 documents in Neon:

```bash
psql "postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require" -c "SELECT COUNT(*) FROM documents;"
```

## Alternative: Simple Copy Approach

If the above is too complex, you can use this simpler approach:

### 1. Export from Docker
```bash
docker exec -it adpa-postgres pg_dump -U postgres -d adpa_db --data-only --inserts -t documents > documents-export.sql
```

### 2. Modify the export file
- Remove the pg_dump headers
- Convert INSERT statements to UPSERT (add ON CONFLICT clause)
- Add transaction wrapper (BEGIN; ... COMMIT;)

### 3. Import to Neon
```bash
psql "postgresql://neondb_owner:npg_6H1YnZiDleEV@ep-royal-morning-a9j6aaq0-pooler.gwc.azure.neon.tech/adpa_db?sslmode=require" -f modified-documents-export.sql
```

## Important Notes

1. **Backup First**: Always backup your Neon database before migration
2. **Test Connection**: Ensure you can connect to Neon database
3. **Handle Conflicts**: Use UPSERT (INSERT ... ON CONFLICT) to handle duplicate IDs
4. **Verify Data**: Check that all documents were migrated correctly
5. **Update Application**: Once verified, update your application to use Neon database

## Troubleshooting

- **Connection Issues**: Verify Neon credentials and network access
- **Syntax Errors**: Check SQL syntax, especially JSON escaping
- **Data Loss**: Always backup before migration
- **Performance**: Large datasets may take time to migrate

## Success Criteria

- ✅ 48 documents in Neon database
- ✅ All document content preserved
- ✅ Application works with Neon database
- ✅ No data loss during migration
