/**
 * RAG Sync Service
 * 
 * Automatically syncs ADPA documents to Google Gemini File Search
 * for RAG-powered AI Search. Uses the @google/genai SDK.
 */

import { GoogleGenAI } from '@google/genai'
import { pool } from '../database/connection'
import { logger, childLogger } from '../utils/logger'

// ─── Types ──────────────────────────────────────────────────────────────

interface RAGDocumentMetadata {
    program?: string
    project?: string
    document: string
    entities?: string
    template?: string
    version?: string
    date?: string
}

interface SyncResult {
    success: boolean
    documentId: string
    fileName?: string
    error?: string
}

// ─── Service ────────────────────────────────────────────────────────────

class RAGSyncService {
    private genai: GoogleGenAI | null = null
    private storeName: string | null = null
    private log = childLogger({ service: 'rag-sync' })

    /**
     * Initialize the Gemini client lazily.
     */
    private getClient(): GoogleGenAI {
        if (!this.genai) {
            const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
            if (!apiKey) {
                throw new Error('GOOGLE_AI_API_KEY is not configured. RAG sync is unavailable.')
            }
            this.genai = new GoogleGenAI({ apiKey })
        }
        return this.genai
    }

    /**
     * Get or create the tenant's File Search store.
     * Caches the store name after first resolution.
     */
    async getStoreName(): Promise<string> {
        if (this.storeName) return this.storeName

        const client = this.getClient()
        const displayName = 'ADPA Knowledge Base'

        try {
            // List existing stores and find ours
            const storesPager = await (client as any).fileSearchStores.list()
            let existing: any = null

            if (storesPager && (Symbol.asyncIterator in (storesPager as any))) {
                for await (const store of (storesPager as any)) {
                    if (store.displayName === displayName) {
                        existing = store
                        break
                    }
                }
            } else if (Array.isArray(storesPager)) {
                existing = (storesPager as any[]).find((s: any) => s.displayName === displayName)
            }

            if (existing?.name) {
                this.storeName = existing.name
                this.log.info('[RAG-SYNC] Using existing File Search store', { name: this.storeName })
                return this.storeName
            }

            // Create new store
            const store = await (client as any).fileSearchStores.create({ displayName })
            if (!store?.name) throw new Error('Failed to create File Search store')

            this.storeName = store.name
            this.log.info('[RAG-SYNC] Created new File Search store', { name: this.storeName })
            return this.storeName
        } catch (error: any) {
            this.log.error('[RAG-SYNC] Failed to get/create store', { error: error.message })
            throw error
        }
    }

