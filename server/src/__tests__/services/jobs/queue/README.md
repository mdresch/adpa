# Queue Service Tests

## Test Files

1. **QueueService.test.ts** - Unit tests for QueueService class
   - Queue registration and management
   - Job addition with validation
   - Stuck job detection
   - Cache integration
   - Error handling

2. **BullQueueAdapter.test.ts** - Unit tests for queue adapters
   - Bull queue wrapping
   - Option conversion
   - Job operations

3. **integration.test.ts** - Integration tests
   - End-to-end job lifecycle
   - Dependency injection verification
   - Error propagation

4. **performance.benchmark.ts** - Performance benchmarks
   - Job addition throughput
   - Cache performance
   - Concurrent operations
   - Memory usage

## Running Tests

```bash
# All queue tests
npm run test:queue-all

# Individual suites
npm run test:queue-service
npm run test:queue-adapters
npm run test:queue-integration
npm run test:queue-performance

# With Jest directly
npx jest server/src/__tests__/services/jobs/queue/
```

## Test Structure

All tests use mock dependencies for isolation:
- Mock database (IDatabase)
- Mock cache (ICache)
- Mock logger (ILogger)
- Mock websocket (IWebSocketServer)
- Mock queue (IQueue)

## Notes

- Tests are designed to run in isolation
- No external dependencies required
- Performance benchmarks have specific targets
- All error types are tested
