import { logger } from "../../utils/logger"
import { digitalTwinConnectorService } from "../digitalTwinConnectorService"

/**
 * Mock Connector for Microsoft Azure Digital Twins
 * Simulates IoT telemetry for supply chain and warehouse management.
 */
export class AzureDTConnector {
    private static instance: AzureDTConnector

    private constructor() { }

    public static getInstance(): AzureDTConnector {
        if (!AzureDTConnector.instance) {
            AzureDTConnector.instance = new AzureDTConnector()
        }
        return AzureDTConnector.instance
    }

    /**
     * Simulates an Inventory Level event from Azure IoT Hub
     */
    async simulateInventoryTelemetry(assetId: string, externalId: string, warehouseSpacePercent: number): Promise<void> {
        logger.info(`[AZURE-DT-CONNECTOR] Simulating inventory telemetry for ${externalId}`, { warehouseSpacePercent })

        await digitalTwinConnectorService.handleExternalEvent({
            provider: 'azure',
            assetId,
            externalAssetId: externalId,
            eventType: warehouseSpacePercent < 20 ? 'threshold_breach' : 'attribute_change',
            timestamp: new Date(),
            payload: {
                telemetry: {
                    remaining_capacity_percent: warehouseSpacePercent,
                    unit_count: Math.floor(warehouseSpacePercent * 100),
                    last_scanned: new Date().toISOString()
                }
            }
        })
    }

    /**
     * Simulates a Supply Chain Risk event (e.g., transport delay)
     */
    async simulateLogisticsEvent(assetId: string, externalId: string, delayHours: number): Promise<void> {
        logger.info(`[AZURE-DT-CONNECTOR] Simulating logistics event for ${externalId}`, { delayHours })

        await digitalTwinConnectorService.handleExternalEvent({
            provider: 'azure',
            assetId,
            externalAssetId: externalId,
            eventType: 'state_change',
            timestamp: new Date(),
            payload: {
                state: {
                    current_delay_hours: delayHours,
                    weather_condition: delayHours > 5 ? 'STORM' : 'CLEAR',
                    estimated_arrival: new Date(Date.now() + (24 + delayHours) * 60 * 60 * 1000).toISOString()
                }
            }
        })
    }

    /**
     * Simulates a device connectivity loss
     */
    async simulateConnectivityPulse(assetId: string, externalId: string, isOnline: boolean): Promise<void> {
        await digitalTwinConnectorService.handleExternalEvent({
            provider: 'azure',
            assetId,
            externalAssetId: externalId,
            eventType: isOnline ? 'pulse' : 'state_change',
            timestamp: new Date(),
            payload: {
                telemetry: {
                    connection_status: isOnline ? 'ONLINE' : 'OFFLINE',
                    signal_strength: isOnline ? 0.95 : 0.0
                }
            }
        })
    }
}

export const azureDTConnector = AzureDTConnector.getInstance()
