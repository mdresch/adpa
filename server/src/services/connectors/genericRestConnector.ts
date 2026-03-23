/**
 * Generic REST API Connector for Digital Twin Platforms
 * Supports any REST API-based Digital Twin platform with configurable authentication
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md Phase 3.3
 */

import { logger } from '../../utils/logger';
import { ingestEvent, type IngestEventInput, type PlatformType } from '../digitalTwinEventService';
import type { DigitalTwinIngestionSource } from '../digitalTwinIngestionService';
import { type DigitalTwinConnector, type PlatformEvent } from './connectorManager';

export interface ConnectorConfig {
  baseUrl: string;
  authentication: {
    type: 'api_key' | 'oauth2' | 'basic' | 'bearer';
    apiKey?: string;
    username?: string;
    password?: string;
    token?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
  };
  endpoints: {
    assets?: string; // GET endpoint to fetch all assets
    asset?: string; // GET endpoint to fetch single asset (with :id placeholder)
    webhook?: string; // Webhook endpoint path (relative to baseUrl)
  };
  mapping?: {
    assetIdField?: string; // Field name for asset ID in API response
    stateField?: string; // Field name for state data in API response
    timestampField?: string; // Field name for timestamp in API response
  };
  pollInterval?: number; // Polling interval in seconds (default: 60)
}

// Using PlatformEvent from connectorManager

export class GenericRestConnector implements DigitalTwinConnector {
  private config: ConnectorConfig;
  private source: DigitalTwinIngestionSource;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private lastPolledAssets: Map<string, Record<string, unknown>> = new Map();

  constructor(source: DigitalTwinIngestionSource) {
    this.source = source;
    const connConfig = source.connection_config as unknown as ConnectorConfig;
    if (!connConfig?.baseUrl) {
      throw new Error('Invalid connection config: baseUrl is required');
    }
    this.config = {
      baseUrl: connConfig.baseUrl,
      authentication: connConfig.authentication || { type: 'api_key' },
      endpoints: connConfig.endpoints || {},
      mapping: connConfig.mapping || {},
      pollInterval: connConfig.pollInterval || source.poll_interval_seconds || 60,
    };
  }

