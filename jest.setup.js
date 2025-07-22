// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom/extend-expect';

// Mock environment variables
process.env.POSTGRES_URL = 'postgres://test:test@localhost:5432/testdb';
process.env.KV_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret-key';

// Mock console.error to avoid cluttering test output
global.console.error = jest.fn();

// Mock fetch
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);