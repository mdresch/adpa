# Integration Plan: GKG + RAG into AI-Search

**Date:** March 2, 2026  
**Status:** Proposal  
**Scope:** Enhance AI-Search with Graph Knowledge Graph context and RAG-powered assisted results

---

## Executive Summary

The ADPA system currently has three powerful but disconnected capabilities:
1. **AI-Search** (Chat interface): Conversational search using NLP
2. **GKG** (Graph Knowledge Graph): Neo4j-based relationship mapping of projects, documents, tasks, and entities
3. **Knowledge Base**: Lessons learned, efficiency improvements, and best practices repository

This proposal integrates these three systems to provide **context-aware, relationship-enriched, and experience-informed search results** through a RAG (Retrieval-Augmented Generation) pipeline.

---

## Current State Analysis

### AI-Search (`app/ai-search/page.tsx`)
- **Current:** Morphic Chat component (conversational UI)
- **Backend:** Limited API integration visible
- **Gap:** No GKG or knowledge base context

### GKG Module (`server/src/routes/gkg.ts`)
- **Implemented:** Neo4j sync for entities (projects, documents, tasks, semantic units)
- **Data Model:** Entity types, relationships, hierarchies
- **Missing:** Integration with search/chat pipeline
- **Potential:** Rich relationship context (dependencies, impacts, related entities)

### Search Service (`server/src/services/searchService.ts`)
- **Implemented:** Semantic, keyword, and hybrid search across ADPA entities
- **Uses:** Context Retrieval Service (Qdrant integration available)
- **Gap:** No graph-based relationship enrichment

### Knowledge Base (`server/src/services/knowledgeBaseService.ts`)
- **Implemented:** Entry creation, search, application tracking
- **Gap:** Not surfaced in AI-Search results

---

## Proposed Integration Architecture

### 1. **GKG-Aware Search Service**

Add a new context retrieval layer that queries both traditional search and GKG:

```typescript
// server/src/services/gkgEnrichedSearch.ts
interface GKGEnrichedSearchRequest extends UniversalSearchRequest {
  includeRelationships?: boolean  // Include related entities from graph
  relationshipDepth?: number       // How many hops to traverse (1-3)
  excludeGKGTypes?: string[]       // Entity types to exclude from enrichment
}

interface GKGEnrichedResult extends SearchResult {
  gkgMetadata?: {
    entityType: string
    relationships: Array<{
      type: string      // "depends_on", "impacts", "owned_by", etc.
      targetId: string
      targetTitle: string
      targetType: string
    }>
    relatedEntities: SearchResult[]
  }
  knowledgeBaseRecommendations?: Array<{
    entryId: string
    title: string
    applicability: number
    relevance: string
  }>
}
```

### 2. **RAG Pipeline for AI-Search**

Enhance the Chat interface with:
- **Context Window:** Include GKG relationships and knowledge base insights
- **Source Attribution:** Show which sources informed each recommendation
- **Confidence Scores:** Display model confidence in suggestions
- **Follow-up Actions:** Suggest related queries based on graph traversal

```typescript
// server/src/services/aiSearchRAGService.ts
interface AISearchContext {
  searchResults: GKGEnrichedResult[]
  relevantKnowledgeEntries: KnowledgeBaseEntry[]
  traversedRelationships: GraphRelationship[]
  entitySummary: Map<string, EntityContext>  // Cached entity info
  suggestedFollowUps: string[]
}

interface EntityContext {
  id: string
  type: string
  title: string
  briefSummary: string
  criticalRelationships: string[]  // Most important connections
}
```

### 3. **GKG Query Interface**

Add Neo4j query patterns for common search scenarios:

```typescript
// Queries by use case:
1. "Find documents related to Project X"
   MATCH (p:Project {id: $projectId})-[:HAS_DOCUMENT]->(d:Document)
   RETURN d

2. "Show impact chain for this task change"
   MATCH (t:Task {id: $taskId})-[:IMPACTS*1..3]->(affected)
   RETURN affected, length(p) as distance

3. "Find lessons learned applicable to this project"
   MATCH (p:Project {id: $projectId})-[:USES_FRAMEWORK]->(f:Framework)
   MATCH (kb:KnowledgeEntry)-[:APPLICABLE_TO_FRAMEWORK]->(f)
   WHERE kb.relevance_score > 0.7
   RETURN kb

4. "Identify resource conflicts or dependencies"
   MATCH (t1:Task)-[:DEPENDS_ON]->(t2:Task)
   MATCH (t1:Task)-[:ASSIGNED_TO]->(r:Resource)
   MATCH (t2:Task)-[:ASSIGNED_TO]->(r)
   RETURN t1, t2, t3  // Conflict detected
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Create `gkgEnrichedSearch.ts` service
- [ ] Implement GKG relationship querying (Neo4j patterns)
- [ ] Create type definitions for enriched results
- [ ] Unit tests for graph traversal logic

### Phase 2: Integration (Week 3-4)
- [ ] Create `aiSearchRAGService.ts`
- [ ] Integrate into search pipeline
- [ ] Add knowledge base recommendations
- [ ] Implement source attribution/traceability

### Phase 3: UI & API (Week 5-6)
- [ ] Expose `/api/search/enriched` endpoint
- [ ] Update Chat component to use GKG context
- [ ] Add visualization of relationships
- [ ] Create search suggestions based on graph

### Phase 4: Optimization (Week 7-8)
- [ ] Cache frequently queried graph paths
- [ ] Implement lazy loading for relationships
- [ ] Add filtering options for users
- [ ] Performance profiling and optimization

---

## API Endpoints

### New Endpoints

```bash
# Enriched search with GKG context
POST /api/search/enriched
{
  "query": "payment processing improvements",
  "includeRelationships": true,
  "relationshipDepth": 2,
  "types": ["document", "project"],
  "limit": 20
}

