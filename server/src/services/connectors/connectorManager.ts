/**
 * Digital Twin Connector Manager
 * Manages connector instances for different platforms
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md Phase 3
 */

import { logger } from '../../utils/logger';
import { GenericRestConnector } from './genericRestConnector';
import { iTwinConnector } from './iTwinConnector';
import { AzureDigitalTwinsConnector } from './azureDigitalTwinsConnector';
import type { DigitalTwinIngestionSource } from '../digitalTwinIngestionService';
export type PlatformEvent = {
  assetId: string;
  eventType: 'state_change' | 'attribute_change' | 'relationship_change' | 'creation' | 'deletion' | 'alert' | 'sync_error';
  eventPayload: any;
  eventSummary?: string;
  platformEventId?: string;
  eventTimestamp?: Date;
};

export interface DigitalTwinConnector {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  startPolling?(): Promise<void>;
  stopPolling?(): void;
  fetchAssetState?(assetId: string): Promise<Record<string, unknown>>;
  handleWebhook?(payload: Record<string, unknown>): Promise<void>;
  getStatus(): { connected: boolean; [key: string]: unknown };
  emitEvent(event: PlatformEvent): Promise<void>;
}

class ConnectorManager {
  private connectors: Map<string, DigitalTwinConnector> = new Map();

  /**
   * Create and register a connector for an ingestion source
   */
  async createConnector(source: DigitalTwinIngestionSource): Promise<DigitalTwinConnector> {
    const sourceId = source.id;

    // If connector already exists, return it
    if (this.connectors.has(sourceId)) {
      return this.connectors.get(sourceId)!;
    }

    let connector: DigitalTwinConnector;

    switch (source.platform_type) {
      case 'Generic':
        connector = new GenericRestConnector(source);
        break;
      case 'iTwin':
        connector = new iTwinConnector(source);
        break;
      case 'AzureDT':
        connector = new AzureDigitalTwinsConnector(source);
        break;
      default:
        throw new Error(`Unsupported platform type: ${source.platform_type}`);
    }

    this.connectors.set(sourceId, connector);
    logger.info('Connector created', { sourceId, platformType: source.platform_type });

    return connector;
  }

  /**
   * Get connector for an ingestion source
   */
  getConnector(sourceId: string): DigitalTwinConnector | null {
    return this.connectors.get(sourceId) || null;
  }

  /**
   * Remove connector
   */
  async removeConnector(sourceId: string): Promise<void> {
    const connector = this.connectors.get(sourceId);
    if (connector) {
      try {
        await connector.disconnect();
        if (connector.stopPolling) {
          connector.stopPolling();
        }
      } catch (error: any) {
        logger.error('Error disconnecting connector', { sourceId, error: error.message });
      }
      this.connectors.delete(sourceId);
      logger.info('Connector removed', { sourceId });
    }
  }

  /**
   * Start connector for an ingestion source
   */
  async startConnector(source: DigitalTwinIngestionSource): Promise<void> {
    const connector = await this.createConnector(source);
    await connector.connect();

    // Start polling if sync mode is polling
    if (source.sync_mode === 'polling' && connector.startPolling) {
      await connector.startPolling();
    }

    logger.info('Connector started', { sourceId: source.id, syncMode: source.sync_mode });
  }

  /**
   * Stop connector for an ingestion source
   */
  async stopConnector(sourceId: string): Promise<void> {
    const connector = this.connectors.get(sourceId);
    if (connector) {
      if (connector.stopPolling) {
        connector.stopPolling();
      }
      await connector.disconnect();
      logger.info('Connector stopped', { sourceId });
    }
  }

  /**
   * Get all active connectors
   */
  getActiveConnectors(): Array<{ sourceId: string; connector: DigitalTwinConnector }> {
    return Array.from(this.connectors.entries()).map(([sourceId, connector]) => ({
      sourceId,
      connector,
    }));
  }

  /**
   * Handle webhook for a source
   */
  async handleWebhook(sourceId: string, payload: Record<string, unknown>): Promise<void> {
    const connector = this.connectors.get(sourceId);
    if (!connector) {
      throw new Error(`Connector not found for source: ${sourceId}`);
    }

    if (!connector.handleWebhook) {
      throw new Error(`Connector does not support webhooks: ${sourceId}`);
    }

    await connector.handleWebhook(payload);
  }
}

// Singleton instance
export const connectorManager = new ConnectorManager();
