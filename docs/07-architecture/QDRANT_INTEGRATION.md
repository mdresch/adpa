# Qdrant Vector Database Integration

## Overview

Qdrant has been integrated as an **additional parallel search feature** alongside the existing semantic and keyword search engines. This provides enhanced vector search capabilities using Qdrant Cloud.

## Architecture

### Parallel Search Strategy

The hybrid search now runs **three search engines in parallel**:

1. **Semantic Search Engine** - PostgreSQL-based vector similarity using JSONB
2. **Keyword Search Engine** - Traditional keyword matching
3. **Qdrant Search Engine** - Dedicated vector database for high-performance similarity search

All three engines execute simultaneously using `Promise.all()`, and results are combined and deduplicated with intelligent score weighting.

### Components

#### 1. QdrantSearchEngine (`server/src/modules/contextRetrieval/engines/qdrantSearchEngine.ts`)

- Handles vector search operations in Qdrant Cloud
- Manages collection creation and initialization
- Provides upsert, search, and delete operations
- Integrates with MultiProviderEmbeddingsService for embedding generation

#### 2. Configuration Helper (`server/src/modules/contextRetrieval/config/qdrantConfig.ts`)

- Reads Qdrant configuration from environment variables
- Validates configuration parameters
- Returns `null` if Qdrant is not configured (graceful degradation)

#### 3. Context Retrieval Service Integration

- Updated `ContextRetrievalService` to accept optional Qdrant configuration
- Modified `retrieveHybridContext()` to include Qdrant search in parallel
- Enhanced `combineSearchResults()` to merge Qdrant results with appropriate weighting

## Configuration

### Environment Variables

Add the following to `server/.env.local`:

```bash
# Qdrant Cloud endpoint
QDRANT_URL=https://your-cluster-id.europe-west3-0.gcp.cloud.qdrant.io

# Optional: API key if required
# QDRANT_API_KEY=your_api_key_here

# Collection name (default: adpa_documents)
QDRANT_COLLECTION_NAME=adpa_documents

# Vector size (must match embedding model, e.g., 1536 for OpenAI ada-002)
QDRANT_VECTOR_SIZE=1536

# Distance metric: Cosine, Euclidean, or Dot (default: Cosine)
QDRANT_DISTANCE=Cosine
```

### Current Configuration

Based on your Qdrant Cloud cluster:

- **Endpoint**: `https://d35148e2-147e-43ec-9d28-0157391a2fb1.europe-west3-0.gcp.cloud.qdrant.io`
- **Collection**: `adpa_documents`
- **Vector Size**: `1536` (OpenAI text-embedding-ada-002)
- **Distance**: `Cosine`

## Initialization

### 1. Initialize Collection

Run the initialization script to create the Qdrant collection:

```bash
cd server
pnpm run init-qdrant
```

This script will:
- Check if the collection exists
- Create it if it doesn't exist
- Display collection information

### 2. Automatic Initialization

The Qdrant collection is automatically created on first use if it doesn't exist. The `QdrantSearchEngine` constructor calls `ensureCollection()` which handles this.

## Usage

### Automatic Integration

Qdrant search is **automatically included** in hybrid searches when:

1. `QDRANT_URL` is set in environment variables
2. The `ContextRetrievalService` is initialized with Qdrant config

### Manual Usage

You can also use Qdrant directly:

```typescript
import { QdrantSearchEngine } from '@/modules/contextRetrieval/engines/qdrantSearchEngine'
import { getQdrantConfig } from '@/modules/contextRetrieval/config/qdrantConfig'

const qdrantConfig = getQdrantConfig()
if (qdrantConfig) {
  const qdrantEngine = new QdrantSearchEngine(qdrantConfig, semanticConfig)
  
  // Search
  const results = await qdrantEngine.search(query, contextTypes, filters, 20)
  
  // Upsert document
  await qdrantEngine.upsertPoint(id, content, type, source, sourceId, metadata)
  
  // Batch upsert
  await qdrantEngine.batchUpsertPoints(points)
}
```

## Result Combination

When combining results from all three search engines:

1. **Semantic results** get a 1.2x boost (highest priority)
2. **Keyword results** are added as-is
3. **Qdrant results** get a 1.1x boost
4. **Duplicate results** (same ID) have their scores averaged with weights:
   - Existing score: 60%
   - New score: 40%

## Performance

### Benefits

- **Parallel Execution**: All three engines run simultaneously
- **Faster Vector Search**: Qdrant is optimized for vector operations
- **Scalability**: Qdrant Cloud handles scaling automatically
- **Graceful Degradation**: System works without Qdrant if not configured

### Monitoring

Check logs for:
- `Qdrant search completed` - Successful searches
- `Qdrant search failed` - Errors (non-blocking)
- `Qdrant not configured` - Missing configuration

## Data Migration

### Syncing Existing Data to Qdrant

To populate Qdrant with existing document embeddings:

1. Query existing embeddings from PostgreSQL `search_index` table
2. Use `batchUpsertPoints()` to bulk insert into Qdrant
3. Run periodically to keep Qdrant in sync

Example migration script (to be created):

```typescript
// Query existing embeddings
const embeddings = await pool.query('SELECT * FROM search_index WHERE embeddings IS NOT NULL')

// Convert to Qdrant points
const points = embeddings.rows.map(row => ({
  id: row.id,
  content: row.content,
  type: row.type,
  source: row.source,
  sourceId: row.source_id,
  metadata: row.metadata
}))

// Batch upsert
await qdrantEngine.batchUpsertPoints(points)
```

## Error Handling

- **Connection Errors**: Logged as warnings, search continues with other engines
- **Missing Configuration**: Qdrant is skipped, system uses semantic + keyword only
- **Collection Errors**: Logged, but don't block other search engines

## Future Enhancements

1. **Automatic Sync**: Background job to sync PostgreSQL embeddings to Qdrant
2. **Collection Management**: Multiple collections for different document types
3. **Filtering**: Enhanced Qdrant filter support for complex queries
4. **Metrics**: Track Qdrant performance vs other engines
5. **A/B Testing**: Compare results quality with/without Qdrant

## Troubleshooting

### Collection Not Found

```bash
# Initialize collection manually
pnpm run init-qdrant
```

### Connection Errors

- Verify `QDRANT_URL` is correct
- Check if API key is required and set `QDRANT_API_KEY`
- Verify network connectivity to Qdrant Cloud

### Vector Size Mismatch

- Ensure `QDRANT_VECTOR_SIZE` matches your embedding model dimensions
- OpenAI ada-002: 1536
- OpenAI text-embedding-3-small: 1536
- OpenAI text-embedding-3-large: 3072

## References

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant JS Client](https://github.com/qdrant/qdrant-js)
- [Qdrant Cloud](https://cloud.qdrant.io/)
