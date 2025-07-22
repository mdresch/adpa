// Optional: configure or set up a testing framework before each test.
// If you delete this file, remove `setupFilesAfterEnv` from `jest.config.js`

// Learn more: https://github.com/testing-library/jest-dom
// import '@testing-library/jest-dom/extend-expect';

// Mock environment variables
process.env.POSTGRES_URL = process.env.POSTGRES_URL || 'postgres://postgres:password@localhost:5432/test_db';
process.env.KV_URL = process.env.KV_URL || 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-jwt-secret';

// Increase timeout for database operations
jest.setTimeout(30000);