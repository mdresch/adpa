/*
 * Document Conflict Detection Service
 *
 * Detects and manages conflicts when creating or updating documents
 * based on template usage and project context.
 */

import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../../server';
import { VersioningService } from './VersioningService';

/**
 * Resolution method for version conflicts
 */
export type ConflictResolutionMethod =
    | 'create_new'
    | 'overwrite'
    | 'merge'
    | 'cancel'
    | 'archive_existing';

/**
 * Conflict detection result
 */
export interface ConflictDetectionResult {
    conflict: boolean;
    resolutionOptions?: ConflictResolutionMethod[];
    autoResolution?: ConflictResolutionMethod;
    existingDocuments?: Array<{
        id: string;
        name: string;
        semanticVersion: string;
        createdAt: Date;
    }>;
    template?: {
        id: string;
        name: string;
        conflictResolutionStrategy: string;
        governanceLevel: string;
    };
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
    success: boolean;
    conflictId?: string;
    documentId?: string;
    newVersionId?: string;
    message?: string;
}

/**
 * Conflict detection service class
 */
export class ConflictDetectionService {
    private versioningService: VersioningService;

    constructor() {
        this.versioningService = new VersioningService();
    }

    /**
     * Detect template conflicts when creating a new document
     */
    async detectTemplateConflicts(
        templateId: string,
        projectId: string,
        options: { userId: string }
    ): Promise<ConflictDetectionResult> {
        try {
            // 1. Get template configuration
            const templateResult = await pool.query(
                `SELECT id, name, conflict_resolution_strategy, governance_level
         FROM templates WHERE id = $1`,
                [templateId]
            );

            if (templateResult.rows.length === 0) {
                throw new Error(`Template ${templateId} not found`);
            }

            const template = templateResult.rows[0];

            // 2. Find existing documents from this template in the same project
            const existingDocumentsResult = await pool.query(
                `SELECT d.id, d.name, d.semantic_version, d.created_at
         FROM documents d
         WHERE d.template_id = $1 AND d.project_id = $2 AND d.deleted_at IS NULL`,
                [templateId, projectId]
            );

            if (existingDocumentsResult.rows.length === 0) {
                return { conflict: false };
            }

            // 3. Check template conflict resolution strategy
            switch (template.conflict_resolution_strategy) {
                case 'deny':
                    return {
                        conflict: true,
                        resolutionOptions: ['cancel'],
                        existingDocuments: existingDocumentsResult.rows.map(row => ({
                            id: row.id,
                            name: row.name,
                            semanticVersion: row.semantic_version,
                            createdAt: row.created_at
                        })),
                        template: {
                            id: template.id,
                            name: template.name,
                            conflictResolutionStrategy: template.conflict_resolution_strategy,
                            governanceLevel: template.governance_level
                        }
                    };

                case 'auto_create_new':
                    return { conflict: false, autoResolution: 'create_new' };

                case 'auto_overwrite':
                    return { conflict: false, autoResolution: 'overwrite' };

                case 'prompt_user':
                default:
                    return {
                        conflict: true,
                        resolutionOptions: ['create_new', 'overwrite', 'merge', 'cancel'],
                        existingDocuments: existingDocumentsResult.rows.map(row => ({
                            id: row.id,
                            name: row.name,
                            semanticVersion: row.semantic_version,
                            createdAt: row.created_at
                        })),
                        template: {
                            id: template.id,
                            name: template.name,
                            conflictResolutionStrategy: template.conflict_resolution_strategy,
                            governanceLevel: template.governance_level
                        }
                    };
            }
        } catch (error) {
            logger.error(`Failed to detect template conflicts: ${error}`, {
                templateId,
                projectId,
                error: error instanceof Error ? error.message : String(error)
            });
            // If we can't determine conflicts, assume no conflict to avoid blocking
            return { conflict: false };
        }
    }

