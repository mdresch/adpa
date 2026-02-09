-- Add pgvector embedding column to document_chunks table
-- The table currently has 'embeddings JSONB' but we need 'embedding vector(1024)'

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'document_chunks'
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE document_chunks
        ADD COLUMN embedding vector(1024);
    END IF;
END $$;

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_cosine
ON document_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add comment
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding for semantic search (1024 dimensions from Voyage AI)';
