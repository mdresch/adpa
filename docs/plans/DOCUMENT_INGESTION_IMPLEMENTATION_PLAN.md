# Story sc-27: Document Ingestion & Semantic Knowledge Graph Foundation - Implementation Plan

## Overview
This plan breaks down the broad story into manageable implementation phases, following Korey's recommendations while providing concrete technical specifications.

## Phase 1: Multi-Format Document Parser (2-3 points)

### Objective
Build a robust parser that extracts text and metadata from common document formats.

### Tasks

#### 1.1 Create Document Parser Service
**File**: `server/src/services/documentParserService.ts`

```typescript
export interface ParsedDocument {
  id: string;
  filename: string;
  format: 'pdf' | 'docx' | 'xlsx' | 'txt';
  content: string;
  metadata: {
    author?: string;
    created_date?: Date;
    modified_date?: Date;
    title?: string;
    version?: string;
    word_count: number;
    character_count: number;
    pages?: number;
    tables?: number;
  };
  sections: DocumentSection[];
  parsing_confidence: number;
  parsing_errors: string[];
}

export interface DocumentSection {
  id: string;
  heading?: string;
  content: string;
  type: 'paragraph' | 'heading' | 'list' | 'table' | 'other';
  order: number;
}

export class DocumentParserService {
  async parseDocument(buffer: Buffer, format: string): Promise<ParsedDocument>;
  async parsePDF(buffer: Buffer): Promise<ParsedDocument>;
  async parseDocx(buffer: Buffer): Promise<ParsedDocument>;
  async parseXlsx(buffer: Buffer): Promise<ParsedDocument>;
  async parseTxt(buffer: Buffer): Promise<ParsedDocument>;
}
```

**Dependencies**:
- pdf-parse (PDF extraction)
- docx (DOCX parsing)
- xlsx (Excel parsing)

#### 1.2 Create Document Upload Endpoint
**File**: `app/api/documents/upload/route.ts`

- Accept multipart form data
- Validate file types (PDF, DOCX, XLSX, TXT)
- Enforce file size limits (100MB max)
- Parse document and store metadata
- Return parsed content for preview

#### 1.3 Create Database Schema
```sql
-- documents_raw: Store original document metadata
CREATE TABLE documents_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id),
  filename VARCHAR(255) NOT NULL,
  format VARCHAR(10) NOT NULL,
  original_content BYTEA,
  parsed_content TEXT,
  metadata JSONB,
  parsing_confidence FLOAT,
  parsing_errors TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, filename)
);

-- document_sections: Store parsed sections for indexing
CREATE TABLE document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents_raw(id) ON DELETE CASCADE,
  heading VARCHAR(255),
  content TEXT,
  section_type VARCHAR(50),
  section_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Acceptance Criteria
- [ ] Parser successfully extracts text from 95%+ of valid documents
- [ ] Metadata extraction (author, date, title) works for 90%+ of documents
- [ ] Parsing errors logged with specific reasons
- [ ] Upload endpoint validates file types and sizes
- [ ] Document sections properly segmented and indexed

---

## Phase 2: Entity Extraction & Relationship Mapping (3-4 points)

### Objective
Extract entities (projects, tasks, stakeholders, requirements) and relationships from parsed documents.

### Tasks

#### 2.1 Create Entity Extraction Service
**File**: `server/src/services/entityExtractionService.ts`

```typescript
export type EntityType = 'project' | 'task' | 'stakeholder' | 'requirement' | 'risk' | 'constraint' | 'deliverable' | 'metric';

export interface ExtractedEntity {
  id: string;
  type: EntityType;
  value: string;
  confidence: number;
  source_section_id: string;
  attributes: Record<string, any>;
  referenced_at: number[]; // Character positions in document
}

export interface ExtractedRelationship {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  relationship_type: string; // 'depends_on', 'assigned_to', 'relates_to', etc.
  confidence: number;
  context: string;
}

export interface ExtractionResult {
  document_id: string;
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
  extraction_confidence: number;
  extraction_errors: string[];
}

