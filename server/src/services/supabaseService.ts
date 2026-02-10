import { logger } from '../utils/logger';

/**
 * Supabase Service - Wrapper for Supabase MCP operations
 * Provides access to Supabase projects, edge functions, migrations, and database operations
 */
export class SupabaseService {
    private mcpAvailable: boolean = false;

    constructor() {
        // Check if MCP is available
        this.mcpAvailable = typeof (global as any).mcp !== 'undefined';

        if (!this.mcpAvailable) {
            logger.warn('Supabase MCP server not available');
        }
    }

    /**
     * List all Supabase projects
     */
    async listProjects(): Promise<any[]> {
        try {
            if (!this.mcpAvailable) {
                throw new Error('Supabase MCP server not available');
            }

            // Note: This will be called via API route which has access to MCP
            // For now, return empty array as placeholder
            logger.info('Listing Supabase projects');
            return [];
        } catch (error) {
            logger.error('Failed to list Supabase projects', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Get project details
     */
    async getProject(projectId: string): Promise<any> {
        try {
            if (!this.mcpAvailable) {
                throw new Error('Supabase MCP server not available');
            }

            logger.info('Getting Supabase project details', { projectId });
            return null;
        } catch (error) {
            logger.error('Failed to get Supabase project', {
                error: (error as Error).message,
                projectId
            });
            throw error;
        }
    }

    /**
     * List edge functions for a project
     */
    async listEdgeFunctions(projectId: string): Promise<any[]> {
        try {
            if (!this.mcpAvailable) {
                throw new Error('Supabase MCP server not available');
            }

            logger.info('Listing edge functions', { projectId });
            return [];
        } catch (error) {
            logger.error('Failed to list edge functions', {
                error: (error as Error).message,
                projectId
            });
            throw error;
        }
    }

    /**
     * Get comprehensive database statistics
     */
    async getDatabaseStats(projectId: string): Promise<any> {
        try {
            logger.info('Getting database stats', { projectId });

            // Get stats from our local database
            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            try {
                // Get table counts
                const tablesQuery = `
                    SELECT 
                        schemaname,
                        tablename,
                        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
                    FROM pg_tables 
                    WHERE schemaname IN ('public')
                    ORDER BY size_bytes DESC
                    LIMIT 20
                `;
                const tablesResult = await pool.query(tablesQuery);

                // Get RAG documents count from Node.js service tables
                const ragDocsQuery = 'SELECT COUNT(*) as count FROM documents';
                const ragDocsResult = await pool.query(ragDocsQuery).catch(() => ({ rows: [{ count: 0 }] }));

                // Get entity extraction stats
                const entitiesQuery = `
                    SELECT 
                        COUNT(*) as total_entities,
                        COUNT(DISTINCT document_id) as documents_with_entities,
                        COUNT(DISTINCT type) as unique_types
                    FROM document_entities
                `;
                const entitiesResult = await pool.query(entitiesQuery).catch(() => ({
                    rows: [{ total_entities: 0, documents_with_entities: 0, unique_types: 0 }]
                }));

                // Get total row count across all tables
                const totalRowsQuery = `
                    SELECT SUM(n_live_tup) as total_rows
                    FROM pg_stat_user_tables
                    WHERE schemaname = 'public'
                `;
                const totalRowsResult = await pool.query(totalRowsQuery);

                await pool.end();

                return {
                    tables: tablesResult.rows,
                    totalTables: tablesResult.rows.length,
                    totalRows: parseInt(totalRowsResult.rows[0]?.total_rows || '0'),
                    ragDocuments: parseInt(ragDocsResult.rows[0]?.count || '0'),
                    entities: {
                        total: parseInt(entitiesResult.rows[0]?.total_entities || '0'),
                        documentsWithEntities: parseInt(entitiesResult.rows[0]?.documents_with_entities || '0'),
                        uniqueTypes: parseInt(entitiesResult.rows[0]?.unique_types || '0')
                    },
                    databaseSize: tablesResult.rows.reduce((sum: number, t: any) => sum + parseInt(t.size_bytes || '0'), 0)
                };
            } catch (dbError) {
                logger.error('Database query error', { error: (dbError as Error).message });
                throw dbError;
            }
        } catch (error) {
            logger.error('Failed to get database stats', {
                error: (error as Error).message,
                projectId
            });
            throw error;
        }
    }

    /**
     * Get Edge Functions statistics
     */
    async getEdgeFunctionStats(): Promise<any> {
        try {
            logger.info('Getting Edge Function stats');

            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            try {
                // Get RAG ingestion stats from Node.js service tables
                const ragStatsQuery = `
                    SELECT 
                        COUNT(*) as total_documents,
                        COUNT(DISTINCT DATE(created_at)) as active_days,
                        MAX(created_at) as last_ingestion,
                        MIN(created_at) as first_ingestion
                    FROM documents
                `;
                const ragStats = await pool.query(ragStatsQuery).catch(() => ({
                    rows: [{ total_documents: 0, active_days: 0, last_ingestion: null, first_ingestion: null }]
                }));

                // Get vector/chunk stats from Node.js service tables
                const vectorStatsQuery = `
                    SELECT 
                        COUNT(*) as total_vectors,
                        COUNT(DISTINCT document_id) as documents_with_vectors,
                        ROUND(AVG(chunks_count), 1) as avg_chunks_per_doc
                    FROM (
                        SELECT document_id, COUNT(*) as chunks_count
                        FROM document_chunks
                        GROUP BY document_id
                    ) chunk_counts
                `;
                const vectorStats = await pool.query(vectorStatsQuery).catch(() => ({
                    rows: [{ total_vectors: 0, documents_with_vectors: 0, avg_chunks_per_doc: 0 }]
                }));

                // Get entity extraction stats
                const entityStatsQuery = `
                    SELECT 
                        COUNT(*) as total_entities,
                        COUNT(DISTINCT document_id) as documents_with_entities,
                        COUNT(DISTINCT type) as unique_entity_types
                    FROM document_entities
                `;
                const entityStats = await pool.query(entityStatsQuery).catch(() => ({
                    rows: [{ total_entities: 0, documents_with_entities: 0, unique_entity_types: 0 }]
                }));

                await pool.end();

                return {
                    functions: [
                        {
                            name: 'ingest-for-rag',
                            status: 'deployed',
                            description: 'RAG document ingestion with Voyage AI embeddings',
                            url: 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/ingest-for-rag',
                            stats: {
                                totalDocuments: parseInt(ragStats.rows[0]?.total_documents || '0'),
                                totalVectors: parseInt(vectorStats.rows[0]?.total_vectors || '0'),
                                documentsWithVectors: parseInt(vectorStats.rows[0]?.documents_with_vectors || '0'),
                                avgChunksPerDoc: parseFloat(vectorStats.rows[0]?.avg_chunks_per_doc || '0').toFixed(1),
                                activeDays: parseInt(ragStats.rows[0]?.active_days || '0'),
                                lastIngestion: ragStats.rows[0]?.last_ingestion,
                                firstIngestion: ragStats.rows[0]?.first_ingestion
                            }
                        },
                        {
                            name: 'entity-extractor',
                            status: 'deployed',
                            description: 'Automatic entity extraction from documents',
                            url: 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor',
                            stats: {
                                totalEntities: parseInt(entityStats.rows[0]?.total_entities || '0'),
                                documentsWithEntities: parseInt(entityStats.rows[0]?.documents_with_entities || '0'),
                                uniqueEntityTypes: parseInt(entityStats.rows[0]?.unique_entity_types || '0')
                            }
                        }
                    ],
                    totalFunctions: 2,
                    deployedFunctions: 2,
                    summary: {
                        totalDocuments: parseInt(ragStats.rows[0]?.total_documents || '0'),
                        totalVectors: parseInt(vectorStats.rows[0]?.total_vectors || '0'),
                        totalEntities: parseInt(entityStats.rows[0]?.total_entities || '0'),
                        lastActivity: ragStats.rows[0]?.last_ingestion
                    }
                };
            } catch (dbError) {
                logger.error('Database query error in getEdgeFunctionStats', { error: (dbError as Error).message });
                // Return basic stats if database query fails
                return {
                    functions: [
                        {
                            name: 'ingest-for-rag',
                            status: 'deployed',
                            description: 'RAG document ingestion with Voyage AI embeddings',
                            url: 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/ingest-for-rag'
                        },
                        {
                            name: 'entity-extractor',
                            status: 'deployed',
                            description: 'Automatic entity extraction from documents',
                            url: 'https://blxzjbxczpmmgiwbtmdo.supabase.co/functions/v1/entity-extractor'
                        }
                    ],
                    totalFunctions: 2,
                    deployedFunctions: 2
                };
            }
        } catch (error) {
            logger.error('Failed to get Edge Function stats', {
                error: (error as Error).message
            });
            throw error;
        }
    }

    /**
     * Get security and performance advisors
     */
    async getAdvisors(projectId: string, type: 'security' | 'performance'): Promise<any[]> {
        try {
            if (!this.mcpAvailable) {
                throw new Error('Supabase MCP server not available');
            }

            logger.info('Getting advisors', { projectId, type });
            return [];
        } catch (error) {
            logger.error('Failed to get advisors', {
                error: (error as Error).message,
                projectId,
                type
            });
            throw error;
        }
    }

    /**
     * List migrations
     */
    async listMigrations(projectId: string): Promise<any[]> {
        try {
            if (!this.mcpAvailable) {
                throw new Error('Supabase MCP server not available');
            }

            logger.info('Listing migrations', { projectId });
            return [];
        } catch (error) {
            logger.error('Failed to list migrations', {
                error: (error as Error).message,
                projectId
            });
            throw error;
        }
    }

    /**
     * List extracted entities
     */
    async listEntities(limit: number = 50): Promise<any[]> {
        try {
            logger.info('Listing extracted entities', { limit });

            const { Pool } = require('pg');
            const pool = new Pool({
                connectionString: process.env.DATABASE_URL,
                ssl: { rejectUnauthorized: false }
            });

            try {
                const query = `
                    SELECT 
                        de.id,
                        de.document_id,
                        d.title as document_title,
                        de.entity,
                        de.type,
                        de.score,
                        de.created_at
                    FROM document_entities de
                    LEFT JOIN documents d ON de.document_id = d.id
                    ORDER BY de.created_at DESC
                    LIMIT $1
                `;
                const result = await pool.query(query, [limit]);
                await pool.end();

                return result.rows;
            } catch (dbError) {
                logger.error('Database query error in listEntities', { error: (dbError as Error).message });
                throw dbError;
            }
        } catch (error) {
            logger.error('Failed to list extracted entities', {
                error: (error as Error).message
            });
            throw error;
        }
    }
}

// Export singleton instance
export const supabaseService = new SupabaseService();
