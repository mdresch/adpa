# Supabase RAG Setup - Next Steps

## ✅ Completed
- [x] Voyage AI RAG Edge Function deployed
- [x] `documents_raw` table created
- [x] Database schema issues fixed
- [x] Documentation created

## 🔧 Manual Setup Required

You need to complete these steps in the **Supabase Dashboard**:

### 1. Create Vector Bucket (if not exists)
1. Go to **Storage** → **Vector Buckets**
2. Click **New Vector Bucket**
3. Name: `embeddings`
4. Click **Create**

### 2. Create Vector Index
1. In the `embeddings` bucket, click **New Index**
2. Configure:
   - **Index Name**: `documents-voyage`
   - **Dimensions**: `1024`
   - **Distance Metric**: `cosine`
3. Click **Create Index**

### 3. Set VOYAGE_API_KEY Secret
1. Go to **Edge Functions** → **Settings** → **Secrets**
2. Click **Add Secret**
3. Name: `VOYAGE_API_KEY`
4. Value: Your Voyage AI API key (from `.env`: `pa-...`)
5. Click **Save**

**OR** via CLI:
```bash
cd d:\source\repos\adpa\server
supabase secrets set VOYAGE_API_KEY=pa-YOUR-KEY-HERE
```

### 4. Test the Function

Once the above is complete, test with this payload in the Supabase Dashboard:

**Go to**: Edge Functions → `ingest-for-rag` → Test

**Request Body**:
```json
{
  "docs": [
    {
      "title": "Test Document",
      "content": "This is a test document for Voyage AI RAG ingestion. It demonstrates how to store documents with embeddings in Supabase Vector Buckets using the voyage-2 model.",
      "metadata": {
        "source": "test",
        "category": "demo"
      }
    }
  ]
}
```

**Expected Response**:
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

## 📊 Verify Results

After successful test:

1. **Check documents_raw table**:
   ```sql
   SELECT * FROM documents_raw ORDER BY created_at DESC LIMIT 5;
   ```

2. **Check Vector Index**:
   - Go to Storage → Vector Buckets → `embeddings` → `documents-voyage`
   - You should see vectors stored

## 🚀 Next Steps

After successful testing:
- [ ] Create query/retrieval Edge Function for RAG searches
- [ ] Integrate with main application
- [ ] Set up entity extraction trigger
