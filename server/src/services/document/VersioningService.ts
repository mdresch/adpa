/*
 * Document Versioning Service
 * 
 * Implements semantic versioning, version history tracking, and conflict detection
 * for documents in the ADPA system.
 */

import { pool } from '../../database/connection';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { io } from '../../server';
import { ConflictDetectionService } from './ConflictDetectionService';

/**
 * Change types for document versions
 */
export type ChangeType =
    | 'initial'
    | 'ai_regeneration'
    | 'manual_edit'
    | 'template_update'
    | 'rollback'
    | 'baseline_sync';

/**
 * Approval status for document versions
 */
export type ApprovalStatus =
    | 'pending'
    | 'approved'
    | 'rejected'
    | 'auto_approved';

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
 * Document version data
 */
export interface DocumentVersion {
    id: string;
    document_id: string;
    version: number;
    semantic_version: string;
    change_description: string;
    content: string;
    content_hash: string;
    created_by: string | null;
    created_at: Date;
    change_type: ChangeType;
    parent_version_id: string | null;
    approval_status: ApprovalStatus;
    approved_by: string | null;
    approved_at: Date | null;
    metadata: any;
}

/**
 * Document version creation options
 */
export interface CreateVersionOptions {
    content: string;
    userId: string;
    changeDescription?: string;
    parentVersionId?: string;
    metadata?: any;
    skipAudit?: boolean;
}

/**
 * Versioning service class
 */
export class VersioningService {
    private readonly MAJOR_THRESHOLD = 0.3; // 30% structural change
    private readonly MINOR_THRESHOLD = 0.1; // 10% content change

    /**
     * Generate SHA-256 hash of content
     */
    private generateContentHash(content: string): string {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Calculate content difference percentage
     */
    private calculateContentDifference(oldContent: string, newContent: string): number {
        // Simple implementation using character difference
        // In production, use a more sophisticated diff algorithm
        const oldLength = oldContent.length;
        const newLength = newContent.length;

        if (oldLength === 0) return 1.0; // 100% different if no old content

        // Count differing characters
        const minLength = Math.min(oldLength, newLength);
        let diffCount = 0;

        for (let i = 0; i < minLength; i++) {
            if (oldContent[i] !== newContent[i]) {
                diffCount++;
            }
        }

        // Add difference in length
        diffCount += Math.abs(oldLength - newLength);

        return diffCount / oldLength;
    }

    /**
     * Calculate semantic version based on change type and content difference
     */
    private async calculateSemanticVersion(
        documentId: string,
        changeType: ChangeType,
        newContent: string,
        currentVersion: DocumentVersion | null
    ): Promise<string> {
        if (!currentVersion) return "1.0.0";

        const [major, minor, patch] = currentVersion.semantic_version.split('.').map(Number);

        switch (changeType) {
            case 'template_update':
                return `${major + 1}.0.0`;

            case 'ai_regeneration':
                const contentDiff = this.calculateContentDifference(
                    currentVersion.content,
                    newContent
                );

                if (contentDiff > this.MAJOR_THRESHOLD) {
                    return `${major + 1}.0.0`;
                } else if (contentDiff > this.MINOR_THRESHOLD) {
                    return `${major}.${minor + 1}.0`;
                } else {
                    return `${major}.${minor}.${patch + 1}`;
                }

            case 'manual_edit':
            case 'rollback':
            case 'baseline_sync':
                return `${major}.${minor}.${patch + 1}`;

            case 'initial':
                return "1.0.0";

            default:
                return currentVersion.semantic_version;
        }
    }

    /**
     * Generate change description based on change type
     */
    private generateChangeDescription(changeType: ChangeType): string {
        const descriptions = {
            initial: 'Initial document creation',
            ai_regeneration: 'AI document regeneration',
            manual_edit: 'Manual document edit',
            template_update: 'Template update applied',
            rollback: 'Document rolled back to previous version',
            baseline_sync: 'Document synchronized with baseline'
        };

        return descriptions[changeType] || 'Document version update';
    }

    /**
     * Create a new document version
     */
    async createVersion(
        documentId: string,
        changeType: ChangeType,
        options: CreateVersionOptions
    ): Promise<DocumentVersion> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get current version
            const currentVersionResult = await client.query(
                `SELECT * FROM document_versions
         WHERE document_id = $1
         ORDER BY version DESC
         LIMIT 1`,
                [documentId]
            );

            const currentVersion = currentVersionResult.rows[0] || null;

            // 2. Calculate semantic version
            const semanticVersion = await this.calculateSemanticVersion(
                documentId,
                changeType,
                options.content,
                currentVersion
            );

            // 3. Calculate next version number
            const nextVersionNumber = currentVersion ? currentVersion.version + 1 : 1;

            // 4. Generate content hash
            const contentHash = this.generateContentHash(options.content);

            // 5. Create new version
            const newVersionId = uuidv4();
            const changeDescription = options.changeDescription || this.generateChangeDescription(changeType);

            const newVersionResult = await client.query(
                `INSERT INTO document_versions (
          id, document_id, version, semantic_version, change_description, 
          content, content_hash, created_by, change_type, parent_version_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
                [
                    newVersionId,
                    documentId,
                    nextVersionNumber,
                    semanticVersion,
                    changeDescription,
                    options.content,
                    contentHash,
                    options.userId || null,
                    changeType,
                    options.parentVersionId || (currentVersion ? currentVersion.id : null),
                    options.metadata || {}
                ]
            );

            const newVersion = newVersionResult.rows[0];

            // 6. Update document record
            await client.query(
                `UPDATE documents
         SET current_version_id = $1, semantic_version = $2, version = $3, updated_at = NOW()
         WHERE id = $4`,
                [newVersionId, semanticVersion, nextVersionNumber, documentId]
            );

            // 7. Create audit trail entry
            if (!options.skipAudit) {
                await client.query(
                    `INSERT INTO document_audit_trail (
            id, document_id, version_id, action_type, performed_by, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        uuidv4(),
                        documentId,
                        newVersionId,
                        this.mapChangeTypeToAction(changeType),
                        options.userId || null,
                        {
                            changeType,
                            semanticVersion,
                            contentHash,
                            parentVersionId: options.parentVersionId || (currentVersion ? currentVersion.id : null)
                        }
                    ]
                );
            }

