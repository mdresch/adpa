import axios from 'axios'
import { pool } from '../../database/connection'
import { getCacheWithStale, setCache, makeKey, markRefreshing, clearRefreshing } from '../../utils/cache'
import { checkCircuitBreaker, recordSuccess, recordFailure } from '../../utils/circuitBreaker'
import { checkRateLimit } from '../../utils/rateLimiter'
import { logger } from '../../utils/logger'
import { NormalizedContext, ProviderAdapter } from '../types'

const TTL_SECONDS = 60
const PROVIDER = 'jira'

async function getActiveJiraIntegration() {
  const res = await pool.query(
    `SELECT id, configuration, credentials_encrypted FROM integrations WHERE type = 'jira' AND is_active = true ORDER BY updated_at DESC LIMIT 1`
  )
  if (res.rows.length === 0) throw new Error('No active Jira integration')
  const row = res.rows[0]
  const cfg = row.configuration || {}
  let creds: any = {}
  if (row.credentials_encrypted) {
    try { creds = JSON.parse(Buffer.from(row.credentials_encrypted, 'base64').toString()) } catch {}
  }
  const site = (cfg.base_url as string)?.replace(/\/+$/, '') || ''
  if (!site.startsWith('http')) throw new Error('Jira base URL invalid')
  return { id: row.id, baseUrl: site, username: creds.username, apiToken: creds.api_token }
}

function normalizeIssue(site: string, issue: any): NormalizedContext {
  const key = issue.key
  const fields = issue.fields || {}
  const title = fields.summary || key
  const description = (fields.description && (typeof fields.description === 'string' ? fields.description : JSON.stringify(fields.description))) || ''
  const url = `${site}/browse/${key}`
  const last_modified = fields.updated
  const summary = description.slice(0, 10000)
  return {
    id: key,
    provider: 'jira',
    title,
    summary,
    url,
    last_modified,
    fetched_at: new Date().toISOString(),
    metadata: { status: fields.status?.name }
  }
}

export function jiraAdapterFactory(): ProviderAdapter {
  const adapter: ProviderAdapter = {
    async search({ query, fresh }): Promise<NormalizedContext[]> {
      const integ = await getActiveJiraIntegration()
      const key = makeKey(['ctx','jira','search', query])
      
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
          baseURL: `${integ.baseUrl}/rest/api/3`,
          auth: { username: integ.username, password: integ.apiToken },
          headers: { 'Accept': 'application/json' },
          timeout: 30000
        })
        const jql = `text ~ "${query.replace(/"/g,'\\"')}" ORDER BY updated DESC`
        const resp = await client.get('/search', { params: { jql, maxResults: 20 } })
        const results = (resp.data?.issues || []).map((iss: any) => normalizeIssue(integ.baseUrl, iss))
        setCache(key, results, TTL_SECONDS)
        recordSuccess(PROVIDER)
        return results
      } catch (error: any) {
        recordFailure(PROVIDER)
        throw error
      }
    },

    async fetchById({ id, fresh }): Promise<NormalizedContext | null> {
      const integ = await getActiveJiraIntegration()
      const key = makeKey(['ctx','jira','id', id])
      
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
          baseURL: `${integ.baseUrl}/rest/api/3`,
          auth: { username: integ.username, password: integ.apiToken },
          headers: { 'Accept': 'application/json' },
          timeout: 30000
        })
        const resp = await client.get(`/issue/${id}`)
        const normalized = normalizeIssue(integ.baseUrl, resp.data)
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
