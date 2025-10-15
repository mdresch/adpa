-- Context Retrieval Database Schema
-- Creates tables for semantic search, embeddings, and relevance scoring

-- Search Index Table
CREATE TABLE IF NOT EXISTS search_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    source VARCHAR(100) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    embeddings JSONB,
    keywords TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    relevance_score DECIMAL(3,2) DEFAULT 0.0 CHECK (relevance_score >= 0 AND relevance_score <= 1),
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);

-- Embedding Cache Table
CREATE TABLE IF NOT EXISTS embedding_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_hash VARCHAR(64) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    embeddings JSONB NOT NULL,
    model VARCHAR(100) NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Search History Table
CREATE TABLE IF NOT EXISTS search_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    context_types JSONB DEFAULT '[]',
    filters JSONB DEFAULT '{}',
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    results_count INTEGER DEFAULT 0,
    processing_time INTEGER DEFAULT 0,
    search_strategy VARCHAR(20) DEFAULT 'hybrid',
    relevance_threshold DECIMAL(3,2) DEFAULT 0.1,
    cache_hit BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Relevance Feedback Table
CREATE TABLE IF NOT EXISTS relevance_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relevance_score DECIMAL(3,2) NOT NULL CHECK (relevance_score >= 0 AND relevance_score <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(result_id, user_id)
);

-- Source Authority Table
CREATE TABLE IF NOT EXISTS source_authority (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(100) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    authority_score DECIMAL(3,2) DEFAULT 0.5 CHECK (authority_score >= 0 AND authority_score <= 1),
    authority_type VARCHAR(50) DEFAULT 'user_generated',
    verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'flagged')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, source_id)
);

-- User Search Preferences Table
CREATE TABLE IF NOT EXISTS user_search_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_frameworks TEXT[] DEFAULT '{}',
    preferred_categories TEXT[] DEFAULT '{}',
    preferred_authors TEXT[] DEFAULT '{}',
    preferred_content_types TEXT[] DEFAULT '{}',
    search_strategy_preference VARCHAR(20) DEFAULT 'hybrid',
    relevance_threshold DECIMAL(3,2) DEFAULT 0.3,
    max_results INTEGER DEFAULT 20,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Query Analytics Table
CREATE TABLE IF NOT EXISTS query_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query TEXT NOT NULL,
    query_hash VARCHAR(64) NOT NULL,
    frequency INTEGER DEFAULT 1,
    average_relevance DECIMAL(3,2) DEFAULT 0.0,
    average_processing_time INTEGER DEFAULT 0,
    success_rate DECIMAL(3,2) DEFAULT 1.0,
    last_searched TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(query_hash)
);

-- Context Retrieval Metrics Table
CREATE TABLE IF NOT EXISTS context_retrieval_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_date DATE NOT NULL,
    total_queries INTEGER DEFAULT 0,
    successful_queries INTEGER DEFAULT 0,
    failed_queries INTEGER DEFAULT 0,
    average_response_time INTEGER DEFAULT 0,
    cache_hit_rate DECIMAL(5,2) DEFAULT 0.0,
    average_relevance_score DECIMAL(3,2) DEFAULT 0.0,
    semantic_search_usage INTEGER DEFAULT 0,
    keyword_search_usage INTEGER DEFAULT 0,
    hybrid_search_usage INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_index_type ON search_index(type);
CREATE INDEX IF NOT EXISTS idx_search_index_source ON search_index(source);
CREATE INDEX IF NOT EXISTS idx_search_index_keywords ON search_index USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_search_index_metadata ON search_index USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_search_index_relevance_score ON search_index(relevance_score);
CREATE INDEX IF NOT EXISTS idx_search_index_created_at ON search_index(created_at);
CREATE INDEX IF NOT EXISTS idx_search_index_access_count ON search_index(access_count);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_content_hash ON embedding_cache(content_hash);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_model ON embedding_cache(model);
CREATE INDEX IF NOT EXISTS idx_embedding_cache_expires_at ON embedding_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_project_id ON search_history(project_id);
CREATE INDEX IF NOT EXISTS idx_search_history_template_id ON search_history(template_id);
CREATE INDEX IF NOT EXISTS idx_search_history_created_at ON search_history(created_at);
CREATE INDEX IF NOT EXISTS idx_search_history_search_strategy ON search_history(search_strategy);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON search_history USING GIN(to_tsvector('english', query));