            await client.query('COMMIT');

            // Emit real-time event
            io.to(`document:${documentId}`).emit('document:version_created', {
                documentId,
                versionId: newVersionId,
                versionNumber: nextVersionNumber,
                semanticVersion,
                changeType,
                createdAt: newVersion.created_at
            });

            logger.info(`Created new document version: ${documentId} v${semanticVersion}`, {
                documentId,
                versionId: newVersionId,
                changeType,
                contentLength: options.content.length
            });

            return newVersion;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Failed to create document version: ${error}`, {
                documentId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Map change type to audit action type
     */
    private mapChangeTypeToAction(changeType: ChangeType): string {
        const mapping: Record<ChangeType, string> = {
            initial: 'create',
            ai_regeneration: 'regenerate',
            manual_edit: 'update',
            template_update: 'update',
            rollback: 'rollback',
            baseline_sync: 'baseline_sync'
        };

        return mapping[changeType] || 'update';
    }

    /**
     * Get current version of a document
     */
    async getCurrentVersion(documentId: string): Promise<DocumentVersion | null> {
        const result = await pool.query(
            `SELECT * FROM document_versions
       WHERE document_id = $1
       ORDER BY version DESC
       LIMIT 1`,
            [documentId]
        );

        return result.rows[0] || null;
    }

    /**
     * Get version history for a document
     */
    async getVersionHistory(
        documentId: string,
        limit: number = 20,
        offset: number = 0
    ): Promise<DocumentVersion[]> {
        const result = await pool.query(
            `SELECT * FROM document_versions
       WHERE document_id = $1
       ORDER BY version DESC
       LIMIT $2 OFFSET $3`,
            [documentId, limit, offset]
        );

        return result.rows;
    }

    /**
     * Get a specific version by ID
     */
    async getVersionById(versionId: string): Promise<DocumentVersion | null> {
        const result = await pool.query(
            `SELECT * FROM document_versions WHERE id = $1`,
            [versionId]
        );

        return result.rows[0] || null;
    }

    /**
     * Get a specific version by semantic version
     */
    async getVersionBySemanticVersion(
        documentId: string,
        semanticVersion: string
    ): Promise<DocumentVersion | null> {
        const result = await pool.query(
            `SELECT * FROM document_versions
       WHERE document_id = $1 AND semantic_version = $2`,
            [documentId, semanticVersion]
        );

        return result.rows[0] || null;
    }

    /**
     * Rollback to a specific version
     */
    async rollbackToVersion(
        documentId: string,
        versionId: string,
        userId: string,
        notes?: string
    ): Promise<DocumentVersion> {
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get the target version
            const targetVersionResult = await client.query(
                `SELECT * FROM document_versions WHERE id = $1`,
                [versionId]
            );

            if (targetVersionResult.rows.length === 0) {
                throw new Error(`Version ${versionId} not found`);
            }

            const targetVersion = targetVersionResult.rows[0];

            // 2. Create a new version with the rolled back content
            const newVersionId = uuidv4();

            const newVersionResult = await client.query(
                `INSERT INTO document_versions (
          id, document_id, version_number, semantic_version, change_description, 
          content, content_hash, created_by, change_type, parent_version_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
                [
                    newVersionId,
                    documentId,
                    targetVersion.version + 1, // Increment from the rolled back version
                    targetVersion.semantic_version, // Keep same semantic version
                    `Rollback to version ${targetVersion.version}: ${notes || 'No notes provided'}`,
                    targetVersion.content,
                    targetVersion.content_hash,
                    userId,
                    'rollback',
                    targetVersion.id,
                    {
                        rollbackFrom: targetVersion.id,
                        rollbackReason: notes,
                        originalVersionNumber: targetVersion.version
                    }
                ]
            );

