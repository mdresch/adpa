/**
 * Lightweight Jest config for pure unit tests that do NOT require a database.
 * Use: npx jest --config jest.config.unit.js <testFile>
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/../__tests__'],
  testMatch: [
    '**/__tests__/**/*.unit.test.ts',
    '**/__tests__/modules/**/*.test.ts',
    '**/__tests__/**/templateAuditService.test.ts',
    '**/__tests__/**/inlineEntityParserService.test.ts',
    '**/__tests__/documentGenerationService.rag.test.ts',
    '**/__tests__/documentGenerationService.templateParagraphs.test.ts',
    '**/__tests__/agents/BaseAgent.test.ts',
    '**/__tests__/domainExtractionConfig.test.ts',
    '**/__tests__/playbookService.test.ts',
    '**/__tests__/tracing.test.ts',
    '**/__tests__/unifiedAIService.providerFactories.test.ts',
    '**/__tests__/qualityAuditService.closedLoop.test.ts',
    '**/__tests__/templateOptimizationService.auditPrompt.test.ts',
    '**/__tests__/services/entityFuzzyMatching.test.ts',
    '**/__tests__/services/boardReportService.test.ts',
    '**/__tests__/services/jiraLinkageService.test.ts',
    '**/__tests__/services/knowledge-base.test.ts',
    '**/__tests__/services/mongoRagService.test.ts',
    '**/__tests__/services/programMetricsService.test.ts',
    '**/__tests__/services/projectSimilarity.test.ts',
    '**/__tests__/services/risk-null-severity.test.ts',
    '**/__tests__/services/jobs/AIGenerationJobService.test.ts',
    '**/__tests__/services/jobs/enqueueEntityPersistence.test.ts',
    '**/__tests__/contexts/adapters/jiraAdapter.test.ts',
    '**/__tests__/contexts/adapters/confluenceAdapter.test.ts',
    '**/__tests__/utils/pdfGenerator.test.ts',
    '**/__tests__/contextOrchestrator.test.ts',
    '**/__tests__/TemplateController.create.test.ts',
    '**/__tests__/database/connectionSsl.test.ts',
    '**/routes/__tests__/health_logic.test.ts',
    '**/__tests__/integration/documentGeneration.e2e.test.ts',
    '**/__tests__/integration/project-documents.test.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/unitSetup.ts'],
  testTimeout: 30000,
  moduleNameMapper: {
    '^@/lib/(.*)$': '<rootDir>/../lib/$1',
    '^@/types/(.*)$': '<rootDir>/../types/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|\\.pnpm/.*uuid))',
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
