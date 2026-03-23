/**
 * Azure Digital Twins Connector for Digital Twin Platforms
 * Uses Azure Digital Twins REST API and Event Grid for real-time updates
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md Phase 3.2
 * @see https://learn.microsoft.com/en-us/azure/digital-twins/ for Azure DT documentation
 */

import { logger } from '../../utils/logger';
import { ingestEvent, type IngestEventInput, type PlatformType } from '../digitalTwinEventService';
import type { DigitalTwinIngestionSource } from '../digitalTwinIngestionService';
import { type PlatformEvent, type DigitalTwinConnector } from './connectorManager';

export interface AzureDTConfig {
  instanceUrl: string; // e.g., https://your-instance.api.wus2.digitaltwins.azure.net
  tenantId: string;
  clientId: string;
  clientSecret: string;
  eventGridTopicEndpoint?: string; // Event Grid custom topic endpoint for webhooks
  eventGridKey?: string; // Event Grid access key
}

export class AzureDigitalTwinsConnector implements DigitalTwinConnector {
  private config: AzureDTConfig;
  private source: DigitalTwinIngestionSource;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;
  private lastPolledTwins: Map<string, Record<string, unknown>> = new Map();
  private readonly TOKEN_URL_TEMPLATE = 'https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token';

  constructor(source: DigitalTwinIngestionSource) {
    this.source = source;
    const connConfig = source.connection_config as unknown as AzureDTConfig;
    
    if (!connConfig?.instanceUrl || !connConfig?.tenantId || !connConfig?.clientId || !connConfig?.clientSecret) {
      throw new Error('Invalid Azure DT connection config: instanceUrl, tenantId, clientId, and clientSecret are required');
    }

    this.config = {
      instanceUrl: connConfig.instanceUrl.replace(/\/$/, ''), // Remove trailing slash
      tenantId: connConfig.tenantId,
      clientId: connConfig.clientId,
      clientSecret: connConfig.clientSecret,
      eventGridTopicEndpoint: connConfig.eventGridTopicEndpoint,
      eventGridKey: connConfig.eventGridKey,
    };
  }

