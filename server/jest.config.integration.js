module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/integration-setup.js'],
  globalSetup: '<rootDir>/tests/setup/global-setup.js',
  globalTeardown: '<rootDir>/tests/setup/global-teardown.js',
  testMatch: ['**/tests/integration/**/*.test.ts'],
  maxWorkers: 2, // Optimized for local Windows stability
  workerIdleMemoryLimit: '512MB',
  testTimeout: 120000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1'
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
      isolatedModules: true,
      diagnostics: false
    }]
  }
};
