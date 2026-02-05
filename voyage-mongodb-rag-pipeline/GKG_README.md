# Governance Knowledge Graph (GKG) System

A powerful Neo4j-based knowledge graph system with integrated Pinecone vector search that syncs project data from Supabase to create governance analytics, relationship mapping, and semantic search capabilities.

## 🎯 Overview

The Governance Knowledge Graph (GKG) system provides:
- **Real-time project governance analytics**
- **Relationship mapping between projects, documents, and semantic units**
- **Entity extraction and governance insights**
- **Semantic search with Pinecone vector embeddings**
- **Scalable graph database architecture using Neo4j Aura**
- **Supabase integration for live data synchronization**
- **Triple storage**: Neo4j (graph) + Supabase (source) + Pinecone (vectors)

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │   GKG Service    │    │   Neo4j Aura    │    │   Pinecone       │
│                 │    │                  │    │                 │    │                 │
│ • 180+ Projects │───▶│ • Data Transform │───▶│ • Graph Storage │───▶│ • Vector Search │
│ • Documents     │    │ • Entity Extract │    │ • Relationships │    │ • Semantic Match │
│ • Metadata      │    │ • Sync Engine    │    │ • Analytics     │    │ • Integrated Embed │
└─────────────────┘    └──────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

1. **Neo4j Aura Database**
   - URI: `neo4j+s://860f2e3e.databases.neo4j.io`
   - Username: `neo4j`
   - Password: Configured in environment

2. **Supabase Database**
   - URL: `https://blxzjbxczpmmgiwbtmdo.supabase.co`
   - Projects table with 180+ projects
   - Documents table with project documents

3. **Pinecone Vector Database**
   - Index: `adpa-integrated-embeddings`
   - Integrated embedding: `llama-text-embed-v2`
   - API key configured in environment

4. **Node.js Environment**
   - Node.js 18+ recommended
   - npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd voyage-mongodb-rag-pipeline

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Configuration

Update your `.env` file with the following:

```env
# Neo4j Configuration
NEO4J_URI_DEV=neo4j+s://860f2e3e.databases.neo4j.io
NEO4J_USERNAME_DEV=neo4j
NEO4J_PASSWORD_DEV=your_neo4j_password
NEO4J_DATABASE_DEV=neo4j

# Supabase Configuration
SUPABASE_URL=https://blxzjbxczpmmgiwbtmdo.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=adpa-integrated-embeddings

# VoyageAI Configuration (for embeddings)
VOYAGE_API_KEY=your_voyage_api_key
VOYAGE_EMBEDDING_MODEL=voyage-2
VOYAGE_RERANK_MODEL=rerank-1
```

## 📋 Available Commands

### GKG Management

```bash
# Bootstrap GKG with reference nodes and governance domains
npm run gkg:bootstrap

# Sync all projects from Supabase to Neo4j
npm run gkg:sync-all

# Sync a specific project
npm run gkg:sync-project <project-id>

# Check GKG status and statistics
npm run gkg:status

# Test Neo4j connection
npm run test-current-credentials
```

### Pinecone Vector Search

