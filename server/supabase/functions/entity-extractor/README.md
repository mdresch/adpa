# Entity Extractor Edge Function

Automatically extracts project management entities from documents using Google Gemini API.

## Features

- **12 Entity Types**: PROJECT_NAME, MILESTONE, DELIVERABLE, RISK, STAKEHOLDER, RESOURCE, TASK, PHASE, TIMELINE, BUDGET_ITEM, DEPENDENCY, METRIC
- **Automatic Trigger**: Fires automatically when documents are inserted
- **Confidence Scoring**: Each entity includes a 0.0-1.0 confidence score
- **Gemini-Powered**: Uses Google's Gemini 1.5 Flash model (free tier)

## Setup

### 1. Get Gemini API Key

Visit https://aistudio.google.com/apikey and create a free API key.

### 2. Set Environment Variables

In your Supabase project dashboard, go to Edge Functions settings and add:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

The following are already configured:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### 3. Deploy the Function

```bash
supabase functions deploy entity-extractor
```

### 4. Configure Database Trigger

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Set the Edge Function URL
SELECT set_config(
  'app.settings.entity_extractor_url', 
  'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor', 
  false
);

-- Set the Service Role Key (replace with your actual key)
SELECT set_config(
  'app.settings.service_role_key', 
  'YOUR_SUPABASE_SERVICE_ROLE_KEY', 
  false
);
```

## Testing

### Manual Test

```bash
curl -X POST https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"document_id": "your-document-uuid"}'
```

### Automatic Test

Insert a test document - entities will be extracted automatically:

```sql
INSERT INTO documents (title, content)
VALUES (
  'Q1 2026 Product Launch',
  'The Phoenix Project will launch in March 2026. Key stakeholders include Sarah Chen (Product Manager) and Acme Corporation. Main deliverables are the mobile app and API documentation. Budget is $500,000 with a critical risk of vendor delays.'
);

-- Check extracted entities
SELECT * FROM document_entities 
WHERE document_id = (SELECT id FROM documents ORDER BY created_at DESC LIMIT 1)
ORDER BY type, entity;
```

Expected entities:
- PROJECT_NAME: "Phoenix Project"
- STAKEHOLDER: "Sarah Chen", "Acme Corporation"
- DELIVERABLE: "mobile app", "API documentation"
- TIMELINE: "March 2026", "Q1 2026"
- BUDGET_ITEM: "$500,000"
- RISK: "vendor delays"

## Batch Processing Existing Documents

To extract entities from all existing documents:

```sql
-- Trigger entity extraction for all documents without entities
SELECT notify_entity_extractor()
FROM documents d
WHERE NOT EXISTS (
  SELECT 1 FROM document_entities e WHERE e.document_id = d.id
);
```

## Monitoring

Check logs in Supabase Dashboard → Edge Functions → entity-extractor

Common log messages:
- `Processing document: <uuid>` - Starting extraction
- `Extracted X entities` - Successful extraction
- `Gemini API error` - API issues (check API key)

## Troubleshooting

**No entities extracted:**
- Check `GEMINI_API_KEY` is set correctly
- Verify document has sufficient content (minimum ~50 words)
- Check Gemini API quotas/limits

**Database trigger not firing:**
- Verify configuration settings are persisted
- Check trigger is enabled: `\d documents` in psql
- Review function logs for errors

**Rate limiting:**
- Gemini free tier: 15 RPM, 1 million TPM
- Add delays between bulk extractions if needed

## Architecture

```
Document Insert
    ↓
Database Trigger (trg_documents_entity_extract)
    ↓
HTTP POST to Edge Function
    ↓
Fetch Document Content
    ↓
Call Gemini API with Custom Prompt
    ↓
Parse JSON Response
    ↓
Store Entities in document_entities Table
```

## Entity Type Reference

| Type | Description | Examples |
|------|-------------|----------|
| PROJECT_NAME | Project titles | "Phoenix Project", "Dashboard Redesign" |
| MILESTONE | Key milestones | "Beta Launch", "Phase 2 Complete" |
| DELIVERABLE | Outputs/products | "API Documentation", "Mobile App" |
| RISK | Potential issues | "Vendor delays", "Budget overrun" |
| STAKEHOLDER | People/orgs | "Sarah Chen", "Acme Corp" |
| RESOURCE | Team/budget/tools | "Senior Developer", "$50K budget" |
| TASK | Specific activities | "Write test cases", "Deploy to prod" |
| PHASE | Project phases | "Planning", "Execution", "Closing" |
| TIMELINE | Dates/deadlines | "March 2026", "Q1 deadline" |
| BUDGET_ITEM | Financial items | "$500,000", "hosting costs" |
| DEPENDENCY | Dependencies | "Requires API v2", "Blocked by legal" |
| METRIC | KPIs/criteria | "95% uptime", "User satisfaction" |
