# GKG-Enriched Search Implementation Guide

## Overview

The GKG (Graph Knowledge Graph) Enriched Search system integrates Graph Knowledge Graph relationships with Retrieval-Augmented Generation (RAG) capabilities into ADPA's AI-Search to provide context-aware, relationship-enriched search results.

**Key Components:**
- `gkgEnrichedSearch.ts` (Service): Core enrichment logic with Neo4j integration
- `gkgEnrichedSearch.ts` (Routes): API endpoints for enriched search operations
- Integrated into main search pipeline via `/api/search/enriched` endpoint

---

## Architecture

### Data Flow

```
User Query
    ↓
[Enriched Search Endpoint]
    ↓
[Base Search] → Find documents, projects, tasks, templates
    ↓
[GKG Enrichment] → Query Neo4j for relationships
    ↓
[Knowledge Base Lookup] → Find applicable lessons learned & recommendations
    ↓
[Result Assembly] → Attach metadata to search results
    ↓
[Response Cache] (5-min TTL)
    ↓
[Analytics Tracking] → Log search patterns & engagement
    ↓
[JSON Response]
```

### Component Responsibilities

**GKGEnrichedSearchService:**
- Query Neo4j for entity relationships up to N hops
- Retrieve related entities from MongoDB/Qdrant
- Fetch knowledge base recommendations
- Assemble enrichment metadata
- Handle graceful degradation if Neo4j unavailable

**Routes Layer:**
- Validate request parameters
- Check response cache (Redis)
- Coordinate service calls
- Track analytics events
- Return paginated responses

---

## API Endpoints

### 1. POST /api/search/enriched

**Enhanced semantic/keyword search with GKG relationships and knowledge base recommendations.**

#### Request Body

```typescript
{
  // Search query (required)
  "query": "string (2-500 chars)",
  
  // Filter by entity types (optional)
  "types": ["document", "project", "task", "template", "portfolio", "program"],
  
  // Additional filters (optional)
  "frameworks": ["PMBOK", "COBIT"],
  "authors": ["user123", "user456"],
  "tags": ["budget", "timeline"],
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-12-31T23:59:59Z"
  },
  
  // Pagination (optional)
  "limit": 20,
  "offset": 0,
  
  // Sorting (optional)
  "sortBy": "relevance" | "date" | "title",
  
  // GKG Enrichment Options
  "includeRelationships": true,           // Enable GKG traversal
  "relationshipDepth": 2,                 // 1-3 hops (default: 2)
  "relationshipTypes": [                  // Specific relationship types
    "depends_on", 
    "impacts", 
    "related_to",
    "same_owner"
  ],
  "excludeGKGTypes": ["archival"],        // Skip certain entity types
  "includeKnowledgeBase": true,           // Include KB recommendations
  
  // Advanced (optional)
  "allowAIClustering": false              // Enable AI-powered result clustering
}
```

#### Response Format

```typescript
{
  "results": [
    {
      // Standard search result fields
      "id": "uuid",
      "type": "document|project|task|...",
      "title": "string",
      "description": "string",
      "updated_at": "ISO timestamp",
      "relevance_score": 0.92,
      "url": "string",
      
      // GKG Enrichment Metadata
      "gkgMetadata": {
        // Entity information from Graph
        "entityType": "document",
        
        // Direct relationships from Neo4j
        "relationships": [
          {
            "relationshipType": "impacts",
            "targetEntityId": "uuid",
            "targetEntityType": "project",
            "targetTitle": "Project Name",
            "strength": 0.85,
            "hops": 1
          }
        ],
        
        // Full search results for related entities
        "relatedEntities": [
          {
            "id": "uuid",
            "title": "Related Document",
            "type": "document",
            "relationshipReason": "Project XYZ impacts this document"
          }
        ],
        
        // Knowledge base recommendations
        "knowledgeRecommendations": [
          {
            "id": "uuid",
            "title": "Lesson: Budget Overruns",
            "type": "efficiency_improvement",
            "category": "positive_drift",
            "relevanceScore": 0.78,
            "reason": "Applied when managing projects with similar budget scope"
          }
        ]
      }
    }
  ],
  
  // Metadata
  "total": 42,
  "limit": 20,
  "offset": 0,
  "responseTimeMs": 245,
  "cached": false,
  "gkgStatus": "enriched" | "disabled" | "cached",
  
  // Helpful message
  "suggestion": "Results include GKG relationships under gkgMetadata. Check related entities and knowledge recommendations."
}
```

