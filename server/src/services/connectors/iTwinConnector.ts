/**
 * Bentley iTwin Connector for Digital Twin Platforms
 * Uses iTwin.js Platform API for authentication and asset management
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md Phase 3.1
 * @see https://www.itwinjs.org/ for iTwin.js documentation
 */

import { logger } from '../../utils/logger';
import { ingestEvent, type IngestEventInput, type PlatformType } from '../digitalTwinEventService';
import type { DigitalTwinIngestionSource } from '../digitalTwinIngestionService';
import type { PlatformEvent } from './genericRestConnector';

export interface iTwinConfig {
  clientId: string;
  clientSecret: string;
  itwinId?: string; // iTwin project ID
  imodelId?: string; // iModel ID (optional, for specific iModel access)
  scopes?: string[]; // OAuth scopes (default: ['itwins:read', 'imodels:read'])
  baseUrl?: string; // iTwin Platform API base URL (default: https://api.bentley.com)
}

export class iTwinConnector {
  private config: iTwinConfig;
  private source: DigitalTwinIngestionSource;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private lastPolledAssets: Map<string, Record<string, unknown>> = new Map();
  private readonly BASE_URL = 'https://api.bentley.com';
  private readonly TOKEN_URL = 'https://ims.bentley.com/connect/token';

  constructor(source: DigitalTwinIngestionSource) {
    this.source = source;
    const connConfig = source.connection_config as iTwinConfig;
    
    if (!connConfig?.clientId || !connConfig?.clientSecret) {
      throw new Error('Invalid iTwin connection config: clientId and clientSecret are required');
    }

    this.config = {
      clientId: connConfig.clientId,
      clientSecret: connConfig.clientSecret,
      itwinId: connConfig.itwinId,
      imodelId: connConfig.imodelId,
      scopes: connConfig.scopes || ['itwins:read', 'imodels:read'],
      baseUrl: connConfig.baseUrl || this.BASE_URL,
    };
  }

