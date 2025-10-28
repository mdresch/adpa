-- Migration: Create document_chunks table for RAG context
-- Purpose: Store markdown-aware chunks, embeddings (JSONB), and metadata

CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  template_id UUID,
  chunk_index INTEGER NOT NULL,
  title TEXT,
  content TEXT NOT NULL,
  content_tokens INTEGER DEFAULT 0,
  embeddings JSONB,
  keywords TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_project ON document_chunks(project_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_template ON document_chunks(template_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_created_at ON document_chunks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_chunks_keywords ON document_chunks USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_document_chunks_metadata ON document_chunks USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_document_chunks_tsv ON document_chunks USING GIN (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')));

-- Trigger to maintain updated_at
CREATE OR REPLACE FUNCTION set_document_chunks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_chunks_updated_at ON document_chunks;
CREATE TRIGGER trg_document_chunks_updated_at
BEFORE UPDATE ON document_chunks
FOR EACH ROW EXECUTE FUNCTION set_document_chunks_updated_at();


