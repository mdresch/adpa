# Entity Extraction with Supabase Edge Functions

## Overview

Automatic entity extraction system using Supabase Edge Functions. When documents are inserted, entities (people, organizations, locations, etc.) are automatically extracted and stored.

## Architecture

```mermaid
graph LR
    A[Insert Document] --> B[Database Trigger]
    B --> C[HTTP POST]
    C --> D[entity-extractor Edge Function]
    D --> E[Fetch Document Content]
    E --> F[Extract Entities AI/Heuristic]
    F --> G[Insert into document_entities]
```

## Components

### 1. Edge Function: `entity-extractor`

**URL**: `https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor`

**Purpose**: Extracts named entities from document content

**Features**:
- Uses Supabase AI (gte-small model) if available
- Falls back to heuristic extraction (capitalized words)
- Requires Service Role authentication
- Stores entities with type and confidence score

**Request**:
```json
POST /functions/v1/entity-extractor
Authorization: Bearer <SERVICE_ROLE_KEY>
Content-Type: application/json

{
  "document_id": "uuid-here"
}
```

**Response**:
```json
{
  "document_id": "uuid-here",
  "count": 5
}
```

### 2. Database Table: `document_entities`

Stores extracted entities with metadata:

```sql
CREATE TABLE public.document_entities (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  entity TEXT NOT NULL,
  type TEXT,              -- e.g., 'PERSON', 'ORG', 'LOC'
  score NUMERIC,          -- confidence 0-1
  created_at TIMESTAMPTZ
);
```

**Indexes**:
- `document_id` - Fast lookups by document
- `entity` - Search by entity name
- `type` - Filter by entity type

### 3. Database Trigger

Automatically calls the Edge Function when documents are inserted:

```sql
CREATE TRIGGER trg_documents_entity_extract
  AFTER INSERT ON public.documents
  FOR EACH ROW 
  EXECUTE FUNCTION notify_entity_extractor();
```

## Setup Instructions

### Step 1: Run Migration

```bash
node scripts/run-migration.js create_document_entities_and_trigger
```

This creates:
- ✅ `document_entities` table
- ✅ Database trigger function
- ✅ Trigger on `documents` table

### Step 2: Configure Settings

You need to set two configuration values:

#### Option A: Via SQL (Recommended)

Edit and run [`scripts/configure-entity-extractor.sql`](file:///d:/source/repos/adpa/server/scripts/configure-entity-extractor.sql):

```sql
-- Set Edge Function URL
SELECT set_config(
  'app.settings.entity_extractor_url', 
  'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor', 
  false
);

-- Set Service Role Key (get from Supabase Dashboard → Settings → API)
SELECT set_config(
  'app.settings.service_role_key', 
  'eyJhbGc...your-service-role-key-here', 
  false
);
```

#### Option B: Via Supabase Dashboard

1. Go to **Database** → **Configuration** → **Custom Config**
2. Add:
   - `app.settings.entity_extractor_url` = `https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor`
   - `app.settings.service_role_key` = `<your-service-role-key>`

### Step 3: Test

Insert a test document:

```sql
INSERT INTO public.documents (content) 
VALUES ('Acme Corporation met with John Doe and Jane Smith in Paris on December 1st, 2024 to discuss Project Atlas.');
```

Wait a few seconds, then check extracted entities:

```sql
SELECT 
  e.entity,
  e.type,
  e.score,
  d.content
FROM document_entities e
JOIN documents d ON e.document_id = d.id
ORDER BY e.created_at DESC
LIMIT 20;
```

Expected entities:
- `Acme Corporation` (ORG)
- `John Doe` (PERSON)
- `Jane Smith` (PERSON)
- `Paris` (LOC)
- `Project Atlas` (PROJECT/ORG)

## Usage Examples

### Query Entities by Document

```sql
SELECT entity, type, score
FROM document_entities
WHERE document_id = 'your-document-uuid'
ORDER BY score DESC;
```

### Find Documents Mentioning an Entity

```sql
SELECT DISTINCT d.*
FROM documents d
JOIN document_entities e ON d.id = e.document_id
WHERE e.entity ILIKE '%Acme%'
ORDER BY d.created_at DESC;
```

### Get Entity Statistics

```sql
SELECT 
  type,
  COUNT(*) as count,
  AVG(score) as avg_confidence
FROM document_entities
WHERE type IS NOT NULL
GROUP BY type
ORDER BY count DESC;
```

### Top Entities Across All Documents

```sql
SELECT 
  entity,
  type,
  COUNT(*) as occurrences,
  AVG(score) as avg_confidence
FROM document_entities
GROUP BY entity, type
ORDER BY occurrences DESC
LIMIT 20;
```

## Entity Types

The extractor can identify:

- **PERSON** - People names (John Doe, Jane Smith)
- **ORG** - Organizations (Acme Corp, Google)
- **LOC** - Locations (Paris, New York)
- **DATE** - Dates and times
- **PROJECT** - Project names
- **PRODUCT** - Product names
- **unknown** - Unclassified entities (fallback)

## Troubleshooting

### Entities Not Being Extracted

1. **Check trigger is enabled**:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trg_documents_entity_extract';
   ```

2. **Check configuration**:
   ```sql
   SELECT 
     current_setting('app.settings.entity_extractor_url', true) AS url,
     CASE WHEN current_setting('app.settings.service_role_key', true) IS NOT NULL 
       THEN 'Set' ELSE 'Not set' END AS key_status;
   ```

3. **Check Edge Function logs**:
   - Go to Supabase Dashboard → Edge Functions → entity-extractor → Logs

4. **Test Edge Function directly**:
   ```bash
   curl -X POST https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor \
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"document_id": "your-document-uuid"}'
   ```

### HTTP Extension Not Available

If you get an error about the `http` extension:

```sql
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
```

If this fails, enable it via Supabase Dashboard → Database → Extensions.

## Performance Considerations

- **Async Processing**: The trigger fires HTTP requests asynchronously (fire-and-forget)
- **No Blocking**: Document inserts complete immediately; extraction happens in background
- **Retries**: Failed extractions are logged but don't retry automatically
- **Rate Limits**: Edge Functions have rate limits; for bulk imports, consider batching

## Future Enhancements

- [ ] Add retry mechanism for failed extractions
- [ ] Support for updating entities when documents change
- [ ] Custom entity types and training
- [ ] Entity linking and disambiguation
- [ ] Confidence threshold filtering
- [ ] Batch extraction for existing documents

## Files

- [Migration](file:///d:/source/repos/adpa/server/migrations/create_document_entities_and_trigger.sql) - Creates table and trigger
- [Configuration](file:///d:/source/repos/adpa/server/scripts/configure-entity-extractor.sql) - Sets up Edge Function URL and auth
- Edge Function: `https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor`
