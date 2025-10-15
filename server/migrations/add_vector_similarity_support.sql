-- Vector Similarity Support for PostgreSQL
-- Adds pgvector extension and vector similarity functions for OpenAI embeddings

-- Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create vector similarity functions
CREATE OR REPLACE FUNCTION cosine_similarity(vector1 vector, vector2 vector)
RETURNS float AS $$
BEGIN
    RETURN 1 - (vector1 <=> vector2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION euclidean_distance(vector1 vector, vector2 vector)
RETURNS float AS $$
BEGIN
    RETURN vector1 <-> vector2;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION dot_product(vector1 vector, vector2 vector)
RETURNS float AS $$
BEGIN
    RETURN vector1 <#> vector2;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to normalize vectors
CREATE OR REPLACE FUNCTION normalize_vector(input_vector vector)
RETURNS vector AS $$
DECLARE
    magnitude float;
BEGIN
    magnitude := sqrt(input_vector <#> input_vector);
    IF magnitude = 0 THEN
        RETURN input_vector;
    END IF;
    RETURN input_vector / magnitude;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate similarity with threshold
CREATE OR REPLACE FUNCTION find_similar_vectors(
    query_vector vector,
    similarity_threshold float DEFAULT 0.7,
    result_limit integer DEFAULT 10
)
RETURNS TABLE(
    id uuid,
    content text,
    similarity float,
    source text,
    source_id text,
    metadata jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        si.id,
        si.content,
        cosine_similarity(si.embeddings, query_vector) as similarity,
        si.source,
        si.source_id,
        si.metadata
    FROM search_index si
    WHERE si.embeddings IS NOT NULL
    AND cosine_similarity(si.embeddings, query_vector) >= similarity_threshold
    ORDER BY si.embeddings <=> query_vector
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to update embeddings in search index
CREATE OR REPLACE FUNCTION update_search_index_embeddings(
    p_content text,
    p_type text,
    p_source text,
    p_source_id text,
    p_embeddings vector,
    p_keywords text[] DEFAULT '{}',
    p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
    result_id uuid;
BEGIN
    INSERT INTO search_index (
        content, type, source, source_id, embeddings, keywords, metadata
    ) VALUES (
        p_content, p_type, p_source, p_source_id, p_embeddings, p_keywords, p_metadata
    )
    ON CONFLICT (source, source_id) DO UPDATE SET
        content = EXCLUDED.content,
        type = EXCLUDED.type,
        embeddings = EXCLUDED.embeddings,
        keywords = EXCLUDED.keywords,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO result_id;
    
    RETURN result_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to batch update embeddings
CREATE OR REPLACE FUNCTION batch_update_embeddings(
    embeddings_data jsonb
)
RETURNS integer AS $$
DECLARE
    item jsonb;
    updated_count integer := 0;
BEGIN
    FOR item IN SELECT jsonb_array_elements(embeddings_data)
    LOOP
        PERFORM update_search_index_embeddings(
            (item->>'content')::text,
            (item->>'type')::text,
            (item->>'source')::text,
            (item->>'source_id')::text,
            (item->>'embeddings')::vector,
            (item->>'keywords')::text[],
            (item->>'metadata')::jsonb
        );
        updated_count := updated_count + 1;
    END LOOP;
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_statistics()
RETURNS TABLE(
    total_embeddings integer,
    average_dimensions float,
    total_memory_usage bigint,
    cache_hit_rate float,
    average_similarity float
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::integer as total_embeddings,
        AVG(array_length(embeddings::float[], 1)) as average_dimensions,
        SUM(octet_length(embeddings::text)) as total_memory_usage,
        (SELECT AVG(access_count) FROM embedding_cache WHERE expires_at > NOW()) as cache_hit_rate,
        (SELECT AVG(relevance_score) FROM search_index WHERE relevance_score > 0) as average_similarity
    FROM search_index
    WHERE embeddings IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old embeddings
CREATE OR REPLACE FUNCTION cleanup_old_embeddings(
    days_old integer DEFAULT 30
)
RETURNS integer AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM search_index 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_old
    AND access_count = 0;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to optimize embeddings for similarity search
CREATE OR REPLACE FUNCTION optimize_embeddings_for_search()
RETURNS void AS $$
BEGIN
    -- Create indexes for vector similarity search
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_cosine 
    ON search_index USING ivfflat (embeddings vector_cosine_ops) 
    WITH (lists = 100);
    
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_l2 
    ON search_index USING ivfflat (embeddings vector_l2_ops) 
    WITH (lists = 100);
    
    -- Update table statistics
    ANALYZE search_index;
END;
$$ LANGUAGE plpgsql;

-- Create function to find similar content by text
CREATE OR REPLACE FUNCTION find_similar_content_by_text(
    query_text text,
    similarity_threshold float DEFAULT 0.7,
    result_limit integer DEFAULT 10,
    content_types text[] DEFAULT NULL
)
RETURNS TABLE(
    id uuid,
    content text,
    similarity float,
    source text,
    source_id text,
    type text,
    metadata jsonb
) AS $$
DECLARE
    query_embeddings vector;
BEGIN
    -- This would typically call the OpenAI API to get embeddings
    -- For now, we'll use a placeholder that would be replaced by the application
    -- query_embeddings := get_openai_embeddings(query_text);
    
    -- Return empty result for now - this will be implemented by the application
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create views for common similarity queries
CREATE OR REPLACE VIEW high_similarity_pairs AS
SELECT 
    s1.id as id1,
    s2.id as id2,
    s1.content as content1,
    s2.content as content2,
    cosine_similarity(s1.embeddings, s2.embeddings) as similarity,
    s1.source as source1,
    s2.source as source2
FROM search_index s1
CROSS JOIN search_index s2
WHERE s1.id < s2.id
AND s1.embeddings IS NOT NULL
AND s2.embeddings IS NOT NULL
AND cosine_similarity(s1.embeddings, s2.embeddings) > 0.8;

-- Create view for embedding quality metrics
CREATE OR REPLACE VIEW embedding_quality_metrics AS
SELECT 
    type,
    COUNT(*) as total_embeddings,
    AVG(array_length(embeddings::float[], 1)) as avg_dimensions,
    AVG(relevance_score) as avg_relevance,
    AVG(access_count) as avg_access_count,
    MAX(created_at) as latest_embedding,
    MIN(created_at) as earliest_embedding
FROM search_index
WHERE embeddings IS NOT NULL
GROUP BY type;

-- Create indexes for vector operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_vector 
ON search_index USING ivfflat (embeddings vector_cosine_ops) 
WITH (lists = 100);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_l2 
ON search_index USING ivfflat (embeddings vector_l2_ops) 
WITH (lists = 100);

-- Create partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_with_type 
ON search_index USING ivfflat (embeddings vector_cosine_ops) 
WITH (lists = 100)
WHERE embeddings IS NOT NULL;

-- Add comments for documentation
COMMENT ON FUNCTION cosine_similarity(vector, vector) IS 'Calculate cosine similarity between two vectors';
COMMENT ON FUNCTION euclidean_distance(vector, vector) IS 'Calculate euclidean distance between two vectors';
COMMENT ON FUNCTION dot_product(vector, vector) IS 'Calculate dot product between two vectors';
COMMENT ON FUNCTION normalize_vector(vector) IS 'Normalize a vector to unit length';
COMMENT ON FUNCTION find_similar_vectors(vector, float, integer) IS 'Find similar vectors using cosine similarity';
COMMENT ON FUNCTION update_search_index_embeddings(text, text, text, text, vector, text[], jsonb) IS 'Update or insert embeddings in search index';
COMMENT ON FUNCTION batch_update_embeddings(jsonb) IS 'Batch update multiple embeddings';
COMMENT ON FUNCTION get_embedding_statistics() IS 'Get statistics about embeddings in the system';
COMMENT ON FUNCTION cleanup_old_embeddings(integer) IS 'Clean up old unused embeddings';
COMMENT ON FUNCTION optimize_embeddings_for_search() IS 'Optimize database for vector similarity search';
COMMENT ON FUNCTION find_similar_content_by_text(text, float, integer, text[]) IS 'Find similar content by text query';

COMMENT ON VIEW high_similarity_pairs IS 'View showing pairs of content with high similarity scores';
COMMENT ON VIEW embedding_quality_metrics IS 'View showing quality metrics for embeddings by type';
