import express from 'express'
import { logger } from '../utils/logger'
import { bentleyConnector } from '../services/connectors/bentleyConnector'
import { azureDTConnector } from '../services/connectors/azureDTConnector'

const router = express.Router()

/**
 * Trigger a mock Bentley Structural event
 */
router.post('/simulate/bentley/structural', async (req, res) => {
    const { assetId, externalId, stressLevel } = req.body
    try {
        await bentleyConnector.simulateStructuralUpdate(assetId, externalId, stressLevel || 0.5)
        res.json({ success: true, message: 'Bentley structural simulation triggered' })
    } catch (error: any) {
        logger.error('Bentley simulation failed', { error: error.message })
        res.status(500).json({ error: error.message })
    }
})

/**
 * Trigger a mock Azure Inventory event
 */
router.post('/simulate/azure/inventory', async (req, res) => {
    const { assetId, externalId, capacityPercent } = req.body
    try {
        await azureDTConnector.simulateInventoryTelemetry(assetId, externalId, capacityPercent || 50)
        res.json({ success: true, message: 'Azure inventory simulation triggered' })
    } catch (error: any) {
        logger.error('Azure simulation failed', { error: error.message })
        res.status(500).json({ error: error.message })
    }
})

/**
 * Trigger a mock Azure Logistics event
 */
router.post('/simulate/azure/logistics', async (req, res) => {
    const { assetId, externalId, delayHours } = req.body
    try {
        await azureDTConnector.simulateLogisticsEvent(assetId, externalId, delayHours || 0)
        res.json({ success: true, message: 'Azure logistics simulation triggered' })
    } catch (error: any) {
        logger.error('Azure logistics simulation failed', { error: error.message })
        res.status(500).json({ error: error.message })
    }
})

export default router