export class EntityExtractionService {
  async extractEntities(parsedDocument: ParsedDocument): Promise<ExtractionResult>;
  async extractFromSection(section: DocumentSection): Promise<ExtractedEntity[]>;
  async buildRelationships(entities: ExtractedEntity[], context: string): Promise<ExtractedRelationship[]>;
}
```

**Implementation Strategy**:
- Use pattern matching for high-confidence entity types (e.g., email patterns for stakeholders)
- Leverage Claude for semantic extraction of requirements, risks, constraints
- Maintain extraction confidence scores
- Store all relationships with context

#### 2.2 Create Database Schema
```sql
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents_raw(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  value TEXT NOT NULL,
  confidence FLOAT,
  attributes JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(100),
  confidence FLOAT,
  context TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Acceptance Criteria
- [ ] Extracts minimum 5 entity types with 80%+ accuracy on test documents
- [ ] Identifies relationships with contextual information
- [ ] Confidence scores reflect extraction certainty
- [ ] Handles ambiguous entities gracefully (flags for review)
- [ ] Processes 1000+ entities per document efficiently

---

## Phase 3: Semantic Knowledge Graph Generation (3-4 points)

### Objective
Store extracted entities and relationships in Neo4j for graph queries and traversal.

### Tasks

#### 3.1 Create Knowledge Graph Service
**File**: `server/src/services/knowledgeGraphService.ts`

```typescript
export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  labels: string[];
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  properties: Record<string, any>;
}

export class KnowledgeGraphService {
  async createNodes(entities: ExtractedEntity[]): Promise<GraphNode[]>;
  async createEdges(relationships: ExtractedRelationship[]): Promise<GraphEdge[]>;
  async persistToNeo4j(nodes: GraphNode[], edges: GraphEdge[]): Promise<void>;
  async updateEntityReferences(entity: GraphNode, documentId: string): Promise<void>;
  async queryRelated(entityId: string, depth: number): Promise<GraphNode[]>;
}
```

#### 3.2 Neo4j Integration
```typescript
// server/src/infrastructure/neo4j.ts
import neo4j from 'neo4j-driver';

export const driver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

export const session = driver.session();

// Create constraints and indexes
export async function initializeNeo4jSchema() {
  await session.run('CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE');
  await session.run('CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type)');
  await session.run('CREATE INDEX entity_document IF NOT EXISTS FOR (e:Entity) ON (e.document_id)');
}
```

#### 3.3 Create Database Schema (Knowledge Graph Metadata)
```sql
CREATE TABLE graph_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents_raw(id),
  graph_id VARCHAR(255) UNIQUE,
  node_count INT,
  edge_count INT,
  exported_at TIMESTAMP DEFAULT NOW(),
  neo4j_status VARCHAR(50) DEFAULT 'pending'
);
```

### Acceptance Criteria
- [ ] Entities correctly mapped to Neo4j nodes with properties
- [ ] Relationships correctly mapped to edges with types
- [ ] Graph queries return related entities within 2 seconds
- [ ] Handles circular relationships gracefully
- [ ] Supports multiple document graphs in single Neo4j instance

---

## Phase 4: Query Interface & Knowledge Graph API (2-3 points)

### Objective
Provide REST API for querying the knowledge graph.

### Tasks

#### 4.1 Create Graph Query Service
**File**: `server/src/services/graphQueryService.ts`

```typescript
export interface GraphQuery {
  type: 'entity_search' | 'path_finding' | 'related_entities' | 'subgraph';
  parameters: Record<string, any>;
}

export interface QueryResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    query_time_ms: number;
    node_count: number;
    edge_count: number;
  };
}

export class GraphQueryService {
  async findEntity(entityId: string): Promise<GraphNode | null>;
  async searchEntities(query: string, type?: string): Promise<GraphNode[]>;
  async findRelatedEntities(entityId: string, relationshipType?: string, depth?: number): Promise<QueryResult>;
  async findPath(sourceId: string, targetId: string, maxDepth?: number): Promise<GraphEdge[]>;
  async getSubgraph(entityIds: string[]): Promise<QueryResult>;
}
```

#### 4.2 Create API Endpoints

**File**: `app/api/knowledge-graph/entities/route.ts`
```typescript
// GET /api/knowledge-graph/entities?query=&type=&limit=20
// Search entities with filtering and pagination
```

**File**: `app/api/knowledge-graph/entities/[id]/route.ts`
```typescript
// GET /api/knowledge-graph/entities/[id]
// Get entity details with relationships
```

**File**: `app/api/knowledge-graph/relationships/route.ts`
```typescript
// GET /api/knowledge-graph/relationships?source=&target=&type=
// Query relationships with filters
```

**File**: `app/api/knowledge-graph/path/route.ts`
```typescript
// GET /api/knowledge-graph/path?source=&target=&maxDepth=5
// Find paths between entities
```

#### 4.3 Create React Components

**File**: `components/knowledge-graph/EntityBrowser.tsx`
- Search entities with autocomplete
- Display entity details (type, properties, confidence)
- Show relationships in table format
- Link to original document section

**File**: `components/knowledge-graph/RelationshipViewer.tsx`
- Visualize relationships between entities
- Support filtering by relationship type
- Show relationship confidence and context

### Acceptance Criteria
- [ ] Entity search returns results in < 500ms
- [ ] Path finding works for up to 5 hops depth
- [ ] Query results show confidence scores
- [ ] UI pagination handles 1000+ results
- [ ] All endpoints properly authenticated

---

## Integration & Performance Targets

### Processing Pipeline
1. Document Upload → Parse (< 5s for 10MB document)
2. Entity Extraction → Relationships (< 10s for typical document)
3. Neo4j Persistence (< 2s for 1000+ entities)
4. Query Response (< 500ms for typical queries)

### Success Metrics
- Document parsing success rate: 95%+
- Entity extraction accuracy: 85%+
- Average query response time: < 500ms
- Neo4j graph traversal depth: up to 5 hops
- Concurrent document processing: 5+ simultaneous uploads

### Rollout Strategy
1. **Phase 1**: Document parsing and storage
2. **Phase 2**: Entity extraction with manual validation workflow
3. **Phase 3**: Neo4j integration with sample data
4. **Phase 4**: Public API and UI components

---

## Testing Strategy

### Phase 1: Parser Tests
- Test files: PDF (10MB), Word (complex formatting), Excel (multiple sheets), TXT (large file)
- Validate parsing confidence scores
- Test error handling for corrupted files

### Phase 2: Entity Extraction Tests
- Use domain documents (project charters, requirements, risk registers)
- Measure extraction accuracy with manual validation
- Test relationship mapping with known document sets

### Phase 3: Graph Tests
- Verify Neo4j node/edge creation
- Test graph queries with various depths
- Validate performance with 10,000+ node graphs

### Phase 4: API Tests
- Load test query endpoints (1000 QPS)
- Test pagination and filtering
- Verify authentication on all endpoints

---

## Dependencies & Environment

### Packages (Already in package.json)
- pdf-parse@2.4.5 - PDF extraction
- docx@8.5.0 - DOCX parsing
- xlsx - Excel parsing
- neo4j-driver@5.28.0 - Neo4j integration

### Environment Variables
```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your-password
MAX_DOCUMENT_SIZE=104857600 # 100MB
MAX_CONCURRENT_PARSING=5
ENTITY_EXTRACTION_CONFIDENCE_THRESHOLD=0.7
```

### Neo4j Setup
```bash
# Docker setup for development
docker run -d --name neo4j -p 7687:7687 -p 7474:7474 \
  -e NEO4J_AUTH=neo4j/password \
  -e NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \
  neo4j:5.15-community
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Parsing failures on edge-case formats | Implement fallback to plain text extraction; extensive testing matrix |
| Entity extraction inaccuracy | Implement confidence scoring; UI validation workflow; human review queue |
| Neo4j performance at scale | Implement query optimization; index strategy; monitoring |
| Graph relationship explosion | Implement relationship filtering; depth limits; duplicate detection |

---

## Next Steps
1. Review and approve this phased breakdown
2. Start Phase 1: Document Parser implementation
3. Set up Neo4j development environment
4. Create test document corpus for validation
5. Implement integration tests after each phase
