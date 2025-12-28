// Token bucket rate limiter per provider

interface TokenBucket {
  tokens: number
  lastRefill: number
  capacity: number
  refillRate: number // tokens per second
}

const buckets = new Map<string, TokenBucket>()

export interface RateLimitConfig {
  capacity: number // Maximum tokens
  refillRate: number // Tokens per second
}

const DEFAULT_CONFIG: RateLimitConfig = {
  capacity: 10, // 10 requests
  refillRate: 2 // 2 tokens per second (allows 10 requests, then 1 every 0.5s)
}

// Provider-specific configurations
const PROVIDER_CONFIGS: Record<string, RateLimitConfig> = {
  confluence: {
    capacity: 20, // Confluence allows more requests
    refillRate: 2
  },
  jira: {
    capacity: 15, // Jira is more restrictive
    refillRate: 1.5
  }
}

/**
 * Check if a request is allowed for the given provider.
 * Returns true if allowed, false if rate limited.
 */
export function checkRateLimit(provider: string): { allowed: boolean; remaining: number; resetAt: number } {
  const config = PROVIDER_CONFIGS[provider] || DEFAULT_CONFIG
  const now = Date.now()
  
  let bucket = buckets.get(provider)
  
  if (!bucket) {
    // Initialize bucket
    bucket = {
      tokens: config.capacity,
      lastRefill: now,
      capacity: config.capacity,
      refillRate: config.refillRate
    }
    buckets.set(provider, bucket)
  }
  
  // Refill tokens based on time elapsed
  const timeElapsed = (now - bucket.lastRefill) / 1000 // seconds
  const tokensToAdd = timeElapsed * bucket.refillRate
  bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd)
  bucket.lastRefill = now
  
  if (bucket.tokens >= 1) {
    // Consume one token
    bucket.tokens -= 1
    const resetAt = now + ((bucket.capacity - bucket.tokens) / bucket.refillRate * 1000)
    
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetAt
    }
  }
  
  // Rate limited
  const resetAt = now + ((1 - bucket.tokens) / bucket.refillRate * 1000)
  
  return {
    allowed: false,
    remaining: 0,
    resetAt
  }
}

/**
 * Reset rate limiter for a provider (useful for testing).
 */
export function resetRateLimit(provider: string) {
  buckets.delete(provider)
}

/**
 * Reset all rate limiters (useful for testing).
 */
export function resetAllRateLimits() {
  buckets.clear()
}

