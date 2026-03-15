/** @type {import('jest').Config} */
const config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__', '<rootDir>/components', '<rootDir>/server/src/__tests__', '<rootDir>/server/src/modules/ai/tests'],
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
    '**/__tests__/**/*.benchmark.ts',
    '**/server/src/modules/ai/tests/**/*.test.ts'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { 
      tsconfig: { 
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      } 
    }],
    '^.+\\.js$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        allowJs: true,
      }
    }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!uuid)',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!lib/**/*.d.ts',
    '!components/**/*.d.ts',
    '!components/**/__tests__/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html'
  ],
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 30000,
  verbose: true,
};

module.exports = config;