#### Usage Examples

**Basic enriched search:**
```bash
curl -X POST http://localhost:5000/api/search/enriched \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "budget planning for enterprise projects",
    "includeRelationships": true,
    "relationshipDepth": 2,
    "limit": 10
  }'
```

**Search with specific relationship types:**
```bash
curl -X POST http://localhost:5000/api/search/enriched \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "risk assessment",
    "types": ["project", "document"],
    "relationshipTypes": ["depends_on", "impacts"],
    "includeKnowledgeBase": true,
    "limit": 15
  }'
```

**Contextual search with date filter:**
```bash
curl -X POST http://localhost:5000/api/search/enriched \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "query": "project closure lessons learned",
    "dateRange": {
      "start": "2024-06-01",
      "end": "2024-12-31"
    },
    "includeKnowledgeBase": true,
    "sortBy": "date"
  }'
```

---

### 2. GET /api/search/related/:entityId

**Get entities related to a specific entity via GKG traversal.**

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `entityType` | string | `document` | Type of source entity (project, document, task, etc.) |
| `relationshipTypes` | string | any | Comma-separated relationship types to follow |
| `depth` | number | `2` | Graph traversal depth (1-3) |

#### Response Example

```typescript
{
  "entityId": "uuid",
  "entityType": "document",
  "relationshipTypes": ["impacts", "depends_on"],
  "depth": 2,
  "count": 7,
  "related": [
    {
      "entityId": "uuid",
      "entityType": "project",
      "title": "Enterprise Modernization",
      "relationshipType": "impacts",
      "hops": 1,
      "strength": 0.92
    },
    {
      "entityId": "uuid",
      "entityType": "task",
      "title": "Finalize Requirements",
      "relationshipType": "depends_on",
      "hops": 2,
      "strength": 0.65
    }
  ]
}
```

#### Usage

```bash
# Get all entities related to a document via impact relationships
curl http://localhost:5000/api/search/related/doc-uuid-123 \
  -H "Authorization: Bearer <token>" \
  --data-urlencode "entityType=document" \
  --data-urlencode "relationshipTypes=impacts,same_owner" \
  --data-urlencode "depth=2"
```

---

### 3. GET /api/search/suggestions/:entityId

**Get suggested follow-up searches based on entity relationships.**

#### Query Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `entityType` | string | `document` | Type of source entity |

#### Response Example

```typescript
{
  "entityId": "uuid",
  "suggestions": [
    "projects impacted by this plan",
    "team members assigned to related tasks",
    "previous lessons learned for similar scope",
    "budget constraints in dependent projects",
    "schedule risks in downstream phases"
  ]
}
```

#### Usage

```bash
# Get follow-up search suggestions for a project
curl http://localhost:5000/api/search/suggestions/proj-uuid-456 \
  -H "Authorization: Bearer <token>" \
  -G --data-urlencode "entityType=project"
```

---

## Integration Points

### JavaScript/TypeScript Client

```typescript
import axios from 'axios'

// Perform enriched search
const response = await axios.post('/api/search/enriched', {
  query: 'budget planning',
  includeRelationships: true,
  relationshipDepth: 2,
  limit: 20
}, {
  headers: { Authorization: `Bearer ${token}` }
})

// Extract results with metadata
const { results, total, gkgStatus } = response.data

// Display enriched results with relationship context
results.forEach(result => {
  console.log(`Title: ${result.title}`)
  console.log(`Relevance: ${result.relevance_score}`)
  
  if (result.gkgMetadata) {
    console.log(`Related entities: ${result.gkgMetadata.relatedEntities.length}`)
    console.log(`Knowledge recommendations: ${result.gkgMetadata.knowledgeRecommendations.length}`)
    
    // Show first 3 relationships
    result.gkgMetadata.relationships.slice(0, 3).forEach(rel => {
      console.log(`  → ${rel.relationshipType} ${rel.targetTitle}`)
    })
  }
})
```

### React Component Usage

