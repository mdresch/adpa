# Search Strategy - Week 1

**Document Version:** 1.0  
**Date:** Week 1, Phase 1  
**Status:** Initial Search Architecture & Implementation Plan

---

## Executive Summary

This document defines the search strategy for ADPA, covering both lexical (keyword-based) and semantic (AI-powered) search approaches. The initial implementation focuses on PostgreSQL full-text search, with a clear path to semantic search using vector embeddings.

---

## 1. Search Requirements

### 1.1 User Requirements

- **Universal Search:** Search across projects, documents, templates, users, and knowledge base
- **Fast Results:** Sub-second response times for common queries
- **Relevant Results:** Results ranked by relevance, not just keyword matches
- **Filtering:** Filter by type, framework, author, date range, tags
- **Semantic Understanding:** Find content by meaning, not just exact keywords
- **Fuzzy Matching:** Handle typos and variations

### 1.2 Content Types to Search

1. **Projects** - Project names, descriptions, metadata
2. **Documents** - Document titles, content (Markdown), metadata
3. **Templates** - Template names, descriptions, content
4. **Users** - User names, emails, roles
5. **Knowledge Base** - Knowledge entries, lessons learned
6. **MDX Documentation** - Documentation pages with frontmatter

---

## 2. Search Architecture Overview

### 2.1 Two-Tier Approach

```
┌─────────────────────────────────────────────────────────┐
│                    User Query                          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │   Search API Layer    │
         │  (Query Processing)   │
         └───────────┬───────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ↓                       ↓
┌─────────────────┐    ┌──────────────────┐
│  Lexical Search │    │ Semantic Search  │
│  (PostgreSQL    │    │  (Vector         │
│   Full-Text)    │    │   Embeddings)    │
└─────────────────┘    └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │   Result Merging &    │
         │   Relevance Ranking   │
         └───────────────────────┘
                     │
                     ↓
         ┌───────────────────────┐
         │   Filtered & Sorted   │
         │      Results          │
         └───────────────────────┘
```

### 2.2 Search Phases

**Phase 1: Lexical Search (Current)**
- PostgreSQL full-text search using `tsvector` and `tsquery`
- Fast, reliable, built-in PostgreSQL feature
- Good for exact keyword matches and phrase searches
- **Timeline:** Week 1-2

**Phase 2: Hybrid Search (Near-term)**
- Combine lexical and semantic search
- Use lexical for exact matches, semantic for meaning
- **Timeline:** Week 3-4

**Phase 3: Semantic-First Search (Future)**
- Semantic search as primary, lexical as fallback
- Advanced relevance ranking using embeddings
- **Timeline:** Q1 2026

---

## 3. Phase 1: Lexical Search Implementation

### 3.1 PostgreSQL Full-Text Search

PostgreSQL provides powerful full-text search capabilities using:
- **`tsvector`** - Text search vector (normalized document)
- **`tsquery`** - Text search query
- **`ts_rank()`** - Relevance ranking function
- **GIN indexes** - Fast full-text search indexes

### 3.2 Database Schema

#### 3.2.1 Search Index Columns

Add `tsvector` columns and GIN indexes to existing tables:

```sql
-- Documents table
ALTER TABLE documents 
ADD COLUMN search_vector tsvector;

-- Projects table
ALTER TABLE projects 
ADD COLUMN search_vector tsvector;

-- Templates table
ALTER TABLE templates 
ADD COLUMN search_vector tsvector;

-- Knowledge base entries (already has search_vector)
-- No changes needed
```

#### 3.2.2 Index Creation

```sql
-- Create GIN indexes for fast full-text search
CREATE INDEX idx_documents_search_vector 
ON documents USING GIN(search_vector);

CREATE INDEX idx_projects_search_vector 
ON projects USING GIN(search_vector);

CREATE INDEX idx_templates_search_vector 
ON templates USING GIN(search_vector);
```

#### 3.2.3 Search Vector Population

```sql
-- Update search vectors for documents
UPDATE documents 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(content::text, '')), 'C');

-- Update search vectors for projects
UPDATE projects 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');

-- Update search vectors for templates
UPDATE templates 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(content::text, '')), 'C');
```

**Weight Explanation:**
- **A (highest)** - Title/name fields
- **B (medium)** - Description fields
- **C (lowest)** - Content/body fields

### 3.3 Search Query Examples

#### 3.3.1 Basic Full-Text Search

