import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import archiver from 'archiver';
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    HeadingLevel,
    Table,
    TableRow,
    TableCell,
    WidthType,
    AlignmentType,
    ShadingType,
} from "docx";

import { DocumentRepository } from './DocumentRepository';
import { AuthRepository } from '../auth/AuthRepository';
import { ProjectRepository } from '../projects/ProjectRepository';
import { childLogger } from '../../utils/logger';
import { cache } from '../../utils/redis';
import { trackActivity } from '../../middleware/analyticsMiddleware';
import AuditService from '../../services/auditService';
import { markdownToPdf } from '../../utils/pdfGenerator';
import { storageArchivalService } from '../../services/storageArchivalService';
import { extractionQueue } from '../../services/queueService';
import { pool } from '../../database/connection';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class DocumentsController {
    private static _documentRepository: DocumentRepository;
    private static get documentRepository() {
        if (!this._documentRepository) this._documentRepository = new DocumentRepository();
        return this._documentRepository;
    }

    private static _authRepository: AuthRepository;
    private static get authRepository() {
        if (!this._authRepository) this._authRepository = new AuthRepository();
        return this._authRepository;
    }

    private static _projectRepository: ProjectRepository;
    private static get projectRepository() {
        if (!this._projectRepository) this._projectRepository = new ProjectRepository();
        return this._projectRepository;
    }

    /**
     * GET /api/v1/documents/project/:projectId
     */
    public static async getProjectDocuments(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { projectId } = req.params;
            const { page = 1, limit = 10, status, search, template, framework, grade } = req.query;

            const hasAccess = await DocumentsController.checkProjectAccess(req, projectId);
            if (!hasAccess) {
                return res.status(403).json({ error: "Access denied to project" });
            }

            const offset = (Number(page) - 1) * Number(limit);
            const { rows: documents, total } = await DocumentsController.documentRepository.findByProjectId(projectId, {
                limit: Number(limit),
                offset,
                status: status as string,
                search: search as string,
                template: template as string,
                framework: framework as string,
                grade: grade as string
            });

            const parsedDocuments = documents.map(doc => {
                if (doc.generation_metadata && typeof doc.generation_metadata === 'string') {
                    try { doc.generation_metadata = JSON.parse(doc.generation_metadata); } catch (e) { }
                }
                return doc;
            });

            res.json({
                documents: parsedDocuments,
                pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) }
            });
        } catch (error) {
            log.error("Get project documents error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * GET /api/v1/documents/:id
     */
    public static async getById(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { id } = req.params;
            const cacheKey = `document:${id}`;
            const cached = await cache.get(cacheKey);
            if (cached) return res.json({ document: cached });

            const result = await DocumentsController.documentRepository.findById(id);
            if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });

            const document = result.rows[0];
            const hasAccess = await DocumentsController.checkProjectAccess(req, document.project_id);
            if (!hasAccess) return res.status(403).json({ error: "Access denied" });

            if (document.generation_metadata && typeof document.generation_metadata === 'string') {
                try { document.generation_metadata = JSON.parse(document.generation_metadata); } catch (e) { }
            }

            await cache.set(cacheKey, document, 1800);
            if (req.user?.id) trackActivity.viewDocument(req.user.id, document.id, document.project_id);
            
            await AuditService.log({
                table: 'documents', rowId: document.id, action: 'read',
                ctx: { userId: req.user?.id, ip: req.ip, requestId: (req as any).requestId }
            });

            res.json({ document });
        } catch (error) {
            log.error("Get document error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * POST /api/v1/documents/project/:projectId
     */
    public static async create(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { projectId } = req.params;
            const { name, content, template_id, status = "draft", generation_metadata } = req.body;

            const hasAccess = await DocumentsController.checkProjectAccess(req, projectId, true);
            if (!hasAccess) return res.status(403).json({ error: "Access denied to project" });

            let contentString = typeof content === 'object' ? (content.text || content.markdown || content.content || JSON.stringify(content)) : content;
            if (!contentString || contentString.trim() === '') return res.status(400).json({ error: "Document content cannot be empty" });

            const wordCount = contentString.trim().split(/\s+/).filter(Boolean).length;
            const characterCount = contentString.length;

            const result = await DocumentsController.documentRepository.create({
                project_id: projectId, name, content: contentString, template_id, status,
                created_by: req.user?.id, word_count: wordCount, character_count: characterCount, generation_metadata
            });

            const document = result.rows[0];
            await DocumentsController.documentRepository.saveVersion({
                document_id: document.id, version: 1, semantic_version: '1.0.0', content: contentString,
                author_id: req.user?.id || '', change_type: 'initial', change_description: 'Initial version', generation_metadata
            });

            setImmediate(() => DocumentsController.triggerSideEffects(document, req));

            res.status(201).json({ message: "Document created successfully", document });
        } catch (error) {
            log.error("Create document error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * PUT /api/v1/documents/:id
     */
    public static async update(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { id } = req.params;
            const { name, content, status, metadata } = req.body;

            const docResult = await DocumentsController.documentRepository.findById(id);
            if (docResult.rows.length === 0) return res.status(404).json({ error: "Document not found" });
            const doc = docResult.rows[0];

            const hasAccess = await DocumentsController.checkProjectAccess(req, doc.project_id, true);
            if (!hasAccess) return res.status(403).json({ error: "Access denied" });

            let updateData: any = { name, content, status };
            if (metadata) updateData.metadata = { ...(doc.metadata || {}), ...metadata };

            if (content) {
                updateData.word_count = content.trim().split(/\s+/).filter(Boolean).length;
                updateData.character_count = content.length;
                const versionParts = String(doc.version || "1.0.0").split('.');
                if (versionParts.length >= 3) {
                    versionParts[2] = String(parseInt(versionParts[2]) + 1);
                    updateData.version = versionParts.join('.');
                    updateData.semantic_version = updateData.version;
                } else {
                    updateData.version = (parseInt(String(doc.version)) || 1) + 1;
                }
            }

            const result = await DocumentsController.documentRepository.update(id, updateData);
            await cache.del(`document:${id}`);
            if (req.user?.id) trackActivity.editDocument(req.user.id, id, doc.project_id);

            await AuditService.log({
                table: 'documents', rowId: id, action: 'update', oldValues: doc, newValues: result.rows[0],
                ctx: { userId: req.user?.id, ip: req.ip, requestId: (req as any).requestId }
            });

            res.json({ message: "Document updated successfully", document: result.rows[0] });
        } catch (error) {
            log.error("Update document error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * DELETE /api/v1/documents/:id
     */
    public static async delete(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { id } = req.params;
            const docResult = await DocumentsController.documentRepository.findById(id);
            if (docResult.rows.length === 0) return res.status(404).json({ error: "Document not found" });
            const doc = docResult.rows[0];

            const hasAccess = await DocumentsController.checkProjectAccess(req, doc.project_id, true);
            if (!hasAccess) return res.status(403).json({ error: "Access denied" });

            await DocumentsController.documentRepository.softDelete(id, req.user?.id || '');
            await cache.del(`document:${id}`);
            res.json({ message: "Document moved to trash successfully" });
        } catch (error) {
            log.error("Delete document error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * POST /api/v1/documents/:id/restore
     */
    public static async restore(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { id } = req.params;
            const result = await pool.query("SELECT project_id FROM documents WHERE id = $1 AND deleted_at IS NOT NULL", [id]);
            if (result.rows.length === 0) return res.status(404).json({ error: "Deleted document not found" });

            const hasAccess = await DocumentsController.checkProjectAccess(req, result.rows[0].project_id, true);
            if (!hasAccess) return res.status(403).json({ error: "Access denied" });

            await DocumentsController.documentRepository.restore(id, req.user?.id || '');
            res.json({ message: "Document restored successfully" });
        } catch (error) {
            log.error("Restore document error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * GET /api/v1/documents/project/:projectId/stats
     */
    public static async getProjectStats(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { projectId } = req.params;
            const hasAccess = await DocumentsController.checkProjectAccess(req, projectId);
            if (!hasAccess) return res.status(403).json({ error: "Access denied" });

            const result = await DocumentsController.documentRepository.getStats(projectId);
            res.json({ stats: result.rows[0] });
        } catch (error) {
            log.error("Get project stats error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * GET /api/v1/documents/:id/pdf-preview
     */
    public static async getPdfPreview(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { id } = req.params;
            const result = await DocumentsController.documentRepository.findById(id);
            if (result.rows.length === 0) return res.status(404).json({ error: "Document not found" });
            const doc = result.rows[0];

            const hasAccess = await DocumentsController.checkProjectAccess(req, doc.project_id);
            if (!hasAccess) return res.status(403).json({ error: "Access denied" });

            let content = doc.content;
            if (typeof content === 'object') content = content.text || content.markdown || JSON.stringify(content);

            const pdfBuffer = await markdownToPdf(content, { format: "A4", printBackground: true });
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `inline; filename="${doc.name || 'document'}.pdf"`);
            res.send(pdfBuffer);
        } catch (error) {
            log.error("PDF Preview error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * GET /api/v1/documents/:id/export/pdf
     */
    public static async exportPdf(req: Request, res: Response) {
        return DocumentsController.getPdfPreview(req, res);
    }

    /**
     * GET /api/v1/documents/:id/versions
     */
    public static async getVersions(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const result = await DocumentsController.documentRepository.getVersions(req.params.id);
            res.json(result.rows);
        } catch (error) {
            log.error("Get versions error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * GET /api/v1/documents/:id/quality-audit
     */
    public static async getQualityAudit(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const result = await DocumentsController.documentRepository.getQualityAudit(req.params.id);
            res.json(result.rows[0] || { message: "No quality audit found" });
        } catch (error) {
            log.error("Get quality audit error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * POST /api/v1/documents/:id/feedback
     */
    public static async submitFeedback(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            await pool.query("INSERT INTO document_feedback (document_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)",
                [req.params.id, (req as any).user?.id, req.body.rating, req.body.comment]);
            res.json({ success: true });
        } catch (error) {
            log.error("Feedback error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * GET /api/v1/documents/project/:projectId/deleted
     */
    public static async getDeletedDocuments(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const result = await DocumentsController.documentRepository.findDeletedByProjectId(req.params.projectId);
            res.json({ documents: result.rows, count: result.rows.length });
        } catch (error) {
            log.error("Get deleted docs error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    /**
     * POST /api/v1/documents/bulk-export/pdf
     */
    public static async bulkExportPdf(req: Request, res: Response) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const { document_ids } = req.body;
            const result = await pool.query(`SELECT id, name, content FROM documents WHERE id = ANY($1)`, [document_ids]);
            const zip = archiver("zip", { zlib: { level: 9 } });
            res.setHeader("Content-Type", "application/zip");
            res.setHeader("Content-Disposition", `attachment; filename="bulk-pdf-${Date.now()}.zip"`);
            zip.pipe(res);
            for (const doc of result.rows) {
                let content = doc.content;
                if (typeof content === 'object') content = content.text || content.markdown || JSON.stringify(content);
                const pdfBuffer = await markdownToPdf(content, { format: "A4" });
                zip.append(pdfBuffer, { name: `${doc.name?.replace(/[^a-z0-9]/gi, '_')}.pdf` });
            }
            await zip.finalize();
        } catch (error) {
            log.error("Bulk PDF export error:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }

    private static async checkProjectAccess(req: Request, projectId: string, checkWrite = false): Promise<boolean> {
        const user = (req as any).user;
        if (!user) return false;
        if (user.role?.toLowerCase() === 'super_admin') return true;
        const project = await DocumentsController.projectRepository.findById(projectId);
        if (project.rows.length === 0) return false;
        const p = project.rows[0];
        if (user.role?.toLowerCase() === 'admin' && user.company_id === p.company_id) return true;
        return p.owner_id === user.id || (Array.isArray(p.team_members) && p.team_members.includes(user.id));
    }

    private static async triggerSideEffects(document: any, req: Request) {
        const log = childLogger({ requestId: (req as any).requestId });
        try {
            const jobData = { projectId: document.project_id, documentIds: [document.id], autoTriggered: true };
            const jobRes = await pool.query(`INSERT INTO jobs (type, status, data, created_by, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                ['project-data-extraction', 'pending', JSON.stringify(jobData), req.user?.id, document.project_id]);
            await extractionQueue.add('extract-project-data', { jobId: jobRes.rows[0].id, ...jobData, userId: req.user?.id }, { jobId: jobRes.rows[0].id });
        } catch (e) { log.error('Side effects extraction fail', e); }

        storageArchivalService.archiveDocument({
            projectId: document.project_id, documentId: document.id, fileName: document.name,
            content: document.content, mimeType: 'text/markdown'
        }).catch(e => log.error('Archival fail', e));
    }
}
