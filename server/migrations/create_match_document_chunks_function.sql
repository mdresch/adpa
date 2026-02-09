-- Create match_document_chunks function for vector similarity search
-- This function is used by the RAG service to find relevant chunks

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector similarity search function
CREATE OR REPLACE FUNCTION match_document_chunks(
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
        -- Apply filters if provided
        AND (
            filter = '{}'::jsonb
            OR dc.metadata @> filter
        )
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_document_chunks IS 'Find similar document chunks using cosine similarity with pgvector';