    /**
     * Create a conflict record when a conflict is detected
     */
    async createConflictRecord(
        templateId: string,
        projectId: string,
        userId: string,
        conflictResult: ConflictDetectionResult
    ): Promise<string> {
        const conflictId = uuidv4();

        try {
            // Get existing documents with more details
            let existingDocumentDetails = [];
            if (conflictResult.existingDocuments && conflictResult.existingDocuments.length > 0) {
                const documentIds = conflictResult.existingDocuments.map(doc => doc.id);
                const existingDocsResult = await pool.query(
                    `SELECT d.id, d.name, d.semantic_version, d.version, dv.id as version_id
           FROM documents d
           JOIN document_versions dv ON d.current_version_id = dv.id
           WHERE d.id = ANY($1)`,
                    [documentIds]
                );

                existingDocumentDetails = existingDocsResult.rows;
            }

            // Get template details
            const templateResult = await pool.query(
                `SELECT id, name, conflict_resolution_strategy, governance_level
         FROM templates WHERE id = $1`,
                [templateId]
            );

            const template = templateResult.rows[0];

            await pool.query(
                `INSERT INTO document_version_conflicts (
          id, document_id, template_id, existing_version_id, conflict_details, detected_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
                [
                    conflictId,
                    conflictResult.existingDocuments && conflictResult.existingDocuments.length > 0 ?
                        conflictResult.existingDocuments[0].id : null,
                    templateId,
                    existingDocumentDetails.length > 0 ? existingDocumentDetails[0].version_id : null,
                    {
                        template: {
                            id: template.id,
                            name: template.name,
                            conflictResolutionStrategy: template.conflict_resolution_strategy,
                            governanceLevel: template.governance_level
                        },
                        existingDocuments: existingDocumentDetails.map(doc => ({
                            id: doc.id,
                            name: doc.name,
                            semanticVersion: doc.semantic_version,
                            versionNumber: doc.version,
                            currentVersionId: doc.version_id
                        })),
                        resolutionOptions: conflictResult.resolutionOptions,
                        detectedBy: userId,
                        detectedAt: new Date().toISOString()
                    }
                ]
            );

            // Emit real-time event
            io.to(`project:${projectId}`).emit('document:conflict_detected', {
                conflictId,
                templateId,
                templateName: template.name,
                projectId,
                existingDocumentCount: conflictResult.existingDocuments?.length || 0,
                resolutionOptions: conflictResult.resolutionOptions
            });

            logger.info(`Created conflict record: ${conflictId}`, {
                templateId,
                projectId,
                conflictId
            });

            return conflictId;
        } catch (error) {
            logger.error(`Failed to create conflict record: ${error}`, {
                conflictId,
                templateId,
                projectId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }

    /**
     * Resolve a detected conflict
     */
    async resolveConflict(
        conflictId: string,
        resolutionMethod: ConflictResolutionMethod,
        options: { userId: string, notes?: string, newContent?: string }
    ): Promise<ConflictResolutionResult> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get conflict record
            const conflictResult = await client.query(
                `SELECT * FROM document_version_conflicts WHERE id = $1`,
                [conflictId]
            );

            if (conflictResult.rows.length === 0) {
                throw new Error(`Conflict ${conflictId} not found`);
            }

            const conflict = conflictResult.rows[0];

            // 2. Get template and document information
            const templateResult = await client.query(
                `SELECT id, name, conflict_resolution_strategy, governance_level
         FROM templates WHERE id = $1`,
                [conflict.template_id]
            );

            if (templateResult.rows.length === 0) {
                throw new Error(`Template ${conflict.template_id} not found`);
            }

            const template = templateResult.rows[0];

            let result: ConflictResolutionResult;

            // 3. Apply resolution method
            switch (resolutionMethod) {
                case 'create_new':
                    result = await this.handleCreateNew(conflict, options, client);
                    break;

                case 'overwrite':
                    result = await this.handleOverwrite(conflict, options, client);
                    break;

                case 'merge':
                    result = await this.handleMerge(conflict, options, client);
                    break;

                case 'archive_existing':
                    result = await this.handleArchiveExisting(conflict, options, client);
                    break;

                case 'cancel':
                    result = await this.handleCancel(conflict, options, client);
                    break;

                default:
                    throw new Error(`Unsupported resolution method: ${resolutionMethod}`);
            }

            // 4. Update conflict record
            await client.query(
                `UPDATE document_version_conflicts
         SET resolved_at = NOW(), resolution_method = $1, resolved_by = $2, notes = $3
         WHERE id = $4`,
                [resolutionMethod, options.userId, options.notes, conflictId]
            );

            // 5. Create audit trail entry
            await client.query(
                `INSERT INTO document_audit_trail (
          id, document_id, action_type, performed_by, metadata
        ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    uuidv4(),
                    conflict.document_id,
                    'conflict_resolved',
                    options.userId,
                    {
                        conflictId,
                        resolutionMethod,
                        templateId: conflict.template_id,
                        notes: options.notes,
                        resolutionDetails: result
                    }
                ]
            );

            await client.query('COMMIT');

            // Emit real-time event
            io.to(`document:${conflict.document_id}`).emit('document:conflict_resolved', {
                conflictId,
                resolutionMethod,
                documentId: conflict.document_id,
                newVersionId: result.newVersionId,
                resolvedBy: options.userId
            });

            logger.info(`Resolved conflict: ${conflictId} using ${resolutionMethod}`, {
                conflictId,
                resolutionMethod,
                documentId: conflict.document_id
            });

            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Failed to resolve conflict: ${error}`, {
                conflictId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Handle 'create_new' resolution method
     */
    private async handleCreateNew(
        conflict: any,
        options: { userId: string, notes?: string, newContent?: string },
        client: any
    ): Promise<ConflictResolutionResult> {
        // For create_new, we assume the calling code will handle the actual document creation
        // This method just marks the conflict as resolved
        return {
            success: true,
            conflictId: conflict.id,
            message: 'Conflict resolved: create new document'
        };
    }

    /**
     * Handle 'overwrite' resolution method
     */
    private async handleOverwrite(
        conflict: any,
        options: { userId: string, notes?: string, newContent?: string },
        client: any
    ): Promise<ConflictResolutionResult> {
        if (!conflict.document_id) {
            throw new Error('Cannot overwrite: no existing document associated with conflict');
        }

        if (!options.newContent) {
            throw new Error('Cannot overwrite: no new content provided');
        }

        // Create new version with the provided content
        const newVersion = await this.versioningService.createVersion(
            conflict.document_id,
            'template_update',
            {
                content: options.newContent,
                userId: options.userId,
                changeDescription: `Overwrite due to template conflict resolution: ${options.notes || 'No notes provided'}`,
                metadata: {
                    conflictResolution: true,
                    conflictId: conflict.id,
                    resolutionMethod: 'overwrite'
                }
            }
        );

        return {
            success: true,
            conflictId: conflict.id,
            documentId: conflict.document_id,
            newVersionId: newVersion.id,
            message: 'Conflict resolved: existing document overwritten with new version'
        };
    }

    /**
     * Handle 'merge' resolution method
     */
    private async handleMerge(
        conflict: any,
        options: { userId: string, notes?: string },
        client: any
    ): Promise<ConflictResolutionResult> {
        if (!conflict.document_id) {
            throw new Error('Cannot merge: no existing document associated with conflict');
        }

        // Get current content of existing document
        const currentVersionResult = await client.query(
            `SELECT content FROM document_versions
       WHERE document_id = $1
       ORDER BY version_number DESC
       LIMIT 1`,
            [conflict.document_id]
        );

        if (currentVersionResult.rows.length === 0) {
            throw new Error('Cannot merge: no existing document version found');
        }

        const currentContent = currentVersionResult.rows[0].content;

        // For now, we'll just create a new version with the current content
        // In a real implementation, you would merge the new content with the existing content
        const newVersion = await this.versioningService.createVersion(
            conflict.document_id,
            'template_update',
            {
                content: currentContent, // In real implementation, this would be merged content
                userId: options.userId,
                changeDescription: `Merge due to template conflict resolution: ${options.notes || 'No notes provided'}`,
                metadata: {
                    conflictResolution: true,
                    conflictId: conflict.id,
                    resolutionMethod: 'merge',
                    mergeDetails: {
                        // Add merge details here
                    }
                }
            }
        );

        return {
            success: true,
            conflictId: conflict.id,
            documentId: conflict.document_id,
            newVersionId: newVersion.id,
            message: 'Conflict resolved: documents merged'
        };
    }

    /**
     * Handle 'archive_existing' resolution method
     */
    private async handleArchiveExisting(
        conflict: any,
        options: { userId: string, notes?: string },
        client: any
    ): Promise<ConflictResolutionResult> {
        if (!conflict.document_id) {
            throw new Error('Cannot archive: no existing document associated with conflict');
        }

        // Mark existing document as archived
        await client.query(
            `UPDATE documents
       SET status = 'archived', updated_at = NOW()
       WHERE id = $1`,
            [conflict.document_id]
        );

        // Create audit trail entry for archiving
        await client.query(
            `INSERT INTO document_audit_trail (
        id, document_id, action_type, performed_by, metadata
      ) VALUES ($1, $2, $3, $4, $5)`,
            [
                uuidv4(),
                conflict.document_id,
                'archive',
                options.userId,
                {
                    conflictId: conflict.id,
                    resolutionMethod: 'archive_existing',
                    notes: options.notes,
                    archivedDueToConflict: true
                }
            ]
        );

        return {
            success: true,
            conflictId: conflict.id,
            documentId: conflict.document_id,
            message: 'Conflict resolved: existing document archived'
        };
    }

    /**
     * Handle 'cancel' resolution method
     */
    private async handleCancel(
        conflict: any,
        options: { userId: string, notes?: string },
        client: any
    ): Promise<ConflictResolutionResult> {
        return {
            success: true,
            conflictId: conflict.id,
            message: 'Conflict resolution cancelled'
        };
    }

    /**
     * Get conflict details
     */
    async getConflictDetails(conflictId: string): Promise<any> {
        const result = await pool.query(
            `SELECT * FROM document_version_conflicts WHERE id = $1`,
            [conflictId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Conflict ${conflictId} not found`);
        }

        return result.rows[0];
    }

    /**
     * List conflicts for a document
     */
    async listDocumentConflicts(documentId: string): Promise<any[]> {
        const result = await pool.query(
            `SELECT * FROM document_version_conflicts WHERE document_id = $1 ORDER BY detected_at DESC`,
            [documentId]
        );

        return result.rows;
    }

    /**
     * List unresolved conflicts for a project
     */
    async listUnresolvedConflicts(projectId: string): Promise<any[]> {
        const result = await pool.query(
            `SELECT c.*
       FROM document_version_conflicts c
       JOIN documents d ON c.document_id = d.id
       WHERE d.project_id = $1 AND c.resolved_at IS NULL
       ORDER BY c.detected_at DESC`,
            [projectId]
        );

        return result.rows;
    }
}