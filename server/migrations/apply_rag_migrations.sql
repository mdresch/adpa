-- Apply RAG migrations
-- This version drops and recreates to avoid conflicts

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to document_chunks if it doesn't exist
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

-- Drop existing function if it exists (to avoid conflicts)
DROP FUNCTION IF EXISTS match_document_chunks(vector, float, integer, jsonb);
DROP FUNCTION IF EXISTS match_document_chunks;

-- Create the vector similarity search function
CREATE FUNCTION match_document_chunks(
    query_embedding vector(1024),
    similarity_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5,
    filter jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    id uuid, 
    document_id uuid,
    content text,
    chunk_index integer,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.chunk_index,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE 
        dc.embedding IS NOT NULL
        AND (1 - (dc.embedding <=> query_embedding)) >= similarity_threshold
        AND (
            filter = '{}'::jsonb
            OR dc.metadata @> filter
        )
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Add comments
COMMENT ON COLUMN document_chunks.embedding IS 'Vector embedding for semantic search (1024 dimensions from Voyage AI)';
COMMENT ON FUNCTION match_document_chunks IS 'Find similar document chunks using cosine similarity with pgvector';

-- Verify installation
SELECT '✅ pgvector extension enabled' AS status
WHERE EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector');

SELECT 
    '✅ embedding column exists' AS status,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'document_chunks' AND column_name = 'embedding';

SELECT 
    '✅ match_document_chunks function exists' AS status
WHERE EXISTS (
    SELECT 1 
    FROM information_schema.routines 
    WHERE routine_name = 'match_document_chunks'
);