  /**
   * Connect to the platform and authenticate
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Generic REST platform', {
        sourceId: this.source.id,
        baseUrl: this.config.baseUrl,
      });

      // Authenticate based on type
      if (this.config.authentication.type === 'oauth2') {
        await this.authenticateOAuth2();
      } else if (this.config.authentication.type === 'bearer' && this.config.authentication.token) {
        this.accessToken = this.config.authentication.token;
      }

      // Test connection by fetching assets if endpoint is configured
      if (this.config.endpoints.assets) {
        await this.fetchAssets();
      }

      this.isConnected = true;
      logger.info('Generic REST connector connected', { sourceId: this.source.id });
    } catch (error: any) {
      logger.error('Failed to connect to Generic REST platform', {
        sourceId: this.source.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Authenticate using OAuth2
   */
  private async authenticateOAuth2(): Promise<void> {
    const { clientId, clientSecret, tokenUrl } = this.config.authentication;
    if (!clientId || !clientSecret || !tokenUrl) {
      throw new Error('OAuth2 requires clientId, clientSecret, and tokenUrl');
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth2 authentication failed: ${response.statusText}`);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);
  }

  /**
   * Get authentication headers for API requests
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (this.config.authentication.type) {
      case 'api_key':
        if (this.config.authentication.apiKey) {
          headers['X-API-Key'] = this.config.authentication.apiKey;
        }
        break;
      case 'bearer':
        if (this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        break;
      case 'basic':
        if (this.config.authentication.username && this.config.authentication.password) {
          const credentials = Buffer.from(
            `${this.config.authentication.username}:${this.config.authentication.password}`
          ).toString('base64');
          headers['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'oauth2':
        if (this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
        }
        break;
    }

    return headers;
  }

  /**
   * Fetch all assets from the platform
   */
  async fetchAssets(): Promise<Array<{ id: string; state: Record<string, unknown> }>> {
    if (!this.config.endpoints.assets) {
      throw new Error('Assets endpoint not configured');
    }

    const url = `${this.config.baseUrl}${this.config.endpoints.assets}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.statusText}`);
    }

    const data = await response.json();
    const assets = Array.isArray(data) ? data : data.items || data.assets || [];

    return assets.map((asset: any) => ({
      id: asset[this.config.mapping?.assetIdField || 'id'] || asset.id,
      state: asset[this.config.mapping?.stateField || 'state'] || asset,
    }));
  }

  /**
   * Fetch state for a specific asset
   */
  async fetchAssetState(assetId: string): Promise<Record<string, unknown>> {
    if (!this.config.endpoints.asset) {
      throw new Error('Asset endpoint not configured');
    }

    const url = `${this.config.baseUrl}${this.config.endpoints.asset.replace(':id', assetId)}`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch asset state: ${response.statusText}`);
    }

    const data = await response.json();
    return data[this.config.mapping?.stateField || 'state'] || data;
  }

  /**
   * Start polling for asset state changes
   */
  async startPolling(): Promise<void> {
    if (this.pollingInterval) {
      logger.warn('Polling already started', { sourceId: this.source.id });
      return;
    }

    logger.info('Starting polling for Generic REST platform', {
      sourceId: this.source.id,
      interval: this.config.pollInterval,
    });

    // Initial poll
    await this.poll();

    // Set up interval
    this.pollingInterval = setInterval(() => {
      this.poll().catch((error) => {
        logger.error('Polling error', { sourceId: this.source.id, error: error.message });
      });
    }, (this.config.pollInterval || 60) * 1000);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('Polling stopped', { sourceId: this.source.id });
    }
  }

  /**
   * Poll for changes and emit events
   */
  private async poll(): Promise<void> {
    try {
      const assets = await this.fetchAssets();

      for (const asset of assets) {
        const previousState = this.lastPolledAssets.get(asset.id);
        const currentState = asset.state;

        if (previousState) {
          // Compare states and emit event if changed
          const stateChanged = JSON.stringify(previousState) !== JSON.stringify(currentState);
          if (stateChanged) {
            await this.emitEvent({
              assetId: asset.id,
              eventType: 'state_change',
              eventPayload: {
                previous_state: previousState,
                current_state: currentState,
                changed_fields: this.detectChangedFields(previousState, currentState),
              },
              eventSummary: `State changed for asset ${asset.id}`,
            });
          }
        } else {
          // First time seeing this asset - emit creation event
          await this.emitEvent({
            assetId: asset.id,
            eventType: 'creation',
            eventPayload: { state: currentState },
            eventSummary: `Asset ${asset.id} discovered`,
          });
        }

        this.lastPolledAssets.set(asset.id, currentState);
      }
    } catch (error: any) {
      logger.error('Polling failed', { sourceId: this.source.id, error: error.message });
      await this.emitEvent({
        assetId: 'unknown',
        eventType: 'sync_error',
        eventPayload: { error: error.message },
        eventSummary: `Sync error: ${error.message}`,
      });
    }
  }

  /**
   * Detect changed fields between two states
   */
  private detectChangedFields(
    previous: Record<string, unknown>,
    current: Record<string, unknown>
  ): string[] {
    const changed: string[] = [];
    const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);

    for (const key of allKeys) {
      if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
        changed.push(key);
      }
    }

    return changed;
  }

  /**
   * Emit event to digital_twin_events table
   */
  async emitEvent(event: PlatformEvent): Promise<void> {
    try {
      const input: IngestEventInput = {
        asset_id: event.assetId,
        event_type: event.eventType,
        event_payload: event.eventPayload,
        event_summary: event.eventSummary,
        platform_event_id: event.platformEventId,
        platform_type: this.source.platform_type as PlatformType,
        event_timestamp: event.eventTimestamp,
      };

      await ingestEvent(input);
      logger.debug('Event emitted', {
        sourceId: this.source.id,
        assetId: event.assetId,
        eventType: event.eventType,
      });
    } catch (error: any) {
      logger.error('Failed to emit event', {
        sourceId: this.source.id,
        assetId: event.assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle webhook event from platform
   */
  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    try {
      // Extract event data from webhook payload
      const assetId = (payload.asset_id || payload.assetId || payload.id) as string;
      const eventType = (payload.event_type || payload.eventType || 'state_change') as string;
      const eventPayload = (payload.event_payload || payload.eventPayload || payload) as Record<string, unknown>;

      if (!assetId) {
        throw new Error('Webhook payload missing asset_id');
      }

      await this.emitEvent({
        assetId,
        eventType: eventType as PlatformEvent['eventType'],
        eventPayload,
        eventSummary: payload.summary as string,
        platformEventId: payload.platform_event_id as string,
        eventTimestamp: payload.timestamp ? new Date(payload.timestamp as string) : new Date(),
      });

      logger.info('Webhook event processed', {
        sourceId: this.source.id,
        assetId,
        eventType,
      });
    } catch (error: any) {
      logger.error('Webhook processing failed', {
        sourceId: this.source.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Disconnect from the platform
   */
  async disconnect(): Promise<void> {
    this.stopPolling();
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    logger.info('Generic REST connector disconnected', { sourceId: this.source.id });
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; lastPoll?: Date; nextPoll?: Date } {
    return {
      connected: this.isConnected,
    };
  }
}
