# Deploying Updated RAG Function with Voyage AI

## Overview
This guide shows how to redeploy the `ingest-for-rag` Edge Function to use Voyage AI embeddings instead of OpenAI.

## Why Voyage AI?
- ✅ **Already configured** in your project (`VOYAGE_API_KEY` in `.env`)
- ✅ **Optimized for RAG** - Specifically designed for retrieval use cases
- ✅ **Better quality** - Superior retrieval performance compared to general-purpose embeddings
- ✅ **Consistent stack** - Matches your MongoDB RAG pipeline setup

## Deployment Steps

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com/project/blxzjbxczpmmgiwbtmdo)
2. Navigate to **Edge Functions**
3. Find `ingest-for-rag` function
4. Click **Edit**
5. Replace the entire code with the contents of [`ingest-for-rag-voyage.ts`](file:///d:/source/repos/adpa/server/docs/ingest-for-rag-voyage.ts)
6. Click **Deploy**

### Option 2: Via Supabase CLI

```bash
# Navigate to your project
cd d:\source\repos\adpa\server

# Create function directory if it doesn't exist
mkdir -p supabase\functions\ingest-for-rag

# Copy the updated function code
copy docs\ingest-for-rag-voyage.ts supabase\functions\ingest-for-rag\index.ts

# Deploy the function
supabase functions deploy ingest-for-rag
```

## Configuration Changes

### 1. Vector Index
Create a new index with Voyage AI dimensions:

**In Supabase Dashboard → Storage → Vector Buckets → embeddings:**
- **Index Name**: `documents-voyage`
- **Data Type**: `float32`
- **Dimension**: `1024` (for voyage-2) or `1536` (for voyage-3)
- **Distance Metric**: `cosine`

### 2. Set Voyage AI API Key

```bash
# Set the secret (you already have this key in your .env)
supabase secrets set VOYAGE_API_KEY=pa-your-voyage-api-key-here
```

Or via Dashboard:
- Go to **Settings** → **Edge Functions** → **Secrets**
- Add secret: `VOYAGE_API_KEY` = `pa-...`

## Key Changes from OpenAI Version

| Aspect | OpenAI | Voyage AI |
|--------|--------|-----------|
| **API Endpoint** | `https://api.openai.com/v1/embeddings` | `https://api.voyageai.com/v1/embeddings` |
| **API Key Env Var** | `OPENAI_API_KEY` | `VOYAGE_API_KEY` |
| **Default Model** | `text-embedding-3-small` | `voyage-2` |
| **Dimension** | 1536 | 1024 (voyage-2) or 1536 (voyage-3) |
| **Index Name** | `documents-openai` | `documents-voyage` |
| **Input Type** | N/A | `document` (optimized for storage) |

## Testing

### 1. Test the Updated Function

```bash
curl -X POST https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/ingest-for-rag \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type": "application/json" \
  -d '{
    "docs": [{
      "title": "Test Document",
      "content": "This is a test of Voyage AI embeddings for RAG.",
      "metadata": {"source": "test"}
    }],
    "indexName": "documents-voyage",
    "model": "voyage-2"
  }'
```

Expected response:
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

### 2. Verify Vector Storage

Query your vector index to confirm embeddings were stored:

```typescript
const { data } = await supabase.storage.vectors
  .from('embeddings')
  .index('documents-voyage')
  .queryVectors({
    queryVector: testEmbedding, // Generate with same model
    topK: 5
  });
```

## Querying with Voyage AI

When querying, use the same model for consistency:

```typescript
// Generate query embedding
const queryEmbedding = await generateVoyageEmbedding(
  "your search query",
  "voyage-2",
  "query" // input_type for queries
);

// Search vector index
const { data } = await supabase.storage.vectors
  .from('embeddings')
  .index('documents-voyage')
  .queryVectors({
    queryVector: queryEmbedding,
    topK: 5,
    filter: { source: 'documentation' }
  });
```

## Voyage AI Models

### voyage-2 (Recommended)
- **Dimension**: 1024
- **Best for**: General RAG use cases
- **Cost**: Lower than voyage-3
- **Performance**: Excellent retrieval quality

### voyage-3
- **Dimension**: 1536
- **Best for**: Maximum accuracy requirements
- **Cost**: Higher than voyage-2
- **Performance**: State-of-the-art retrieval

## Migration from OpenAI

If you already have documents indexed with OpenAI embeddings:

1. **Keep both indexes** - Create `documents-voyage` alongside `documents-openai`
2. **Gradual migration** - Re-index documents to new index over time
3. **A/B testing** - Compare retrieval quality between models
4. **Switch queries** - Update query logic to use new index when ready

## Troubleshooting

### "Missing VOYAGE_API_KEY" Error
- Verify secret is set: `supabase secrets list`
- Check your Voyage AI API key is valid
- Ensure key starts with `pa-`

### Wrong Dimension Error
- Verify index dimension matches model:
  - `voyage-2` → 1024
  - `voyage-3` → 1536

### Poor Retrieval Quality
- Ensure query uses same model as documents
- Use `input_type: "query"` for queries vs `"document"` for storage
- Check metadata filters aren't too restrictive

## Next Steps

1. ✅ Deploy updated function
2. ✅ Create `documents-voyage` index
3. ✅ Set `VOYAGE_API_KEY` secret
4. ✅ Test with sample documents
5. ✅ Update query logic to use new index
6. ✅ Monitor retrieval quality

## Resources

- [Voyage AI Documentation](https://docs.voyageai.com/)
- [Voyage AI Embeddings Guide](https://docs.voyageai.com/docs/embeddings)
- [Supabase Vector Buckets](https://supabase.com/docs/guides/storage/vector-buckets)
