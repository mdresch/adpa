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
    // Order matters: more specific patterns must precede the general '@/*'
    // fallback below, mirroring server/tsconfig.json's own path priority --
    // '@/lib/*' means the repo-root lib/ directory (shared frontend/backend
    // code, e.g. lib/morphic/**), not server/src/lib/ despite that directory
    // also existing. Same fix already present in jest.config.js and
    // jest.config.unit.js; this config just never got it.
    '^@/lib/(.*)$': '<rootDir>/../lib/$1',
    '^@/types/(.*)$': '<rootDir>/../types/$1',
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
