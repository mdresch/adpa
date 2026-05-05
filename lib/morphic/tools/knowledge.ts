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

// Name of the Atlas Vector Search index (must be configured in Atlas)
const VECTOR_SEARCH_INDEX = process.env.MONGODB_VECTOR_INDEX || 'vector_search_index'
// Name of the Atlas Search (full-text) index – used for hybrid search
const TEXT_SEARCH_INDEX = process.env.MONGODB_TEXT_INDEX || 'text_search_index'

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

// --- Helpers ---

interface RankedItem {
    _id: any
    content: string
    documentId?: string
    metadata?: any
    [key: string]: any
}

/**
 * Combines multiple ranked lists using Reciprocal Rank Fusion.
 * k=60 is the standard constant that dampens the influence of high-rank differences.
 */
function reciprocalRankFusion(lists: RankedItem[][], k = 60): Array<RankedItem & { rrfScore: number }> {
    const scoreMap = new Map<string, { item: RankedItem; score: number }>()

    for (const list of lists) {
        list.forEach((item, rank) => {
            const id = String(item._id)
            const contribution = 1 / (rank + 1 + k)
            const existing = scoreMap.get(id)
            if (existing) {
                existing.score += contribution
            } else {
                scoreMap.set(id, { item, score: contribution })
            }
        })
    }

    return Array.from(scoreMap.values())
        .sort((a, b) => b.score - a.score)
        .map(({ item, score }) => ({ ...item, rrfScore: score }))
}

// --- Tools ---

/**
 * Tool to perform hybrid vector + full-text search on the MongoDB RAG database.
 * Uses $vectorSearch (current Atlas Vector Search API) for semantic similarity and
 * Atlas Search $search with text operator for keyword recall, then merges the two
 * ranked lists using Reciprocal Rank Fusion (RRF) for best overall relevance.
 */
export const createRagSearchTool = (userId: string) => tool({
    description: 'Search the internal knowledge base (RAG) for historical research, documents, and unstructured data using hybrid vector + keyword search.',
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

            // 1. Generate query embedding
            const response = await voyageClient.embed({
                input: [query],
                model: VOYAGE_MODEL,
                inputType: 'query'
            })

            const queryEmbedding = response.data?.[0]?.embedding
            if (!queryEmbedding) throw new Error('Failed to generate embedding')

            // 2. Run vector search and full-text search in parallel
            const candidateCount = limit * 10 // standard ANN candidate multiplier

            const [vectorOutcome, textOutcome] = await Promise.allSettled([
                // Vector search via the current $vectorSearch aggregation stage
                collection.aggregate([
                    {
                        $vectorSearch: {
                            index: VECTOR_SEARCH_INDEX,
                            path: 'embedding',
                            queryVector: queryEmbedding,
                            numCandidates: candidateCount,
                            limit: limit * 2
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            content: 1,
                            documentId: 1,
                            metadata: 1,
                            vectorScore: { $meta: 'vectorSearchScore' }
                        }
                    }
                ]).toArray(),

                // Full-text search via Atlas Search text operator
                collection.aggregate([
                    {
                        $search: {
                            index: TEXT_SEARCH_INDEX,
                            text: {
                                query,
                                path: 'content'
                            }
                        }
                    },
                    { $limit: limit * 2 },
                    {
                        $project: {
                            _id: 1,
                            content: 1,
                            documentId: 1,
                            metadata: 1,
                            textScore: { $meta: 'searchScore' }
                        }
                    }
                ]).toArray()
            ])

            // MongoDB aggregation results are `Document[]` at runtime; casting to RankedItem[] is safe
            // because both pipelines project the same fields (_id, content, documentId, metadata).
            const vectorResults: RankedItem[] = vectorOutcome.status === 'fulfilled' ? vectorOutcome.value as RankedItem[] : []
            const textResults: RankedItem[] = textOutcome.status === 'fulfilled' ? textOutcome.value as RankedItem[] : []

            if (textOutcome.status === 'rejected') {
                console.warn('[RAG] Full-text search unavailable (index may not exist), falling back to vector-only:', textOutcome.reason?.message)
            }

            // 3. Merge with RRF and take top-N
            const merged = vectorResults.length > 0 || textResults.length > 0
                ? reciprocalRankFusion([vectorResults, textResults]).slice(0, limit)
                : []

            yield {
                state: 'complete' as const,
                query,
                results: merged.map(r => ({
                    content: r.content,
                    metadata: r.metadata,
                    score: r.rrfScore
                }))
            }
            return merged
        } catch (error) {
            console.error('[RAG] Search Error:', error)
            yield { state: 'output-error' as const, error: `Search failed: ${error instanceof Error ? error.message : String(error)}` }
            return error
        }
    }
})

// Forbidden SQL keywords that must not appear as whole words in any query
const FORBIDDEN_SQL_KEYWORDS = [
    'delete', 'update', 'drop', 'insert', 'truncate',
    'alter', 'create', 'grant', 'revoke', 'execute', 'exec',
    'call', 'merge', 'replace', 'upsert', 'vacuum', 'analyze'
]