```bash
# Create integrated embedding index
npm run create-pinecone-index

# Test Pinecone integration
npm run test-pinecone

# Debug vector generation
npm run debug-vectors

# Inspect Pinecone namespace
npm run inspect-pinecone-namespace
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 🗄️ Database Schema

### Supabase Tables

#### Projects
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    priority VARCHAR(20) DEFAULT 'medium',
    start_date DATE,
    end_date DATE,
    budget DECIMAL(12,2),
    owner_id UUID REFERENCES users(id),
    team_members JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Documents
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    content JSONB,
    template_id UUID,
    version INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'draft',
    file_path VARCHAR(500),
    mime_type VARCHAR(100),
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Semantic Units (Optional)
```sql
CREATE TABLE semantic_units (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'text_chunk',
    confidence DECIMAL(3,2) DEFAULT 0.85,
    metadata JSONB DEFAULT '{}',
    entities JSONB DEFAULT '[]',
    chunk_index INTEGER,
    start_position INTEGER,
    end_position INTEGER,
    word_count INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Neo4j Graph Structure

#### Node Types
- **Project**: Project metadata and governance information
- **Document**: Project documents and content
- **SemanticUnit**: Text chunks and semantic content
- **Entity**: Extracted entities (people, organizations, concepts)
- **GovernanceDomain**: Governance categories and domains

#### Relationship Types
- **CONTAINS**: Project → Document, Document → SemanticUnit
- **CONTAINS_ENTITY**: SemanticUnit → Entity
- **BELONGS_TO**: Project → GovernanceDomain
- **HAS_MATURITY**: Project → MaturityLevel

## 📊 Sync Results Example

```bash
🔄 Starting bulk sync of all projects to GKG...
2026-02-04 09:39:52 [info]: Found 180 projects to sync
2026-02-04 09:39:52 [info]: Syncing project: Project G-Pixel Amsterdam
2026-02-04 09:39:57 [info]: Successfully synced project: Project G-Pixel Amsterdam

📊 Sync Results:
✅ Projects synced: 180
📄 Documents synced: 450+
🔍 Semantic units synced: 1,350+
⏱️  Duration: 45,230ms

✅ Bulk sync completed successfully!
```

## 🔍 Neo4j Browser Queries

### Explore Projects
```cypher
// Get all projects with their governance domains
MATCH (p:Project)-[:BELONGS_TO]->(g:GovernanceDomain)
RETURN p.name, p.status, g.name
LIMIT 25;
```

### Project Relationships
```cypher
// Find projects with similar governance domains
MATCH (p1:Project)-[:BELONGS_TO]->(g:GovernanceDomain)<-[:BELONGS_TO]-(p2:Project)
WHERE p1.id < p2.id
RETURN p1.name, p2.name, g.name
LIMIT 10;
```

### Document Analysis
```cypher
// Get documents and their semantic units
MATCH (p:Project)-[:CONTAINS]->(d:Document)-[:CONTAINS]->(su:SemanticUnit)
RETURN p.name, d.name, count(su) as semantic_units
ORDER BY semantic_units DESC
LIMIT 10;
```

### Entity Network
```cypher
// Find entities across projects
MATCH (e:Entity)<-[:CONTAINS_ENTITY]-(su:SemanticUnit)<-[:CONTAINS]-(d:Document)<-[:CONTAINS]-(p:Project)
RETURN e.name, e.type, count(DISTINCT p) as project_count
ORDER BY project_count DESC
LIMIT 20;
```

## 🛠️ Configuration

### GKG Sync Configuration

```typescript
interface GKGSyncConfig {
  environment: 'development' | 'staging' | 'production';
  batchSize: number;        // Default: 50
  retryAttempts: number;    // Default: 3
  syncMode: 'bootstrap' | 'incremental' | 'full';
}
```

### Supabase Service Configuration

The Supabase service automatically handles:
- Connection pooling
- Error recovery
- Data transformation
- Graceful fallbacks to mock data

## 🔧 Troubleshooting

### Common Issues

#### 1. Neo4j Connection Issues
```bash
# Test connection
npm run test-current-credentials

# Check credentials in .env
NEO4J_URI_DEV=neo4j+s://your-db.databases.neo4j.io
NEO4J_USERNAME_DEV=neo4j
NEO4J_PASSWORD_DEV=your-password
```

#### 2. Supabase Connection Issues
```bash
# Verify Supabase credentials
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

#### 3. Missing Semantic Units Table
If you see `Could not find the table 'public.semantic_units'`, run:
```sql
-- Execute in Supabase SQL Editor
-- Use the create-semantic-units-table.sql script
```

### Error Handling

The system includes comprehensive error handling:
- **Connection Failures**: Automatic retries with exponential backoff
- **Missing Tables**: Graceful fallback to mock data
- **Data Validation**: Type checking and data sanitization
- **Logging**: Detailed error logging with context

## 📈 Performance

### Sync Performance
- **Projects**: ~200ms per project
- **Documents**: ~100ms per document  
- **Semantic Units**: ~50ms per unit
- **Batch Processing**: Configurable batch sizes

### Neo4j Performance
- **Indexing**: Automatic index creation on key fields
- **Query Optimization**: Optimized Cypher queries
- **Memory Management**: Efficient memory usage patterns

## 🔐 Security

### Authentication
- **Neo4j**: Username/password authentication
- **Supabase**: JWT-based authentication with anon/service keys
- **Environment Variables**: Sensitive data stored in .env

### Data Protection
- **Row Level Security**: Configurable RLS policies in Supabase
- **Input Validation**: Comprehensive input sanitization
- **Error Logging**: No sensitive data in logs

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
```bash
# Set production environment
export NODE_ENV=production

# Configure production databases
export NEO4J_URI_PROD=your-production-neo4j-uri
export SUPABASE_URL=your-production-supabase-url
```

2. **Database Setup**
```bash
# Run migrations
npm run migrate

# Bootstrap GKG
npm run gkg:bootstrap
```

3. **Start Services**
```bash
# Start production server
npm run start

# Run initial sync
npm run gkg:sync-all
```

## 📚 API Reference

### GKG Service Methods

```typescript
class GovernanceKnowledgeGraphSync {
  // Bootstrap GKG with reference nodes
  async bootstrapGKG(): Promise<boolean>
  
  // Sync all projects
  async syncAllProjects(): Promise<SyncResult>
  
  // Sync specific project
  async syncProjectToGKG(projectId: string): Promise<SyncResult>
  
  // Get sync statistics
  async getSyncStats(): Promise<SyncStats>
}
```

### Supabase Service Methods

```typescript
class SupabaseService {
  // Get all projects
  async getProjects(): Promise<Project[]>
  
  // Get project documents
  async getProjectDocuments(projectId: string): Promise<Document[]>
  
  // Get semantic units
  async getDocumentSemanticUnits(documentId: string): Promise<SemanticUnit[]>
  
  // Test connection
  async testConnection(): Promise<boolean>
}
```

## 🤝 Contributing

### Development Workflow

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/new-feature`
3. **Make changes** and add tests
4. **Run tests**: `npm test`
5. **Commit changes**: `git commit -m "Add new feature"`
6. **Push branch**: `git push origin feature/new-feature`
7. **Create Pull Request**

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow configured linting rules
- **Tests**: Unit tests for all new features
- **Documentation**: Update README for API changes

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

1. **Check the troubleshooting section**
2. **Review the error logs**
3. **Create an issue** in the repository
4. **Contact the development team**

## 🔄 Version History

### v2.0.0 (2026-02-04)
- ✅ **NEW**: Pinecone vector search integration
- ✅ **NEW**: Integrated embedding with llama-text-embed-v2
- ✅ **NEW**: Semantic search for projects, documents, and entities
- ✅ **NEW**: Triple storage architecture (Neo4j + Supabase + Pinecone)
- ✅ **NEW**: Automatic vector indexing during GKG sync
- ✅ **NEW**: upsertRecords method for efficient vector upserts
- ✅ Enhanced: Real-time semantic search capabilities
- ✅ Enhanced: Project similarity discovery
- ✅ Enhanced: Entity relationship mapping

### v1.0.0 (2026-02-04)
- ✅ Initial release
- ✅ Supabase integration
- ✅ Neo4j Aura connectivity
- ✅ 180+ project sync capability
- ✅ Governance analytics
- ✅ Entity extraction
- ✅ Graceful error handling

---

**Built with ❤️ for the ADPA Governance Framework**
