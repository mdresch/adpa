/**
 * Document Ingestion Repository
 * Handles database operations for document ingestion and semantic knowledge graph
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import { pool } from '../../database/connection';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { ParsedDocument, DocumentSection } from './documentParserService';

export interface DocumentRecord {
  id: string;
  project_id: string;
  filename: string;
  format: 'pdf' | 'docx' | 'xlsx' | 'txt';
  parsed_content: string;
  metadata: Record<string, any>;
  parsing_confidence: number;
  parsing_errors: string[];
  raw_text_length: number;
  created_at: Date;
  created_by: string;
  updated_at: Date;
  updated_by: string;
}

export interface DocumentSectionRecord {
  id: string;
  document_id: string;
  heading: string | null;
  content: string;
  section_type: string;
  section_order: number;
  confidence: number;
  created_at: Date;
}

export interface IngestionQueueRecord {
  id: string;
  document_id: string;
  status: 'pending' | 'parsing' | 'extracting_entities' | 'building_graph' | 'completed' | 'failed';
  current_stage: string | null;
  progress_percentage: number;
  error_message: string | null;
  attempts: number;
  max_attempts: number;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
}

export class DocumentIngestionRepository {
  private db: Pool;

  constructor(dbPool: Pool = pool) {
    this.db = dbPool;
  }

  /**
   * Store a parsed document and its sections
   */
  async storeDocument(
    parsedDoc: ParsedDocument,
    projectId: string,
    userId: string
  ): Promise<DocumentRecord> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Store main document
      const docQuery = `
        INSERT INTO public.documents_raw (
          id, project_id, filename, format, parsed_content, metadata,
          parsing_confidence, parsing_errors, raw_text_length,
          created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (project_id, filename) 
        DO UPDATE SET
          parsed_content = $5,
          metadata = $6,
          parsing_confidence = $7,
          parsing_errors = $8,
          raw_text_length = $9,
          updated_by = $11,
          updated_at = NOW()
        RETURNING *;
      `;

      const docResult = await client.query<DocumentRecord>(docQuery, [
        parsedDoc.id,
        projectId,
        parsedDoc.filename,
        parsedDoc.format,
        parsedDoc.content,
        JSON.stringify(parsedDoc.metadata),
        parsedDoc.parsing_confidence,
        parsedDoc.parsing_errors,
        parsedDoc.raw_text_length,
        userId,
        userId,
      ]);

      const document = docResult.rows[0];

      // Store sections
      for (const section of parsedDoc.sections) {
        await client.query(
          `
          INSERT INTO public.document_sections (
            id, document_id, heading, content, section_type,
            section_order, confidence
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (document_id, section_order)
          DO UPDATE SET
            heading = $3,
            content = $4,
            section_type = $5,
            confidence = $7
          `,
          [
            section.id,
            document.id,
            section.heading || null,
            section.content,
            section.type,
            section.order,
            section.confidence,
          ]
        );
      }

      // Create ingestion queue entry
      await client.query(
        `
        INSERT INTO public.document_ingestion_queue (
          document_id, status, current_stage, progress_percentage
        )
        VALUES ($1, $2, $3, $4)
        `,
        [document.id, 'pending', 'queued', 0]
      );

      await client.query('COMMIT');
      return document;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to store document', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<DocumentRecord | null> {
    const result = await this.db.query<DocumentRecord>(
      `
      SELECT * FROM public.documents_raw WHERE id = $1
      `,
      [documentId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get all documents for a project
   */
  async getProjectDocuments(
    projectId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ documents: DocumentRecord[]; total: number }> {
    const countResult = await this.db.query<{ total: number }>(
      `
      SELECT COUNT(*)::int as total FROM public.documents_raw
      WHERE project_id = $1
      `,
      [projectId]
    );

    const docsResult = await this.db.query<DocumentRecord>(
      `
      SELECT * FROM public.documents_raw
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
      `,
      [projectId, limit, offset]
    );

    return {
      documents: docsResult.rows,
      total: countResult.rows[0]?.total || 0,
    };
  }

  /**
   * Get sections for a document
   */
  async getDocumentSections(
    documentId: string
  ): Promise<DocumentSectionRecord[]> {
    const result = await this.db.query<DocumentSectionRecord>(
      `
      SELECT * FROM public.document_sections
      WHERE document_id = $1
      ORDER BY section_order ASC
      `,
      [documentId]
    );
    return result.rows;
  }

  /**
   * Search sections by content (full-text search)
   */
  async searchSectionsByContent(
    projectId: string,
    query: string,
    limit: number = 20
  ): Promise<DocumentSectionRecord[]> {
    const result = await this.db.query<DocumentSectionRecord>(
      `
      SELECT ds.* FROM public.document_sections ds
      JOIN public.documents_raw dr ON ds.document_id = dr.id
      WHERE dr.project_id = $1
        AND to_tsvector('english', ds.content) @@ plainto_tsquery('english', $2)
      ORDER BY ts_rank(to_tsvector('english', ds.content), plainto_tsquery('english', $2)) DESC
      LIMIT $3
      `,
      [projectId, query, limit]
    );
    return result.rows;
  }

  /**
   * Update ingestion queue status
   */
  async updateIngestionStatus(
    documentId: string,
    status: IngestionQueueRecord['status'],
    stage?: string,
    progress?: number,
    error?: string
  ): Promise<void> {
    await this.db.query(
      `
      UPDATE public.document_ingestion_queue
      SET 
        status = $1,
        current_stage = $2,
        progress_percentage = COALESCE($3, progress_percentage),
        error_message = $4,
        attempts = CASE WHEN $1 = 'failed' THEN attempts + 1 ELSE attempts END
      WHERE document_id = $5
      `,
      [status, stage || null, progress ?? null, error || null, documentId]
    );
  }

  /**
   * Get ingestion queue status
   */
  async getIngestionStatus(
    documentId: string
  ): Promise<IngestionQueueRecord | null> {
    const result = await this.db.query<IngestionQueueRecord>(
      `
      SELECT * FROM public.document_ingestion_queue
      WHERE document_id = $1
      `,
      [documentId]
    );
    return result.rows[0] || null;
  }

  /**
   * Get pending documents for ingestion
   */
  async getPendingDocuments(
    limit: number = 10
  ): Promise<Array<{ documentId: string; projectId: string; filename: string }>> {
    const result = await this.db.query<{
      document_id: string;
      project_id: string;
      filename: string;
    }>(
      `
      SELECT diq.document_id, dr.project_id, dr.filename
      FROM public.document_ingestion_queue diq
      JOIN public.documents_raw dr ON diq.document_id = dr.id
      WHERE diq.status = 'pending'
        AND diq.attempts < diq.max_attempts
      ORDER BY diq.created_at ASC
      LIMIT $1
      `,
      [limit]
    );

    return result.rows.map((row) => ({
      documentId: row.document_id,
      projectId: row.project_id,
      filename: row.filename,
    }));
  }

  /**
   * Delete document and all related data
   */
  async deleteDocument(documentId: string): Promise<void> {
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');

      // Delete related records first (cascade constraints)
      await client.query(
        `
        DELETE FROM public.document_ingestion_queue
        WHERE document_id = $1
        `,
        [documentId]
      );

      await client.query(
        `
        DELETE FROM public.document_sections
        WHERE document_id = $1
        `,
        [documentId]
      );

      await client.query(
        `
        DELETE FROM public.documents_raw
        WHERE id = $1
        `,
        [documentId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get statistics for documents in a project
   */
  async getDocumentStats(projectId: string): Promise<{
    total_documents: number;
    total_sections: number;
    avg_confidence: number;
    formats: Record<string, number>;
  }> {
    const result = await this.db.query<{
      total_documents: number;
      total_sections: number;
      avg_confidence: number;
      formats: string;
    }>(
      `
      SELECT
        COUNT(DISTINCT dr.id)::int as total_documents,
        COUNT(DISTINCT ds.id)::int as total_sections,
        COALESCE(AVG(dr.parsing_confidence), 0)::float as avg_confidence,
        json_object_agg(dr.format, COUNT(dr.id)::text)::text as formats
      FROM public.documents_raw dr
      LEFT JOIN public.document_sections ds ON dr.id = ds.document_id
      WHERE dr.project_id = $1
      `,
      [projectId]
    );

    const row = result.rows[0];
    return {
      total_documents: row?.total_documents || 0,
      total_sections: row?.total_sections || 0,
      avg_confidence: row?.avg_confidence || 0,
      formats: row?.formats ? JSON.parse(row.formats) : {},
    };
  }
}

// Export singleton instance
export const documentIngestionRepository = new DocumentIngestionRepository();