// Pre-compile regex patterns at module load time to avoid repeated compilation overhead
const FORBIDDEN_KEYWORD_PATTERNS = FORBIDDEN_SQL_KEYWORDS.map(kw => ({
    keyword: kw,
    pattern: new RegExp(`\\b${kw}\\b`)
}))

// Forbidden table/schema prefixes that expose system internals
const FORBIDDEN_TABLE_PREFIXES = ['pg_', 'information_schema']

/**
 * Validates that a SQL query is safe to execute as a read-only statement.
 * Returns an error string if the query is invalid, or null if it passes.
 */
function validateReadOnlySql(query: string): string | null {
    const trimmed = query.trim()
    const lower = trimmed.toLowerCase()

    if (!lower.startsWith('select')) {
        return 'Only SELECT statements are allowed for security reasons.'
    }

    // Block multi-statement injection via semicolons
    if (trimmed.includes(';')) {
        return 'Multi-statement queries are not allowed.'
    }

    // Block SQL comments that can bypass keyword filters
    if (lower.includes('--') || lower.includes('/*')) {
        return 'SQL comments are not allowed.'
    }

    // Block destructive keywords using whole-word matching (patterns are pre-compiled at module load)
    for (const { keyword, pattern } of FORBIDDEN_KEYWORD_PATTERNS) {
        if (pattern.test(lower)) {
            return `Forbidden SQL keyword detected: '${keyword}'.`
        }
    }

    // Block access to system catalogs and internal schemas
    for (const prefix of FORBIDDEN_TABLE_PREFIXES) {
        if (lower.includes(prefix)) {
            return `Access to system tables ('${prefix}...') is not allowed.`
        }
    }

    return null
}

/**
 * Tool to execute read-only SQL queries on the local PostgreSQL database.
 * Only SELECT statements against application tables are permitted.
 */
export const createDbQueryTool = (userId: string) => tool({
    description: 'Execute read-only SQL queries on the local PostgreSQL database to retrieve system information, chat history, or model configurations. Only SELECT statements are allowed.',
    inputSchema: z.object({
        sqlQuery: z.string().describe('The SQL query to execute. MUST be a SELECT statement.')
    }),
    execute: async function* ({ sqlQuery }) {
        yield { state: 'querying' as const, sqlQuery }

        // Validate the query before sending it to the database
        const validationError = validateReadOnlySql(sqlQuery)
        if (validationError) {
            yield { state: 'output-error' as const, error: validationError }
            return 'Security violation'
        }

        try {
            const resultPayload = await db.transaction(async (tx) => {
                // Enforce read-only at the DB level — prevents any write even if validation is bypassed
                await tx.execute(sql`SET TRANSACTION READ ONLY`)

                // Set the current user ID for RLS policies
                await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`)

                // Execute the validated query (sql.raw is acceptable here because the query
                // has already passed strict validation above and the transaction is read-only)
                const result = await tx.execute(sql.raw(sqlQuery))

                return {
                    query: sqlQuery,
                    rowCount: result.rowCount,
                    results: result.rows
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
 * Tool to search the user's previous chat conversations for relevant prior research.
 * Uses PostgreSQL full-text search over persisted assistant messages.
 */
export const createSearchPriorResearchTool = (userId: string) => tool({
    description: "Search your previous chat conversations for relevant research and answers you've already found. Use this before searching the web to avoid duplicating work.",
    inputSchema: z.object({
        query: z.string().describe('What to look for in your previous research sessions.'),
        limit: z.number().optional().default(5).describe('Maximum number of past results to return.')
    }),
    execute: async function* ({ query, limit }) {
        yield { state: 'searching' as const, query }

        try {
            const results = await db.execute(
                sql`
                    SELECT
                        c.title          AS chat_title,
                        c.id             AS chat_id,
                        p.text_text      AS content,
                        m.created_at     AS message_date
                    FROM morphic_parts p
                    JOIN morphic_messages m ON m.id = p.message_id
                    JOIN morphic_chats    c ON c.id = m.chat_id
                    WHERE c.user_id  = ${userId}
                      AND m.role     = 'assistant'
                      AND p.type     = 'text'
                      AND p.text_text IS NOT NULL
                      AND to_tsvector('english', p.text_text) @@ plainto_tsquery('english', ${query})
                    ORDER BY m.created_at DESC
                    LIMIT ${limit}
                `
            )

            const rows = results.rows as Array<{
                chat_title: string
                chat_id: string
                content: string
                message_date: Date
            }>

            yield {
                state: 'complete' as const,
                query,
                results: rows.map(r => ({
                    title: r.chat_title,
                    chatId: r.chat_id,
                    content: r.content.substring(0, 600),
                    date: r.message_date
                }))
            }
            return rows
        } catch (error) {
            console.error('[PriorResearch] Search Error:', error)
            yield { state: 'output-error' as const, error: `Search failed: ${error instanceof Error ? error.message : String(error)}` }
            return error
        }
    }
})

/**
 * Static instances for type inference and default usage
 */
export const ragSearchTool = createRagSearchTool('system')
export const dbQueryTool = createDbQueryTool('system')
export const searchPriorResearchTool = createSearchPriorResearchTool('system')
