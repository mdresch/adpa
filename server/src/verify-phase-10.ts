import { storageArchivalService } from "./services/storageArchivalService"
import { pool } from "./database/connection"
import { logger } from "./utils/logger"

async function verifyPhase10() {
    logger.info("Starting Phase 10 Verification: Storage Archival Orchestration")

    try {
        // 1. Setup a test project and document
        const projectRes = await pool.query("SELECT id FROM projects LIMIT 1")
        if (projectRes.rows.length === 0) {
            logger.error("No projects found for verification.")
            return
        }
        const projectId = projectRes.rows[0].id

        const docRes = await pool.query("SELECT id, name, content FROM documents WHERE project_id = $1 LIMIT 1", [projectId])
        if (docRes.rows.length === 0) {
            logger.error(`No documents found for project ${projectId}. Generate or seed a document first.`)
            return
        }
        const doc = docRes.rows[0]

        // 2. Configure project integration settings for archival
        logger.info(`Configuring archival settings for project ${projectId}...`)
        const settings = {
            sharepoint_auto_archive: true,
            sharepoint_drive_id: "verify-drive-123",
            projectwise_auto_archive: true,
            projectwise_folder_path: "Verified/Phase10"
        }

        await pool.query(
            `INSERT INTO project_integrations (project_id, integration_settings, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (project_id) DO UPDATE SET 
       integration_settings = EXCLUDED.integration_settings,
       updated_at = NOW()`,
            [projectId, JSON.stringify(settings)]
        )

        // 3. Trigger Archival
        logger.info(`Triggering archival for document: ${doc.name} (${doc.id})`)
        const results = await storageArchivalService.archiveDocument({
            projectId,
            documentId: doc.id,
            fileName: doc.name,
            content: doc.content,
            mimeType: 'text/markdown'
        })

        // 4. Verify Results
        logger.info("Archival Results:", results)

        const spResult = results.find(r => r.platform === 'sharepoint')
        const pwResult = results.find(r => r.platform === 'projectwise')

        if (spResult?.success) logger.info("✅ SharePoint archival successful")
        else logger.error("❌ SharePoint archival failed", spResult?.error)

        if (pwResult?.success) logger.info("✅ ProjectWise archival successful")
        else logger.error("❌ ProjectWise archival failed", pwResult?.error)

        // 5. Check metadata update in DB
        const finalDocRes = await pool.query("SELECT metadata FROM documents WHERE id = $1", [doc.id])
        const meta = finalDocRes.rows[0].metadata
        if (meta.archival && meta.archival.targets.length >= 2) {
            logger.info("✅ Document metadata updated with archival status")
        } else {
            logger.error("❌ Document metadata NOT updated")
        }

        logger.info("Phase 10 Verification Complete")
    } catch (error) {
        logger.error("Phase 10 Verification Failed", error)
    } finally {
        process.exit(0)
    }
}

verifyPhase10()
