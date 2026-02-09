-- Create documents_raw table for RAG ingestion
-- This table stores the raw documents before they are chunked and embedded

-- Enable pgcrypto extension for UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create the documents_raw table
CREATE TABLE IF NOT EXISTS public.documents_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_raw_created_at 
ON public.documents_raw(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_documents_raw_metadata 
ON public.documents_raw USING GIN(metadata);

-- Add comments for documentation
COMMENT ON TABLE public.documents_raw IS 'Stores raw documents for RAG ingestion before chunking and embedding';
COMMENT ON COLUMN public.documents_raw.id IS 'Unique identifier for the document';
COMMENT ON COLUMN public.documents_raw.title IS 'Document title';
COMMENT ON COLUMN public.documents_raw.content IS 'Full document content (will be chunked for embeddings)';
COMMENT ON COLUMN public.documents_raw.metadata IS 'Additional metadata (source, tags, etc.)';
COMMENT ON COLUMN public.documents_raw.created_at IS 'Timestamp when document was ingested';

-- Grant permissions (adjust as needed for your security model)
-- GRANT SELECT, INSERT, UPDATE ON public.documents_raw TO authenticated;
-- GRANT SELECT, INSERT, UPDATE ON public.documents_raw TO service_role;

SELECT 'documents_raw table created successfully' AS status;
