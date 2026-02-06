import { bentleyConnector } from "./services/connectors/bentleyConnector"
import { pool } from "./database/connection"
import { logger } from "./utils/logger"

async function verifyPhase9() {
    logger.info("Starting Phase 9 Verification: Digital Twin Connector Framework")

    try {
        // 1. Get a test asset
        const assetRes = await pool.query("SELECT id, name, external_id FROM digital_twin_assets LIMIT 1")
        if (assetRes.rows.length === 0) {
            logger.error("No assets found for verification. Please seed assets first.")
            return
        }

        const asset = assetRes.rows[0]
        logger.info(`Testing with asset: ${asset.name} (${asset.id})`)

        // 2. Simulate a Bentley Structural Update (High Stress)
        logger.info("Simulating High Stress event (threshold breach)...")
        await bentleyConnector.simulateStructuralUpdate(asset.id, asset.external_id, 0.95)

        // 3. Check if an event was recorded
        const eventRes = await pool.query("SELECT id, event_type FROM digital_twin_events WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 1", [asset.id])
        if (eventRes.rows.length > 0) {
            logger.info(`✅ Event recorded: ${eventRes.rows[0].event_type}`)
        } else {
            logger.error("❌ No event recorded in database")
        }

        // 4. Check if a new state was recorded
        const stateRes = await pool.query("SELECT id FROM digital_twin_asset_states WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 1", [asset.id])
        if (stateRes.rows.length > 0) {
            logger.info("✅ New asset state captured")
        } else {
            logger.error("❌ No state recorded in database")
        }

        // 5. Check if a document trigger was created
        const triggerRes = await pool.query("SELECT id, status FROM digital_twin_document_triggers WHERE asset_id = $1 ORDER BY created_at DESC LIMIT 1", [asset.id])
        if (triggerRes.rows.length > 0) {
            logger.info(`✅ Document trigger created: ${triggerRes.rows[0].status}`)
        } else {
            logger.warn("⚠️  No document trigger found (this is expected if no rules match this asset/event type)")
        }

        logger.info("Phase 9 Verification Complete")
    } catch (error) {
        logger.error("Phase 9 Verification Failed", error)
    } finally {
        process.exit(0)
    }
}

verifyPhase9()