CREATE INDEX IF NOT EXISTS idx_relevance_feedback_result_id ON relevance_feedback(result_id);
CREATE INDEX IF NOT EXISTS idx_relevance_feedback_user_id ON relevance_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_relevance_feedback_relevance_score ON relevance_feedback(relevance_score);

CREATE INDEX IF NOT EXISTS idx_source_authority_source ON source_authority(source);
CREATE INDEX IF NOT EXISTS idx_source_authority_authority_score ON source_authority(authority_score);
CREATE INDEX IF NOT EXISTS idx_source_authority_verification_status ON source_authority(verification_status);

CREATE INDEX IF NOT EXISTS idx_user_search_preferences_user_id ON user_search_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_search_preferences_frameworks ON user_search_preferences USING GIN(preferred_frameworks);
CREATE INDEX IF NOT EXISTS idx_user_search_preferences_categories ON user_search_preferences USING GIN(preferred_categories);

CREATE INDEX IF NOT EXISTS idx_query_analytics_query_hash ON query_analytics(query_hash);
CREATE INDEX IF NOT EXISTS idx_query_analytics_frequency ON query_analytics(frequency);
CREATE INDEX IF NOT EXISTS idx_query_analytics_last_searched ON query_analytics(last_searched);

CREATE INDEX IF NOT EXISTS idx_context_retrieval_metrics_metric_date ON context_retrieval_metrics(metric_date);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_search_index_updated_at BEFORE UPDATE ON search_index FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_relevance_feedback_updated_at BEFORE UPDATE ON relevance_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_source_authority_updated_at BEFORE UPDATE ON source_authority FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_search_preferences_updated_at BEFORE UPDATE ON user_search_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to update query analytics
CREATE OR REPLACE FUNCTION update_query_analytics(p_query TEXT, p_relevance_score DECIMAL, p_processing_time INTEGER, p_success BOOLEAN)
RETURNS VOID AS $$
DECLARE
    query_hash_val VARCHAR(64);
BEGIN
    -- Generate hash for the query
    query_hash_val := encode(digest(p_query, 'sha256'), 'hex');
    
    -- Update or insert query analytics
    INSERT INTO query_analytics (query, query_hash, frequency, average_relevance, average_processing_time, success_rate, last_searched)
    VALUES (p_query, query_hash_val, 1, p_relevance_score, p_processing_time, CASE WHEN p_success THEN 1.0 ELSE 0.0 END, CURRENT_TIMESTAMP)
    ON CONFLICT (query_hash) DO UPDATE SET
        frequency = query_analytics.frequency + 1,
        average_relevance = (query_analytics.average_relevance * query_analytics.frequency + p_relevance_score) / (query_analytics.frequency + 1),
        average_processing_time = (query_analytics.average_processing_time * query_analytics.frequency + p_processing_time) / (query_analytics.frequency + 1),
        success_rate = (query_analytics.success_rate * query_analytics.frequency + CASE WHEN p_success THEN 1.0 ELSE 0.0 END) / (query_analytics.frequency + 1),
        last_searched = CURRENT_TIMESTAMP;
END;
$$ LANGUAGE plpgsql;

-- Create function to update daily metrics
CREATE OR REPLACE FUNCTION update_daily_metrics()
RETURNS VOID AS $$
DECLARE
    metric_date_val DATE;
    total_queries_val INTEGER;
    successful_queries_val INTEGER;
    failed_queries_val INTEGER;
    avg_response_time_val INTEGER;
    cache_hit_rate_val DECIMAL;
    avg_relevance_val DECIMAL;
    semantic_usage_val INTEGER;
    keyword_usage_val INTEGER;
    hybrid_usage_val INTEGER;
