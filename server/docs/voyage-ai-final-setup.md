# Voyage AI Setup - Final Steps

## 🔑 Get Your Voyage AI API Key

1. **Go to**: https://dash.voyageai.com/
2. **Sign up** or **Login**
3. **Navigate to**: API Keys
4. **Create new API key**
5. **Copy the key** (starts with `pa-`)

## ⚙️ Set the API Key in Supabase

Once you have your Voyage AI key:

```bash
cd d:\source\repos\adpa\server
supabase secrets set VOYAGE_API_KEY=pa-YOUR-VOYAGE-KEY-HERE --project-ref blxzjbxczpmmgiwbtmdo
```

## 🚀 Deploy Updated Function

```bash
supabase functions deploy ingest-for-rag --project-ref blxzjbxczpmmgiwbtmdo
```

## 🧪 Test Immediately

Go to **Supabase Dashboard → Edge Functions → ingest-for-rag → Test**

**Payload**:
```json
{
  "docs": [{
    "title": "Test Document",
    "content": "This is a test for Voyage AI RAG ingestion. The system uses Voyage AI embeddings to store document chunks in Supabase Vector Buckets for semantic search and retrieval.",
    "metadata": {"source": "test", "category": "demo"}
  }]
}
```

**Expected Success**:
```json
{
  "ok": true,
  "stored_docs": 1,
  "stored_vectors": 1,
  "index": "documents-voyage",
  "bucket": "embedding",
  "model": "voyage-2",
  "duration_ms": 1234
}
```

## ✅ Verify Results

1. **Check documents_raw table**:
   ```sql
   SELECT * FROM documents_raw ORDER BY created_at DESC LIMIT 1;
   ```

2. **Check Vector Bucket**:
   - Supabase Dashboard → Storage → Vector Buckets → `embedding` → `documents-voyage`
   - Should show 1 vector

## 🎉 You're Done!

Once the test succeeds, your RAG pipeline is fully operational!