```sql
-- Search documents
SELECT 
  id,
  title,
  ts_rank(search_vector, query) AS rank
FROM documents, 
  plainto_tsquery('english', 'project charter') AS query
WHERE search_vector @@ query
ORDER BY rank DESC
LIMIT 20;
```

#### 3.3.2 Multi-Table Search

```sql
-- Search across multiple entity types
WITH search_query AS (
  SELECT plainto_tsquery('english', $1) AS query
),
document_results AS (
  SELECT 
    'document' AS type,
    id,
    title,
    description,
    created_at,
    ts_rank(search_vector, (SELECT query FROM search_query)) AS rank
  FROM documents, search_query
  WHERE search_vector @@ query
  LIMIT 10
),
project_results AS (
  SELECT 
    'project' AS type,
    id,
    name AS title,
    description,
    created_at,
    ts_rank(search_vector, (SELECT query FROM search_query)) AS rank
  FROM projects, search_query
  WHERE search_vector @@ query
  LIMIT 10
)
SELECT * FROM document_results
UNION ALL
SELECT * FROM project_results
ORDER BY rank DESC;
```

#### 3.3.3 Filtered Search

```sql
-- Search with filters
SELECT 
  id,
  title,
  framework,
  ts_rank(search_vector, query) AS rank
FROM documents, 
  plainto_tsquery('english', $1) AS query
WHERE search_vector @@ query
  AND framework = $2  -- Filter by framework
  AND status = 'published'  -- Filter by status
  AND created_at >= $3  -- Filter by date
ORDER BY rank DESC
LIMIT 20;
```

### 3.4 API Implementation

#### 3.4.1 Search Endpoint

```typescript
// server/src/routes/search.ts

import { Router } from 'express'
import { authenticateToken } from '../middleware/auth'
import { pool } from '../database/connection'
import { validate } from '../middleware/validation'
import Joi from 'joi'
import { logger } from '../utils/logger'

const router = Router()

interface SearchRequest {
  query: string
  types?: string[]  // ['project', 'document', 'template', 'user']
  framework?: string
  author?: string
  dateRange?: { start?: string; end?: string }
  tags?: string[]
  limit?: number
  offset?: number
  sortBy?: 'relevance' | 'date' | 'title'
}

router.post(
  '/',
  authenticateToken,
  validate(Joi.object({
    query: Joi.string().required().min(2).max(500),
    types: Joi.array().items(
      Joi.string().valid('project', 'document', 'template', 'user')
    ).optional(),
    framework: Joi.string().optional(),
    author: Joi.string().optional(),
    dateRange: Joi.object({
      start: Joi.string().isoDate().optional(),
      end: Joi.string().isoDate().optional()
    }).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    limit: Joi.number().min(1).max(100).default(20),
    offset: Joi.number().min(0).default(0),
    sortBy: Joi.string().valid('relevance', 'date', 'title').default('relevance')
  })),
  async (req, res) => {
    try {
      const searchRequest: SearchRequest = req.body
      const userId = req.user!.id
      
      logger.info('[SEARCH] Lexical search request', {
        query: searchRequest.query,
        types: searchRequest.types,
        userId
      })
      
      const results = await performLexicalSearch(searchRequest, userId)
      
      res.json({
        success: true,
        data: results,
        total: results.length,
        query: searchRequest.query
      })
    } catch (error: any) {
      logger.error('[SEARCH] Error:', error)
      res.status(500).json({
        success: false,
        error: error.message
      })
    }
  }
)

async function performLexicalSearch(
  request: SearchRequest,
  userId: string
): Promise<any[]> {
  const searchQuery = `plainto_tsquery('english', $1)`
  const conditions: string[] = []
  const values: any[] = [request.query]
  let paramIndex = 2
  
  // Determine which entity types to search
  const typesToSearch = request.types && request.types.length > 0
    ? request.types
    : ['project', 'document', 'template']
  
  const results: any[] = []
  
  // Search documents
  if (typesToSearch.includes('document')) {
    let docQuery = `
      SELECT 
        'document' AS type,
        id,
        title,
        description,
        content::text AS content_preview,
        framework,
        status,
        created_at,
        updated_at,
        created_by AS author_id,
        (SELECT name FROM users WHERE id = created_by) AS author,
        ts_rank(search_vector, ${searchQuery}) AS relevance_score
      FROM documents
      WHERE search_vector @@ ${searchQuery}
        AND deleted_at IS NULL
    `
    
    if (request.framework) {
      docQuery += ` AND framework = $${paramIndex}`
      values.push(request.framework)
      paramIndex++
    }
    
    if (request.author) {
      docQuery += ` AND created_by = (SELECT id FROM users WHERE name ILIKE $${paramIndex})`
      values.push(`%${request.author}%`)
      paramIndex++
    }
    
    docQuery += ` ORDER BY relevance_score DESC LIMIT $${paramIndex}`
    values.push(request.limit || 20)
    
    const docResults = await pool.query(docQuery, values)
    results.push(...docResults.rows)
  }
  
  // Similar queries for projects, templates, etc.
  
  // Sort results
  if (request.sortBy === 'relevance') {
    results.sort((a, b) => b.relevance_score - a.relevance_score)
  } else if (request.sortBy === 'date') {
    results.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  } else if (request.sortBy === 'title') {
    results.sort((a, b) => a.title.localeCompare(b.title))
  }
  
  return results
}

export default router
```

