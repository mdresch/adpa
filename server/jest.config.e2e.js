/**
 * Jest Configuration for End-to-End Tests
 * Comprehensive testing configuration for the 6-stage document generation pipeline
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/src/tests/e2e/**/*.test.ts',
    '<rootDir>/src/tests/e2e/**/*.spec.ts'
  ],
  
  // TypeScript support
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  
  // Module resolution
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  
  // Test timeout (30 minutes for comprehensive E2E tests)
  testTimeout: 1800000,
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage/e2e',
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'json',
    'lcov'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },
  
  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/tests/**',
    '!src/server.ts',
    '!src/**/index.ts'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/e2e/setup.ts'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/src/tests/e2e/global-setup.ts',
  globalTeardown: '<rootDir>/src/tests/e2e/global-teardown.ts',
  
  // Test execution
  maxWorkers: 1, // Run E2E tests sequentially to avoid conflicts
  maxConcurrency: 1,
  
  // Verbose output
  verbose: true,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Performance
  cache: false, // Disable cache for E2E tests to ensure fresh runs
  
  // Test reporting
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/e2e',
        filename: 'jest-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'ADPA E2E Test Results'
      }
    ]
  ],
  
  // Custom matchers
  setupFilesAfterEnv: [
    '<rootDir>/src/tests/e2e/setup.ts',
    '<rootDir>/src/tests/e2e/matchers.ts'
  ],
  
  // Environment variables
  testEnvironmentOptions: {
    NODE_ENV: 'test',
    LOG_LEVEL: 'info'
  },
  
  // Module file extensions
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],
  
  // Test result processor
  testResultsProcessor: '<rootDir>/src/tests/e2e/test-results-processor.ts'
}
