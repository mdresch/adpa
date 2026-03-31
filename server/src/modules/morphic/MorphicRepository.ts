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
     * Ensure the necessary schema exists in the Morphic database.
     * This is useful when connecting to a fresh Supabase instance.
     */
    async ensureSchema() {
        try {
            const pool = await this.getPool();
            
            // 1. Check if morphic_chats exists
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = 'morphic_chats'
                )
            `);

            if (tableCheck.rows[0].exists) {
                this.log.debug('Morphic DB tables already exist.');
                return true;
            }

            this.log.info('Morphic DB tables missing. Bootstrapping schema...');

            // 2. Create tables if they don't exist
            // Using the schema definitions found in the baseline migration
            const schemaSql = `
                CREATE TABLE IF NOT EXISTS public."ai_model_config" (
                    "id" character varying(191) NOT NULL,
                    "search_mode" character varying(256) NOT NULL,
                    "model_type" character varying(256) NOT NULL,
                    "model_id" character varying(191) NOT NULL,
                    "priority" integer DEFAULT 0 NOT NULL,
                    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
                    PRIMARY KEY (id)
                );

                CREATE TABLE IF NOT EXISTS public."ai_models" (
                    "id" character varying(191) NOT NULL,
                    "provider_id" character varying(191) NOT NULL,
                    "name" character varying(256) NOT NULL,
                    "model_id" character varying(256) NOT NULL,
                    "is_enabled" integer DEFAULT 1 NOT NULL,
                    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
                    PRIMARY KEY (id)
                );

                CREATE TABLE IF NOT EXISTS public."ai_providers" (
                    "id" character varying(191) NOT NULL,
                    "name" character varying(256) NOT NULL,
                    "type" character varying(256) DEFAULT 'openai'::character varying NOT NULL,
                    "base_url" text,
                    "api_key" text,
                    "is_enabled" integer DEFAULT 1 NOT NULL,
                    "configuration" jsonb DEFAULT '{}'::jsonb,
                    "priority" integer DEFAULT 1 NOT NULL,
                    "status" character varying(256) DEFAULT 'disabled'::character varying,
                    "last_error" text,
                    "last_checked_at" timestamp without time zone,
                    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
                    "updated_at" timestamp without time zone,
                    PRIMARY KEY (id)
                );

                CREATE TABLE IF NOT EXISTS public."morphic_chats" (
                    "id" character varying(191) NOT NULL,
                    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
                    "updated_at" timestamp without time zone DEFAULT now(),
                    "title" text NOT NULL,
                    "user_id" character varying(255) NOT NULL,
                    "visibility" character varying(256) DEFAULT 'private'::character varying NOT NULL,
                    PRIMARY KEY (id)
                );

                CREATE TABLE IF NOT EXISTS public."morphic_messages" (
                    "id" character varying(191) NOT NULL,
                    "chat_id" character varying(191) NOT NULL,
                    "role" character varying(256) NOT NULL,
                    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
                    "updated_at" timestamp without time zone,
                    "metadata" jsonb,
                    PRIMARY KEY (id)
                );

                CREATE TABLE IF NOT EXISTS public."morphic_parts" (
                    "id" character varying(191) NOT NULL,
                    "message_id" character varying(191) NOT NULL,
                    "order" integer NOT NULL,
                    "type" character varying(256) NOT NULL,
                    "text_text" text,
                    "reasoning_text" text,
                    "tool_tool_call_id" character varying(256),
                    "tool_state" character varying(256),
                    "tool_search_input" json,
                    "tool_search_output" json,
                    "created_at" timestamp without time zone DEFAULT now() NOT NULL,
                    PRIMARY KEY (id)
                );
            `;

            await pool.query(schemaSql);
            
            // 3. Seed default providers if empty
            const providerCount = await pool.query('SELECT count(*) FROM ai_providers');
            if (parseInt(providerCount.rows[0].count) === 0) {
                this.log.info('Seeding default AI providers...');
                await pool.query(`
                    INSERT INTO ai_providers (id, name, type, is_enabled, priority, configuration)
                    VALUES 
                        ('openai', 'OpenAI', 'openai', 1, 1, '{"models": ["gpt-4o", "gpt-4o-mini"]}'),
                        ('azure', 'Azure OpenAI', 'azure', 1, 2, '{"deployment": "gpt-4o-mini", "apiVersion": "2024-08-01-preview"}'),
                        ('groq', 'Groq', 'openai', 1, 3, '{"baseUrl": "https://api.groq.com/openai/v1", "models": ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"]}'),
                        ('ollama', 'Ollama (Local)', 'openai', 1, 10, '{"baseUrl": "http://localhost:11434/v1", "models": ["llama3.2", "mistral"]}')
                `);
            }

            this.log.info('Morphic DB schema bootstrapped and seeded successfully.');
            return true;
        } catch (error) {
            this.log.error('Failed to bootstrap Morphic DB schema:', error);
            return false;
        }
    }

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
            const isRemote = (morphicUrl.includes('rlwy.net') || morphicUrl.includes('supabase') || morphicUrl.includes('pooler.supabase.com') || morphicUrl.includes('azure')) && 
                             !morphicUrl.includes('localhost') && !morphicUrl.includes('127.0.0.1');

            const sslConfig = (isRemote || (process.env.MORPHIC_DB_SSL === 'true')) 
                ? { rejectUnauthorized: false } 
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

    /**
     * List all AI providers.
     */
    async listAIProviders() {
        try {
            return await this.query(
                `SELECT * FROM ai_providers ORDER BY priority ASC, name ASC`
            );
        } catch (error) {
            this.log.error('Error listing AI providers:', error);
            throw error;
        }
    }

    /**
     * Upsert an AI provider.
     */
    async upsertAIProvider(provider: any) {
        try {
            const { id, name, type, baseUrl, apiKey, isEnabled, configuration, priority } = provider;
            return await this.query(
                `INSERT INTO ai_providers (id, name, type, base_url, api_key, is_enabled, configuration, priority, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    base_url = EXCLUDED.base_url,
                    api_key = COALESCE(EXCLUDED.api_key, ai_providers.api_key),
                    is_enabled = EXCLUDED.is_enabled,
                    configuration = EXCLUDED.configuration,
                    priority = EXCLUDED.priority,
                    updated_at = NOW()
                 RETURNING *`,
                [id, name, type, baseUrl, apiKey || null, isEnabled ? 1 : 0, configuration || {}, priority || 1]
            );
        } catch (error) {
            this.log.error('Error upserting AI provider:', error);
            throw error;
        }
    }

    /**
     * List all AI models.
     */
    async listAIModels() {
        try {
            return await this.query(
                `SELECT m.*, p.name as provider_name 
                 FROM ai_models m
                 JOIN ai_providers p ON m.provider_id = p.id
                 ORDER BY p.name ASC, m.name ASC`
            );
        } catch (error) {
            this.log.error('Error listing AI models:', error);
            throw error;
        }
    }

    /**
     * Upsert an AI model.
     */
    async upsertAIModel(model: any) {
        try {
            const { id, providerId, name, modelId, isEnabled } = model;
            return await this.query(
                `INSERT INTO ai_models (id, provider_id, name, model_id, is_enabled)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    model_id = EXCLUDED.model_id,
                    is_enabled = EXCLUDED.is_enabled
                 RETURNING *`,
                [id, providerId, name, modelId, isEnabled ? 1 : 0]
            );
        } catch (error) {
            this.log.error('Error upserting AI model:', error);
            throw error;
        }
    }

    /**
     * Get the active AI model configuration (Search Mode slotting).
     */
    async getAIModelConfigs() {
        try {
            return await this.query(
                `SELECT c.*, m.name as model_name, m.model_id as raw_model_id, p.name as provider_name
                 FROM ai_model_config c
                 JOIN ai_models m ON c.model_id = m.id
                 JOIN ai_providers p ON m.provider_id = p.id
                 ORDER BY c.search_mode, c.priority DESC`
            );
        } catch (error) {
            this.log.error('Error getting AI model configs:', error);
            throw error;
        }
    }

    /**
     * Upsert an AI model configuration slot.
     */
    async upsertAIModelConfig(config: any) {
        try {
            const { id, searchMode, modelType, modelId, priority } = config;
            return await this.query(
                `INSERT INTO ai_model_config (id, search_mode, model_type, model_id, priority)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE SET
                    search_mode = EXCLUDED.search_mode,
                    model_type = EXCLUDED.model_type,
                    model_id = EXCLUDED.model_id,
                    priority = EXCLUDED.priority
                 RETURNING *`,
                [id || `cfg_${Date.now()}`, searchMode, modelType, modelId, priority || 0]
            );
        } catch (error) {
            this.log.error('Error upserting AI model config:', error);
            throw error;
        }
    }
}
