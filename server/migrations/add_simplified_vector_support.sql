-- Simplified Vector Similarity Support for PostgreSQL
-- Uses JSONB arrays for embeddings storage with custom similarity functions

-- Create function to calculate cosine similarity between JSONB arrays
CREATE OR REPLACE FUNCTION cosine_similarity_jsonb(embeddings1 jsonb, embeddings2 jsonb)
RETURNS float AS $$
DECLARE
    dot_product float := 0;
    magnitude1 float := 0;
    magnitude2 float := 0;
    val1 float;
    val2 float;
    i integer;
BEGIN
    -- Check if both embeddings have the same length
    IF jsonb_array_length(embeddings1) != jsonb_array_length(embeddings2) THEN
        RETURN 0;
    END IF;
    
    -- Calculate dot product and magnitudes
    FOR i IN 0..jsonb_array_length(embeddings1) - 1 LOOP
        val1 := (embeddings1->i)::float;
        val2 := (embeddings2->i)::float;
        
        dot_product := dot_product + (val1 * val2);
        magnitude1 := magnitude1 + (val1 * val1);
        magnitude2 := magnitude2 + (val2 * val2);
    END LOOP;
    
    magnitude1 := sqrt(magnitude1);
    magnitude2 := sqrt(magnitude2);
    
    IF magnitude1 = 0 OR magnitude2 = 0 THEN
        RETURN 0;
    END IF;
    
    RETURN dot_product / (magnitude1 * magnitude2);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to calculate euclidean distance between JSONB arrays
CREATE OR REPLACE FUNCTION euclidean_distance_jsonb(embeddings1 jsonb, embeddings2 jsonb)
RETURNS float AS $$
DECLARE
    distance float := 0;
    val1 float;
    val2 float;
    i integer;
BEGIN
    -- Check if both embeddings have the same length
    IF jsonb_array_length(embeddings1) != jsonb_array_length(embeddings2) THEN
        RETURN 999999; -- Large distance for mismatched dimensions
    END IF;
    
    -- Calculate euclidean distance
    FOR i IN 0..jsonb_array_length(embeddings1) - 1 LOOP
        val1 := (embeddings1->i)::float;
        val2 := (embeddings2->i)::float;
        
        distance := distance + ((val1 - val2) * (val1 - val2));
    END LOOP;
    
    RETURN sqrt(distance);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function to find similar vectors using JSONB embeddings
CREATE OR REPLACE FUNCTION find_similar_vectors_jsonb(
    query_embeddings jsonb,
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
        cosine_similarity_jsonb(si.embeddings, query_embeddings) as similarity,
        si.source,
        si.source_id,
        si.metadata
    FROM search_index si
    WHERE si.embeddings IS NOT NULL
    AND jsonb_array_length(si.embeddings) = jsonb_array_length(query_embeddings)
    AND cosine_similarity_jsonb(si.embeddings, query_embeddings) >= similarity_threshold
    ORDER BY cosine_similarity_jsonb(si.embeddings, query_embeddings) DESC
    LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to update embeddings in search index
CREATE OR REPLACE FUNCTION update_search_index_embeddings_jsonb(
    p_content text,
    p_type text,
    p_source text,
    p_source_id text,
    p_embeddings jsonb,
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

-- Create function to get embedding statistics
CREATE OR REPLACE FUNCTION get_embedding_statistics_jsonb()
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
        AVG(jsonb_array_length(embeddings)) as average_dimensions,
        SUM(octet_length(embeddings::text)) as total_memory_usage,
        (SELECT AVG(access_count) FROM embedding_cache WHERE expires_at > NOW()) as cache_hit_rate,
        (SELECT AVG(relevance_score) FROM search_index WHERE relevance_score > 0) as average_similarity
    FROM search_index
    WHERE embeddings IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old embeddings
CREATE OR REPLACE FUNCTION cleanup_old_embeddings_jsonb(
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

-- Create views for common similarity queries
CREATE OR REPLACE VIEW high_similarity_pairs_jsonb AS
SELECT 
    s1.id as id1,
    s2.id as id2,
    s1.content as content1,
    s2.content as content2,
    cosine_similarity_jsonb(s1.embeddings, s2.embeddings) as similarity,
    s1.source as source1,
    s2.source as source2
FROM search_index s1
CROSS JOIN search_index s2
WHERE s1.id < s2.id
AND s1.embeddings IS NOT NULL
AND s2.embeddings IS NOT NULL
AND jsonb_array_length(s1.embeddings) = jsonb_array_length(s2.embeddings)
AND cosine_similarity_jsonb(s1.embeddings, s2.embeddings) > 0.8;

-- Create view for embedding quality metrics
CREATE OR REPLACE VIEW embedding_quality_metrics_jsonb AS
SELECT 
    type,
    COUNT(*) as total_embeddings,
    AVG(jsonb_array_length(embeddings)) as avg_dimensions,
    AVG(relevance_score) as avg_relevance,
    AVG(access_count) as avg_access_count,
    MAX(created_at) as latest_embedding,
    MIN(created_at) as earliest_embedding
FROM search_index
WHERE embeddings IS NOT NULL
GROUP BY type;

-- Create indexes for JSONB embeddings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_gin 
ON search_index USING GIN (embeddings);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_btree 
ON search_index USING BTREE ((embeddings->0));

-- Create partial indexes for better performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_search_index_embeddings_with_type 
ON search_index USING GIN (embeddings)
WHERE embeddings IS NOT NULL;

-- Add comments for documentation
COMMENT ON FUNCTION cosine_similarity_jsonb(jsonb, jsonb) IS 'Calculate cosine similarity between two JSONB embedding arrays';
COMMENT ON FUNCTION euclidean_distance_jsonb(jsonb, jsonb) IS 'Calculate euclidean distance between two JSONB embedding arrays';
COMMENT ON FUNCTION find_similar_vectors_jsonb(jsonb, float, integer) IS 'Find similar vectors using cosine similarity with JSONB embeddings';
COMMENT ON FUNCTION update_search_index_embeddings_jsonb(text, text, text, text, jsonb, text[], jsonb) IS 'Update or insert JSONB embeddings in search index';
COMMENT ON FUNCTION get_embedding_statistics_jsonb() IS 'Get statistics about JSONB embeddings in the system';
COMMENT ON FUNCTION cleanup_old_embeddings_jsonb(integer) IS 'Clean up old unused JSONB embeddings';

COMMENT ON VIEW high_similarity_pairs_jsonb IS 'View showing pairs of content with high similarity scores using JSONB embeddings';
COMMENT ON VIEW embedding_quality_metrics_jsonb IS 'View showing quality metrics for JSONB embeddings by type';
