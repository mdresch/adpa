import { TestAsyncTaskTracker } from '../utils/testAsyncTaskTracker';

beforeEach(() => {
  TestAsyncTaskTracker.reset();
});

afterEach(async () => {
  await TestAsyncTaskTracker.awaitAllPending();
});
