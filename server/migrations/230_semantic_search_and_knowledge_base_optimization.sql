-- Migration: Semantic Search and Knowledge Base Optimization
-- Purpose: Add embedding support for semantic search and enhance knowledge base with comprehensive strategic documents
-- Date: 2026-03-03

BEGIN;

-- ============================================================================
-- 1. ADD EMBEDDINGS SUPPORT TO KNOWLEDGE_BASE_ENTRIES
-- ============================================================================

-- Check if embedding column exists, if not add it
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_base_entries' 
        AND column_name = 'embedding'
    ) THEN
        ALTER TABLE knowledge_base_entries 
        ADD COLUMN embedding vector(1024); -- Voyage AI 'voyage-4' uses 1024 dimensions
        
        CREATE INDEX IF NOT EXISTS idx_kb_entries_embedding 
        ON knowledge_base_entries USING ivfflat (embedding vector_cosine_ops)
        WITH (lists = 100);
        
        RAISE NOTICE 'Added embedding column and index to knowledge_base_entries';
    END IF;
END $$;

-- Check if embedding_model column exists, if not add it
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_base_entries' 
        AND column_name = 'embedding_model'
    ) THEN
        ALTER TABLE knowledge_base_entries 
        ADD COLUMN embedding_model VARCHAR(50) DEFAULT 'voyage-4';
        
        RAISE NOTICE 'Added embedding_model column to knowledge_base_entries';
    END IF;
END $$;

-- Check if embedding_generated_at column exists, if not add it
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_base_entries' 
        AND column_name = 'embedding_generated_at'
    ) THEN
        ALTER TABLE knowledge_base_entries 
        ADD COLUMN embedding_generated_at TIMESTAMP;
        
        RAISE NOTICE 'Added embedding_generated_at column to knowledge_base_entries';
    END IF;
END $$;

-- ============================================================================
-- 2. ADD SEMANTIC SEARCH METADATA COLUMNS
-- ============================================================================

-- Add semantic_relevance_score for better ranking
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'knowledge_base_entries' 
        AND column_name = 'semantic_keywords'
    ) THEN
        ALTER TABLE knowledge_base_entries 
        ADD COLUMN semantic_keywords TEXT[] DEFAULT '{}',  -- Additional semantic search terms
        ADD COLUMN applies_to_ai_initiatives BOOLEAN DEFAULT FALSE,  -- AI/Digital transformation specific
        ADD COLUMN applies_to_efficiency BOOLEAN DEFAULT FALSE,     -- Efficiency improvements
        ADD COLUMN applies_to_cost_reduction BOOLEAN DEFAULT FALSE, -- Cost reduction
        ADD COLUMN applies_to_risk_mitigation BOOLEAN DEFAULT FALSE; -- Risk mitigation
        
        RAISE NOTICE 'Added semantic metadata columns to knowledge_base_entries';
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE KNOWLEDGE BASE ENTRY RELATIONSHIPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_base_entry_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_entry_id UUID NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
    target_entry_id UUID NOT NULL REFERENCES knowledge_base_entries(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL CHECK (relationship_type IN (
        'related_to',
        'complements',
        'extends',
        'contradicts',
        'prerequisite_for',
        'builds_upon'
    )),
    strength DECIMAL(3,2) CHECK (strength >= 0 AND strength <= 1), -- 0-1 relationship strength
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_entry_id, target_entry_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_kb_relationships_source 
ON knowledge_base_entry_relationships(source_entry_id);
CREATE INDEX IF NOT EXISTS idx_kb_relationships_target 
ON knowledge_base_entry_relationships(target_entry_id);

-- ============================================================================
-- 4. VERIFY PGVECTOR EXTENSION
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 5. COMMIT TRANSACTION
-- ============================================================================

COMMIT;

-- ============================================================================
-- Notes for Service Layer Implementation
-- ============================================================================
-- 1. After applying this migration, embeddings must be generated via SemanticSearchService
-- 2. The semantic_search service should call generateKnowledgeBaseEmbeddings()
-- 3. Update calculateKeywordRelevance() to use vector similarity when embeddings exist
-- 4. Implement cosine similarity scoring: (1 + cosineDistance) / 2 to normalize to [0,1]
-- 5. Use hybrid scoring: 0.4 * keywordScore + 0.6 * semanticScore
-- 6. Create Neo4j relationships for knowledge base entries to enable graph traversal
-- 7. Index by semantic_keywords array for faster full-text search
-- 8. Add caching layer for embedding vectors to avoid repeated API calls
