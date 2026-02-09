-- Create documents_vectors table with pgvector extension
-- This is a more mature alternative to Vector Buckets (which is in alpha)

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vectors table
CREATE TABLE IF NOT EXISTS documents_vectors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id uuid REFERENCES documents_raw(id) ON DELETE CASCADE,
    chunk_index integer NOT NULL,
    embedding vector(1024), -- Voyage AI voyage-2 produces 1024-dim vectors
    content text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    UNIQUE(document_id, chunk_index)
);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS documents_vectors_embedding_idx 
ON documents_vectors 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index for document_id lookups
CREATE INDEX IF NOT EXISTS documents_vectors_document_id_idx 
ON documents_vectors(document_id);

-- Verify the table
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'documents_vectors' 
ORDER BY ordinal_position;
