-- Migration: Add document_versions table and enhance documents table
-- Created: 2024-01-15
-- Description: Add version tracking and enhanced document metadata

-- Create document_versions table
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,
    content TEXT,
    changes TEXT,
    word_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    author_id UUID REFERENCES users(id),
    UNIQUE(document_id, version)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at DESC);

-- Add new columns to documents table if they don't exist
DO $$ 
BEGIN
    -- Add word_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'word_count') THEN
        ALTER TABLE documents ADD COLUMN word_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add character_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'character_count') THEN
        ALTER TABLE documents ADD COLUMN character_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add compression_ratio column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'compression_ratio') THEN
        ALTER TABLE documents ADD COLUMN compression_ratio INTEGER DEFAULT 0;
    END IF;
    
    -- Add original_size column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'original_size') THEN
        ALTER TABLE documents ADD COLUMN original_size VARCHAR(50);
    END IF;
    
    -- Add compressed_size column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'compressed_size') THEN
        ALTER TABLE documents ADD COLUMN compressed_size VARCHAR(50);
    END IF;
    
    -- Add processing_time column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'processing_time') THEN
        ALTER TABLE documents ADD COLUMN processing_time VARCHAR(50);
    END IF;
    
    -- Add ai_model column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'ai_model') THEN
        ALTER TABLE documents ADD COLUMN ai_model VARCHAR(100);
    END IF;
    
    -- Add input_tokens column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'input_tokens') THEN
        ALTER TABLE documents ADD COLUMN input_tokens INTEGER DEFAULT 0;
    END IF;
    
    -- Add output_tokens column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'output_tokens') THEN
        ALTER TABLE documents ADD COLUMN output_tokens INTEGER DEFAULT 0;
    END IF;
    
    -- Add tags column (JSONB for flexibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'tags') THEN
        ALTER TABLE documents ADD COLUMN tags JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add source_documents column (JSONB for flexibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'source_documents') THEN
        ALTER TABLE documents ADD COLUMN source_documents JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add comments column (JSONB for flexibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'comments') THEN
        ALTER TABLE documents ADD COLUMN comments JSONB DEFAULT '[]'::jsonb;
    END IF;
    
    -- Add author column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'author') THEN
        ALTER TABLE documents ADD COLUMN author VARCHAR(255);
    END IF;
    
    -- Add title column if it doesn't exist (some systems use 'name' instead)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'title') THEN
        ALTER TABLE documents ADD COLUMN title VARCHAR(255);
        -- Copy name to title if name exists
        UPDATE documents SET title = name WHERE title IS NULL AND name IS NOT NULL;
    END IF;
END $$;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_documents_source_documents ON documents USING GIN(source_documents);
CREATE INDEX IF NOT EXISTS idx_documents_comments ON documents USING GIN(comments);

-- Insert sample data for testing (optional)
INSERT INTO documents (
    id, 
    project_id, 
    title, 
    content, 
    author, 
    status, 
    word_count, 
    character_count, 
    compression_ratio, 
    original_size, 
    compressed_size, 
    processing_time, 
    ai_model, 
    input_tokens, 
    output_tokens, 
    tags, 
    source_documents, 
    comments
) VALUES (
    '36c28371-b8a9-407f-9f0b-a0a09cadc8e0',
    '8e8e4e31-8490-417c-879a-6628b049c8b5',
    'Project Requirements Document',
    '# Project Requirements Document

## Project Overview
This document outlines the comprehensive requirements for the **Advanced Document Processing & Automation (ADPA)** project.

## Executive Summary
The ADPA system is designed to revolutionize document processing workflows through AI-powered automation, intelligent content analysis, and seamless integration capabilities.

## Functional Requirements

### 1. Document Processing Engine
- **AI-Powered Analysis**: Advanced natural language processing for document understanding
- **Multi-Format Support**: PDF, DOCX, TXT, MD, and other common formats
- **Batch Processing**: Handle multiple documents simultaneously
- **Real-time Processing**: Sub-second response times for simple operations

### 2. Template Management System
- **Dynamic Templates**: Create and manage document templates
- **Variable Injection**: Inject project-specific data into templates
- **Version Control**: Track template changes and rollback capabilities
- **Collaboration**: Multi-user template editing and approval workflows

### 3. AI Provider Integration
- **Multi-Provider Support**: OpenAI, Azure AI, Google AI, Mistral, and more
- **Failover Mechanisms**: Automatic provider switching for reliability
- **Cost Optimization**: Intelligent provider selection based on cost and performance
- **API Management**: Centralized API key and configuration management

### 4. Workflow Automation
- **Process Flow Builder**: Visual workflow design interface
- **Conditional Logic**: Smart routing based on document content and metadata
- **Scheduling**: Automated processing schedules and triggers
- **Monitoring**: Real-time workflow execution monitoring

## Technical Requirements

### Architecture
```typescript
interface DocumentProcessor {
  processDocument(document: File): Promise<ProcessedDocument>
  extractMetadata(document: File): Promise<DocumentMetadata>
  generateSummary(content: string): Promise<string>
  compressContent(content: string): Promise<CompressedContent>
}

class ADPADocumentProcessor implements DocumentProcessor {
  private aiProviders: AIProvider[]
  private templateEngine: TemplateEngine
  private workflowEngine: WorkflowEngine

  async processDocument(document: File): Promise<ProcessedDocument> {
    const metadata = await this.extractMetadata(document)
    const content = await this.extractContent(document)
    const summary = await this.generateSummary(content)
    
    return {
      id: generateId(),
      content,
      metadata,
      summary,
      processedAt: new Date(),
      status: ''completed''
    }
  }
}
```

### Database Schema
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  metadata JSONB,
  status VARCHAR(50) DEFAULT ''draft'',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  author_id UUID REFERENCES users(id)
);