### 3.5 Trigger for Auto-Updates

Create triggers to automatically update search vectors when content changes:

```sql
-- Function to update document search vector
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.content::text, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on documents table
CREATE TRIGGER documents_search_vector_update
BEFORE INSERT OR UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_search_vector();
```

---

## 4. Phase 2: Semantic Search (Future)

### 4.1 Vector Embeddings

Use OpenAI embeddings or similar to create vector representations of content:

```typescript
// Generate embeddings for content
import { OpenAI } from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })
  return response.data[0].embedding
}
```

### 4.2 Vector Storage

Store embeddings in PostgreSQL using `vector` extension (pgvector):

```sql
-- Install pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column
ALTER TABLE documents 
ADD COLUMN embedding vector(1536);  -- OpenAI text-embedding-3-small dimension

-- Create vector index
CREATE INDEX idx_documents_embedding 
ON documents USING ivfflat (embedding vector_cosine_ops);
```

### 4.3 Semantic Search Query

```sql
-- Semantic similarity search
SELECT 
  id,
  title,
  1 - (embedding <=> $1::vector) AS similarity_score
FROM documents
WHERE embedding IS NOT NULL
ORDER BY embedding <=> $1::vector
LIMIT 20;
```

### 4.4 Hybrid Search

Combine lexical and semantic search:

```typescript
async function hybridSearch(query: string, limit: number = 20) {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query)
  
  // 2. Perform semantic search
  const semanticResults = await semanticSearch(queryEmbedding, limit)
  
  // 3. Perform lexical search
  const lexicalResults = await lexicalSearch(query, limit)
  
  // 4. Merge and re-rank results
  const merged = mergeResults(semanticResults, lexicalResults)
  
  return merged.slice(0, limit)
}
```

---

## 5. Search Indexing Strategy

### 5.1 Initial Indexing

Create a migration script to index all existing content:

```typescript
// server/scripts/index-all-content.ts

async function indexAllContent() {
  // Index documents
  await pool.query(`
    UPDATE documents 
    SET search_vector = 
      setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
      setweight(to_tsvector('english', COALESCE(content::text, '')), 'C')
    WHERE search_vector IS NULL
  `)
  
  // Index projects
  await pool.query(`
    UPDATE projects 
    SET search_vector = 
      setweight(to_tsvector('english', COALESCE(name, '')), 'A') ||
      setweight(to_tsvector('english', COALESCE(description, '')), 'B')
    WHERE search_vector IS NULL
  `)
  
  // Index templates
  // Similar query...
}
```

### 5.2 Incremental Indexing

Use database triggers (as shown in section 3.5) to automatically update search vectors when content changes.

### 5.3 Re-indexing Strategy

- **Full re-index:** Run monthly or after major schema changes
- **Incremental:** Use triggers for real-time updates
- **Validation:** Periodic checks to ensure search vectors are up-to-date

---

## 6. Performance Optimization

### 6.1 Index Optimization

- Use **GIN indexes** for full-text search (fast reads, slower writes)
- Use **IVFFlat indexes** for vector search (pgvector)
- Monitor index size and query performance

### 6.2 Query Optimization

- Limit result sets (default 20, max 100)
- Use pagination for large result sets
- Cache frequent queries
- Use connection pooling

### 6.3 Caching Strategy

```typescript
// Cache search results
const cacheKey = `search:${query}:${JSON.stringify(filters)}`
const cached = await redis.get(cacheKey)
if (cached) return JSON.parse(cached)

const results = await performSearch(query, filters)
await redis.setex(cacheKey, 300, JSON.stringify(results)) // 5 min cache
```