  /**
   * Connect to Azure Digital Twins and authenticate
   */
  async connect(): Promise<void> {
    try {
      logger.info('Connecting to Azure Digital Twins', {
        sourceId: this.source.id,
        instanceUrl: this.config.instanceUrl,
      });

      await this.authenticate();

      // Test connection by querying twins
      await this.queryTwins('SELECT * FROM digitaltwins LIMIT 1');

      this.isConnected = true;
      logger.info('Azure DT connector connected', { sourceId: this.source.id });
    } catch (error: any) {
      logger.error('Failed to connect to Azure Digital Twins', {
        sourceId: this.source.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Authenticate using Azure AD OAuth2 client credentials flow
   */
  private async authenticate(): Promise<void> {
    try {
      const tokenUrl = this.TOKEN_URL_TEMPLATE.replace('{tenantId}', this.config.tenantId);
      
      const params = new URLSearchParams();
      params.append('grant_type', 'client_credentials');
      params.append('client_id', this.config.clientId);
      params.append('client_secret', this.config.clientSecret);
      params.append('scope', 'https://digitaltwins.azure.net/.default');

      const response = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure AD authentication failed: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      const expiresIn = data.expires_in || 3600;
      this.tokenExpiry = new Date(Date.now() + expiresIn * 1000);

      logger.debug('Azure DT authentication successful', { sourceId: this.source.id });
    } catch (error: any) {
      logger.error('Azure DT authentication failed', {
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
   * Query twins using Azure DT Query API
   */
  async queryTwins(query: string): Promise<Array<Record<string, unknown>>> {
    const headers = await this.getAuthHeaders();
    const url = `${this.config.instanceUrl}/query?api-version=2022-05-31`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to query twins: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  /**
   * Get a specific twin by ID
   */
  async getTwin(twinId: string): Promise<Record<string, unknown>> {
    const headers = await this.getAuthHeaders();
    const url = `${this.config.instanceUrl}/digitaltwins/${twinId}?api-version=2022-05-31`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to get twin: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get relationships for a twin
   */
  async getRelationships(twinId: string): Promise<Array<Record<string, unknown>>> {
    const headers = await this.getAuthHeaders();
    const url = `${this.config.instanceUrl}/digitaltwins/${twinId}/relationships?api-version=2022-05-31`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Failed to get relationships: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value || [];
  }

  /**
   * Start polling for twin state changes
   */
  async startPolling(): Promise<void> {
    if (this.pollingInterval) {
      logger.warn('Polling already started', { sourceId: this.source.id });
      return;
    }

    logger.info('Starting polling for Azure Digital Twins', {
      sourceId: this.source.id,
      instanceUrl: this.config.instanceUrl,
      interval: this.source.poll_interval_seconds,
    });

    // Initial poll
    await this.poll();

    // Set up interval
    const intervalMs = (this.source.poll_interval_seconds || 60) * 1000;
    this.pollingInterval = setInterval(() => {
      this.poll().catch((error) => {
        logger.error('Azure DT polling error', { sourceId: this.source.id, error: error.message });
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
      logger.info('Azure DT polling stopped', { sourceId: this.source.id });
    }
  }

  /**
   * Poll for changes and emit events
   */
  private async poll(): Promise<void> {
    try {
      // Query all twins
      const twins = await this.queryTwins('SELECT * FROM digitaltwins');

      for (const twin of twins) {
        const twinId = (twin.$dtId || twin.id) as string;
        if (!twinId) continue;

        // Extract properties (state) from twin
        const currentState: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(twin)) {
          if (!key.startsWith('$')) {
            currentState[key] = value;
          }
        }

        const previousState = this.lastPolledTwins.get(twinId);

        if (previousState) {
          // Compare states and emit event if changed
          const stateChanged = JSON.stringify(previousState) !== JSON.stringify(currentState);
          if (stateChanged) {
            await this.emitEvent({
              assetId: twinId,
              eventType: 'state_change',
              eventPayload: {
                previous_state: previousState,
                current_state: currentState,
                changed_fields: this.detectChangedFields(previousState, currentState),
                twin_metadata: {
                  $dtId: twin.$dtId,
                  $etag: twin.$etag,
                  $metadata: twin.$metadata,
                },
              },
              eventSummary: `State changed for twin ${twinId}`,
            });
          }
        } else {
          // First time seeing this twin - emit creation event
          await this.emitEvent({
            assetId: twinId,
            eventType: 'creation',
            eventPayload: {
              state: currentState,
              twin_metadata: {
                $dtId: twin.$dtId,
                $etag: twin.$etag,
                $metadata: twin.$metadata,
              },
            },
            eventSummary: `Twin ${twinId} discovered`,
          });
        }

        this.lastPolledTwins.set(twinId, currentState);
      }
    } catch (error: any) {
      logger.error('Azure DT polling failed', { sourceId: this.source.id, error: error.message });
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
        platform_type: 'AzureDT' as PlatformType,
        event_timestamp: event.eventTimestamp,
      };

      await ingestEvent(input);
      logger.debug('Azure DT event emitted', {
        sourceId: this.source.id,
        assetId: event.assetId,
        eventType: event.eventType,
      });
    } catch (error: any) {
      logger.error('Failed to emit Azure DT event', {
        sourceId: this.source.id,
        assetId: event.assetId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Handle webhook event from Azure Event Grid
   * Azure DT can be configured to send events to Event Grid, which can forward to webhooks
   */
  async handleWebhook(payload: Record<string, unknown>): Promise<void> {
    try {
      // Event Grid webhook format
      const events = Array.isArray(payload) ? payload : [payload];

      for (const event of events) {
        const eventData = (event.data || event) as Record<string, unknown>;
        const twinId = (eventData.$dtId || eventData.twinId || eventData.id) as string;
        const eventType = (eventData.eventType || event.eventType || 'state_change') as string;

        if (!twinId) {
          logger.warn('Azure DT webhook missing twin ID', { sourceId: this.source.id, event });
          continue;
        }

        // Get current twin state
        const twin = await this.getTwin(twinId);
        const currentState: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(twin)) {
          if (!key.startsWith('$')) {
            currentState[key] = value;
          }
        }

        await this.emitEvent({
          assetId: twinId,
          eventType: this.mapAzureDTEventType(eventType),
          eventPayload: {
            state: currentState,
            event_grid_event: event,
            twin_metadata: {
              $dtId: twin.$dtId,
              $etag: twin.$etag,
              $metadata: twin.$metadata,
            },
          },
          eventSummary: `Azure DT event: ${eventType} for twin ${twinId}`,
          platformEventId: event.id as string,
          eventTimestamp: event.eventTime ? new Date(event.eventTime as string) : new Date(),
        });
      }

      logger.info('Azure DT webhook events processed', {
        sourceId: this.source.id,
        eventCount: events.length,
      });
    } catch (error: any) {
      logger.error('Azure DT webhook processing failed', {
        sourceId: this.source.id,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Map Azure DT event types to our event types
   */
  private mapAzureDTEventType(azureEventType: string): PlatformEvent['eventType'] {
    const lower = azureEventType.toLowerCase();
    if (lower.includes('create') || lower.includes('created')) return 'creation';
    if (lower.includes('delete') || lower.includes('deleted')) return 'deletion';
    if (lower.includes('update') || lower.includes('updated') || lower.includes('patch')) return 'state_change';
    if (lower.includes('relationship')) return 'relationship_change';
    if (lower.includes('alert') || lower.includes('warning')) return 'alert';
    return 'state_change';
  }

  /**
   * Fetch asset state for a specific twin
   */
  async fetchAssetState(assetId: string): Promise<Record<string, unknown>> {
    const twin = await this.getTwin(assetId);
    const state: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(twin)) {
      if (!key.startsWith('$')) {
        state[key] = value;
      }
    }
    return state;
  }

  /**
   * Disconnect from Azure Digital Twins
   */
  async disconnect(): Promise<void> {
    this.stopPolling();
    this.isConnected = false;
    this.accessToken = null;
    this.tokenExpiry = null;
    logger.info('Azure DT connector disconnected', { sourceId: this.source.id });
  }

  /**
   * Get connection status
   */
  getStatus(): { connected: boolean; instanceUrl?: string; lastPoll?: Date; nextPoll?: Date } {
    return {
      connected: this.isConnected,
      instanceUrl: this.config.instanceUrl,
    };
  }
}
