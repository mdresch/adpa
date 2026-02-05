"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const logger_1 = require("../utils/logger");
class SupabaseService {
    constructor() {
        this.config = this.getConfig();
        this.supabase = (0, supabase_js_1.createClient)(this.config.url, this.config.anonKey);
    }
    getConfig() {
        return {
            url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
            anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
            serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
        };
    }
    /**
     * Get all projects
     */
    async getProjects() {
        try {
            const { data, error } = await this.supabase
                .from('projects')
                .select(`
          id,
          name,
          description,
          framework,
          status,
          priority,
          start_date,
          end_date,
          budget,
          owner_id,
          created_by,
          team_members,
          settings,
          metadata,
          created_at,
          updated_at
        `)
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.logger.error('Error fetching projects:', error);
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Database error in getProjects:', error);
            throw error;
        }
    }
    /**
     * Get documents for a project
     */
    async getProjectDocuments(projectId) {
        try {
            const { data, error } = await this.supabase
                .from('documents')
                .select(`
          id,
          project_id,
          name,
          content,
          template_id,
          version,
          status,
          file_path,
          mime_type,
          file_size,
          metadata,
          created_at,
          updated_at
        `)
                .eq('project_id', projectId)
                .order('created_at', { ascending: false });
            if (error) {
                logger_1.logger.error('Error fetching documents:', error);
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Database error in getProjectDocuments:', error);
            throw error;
        }
    }
    /**
     * Get document chunks/semantic units
     */
    async getDocumentChunks(documentId) {
        try {
            const { data, error } = await this.supabase
                .from('document_chunks')
                .select('*')
                .eq('document_id', documentId)
                .order('chunk_index', { ascending: true });
            if (error) {
                logger_1.logger.error('Error fetching document chunks:', error);
                throw error;
            }
            return data || [];
        }
        catch (error) {
            logger_1.logger.error('Database error in getDocumentChunks:', error);
            throw error;
        }
    }
    /**
     * Create semantic units from document chunks
     */
    async getDocumentSemanticUnits(documentId) {
        try {
            // First try to get existing semantic units
            const { data: existingUnits, error: unitsError } = await this.supabase
                .from('semantic_units')
                .select('*')
                .eq('document_id', documentId)
                .order('created_at', { ascending: true });
            if (unitsError) {
                logger_1.logger.error('Error fetching semantic units:', unitsError);
                throw unitsError;
            }
            if (existingUnits && existingUnits.length > 0) {
                return existingUnits;
            }
            // If no semantic units exist, create them from chunks
            const chunks = await this.getDocumentChunks(documentId);
            const semanticUnits = chunks.map((chunk, index) => ({
                id: `su-${documentId}-${index}`,
                document_id: documentId,
                content: chunk.content,
                type: 'text_chunk',
                confidence: 0.85,
                metadata: {
                    chunk_index: chunk.chunk_index,
                    start_position: chunk.start_position,
                    end_position: chunk.end_position,
                    word_count: chunk.word_count,
                    document_id: documentId
                },
                entities: [], // Would be populated by entity extraction
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }));
            // Insert the semantic units
            if (semanticUnits.length > 0) {
                const { error: insertError } = await this.supabase
                    .from('semantic_units')
                    .insert(semanticUnits)
                    .select('*');
                if (insertError) {
                    logger_1.logger.error('Error inserting semantic units:', insertError);
                    throw insertError;
                }
                // Return the inserted data
                const { data: insertedUnits } = await this.supabase
                    .from('semantic_units')
                    .select('*')
                    .eq('document_id', documentId)
                    .order('created_at', { ascending: true });
                return insertedUnits || [];
            }
            return [];
        }
        catch (error) {
            logger_1.logger.error('Database error in getDocumentSemanticUnits:', error);
            throw error;
        }
    }
    /**
     * Get a specific project by ID
     */
    async getProjectById(projectId) {
        try {
            const { data, error } = await this.supabase
                .from('projects')
                .select('*')
                .eq('id', projectId)
                .single();
            if (error) {
                logger_1.logger.error('Error fetching project:', error);
                throw error;
            }
            return data;
        }
        catch (error) {
            logger_1.logger.error('Database error in getProjectById:', error);
            throw error;
        }
    }
    /**
     * Test database connection
     */
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('projects')
                .select('id')
                .limit(1);
            if (error) {
                logger_1.logger.error('Supabase connection test failed:', error);
                return false;
            }
            logger_1.logger.info('Supabase connection test successful');
            return true;
        }
        catch (error) {
            logger_1.logger.error('Supabase connection error:', error);
            return false;
        }
    }
}
exports.SupabaseService = SupabaseService;
//# sourceMappingURL=supabaseService.js.map