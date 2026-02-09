# Supabase RAG Architecture Clarification

## Our Implementation: Vector Buckets (Not pgvector)

We're using **Supabase Vector Buckets**, which is different from the traditional pgvector approach.

### Architecture

```
┌─────────────┐
│  Document   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────┐
│  Edge Function              │
│  ingest-for-rag             │
├─────────────────────────────┤
│ 1. Store in documents_raw   │ ──► PostgreSQL Table
│ 2. Chunk content            │
│ 3. Voyage AI embeddings     │ ──► API Call
│ 4. Store in Vector Bucket   │ ──► Managed Vector Storage
└─────────────────────────────┘
```

### Components

**PostgreSQL (documents_raw table)**:
```sql
CREATE TABLE documents_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Vector Buckets** (Managed Service):
- Bucket: `embeddings`
- Index: `documents-voyage` (1024 dimensions, cosine similarity)
- Stores: Chunked embeddings with metadata

**Edge Function**:
- Handles chunking, embedding, and storage
- Uses Voyage AI API for embeddings
- No pgvector extension needed

### vs Traditional pgvector Approach

| Feature | Vector Buckets (Our Approach) | pgvector (Traditional) |
|---------|-------------------------------|------------------------|
| Storage | Managed service, separate from DB | PostgreSQL extension |
| Scaling | Automatic | Manual index tuning |
| Setup | Create bucket + index in UI | Install extension, create columns |
| Querying | Via Storage API | Via SQL |
| Cost | Pay per storage/query | Included in DB |

### Current Status

- ✅ Edge Function deployed
- ✅ documents_raw table created
- ✅ Voyage AI integration code ready
- ⏳ Need to set VOYAGE_API_KEY secret
- ⏳ Need to create Vector Bucket index

### Next Steps

1. **Set VOYAGE_API_KEY** in Supabase Dashboard
2. **Create Vector Index** `documents-voyage` (1024 dim, cosine)
3. **Test ingestion** with sample document
4. **Create retrieval function** for querying vectors

This approach is simpler than pgvector because Supabase manages the vector infrastructure for you!
