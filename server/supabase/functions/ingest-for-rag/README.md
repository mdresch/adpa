# Edge Function Environment Configuration

The `ingest-for-rag` Edge Function now proxies to the Node.js RAG service.

## Required Environment Variables

Set these in Supabase Dashboard → Edge Functions → Configuration:

### BACKEND_URL
The URL of your Node.js backend server.

**Production:**
```
BACKEND_URL=https://your-backend-domain.com
```

**Development (if testing locally):**
```
BACKEND_URL=http://localhost:5000
```

**Note:** If deploying both to the same infrastructure, you might use:
```
BACKEND_URL=http://host.docker.internal:5000
```

### SUPABASE_URL (Already set)
Your Supabase project URL - this should already be configured.

### SUPABASE_SERVICE_ROLE_KEY (Already set)
Your service role key - this should already be configured.

## Deployment

After setting the environment variable, deploy the function:

```bash
cd server
supabase functions deploy ingest-for-rag
```

## How It Works

1. Edge Function receives document ingestion request with `{ docs: [...] }`
2. For each document with an `id`, it calls: `POST {BACKEND_URL}/api/rag/ingest/{documentId}`
3. Node.js service handles:
   - Document chunking
   - Voyage AI embedding generation
   - Storage in `document_chunks` table
   - Analytics tracking in `rag_analytics` table
4. Edge Function returns summary of successful/failed ingestions

## Benefits

- ✅ **Single Source of Truth:** All ingestion goes through Node.js service
- ✅ **Analytics Tracking:** Every operation logged in `rag_analytics`
- ✅ **Unified Tables:** Uses `documents` and `document_chunks` consistently
- ✅ **Better Performance Metrics:** Centralized monitoring
- ✅ **Easier Debugging:** All logs and errors in one place
