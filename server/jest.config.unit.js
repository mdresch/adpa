/**
 * Lightweight Jest config for pure unit tests that do NOT require a database.
 * Use: npx jest --config jest.config.unit.js <testFile>
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.unit.test.ts', '**/__tests__/**/templateAuditService.test.ts'],
  // No globalSetup / setupFilesAfterEnv — these tests use mocks only
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/../lib/$1',
    '^@/types/(.*)$': '<rootDir>/../types/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!uuid)',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        allowJs: true
      },
      diagnostics: false
    }],
  }
}
