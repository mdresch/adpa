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
    // Mirrors tsconfig.json's "@/server/*": ["../*"], resolved relative to
    // baseUrl ("./src"): "../*" from server/src is server/, so @/server/X ->
    // server/X, i.e. <rootDir>/$1 (NOT <rootDir>/../$1 -- that overshoots to
    // the repo root). Without this entry, the generic '@/*' fallback below
    // double-prefixes it (server/src/server/src/...), which is what
    // lib/morphic/agents/title-generator.ts's `@/server/src/services/aiService`
    // import hits once the full src/server.ts app graph is required.
    '^@/server/(.*)$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@test/(.*)$': '<rootDir>/tests/$1',
    // Same fix as jest.config.js: uuid@14's ESM-only dist-node build (pulled in
    // transitively via @adobe/pdfservices-node-sdk when integration-setup.js
    // requires the full src/server.ts app graph) otherwise throws "Unexpected
    // token 'export'" under Jest's CJS transform.
    '^uuid$': require.resolve('uuid'),
  },
  transformIgnorePatterns: [
    'node_modules[\\\\/](?!(uuid|\\.pnpm[\\\\/].*uuid))',
  ],
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
