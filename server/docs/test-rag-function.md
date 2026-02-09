# Testing Voyage AI RAG Function

## Quick Test

Use this payload in the Supabase Dashboard test interface:

```json
{
  "docs": [
    {
      "title": "Test Document",
      "content": "This is a test document for Voyage AI RAG ingestion. It demonstrates how to store documents with embeddings in Supabase Vector Buckets using the voyage-2 model.",
      "metadata": {
        "source": "test",
        "category": "demo",
        "tags": ["rag", "voyage-ai"]
      }
    }
  ]
}
```

## Expected Response

```json
{
  "ok": true,
  "stored_docs": 1,
  "stored_vectors": 1,
  "index": "documents-voyage",
  "bucket": "embeddings",
  "model": "voyage-2"
}
```

## Full Test with curl

```bash
curl -L -X POST 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/ingest-for-rag' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  --data '{
    "docs": [
      {
        "title": "Getting Started with ADPA",
        "content": "The AI-Driven Project Automation (ADPA) platform helps project managers automate routine tasks and gain insights through AI-powered analysis.",
        "metadata": {
          "source": "documentation",
          "category": "tutorial"
        }
      }
    ]
  }'
```

## Multiple Documents

```json
{
  "docs": [
    {
      "title": "Document 1",
      "content": "First document content...",
      "metadata": {"source": "batch-1"}
    },
    {
      "title": "Document 2", 
      "content": "Second document content...",
      "metadata": {"source": "batch-1"}
    }
  ],
  "model": "voyage-2",
  "indexName": "documents-voyage"
}
```

## Prerequisites Checklist

Before testing, ensure:

- [ ] `VOYAGE_API_KEY` secret is set in Supabase Edge Functions
- [ ] Vector Bucket `embeddings` exists
- [ ] Vector Index `documents-voyage` exists (1024 dim, cosine)
- [ ] Table `documents_raw` exists in database

## Troubleshooting

**Error: "docs array is required"**
- ✅ This means the function is working!
- Fix: Use the correct payload format with `docs` array

**Error: "Missing VOYAGE_API_KEY"**
- Set the secret: `supabase secrets set VOYAGE_API_KEY=pa-...`

**Error: "Vector index not found"**
- Create the index in Supabase Dashboard → Storage → Vector Buckets

**Error: "Table documents_raw does not exist"**
- Run the migration to create the table (see `supabase-rag-setup.md`)