  /**
   * Connect to iTwin Platform and authenticate
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Bentley iTwin Platform', {
        sourceId: this.source.id,
        itwinId: this.config.itwinId,
      });

      await this.authenticate();

      // Test connection by fetching iTwin info if itwinId is provided
      if (this.config.itwinId) {
        await this.fetchiTwinInfo(this.config.itwinId);
      }

      this.isConnected = true;
      logger.info('iTwin connector connected', { sourceId: this.source.id });
    } catch (error: any) {
      logger.error('Failed to connect to iTwin Platform', {
        sourceId: this.source.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Authenticate using OAuth2 client credentials flow
   */
  private async authenticate(): Promise<void> {
    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', this.config.scopes!.join(' '));

      const response = await fetch(this.TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OAuth2 authentication failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      logger.debug('iTwin authentication successful', { sourceId: this.source.id });
    } catch (error: any) {
      logger.error('iTwin authentication failed', {
        sourceId: this.source.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Refresh access token if expired
   */
  private async ensureAuthenticated(): Promise<void> {
    if (!this.accessToken || !this.tokenExpiry || this.tokenExpiry <= new Date()) {
      await this.authenticate();
    }
  }

  /**
   * Get authentication headers for API requests
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    await this.ensureAuthenticated();
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch iTwin project information
   */
  async fetchiTwinInfo(itwinId: string): Promise<Record<string, unknown>> {
    const headers = await this.getAuthHeaders();
    const url = `${this.config.baseUrl}/itwins/${itwinId}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch iTwin info: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Fetch iModels for an iTwin project
   */
  async fetchiModels(itwinId: string): Promise<Array<Record<string, unknown>>> {
    const headers = await this.getAuthHeaders();
    const url = `${this.config.baseUrl}/imodels?iTwinId=${itwinId}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to fetch iModels: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : data.iModels || data.items || [];
  }

  /**
   * Fetch elements/properties from an iModel (represents assets)
   * This is a simplified version - in production, you'd use iTwin.js SDK for more complex queries
   */
  async fetchiModelElements(imodelId: string): Promise<Array<{ id: string; properties: Record<string, unknown> }>> {
    const headers = await this.getAuthHeaders();
    // Note: This is a simplified example. Real implementation would use iTwin.js SDK
    // or the iTwin Platform API's element query endpoints
    const url = `${this.config.baseUrl}/imodels/${imodelId}/elements`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      // If endpoint doesn't exist, return empty array (API might require different approach)
      if (response.status === 404) {
        logger.warn('iModel elements endpoint not available, using mock data for POC', {
          sourceId: this.source.id,
          imodelId,
        });
        return [];
      }
      throw new Error(`Failed to fetch iModel elements: ${response.statusText}`);
    }

    const data = await response.json();
    const elements = Array.isArray(data) ? data : data.elements || data.items || [];

    return elements.map((element: any) => ({
      id: element.id || element.ecInstanceId || element.elementId,
      properties: element.properties || element,
    }));
  }

  /**
   * Start polling for asset state changes
   */
  async startPolling(): Promise<void> {
    if (this.pollingInterval) {
      logger.warn('Polling already started', { sourceId: this.source.id });
      return;
    }

    if (!this.config.itwinId) {
      throw new Error('iTwin ID is required for polling');
    }

    logger.info('Starting polling for iTwin Platform', {
      sourceId: this.source.id,
      itwinId: this.config.itwinId,
      interval: this.source.poll_interval_seconds,
    });

    // Initial poll
    await this.poll();

    // Set up interval
    const intervalMs = (this.source.poll_interval_seconds || 60) * 1000;
    this.pollingInterval = setInterval(() => {
      this.poll().catch((error) => {
        logger.error('iTwin polling error', { sourceId: this.source.id, error: error.message });
      });
    }, intervalMs);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      logger.info('iTwin polling stopped', { sourceId: this.source.id });
    }
  }

  /**
   * Poll for changes and emit events
   */
  private async poll(): Promise<void> {
    try {
      if (!this.config.itwinId) {
        return;
      }

      // Fetch iModels (representing different asset collections)
      const iModels = await this.fetchiModels(this.config.itwinId);

      for (const iModel of iModels) {
        const imodelId = (iModel.id || iModel.iModelId) as string;
        if (!imodelId) continue;

        // Fetch elements from iModel (these represent assets)
        const elements = await this.fetchiModelElements(imodelId);

        for (const element of elements) {
          const assetId = element.id;
          const previousState = this.lastPolledAssets.get(assetId);
          const currentState = element.properties;

          if (previousState) {
            // Compare states and emit event if changed
            const stateChanged = JSON.stringify(previousState) !== JSON.stringify(currentState);
            if (stateChanged) {
              await this.emitEvent({
                assetId,
                eventType: 'state_change',
                eventPayload: {
                  previous_state: previousState,
                  current_state: currentState,
                  changed_fields: this.detectChangedFields(previousState, currentState),
                  imodel_id: imodelId,
                },
                eventSummary: `State changed for asset ${assetId} in iModel ${imodelId}`,
              });
            }
          } else {
            // First time seeing this asset - emit creation event
            await this.emitEvent({
              assetId,
              eventType: 'creation',
              eventPayload: {
                state: currentState,
                imodel_id: imodelId,
              },
              eventSummary: `Asset ${assetId} discovered in iModel ${imodelId}`,
            });
          }

          this.lastPolledAssets.set(assetId, currentState);
        }
      }
    } catch (error: any) {
      logger.error('iTwin polling failed', { sourceId: this.source.id, error: error.message });
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
        platform_type: 'iTwin' as PlatformType,
        event_timestamp: event.eventTimestamp,
      };

      await ingestEvent(input);
      logger.debug('iTwin event emitted', {
        sourceId: this.source.id,
        assetId: event.assetId,
        eventType: event.eventType,
      });
    } catch (error: any) {
      logger.error('Failed to emit iTwin event', {
        sourceId: this.source.id,
        assetId: event.assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle webhook event from iTwin Platform
   * Note: iTwin Platform may support webhooks for real-time updates
   */
  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    try {
      // Extract event data from webhook payload
      const assetId = (payload.asset_id || payload.assetId || payload.elementId || payload.id) as string;
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

      logger.info('iTwin webhook event processed', {
        sourceId: this.source.id,
        assetId,
        eventType,
      });
    } catch (error: any) {
      logger.error('iTwin webhook processing failed', {
        sourceId: this.source.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Fetch asset state for a specific asset
   */
  async fetchAssetState(assetId: string): Promise<Record<string, unknown>> {
    if (!this.config.imodelId) {
      throw new Error('iModel ID is required to fetch asset state');
    }

    const elements = await this.fetchiModelElements(this.config.imodelId);
    const element = elements.find((e) => e.id === assetId);

    if (!element) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    return element.properties;
  }

  /**
   * Disconnect from iTwin Platform
   */
  async disconnect(): Promise<void> {
    this.stopPolling();
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    logger.info('iTwin connector disconnected', { sourceId: this.source.id });
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; itwinId?: string; lastPoll?: Date; nextPoll?: Date } {
    return {
      connected: this.isConnected,
      itwinId: this.config.itwinId,
    };
  }
}