# Get GKG entity context
GET /api/gkg/entity/:entityId/context
  ?depth=2&includeRelationships=true

# Find related documents via GKG
GET /api/gkg/related/:entityId
  ?entityType=project&relationshipTypes=depends_on,impacts

# Get knowledge base recommendations for context
POST /api/knowledge-base/recommendations
{
  "entityId": "proj-123",
  "entityType": "project",
  "limit": 5
}

# Get search suggestions from graph
GET /api/search/suggestions
  ?startEntityId=task-456&depth=1
```

---

## Database Schema Additions

### New Tables

```sql
-- Enhanced search metadata
CREATE TABLE search_enrichment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_query TEXT NOT NULL,
  entity_id UUID NOT NULL,
  relationship_depth INT DEFAULT 1,
  cached_context JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  INDEX (search_query, entity_id)
);

-- Knowledge base → GKG entity mappings
CREATE TABLE kb_entity_mappings (
  id UUID PRIMARY KEY,
  knowledge_entry_id UUID REFERENCES knowledge_base(id),
  entity_id UUID,
  entity_type VARCHAR(50),
  applicability_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Graph relationship cache for fast retrieval
CREATE TABLE gkg_relationship_cache (
  id UUID PRIMARY KEY,
  source_id UUID,
  target_id UUID,
  relationship_type VARCHAR(50),
  attributes JSONB,
  cached_at TIMESTAMP DEFAULT NOW(),
  ttl_hours INT DEFAULT 24
);
```

---

## Key Features

### 1. **Context-Aware Search**
- Search queries automatically enriched with GKG relationships
- Users see "related documents," "dependent tasks," "similar projects"
- Relationship distances/paths visualized

### 2. **Knowledge Base Surface**
- Lessons learned automatically suggested for similar scenarios
- Historical applied solutions highlighted
- Cost/time/quality impact metrics shown

### 3. **Relationship Traversal**
- "Show me everything this change might affect"
- "What lessons have been learned in similar projects?"
- "Who else is working on related tasks?"

### 4. **AI-Assisted Insights**
- AI summarizes relationship chains
- Generates actionable recommendations
- Suggests follow-up searches

### 5. **Source Attribution**
- Every result/recommendation traces back to source
- Shows reasoning chain (why this was suggested)
- Confidence scores visible

---

## Technical Dependencies

### Existing (Already Available)
- ✅ Neo4j (GKG)
- ✅ Qdrant (semantic search via Context Retrieval)
- ✅ AI providers (OpenAI, Anthropic, Claude)
- ✅ Search service infrastructure
- ✅ Knowledge base service

### New/Enhanced
- [ ] GKG query builder/optimizer
- [ ] RAG pipeline orchestration
- [ ] Result enrichment engine
- [ ] Graph caching layer

---

## Performance Considerations

### Query Optimization
1. **Lazy Loading:** Fetch relationships on-demand
2. **Caching:** Cache frequent graph paths (24hr TTL)
3. **Batching:** Combine multiple queries to Neo4j
4. **Indexing:** Add Neo4j indexes on frequently traversed relationships

### Scalability
1. Start with depth=2 (2-hop relationships) as default
2. Pagination for relationship results
3. Background job to pre-warm cache for popular entities
4. Rate limiting on graph traversals

---

## Success Metrics

### Quantitative
- Search result quality (relevance scores)
- User adoption of enriched search
- Cache hit rate for relationships
- Query response times (<500ms target)

### Qualitative
- User feedback on relationship relevance
- Knowledge base recommendation actionability
- Reduction in "lost context" issues
- Improved discovery of related work

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Graph data freshness lag | Sync triggered immediately on changes; cache invalidation |
| Query performance impact | Graph query timeouts; fall back to non-enriched results |
| Neo4j unavailability | Graceful degradation to keyword search only |
| Result overwhelming | Limit initial relationships shown; progressive disclosure |
| Privacy/access control | Respect existing ACL filtering in enrichment |

---

## Example Implementation: Single Feature

### Quick Win: "Related Documents" in Search Results

```typescript
// Step 1: In searchService.ts, after traditional search
export async function enrichSearchWithRelatedDocuments(
  searchResults: SearchResult[],
  userId: string
): Promise<GKGEnrichedResult[]> {
  const gkgDriver = getNeo4jDriver()
  
  return Promise.all(searchResults.map(async (result) => {
    if (result.type === 'document') {
      // Find related documents via GKG
      const related = await gkgDriver.query(
        `MATCH (d:Document {id: $id})
         MATCH (d)-[:REFERENCED_BY|REFERENCES*1..2]-(related:Document)
         RETURN related LIMIT 5`,
        { id: result.id }
      )
      
      return {
        ...result,
        gkgMetadata: {
          entityType: 'Document',
          relatedEntities: related.records.map(r => ({
            id: r.get('related').properties.id,
            title: r.get('related').properties.title,
            type: 'document'
          }))
        }
      }
    }
    return result
  }))
}

// Step 2: In API response, include relationship data
// Step 3: In UI, display a "Related Documents" section
```

---

## Next Steps

1. **Review & Approval:** Confirm alignment with product vision
2. **Design Review:** Validate data model and query patterns
3. **Create Epic:** Break into sprints (Phase 1-4 above)
4. **Prototype:** Build Phase 1 foundation
5. **User Testing:** Validate with stakeholders
6. **Iterate:** Expand based on feedback

---

## Contact & Questions

- **Architecture Review:** Required before Phase 2
- **Neo4j Performance:** May need query optimization pass
- **UI/UX Design:** Needed for result presentation
- **Data Privacy:** Review ACL compliance

