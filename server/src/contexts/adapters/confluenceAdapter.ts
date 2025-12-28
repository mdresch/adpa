import axios from 'axios'
import { pool } from '../../database/connection'
import { getCacheWithStale, setCache, makeKey, markRefreshing, clearRefreshing } from '../../utils/cache'
import { checkCircuitBreaker, recordSuccess, recordFailure } from '../../utils/circuitBreaker'
import { checkRateLimit } from '../../utils/rateLimiter'
import { logger } from '../../utils/logger'
import { NormalizedContext, ProviderAdapter } from '../types'

const TTL_SECONDS = 120
const PROVIDER = 'confluence'

async function getActiveConfluenceIntegration() {
  const res = await pool.query(
    `SELECT id, configuration, credentials_encrypted FROM integrations WHERE type = 'confluence' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
  )
  if (res.rows.length === 0) throw new Error('No active Confluence integration')
  const row = res.rows[0]
  const cfg = row.configuration || {}
  let creds: any = {}
  if (row.credentials_encrypted) {
    try { creds = JSON.parse(Buffer.from(row.credentials_encrypted, 'base64').toString()) } catch {}
  }
  const baseUrl = (cfg.base_url as string)?.replace(/\/+$/, '') || ''
  if (!baseUrl.startsWith('http')) throw new Error('Confluence base URL invalid')
  return { id: row.id, baseUrl, username: creds.username, apiToken: creds.api_token }
}

function normalizePage(baseUrl: string, item: any): NormalizedContext {
  const id = item?.id || item?.content?.id
  const title = item?.title || item?.content?.title || ''
  const spaceKey = item?.space?.key || item?._expandable?.space?.split('/').pop()
  const url = `${baseUrl}/wiki/spaces/${spaceKey}/pages/${id}`
  const last_modified = item?.version?.when || item?.history?.lastUpdated?.when
  const summary = (item?.body?.storage?.value || '').slice(0, 10000)
  return {
    id,
    provider: 'confluence',
    title,
    summary,
    url,
    last_modified,
    fetched_at: new Date().toISOString(),
    metadata: { spaceKey }
  }
}

export function confluenceAdapterFactory(): ProviderAdapter {
  const adapter: ProviderAdapter = {
    async search({ query, fresh }): Promise<NormalizedContext[]> {
      const integ = await getActiveConfluenceIntegration()
      const key = makeKey(['ctx','conf','search', query])
      
      // Check circuit breaker
      const circuitCheck = checkCircuitBreaker(PROVIDER)
      if (!circuitCheck.allowed) {
        logger.warn(`[${PROVIDER}] Circuit breaker is OPEN, rejecting request`)
        throw new Error('Service temporarily unavailable (circuit breaker open)')
      }
      
      // Check rate limit
      const rateLimit = checkRateLimit(PROVIDER)
      if (!rateLimit.allowed) {
        logger.warn(`[${PROVIDER}] Rate limit exceeded`)
        throw new Error(`Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}`)
      }
      
      // Stale-while-revalidate: return cached data immediately if available (even if stale)
      if (!fresh) {
        const cached = getCacheWithStale<NormalizedContext[]>(key)
        if (cached) {
          // If stale and not already refreshing, trigger background refresh
          if (cached.isStale && markRefreshing(key)) {
            // Background refresh (fire and forget)
            adapter.search({ query, fresh: true }).catch(err => {
              logger.warn(`[${PROVIDER}] Background refresh failed:`, err)
              clearRefreshing(key)
            }).then(() => {
              clearRefreshing(key)
            })
          }
          return cached.value
        }
      }
      
      try {
        const client = axios.create({
          baseURL: `${integ.baseUrl}/wiki/rest/api`,
          auth: { username: integ.username, password: integ.apiToken },
          headers: { 'Accept': 'application/json' },
          timeout: 30000
        })
        // Basic CQL search fallback: title ~ query
        const cql = `title ~ "${query.replace(/"/g,'\\"')}"`
        const resp = await client.get('/content/search', { params: { cql, expand: 'space,version,body.storage', limit: 20 } })
        const results = (resp.data?.results || []).map((r: any) => normalizePage(integ.baseUrl, r))
        setCache(key, results, TTL_SECONDS)
        recordSuccess(PROVIDER)
        return results
      } catch (error: any) {
        recordFailure(PROVIDER)
        throw error
      }
    },

    async fetchById({ id, fresh }): Promise<NormalizedContext | null> {
      const integ = await getActiveConfluenceIntegration()
      const key = makeKey(['ctx','conf','id', id])
      
      // Check circuit breaker
      const circuitCheck = checkCircuitBreaker(PROVIDER)
      if (!circuitCheck.allowed) {
        logger.warn(`[${PROVIDER}] Circuit breaker is OPEN, rejecting request`)
        throw new Error('Service temporarily unavailable (circuit breaker open)')
      }
      
      // Check rate limit
      const rateLimit = checkRateLimit(PROVIDER)
      if (!rateLimit.allowed) {
        logger.warn(`[${PROVIDER}] Rate limit exceeded`)
        throw new Error(`Rate limit exceeded. Try again after ${new Date(rateLimit.resetAt).toISOString()}`)
      }
      
      // Stale-while-revalidate
      if (!fresh) {
        const cached = getCacheWithStale<NormalizedContext>(key)
        if (cached) {
          // If stale and not already refreshing, trigger background refresh
          if (cached.isStale && markRefreshing(key)) {
            // Background refresh (fire and forget)
            adapter.fetchById({ id, fresh: true }).catch(err => {
              logger.warn(`[${PROVIDER}] Background refresh failed:`, err)
              clearRefreshing(key)
            }).then(() => {
              clearRefreshing(key)
            })
          }
          return cached.value
        }
      }
      
      try {
        const client = axios.create({
          baseURL: `${integ.baseUrl}/wiki/rest/api`,
          auth: { username: integ.username, password: integ.apiToken },
          headers: { 'Accept': 'application/json' },
          timeout: 30000
        })
        const resp = await client.get(`/content/${id}`, { params: { expand: 'space,version,body.storage' } })
        const normalized = normalizePage(integ.baseUrl, resp.data)
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
  
  return adapter
}
