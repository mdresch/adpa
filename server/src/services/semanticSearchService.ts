import { pool } from "../database/connection"
import { logger } from "../utils/logger"

const VOYAGE_MODEL = 'voyage-4' // 1024 dimensions

/**
 * SemanticSearchService
 * Manages embeddings generation and vector similarity computation for knowledge base
 * Integrates with Voyage AI for text embeddings
 */
export class SemanticSearchService {
    /**
     * Get Voyage API key dynamically (read at runtime, not at module load)
     */
    private getVoyageApiKey(): string | undefined {
        return process.env.VOYAGE_API_KEY
    }

    /**
     * Generate and store embeddings for knowledge base entries
     * Batches requests to Voyage API for efficiency
     */
    async generateKnowledgeBaseEmbeddings(entryIds?: string[]): Promise<{
        success: boolean;
        processedCount: number;
        failedCount: number;
        message: string;
    }> {
        const VOYAGE_API_KEY = this.getVoyageApiKey()
        if (!VOYAGE_API_KEY) {
            throw new Error("VOYAGE_API_KEY is not set")
        }

        try {
            // Fetch entries that need embeddings
            const query = entryIds && entryIds.length > 0
                ? `SELECT id, title, description, approach, context, results, semantic_keywords 
                   FROM knowledge_base_entries 
                   WHERE id = ANY($1) AND embedding IS NULL
                   ORDER BY created_at DESC`
                : `SELECT id, title, description, approach, context, results, semantic_keywords 
                   FROM knowledge_base_entries 
                   WHERE embedding IS NULL OR embedding_generated_at IS NULL
                   ORDER BY created_at DESC`

            const params = entryIds && entryIds.length > 0 ? [entryIds] : []
            const result = await pool.query(query, params)
            const entries = result.rows

            if (entries.length === 0) {
                logger.info('[SemanticSearchService] No entries need embeddings')
                return { success: true, processedCount: 0, failedCount: 0, message: 'No entries to process' }
            }

            logger.info(`[SemanticSearchService] Generating embeddings for ${entries.length} entries`)

            let processedCount = 0
            let failedCount = 0
            const batchSize = 10

            // Process in batches
            for (let i = 0; i < entries.length; i += batchSize) {
                const batch = entries.slice(i, i + batchSize)
                const batchTexts = batch.map(entry => this.buildEmbeddingText(entry))

                try {
                    // Call Voyage AI
                    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${VOYAGE_API_KEY}`
                        },
                        body: JSON.stringify({
                            input: batchTexts,
                            model: VOYAGE_MODEL
                        })
                    })

                    if (!response.ok) {
                        const errText = await response.text()
                        logger.error(`[SemanticSearchService] Voyage API Error: ${errText}`)
                        failedCount += batch.length
                        continue
                    }

                    const data = await response.json() as any

                    // Store embeddings in database
                    if (data.data && Array.isArray(data.data)) {
                        for (let j = 0; j < batch.length; j++) {
                            const entry = batch[j]
                            const embedding = data.data[j]?.embedding

                            if (!embedding) {
                                logger.warn(`[SemanticSearchService] No embedding for entry ${entry.id}`)
                                failedCount++
                                continue
                            }

                            try {
                                // Convert embedding array to pgvector format
                                const embeddingStr = `[${embedding.join(',')}]`
                                
                                await pool.query(`
                                    UPDATE knowledge_base_entries
                                    SET embedding = $1::vector,
                                        embedding_model = $2,
                                        embedding_generated_at = NOW()
                                    WHERE id = $3
                                `, [embeddingStr, VOYAGE_MODEL, entry.id])

                                processedCount++
                            } catch (updateErr: any) {
                                logger.error(`[SemanticSearchService] Failed to store embedding for ${entry.id}: ${updateErr.message}`)
                                failedCount++
                            }
                        }
                    } else {
                        failedCount += batch.length
                    }

                } catch (batchErr: any) {
                    logger.error(`[SemanticSearchService] Batch processing failed: ${batchErr.message}`)
                    failedCount += batch.length
                }

                // Small delay between batches to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100))
            }

            logger.info(`[SemanticSearchService] Embedding generation complete. Processed: ${processedCount}, Failed: ${failedCount}`)
            return {
                success: failedCount === 0,
                processedCount,
                failedCount,
                message: `Processed ${processedCount} entries, ${failedCount} failed`
            }

        } catch (error: any) {
            logger.error(`[SemanticSearchService] Embedding generation error: ${error.message}`)
            throw error
        }
    }

    /**
     * Build embedding text from knowledge base entry
     * Combines all searchable fields with proper weighting
     */
    private buildEmbeddingText(entry: any): string {
        const parts: string[] = []

        // Title (highest importance)
        if (entry.title) {
            parts.push(entry.title)
            parts.push(entry.title) // Repeat for weighting
        }

        // Semantic keywords (high importance)
        if (entry.semantic_keywords && Array.isArray(entry.semantic_keywords)) {
            parts.push(entry.semantic_keywords.join(' '))
        }

        // Description
        if (entry.description) {
            parts.push(entry.description)
        }

        // Context
        if (entry.context) {
            parts.push(entry.context)
        }

        // Approach
        if (entry.approach) {
            parts.push(entry.approach)
        }

        // Results
        if (entry.results) {
            parts.push(entry.results)
        }

        return parts.filter(p => p && p.trim()).join(' ')
    }

    /**
     * Calculate cosine distance between two vectors
     * Using simple implementation for now
     */
    private cosineSimilarity(vec1: number[], vec2: number[]): number {
        if (vec1.length !== vec2.length) {
            return 0
        }

        let dotProduct = 0
        let magnitude1 = 0
        let magnitude2 = 0

        for (let i = 0; i < vec1.length; i++) {
            dotProduct += vec1[i] * vec2[i]
            magnitude1 += vec1[i] * vec1[i]
            magnitude2 += vec2[i] * vec2[i]
        }

        const magnitudes = Math.sqrt(magnitude1) * Math.sqrt(magnitude2)
        if (magnitudes === 0) return 0

        return dotProduct / magnitudes
    }

    /**
     * Get semantic similarity score for a query against knowledge base
     * Uses pgvector similarity (cosine distance)
     */
    async getSemanticSimilarityScores(
        queryEmbedding: number[],
        limit: number = 10
    ): Promise<Array<{ id: string; title: string; similarity: number }>> {
        try {
            // Convert query embedding to pgvector format
            const embeddingStr = `[${queryEmbedding.join(',')}]`

            // Use pgvector cosine similarity operator <=>
            const result = await pool.query(`
                SELECT 
                    id,
                    title,
                    1 - (embedding <=> $1::vector) as similarity
                FROM knowledge_base_entries
                WHERE embedding IS NOT NULL
                ORDER BY embedding <=> $1::vector
                LIMIT $2
            `, [embeddingStr, limit])

            return result.rows.map(row => ({
                id: row.id,
                title: row.title,
                similarity: Math.max(0, row.similarity) // Ensure non-negative
            }))

        } catch (error: any) {
            logger.error(`[SemanticSearchService] Similarity query failed: ${error.message}`)
            return []
        }
    }

    /**
     * Check if semantic search is configured
     */
    private isConfigured(): boolean {
        return Boolean(this.getVoyageApiKey())
    }

    /**
     * Embed a query text using Voyage AI
     */
    async embedQuery(queryText: string): Promise<number[] | null> {
        const VOYAGE_API_KEY = this.getVoyageApiKey()
        logger.debug(`[SemanticSearchService.embedQuery] VOYAGE_API_KEY="${VOYAGE_API_KEY ? 'SET' : 'MISSING'}"`)
        
        if (!VOYAGE_API_KEY) {
            logger.warn('[SemanticSearchService] VOYAGE_API_KEY not configured; semantic search unavailable')
            return null
        }

        try {
            logger.info(`[SemanticSearchService.embedQuery] Calling Voyage API for query: "${queryText.substring(0, 50)}..."`)
            const response = await fetch('https://api.voyageai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${VOYAGE_API_KEY}`
                },
                body: JSON.stringify({
                    input: queryText,
                    model: VOYAGE_MODEL
                })
            })

            if (!response.ok) {
                const errText = await response.text()
                logger.error(`[SemanticSearchService] Query embedding failed: Status ${response.status}, ${errText}`)
                return null
            }

            const data = await response.json() as any
            const embedding = data.data?.[0]?.embedding || null
            logger.info(`[SemanticSearchService.embedQuery] Response received, embedding=${embedding ? 'SUCCESS (${embedding.length} dims)' : 'FAILED'}`)
            return embedding

        } catch (error: any) {
            logger.error(`[SemanticSearchService] Query embedding error: ${error.message}`)
            return null
        }
    }

    /**
     * Search knowledge base using semantic similarity
     * Returns entries with similarity scores
     */
    async semanticSearch(
        queryText: string,
        limit: number = 10
    ): Promise<Array<{
        id: string;
        title: string;
        description: string;
        semantic_score: number;
    }>> {
        const voyageKey = this.getVoyageApiKey()
        logger.info(`[SemanticSearchService] semanticSearch called with query="${queryText}", VOYAGE_API_KEY=${voyageKey ? 'SET' : 'MISSING'}`)
        
        if (!this.isConfigured()) {
            logger.warn('[SemanticSearchService] Semantic search not configured; skipping')
            return []
        }

        try {
            const queryEmbedding = await this.embedQuery(queryText)
            logger.info(`[SemanticSearchService] Query embedded: ${queryEmbedding ? 'SUCCESS' : 'FAILED'}, dim=${queryEmbedding?.length || 'N/A'}`)
            
            if (!queryEmbedding) {
                logger.warn('[SemanticSearchService] Failed to embed query; using keyword fallback')
                return []
            }

            const results = await this.getSemanticSimilarityScores(queryEmbedding, limit)
            logger.info(`[SemanticSearchService] Similarity search returned ${results.length} results`)

            // Fetch full details for top results
            if (results.length === 0) return []

            const ids = results.map(r => r.id)
            const fullResult = await pool.query(`
                SELECT id, title, description
                FROM knowledge_base_entries
                WHERE id = ANY($1)
            `, [ids])

            // Map back with similarity scores
            const entriesMap = new Map(fullResult.rows.map((r: any) => [r.id, r]))

            return results
                .filter(r => entriesMap.has(r.id))
                .map(r => ({
                    id: r.id,
                    title: r.title,
                    description: entriesMap.get(r.id).description,
                    semantic_score: r.similarity
                }))

        } catch (error: any) {
            logger.error(`[SemanticSearchService] Semantic search failed: ${error.message}`)
            return []
        }
    }

    /**
     * Ensure pgvector extension exists
     */
    async ensureVectorExtension(): Promise<void> {
        try {
            await pool.query('CREATE EXTENSION IF NOT EXISTS vector')
            logger.info('[SemanticSearchService] pgvector extension enabled')
        } catch (error: any) {
            logger.warn(`[SemanticSearchService] pgvector extension may not be available: ${error.message}`)
        }
    }
}

export const semanticSearchService = new SemanticSearchService()
