/**
 * End-to-End Pipeline Testing Suite
 * Comprehensive testing of the complete 6-stage document generation pipeline
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals'
import { MultiStageDocumentProcessor } from '../../modules/multiStageDocumentProcessor'
import { pool } from '../../database/connection'
import { logger } from '../../utils/logger'
import type { 
  DocumentProcessingRequest, 
  DocumentProcessingResult,
  StageInput,
  StageOutput 
} from '../../modules/multiStageDocumentProcessor/types'

describe('End-to-End Pipeline Testing', () => {
  let processor: MultiStageDocumentProcessor
  let testTemplateId: string
  let testProjectId: string
  let testUserId: string

  beforeAll(async () => {
    // Initialize the multi-stage document processor
    processor = new MultiStageDocumentProcessor({
      enableParallelProcessing: true,
      enableQualityGates: true,
      enableMonitoring: true,
      maxProcessingTime: 300000, // 5 minutes
      defaultRetryAttempts: 3,
      jobTimeout: 300000,
      maxConcurrentJobs: 5,
      enableMetricsCollection: true,
      enableErrorTracking: true
    })

    // Set up test data
    await setupTestData()
  })

  afterAll(async () => {
    // Clean up test data
    await cleanupTestData()
  })

  beforeEach(async () => {
    // Reset any test-specific state
    logger.info('Starting E2E test')
  })

  afterEach(async () => {
    // Clean up after each test
    logger.info('Completed E2E test')
  })

  describe('Stage 1: Context Gathering', () => {
    it('should successfully gather context from multiple sources', async () => {
      const stageInput: StageInput = {
        stage_id: 'context_gathering_1',
        stage_type: 'context_gathering',
        input_data: {
          template_id: testTemplateId,
          project_id: testProjectId,
          user_id: testUserId
        },
        context: {
          project_context: {
            project_id: testProjectId,
            project_name: 'Test Project',
            project_type: 'business_analysis',
            project_phase: 'planning'
          },
          user_context: {
            user_id: testUserId,
            user_name: 'Test User',
            user_role: 'business_analyst',
            user_expertise: ['requirements_analysis', 'process_improvement']
          }
        },
        config: {
          config: {
            enable_comprehensive_gathering: true,
            enable_project_context: true,
            enable_user_profile: true,
            enable_document_history: true,
            enable_external_sources: true
          }
        }
      }

      const result = await processor.executeStage(stageInput)

      expect(result).toBeDefined()
      expect(result.stage_id).toBe('context_gathering_1')
      expect(result.stage_type).toBe('context_gathering')
      expect(result.output_data.context_data).toBeDefined()
      expect(result.quality_score).toBeGreaterThan(0.7)
      expect(result.processing_time).toBeGreaterThan(0)
    })

    it('should handle context gathering failures gracefully', async () => {
      const stageInput: StageInput = {
        stage_id: 'context_gathering_2',
        stage_type: 'context_gathering',
        input_data: {
          template_id: 'invalid_template',
          project_id: 'invalid_project',
          user_id: 'invalid_user'
        },
        context: {},
        config: { config: {} }
      }

      await expect(processor.executeStage(stageInput)).rejects.toThrow()
    })
  })

  describe('Stage 2: Template Processing', () => {
    it('should successfully process templates with variable resolution', async () => {
      const contextData = await createMockContextData()
      
      const stageInput: StageInput = {
        stage_id: 'template_processing_1',
        stage_type: 'template_processing',
        input_data: {
          template_id: testTemplateId,
          context_data: contextData
        },
        context: contextData,
        config: {
          config: {
            enable_variable_resolution: true,
            enable_ai_enhancement: true,
            enable_template_optimization: true
          }
        }
      }

      const result = await processor.executeStage(stageInput)

      expect(result).toBeDefined()
      expect(result.stage_id).toBe('template_processing_1')
      expect(result.stage_type).toBe('template_processing')
      expect(result.output_data.processed_template).toBeDefined()
      expect(result.quality_score).toBeGreaterThan(0.8)
    })
  })

  describe('Stage 3: AI Generation', () => {
    it('should successfully generate content using AI models', async () => {
      const processedTemplate = await createMockProcessedTemplate()
      
      const stageInput: StageInput = {
        stage_id: 'ai_generation_1',
        stage_type: 'ai_generation',
        input_data: {
          processed_template: processedTemplate
        },
        context: await createMockContextData(),
        config: {
          config: {
            enable_multi_model_generation: true,
            enable_iterative_refinement: true,
            enable_quality_gates: true,
            enable_ensemble_analysis: true
          }
        }
      }

      const result = await processor.executeStage(stageInput)

      expect(result).toBeDefined()
      expect(result.stage_id).toBe('ai_generation_1')
      expect(result.stage_type).toBe('ai_generation')
      expect(result.output_data.generated_document).toBeDefined()
      expect(result.quality_score).toBeGreaterThan(0.8)
    })
  })

  describe('Stage 4: Context Injection', () => {
    it('should successfully inject context and personalize content', async () => {
      const generatedDocument = await createMockGeneratedDocument()
      
      const stageInput: StageInput = {
        stage_id: 'context_injection_1',
        stage_type: 'context_injection',
        input_data: {
          generated_document: generatedDocument
        },
        context: await createMockContextData(),
        config: {
          config: {
            enable_strategic_injection: true,
            enable_personalization: true,
            enable_stakeholder_targeting: true,
            injection_strategies: ['prepend', 'append', 'interleave', 'structured']
          }
        }
      }

      const result = await processor.executeStage(stageInput)

      expect(result).toBeDefined()
      expect(result.stage_id).toBe('context_injection_1')
      expect(result.stage_type).toBe('context_injection')
      expect(result.output_data.contextualized_document).toBeDefined()
      expect(result.quality_score).toBeGreaterThan(0.8)
    })
  })

  describe('Stage 5: Quality Assurance', () => {
    it('should successfully validate quality and compliance', async () => {
      const contextualizedDocument = await createMockContextualizedDocument()
      
      const stageInput: StageInput = {
        stage_id: 'quality_assurance_1',
        stage_type: 'quality_assurance',
        input_data: {
          contextualized_document: contextualizedDocument
        },
        context: await createMockContextData(),
        config: {
          config: {
            enable_comprehensive_validation: true,
            enable_compliance_checking: true,
            enable_security_validation: true,
            enable_accessibility_validation: true,
            quality_thresholds: {
              overall_quality: 0.8,
              content_quality: 0.8,
              readability_score: 0.75,
              methodology_compliance: 0.9
            }
          }
        }
      }

      const result = await processor.executeStage(stageInput)

      expect(result).toBeDefined()
      expect(result.stage_id).toBe('quality_assurance_1')
      expect(result.stage_type).toBe('quality_assurance')
      expect(result.output_data.quality_assurance_result).toBeDefined()
      expect(result.quality_score).toBeGreaterThan(0.8)
    })
  })

  describe('Stage 6: Output Formatting', () => {
    it('should successfully format documents in multiple formats', async () => {
      const qualityAssuranceResult = await createMockQualityAssuranceResult()
      
      const stageInput: StageInput = {
        stage_id: 'output_formatting_1',
        stage_type: 'output_formatting',
        input_data: {
          quality_assurance_result: qualityAssuranceResult
        },
        context: await createMockContextData(),
        config: {
          config: {
            enable_multi_format_generation: true,
            enable_adaptive_formatting: true,
            enable_delivery_automation: true,
            output_formats: ['markdown', 'pdf', 'docx', 'html'],
            delivery_methods: ['api_response', 'download', 'email']
          }
        }
      }

      const result = await processor.executeStage(stageInput)

      expect(result).toBeDefined()
      expect(result.stage_id).toBe('output_formatting_1')
      expect(result.stage_type).toBe('output_formatting')
      expect(result.output_data.output_formatting_result).toBeDefined()
      expect(result.output_data.generated_formats).toBeDefined()
      expect(result.output_data.generated_formats.length).toBeGreaterThan(0)
      expect(result.quality_score).toBeGreaterThan(0.8)
    })
  })

  describe('Complete Pipeline Integration', () => {
    it('should successfully process a document through all 6 stages', async () => {
      const request: DocumentProcessingRequest = {
        request_id: `e2e_test_${Date.now()}`,
        template_id: testTemplateId,
        project_id: testProjectId,
        user_id: testUserId,
        processing_config: {
          enable_parallel_processing: true,
          enable_quality_gates: true,
          enable_monitoring: true,
          max_processing_time: 300000,
          default_retry_attempts: 3,
          job_timeout: 300000,
          max_concurrent_jobs: 5,
          enable_metrics_collection: true,
          enable_error_tracking: true
        },
        quality_config: {
          minimum_quality_score: 0.8,
          quality_thresholds: {
            overall_quality: 0.8,
            content_quality: 0.8,
            readability_score: 0.75,
            methodology_compliance: 0.9
          }
        },
        output_config: {
          primary_format: 'markdown',
          secondary_formats: ['pdf', 'docx', 'html'],
          include_metadata: true,
          enable_delivery: true,
          delivery_methods: ['api_response', 'download']
        }
      }

      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      // Validate overall result
      expect(result).toBeDefined()
      expect(result.request_id).toBe(request.request_id)
      expect(result.status.status).toBe('completed')
      expect(result.status.progress).toBe(100)
      expect(result.status.stages_completed).toHaveLength(6)
      expect(result.status.stages_remaining).toHaveLength(0)

      // Validate stages
      expect(result.stages).toHaveLength(6)
      expect(result.stages[0].stage_type).toBe('context_gathering')
      expect(result.stages[1].stage_type).toBe('template_processing')
      expect(result.stages[2].stage_type).toBe('ai_generation')
      expect(result.stages[3].stage_type).toBe('context_injection')
      expect(result.stages[4].stage_type).toBe('quality_assurance')
      expect(result.stages[5].stage_type).toBe('output_formatting')

      // Validate final document
      expect(result.final_document).toBeDefined()
      expect(result.final_document.content).toBeDefined()
      expect(result.final_document.metadata).toBeDefined()

      // Validate quality report
      expect(result.quality_report).toBeDefined()
      expect(result.quality_report.overall_score).toBeGreaterThan(0.8)

      // Validate processing metrics
      expect(result.processing_metrics).toBeDefined()
      expect(result.processing_metrics.total_processing_time).toBeGreaterThan(0)
      expect(result.processing_metrics.total_processing_time).toBeLessThan(endTime - startTime + 1000) // Allow 1 second tolerance

      // Validate metadata
      expect(result.metadata).toBeDefined()
      expect(result.metadata.processing_time).toBeGreaterThan(0)
      expect(result.metadata.stages_count).toBe(6)
      expect(result.metadata.quality_score).toBeGreaterThan(0.8)
    })

    it('should handle pipeline failures gracefully', async () => {
      const request: DocumentProcessingRequest = {
        request_id: `e2e_test_failure_${Date.now()}`,
        template_id: 'invalid_template',
        project_id: 'invalid_project',
        user_id: 'invalid_user',
        processing_config: {
          enable_parallel_processing: false,
          enable_quality_gates: true,
          enable_monitoring: true,
          max_processing_time: 30000, // 30 seconds
          default_retry_attempts: 1,
          job_timeout: 30000,
          max_concurrent_jobs: 1,
          enable_metrics_collection: true,
          enable_error_tracking: true
        },
        quality_config: {
          minimum_quality_score: 0.9, // High threshold to force failure
          quality_thresholds: {
            overall_quality: 0.9,
            content_quality: 0.9,
            readability_score: 0.9,
            methodology_compliance: 0.95
          }
        },
        output_config: {
          primary_format: 'markdown',
          secondary_formats: [],
          include_metadata: false,
          enable_delivery: false,
          delivery_methods: []
        }
      }

      await expect(processor.processDocument(request)).rejects.toThrow()
    })
  })

  describe('Performance Testing', () => {
    it('should process documents within acceptable time limits', async () => {
      const request: DocumentProcessingRequest = {
        request_id: `perf_test_${Date.now()}`,
        template_id: testTemplateId,
        project_id: testProjectId,
        user_id: testUserId,
        processing_config: {
          enable_parallel_processing: true,
          enable_quality_gates: true,
          enable_monitoring: true,
          max_processing_time: 120000, // 2 minutes
          default_retry_attempts: 2,
          job_timeout: 120000,
          max_concurrent_jobs: 3,
          enable_metrics_collection: true,
          enable_error_tracking: true
        },
        quality_config: {
          minimum_quality_score: 0.8,
          quality_thresholds: {
            overall_quality: 0.8,
            content_quality: 0.8,
            readability_score: 0.75,
            methodology_compliance: 0.9
          }
        },
        output_config: {
          primary_format: 'markdown',
          secondary_formats: ['pdf', 'html'],
          include_metadata: true,
          enable_delivery: true,
          delivery_methods: ['api_response']
        }
      }

      const startTime = Date.now()
      const result = await processor.processDocument(request)
      const endTime = Date.now()

      const processingTime = endTime - startTime

      expect(result.status.status).toBe('completed')
      expect(processingTime).toBeLessThan(120000) // Should complete within 2 minutes
      expect(result.processing_metrics.total_processing_time).toBeLessThan(processingTime)
    })

    it('should handle concurrent document processing', async () => {
      const requests: DocumentProcessingRequest[] = []
      
      // Create 3 concurrent requests
      for (let i = 0; i < 3; i++) {
        requests.push({
          request_id: `concurrent_test_${i}_${Date.now()}`,
          template_id: testTemplateId,
          project_id: testProjectId,
          user_id: testUserId,
          processing_config: {
            enable_parallel_processing: true,
            enable_quality_gates: true,
            enable_monitoring: true,
            max_processing_time: 180000, // 3 minutes
            default_retry_attempts: 2,
            job_timeout: 180000,
            max_concurrent_jobs: 3,
            enable_metrics_collection: true,
            enable_error_tracking: true
          },
          quality_config: {
            minimum_quality_score: 0.8,
            quality_thresholds: {
              overall_quality: 0.8,
              content_quality: 0.8,
              readability_score: 0.75,
              methodology_compliance: 0.9
            }
          },
          output_config: {
            primary_format: 'markdown',
            secondary_formats: ['html'],
            include_metadata: true,
            enable_delivery: false,
            delivery_methods: []
          }
        })
      }

      const startTime = Date.now()
      const results = await Promise.all(requests.map(req => processor.processDocument(req)))
      const endTime = Date.now()

      const totalTime = endTime - startTime

      // All requests should complete successfully
      results.forEach((result, index) => {
        expect(result.status.status).toBe('completed')
        expect(result.request_id).toBe(requests[index].request_id)
      })

      // Concurrent processing should be faster than sequential
      // (Allow for some overhead, but should be significantly faster)
      expect(totalTime).toBeLessThan(300000) // Less than 5 minutes total
    })
  })

  // Helper functions for creating mock data
  async function setupTestData(): Promise<void> {
    // Create test template
    const templateResult = await pool.query(`
      INSERT INTO document_templates (name, description, content, template_type, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [
      'E2E Test Template',
      'Template for end-to-end testing',
      '# {{project_name}}\n\n## Overview\n{{project_overview}}\n\n## Requirements\n{{requirements}}',
      'business_analysis',
      testUserId || 'system'
    ])

    testTemplateId = templateResult.rows[0].id

    // Create test project
    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, project_type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id
    `, [
      'E2E Test Project',
      'Project for end-to-end testing',
      'business_analysis',
      testUserId || 'system'
    ])

    testProjectId = projectResult.rows[0].id

    // Set test user ID
    testUserId = testUserId || 'test_user_123'
  }

  async function cleanupTestData(): Promise<void> {
    if (testTemplateId) {
      await pool.query('DELETE FROM document_templates WHERE id = $1', [testTemplateId])
    }
    if (testProjectId) {
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    }
  }

  async function createMockContextData(): Promise<any> {
    return {
      project_context: {
        project_id: testProjectId,
        project_name: 'Test Project',
        project_type: 'business_analysis',
        project_phase: 'planning',
        project_description: 'A test project for E2E testing',
        stakeholders: [
          { id: 'stakeholder_1', name: 'Business Owner', role: 'sponsor' },
          { id: 'stakeholder_2', name: 'End User', role: 'user' }
        ],
        requirements: [
          { id: 'req_1', description: 'Functional requirement 1', priority: 'high' },
          { id: 'req_2', description: 'Non-functional requirement 1', priority: 'medium' }
        ]
      },
      user_context: {
        user_id: testUserId,
        user_name: 'Test User',
        user_role: 'business_analyst',
        user_expertise: ['requirements_analysis', 'process_improvement'],
        user_preferences: {
          writing_style: 'professional',
          complexity_level: 'intermediate',
          terminology_preference: 'standard'
        }
      },
      historical_context: {
        similar_projects: [
          { project_id: 'similar_1', similarity_score: 0.85, lessons_learned: ['Lesson 1', 'Lesson 2'] }
        ],
        document_patterns: [
          { pattern_type: 'structure', frequency: 0.8, best_practice: true }
        ]
      },
      external_context: {
        industry_standards: ['ISO 9001', 'BABOK'],
        regulatory_requirements: ['GDPR', 'SOX'],
        market_trends: ['Trend 1', 'Trend 2']
      }
    }
  }

  async function createMockProcessedTemplate(): Promise<any> {
    return {
      template_id: testTemplateId,
      template_name: 'E2E Test Template',
      processed_content: '# Test Project\n\n## Overview\nThis is a test project overview.\n\n## Requirements\n- Functional requirement 1\n- Non-functional requirement 1',
      variables_resolved: {
        project_name: 'Test Project',
        project_overview: 'This is a test project overview.',
        requirements: '- Functional requirement 1\n- Non-functional requirement 1'
      },
      ai_enhancements: [
        { type: 'clarity_improvement', description: 'Improved clarity of requirements', impact_score: 0.8 }
      ],
      quality_score: 0.85,
      processing_metadata: {
        variables_processed: 3,
        enhancements_applied: 1,
        processing_time_ms: 2500
      }
    }
  }

  async function createMockGeneratedDocument(): Promise<any> {
    return {
      document_id: `doc_${Date.now()}`,
      content: '# Test Project\n\n## Overview\nThis is a comprehensive overview of the test project...\n\n## Requirements\n### Functional Requirements\n1. **Requirement 1**: Detailed description...\n2. **Requirement 2**: Detailed description...\n\n### Non-Functional Requirements\n1. **Performance**: System should respond within 2 seconds\n2. **Security**: Data should be encrypted at rest\n\n## Conclusion\nThis document provides a comprehensive analysis...',
      metadata: {
        word_count: 150,
        section_count: 4,
        complexity_score: 0.7,
        readability_score: 0.8
      },
      ai_generation_details: {
        models_used: ['gpt-4', 'claude-3.5-sonnet'],
        generation_strategy: 'ensemble',
        refinement_iterations: 2,
        quality_gates_passed: 3
      },
      quality_assessment: {
        overall_score: 0.85,
        content_quality: 0.9,
        structure_quality: 0.8,
        clarity_score: 0.85
      }
    }
  }

  async function createMockContextualizedDocument(): Promise<any> {
    return {
      document_id: `context_doc_${Date.now()}`,
      base_content: '# Test Project\n\n## Overview\nThis is a comprehensive overview...',
      contextualized_content: '# Test Project\n\n## Executive Summary\nThis document provides a comprehensive analysis of the Test Project, designed to meet the specific needs of our business stakeholders.\n\n## Overview\nThis is a comprehensive overview of the test project, incorporating industry best practices and regulatory requirements...',
      injection_details: {
        strategies_applied: ['prepend', 'interleave'],
        context_sources: ['project_context', 'user_profile', 'stakeholder_requirements'],
        personalization_applied: {
          stakeholder_specific_content: true,
          role_based_customization: true,
          expertise_level_adaptation: true
        }
      },
      quality_metrics: {
        context_relevance_score: 0.9,
        stakeholder_alignment_score: 0.85,
        personalization_score: 0.8,
        overall_quality_score: 0.88
      }
    }
  }

  async function createMockQualityAssuranceResult(): Promise<any> {
    return {
      quality_assessment: {
        overall_quality_score: 0.88,
        content_quality: {
          clarity_score: 0.9,
          relevance_score: 0.85,
          accuracy_score: 0.9,
          completeness_score: 0.8
        },
        readability_metrics: {
          overall_readability_score: 0.8,
          grade_level: 12,
          sentence_complexity: 0.7
        },
        methodology_compliance: {
          framework_compliance_score: 0.9,
          methodology_adherence: 0.85,
          best_practice_alignment: 0.8
        }
      },
      compliance_validation: {
        overall_compliance_score: 0.9,
        framework_compliance: [
          { framework_id: 'iso_9001', compliance_score: 0.9 },
          { framework_id: 'babok', compliance_score: 0.85 }
        ]
      },
      security_validation: {
        overall_security_score: 0.95,
        data_protection_compliance: {
          gdpr_compliance: true,
          ccpa_compliance: true
        }
      },
      accessibility_validation: {
        overall_accessibility_score: 0.85,
        wcag_compliance: {
          level_aa_compliance: 0.9,
          level_aaa_compliance: 0.8
        }
      }
    }
  }
})