            const newVersion = newVersionResult.rows[0];

            // 3. Update document record
            await client.query(
                `UPDATE documents
         SET current_version_id = $1, semantic_version = $2, version = $3, updated_at = NOW()
         WHERE id = $4`,
                [newVersionId, newVersion.semantic_version, newVersion.version, documentId]
            );

            // 4. Create audit trail entry
            await client.query(
                `INSERT INTO document_audit_trail (
          id, document_id, version_id, action_type, performed_by, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    uuidv4(),
                    documentId,
                    newVersionId,
                    'rollback',
                    userId,
                    {
                        rollbackFromVersion: targetVersion.id,
                        rollbackToContentHash: targetVersion.content_hash,
                        notes
                    }
                ]
            );

            await client.query('COMMIT');

            // Emit real-time event
            io.to(`document:${documentId}`).emit('document:rollback', {
                documentId,
                versionId: newVersionId,
                rolledBackFrom: targetVersion.id,
                rolledBackTo: targetVersion.version,
                semanticVersion: newVersion.semantic_version,
                performedBy: userId
            });

            logger.info(`Document rolled back: ${documentId} to version ${targetVersion.version}`, {
                documentId,
                rollbackFrom: targetVersion.id,
                rollbackTo: targetVersion.version
            });

            return newVersion;
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`Failed to rollback document: ${error}`, {
                documentId,
                versionId,
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Compare two document versions
     */
    async compareVersions(
        documentId: string,
        versionId1: string,
        versionId2: string
    ): Promise<any> {
        const version1 = await this.getVersionById(versionId1);
        const version2 = await this.getVersionById(versionId2);

        if (!version1 || !version2) {
            throw new Error('One or both versions not found');
        }

        if (version1.document_id !== documentId || version2.document_id !== documentId) {
            throw new Error('Versions do not belong to the same document');
        }

        // Simple diff implementation - in production use a proper diff library
        const diff = {
            documentId,
            version1: {
                id: version1.id,
                versionNumber: version1.version,
                semanticVersion: version1.semantic_version,
                changeType: version1.change_type,
                createdAt: version1.created_at
            },
            version2: {
                id: version2.id,
                versionNumber: version2.version,
                semanticVersion: version2.semantic_version,
                changeType: version2.change_type,
                createdAt: version2.created_at
            },
            contentDiff: this.calculateContentDifference(version1.content, version2.content),
            changeSummary: this.generateChangeSummary(version1, version2)
        };

        return diff;
    }

    /**
     * Generate change summary between versions
     */
    private generateChangeSummary(version1: DocumentVersion, version2: DocumentVersion): string {
        const changes = [];

        if (version1.change_type !== version2.change_type) {
            changes.push(`Change type: ${version1.change_type} → ${version2.change_type}`);
        }

        if (version1.semantic_version !== version2.semantic_version) {
            changes.push(`Version: ${version1.semantic_version} → ${version2.semantic_version}`);
        }

        const contentDiff = this.calculateContentDifference(version1.content, version2.content);
        changes.push(`Content difference: ${Math.round(contentDiff * 100)}%`);

        return changes.join(', ');
    }

    /**
     * Initialize versioning for a document (create initial version)
     */
    async initializeVersioning(
        documentId: string,
        content: string,
        userId: string,
        templateId?: string
    ): Promise<DocumentVersion> {
        return this.createVersion(documentId, 'initial', {
            content,
            userId,
            changeDescription: 'Initial document version',
            metadata: {
                initialVersion: true,
                templateId: templateId || null
            }
        });
    }

    /**
     * Create document from template with versioning and conflict detection
     */
    async createDocumentFromTemplate(
        templateId: string,
        projectId: string,
        options: {
            userId: string;
            content: string;
            documentName: string;
            metadata?: any;
        }
    ): Promise<any> {
        const log = logger.child({ projectId, templateId });
        const conflictService = new ConflictDetectionService();
        const versioningService = new VersioningService();

        try {
            // 1. Check for template conflicts
            const conflictResult = await conflictService.detectTemplateConflicts(
                templateId,
                projectId,
                { userId: options.userId }
            );

            if (conflictResult.conflict && conflictResult.autoResolution !== 'overwrite') {
                // Create conflict record
                const conflictId = await conflictService.createConflictRecord(
                    templateId,
                    projectId,
                    options.userId,
                    conflictResult
                );

                return {
                    conflict: true,
                    conflictId,
                    conflictResult
                };
            }

            // 2. Handle auto-resolution or no conflict
            let documentId = uuidv4();
            let isUpdate = false;

            if (conflictResult.autoResolution === 'overwrite' && conflictResult.existingDocuments && conflictResult.existingDocuments.length > 0) {
                documentId = conflictResult.existingDocuments[0].id;
                isUpdate = true;
            }

            if (isUpdate) {
                // Create new version for existing document
                const version = await versioningService.createVersion(documentId, 'template_update', {
                    content: options.content,
                    userId: options.userId,
                    changeDescription: `Template conflict auto-resolved: overwrite`,
                    metadata: {
                        templateId,
                        autoResolved: true,
                        ...options.metadata
                    }
                });

                return {
                    success: true,
                    documentId,
                    versionId: version.id,
                    semanticVersion: version.semantic_version
                };
            } else {
                // Calculate metrics
                const wordCount = options.content.split(/\s+/).filter(Boolean).length;
                const characterCount = options.content.length;

                // Extract template metadata if available
                const templateVersion = options.metadata?.version || options.metadata?.template_version || '1.0.0';
                const templateAuthor = options.metadata?.created_by_email || options.metadata?.template_author || null;
                const templateFramework = options.metadata?.framework || options.metadata?.template_framework || null;
                const templateCategory = options.metadata?.category || options.metadata?.template_category || null;
                const templateComplexity = options.metadata?.complexity || options.metadata?.template_complexity || 'medium';

                // Create new document
                const result = await pool.query(
                    `INSERT INTO documents (
                        id, project_id, name, content, template_id, status, created_by, updated_by,
                        word_count, character_count, version, semantic_version,
                        template_version, template_author, template_framework, template_category, 
                        template_complexity, template_metadata
                    ) VALUES ($1, $2, $3, $4, $5, 'draft', $6, $6, $7, $8, 1, '1.0.0', $9, $10, $11, $12, $13, $14)
                    RETURNING *`,
                    [
                        documentId,
                        projectId,
                        options.documentName,
                        options.content,
                        templateId,
                        options.userId,
                        wordCount,
                        characterCount,
                        templateVersion,
                        templateAuthor,
                        templateFramework,
                        templateCategory,
                        templateComplexity,
                        options.metadata ? JSON.stringify(options.metadata) : null
                    ]
                );

                // Initialize versioning
                const version = await this.initializeVersioning(
                    documentId,
                    options.content,
                    options.userId,
                    templateId
                );

                return {
                    success: true,
                    documentId,
                    versionId: version.id,
                    semanticVersion: version.semantic_version,
                    document: result.rows[0]
                };
            }
        } catch (error) {
            log.error('Failed to create document from template:', error);
            throw error;
        }
    }
}