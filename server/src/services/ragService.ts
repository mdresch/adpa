import { pool } from "../database/connection"
import { logger } from "../utils/logger"
import { isMongoRagEnabled, queryMongoForRag } from "./mongoRagService"

// Use global fetch (Node 18+) or fallback if needed, but avoid 'node-fetch' import if possible to prevent ESM/CJS issues
// If global.fetch is undefined, one might need to import it, but standard Node 18+ has it.

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_MODEL = 'voyage-4' // Latest Voyage AI model (1024 dimensions, 200M free tokens)

interface TextChunk {
    text: string;
    start: number;
    end: number;
}

export class RagService {

    /**
     * Log analytics data for RAG operations
     */
    private async logAnalytics(data: {
        operation_type: 'ingest' | 'query' | 'sync';
        document_id?: string;
        success: boolean;
        duration_ms?: number;
        chunks_processed?: number;
        vectors_created?: number;
        error_message?: string;
        error_type?: string;
        metadata?: any;
    }) {
        try {
            await pool.query(`
                INSERT INTO rag_analytics (
                    operation_type, document_id, success, duration_ms,
                    chunks_processed, vectors_created, error_message, error_type, metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
                data.operation_type,
                data.document_id || null,
                data.success,
                data.duration_ms || null,
                data.chunks_processed || null,
                data.vectors_created || null,
                data.error_message || null,
                data.error_type || null,
                JSON.stringify(data.metadata || {})
            ]);
        } catch (err: any) {
            // Don't fail the operation if analytics logging fails
            logger.error(`[RagService] Analytics logging failed: ${err.message}`);
        }
    }

    /**
     * Ingests a document by ID: fetches content, chunks it, embeds it, and stores in document_chunks.
     */
    async ingestDocument(documentId: string): Promise<{ success: boolean; chunks: number; message?: string }> {
        const startTime = Date.now();
        if (!VOYAGE_API_KEY) {
            throw new Error("VOYAGE_API_KEY is not set")
        }

        try {
            logger.info(`[RagService] Ingesting document ${documentId}`)

            // 1. Fetch document
            const docRes = await pool.query("SELECT content, metadata FROM documents WHERE id = $1", [documentId])
            if (docRes.rows.length === 0) {
                throw new Error("Document not found")
            }
            const document = docRes.rows[0]

            if (!document.content) {
                logger.warn(`[RagService] Document ${documentId} has no content`)
                return { success: true, chunks: 0, message: "No content" }
            }

            // 2. Chunk content matches verify-rag-flow doc length
            const chunks = this.splitTextInternal(document.content, 1000, 200)
            logger.info(`[RagService] Generated ${chunks.length} chunks`)

            // 3. Embed and Prepare
            const batchSize = 10
            const allVectors: any[] = []

            for (let i = 0; i < chunks.length; i += batchSize) {
                const batchChunks = chunks.slice(i, i + batchSize)
                const batchTexts = batchChunks.map(c => c.text)

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
                    throw new Error(`Voyage AI API Error: ${errText}`)
                }

                const data = await response.json() as any

                // Map to records
                data.data.forEach((item: any, index: number) => {
                    const chunkIndex = i + index
                    const chunk = batchChunks[index]
                    allVectors.push({
                        document_id: documentId,
                        content: chunk.text,
                        embedding: `[${item.embedding.join(',')}]`, // pgvector string format
                        chunk_index: chunkIndex,
                        metadata: {
                            source: 'rag-service-node',
                            start_char_idx: chunk.start,
                            end_char_idx: chunk.end
                        }
                    })
                })
            }

            // 4. Transaction: Delete old chunks + Insert new
            const client = await pool.connect()
            try {
                await client.query('BEGIN')

                // Delete old
                await client.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId])

                // Insert new
                if (allVectors.length > 0) {
                    const query = `
                        INSERT INTO document_chunks (document_id, content, embedding, chunk_index, metadata)
                        VALUES ($1, $2, $3::vector, $4, $5)
                    `

                    for (const v of allVectors) {
                        await client.query(query, [
                            v.document_id,
                            v.content,
                            v.embedding,
                            v.chunk_index,
                            v.metadata
                        ])
                    }
                }

                // Update document status
                await client.query(`
                    UPDATE documents 
                    SET sync_status = 'synced', processing_time = NOW() 
                    WHERE id = $1
                `, [documentId])

                await client.query('COMMIT')
                logger.info(`[RagService] Ingestion complete. Inserted ${allVectors.length} chunks.`)

            } catch (err) {
                await client.query('ROLLBACK')
                throw err
            } finally {
                client.release()
            }

            // Log successful analytics
            const duration = Date.now() - startTime;
            await this.logAnalytics({
                operation_type: 'ingest',
                document_id: documentId,
                success: true,
                duration_ms: duration,
                chunks_processed: chunks.length,
                vectors_created: allVectors.length,
                metadata: {
                    model: VOYAGE_MODEL,
                    batch_count: Math.ceil(chunks.length / 10)
                }
            });

            return { success: true, chunks: chunks.length }

        } catch (error: any) {
            const duration = Date.now() - startTime;
            logger.error(`[RagService] Ingestion failed: ${error.message}`)

            // Log failed analytics
            await this.logAnalytics({
                operation_type: 'ingest',
                document_id: documentId,
                success: false,
                duration_ms: duration,
                error_message: error.message,
                error_type: error.name || 'UNKNOWN_ERROR',
                metadata: {
                    stack: error.stack
                }
            });

            throw error
        }
    }

    /**
     * Searches for relevant chunks using vector similarity.
     */
    async query(queryText: string, topK: number = 5, filter: any = {}): Promise<any[]> {
        const startTime = Date.now();

        if (!VOYAGE_API_KEY) {
            throw new Error("VOYAGE_API_KEY is not set")
        }

        try {
            if (isMongoRagEnabled()) {
                try {
                    const mongoRows = await queryMongoForRag(queryText, topK, filter);
                    if (mongoRows.length > 0) {
                        const duration = Date.now() - startTime;
                        await this.logAnalytics({
                            operation_type: 'query',
                            success: true,
                            duration_ms: duration,
                            chunks_processed: mongoRows.length,
                            metadata: {
                                backend: 'mongodb_atlas',
                                query_length: queryText.length,
                                top_k: topK,
                            },
                        });
                        return mongoRows;
                    }
                } catch (mongoError: any) {
                    logger.warn(`[RagService] MongoDB query failed, falling back to pgvector: ${mongoError.message}`);
                }
            }

            // 1. Embed Query
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
                throw new Error(`Voyage AI API Error: ${errText}`)
            }

            const data = await response.json() as any
            const queryVector = data.data?.[0]?.embedding

            if (!queryVector) {
                throw new Error("Failed to generate query embedding")
            }

            const vectorString = `[${queryVector.join(',')}]`

            // 2. Call RPC via SQL
            const sql = `
                SELECT * FROM match_document_chunks(
                    $1::vector, 
                    0.5, 
                    $2, 
                    $3::jsonb
                )
            `

            const res = await pool.query(sql, [vectorString, topK, filter])

            // Log successful analytics
            const duration = Date.now() - startTime;
            await this.logAnalytics({
                operation_type: 'query',
                success: true,
                duration_ms: duration,
                chunks_processed: res.rows.length,
                metadata: {
                    query_length: queryText.length,
                    top_k: topK,
                    results_count: res.rows.length,
                    has_filter: Object.keys(filter).length > 0
                }
            });

            return res.rows
        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Log failed analytics
            await this.logAnalytics({
                operation_type: 'query',
                success: false,
                duration_ms: duration,
                error_message: error.message,
                error_type: error.name || 'UNKNOWN_ERROR',
                metadata: {
                    query_length: queryText.length,
                    top_k: topK
                }
            });

            throw error;
        }
    }

    // Helper
    private splitTextInternal(text: string, chunkSize: number = 1000, overlap: number = 200): TextChunk[] {
        if (!text) return [];
        const chunks: TextChunk[] = [];
        let startIndex = 0;

        // Safety check to prevent infinite loop
        if (chunkSize <= 0) chunkSize = 1000;
        if (overlap < 0) overlap = 0;
        if (overlap >= chunkSize) overlap = chunkSize - 1;

        while (startIndex < text.length) {
            let endIndex = startIndex + chunkSize;

            if (endIndex >= text.length) {
                endIndex = text.length;
            } else {
                // Try to break at a space
                const lastSpace = text.lastIndexOf(' ', endIndex);
                if (lastSpace > startIndex) {
                    endIndex = lastSpace;
                }
            }

            const chunkText = text.substring(startIndex, endIndex).trim();
            if (chunkText.length > 0) {
                chunks.push({ text: chunkText, start: startIndex, end: endIndex });
            }

            // If we reached the end of the text, break
            if (endIndex === text.length) break;

            // Calculate next start index
            let nextStart = endIndex - overlap;

            // Critical safeguard: Ensure we always move forward
            if (nextStart <= startIndex) {
                nextStart = startIndex + 1;
            }

            startIndex = nextStart;
        }
        return chunks;
    }
}

export const ragService = new RagService()
