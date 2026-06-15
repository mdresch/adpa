import { validateDbGuardContract } from '../../../modules/infrastructure/dbGuardContract';

describe('Production Resilience Guards: DB-GUARD', () => {
  it('MUST NOT bypass the DB-GUARD circuit breaker logic (REQ-001)', () => {
    const contract = validateDbGuardContract();
    
    if (!contract.ok) {
      throw new Error(`
        🚨 GOVERNANCE VIOLATION: Critical Production Feature Broken!
        
        The DB-GUARD circuit breaker resilience has been compromised:
        ${contract.errors.join('\n        - ')}
        
        WHY THIS MATTERS: This guard prevents the entire database from going down 
        during transient network drops or Supabase pooler timeouts, and prevents 
        application-level SQL errors from globally rejecting traffic.
        
        HOW TO FIX: If you intentionally modified the database connection logic in 
        server/src/database/connection.ts, you must ensure 'isCircuitBreakingError' 
        still protects against transient timeouts, and update the spec at:
        docs/superpowers/specs/2026-06-13-db-guard-circuit-breaker-hardening-design.md
      `);
    }
    
    expect(contract.ok).toBe(true);
  });
});
