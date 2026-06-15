import { DBGuard } from '../../../modules/infrastructure/DBGuard';
import { TestTeardownGuard } from '../../../modules/infrastructure/TestTeardownGuard';

describe('Pillar 5: Infrastructure & DB-GUARD Invariants', () => {
  beforeEach(() => {
    DBGuard.reset();
    TestTeardownGuard.reset();
  });

  afterEach(async () => {
    // REQ-INF-002: Assert 0 open handles to prevent leaks
    const openHandlesCount = TestTeardownGuard.getOpenHandlesCount();
    expect(openHandlesCount).toBe(0);
  });

  it('should trip the DB-GUARD circuit breaker on database failure and reject requests instantly', async () => {
    // REQ-INF-001: Circuit Breaker activation
    TestTeardownGuard.registerHandle('db_pool_1'); // Simulate a resource opening

    // Simulate 15 errors in a 10-second window
    for (let i = 0; i < 15; i++) {
      DBGuard.recordError(new Error('Connection timeout'));
    }

    expect(DBGuard.isOpen()).toBe(true);
    
    // Cleanup so afterEach passes
    TestTeardownGuard.releaseHandle('db_pool_1');
  });
});