BEGIN
    metric_date_val := CURRENT_DATE;
    
    -- Calculate metrics for today
    SELECT 
        COUNT(*),
        COUNT(CASE WHEN error IS NULL THEN 1 END),
        COUNT(CASE WHEN error IS NOT NULL THEN 1 END),
        COALESCE(AVG(processing_time), 0),
        COALESCE(AVG(CASE WHEN cache_hit THEN 1.0 ELSE 0.0 END), 0),
        COALESCE(AVG(relevance_threshold), 0),
        COUNT(CASE WHEN search_strategy = 'semantic' THEN 1 END),
        COUNT(CASE WHEN search_strategy = 'keyword' THEN 1 END),
        COUNT(CASE WHEN search_strategy = 'hybrid' THEN 1 END)
    INTO 
        total_queries_val,
        successful_queries_val,
        failed_queries_val,
        avg_response_time_val,
        cache_hit_rate_val,
        avg_relevance_val,
        semantic_usage_val,
        keyword_usage_val,
        hybrid_usage_val
    FROM search_history
    WHERE DATE(created_at) = metric_date_val;
    
    -- Insert or update daily metrics
    INSERT INTO context_retrieval_metrics (
        metric_date, total_queries, successful_queries, failed_queries,
        average_response_time, cache_hit_rate, average_relevance_score,
        semantic_search_usage, keyword_search_usage, hybrid_search_usage
    ) VALUES (
        metric_date_val, total_queries_val, successful_queries_val, failed_queries_val,
        avg_response_time_val, cache_hit_rate_val, avg_relevance_val,
        semantic_usage_val, keyword_usage_val, hybrid_usage_val
    )
    ON CONFLICT (metric_date) DO UPDATE SET
        total_queries = EXCLUDED.total_queries,
        successful_queries = EXCLUDED.successful_queries,
        failed_queries = EXCLUDED.failed_queries,
        average_response_time = EXCLUDED.average_response_time,
        cache_hit_rate = EXCLUDED.cache_hit_rate,
        average_relevance_score = EXCLUDED.average_relevance_score,
        semantic_search_usage = EXCLUDED.semantic_search_usage,
        keyword_search_usage = EXCLUDED.keyword_search_usage,
        hybrid_search_usage = EXCLUDED.hybrid_search_usage;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update query analytics on search
CREATE OR REPLACE FUNCTION trigger_update_query_analytics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM update_query_analytics(
        NEW.query,
        NEW.relevance_threshold,
        NEW.processing_time,
        NEW.error IS NULL
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_query_analytics_trigger
    AFTER INSERT ON search_history
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_query_analytics();

-- Add comments for documentation
COMMENT ON TABLE search_index IS 'Search index for semantic and keyword search with embeddings and metadata';
COMMENT ON TABLE embedding_cache IS 'Cache for OpenAI embeddings to improve performance';
COMMENT ON TABLE search_history IS 'History of all search queries for analytics and optimization';
COMMENT ON TABLE relevance_feedback IS 'User feedback on search result relevance for machine learning';
COMMENT ON TABLE source_authority IS 'Authority scores for different content sources';
COMMENT ON TABLE user_search_preferences IS 'User-specific search preferences and settings';
COMMENT ON TABLE query_analytics IS 'Analytics on query patterns and performance';
COMMENT ON TABLE context_retrieval_metrics IS 'Daily aggregated metrics for context retrieval performance';

-- Insert default source authority scores
INSERT INTO source_authority (source, source_id, authority_score, authority_type, verification_status) VALUES
('official_documentation', 'system', 1.0, 'official', 'verified'),
('best_practices', 'system', 0.9, 'expert', 'verified'),
('expert_opinion', 'system', 0.8, 'expert', 'verified'),
('user_generated', 'system', 0.7, 'community', 'unverified'),
('external_api', 'system', 0.8, 'external', 'unverified'),
('database_query', 'system', 0.6, 'system', 'verified'),
('community_content', 'system', 0.5, 'community', 'unverified')
ON CONFLICT (source, source_id) DO NOTHING;
