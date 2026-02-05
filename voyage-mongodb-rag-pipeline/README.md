# VoyageAI + MongoDB + Pinecone RAG Pipeline

A complete Retrieval-Augmented Generation (RAG) pipeline that integrates VoyageAI embeddings with MongoDB Atlas vector storage and Pinecone vector search, providing intelligent document search and AI-powered responses with semantic search capabilities.

## 🚀 Features

- **Multi-format Document Support**: PDF, DOCX, TXT, Markdown, HTML
- **VoyageAI Integration**: State-of-the-art embeddings and reranking
- **MongoDB Vector Search**: Scalable vector storage and similarity search
- **Pinecone Vector Search**: Integrated embedding with automatic vector generation
- **Triple Storage Architecture**: Neo4j (graph) + Supabase (source) + Pinecone (vectors)
- **Semantic Search**: Find similar projects, documents, and entities by meaning
- **RAG Pipeline**: Context-aware AI responses with source citations
- **REST API**: Complete API for document management and queries
- **Performance Monitoring**: Comprehensive logging and metrics
- **TypeScript**: Full type safety and developer experience

## 📋 Architecture

```
Project Documents → Document Processing → VoyageAI Embeddings → MongoDB Atlas Vector Storage
                                                    ↓
Projects & Entities → Pinecone Integrated Embeddings → Semantic Search → RAG API → Reranked Results
```

## 🛠️ Installation

### Prerequisites

- Node.js 18+ 
- MongoDB Atlas cluster with vector search enabled
- Pinecone index with integrated embedding (llama-text-embed-v2)
- VoyageAI API key
- Neo4j Aura database (for GKG integration)
- Supabase database (for project data)
- (Optional) OpenAI or Anthropic API key for LLM responses

### Setup

1. **Clone and install dependencies**:
```bash
cd voyage-mongodb-rag-pipeline
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Required
VOYAGE_API_KEY=your_voyage_api_key_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/rag_pipeline

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=adpa-integrated-embeddings

# Neo4j Configuration
NEO4J_URI=neo4j+s://your-db.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_neo4j_password

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional (for LLM responses)
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Server configuration
PORT=3002
NODE_ENV=development
```

3. **Setup Pinecone index**:
```bash
# Create integrated embedding index
npm run create-pinecone-index
```

4. **Setup databases**:
```bash
npm run setup-db
npm run gkg:bootstrap
```

5. **Start the server**:
```bash
npm run dev  # Development
npm start    # Production
```

## 📚 API Documentation

### Health Check
```http
GET /health
```

### Document Management

#### Upload Document
```http
POST /api/documents/upload
Content-Type: multipart/form-data

Body: file (binary) + optional metadata (title, author, project, tags)
```

#### Get Documents
```http
GET /api/documents?project=example&limit=10&offset=0
```

#### Get Document by ID
```http
GET /api/documents/:id
```

#### Delete Document
```http
DELETE /api/documents/:id
```

#### Get Similar Documents
```http
GET /api/documents/:id/similar?limit=5
```

### Search & RAG

#### Vector Search (MongoDB)
```http
POST /api/search
Content-Type: application/json

{
  "query": "What are project management best practices?",
  "maxResults": 10,
  "includeReranking": true,
  "filters": {
    "project": "example-project",
    "tags": ["management"]
  }
}
```

#### Semantic Search (Pinecone)
```http
POST /api/pinecone/search
Content-Type: application/json

{
  "query": "governance framework implementation",
  "topK": 10,
  "filter": {
    "type": "project"
  }
}
```

#### Project Similarity Search
```http
GET /api/pinecone/projects/:id/similar?limit=5
```

#### Document Similarity Search
```http
GET /api/pinecone/documents/:id/similar?limit=5
```

#### Entity Search
```http
POST /api/pinecone/entities/search
Content-Type: application/json

{
  "query": "risk management entities",
  "topK": 10,
  "filter": {
    "project_id": "project-uuid"
  }
}
```

#### RAG Query
```http
POST /api/rag
Content-Type: application/json

{
  "query": "How do you handle project risks?",
  "maxResults": 5,
  "includeReranking": true,
  "llmProvider": "openai"
}
```

### Pinecone Vector Management

#### Upsert Projects
```http
POST /api/pinecone/projects/upsert
Content-Type: application/json

{
  "projects": [
    {
      "id": "project-uuid",
      "name": "Project Name",
      "description": "Project description",
      "framework": "PMBOK",
      "status": "active"
    }
  ]
}
```

#### Upsert Documents
```http
POST /api/pinecone/documents/upsert
Content-Type: application/json

{
  "documents": [
    {
      "id": "document-uuid",
      "title": "Document Title",
      "content": "Document content",
      "project_id": "project-uuid"
    }
  ]
}
```

#### Upsert Entities
```http
POST /api/pinecone/entities/upsert
Content-Type: application/json

{
  "entities": [
    {
      "id": "entity-uuid",
      "name": "Entity Name",
      "type": "organization",
      "description": "Entity description",
      "project_id": "project-uuid"
    }
  ]
}
```

#### Pinecone Statistics
```http
GET /api/pinecone/stats
```

### System Stats
```http
GET /api/stats
```

## 🧪 Testing

### Database Setup Test
```bash
npm run setup-db
```

### Pinecone Integration Test
```bash
npm run test-pinecone
```

### Vector Debug Test
```bash
npm run debug-vectors
```

### Create Pinecone Index
```bash
npm run create-pinecone-index
```

### Search Performance Test
```bash
npm run search
```