    /**
     * Sync a document to the File Search store.
     * Called after document creation or update.
     */
    async syncDocument(documentId: string, projectId: string): Promise<SyncResult> {
        try {
            const client = this.getClient()
            const storeName = await this.getStoreName()

            // Fetch document with project and template info
            const result = await pool.query(
                `SELECT d.id, d.name, d.content, d.template_id, d.version, d.semantic_version,
                        d.updated_at, d.created_at,
                        p.name as project_name, p.framework as project_framework,
                        p.program_id,
                        t.name as template_name, t.category as template_category
                 FROM documents d
                 JOIN projects p ON d.project_id = p.id
                 LEFT JOIN templates t ON d.template_id = t.id
                 WHERE d.id = $1 AND d.project_id = $2`,
                [documentId, projectId]
            )

            if (result.rows.length === 0) {
                return { success: false, documentId, error: 'Document not found' }
            }

            const doc = result.rows[0]

            if (!doc.content || doc.content.trim().length === 0) {
                return { success: false, documentId, error: 'Document has no content' }
            }

            // Fetch program name if available
            let programName = 'Unassigned'
            if (doc.program_id) {
                try {
                    const programResult = await pool.query(
                        `SELECT name FROM programs WHERE id = $1`,
                        [doc.program_id]
                    )
                    if (programResult.rows.length > 0) {
                        programName = programResult.rows[0].name
                    }
                } catch {
                    // Programs table may not exist yet
                }
            }

            // Fetch stakeholder entities
            let entities = ''
            try {
                const stakeholderResult = await pool.query(
                    `SELECT name, role FROM stakeholders WHERE project_id = $1 LIMIT 10`,
                    [projectId]
                )
                if (stakeholderResult.rows.length > 0) {
                    entities = stakeholderResult.rows
                        .map((s: any) => `${s.name} (${s.role})`)
                        .join(', ')
                }
            } catch {
                // Non-blocking
            }

            // Build metadata
            const metadata: RAGDocumentMetadata = {
                program: programName,
                project: doc.project_name,
                document: doc.name,
                entities: entities ? entities.substring(0, 512) : undefined,
                template: doc.template_name || doc.template_category || 'custom',
                version: doc.semantic_version || doc.version?.toString() || '1.0',
                date: (doc.updated_at || doc.created_at)?.toISOString().split('T')[0]
            }

            // Build custom metadata for Gemini (Array of {key, stringValue})
            const customMetadata: Array<{ key: string, stringValue: string }> = []
            if (metadata.program) customMetadata.push({ key: 'program', stringValue: String(metadata.program) })
            if (metadata.project) customMetadata.push({ key: 'project', stringValue: String(metadata.project) })
            if (metadata.document) customMetadata.push({ key: 'document', stringValue: String(metadata.document) })
            if (metadata.entities) customMetadata.push({ key: 'entities', stringValue: String(metadata.entities) })
            if (metadata.template) customMetadata.push({ key: 'template', stringValue: String(metadata.template) })
            if (metadata.version) customMetadata.push({ key: 'version', stringValue: String(metadata.version) })
            if (metadata.date) customMetadata.push({ key: 'date', stringValue: String(metadata.date) })

            this.log.info('[RAG-SYNC] Uploading file to Gemini API', {
                displayName: metadata.document,
                contentLength: doc.content.length
            })

            // Upload content via Files API (part of @google/genai)
            let uploadResponse: any
            try {
                const blob = new Blob([doc.content], { type: 'text/plain' })
                uploadResponse = await (client as any).files.upload({
                    file: blob,
                    config: {
                        displayName: `${doc.project_name} - ${doc.name}`.substring(0, 500),
                        mimeType: 'text/plain'
                    }
                })
                this.log.info('[RAG-SYNC] File upload response received', {
                    name: uploadResponse.name,
                    status: (uploadResponse as any).file?.state || 'unknown'
                })
            } catch (uploadError: any) {
                this.log.error('[RAG-SYNC] File upload failed', {
                    error: uploadError.message,
                    errorData: uploadError.response?.data || uploadError.details
                })
                throw uploadError
            }

            if (!uploadResponse) {
                throw new Error('File upload returned empty response')
            }

            // Extract the file name
            const fileName = uploadResponse.file?.name || uploadResponse.name

            if (!fileName) {
                this.log.error('[RAG-SYNC] No file name in upload response', { uploadResponse })
                return { success: false, documentId, error: 'File upload returned no name' }
            }

            // 🕒 WAIT for file to be ACTIVE
            let fileReady = false
            let attempts = 0
            const maxAttempts = 15

            while (!fileReady && attempts < maxAttempts) {
                try {
                    const file = await (client as any).files.get({ name: fileName })
                    this.log.info(`[RAG-SYNC] File status for ${fileName}: ${file.state}`, { attempts })

                    if (file.state === 'ACTIVE') {
                        fileReady = true
                        break
                    }
                    if (file.state === 'FAILED') {
                        throw new Error(`File processing failed in Gemini: ${file.error?.message || 'Unknown error'}`)
                    }
                } catch (getError: any) {
                    this.log.warn(`[RAG-SYNC] Error getting file status for ${fileName}`, { error: getError.message })
                }

                attempts++
                await new Promise(resolve => setTimeout(resolve, 2000))
            }

            if (!fileReady) {
                throw new Error(`File ${fileName} did not become ACTIVE within timeout`)
            }

            // Import into File Search store with metadata
            try {
                const formattedStoreName = storeName.replace('fileSearchStores/', '')
                const formattedFileName = fileName.replace('files/', '')

                this.log.info('[RAG-SYNC] Calling importFile', {
                    fileSearchStoreName: formattedStoreName,
                    fileName: formattedFileName
                })

                await (client as any).fileSearchStores.importFile({
                    fileSearchStoreName: formattedStoreName,
                    fileName: formattedFileName
                })
                this.log.info('[RAG-SYNC] File import call sent successfully')
            } catch (importError: any) {
                this.log.error('[RAG-SYNC] File import failed', {
                    error: importError.message,
                    errorData: importError.response?.data || importError.details,
                    params: {
                        fileSearchStoreName: storeName.replace('fileSearchStores/', ''),
                        fileName: fileName.replace('files/', '')
                    }
                })
                throw importError
            }

            this.log.info('[RAG-SYNC] Document synced successfully', {
                documentId,
                fileName: fileName,
                project: metadata.project
            })

            // Update document with RAG sync status
            try {
                await pool.query(
                    `UPDATE documents SET metadata = jsonb_set(
                        COALESCE(metadata, '{}'::jsonb),
                        '{rag_sync}',
                        $1::jsonb
                    ) WHERE id = $2`,
                    [
                        JSON.stringify({
                            synced: true,
                            syncedAt: new Date().toISOString(),
                            fileName: fileName,
                            storeName
                        }),
                        documentId
                    ]
                )
            } catch (metaError: any) {
                this.log.warn('[RAG-SYNC] Failed to update document metadata', { error: metaError.message })
            }

            return { success: true, documentId, fileName: fileName }
        } catch (error: any) {
            this.log.error('[RAG-SYNC] Failed to sync document', {
                documentId,
                projectId,
                error: error.message,
                stack: error.stack
            })
            return { success: false, documentId, error: error.message }
        }
    }

    /**
     * Backfill all existing documents to the File Search store.
     */
    async backfillAll(): Promise<{ synced: number, failed: number, errors: string[] }> {
        const results = { synced: 0, failed: 0, errors: [] as string[] }

        try {
            const docsRes = await pool.query(
                `SELECT d.id, d.project_id
                 FROM documents d
                 WHERE d.content IS NOT NULL
                   AND d.content != ''
                   AND d.deleted_at IS NULL
                   AND d.parent_document_id IS NULL
                 ORDER BY d.updated_at DESC`
            )

            const total = docsRes.rows.length
            this.log.info(`[RAG-SYNC] Starting RAG backfill of ${total} documents`)

            for (let i = 0; i < total; i++) {
                const doc = docsRes.rows[i]

                const result = await this.syncDocument(doc.id, doc.project_id)
                if (result.success) {
                    results.synced++
                } else {
                    results.failed++
                    results.errors.push(`${doc.id}: ${result.error}`)
                }

                await new Promise(resolve => setTimeout(resolve, 1000))
            }

            this.log.info('[RAG-SYNC] Backfill complete', {
                synced: results.synced,
                failed: results.failed
            })
        } catch (error: any) {
            this.log.error('[RAG-SYNC] Backfill failed', { error: error.message })
            results.errors.push(`Backfill error: ${error.message}`)
        }

        return results
    }

    /**
     * Check if RAG sync is available (API key configured).
     */
    isAvailable(): boolean {
        return !!(process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    }
}

export const ragSyncService = new RAGSyncService()
