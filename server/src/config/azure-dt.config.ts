/**
 * Azure Digital Twins Configuration
 * Environment variables and default settings for Azure DT integration
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md Phase 3.2
 */

export interface AzureDTEnvironmentConfig {
  instanceUrl: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  eventGridTopicEndpoint?: string;
  eventGridKey?: string;
}

/**
 * Get Azure DT configuration from environment variables
 */
export function getAzureDTConfig(): AzureDTEnvironmentConfig {
  return {
    instanceUrl: process.env.AZURE_DT_INSTANCE_URL || '',
    tenantId: process.env.AZURE_DT_TENANT_ID || '',
    clientId: process.env.AZURE_DT_CLIENT_ID || '',
    clientSecret: process.env.AZURE_DT_CLIENT_SECRET || '',
    eventGridTopicEndpoint: process.env.AZURE_DT_EVENT_GRID_ENDPOINT,
    eventGridKey: process.env.AZURE_DT_EVENT_GRID_KEY,
  };
}

/**
 * Validate Azure DT configuration
 */
export function validateAzureDTConfig(config: AzureDTEnvironmentConfig): boolean {
  return !!(
    config.instanceUrl &&
    config.tenantId &&
    config.clientId &&
    config.clientSecret
  );
}