```typescript
import { useState } from 'react'
import axios from 'axios'

export function EnrichedSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await axios.post('/api/search/enriched', {
        query,
        includeRelationships: true,
        relationshipDepth: 2,
        limit: 20
      })
      
      setResults(response.data.results)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSearch}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search with GKG enrichment..."
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Searching...' : 'Search'}
      </button>
      
      {results.length > 0 && (
        <div>
          <h3>Results ({results.length})</h3>
          {results.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </form>
  )
}

function ResultCard({ result }) {
  const { gkgMetadata } = result
  
  return (
    <div className="result-card">
      <h4>{result.title}</h4>
      <p>{result.description}</p>
      
      {gkgMetadata?.relatedEntities.length > 0 && (
        <div className="related-entities">
          <strong>Related:</strong>
          <ul>
            {gkgMetadata.relatedEntities.slice(0, 3).map((entity) => (
              <li key={entity.id}>{entity.title} ({entity.type})</li>
            ))}
          </ul>
        </div>
      )}
      
      {gkgMetadata?.knowledgeRecommendations.length > 0 && (
        <div className="kb-recommendations">
          <strong>Lessons Learned:</strong>
          <ul>
            {gkgMetadata.knowledgeRecommendations.slice(0, 2).map((kb) => (
              <li key={kb.id}>{kb.title}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
```

---

## Performance & Caching

### Response Caching

- **Cache Key:** Hash of query + filters + options + userId
- **TTL:** 5 minutes (configurable in routes)
- **Storage:** Redis
- **Invalidation:** Manual via cache clear or automatic on TTL expiry

### Neo4j Query Optimization

The service uses optimized Cypher queries:

```cypher
// Example: Get related project documents
MATCH (doc:Document {id: $docId})
-[r:impacts|related_to]-(related:Document)
WHERE related.id <> $docId
RETURN related, r, labels(related)[0] as type
LIMIT 20
```

**Optimization strategies:**
- Relationship indexing on Neo4j side
- Query result caching (separate layer)
- Depth limiting to prevent cartesian explosion
- Early filtering by entityType

### Analytics Tracking

Every search generates analytics data including:
- `query`: Search string
- `searchMode`: "gkg-enriched" or "standard"
- `typesSearched`: Entity types included
- `totalResults`: Result count
- `responseTimeMs`: End-to-end latency
- `cacheHit`: Whether result was cached
- User and device information

Access analytics via `/api/analytics/search-analytics` endpoint.

---

## Error Handling & Graceful Degradation

### Neo4j Unavailable

If Neo4j is offline:
- `gkgStatus` returns "unavailable"
- Results returned WITHOUT gkgMetadata
- No relationship/recommendation enrichment
- Response still cached

```typescript
{
  "results": [...],  // Still populated
  "gkgStatus": "unavailable",
  "warning": "GKG enrichment not available, returning base search results"
}
```

### Knowledge Base Unavailable

If KB service fails:
- `knowledgeRecommendations` array is empty
- Other GKG data still populated
- Graceful degradation logged

### Query Timeout

If enrichment exceeds 10s timeout:
- Partial results returned with available metadata
- Missing metadata fields left as empty arrays
- Operation logged as "timeout" in analytics

---

## Configuration Options

### Environment Variables

```bash
# Redis caching (used for result cache)
REDIS_URL=redis://localhost:6379

# Neo4j (GKG backend)
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Search behavior
GKG_MAX_RELATIONSHIP_DEPTH=3
GKG_RELATIONSHIP_TIMEOUT_MS=5000
GKG_CACHE_TTL_SECONDS=300
```

### Service-level Configuration

In `gkgEnrichedSearch.ts`:

```typescript
// Relationship traversal limits
private static readonly MAX_DEPTH = 3
private static readonly MAX_HOPS_PER_RELATIONSHIP = 100

// Query timeouts
private static readonly NEO4J_TIMEOUT_MS = 5000
private static readonly KB_LOOKUP_TIMEOUT_MS = 3000

// Caching
private static readonly CACHE_TTL_SECONDS = 300
```

---

## Testing

### Unit Tests

```typescript
describe('GKGEnrichedSearchService', () => {
  
  describe('enrichResults', () => {
    it('should add relationship metadata to results', async () => {
      const results = [/* search results */]
      const request = {
        query: 'test',
        includeRelationships: true,
        relationshipDepth: 2
      }
      
      const enriched = await service.enrichResults(results, request, userId)
      
      expect(enriched[0]).toHaveProperty('gkgMetadata')
      expect(enriched[0].gkgMetadata.relationships).toBeInstanceOf(Array)
    })
    
    it('should handle Neo4j errors gracefully', async () => {
      // Mock Neo4j connection failure
      const enriched = await service.enrichResults(results, request, userId)
      
      // Should return results without relationship data
      expect(enriched[0].gkgMetadata.relationships).toEqual([])
    })
  })
  
  describe('getRelatedEntities', () => {
    it('should traverse graph up to specified depth', async () => {
      const related = await service.getRelatedEntities(
        entityId,
        'document',
        undefined,
        2
      )
      
      expect(related.length).toBeGreaterThan(0)
      expect(related[0]).toHaveProperty('hops')
      expect(Math.max(...related.map(r => r.hops))).toBeLessThanOrEqual(2)
    })
  })
})
```

