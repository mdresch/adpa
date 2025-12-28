// Circuit breaker for provider API calls

export enum CircuitState {
  CLOSED = 'closed', // Normal operation
  OPEN = 'open', // Failing, reject requests immediately
  HALF_OPEN = 'half_open' // Testing if service recovered
}

interface CircuitBreakerState {
  state: CircuitState
  failures: number
  lastFailureTime: number
  successCount: number
  nextAttemptTime: number
}

const breakers = new Map<string, CircuitBreakerState>()

export interface CircuitBreakerConfig {
  failureThreshold: number // Open circuit after N failures
  successThreshold: number // Close circuit after N successes in half-open
  timeout: number // Milliseconds to wait before attempting half-open
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5, // Open after 5 failures
  successThreshold: 2, // Close after 2 successes
  timeout: 60000 // 60 seconds before attempting recovery
}

// Provider-specific configurations
const PROVIDER_CONFIGS: Record<string, CircuitBreakerConfig> = {
  confluence: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000
  },
  jira: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000
  }
}

/**
 * Check if circuit breaker allows the request.
 * Returns true if allowed, false if circuit is open.
 */
export function checkCircuitBreaker(provider: string): { allowed: boolean; state: CircuitState } {
  const config = PROVIDER_CONFIGS[provider] || DEFAULT_CONFIG
  const now = Date.now()
  
  let breaker = breakers.get(provider)
  
  if (!breaker) {
    // Initialize as closed
    breaker = {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailureTime: 0,
      successCount: 0,
      nextAttemptTime: 0
    }
    breakers.set(provider, breaker)
  }
  
  // Handle state transitions
  if (breaker.state === CircuitState.OPEN) {
    // Check if timeout has passed, transition to half-open
    if (now >= breaker.nextAttemptTime) {
      breaker.state = CircuitState.HALF_OPEN
      breaker.successCount = 0
      return { allowed: true, state: CircuitState.HALF_OPEN }
    }
    // Still open, reject request
    return { allowed: false, state: CircuitState.OPEN }
  }
  
  // Closed or half-open, allow request
  return { allowed: true, state: breaker.state }
}

/**
 * Record a successful request.
 */
export function recordSuccess(provider: string) {
  const config = PROVIDER_CONFIGS[provider] || DEFAULT_CONFIG
  const breaker = breakers.get(provider)
  
  if (!breaker) return
  
  if (breaker.state === CircuitState.HALF_OPEN) {
    breaker.successCount++
    if (breaker.successCount >= config.successThreshold) {
      // Close the circuit
      breaker.state = CircuitState.CLOSED
      breaker.failures = 0
      breaker.successCount = 0
    }
  } else if (breaker.state === CircuitState.CLOSED) {
    // Reset failure count on success
    breaker.failures = 0
  }
}

/**
 * Record a failed request.
 */
export function recordFailure(provider: string) {
  const config = PROVIDER_CONFIGS[provider] || DEFAULT_CONFIG
  const now = Date.now()
  
  let breaker = breakers.get(provider)
  
  if (!breaker) {
    breaker = {
      state: CircuitState.CLOSED,
      failures: 0,
      lastFailureTime: now,
      successCount: 0,
      nextAttemptTime: 0
    }
    breakers.set(provider, breaker)
  }
  
  breaker.failures++
  breaker.lastFailureTime = now
  
  if (breaker.state === CircuitState.HALF_OPEN) {
    // Failure in half-open, immediately open again
    breaker.state = CircuitState.OPEN
    breaker.nextAttemptTime = now + config.timeout
    breaker.successCount = 0
  } else if (breaker.state === CircuitState.CLOSED) {
    // Check if we should open the circuit
    if (breaker.failures >= config.failureThreshold) {
      breaker.state = CircuitState.OPEN
      breaker.nextAttemptTime = now + config.timeout
    }
  }
}

/**
 * Get current circuit breaker state for a provider.
 */
export function getCircuitState(provider: string): CircuitState {
  const breaker = breakers.get(provider)
  return breaker?.state || CircuitState.CLOSED
}

/**
 * Reset circuit breaker for a provider (useful for testing).
 */
export function resetCircuitBreaker(provider: string) {
  breakers.delete(provider)
}

/**
 * Reset all circuit breakers (useful for testing).
 */
export function resetAllCircuitBreakers() {
  breakers.clear()
}

