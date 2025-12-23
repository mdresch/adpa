/**
 * Context Orchestrator Tests
 * Tests for enhanced context gathering and injection system
 */

import { ContextOrchestrator } from '../modules/contextOrchestrator/contextOrchestrator'
import type { 
  EnhancedContextRequest,
  ContextOrchestratorConfig 
} from '../modules/contextOrchestrator'

// Mock dependencies
jest.mock('../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('../database/connection', () => ({
  pool: {
    query: jest.fn()
  }
}))

jest.mock('../modules/contextGathering/contextGatheringStage')
jest.mock('../modules/contextInjection/service')
jest.mock('../modules/contextAccessControl/contextAccessControlManager')
jest.mock('../modules/contextFreshness/contextFreshnessManager')
jest.mock('../modules/contextRetrieval/contextRetrievalService')

describe('ContextOrchestrator', () => {
  let contextOrchestrator: ContextOrchestrator
  let mockConfig: ContextOrchestratorConfig

  beforeEach(() => {
    mockConfig = {
      enableAccessControl: true,
      enableFreshnessValidation: true,
      enableComprehensiveLogging: true,
      enableMetricsCollection: true,
      enableCaching: true,
      maxContextSizeBytes: 10 * 1024 * 1024,
      maxProcessingTimeMs: 30000,
      enableParallelProcessing: true,
      enableRetryLogic: true,
      maxRetries: 3
    }

    contextOrchestrator = new ContextOrchestrator(mockConfig)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('gatherContextWithValidation', () => {
    it('should successfully gather context with validation', async () => {
      const mockRequest: EnhancedContextRequest = {
        request_id: 'test-request-123',
        template_id: 'template-456',
        project_id: 'project-789',
        user_id: 'user-101',
        document_type: 'test-document',
        gathering_config: {
          context_sources: [
            {
              source_id: 'project_context',
              source_name: 'Project Context',
              source_type: 'database',
              enabled: true
            }
          ],
          enable_external_source_integration: false,
          enable_rag_integration: true,
          enable_baseline_integration: true
        },
        enable_access_control: true,
        enable_freshness_validation: true,
        freshness_threshold: 86400000,
        required_permissions: ['read'],
        context_size_limit: 10 * 1024 * 1024
      }

      // Mock the context gathering stage to return a successful result
      const mockGatheringResult = {
        result_id: 'result-123',
        request_id: 'test-request-123',
        context_data: {
          project_context: { id: 'project-789', name: 'Test Project' },
          user_profile_context: { id: 'user-101', name: 'Test User' },
          document_history_context: { documents: [] },
          external_context: {},
          template_context: { id: 'template-456' },
          integrated_context: {},
          optimized_context: {},
          metadata: {}
        },
        quality_analysis: { overall_quality_score: 0.85 },
        context_gaps: [],
        source_priorities: [],
        gathering_metrics: {},
        recommendations: [],
        metadata: {
          gathering_time: 1500,
          template_id: 'template-456',
          project_id: 'project-789',
          user_id: 'user-101',
          document_type: 'test-document',
          context_strategy: 'enhanced_orchestration',
          rag_enabled: true,
          baseline_enabled: true
        }
      }

      // Mock the context gathering stage execute method
      const mockContextGatheringStage = require('../modules/contextGathering/contextGatheringStage')
      mockContextGatheringStage.ContextGatheringStage.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue(mockGatheringResult)
      }))

      // Mock access control manager
      const mockAccessControlManager = require('../modules/contextAccessControl/contextAccessControlManager')
      mockAccessControlManager.ContextAccessControlManager.mockImplementation(() => ({
        checkAccess: jest.fn().mockResolvedValue({
          allowed: true,
          reason: 'Access granted'
        })
      }))

      // Mock freshness manager
      const mockFreshnessManager = require('../modules/contextFreshness/contextFreshnessManager')
      mockFreshnessManager.ContextFreshnessManager.mockImplementation(() => ({
        assessFreshness: jest.fn().mockResolvedValue({
          context_id: 'project-789',
          freshness_score: 0.9,
          staleness_level: 'fresh'
        })
      }))

      // Mock database queries
      const { pool } = require('../database/connection')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await contextOrchestrator.gatherContextWithValidation(mockRequest)

      expect(result).toBeDefined()
      expect(result.request_id).toBe('test-request-123')
      expect(result.context_data).toBeDefined()
      expect(result.access_control_results).toBeDefined()
      expect(result.freshness_validation_results).toBeDefined()
      expect(result.source_logs).toBeDefined()
      expect(result.metrics).toBeDefined()
      expect(result.warnings).toBeDefined()
      expect(result.errors).toBeDefined()
    })

    it('should handle access control validation failures gracefully', async () => {
      const mockRequest: EnhancedContextRequest = {
        request_id: 'test-request-124',
        template_id: 'template-456',
        project_id: 'project-789',
        user_id: 'user-101',
        document_type: 'test-document',
        gathering_config: {
          context_sources: [
            {
              source_id: 'restricted_context',
              source_name: 'Restricted Context',
              source_type: 'database',
              enabled: true
            }
          ],
          enable_external_source_integration: false,
          enable_rag_integration: true,
          enable_baseline_integration: true
        },
        enable_access_control: true,
        enable_freshness_validation: false
      }

      // Mock access control to deny access
      const mockAccessControlManager = require('../modules/contextAccessControl/contextAccessControlManager')
      mockAccessControlManager.ContextAccessControlManager.mockImplementation(() => ({
        checkAccess: jest.fn().mockResolvedValue({
          allowed: false,
          reason: 'Insufficient permissions'
        })
      }))

      // Mock the context gathering stage
      const mockContextGatheringStage = require('../modules/contextGathering/contextGatheringStage')
      mockContextGatheringStage.ContextGatheringStage.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          result_id: 'result-124',
          request_id: 'test-request-124',
          context_data: { project_context: {} },
          metadata: {
            template_id: 'template-456',
            project_id: 'project-789',
            user_id: 'user-101'
          }
        })
      }))

      // Mock database queries
      const { pool } = require('../database/connection')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await contextOrchestrator.gatherContextWithValidation(mockRequest)

      expect(result).toBeDefined()
      expect(result.warnings).toContain('Access denied for 1 context sources')
      expect(result.access_control_results).toHaveLength(2) // One for source, one for project
      expect(result.access_control_results[0].allowed).toBe(false)
    })

    it('should handle freshness validation and detect stale context', async () => {
      const mockRequest: EnhancedContextRequest = {
        request_id: 'test-request-125',
        template_id: 'template-456',
        project_id: 'project-789',
        user_id: 'user-101',
        document_type: 'test-document',
        gathering_config: {
          context_sources: [],
          enable_external_source_integration: false,
          enable_rag_integration: true,
          enable_baseline_integration: true
        },
        enable_access_control: false,
        enable_freshness_validation: true,
        freshness_threshold: 86400000
      }

      // Mock freshness manager to return stale context
      const mockFreshnessManager = require('../modules/contextFreshness/contextFreshnessManager')
      mockFreshnessManager.ContextFreshnessManager.mockImplementation(() => ({
        assessFreshness: jest.fn().mockResolvedValue({
          context_id: 'project-789',
          freshness_score: 0.3,
          staleness_level: 'stale'
        })
      }))

      // Mock the context gathering stage
      const mockContextGatheringStage = require('../modules/contextGathering/contextGatheringStage')
      mockContextGatheringStage.ContextGatheringStage.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          result_id: 'result-125',
          request_id: 'test-request-125',
          context_data: { project_context: {} },
          metadata: {
            template_id: 'template-456',
            project_id: 'project-789',
            user_id: 'user-101'
          }
        })
      }))

      // Mock database queries
      const { pool } = require('../database/connection')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await contextOrchestrator.gatherContextWithValidation(mockRequest)

      expect(result).toBeDefined()
      expect(result.warnings).toContain('1 context sources are stale')
      expect(result.freshness_validation_results).toHaveLength(3) // project, template, user
      expect(result.freshness_validation_results[0].staleness_level).toBe('stale')
    })

    it('should handle context size limit validation', async () => {
      const mockRequest: EnhancedContextRequest = {
        request_id: 'test-request-126',
        template_id: 'template-456',
        project_id: 'project-789',
        user_id: 'user-101',
        document_type: 'test-document',
        gathering_config: {
          context_sources: [],
          enable_external_source_integration: false,
          enable_rag_integration: true,
          enable_baseline_integration: true
        },
        enable_access_control: false,
        enable_freshness_validation: false,
        context_size_limit: 100 // Very small limit to trigger warning
      }

      // Mock the context gathering stage to return large context
      const largeContext = {
        project_context: { data: 'x'.repeat(1000) }, // Large data
        user_profile_context: {},
        document_history_context: {},
        external_context: {},
        template_context: {}
      }

      const mockContextGatheringStage = require('../modules/contextGathering/contextGatheringStage')
      mockContextGatheringStage.ContextGatheringStage.mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({
          result_id: 'result-126',
          request_id: 'test-request-126',
          context_data: largeContext,
          metadata: {
            template_id: 'template-456',
            project_id: 'project-789',
            user_id: 'user-101'
          }
        })
      }))

      // Mock database queries
      const { pool } = require('../database/connection')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await contextOrchestrator.gatherContextWithValidation(mockRequest)

      expect(result).toBeDefined()
      expect(result.warnings.some(w => w.includes('Context size') && w.includes('exceeds limit'))).toBe(true)
    })

    it('should handle errors gracefully and return partial results', async () => {
      const mockRequest: EnhancedContextRequest = {
        request_id: 'test-request-127',
        template_id: 'template-456',
        project_id: 'project-789',
        user_id: 'user-101',
        document_type: 'test-document',
        gathering_config: {
          context_sources: [],
          enable_external_source_integration: false,
          enable_rag_integration: true,
          enable_baseline_integration: true
        }
      }

      // Mock the context gathering stage to throw an error
      const mockContextGatheringStage = require('../modules/contextGathering/contextGatheringStage')
      mockContextGatheringStage.ContextGatheringStage.mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(new Error('Context gathering failed'))
      }))

      // Mock database queries
      const { pool } = require('../database/connection')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await contextOrchestrator.gatherContextWithValidation(mockRequest)

      expect(result).toBeDefined()
      expect(result.result_id).toContain('error_')
      expect(result.errors).toContain('Context gathering failed')
      expect(result.metadata.context_strategy).toBe('enhanced_orchestration_failed')
    })
  })

  describe('injectContextWithValidation', () => {
    it('should successfully inject context with validation', async () => {
      const mockRequest = {
        template_id: 'template-456',
        project_id: 'project-789',
        user_id: 'user-101',
        variables: { var1: 'value1' },
        config_override: {}
      }

      // Mock the context injection service
      const mockContextInjectionService = require('../modules/contextInjection/service')
      mockContextInjectionService.ContextInjectionService.mockImplementation(() => ({
        injectContext: jest.fn().mockResolvedValue({
          success: true,
          bundle: {
            bundle_id: 'bundle-123',
            template_id: 'template-456',
            project_id: 'project-789',
            user_id: 'user-101',
            results: [],
            metadata: {
              total_sources: 3,
              successful_sources: 3,
              failed_sources: 0,
              total_size_bytes: 1024
            },
            injection_strategy: 'structured',
            max_context_length: 4000
          }
        })
      }))

      // Mock database queries
      const { pool } = require('../database/connection')
      pool.query.mockResolvedValue({ rows: [] })

      const result = await contextOrchestrator.injectContextWithValidation(mockRequest)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.bundle).toBeDefined()
      expect(result.bundle.bundle_id).toBe('bundle-123')
    })

    it('should handle injection errors gracefully', async () => {
      const mockRequest = {
        template_id: 'template-456',
        project_id: 'project-789',
        user_id: 'user-101',
        variables: {},
        config_override: {}
      }

      // Mock the context injection service to throw an error
      const mockContextInjectionService = require('../modules/contextInjection/service')
      mockContextInjectionService.ContextInjectionService.mockImplementation(() => ({
        injectContext: jest.fn().mockRejectedValue(new Error('Injection failed'))
      }))

      await expect(contextOrchestrator.injectContextWithValidation(mockRequest))
        .rejects.toThrow('Injection failed')
    })
  })

  describe('getHealthStatus', () => {
    it('should return healthy status when all components are working', async () => {
      // Mock freshness manager health check
      const mockFreshnessManager = require('../modules/contextFreshness/contextFreshnessManager')
      mockFreshnessManager.ContextFreshnessManager.mockImplementation(() => ({
        monitorFreshnessHealth: jest.fn().mockResolvedValue({
          overall_health: 'healthy',
          health_score: 0.95
        })
      }))

      const healthStatus = await contextOrchestrator.getHealthStatus()

      expect(healthStatus).toBeDefined()
      expect(healthStatus.overall_health).toBe('healthy')
      expect(healthStatus.access_control_enabled).toBe(true)
      expect(healthStatus.freshness_validation_enabled).toBe(true)
      expect(healthStatus.comprehensive_logging_enabled).toBe(true)
      expect(healthStatus.metrics_collection_enabled).toBe(true)
    })

    it('should return unhealthy status when health check fails', async () => {
      // Mock freshness manager to throw an error
      const mockFreshnessManager = require('../modules/contextFreshness/contextFreshnessManager')
      mockFreshnessManager.ContextFreshnessManager.mockImplementation(() => ({
        monitorFreshnessHealth: jest.fn().mockRejectedValue(new Error('Health check failed'))
      }))

      const healthStatus = await contextOrchestrator.getHealthStatus()

      expect(healthStatus).toBeDefined()
      expect(healthStatus.overall_health).toBe('unhealthy')
      expect(healthStatus.error).toBe('Health check failed')
    })
  })
})