### Integration Tests

```bash
# Test the full endpoint
curl -X POST http://localhost:5000/api/search/enriched \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "query": "test search",
    "includeRelationships": true,
    "limit": 5
  }' | jq '.results[0].gkgMetadata'
```

---

## Migration from Standard Search to Enriched Search

### For Existing Code

Replace:
```typescript
const response = await axios.post('/api/search', {
  query: 'my search',
  limit: 20
})
```

With:
```typescript
const response = await axios.post('/api/search/enriched', {
  query: 'my search',
  includeRelationships: true,  // New
  includeKnowledgeBase: true,   // New
  limit: 20
})
```

### Backward Compatibility

The standard `/api/search` endpoint continues to work unchanged. Migration is optional and progressive:

1. Keep existing calls to `/api/search`
2. Add new calls to `/api/search/enriched` where relationship context matters
3. Migrate gradually based on user feedback
4. Monitor performance impact via analytics

### Feature Flags

To enable/disable enrichment per-user:

```typescript
const enrichmentEnabled = await getUserFeatureFlag(userId, 'gkg-enriched-search')

const response = await axios.post(
  enrichmentEnabled ? '/api/search/enriched' : '/api/search',
  { /* request */ }
)
```

---

## Troubleshooting

### No GKG Metadata in Results

**Check:**
1. Is Neo4j reachable? `GET /api/debug-env` shows NEO4J_URI
2. Has GKG sync run? Check `/api/gkg/sync-status`
3. Is `includeRelationships: true` in request?

**Solution:**
```typescript
// Force sync if needed
await axios.post('/api/gkg/sync', { batchSize: 100 })

// Then retry search with fresh Neo4j data
const response = await axios.post('/api/search/enriched', request)
```

### Slow Response Times

**Check:**
1. Is result cached? `cached: true` in response = fast
2. Neo4j query time? Check `/api/ai-analytics/slow-queries`
3. Size of result set? Reduce `limit` or add more specific filters

**Solutions:**
- Enable caching by using same query parameters
- Add entity `types` to narrow Neo4j traversal scope
- Reduce `relationshipDepth` (default 2 is usually sufficient)
- Use `relationshipTypes` to focus on specific edges

### Know/Unknown Entities

If entity is not in Neo4j:
- Check GKG sync tasks in `/api/gkg/sync-status`
- Verify entity exists in ADPA (not soft-deleted)
- Re-run targeted sync: `POST /api/gkg/sync?entityType=document&entityId=xxx`

---

## Road Map

### Phase 2 (Current)
- ✅ GKG enrichment in search results
- ✅ Knowledge base recommendations
- ✅ Related entity traversal

### Phase 3 (Planned)
- [ ] RAG pipeline orchestration for AI consumption
- [ ] Chat component updates in AI-Search UI
- [ ] Context window token budgeting
- [ ] Multi-turn conversation context assembly

### Phase 4 (Future)
- [ ] Advanced caching strategies
- [ ] Lazy loading of relationship details
- [ ] Relationship strength re-ranking
- [ ] ML-powered relevance scoring
- [ ] Collaborative filtering across users

---

## References

- **GKG Service:** [server/src/services/gkgEnrichedSearch.ts](server/src/services/gkgEnrichedSearch.ts)
- **API Routes:** [server/src/routes/gkgEnrichedSearch.ts](server/src/routes/gkgEnrichedSearch.ts)
- **Integration Plan:** [INTEGRATION_PLAN_GKG_RAG_AI_SEARCH.md](INTEGRATION_PLAN_GKG_RAG_AI_SEARCH.md)
- **Knowledge Base:** [server/src/services/knowledgeBaseService.ts](server/src/services/knowledgeBaseService.ts)
- **Base Search:** [server/src/services/searchService.ts](server/src/services/searchService.ts)
