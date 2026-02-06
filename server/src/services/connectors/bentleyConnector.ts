import { logger } from "../../utils/logger"
import { digitalTwinConnectorService } from "../digitalTwinConnectorService"

/**
 * Mock Connector for Bentley iTwin.js
 * Simulates fetching infrastructure asset metadata and state changes.
 */
export class BentleyConnector {
    private static instance: BentleyConnector

    private constructor() { }

    public static getInstance(): BentleyConnector {
        if (!BentleyConnector.instance) {
            BentleyConnector.instance = new BentleyConnector()
        }
        return BentleyConnector.instance
    }

    /**
     * Simulates a telemetry update from a Bentley iModel (e.g., structural sensor)
     */
    async simulateStructuralUpdate(assetId: string, externalId: string, stressLevel: number): Promise<void> {
        logger.info(`[BENTLEY-CONNECTOR] Simulating structural telemetry for ${externalId}`, { stressLevel })

        await digitalTwinConnectorService.handleExternalEvent({
            provider: 'bentley',
            assetId,
            externalAssetId: externalId,
            eventType: stressLevel > 0.8 ? 'threshold_breach' : 'attribute_change',
            timestamp: new Date(),
            payload: {
                telemetry: {
                    structural_health: stressLevel > 0.8 ? 'ALARM' : 'STABLE',
                    psi_reading: stressLevel * 1000,
                    ambient_temp: 22.5
                },
                metadata: {
                    modelId: 'imodel-82-x-11',
                    lastSync: new Date().toISOString()
                }
            }
        })
    }

    /**
     * Simulates an Environmental Management Plan requirement change
     */
    async simulateEMPUpdate(assetId: string, externalId: string, noiseLevelDb: number): Promise<void> {
        logger.info(`[BENTLEY-CONNECTOR] Simulating environmental telemetry for ${externalId}`, { noiseLevelDb })

        await digitalTwinConnectorService.handleExternalEvent({
            provider: 'bentley',
            assetId,
            externalAssetId: externalId,
            eventType: 'state_change',
            timestamp: new Date(),
            payload: {
                state: {
                    noise_level_db: noiseLevelDb,
                    dust_particle_count: 45,
                    compliance_status: noiseLevelDb > 85 ? 'NON_COMPLIANT' : 'COMPLIANT'
                }
            }
        })
    }
}

export const bentleyConnector = BentleyConnector.getInstance()
