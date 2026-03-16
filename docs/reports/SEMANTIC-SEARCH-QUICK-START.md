# Semantic Search Deployment Quick Start
## 5-Minute Setup Guide

### Prerequisites
- ✅ Phase 3.1 working (context assembly, AI generation, streaming)
- ✅ Voyage API key from https://www.voyageai.com/
- ✅ PostgreSQL/Supabase with pgvector extension
- ✅ Node.js/npm environment

### Step 1: Configure Environment (1 min)

```bash
# server/.env
VOYAGE_API_KEY=<<your-voyage-api-key>>

# Verify:
echo $VOYAGE_API_KEY  # Should show key, not empty
```

### Step 2: Apply Database Migration (2 min)

```bash
cd server

# Option A: Using Supabase CLI
supabase db push

# Option B: Using psql directly
psql -h your-host -U your-user -d your-db -f ../migrations/230_semantic_search_and_knowledge_base_optimization.sql

# Verify:
psql -h your-host -U your-user -d your-db -c \
  "SELECT COUNT(*), SUM(CASE WHEN embedding IS NOT NULL THEN 1 ELSE 0 END) FROM knowledge_base_entries;"
# Should show: (10, 0) -- 10 KB entries, 0 embeddings yet
```

### Step 3: Generate Embeddings (2 min)

```bash
# Ensure server is running
npm run dev

# In another terminal, generate embeddings:
curl -X POST http://localhost:5000/api/admin/semantic-search/generate \
  -H "Authorization: Bearer $(grep AUTH_TOKEN .env)" \
  -H "Content-Type: application/json"

# Or use npm script (if added to package.json):
npm run semantic-search:init
```

### Step 4: Verify Semantic Search Works

```bash
# Test query
curl -X POST http://localhost:5000/api/admin/semantic-search/test-query \
  -H "Authorization: Bearer $(grep AUTH_TOKEN .env)" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "How to implement AI transformation?",
    "limit": 5
  }'

# Expected response:
# - 5 results with semantic_score: 0.65-0.92
# - Top result: "Enterprise AI Transformation Roadmap 2026-2028"
```

### Step 5: Test with Phase 3.1 Assisted Search

```bash
# Run Phase 3.1 query with semantic search enabled
curl -X POST http://localhost:5000/api/assisted-search/assisted-search \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is our AI adoption strategy?",
    "searchMode": "hybrid",
    "useSemanticSearch": true,
    "includeAnswer": true,
    "provider": "google"
  }'

# Expected: relevance_score 0.7-0.92 (not 0.1!)
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| `VOYAGE_API_KEY is not set` | Check `.env` and export `VOYAGE_API_KEY` |
| Embeddings = 0 after generation | Check Voyage API key validity |
| Relevance scores still 0.1 | Verify embeddings count: `SELECT COUNT(*) WHERE embedding IS NOT NULL` |
| Query timeout | Check pgvector index exists: `SELECT * FROM pg_indexes WHERE tablename='knowledge_base_entries'` |

### Performance Expectations

| Metric | Expected |
|--------|----------|
| Embedding generation | 10 entries: ~30 seconds |
| Query latency (p50) | <100ms with index |
| Relevance score improvement | 0.1 → 0.7-0.92 (7-9x improvement) |
| KB entry coverage | 100% if all have embeddings |

### Files Created/Modified

**New Files:**
- `server/migrations/230_semantic_search_and_knowledge_base_optimization.sql` (Migration)
- `server/src/services/semanticSearchService.ts` (Core service)
- `server/src/api/admin/semanticSearchApi.ts` (API endpoints)
- `server/scripts/semantic-search-init.js` (Initialization script)
- `SEMANTIC-SEARCH-IMPLEMENTATION.md` (Full documentation)

**Modified Files:**
- `server/src/services/searchService.ts` (Added hybrid scoring, semantic support)
- `server/src/routes/adminRoutes.ts` (Added admin endpoints)

### Next: Monitor & Maintain

```bash
# Check status regularly
curl -X GET http://localhost:5000/api/admin/semantic-search/status \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Re-generate embeddings for new KB entries
# (automatically runs on /api/admin/semantic-search/generate)
```

---

**Total Setup Time: 5-10 minutes**  
**Success Indicator: relevance_score: 0.75+ (not 0.1)**
