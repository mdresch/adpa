import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
}

export class SupabaseService {
  private supabase: any;
  private config: SupabaseConfig;

  constructor() {
    this.config = this.getConfig();
    this.supabase = createClient(this.config.url, this.config.anonKey);
  }

  private getConfig(): SupabaseConfig {
    return {
      url: process.env.SUPABASE_URL || 'https://your-project.supabase.co',
      anonKey: process.env.SUPABASE_ANON_KEY || 'your-anon-key',
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key'
    };
  }

  /**
   * Get all projects
   */
  async getProjects(): Promise<any[]> {
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
        logger.error('Error fetching projects:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Database error in getProjects:', error);
      throw error;
    }
  }

  /**
   * Get documents for a project
   */
  async getProjectDocuments(projectId: string): Promise<any[]> {
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
        logger.error('Error fetching documents:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Database error in getProjectDocuments:', error);
      throw error;
    }
  }

  /**
   * Get document chunks/semantic units
   */
  async getDocumentChunks(documentId: string): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from('document_chunks')
        .select('*')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true });

      if (error) {
        logger.error('Error fetching document chunks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      logger.error('Database error in getDocumentChunks:', error);
      throw error;
    }
  }

  /**
   * Create semantic units from document chunks
   */
  async getDocumentSemanticUnits(documentId: string): Promise<any[]> {
    try {
      // First try to get existing semantic units
      const { data: existingUnits, error: unitsError } = await this.supabase
        .from('semantic_units')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: true });

      if (unitsError) {
        logger.error('Error fetching semantic units:', unitsError);
        throw unitsError;
      }

      if (existingUnits && existingUnits.length > 0) {
        return existingUnits;
      }

      // If no semantic units exist, create them from chunks
      const chunks = await this.getDocumentChunks(documentId);
      
      const semanticUnits = chunks.map((chunk: any, index: number) => ({
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
          logger.error('Error inserting semantic units:', insertError);
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
    } catch (error) {
      logger.error('Database error in getDocumentSemanticUnits:', error);
      throw error;
    }
  }

  /**
   * Get a specific project by ID
   */
  async getProjectById(projectId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        logger.error('Error fetching project:', error);
        throw error;
      }

      return data;
    } catch (error) {
      logger.error('Database error in getProjectById:', error);
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from('projects')
        .select('id')
        .limit(1);

      if (error) {
        logger.error('Supabase connection test failed:', error);
        return false;
      }

      logger.info('Supabase connection test successful');
      return true;
    } catch (error) {
      logger.error('Supabase connection error:', error);
      return false;
    }
  }
}
