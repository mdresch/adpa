# Create Vector Bucket Index - Quick Guide

## ✅ Prerequisites Complete
- [x] VOYAGE_API_KEY secret is set
- [x] Edge Function deployed
- [x] documents_raw table created

## 🎯 Final Step: Create Vector Index

### In Supabase Dashboard:

1. **Navigate to Storage → Vector Buckets**
   - URL: https://supabase.com/dashboard/project/blxzjbxczpmmgiwbtmdo/storage/buckets

2. **Create/Select Bucket**
   - If `embeddings` bucket doesn't exist, create it
   - Click on `embeddings` bucket

3. **Create Index**
   - Click **"New Index"** or **"Create Index"**
   - Fill in:
     ```
     Index Name: documents-voyage
     Dimensions: 1024
     Distance Metric: cosine
     ```
   - Click **"Create"**

## 🧪 Test Immediately After

Once the index is created, test with this payload:

```json
{
  "docs": [{
    "title": "Test Document",
    "content": "This is a test for Voyage AI RAG.",
    "metadata": {"source": "test"}
  }]
}
```

**Expected Success Response:**
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

**If you get an error**, the improved error handling will now show:
- Exact error message (not `[object Object]`)
- Stack trace for debugging
- Timestamp

## 📊 Verify Results

After successful test:

```sql
-- Check stored document
SELECT * FROM documents_raw ORDER BY created_at DESC LIMIT 1;
```

In Supabase Dashboard:
- Storage → Vector Buckets → `embeddings` → `documents-voyage`
- You should see 1 vector stored

## 🚀 You're Done!

Once this works, your RAG pipeline is fully operational! 🎉
