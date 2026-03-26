import { Pool } from 'pg'
import { childLogger } from "../../utils/logger"

/**
 * MorphicRepository
 * Handles interactions with the Morphic-specific database (Railway).
 * This is separate from the main ADPA database (Supabase).
 */
export class MorphicRepository {
    private static _pool: Pool | null = null;
    private log = childLogger({ module: 'MorphicRepository' });

    /**
     * Get the active database pool, falling back to main DB if Morphic DB is unavailable.
     */
    private async getPool() {
        if (MorphicRepository._pool) return MorphicRepository._pool;

        let morphicUrl = process.env.MORPHIC_DATABASE_URL || process.env.MORPHIC_DB_URL;
        const mainUrl = process.env.DATABASE_URL;

        if (morphicUrl) {
            // Trim quotes
            morphicUrl = morphicUrl.replace(/^["']|["']$/g, '');
            
            // Force SSL for remote hosts or if explicitly enabled
            const isRemote = (morphicUrl.includes('rlwy.net') || morphicUrl.includes('supabase') || morphicUrl.includes('pooler.supabase.com')) && 
                             !morphicUrl.includes('localhost') && !morphicUrl.includes('127.0.0.1');

            const sslConfig = (isRemote || (process.env.MORPHIC_DB_SSL === 'true')) 
                ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true } 
                : false;
            
            try {
                MorphicRepository._pool = new Pool({
                    connectionString: morphicUrl,
                    ssl: sslConfig,
                    max: 10,
                    idleTimeoutMillis: 10000,
                    connectionTimeoutMillis: 5000
                });
                return MorphicRepository._pool;
            } catch (err) {
                this.log.warn('Failed to initialize Morphic DB pool, falling back to main DB');
            }
        }

        if (mainUrl) {
            MorphicRepository._pool = new Pool({
                connectionString: mainUrl.replace(/^["']|["']$/g, ''),
                ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' ? false : true },
                max: 5
            });
            this.log.info('Morphic repository using main database as fallback');
            return MorphicRepository._pool;
        }

        throw new Error('No database connection available');
    }

    /**
     * Execute a query with automatic fallback if the primary DB fails.
     */
    private async query(text: string, params?: any[]) {
        try {
            const pool = await this.getPool();
            const result = await pool.query(text, params);
            return result.rows;
        } catch (error: any) {
            // Check for connection related errors
            const isConnectionError = error.message.includes('terminated') || 
                                     error.message.includes('ECONNRESET') || 
                                     error.message.includes('ECONNREFUSED') ||
                                     error.message.includes('expired');

            if (isConnectionError && process.env.MORPHIC_DATABASE_URL) {
                this.log.warn('Morphic DB connection failed, attempting fallback to main DB...', error.message);
                
                // Reset pool and try one more time with main DB fallback
                MorphicRepository._pool = null;
                const pool = await this.getPool();
                const result = await pool.query(text, params);
                return result.rows;
            }
            throw error;
        }
    }

    /**
     * Load a chat with its messages and parts.
     */
    async loadChat(chatId: string, userId: string) {
        try {
            const chatResult = await this.query(
                'SELECT * FROM morphic_chats WHERE id = $1 AND (user_id = $2 OR visibility = $3)',
                [chatId, userId, 'public']
            );
            
            if (chatResult.length === 0) return null;
 
            const messagesResult = await this.query(
                'SELECT * FROM morphic_messages WHERE chat_id = $1 ORDER BY created_at ASC',
                [chatId]
            );

            // Fetch parts for each message
            const messagesWithParts = await Promise.all(messagesResult.map(async (msg: any) => {
                const partsResult = await this.query(
                    'SELECT * FROM morphic_parts WHERE message_id = $1 ORDER BY "order" ASC',
                    [msg.id]
                );

                // Map snake_case DB columns to camelCase expected by buildUIMessageFromDB
                const mappedParts = partsResult.map((part: any) => ({
                    ...part,
                    messageId: part.message_id,
                    file_mediaType: part.file_media_type,
                    file_filename: part.file_filename,
                    source_url_sourceId: part.source_url_source_id,
                    source_document_sourceId: part.source_document_source_id,
                    source_document_mediaType: part.source_document_media_type,
                    tool_toolCallId: part.tool_tool_call_id,
                    tool_errorText: part.tool_error_text,
                    createdAt: part.created_at
                }));

                return {
                    ...msg,
                    parts: mappedParts
                };
            }));

            return {
                ...chatResult[0],
                userId: chatResult[0].user_id, // Map for compatibility
                messages: messagesWithParts
            };
        } catch (error) {
            this.log.error(`Error loading chat ${chatId}:`, error);
            throw error;
        }
    }

    /**
     * Create a new chat.
     */
    async createChat(id: string, userId: string, title?: string) {
        try {
            const chatTitle = title || 'Untitled';
            return await this.query(
                `INSERT INTO morphic_chats (id, title, user_id, visibility, created_at)
                 VALUES ($1, $2, $3, 'private', NOW())
                 ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title
                 RETURNING *`,
                [id, chatTitle, userId]
            );
        } catch (error) {
            this.log.error('Error creating chat:', error);
            throw error;
        }
    }

    /**
     * Save a message and its parts.
     */
    async upsertMessage(message: any, userId: string) {
        const pool = await this.getPool();
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const { id, chatId, role, metadata, parts } = message;
            
            // 1. Upsert message
            await client.query(
                `INSERT INTO morphic_messages (id, chat_id, role, metadata, created_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (id) DO UPDATE SET
                    role = EXCLUDED.role,
                    metadata = EXCLUDED.metadata,
                    updated_at = NOW()`,
                [id, chatId, role, metadata || {}]
            );

            // 2. Clear existing parts
            await client.query('DELETE FROM morphic_parts WHERE message_id = $1', [id]);

            // 3. Insert new parts if any
            if (parts && Array.isArray(parts)) {
                // For simplicity in this non-Drizzle environment, we'll store parts as JSON or map them.
                // But the schema suggests specific columns. To avoid complex mapping, 
                // we'll at least store the text parts correctly if we can, 
                // OR we can use the mapUIMessagePartsToDBParts if available.
                
                // For now, let's use a very simplified approach: store text and tool calls as best we can.
                for (let i = 0; i < parts.length; i++) {
                    const part = parts[i];
                    await client.query(
                        `INSERT INTO morphic_parts (id, message_id, "order", type, text_text, tool_tool_call_id, tool_state, tool_search_input, tool_search_output, created_at)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
                        [
                            `${id}_${i}`,
                            id,
                            i,
                            part.type,
                            part.text || (part.type === 'reasoning' ? part.reasoning : null),
                            part.toolCallId || null,
                            part.state || (part.type === 'tool-call' ? 'input-available' : (part.type === 'tool-result' ? 'output-available' : null)),
                            part.type === 'tool-call' ? JSON.stringify(part.args || {}) : null,
                            part.type === 'tool-result' ? JSON.stringify(part.result || {}) : null
                        ]
                    );
                }
            }

            await client.query('COMMIT');
            return { id, chatId, role };
        } catch (error) {
            await client.query('ROLLBACK');
            this.log.error('Error upserting message:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Update chat title.
     */
    async updateChatTitle(chatId: string, title: string, userId: string) {
        try {
            return await this.query(
                `UPDATE morphic_chats 
                 SET title = $1
                 WHERE id = $2 AND (user_id = $3)
                 RETURNING *`,
                [title, chatId, userId]
            );
        } catch (error) {
            this.log.error(`Error updating title for chat ${chatId}:`, error);
            throw error;
        }
    }

    /**
     * List all chats for a user.
     */
    async listChats(userId: string) {
        try {
            return await this.query(
                `SELECT id, title, created_at, visibility
                 FROM morphic_chats 
                 WHERE user_id = $1
                 ORDER BY created_at DESC`,
                [userId]
            );
        } catch (error) {
            this.log.error(`Error listing chats for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Delete a chat and its messages.
     */
    async deleteChat(chatId: string, userId: string): Promise<{ success: boolean }> {
        try {
            // Delete messages first
            await this.query(
                `DELETE FROM morphic_messages 
                 WHERE chat_id = $1 
                 AND chat_id IN (SELECT id FROM morphic_chats WHERE user_id = $2)`,
                [chatId, userId]
            );
            // Delete chat
            const result = await this.query(
                'DELETE FROM morphic_chats WHERE id = $1 AND user_id = $2 RETURNING id',
                [chatId, userId]
            );
            return { success: result.length > 0 };
        } catch (error) {
            this.log.error(`Error deleting chat ${chatId}:`, error);
            throw error;
        }
    }
}
