import { db } from '@/lib/morphic/db'
import { tool } from 'ai'
import { sql } from 'drizzle-orm'
import { MongoClient } from 'mongodb'
import { VoyageAIClient } from 'voyageai'
import { z } from 'zod'

// --- MongoDB / Voyage AI (RAG) Setup ---

const MONGODB_URI = process.env.MONGODB_URI
const MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'adpacluster'
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY
const VOYAGE_MODEL = process.env.VOYAGE_EMBEDDING_MODEL || 'voyage-4-large'

let mongoClient: MongoClient | null = null

async function getMongoClient() {
    if (!mongoClient && MONGODB_URI) {
        mongoClient = new MongoClient(MONGODB_URI)
        await mongoClient.connect()
    }
    return mongoClient
}

const voyageClient = VOYAGE_API_KEY
    ? new VoyageAIClient({ apiKey: VOYAGE_API_KEY })
    : null

// --- Tools ---

/**
 * Tool to perform vector search on the MongoDB RAG database
 */
export const createRagSearchTool = (userId: string) => tool({
    description: 'Search the internal knowledge base (RAG) for historical research, documents, and unstructured data using vector similarity.',
    inputSchema: z.object({
        query: z.string().describe('The search query to find relevant context for.'),
        limit: z.number().optional().default(5).describe('Maximum number of results to return.')
    }),
    execute: async function* ({ query, limit }) {
        yield { state: 'searching' as const, query }

        if (!MONGODB_URI || !voyageClient) {
            yield { state: 'output-error' as const, error: 'RAG search is not configured (missing MongoDB URI or Voyage API Key).' }
            return 'RAG search is not configured'
        }

        try {
            const client = await getMongoClient()
            if (!client) throw new Error('Failed to connect to MongoDB')

            const database = client.db(MONGODB_DATABASE)
            const collection = database.collection('chunks')

            // 1. Generate embedding
            const response = await voyageClient.embed({
                input: [query],
                model: VOYAGE_MODEL,
                inputType: 'query'
            })

            const queryEmbedding = response.data?.[0]?.embedding
            if (!queryEmbedding) throw new Error('Failed to generate embedding')

            // 2. Perform Vector Search (Atlas Search)
            // Note: This assumes an Atlas Search index named 'vector_search_index' exists as per the pipeline config
            const pipeline = [
                {
                    $search: {
                        index: 'vector_search_index',
                        knnBeta: {
                            vector: queryEmbedding,
                            path: 'embedding',
                            k: limit
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        content: 1,
                        documentId: 1,
                        metadata: 1,
                        score: { $meta: 'searchScore' }
                    }
                }
            ]

            const results = await collection.aggregate(pipeline).toArray()

            yield {
                state: 'complete' as const,
                query,
                results: results.map(r => ({
                    content: r.content,
                    metadata: r.metadata,
                    score: r.score
                }))
            }
            return results
        } catch (error) {
            console.error('[RAG] Search Error:', error)
            yield { state: 'output-error' as const, error: `Search failed: ${error instanceof Error ? error.message : String(error)}` }
            return error
        }
    }
})

/**
 * Tool to execute read-only SQL queries on the local PostgreSQL database
 */
export const createDbQueryTool = (userId: string) => tool({
    description: 'Execute read-only SQL queries on the local PostgreSQL database to retrieve system information, chat history, or model configurations. Only SELECT statements are allowed.',
    inputSchema: z.object({
        sqlQuery: z.string().describe('The SQL query to execute. MUST be a SELECT statement.')
    }),
    execute: async function* ({ sqlQuery }) {
        yield { state: 'querying' as const, sqlQuery }

        // Basic security check
        const normalizedQuery = sqlQuery.trim().toLowerCase()
        if (!normalizedQuery.startsWith('select')) {
            yield { state: 'output-error' as const, error: 'Only SELECT statements are allowed for security reasons.' }
            return 'Security violation'
        }

        // Block potentially sensitive tables if needed, but for now we allow selectivity
        if (normalizedQuery.includes('delete') || normalizedQuery.includes('update') || normalizedQuery.includes('drop') || normalizedQuery.includes('insert')) {
            yield { state: 'output-error' as const, error: 'Destructive operations are forbidden.' }
            return 'Security violation'
        }

        try {
            // Execute the raw SQL using drizzle in a transaction to set local RLS variable
            const resultPayload = await db.transaction(async (tx) => {
                // Set the current user ID for RLS policies
                await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`)

                // Execute the actual query
                const result = await tx.execute(sql.raw(sqlQuery))

                return {
                    query: sqlQuery,
                    rowCount: result.length,
                    results: result
                }
            })

            yield {
                state: 'complete' as const,
                ...resultPayload
            }
            return resultPayload
        } catch (error) {
            console.error('[DB Query] Error:', error)
            yield { state: 'output-error' as const, error: `Query failed: ${error instanceof Error ? error.message : String(error)}` }
            return error
        }
    }
})

/**
 * Static instances for type inference and default usage
 */
export const ragSearchTool = createRagSearchTool('system')
export const dbQueryTool = createDbQueryTool('system')
