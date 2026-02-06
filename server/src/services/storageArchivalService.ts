import { logger } from "../utils/logger"
import { getByProjectId } from "../database/projectIntegrations"
import { sharepointService } from "./sharepointService"
import { projectWiseService } from "./projectWiseService"
import { pool } from "../database/connection"

export interface ArchivalResult {
    platform: 'sharepoint' | 'projectwise' | 'confluence'
    success: boolean
    url?: string
    error?: string
}

/**
 * Storage Archival Service
 * Orchestrates document pushes to enterprise systems of record.
 */
export class StorageArchivalService {
    private static instance: StorageArchivalService

    private constructor() { }

    public static getInstance(): StorageArchivalService {
        if (!StorageArchivalService.instance) {
            StorageArchivalService.instance = new StorageArchivalService()
        }
        return StorageArchivalService.instance
    }

    /**
     * Main entry point to archive a document to all configured platforms
     */
    async archiveDocument(params: {
        projectId: string
        documentId: string
        fileName: string
        content: string | Buffer
        mimeType: string
    }): Promise<ArchivalResult[]> {
        const { projectId, documentId, fileName, content, mimeType } = params
        const results: ArchivalResult[] = []

        try {
            const integrations = await getByProjectId(projectId)
            if (!integrations) {
                logger.debug(`[ARCHIVAL-SERVICE] No integrations found for project ${projectId}`)
                return results
            }

            const settings = integrations.integration_settings || {}

            // 1. Archive to SharePoint
            if (settings.sharepoint_auto_archive) {
                try {
                    // SharePoint usually needs a DriveID. We might need to store this in project settings.
                    // For now, we'll try to use a default or simulated drive.
                    const driveId = settings.sharepoint_drive_id || 'default-drive-id'
                    const buffer = typeof content === 'string' ? Buffer.from(content) : content

                    logger.info(`[ARCHIVAL-SERVICE] Archiving to SharePoint for project ${projectId}`)
                    const spFile = await sharepointService.uploadDocument(driveId, fileName, buffer)

                    results.push({ platform: 'sharepoint', success: true, url: spFile.webUrl })
                } catch (error: any) {
                    logger.error(`[ARCHIVAL-SERVICE] SharePoint archival failed: ${error.message}`)
                    results.push({ platform: 'sharepoint', success: false, error: error.message })
                }
            }

            // 2. Archive to ProjectWise
            if (settings.projectwise_auto_archive) {
                try {
                    logger.info(`[ARCHIVAL-SERVICE] Archiving to ProjectWise for project ${projectId}`)
                    const pwDoc = await projectWiseService.uploadDocument(
                        projectId,
                        settings.projectwise_folder_path || 'ADPA_Archival',
                        fileName,
                        content
                    )

                    results.push({ platform: 'projectwise', success: true, url: pwDoc.webUrl })
                } catch (error: any) {
                    logger.error(`[ARCHIVAL-SERVICE] ProjectWise archival failed: ${error.message}`)
                    results.push({ platform: 'projectwise', success: false, error: error.message })
                }
            }

            // Update document metadata with archival results if anything changed
            if (results.length > 0) {
                await this.updateDocumentArchivalMetadata(documentId, results)
            }

            return results
        } catch (error: any) {
            logger.error(`[ARCHIVAL-SERVICE] Orchestration failed for project ${projectId}: ${error.message}`)
            return results
        }
    }

    private async updateDocumentArchivalMetadata(documentId: string, archivalResults: ArchivalResult[]): Promise<void> {
        try {
            const res = await pool.query("SELECT metadata FROM documents WHERE id = $1", [documentId])
            const metadata = res.rows[0]?.metadata || {}

            metadata.archival = {
                last_sync: new Date().toISOString(),
                targets: archivalResults.map(r => ({
                    platform: r.platform,
                    status: r.success ? 'synced' : 'failed',
                    url: r.url,
                    error: r.error
                }))
            }

            await pool.query(
                "UPDATE documents SET metadata = $1, updated_at = NOW() WHERE id = $2",
                [JSON.stringify(metadata), documentId]
            )
        } catch (error: any) {
            logger.error(`[ARCHIVAL-SERVICE] Failed to update document metadata: ${error.message}`)
        }
    }
}

export const storageArchivalService = StorageArchivalService.getInstance()
