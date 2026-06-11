/**
 * Mock-only unit tests with V8 coverage (avoids babel-plugin-istanbul / pnpm hoisting issues).
 *
 * Use: npm run test:coverage:unit
 * RAG-only: npm run test:coverage:features
 */
const base = require('./jest.config.unit.js')

module.exports = {
  ...base,
  coverageProvider: 'v8',
  collectCoverage: true,
  coverageDirectory: 'coverage/unit',
  coverageReporters: ['text-summary', 'text', 'lcov', 'json-summary'],
  collectCoverageFrom: [
    'src/modules/**/*.ts',
    'src/services/**/*.ts',
    'src/utils/**/*.ts',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
  ],
  forceExit: true,
  // Broader mock-safe suite (no setup.ts / DB bootstrap)
  testMatch: [
    ...base.testMatch,
    '**/__tests__/modules/**/*.test.ts',
    '**/__tests__/**/*.unit.test.ts',
    '**/__tests__/agents/BaseAgent.test.ts',
    '**/__tests__/domainExtractionConfig.test.ts',
    '**/__tests__/playbookService.test.ts',
    '**/__tests__/tracing.test.ts',
    '**/__tests__/unifiedAIService.providerFactories.test.ts',
    '**/__tests__/qualityAuditService.closedLoop.test.ts',
    '**/__tests__/templateOptimizationService.auditPrompt.test.ts',
    '**/__tests__/documentGenerationService.templateParagraphs.test.ts',
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
  ],
}