---

## 7. Search UI Integration

### 7.1 Current State

The search UI exists at `/app/search/page.tsx` but uses mock data.

### 7.2 Integration Steps

1. **Replace mock data** with API calls to `/api/search`
2. **Add loading states** for better UX
3. **Implement filters** using API filter parameters
4. **Add result highlighting** for matched terms
5. **Add pagination** for large result sets

### 7.3 Example Integration

```typescript
// app/search/page.tsx

const performSearch = async (query: string, filters: SearchFilters) => {
  try {
    setLoading(true)
    
    const response = await apiClient.post('/search', {
      query,
      types: filters.type,
      framework: filters.framework[0],
      author: filters.author[0],
      dateRange: filters.date_range,
      tags: filters.tags,
      limit: 20,
      sortBy: sortBy
    })
    
    setResults(response.data)
    setTotalResults(response.total)
  } catch (error) {
    toast.error('Search failed')
  } finally {
    setLoading(false)
  }
}
```

---

## 8. MDX Content Search

### 8.1 Frontmatter Indexing

Index MDX frontmatter fields for search:

```sql
-- Add search vector for MDX content
ALTER TABLE mdx_content 
ADD COLUMN search_vector tsvector;

-- Update search vector including frontmatter
UPDATE mdx_content 
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(frontmatter->>'title', '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(frontmatter->>'description', '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'C') ||
  setweight(to_tsvector('english', array_to_string(frontmatter->'tags', ' ')), 'B');
```

### 8.2 Frontmatter Filtering

Use frontmatter fields for filtering:

```sql
-- Filter by area
WHERE frontmatter->>'area' = 'getting-started'

-- Filter by level
WHERE frontmatter->>'level' = 'intermediate'

-- Filter by tags
WHERE frontmatter->'tags' @> '["pmbok"]'::jsonb

-- Filter by framework
WHERE frontmatter->>'framework' = 'PMBOK'
```

---

## 9. Implementation Roadmap

### Week 1-2: Lexical Search Foundation
- [x] Create search strategy document
- [ ] Add `search_vector` columns to tables
- [ ] Create GIN indexes
- [ ] Create database triggers
- [ ] Implement search API endpoint
- [ ] Index existing content
- [ ] Integrate with search UI

### Week 3-4: Enhanced Search
- [ ] Add fuzzy matching
- [ ] Implement result highlighting
- [ ] Add search analytics
- [ ] Optimize query performance
- [ ] Add search suggestions/autocomplete

### Q1 2026: Semantic Search
- [ ] Install pgvector extension
- [ ] Generate embeddings for content
- [ ] Implement semantic search
- [ ] Create hybrid search (lexical + semantic)
- [ ] Advanced relevance ranking

---

## 10. Testing Strategy

### 10.1 Unit Tests

- Test search query construction
- Test filter application
- Test result ranking
- Test edge cases (empty query, special characters)

### 10.2 Integration Tests

- Test full search flow (API → Database → Results)
- Test search across multiple entity types
- Test filter combinations
- Test pagination

### 10.3 Performance Tests

- Measure query response times
- Test with large datasets (10k+ documents)
- Monitor index performance
- Test concurrent searches

---

## 11. Monitoring & Analytics

### 11.1 Search Metrics

Track:
- Search query frequency
- Most common queries
- Zero-result queries
- Average results per query
- Search-to-click-through rate

### 11.2 Performance Monitoring

Monitor:
- Query response times
- Index size
- Cache hit rates
- Database load

---

## 12. Appendix: PostgreSQL Full-Text Search Reference

### 12.1 Text Search Functions

- `to_tsvector(config, text)` - Convert text to search vector
- `plainto_tsquery(config, text)` - Convert plain text to query
- `ts_rank(vector, query)` - Calculate relevance rank
- `@@` - Match operator (vector @@ query)

### 12.2 Text Search Configurations

- `english` - English language (default)
- `simple` - Simple (no stemming)
- `spanish`, `french`, etc. - Other languages

### 12.3 Weight Classes

- `A` - Highest weight (titles)
- `B` - Medium weight (descriptions)
- `C` - Low weight (content)
- `D` - Lowest weight (rarely used)

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | Week 1, Phase 1 | Initial search strategy document | ADPA Team |

---

**End of Document**

