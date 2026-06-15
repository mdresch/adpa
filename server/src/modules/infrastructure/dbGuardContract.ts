import { __testing } from '../../database/connection';

/**
 * Validates the DB-GUARD circuit breaker resilience contract.
 * Returns explicit, instructional errors if resilience rules are broken.
 */
export function validateDbGuardContract(): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  // 1. Transient Pool Error Classification
  const transientCheck = { message: "(ECHECKOUTTIMEOUT) unable to check out connection" };
  if (!__testing.isTransientPoolError(transientCheck)) {
    errors.push(`'ECHECKOUTTIMEOUT' must be classified as a transient pool error. Modifying this exposes the system to starvation crashes during peak load.`);
  }

  // 2. Application Error Classification
  const syntaxError = { code: '42601', message: 'syntax error at or near "x"' };
  if (__testing.isCircuitBreakingError(syntaxError)) {
    errors.push(`Application-level SQL errors (like syntax errors, code 42601) MUST NOT trigger the circuit breaker. This causes global database rejection for single-query mistakes.`);
  }

  // 3. Network Error Classification
  const networkError = { code: '08006', message: 'connection failure' };
  if (!__testing.isCircuitBreakingError(networkError)) {
    errors.push(`Network connection exceptions (Class 08) MUST trigger the circuit breaker to prevent hammering an offline database.`);
  }

  return {
    ok: errors.length === 0,
    errors
  };
}
