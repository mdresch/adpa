-- Migration: Create document ingestion schema
-- Purpose: Store parsed documents and sections for semantic knowledge graph

BEGIN;

-- documents_raw: Store original document metadata and parsed content
CREATE TABLE IF NOT EXISTS public.documents_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  format VARCHAR(10) NOT NULL CHECK (format IN ('pdf', 'docx', 'xlsx', 'txt')),
  original_content BYTEA,
  parsed_content TEXT,
  metadata JSONB,
  parsing_confidence NUMERIC(3,2) CHECK (parsing_confidence >= 0 AND parsing_confidence <= 1),
  parsing_errors TEXT[],
  raw_text_length INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id),
  CONSTRAINT unique_document_per_project UNIQUE(project_id, filename)
);

-- Create indexes for common queries
CREATE INDEX idx_documents_raw_project_id ON public.documents_raw(project_id);
CREATE INDEX idx_documents_raw_format ON public.documents_raw(format);
CREATE INDEX idx_documents_raw_created_by ON public.documents_raw(created_by);
CREATE INDEX idx_documents_raw_created_at ON public.documents_raw(created_at);

-- document_sections: Store parsed sections for indexing and entity extraction
CREATE TABLE IF NOT EXISTS public.document_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents_raw(id) ON DELETE CASCADE,
  heading VARCHAR(500),
  content TEXT NOT NULL,
  section_type VARCHAR(50) NOT NULL CHECK (
    section_type IN ('paragraph', 'heading', 'list', 'table', 'code', 'other')
  ),
  section_order INT NOT NULL CHECK (section_order >= 0),
  confidence NUMERIC(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, section_order)
);

-- Create indexes for section queries
CREATE INDEX idx_document_sections_document_id ON public.document_sections(document_id);
CREATE INDEX idx_document_sections_type ON public.document_sections(section_type);

-- Add full-text search index for content
CREATE INDEX idx_document_sections_content_fts ON public.document_sections 
  USING GIN(to_tsvector('english', content));

-- document_ingestion_queue: Track document processing status
CREATE TABLE IF NOT EXISTS public.document_ingestion_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents_raw(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'parsing', 'extracting_entities', 'building_graph', 'completed', 'failed')
  ),
  current_stage VARCHAR(50),
  progress_percentage INT CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  error_message TEXT,
  attempts INT DEFAULT 0 CHECK (attempts >= 0),
  max_attempts INT DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for queue management
CREATE INDEX idx_ingestion_queue_status ON public.document_ingestion_queue(status);
CREATE INDEX idx_ingestion_queue_document_id ON public.document_ingestion_queue(document_id);

-- Add audit triggers
CREATE OR REPLACE FUNCTION update_documents_raw_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_raw_update_timestamp
BEFORE UPDATE ON public.documents_raw
FOR EACH ROW
EXECUTE FUNCTION update_documents_raw_timestamp();

CREATE OR REPLACE FUNCTION update_ingestion_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ingestion_queue_update_timestamp
BEFORE UPDATE ON public.document_ingestion_queue
FOR EACH ROW
EXECUTE FUNCTION update_ingestion_queue_timestamp();

-- Add comments for documentation
COMMENT ON TABLE public.documents_raw IS 'Stores raw parsed document content and metadata';
COMMENT ON TABLE public.document_sections IS 'Stores segmented document sections for entity extraction and full-text search';
COMMENT ON TABLE public.document_ingestion_queue IS 'Tracks document processing pipeline status';

COMMENT ON COLUMN public.documents_raw.parsing_confidence IS 'Confidence score (0-1) of parsing accuracy';
COMMENT ON COLUMN public.documents_raw.metadata IS 'JSON metadata: author, created_date, modified_date, title, version, etc.';

COMMIT;
