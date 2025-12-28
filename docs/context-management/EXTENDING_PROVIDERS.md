# Extending Context Management Providers

This guide explains how to add new providers to the Context Management system.

## Overview

The Context Management system uses a provider-based architecture where each external API (Confluence, Jira, etc.) is implemented as a provider adapter. Adapters normalize external API responses into a standard format that can be consumed by AI services.

## Architecture

```
┌─────────────────┐
│  API Routes     │  GET /api/contexts?provider=...
└────────┬────────┘
         │
┌────────▼────────┐
│ Provider       │  Registry maps provider name → adapter factory
│ Registry       │
└────────┬────────┘
         │
┌────────▼────────┐
│ Provider       │  Implements search() and fetchById()
│ Adapter        │
└────────┬────────┘
         │
┌────────▼────────┐
│ External API   │  Confluence, Jira, SharePoint, etc.
└─────────────────┘
```

## Step-by-Step Guide

### 1. Define the Provider Type

Add your provider to the `ProviderName` type in `server/src/contexts/types.ts`:

```typescript
export type ProviderName = 'confluence' | 'jira' | 'sharepoint' // Add your provider
```

### 2. Create the Adapter

Create a new file `server/src/contexts/adapters/yourProviderAdapter.ts`:

```typescript
import axios from 'axios'
import { pool } from '../../database/connection'
import { getCacheWithStale, setCache, makeKey, markRefreshing, clearRefreshing } from '../../utils/cache'
import { checkCircuitBreaker, recordSuccess, recordFailure } from '../../utils/circuitBreaker'
import { checkRateLimit } from '../../utils/rateLimiter'
import { logger } from '../../utils/logger'
import { NormalizedContext, ProviderAdapter } from '../types'

const TTL_SECONDS = 120 // Adjust based on provider's data freshness needs
const PROVIDER = 'yourprovider'

/**
 * Get active integration for this provider from database
 */
async function getActiveIntegration() {
  const res = await pool.query(
    `SELECT id, configuration, credentials_encrypted 
     FROM integrations 
     WHERE type = $1 AND is_active = true 
     ORDER BY updated_at DESC LIMIT 1`,
    [PROVIDER]
  )
  
  if (res.rows.length === 0) {
    throw new Error(`No active ${PROVIDER} integration`)
  }
  
  const row = res.rows[0]
  const cfg = row.configuration || {}
  let creds: any = {}
  
  if (row.credentials_encrypted) {
    try {
      creds = JSON.parse(Buffer.from(row.credentials_encrypted, 'base64').toString())
    } catch {}
  }
  
  const baseUrl = (cfg.base_url as string)?.replace(/\/+$/, '') || ''
  if (!baseUrl.startsWith('http')) {
    throw new Error(`${PROVIDER} base URL invalid`)
  }
  
  return {
    id: row.id,
    baseUrl,
    // Extract credentials as needed
    apiKey: creds.api_key,
    // ... other credentials
  }
}

/**
 * Normalize external API response to standard format
 */
function normalizeItem(baseUrl: string, item: any): NormalizedContext {
  return {
    id: item.id || item.key, // Use appropriate ID field
    provider: PROVIDER as 'confluence' | 'jira', // Update type
    title: item.title || item.name || '',
    summary: (item.content || item.description || '').slice(0, 10000), // Truncate to 10k
    url: `${baseUrl}/path/to/${item.id}`, // Construct URL
    last_modified: item.updated_at || item.modified || undefined,
    fetched_at: new Date().toISOString(),
    access_scope: item.project_id ? { projectId: item.project_id } : undefined,
    metadata: {
      // Provider-specific metadata
      status: item.status,
      // ... other fields
    }
  }
}

/**
 * Factory function that returns the adapter
 */
export function yourProviderAdapterFactory(): ProviderAdapter {
  return {
    async search({ query, projectId, fresh }): Promise<NormalizedContext[]> {
      const integ = await getActiveIntegration()
      const key = makeKey(['ctx', PROVIDER, 'search', query, projectId])
      
      // 1. Check circuit breaker
      const circuitCheck = checkCircuitBreaker(PROVIDER)
      if (!circuitCheck.allowed) {
        logger.warn(`[${PROVIDER}] Circuit breaker is OPEN, rejecting request`)
        throw new Error('Service temporarily unavailable (circuit breaker open)')
      }
      
      // 2. Check rate limit
      const rateLimit = checkRateLimit(PROVIDER)
      if (!rateLimit.allowed) {
        logger.warn(`[${PROVIDER}] Rate limit exceeded`)
        throw new Error(`Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}`)
      }
      
      // 3. Stale-while-revalidate: return cached if available
      if (!fresh) {
        const cached = getCacheWithStale<NormalizedContext[]>(key)
        if (cached) {
          // If stale, trigger background refresh
          if (cached.isStale && markRefreshing(key)) {
            this.search({ query, projectId, fresh: true })
              .catch(err => {
                logger.warn(`[${PROVIDER}] Background refresh failed:`, err)
                clearRefreshing(key)
              })
              .then(() => clearRefreshing(key))
          }
          return cached.value
        }
      }
      
      // 4. Fetch from API
      try {
        const client = axios.create({
          baseURL: integ.baseUrl,
          headers: {
            'Authorization': `Bearer ${integ.apiKey}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        })
        
        // Make API call (adjust endpoint and params as needed)
        const resp = await client.get('/api/search', {
          params: {
            q: query,
            limit: 20, // Enforce 20 item limit
            projectId: projectId
          }
        })
        
        // 5. Normalize and cache results
        const results = (resp.data?.items || []).map((item: any) => normalizeItem(integ.baseUrl, item))
        setCache(key, results, TTL_SECONDS)
        recordSuccess(PROVIDER)
        
        return results
      } catch (error: any) {
        recordFailure(PROVIDER)
        throw error
      }
    },

    async fetchById({ id, projectId, fresh }): Promise<NormalizedContext | null> {
      const integ = await getActiveIntegration()
      const key = makeKey(['ctx', PROVIDER, 'id', id])
      
      // Same pattern as search: circuit breaker, rate limit, stale-while-revalidate
      const circuitCheck = checkCircuitBreaker(PROVIDER)
      if (!circuitCheck.allowed) {
        throw new Error('Service temporarily unavailable (circuit breaker open)')
      }
      
      const rateLimit = checkRateLimit(PROVIDER)
      if (!rateLimit.allowed) {
        throw new Error(`Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}`)
      }
      
      if (!fresh) {
        const cached = getCacheWithStale<NormalizedContext>(key)
        if (cached) {
          if (cached.isStale && markRefreshing(key)) {
            this.fetchById({ id, projectId, fresh: true })
              .catch(err => {
                logger.warn(`[${PROVIDER}] Background refresh failed:`, err)
                clearRefreshing(key)
              })
              .then(() => clearRefreshing(key))
          }
          return cached.value
        }
      }
      
      try {
        const client = axios.create({
          baseURL: integ.baseUrl,
          headers: {
            'Authorization': `Bearer ${integ.apiKey}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        })
        
        const resp = await client.get(`/api/items/${id}`)
        const normalized = normalizeItem(integ.baseUrl, resp.data)
        setCache(key, normalized, TTL_SECONDS)
        recordSuccess(PROVIDER)
        
        return normalized
      } catch (error: any) {
        recordFailure(PROVIDER)
        if (error.response?.status === 404) {
          return null
        }
        throw error
      }
    }
  }
}
```

### 3. Register the Adapter

Add your adapter to the registry in `server/src/contexts/providerRegistry.ts`:

```typescript
import { yourProviderAdapterFactory } from './adapters/yourProviderAdapter'

export type ProviderName = 'confluence' | 'jira' | 'yourprovider' // Add here

const registry: Record<ProviderName, () => ProviderAdapter> = {
  confluence: confluenceAdapterFactory,
  jira: jiraAdapterFactory,
  yourprovider: yourProviderAdapterFactory, // Add here
}
```

### 4. Update Types

Update `NormalizedContext.provider` type in `server/src/contexts/types.ts`:

```typescript
export interface NormalizedContext {
  // ...
  provider: 'confluence' | 'jira' | 'yourprovider' // Add here
  // ...
}
```

### 5. Configure Rate Limiting (Optional)

Add provider-specific rate limit config in `server/src/utils/rateLimiter.ts`:

```typescript
const PROVIDER_CONFIGS: Record<string, RateLimitConfig> = {
  // ...
  yourprovider: {
    capacity: 15,
    refillRate: 2
  }
}
```

### 6. Configure Circuit Breaker (Optional)

Add provider-specific circuit breaker config in `server/src/utils/circuitBreaker.ts`:

```typescript
const PROVIDER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  // ...
  yourprovider: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000
  }
}
```

### 7. Update Route Validation

Add your provider to the validation schema in `server/src/routes/contextRoutes.ts`:

```typescript
const providerSchema = Joi.string().valid('confluence','jira','yourprovider').required()
```

### 8. Add Permissions

Ensure your provider has a corresponding permission in the RBAC system:

- `yourprovider.read` - Required to access this provider's contexts
- `contexts.read` - Base permission (also required)

### 9. Create Integration Record

Users must create an integration record in the `integrations` table:

```sql
INSERT INTO integrations (id, name, type, configuration, credentials_encrypted, is_active)
VALUES (
  gen_random_uuid(),
  'Your Provider Integration',
  'yourprovider',
  '{"base_url": "https://api.example.com"}'::jsonb,
  encode('{"api_key": "..."}'::jsonb::text::bytea, 'base64'),
  true
);
```

### 10. Write Tests

Create test files:

- `server/src/__tests__/contexts/adapters/yourProviderAdapter.test.ts`
- Update `server/src/__tests__/contexts/routes/contextRoutes.test.ts`

## Best Practices

### 1. Error Handling

- Always check circuit breaker and rate limits before API calls
- Record successes and failures for circuit breaker
- Return `null` for 404 responses in `fetchById`
- Throw descriptive errors for other failures

### 2. Caching

- Use stale-while-revalidate pattern for better UX
- Set appropriate TTL based on data freshness needs
- Cache keys should include all relevant parameters (query, projectId, etc.)

### 3. Normalization

- Always truncate `summary` to 10,000 characters
- Construct URLs that are human-readable and linkable
- Include provider-specific metadata in `metadata` field
- Set `fetched_at` to current timestamp

### 4. Rate Limiting

- Configure conservative limits initially
- Monitor usage and adjust as needed
- Return clear error messages with retry-after information

### 5. Circuit Breaker

- Start with default thresholds (5 failures, 2 successes, 60s timeout)
- Adjust based on provider reliability
- Log state transitions for monitoring

## Example: SharePoint Adapter

Here's a complete example for a SharePoint adapter:

```typescript
// server/src/contexts/adapters/sharepointAdapter.ts
import axios from 'axios'
import { pool } from '../../database/connection'
import { getCacheWithStale, setCache, makeKey, markRefreshing, clearRefreshing } from '../../utils/cache'
import { checkCircuitBreaker, recordSuccess, recordFailure } from '../../utils/circuitBreaker'
import { checkRateLimit } from '../../utils/rateLimiter'
import { logger } from '../../utils/logger'
import { NormalizedContext, ProviderAdapter } from '../types'

const TTL_SECONDS = 180 // SharePoint documents change less frequently
const PROVIDER = 'sharepoint'

async function getActiveSharePointIntegration() {
  const res = await pool.query(
    `SELECT id, configuration, credentials_encrypted 
     FROM integrations 
     WHERE type = 'sharepoint' AND is_active = true 
     ORDER BY updated_at DESC LIMIT 1`
  )
  
  if (res.rows.length === 0) throw new Error('No active SharePoint integration')
  
  const row = res.rows[0]
  const cfg = row.configuration || {}
  let creds: any = {}
  
  if (row.credentials_encrypted) {
    try {
      creds = JSON.parse(Buffer.from(row.credentials_encrypted, 'base64').toString())
    } catch {}
  }
  
  return {
    id: row.id,
    baseUrl: cfg.base_url,
    accessToken: creds.access_token,
    siteId: cfg.site_id
  }
}

function normalizeDocument(baseUrl: string, item: any): NormalizedContext {
  return {
    id: item.id,
    provider: 'sharepoint',
    title: item.name || item.title || '',
    summary: (item.description || '').slice(0, 10000),
    url: item.webUrl || `${baseUrl}/sites/${item.parentReference?.siteId}/Shared%20Documents/${item.name}`,
    last_modified: item.lastModifiedDateTime,
    fetched_at: new Date().toISOString(),
    metadata: {
      fileType: item.file?.mimeType,
      size: item.size
    }
  }
}

export function sharepointAdapterFactory(): ProviderAdapter {
  return {
    async search({ query, projectId, fresh }): Promise<NormalizedContext[]> {
      const integ = await getActiveSharePointIntegration()
      const key = makeKey(['ctx', 'sharepoint', 'search', query, projectId])
      
      const circuitCheck = checkCircuitBreaker(PROVIDER)
      if (!circuitCheck.allowed) {
        throw new Error('Service temporarily unavailable (circuit breaker open)')
      }
      
      const rateLimit = checkRateLimit(PROVIDER)
      if (!rateLimit.allowed) {
        throw new Error(`Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}`)
      }
      
      if (!fresh) {
        const cached = getCacheWithStale<NormalizedContext[]>(key)
        if (cached) {
          if (cached.isStale && markRefreshing(key)) {
            this.search({ query, projectId, fresh: true })
              .catch(err => {
                logger.warn(`[${PROVIDER}] Background refresh failed:`, err)
                clearRefreshing(key)
              })
              .then(() => clearRefreshing(key))
          }
          return cached.value
        }
      }
      
      try {
        const client = axios.create({
          baseURL: `https://graph.microsoft.com/v1.0/sites/${integ.siteId}`,
          headers: {
            'Authorization': `Bearer ${integ.accessToken}`,
            'Accept': 'application/json'
          },
          timeout: 30000
        })
        
        const resp = await client.get('/drive/root/search', {
          params: {
            q: query,
            top: 20
          }
        })
        
        const results = (resp.data.value || []).map((item: any) => normalizeDocument(integ.baseUrl, item))
        setCache(key, results, TTL_SECONDS)
        recordSuccess(PROVIDER)
        
        return results
      } catch (error: any) {
        recordFailure(PROVIDER)
        throw error
      }
    },

    async fetchById({ id, projectId, fresh }): Promise<NormalizedContext | null> {
      // Similar implementation...
      // ...
    }
  }
}
```

## Testing Your Adapter

1. **Unit Tests**: Test normalization, caching, error handling
2. **Integration Tests**: Test with real API (or mocked responses)
3. **Load Tests**: Verify rate limiting and circuit breaker behavior

## Troubleshooting

### Adapter Not Found
- Check provider name matches exactly in registry
- Verify type definitions include your provider

### Permission Denied
- Ensure `yourprovider.read` permission exists
- Check user has both `contexts.read` and provider-specific permission

### Rate Limit Issues
- Adjust `capacity` and `refillRate` in rate limiter config
- Monitor usage patterns

### Circuit Breaker Opening
- Check API reliability
- Adjust `failureThreshold` if too sensitive
- Review error logs for root cause

## Next Steps

- Add provider to API documentation
- Create integration UI in frontend
- Add monitoring and alerting
- Document provider-specific features

