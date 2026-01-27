/**
 * Bentley iTwin Configuration
 * Environment variables and default settings for iTwin Platform integration
 * @see plans/DIGITAL_TWIN_POC_IMPLEMENTATION_PLAN_REVISED.md Phase 3.1
 */

export interface iTwinEnvironmentConfig {
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  tokenUrl?: string;
  defaultScopes?: string[];
}

/**
 * Get iTwin configuration from environment variables
 */
export function getiTwinConfig(): iTwinEnvironmentConfig {
  return {
    clientId: process.env.ITWIN_CLIENT_ID || '',
    clientSecret: process.env.ITWIN_CLIENT_SECRET || '',
    baseUrl: process.env.ITWIN_BASE_URL || 'https://api.bentley.com',
    tokenUrl: process.env.ITWIN_TOKEN_URL || 'https://ims.bentley.com/connect/token',
    defaultScopes: [
      'itwins:read',
      'imodels:read',
      'imodels:modify',
    ],
  };
}

/**
 * Validate iTwin configuration
 */
export function validateiTwinConfig(config: iTwinEnvironmentConfig): boolean {
  return !!(config.clientId && config.clientSecret);
}
