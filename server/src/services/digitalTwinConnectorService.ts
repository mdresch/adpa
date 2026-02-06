import { logger } from "../utils/logger"
import { v4 as uuidv4 } from "uuid"
import { pool } from "../database/connection"
import { evaluateTriggerRules } from "./digitalTwinTriggerService"

export interface DigitalTwinEvent {
    provider: 'bentley' | 'azure'
    assetId: string
    externalAssetId: string
    eventType: string
    payload: any
    timestamp: Date
}

export interface ConnectorStatus {
    provider: string
    isConnected: boolean
    lastEventSeen?: Date
    eventCount: number
}

class DigitalTwinConnectorService {
    private status: Record<string, ConnectorStatus> = {
        bentley: { provider: 'bentley', isConnected: true, eventCount: 0 },
        azure: { provider: 'azure', isConnected: true, eventCount: 0 }
    }

    /**
     * Main entry point for ingestion of external digital twin events.
     * This bridges external telemetry with ADPA's internal trigger system.
     */
    async handleExternalEvent(event: DigitalTwinEvent): Promise<void> {
        const startTime = Date.now()
        logger.info(`[DT-CONNECTOR] Received event from ${event.provider}`, {
            assetId: event.assetId,
            eventType: event.eventType
        })

        try {
            // 1. Update internal metrics
            this.status[event.provider].lastEventSeen = event.timestamp
            this.status[event.provider].eventCount++

            // 2. Persist event history for audit
            const eventId = uuidv4()
            await pool.query(`
        INSERT INTO digital_twin_events (
          id, asset_id, event_type, payload, source, external_event_id
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
                eventId,
                event.assetId,
                event.eventType,
                JSON.stringify(event.payload),
                event.provider,
                (event.payload as any).externalId || uuidv4()
            ])

            // 3. Update asset state if payload contains telemetry
            if (event.payload.telemetry || event.payload.state) {
                const stateId = uuidv4()
                const stateSnapshot = event.payload.telemetry || event.payload.state

                await pool.query(`
          INSERT INTO digital_twin_asset_states (
            id, asset_id, state_snapshot, state_version, created_at
          ) VALUES ($1, $2, $3, (SELECT COALESCE(MAX(state_version), 0) + 1 FROM digital_twin_asset_states WHERE asset_id = $2), $4)
        `, [stateId, event.assetId, JSON.stringify(stateSnapshot), event.timestamp])

                await pool.query(`
          UPDATE digital_twin_assets 
          SET current_state_id = $1, updated_at = NOW() 
          WHERE id = $2
        `, [stateId, event.assetId])

                // 4. Trigger rules evaluation
                await evaluateTriggerRules(event.assetId, stateId, eventId, event.eventType)
            }

            const duration = Date.now() - startTime
            logger.info(`[DT-CONNECTOR] Event processed in ${duration}ms`, {
                provider: event.provider,
                eventId
            })

        } catch (error) {
            logger.error(`[DT-CONNECTOR] Failed to process event from ${event.provider}`, {
                error: error instanceof Error ? error.message : String(error),
                event
            })
            throw error
        }
    }

    /**
     * Get overall connectivity status
     */
    getConnectionStatus(): ConnectorStatus[] {
        return Object.values(this.status)
    }
}

export const digitalTwinConnectorService = new DigitalTwinConnectorService()
