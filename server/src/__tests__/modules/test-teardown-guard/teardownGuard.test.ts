import { TestAsyncTaskTracker } from '../../../utils/testAsyncTaskTracker'

describe('TestAsyncTaskTracker', () => {
  beforeEach(() => {
    // Reset tracker state before tests
    (TestAsyncTaskTracker as any).pendingPromises.clear();
    (TestAsyncTaskTracker as any).isShuttingDown = false;
  })

  afterEach(async () => {
    await TestAsyncTaskTracker.awaitAllPending()
  })

  it('REQ-001: should track and await pending promises', async () => {
    let resolved = false
    const promise = new Promise<void>((res) => {
      setTimeout(() => {
        resolved = true
        res()
      }, 50)
    })

    TestAsyncTaskTracker.track(promise)
    expect(TestAsyncTaskTracker.getPendingCount()).toBe(1)

    await TestAsyncTaskTracker.awaitAllPending()
    expect(resolved).toBe(true)
    expect(TestAsyncTaskTracker.getPendingCount()).toBe(0)
  })

  it('REQ-002: should execute runTrackedDeferred tasks using setImmediate', async () => {
    let executed = false
    
    TestAsyncTaskTracker.runTrackedDeferred('TestTask', async () => {
      executed = true
    })

    expect(TestAsyncTaskTracker.getPendingCount()).toBe(1)
    expect(executed).toBe(false) // Deferment check

    await TestAsyncTaskTracker.awaitAllPending()
    expect(executed).toBe(true)
    expect(TestAsyncTaskTracker.getPendingCount()).toBe(0)
  })

  it('REQ-003: should drain multiple cascading batches of tasks', async () => {
    let stage1 = false
    let stage2 = false

    TestAsyncTaskTracker.runTrackedDeferred('Stage1', async () => {
      stage1 = true
      TestAsyncTaskTracker.runTrackedDeferred('Stage2', async () => {
        stage2 = true
      })
    })

    await TestAsyncTaskTracker.awaitAllPending()
    expect(stage1).toBe(true)
    expect(stage2).toBe(true)
    expect(TestAsyncTaskTracker.getPendingCount()).toBe(0)
  })

  it('REQ-004: should reject registering new tasks during shutdown', async () => {
    (TestAsyncTaskTracker as any).isShuttingDown = true
    
    let executed = false
    const promise = Promise.resolve().then(() => {
      executed = true
    })

    const tracked = TestAsyncTaskTracker.track(promise)
    // When shutting down, track returns resolved stub
    expect(TestAsyncTaskTracker.getPendingCount()).toBe(0)
    
    // Cleanup state
    (TestAsyncTaskTracker as any).isShuttingDown = false
  })
})