### RAG Pipeline Test
```bash
npm run rag
```

### GKG Integration Test
```bash
npm run gkg:status
npm run gkg:sync-all
```

## 📊 Performance Metrics

- **Embedding Generation**: ~300ms per 100 texts
- **Vector Search**: ~50-200ms depending on dataset size
- **Reranking**: ~200-500ms for improved relevance
- **LLM Response**: ~1-3 seconds depending on provider

## 🔧 Configuration

### VoyageAI Models
- **Embedding**: `voyage-4-large` (1024 dimensions)
- **Reranking**: `rerank-2.5`

### Pinecone Configuration
- **Index**: `adpa-integrated-embeddings`
- **Embedding Model**: `llama-text-embed-v2` (integrated)
- **Dimensions**: 1024
- **Field Mapping**: `text` → `text`
- **Namespace**: `__default__`

### MongoDB Configuration
- **Vector Index**: Cosine similarity
- **Chunk Size**: 1000 tokens with 200 token overlap
- **Batch Processing**: 100 documents per batch

### Processing Options
```env
EMBEDDING_BATCH_SIZE=100
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_CONCURRENT_REQUESTS=5

# Pinecone Configuration
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=adpa-integrated-embeddings
```

## 🏗️ Project Structure

```
src/
├── app.ts                 # Express app configuration
├── index.ts              # Server entry point
├── config/               # Configuration management
├── services/             # Core business logic
│   ├── database.ts       # MongoDB operations
│   ├── voyageAI.ts       # VoyageAI integration
│   ├── pineconeService.ts # Pinecone vector search
│   ├── documentProcessor.ts # Document parsing
│   ├── governanceKnowledgeGraphSync.ts # GKG sync
│   └── rag.ts           # RAG pipeline logic
├── utils/                # Utilities
│   └── logger.ts        # Logging configuration
├── types/                # TypeScript types
└── scripts/              # CLI scripts
    ├── setup-database.ts
    ├── search.ts
    ├── rag-query.ts
    ├── debug-vectors.ts
    ├── create-integrated-index.ts
    └── inspect-pinecone-namespace.ts
```

## 🔍 Usage Examples

### Upload and Process a Document

```javascript
const FormData = require('form-data');
const fs = require('fs');

const form = new FormData();
form.append('file', fs.createReadStream('./document.pdf'));
form.append('title', 'Project Management Guide');
form.append('project', 'adpa-project');

const response = await fetch('http://localhost:3001/api/documents/upload', {
  method: 'POST',
  body: form
});

const result = await response.json();
console.log('Document processed:', result);
```

### Perform RAG Query

```javascript
const response = await fetch('http://localhost:3002/api/rag', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'What are the key risk management strategies?',
    maxResults: 5,
    includeReranking: true
  })
});

const result = await response.json();
console.log('Answer:', result.answer);
console.log('Sources:', result.sources);
```

### Semantic Search with Pinecone

```javascript
// Search for similar projects
const response = await fetch('http://localhost:3002/api/pinecone/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'governance framework implementation',
    topK: 10,
    filter: {
      type: 'project'
    }
  })
});

const result = await response.json();
console.log('Similar projects:', result.matches);
```

### Upsert Projects to Pinecone

```javascript
const response = await fetch('http://localhost:3002/api/pinecone/projects/upsert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projects: [
      {
        id: 'project-uuid',
        name: 'Project Name',
        description: 'Project description',
        framework: 'PMBOK',
        status: 'active'
      }
    ]
  })
});

const result = await response.json();
console.log('Projects upserted:', result.upsertedCount);
```

## 📈 Monitoring

The application provides comprehensive logging:

- **Request/Response Logging**: All API calls logged with timing
- **Performance Metrics**: Embedding, search, and LLM timing
- **Error Tracking**: Detailed error logging with context
- **Health Monitoring**: Service health checks

## 🚨 Error Handling

- **Validation**: Input validation for all endpoints
- **Rate Limiting**: Built-in request throttling
- **Graceful Degradation**: Services work independently
- **Detailed Errors**: Clear error messages in development

## 🔐 Security

- **Input Sanitization**: All inputs validated and sanitized
- **File Upload Security**: File type and size restrictions
- **API Key Protection**: Environment variable storage
- **CORS Configuration**: Configurable cross-origin policies

## 🤝 Integration with ADPA

This RAG pipeline is designed to integrate seamlessly with the existing ADPA project:

- **Document Extraction**: Connects to existing document processing
- **Entity Recognition**: Enhances current entity extraction
- **Search Enhancement**: Improves existing search capabilities
- **API Compatibility**: Maintains consistency with existing APIs
- **Triple Storage**: Neo4j (graph) + Supabase (source) + Pinecone (vectors)
- **Semantic Search**: Find similar projects, documents, and entities by meaning
- **Governance Analytics**: Advanced project relationship mapping
- **Real-time Sync**: Automatic vector updates during GKG sync operations

## 📝 Development

### Building
```bash
npm run build
```

### Development Mode
```bash
npm run dev
```

### Linting
```bash
npm run lint
```

### Testing
```bash
npm test
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection**: Ensure Atlas cluster allows your IP
2. **Vector Search Index**: Run `npm run setup-db` to create indexes
3. **VoyageAI API**: Verify API key is valid and has credits
4. **Memory Usage**: Adjust batch sizes for large documents

### Debug Mode

Enable debug logging:
```env
LOG_LEVEL=debug
NODE_ENV=development
```

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For issues and questions:
- Create an issue in the repository
- Check the troubleshooting guide
- Review the API documentation
