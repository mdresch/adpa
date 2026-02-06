import { pool } from '../database/connection'
import { logger } from '../utils/logger'
import { v4 as uuidv4 } from 'uuid'

export interface DigitalTwinEventInput {
  asset_id: string
  event_type: 'state_change' | 'attribute_change' | 'relationship_change' | 'creation' | 'deletion' | 'alert' | 'sync_error'
  event_payload: any
  event_summary?: string
  platform_event_id?: string
  platform_type: 'iTwin' | 'AzureDT' | 'Generic' | 'Visio'
  event_timestamp: Date
  processing_status?: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'
}

export const digitalTwinEventService = {
  /**
   * Log an incoming event
   */
  async ingestEvent(data: DigitalTwinEventInput) {
    try {
      const {
        asset_id, event_type, event_payload, event_summary,
        platform_event_id, platform_type, event_timestamp, processing_status = 'pending'
      } = data

      const res = await pool.query(
        `INSERT INTO digital_twin_events 
         (asset_id, event_type, event_payload, event_summary, platform_event_id, platform_type, event_timestamp, processing_status, ingested_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [asset_id, event_type, JSON.stringify(event_payload), event_summary, platform_event_id, platform_type, event_timestamp, processing_status]
      )
      
      const event = res.rows[0]

      // Trigger Rule Evaluation
      // We process asynchronously so we don't block the ingestion response
      try {
        const { evaluateTriggerRules } = await import('./digitalTwinTriggerService')
        // Fire and forget (or could await if critical)
        evaluateTriggerRules(event.asset_id, event.asset_id, event.id, event.event_type)
          .catch(err => logger.error('Failed to evaluate triggers', { error: err.message, eventId: event.id }))
      } catch (err) {
         logger.error('Failed to import digitalTwinTriggerService', { error: err })
      }

      return event
    } catch (error) {
      logger.error('digitalTwinEventService.ingestEvent error', { error })
      throw error
    }
  },

  async getEventsByAsset(assetId: string, limit = 50) {
    try {
      const res = await pool.query(
        `SELECT * FROM digital_twin_events WHERE asset_id = $1 ORDER BY event_timestamp DESC LIMIT $2`,
        [assetId, limit]
      )
      return res.rows
    } catch (error) {
      logger.error('digitalTwinEventService.getEventsByAsset error', { error })
      throw error
    }
  },

  async updateEventStatus(eventId: string, status: string, error?: string) {
    try {
      await pool.query(
        `UPDATE digital_twin_events SET processing_status = $1, processing_error = $2, processed_at = NOW() WHERE id = $3`,
        [status, error, eventId]
      )
    } catch (error) {
      logger.error('digitalTwinEventService.updateEventStatus error', { error })
      throw error
    }
  }
}
