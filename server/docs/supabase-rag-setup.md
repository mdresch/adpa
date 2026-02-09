# Supabase RAG Edge Function Setup Guide

## Overview
Your RAG ingestion Edge Function is deployed and ready to use! This guide covers the setup and usage.

## ✅ What's Already Done

### 1. Edge Function Deployed
- **URL**: `https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/ingest-for-rag`
- **Purpose**: Ingests documents, generates embeddings, stores in Vector Bucket

### 2. Database Table Created
- **Table**: `public.documents_raw`
- **Schema**:
  ```sql
  id UUID PRIMARY KEY
  title TEXT
  content TEXT NOT NULL
  metadata JSONB DEFAULT '{}'
  created_at TIMESTAMPTZ DEFAULT NOW()
  ```
- **Indexes**: Created on `created_at` and `metadata` (GIN)

## 🔧 Required Setup Steps

### 1. Create Vector Bucket (Manual)

Vector Buckets are in alpha and require manual setup via Supabase Dashboard:

1. Go to [Supabase Dashboard](https://app.supabase.com/project/blxzjbxczpmmgiwbtmdo)
2. Navigate to **Storage** → **Vector Buckets**
3. Click **New Bucket**
4. Configure:
   - **Name**: `embeddings`
   - Click **Create**

### 2. Create Vector Index (Manual)

1. Open the `embeddings` bucket
2. Click **New Index**
3. Configure:
   - **Index Name**: `documents-voyage`
   - **Data Type**: `float32`
   - **Dimension**: `1024` (for Voyage AI voyage-2 model)
   - **Distance Metric**: `cosine`
4. Click **Create Index**

> **Note**: If using `voyage-3` model, set dimension to `1536` instead.

### 3. Set Voyage AI API Key Secret

Run this command in your terminal:

```bash
# Using Supabase CLI
supabase secrets set VOYAGE_API_KEY=pa-your-voyage-api-key-here

# Or via Supabase Dashboard:
# Settings → Edge Functions → Secrets → Add Secret
# Name: VOYAGE_API_KEY
# Value: pa-your-voyage-api-key-here
```

> **Why Voyage AI?** Voyage AI embeddings are specifically optimized for RAG use cases and provide excellent retrieval quality. You already have Voyage AI configured in your project.

## 📝 Usage

### Ingest Documents

```bash
curl -X POST https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/ingest-for-rag \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "docs": [
      {
        "id": "doc-1",
        "title": "Getting Started Guide",
        "content": "This is a comprehensive guide about...",
        "metadata": {
          "source": "documentation",
          "category": "tutorial",
          "tags": ["beginner", "setup"]
        }
      }
    ],
    "bucket": "embeddings",
    "indexName": "documents-voyage",
    "model": "voyage-2",
    "upsert": true
  }'
```

### Request Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `docs` | Array | Required | Array of documents to ingest |
| `bucket` | String | `"embeddings"` | Vector bucket name |
| `indexName` | String | `"documents-voyage"` | Index name |
| `model` | String | `"voyage-2"` | Voyage AI embedding model (`voyage-2` or `voyage-3`) |
| `upsert` | Boolean | `true` | Overwrite existing documents |

### Document Object

```typescript
{
  id?: string;        // Optional UUID (auto-generated if not provided)
  title?: string;     // Document title
  content: string;    // Full document content (will be chunked)
  metadata?: {        // Optional metadata for filtering
    source?: string;
    category?: string;
    tags?: string[];
    [key: string]: any;
  }
}
```

## 🔍 Querying Vectors for RAG

### Server-Side Query (Node.js/TypeScript)

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 1. Generate query embedding
const queryText = "How do I get started?";
const queryEmbedding = await generateEmbedding(queryText); // Use same model

// 2. Query vector index
const bucket = supabase.storage.vectors.from('embeddings');
const index = bucket.index('documents-openai');

const { data, error } = await index.queryVectors({
  queryVector: queryEmbedding,
  topK: 5,
  filter: { source: 'documentation' } // Optional metadata filter
});

// 3. Retrieve full documents
const sourceIds = data.map(v => v.metadata.source_id);
const { data: docs } = await supabase
  .from('documents_raw')
  .select('*')
  .in('id', sourceIds);
```

## 🏗️ How It Works

1. **Raw Storage**: Documents stored in `documents_raw` table
2. **Chunking**: Content split into ~1200-word chunks with 200-word overlap
3. **Embedding**: Each chunk embedded using OpenAI API
4. **Vector Storage**: Vectors stored with keys like `{doc_id}::{chunk_index}`
5. **Metadata**: Each vector includes title, chunk info, source_id, and custom metadata

## 📊 Vector Key Format

```
{document_id}::{chunk_index}
```

Example: `550e8400-e29b-41d4-a716-446655440000::0`

## 🎯 Next Steps

1. **Create Vector Bucket & Index** (see steps above)
2. **Set OpenAI API Key** secret
3. **Test ingestion** with sample documents
4. **Build query function** for RAG retrieval
5. **Integrate with your app** for semantic search

## 🔗 Resources

- [Vector Buckets Docs](https://supabase.com/docs/guides/storage/vector-buckets)
- [Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)

## 🛠️ Helper Scripts

Run the setup helper:
```bash
node scripts/setup-vector-bucket.js
```

This will display the configuration steps needed.