CREATE TABLE document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id),
  version_number INTEGER,
  content TEXT,
  changes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  author_id UUID REFERENCES users(id)
);
```

## Performance Requirements
- **Response Time**: < 2 seconds for document processing
- **Throughput**: 1000+ documents per hour
- **Availability**: 99.9% uptime SLA
- **Scalability**: Horizontal scaling support

## Security Requirements
- **Authentication**: Multi-factor authentication support
- **Authorization**: Role-based access control (RBAC)
- **Encryption**: End-to-end encryption for sensitive documents
- **Audit Trail**: Comprehensive logging and audit capabilities
- **Compliance**: GDPR, HIPAA, and SOC2 compliance

## Integration Requirements
- **API Gateway**: RESTful and GraphQL APIs
- **Webhook Support**: Real-time notifications and integrations
- **Third-party Services**: SharePoint, Confluence, Google Drive integration
- **Export Formats**: PDF, DOCX, HTML, JSON, XML

## Quality Assurance
- **Testing Strategy**: Unit, integration, and end-to-end testing
- **Code Coverage**: Minimum 80% test coverage
- **Performance Testing**: Load testing and stress testing
- **Security Testing**: Penetration testing and vulnerability assessment

## Deployment and Operations
- **Containerization**: Docker and Kubernetes deployment
- **CI/CD Pipeline**: Automated testing and deployment
- **Monitoring**: Application performance monitoring (APM)
- **Backup and Recovery**: Automated backup and disaster recovery

## Success Metrics
- **User Adoption**: 90% of target users actively using the system
- **Processing Efficiency**: 50% reduction in document processing time
- **Cost Savings**: 30% reduction in manual document processing costs
- **User Satisfaction**: 4.5+ star rating from user feedback

## Conclusion
The ADPA system represents a significant advancement in document processing automation, combining cutting-edge AI technology with robust engineering practices to deliver a scalable, secure, and user-friendly solution.',
    'Project Manager',
    'published',
    847,
    5234,
    78,
    '3.2MB',
    '704KB',
    '4.2s',
    'GPT-4 Turbo',
    2847,
    1956,
    '["requirements", "technical", "architecture", "ai", "automation"]'::jsonb,
    '[
        {"id": "src-1", "title": "Business Requirements", "type": "PDF"},
        {"id": "src-2", "title": "Technical Architecture", "type": "DOCX"},
        {"id": "src-3", "title": "User Stories", "type": "MD"},
        {"id": "src-4", "title": "API Specifications", "type": "JSON"}
    ]'::jsonb,
    '[
        {
            "id": "comment-1",
            "author": "Technical Lead",
            "content": "The architecture section looks solid. Consider adding more details about the microservices communication patterns.",
            "created_at": "2024-01-15T11:15:00Z"
        },
        {
            "id": "comment-2",
            "author": "Product Manager",
            "content": "Great work on the requirements! The performance metrics are well-defined and achievable.",
            "created_at": "2024-01-15T12:30:00Z"
        }
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Insert sample versions
INSERT INTO document_versions (id, document_id, version, changes, word_count, author_id) VALUES
('v1-uuid', '36c28371-b8a9-407f-9f0b-a0a09cadc8e0', '1.0', 'Initial document creation with basic requirements', 456, (SELECT id FROM users LIMIT 1)),
('v2-uuid', '36c28371-b8a9-407f-9f0b-a0a09cadc8e0', '1.1', 'Added technical architecture and database schema', 723, (SELECT id FROM users LIMIT 1)),
('v3-uuid', '36c28371-b8a9-407f-9f0b-a0a09cadc8e0', '1.2', 'Enhanced with performance requirements and success metrics', 847, (SELECT id FROM users LIMIT 1))
ON CONFLICT (document_id, version) DO NOTHING;
