/**
 * End-to-End Test: Full 6-Stage Document Processing Pipeline
 * Tests the complete flow from template to AI generation to formatted output
 */

import { MultiStageDocumentProcessor } from '../modules/multiStageDocumentProcessor'
import { pool } from '../database/connection'
import type { DocumentProcessingRequest } from '../modules/multiStageDocumentProcessor/types'

describe('6-Stage Document Processing Pipeline - E2E Test', () => {
  let processor: MultiStageDocumentProcessor
  let testProjectId: string
  let testUserId: string
  let testTemplateId: string

  beforeAll(async () => {
    // Initialize processor
    processor = new MultiStageDocumentProcessor({
      enableParallelProcessing: false, // Sequential for easier debugging
      enableQualityGates: true,
      enableMonitoring: true,
      maxProcessingTime: 300000,
      defaultRetryAttempts: 3,
      jobTimeout: 300000,
      maxConcurrentJobs: 1,
      enableMetricsCollection: true,
      enableErrorTracking: true
    })

    // Create test data
    const userResult = await pool.query(`
      INSERT INTO users (email, name, role, password_hash, is_active)
      VALUES ('pipeline-test@test.com', 'Pipeline Test User', 'admin', '$2a$10$test', true)
      RETURNING id
    `)
    testUserId = userResult.rows[0].id

    const projectResult = await pool.query(`
      INSERT INTO projects (name, description, created_by, status)
      VALUES ('E2E Test Project', 'Testing the full pipeline', $1, 'active')
      RETURNING id
    `, [testUserId])
    testProjectId = projectResult.rows[0].id

    const templateResult = await pool.query(`
      INSERT INTO templates (
        name,
        description,
        category,
        framework,
        content,
        context_injection_rules,
        prompt_buildup_instructions,
        system_prompt,
        created_by,
        is_active
      )
      VALUES (
        'E2E Test Template',
        'Template for end-to-end pipeline testing',
        'Testing',
        'PMBOK',
        '# {{project_name}} Project Charter

## Executive Summary
{{ai:executive_summary}}

## Project Objectives
{{ai:objectives}}

## Scope
{{ai:scope}}

## Stakeholders
{{stakeholder_list}}',
        '{"rules": ["Include project context", "Add stakeholder information"]}',
        '{"instructions": ["Generate executive summary", "Define objectives", "Outline scope"]}',
        'You are a professional business analyst creating a project charter.',
        $1,
        true
      )
      RETURNING id
    `, [testUserId])
    testTemplateId = templateResult.rows[0].id
  })

  afterAll(async () => {
    // Clean up test data
    if (testTemplateId) {
      await pool.query('DELETE FROM templates WHERE id = $1', [testTemplateId])
    }
    if (testProjectId) {
      await pool.query('DELETE FROM projects WHERE id = $1', [testProjectId])
    }
    if (testUserId) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUserId])
    }
  })

  describe('Full Pipeline Execution', () => {
    test('should execute all 6 stages successfully', async () => {
      // Arrange
      const request: DocumentProcessingRequest = {
        request_id: `test_req_${Date.now()}`,
        template_id: testTemplateId,
        project_id: testProjectId,
        user_id: testUserId,
        context_bundle: {
          project_context: {
            project_name: 'Test E2E Project',
            start_date: '2025-01-01',
            end_date: '2025-12-31'
          }
        },
        processing_config: {
          enable_ai_enhancement: true,
          enable_methodology_alignment: true,
          enable_quality_optimization: true,
          enable_performance_optimization: true,
          max_processing_time: 300000,
          retry_attempts: 3,
          quality_thresholds: {
            structure_quality: 0.7,
            content_quality: 0.7,
            methodology_compliance: 0.7,
            ai_enhancement_quality: 0.7,
            overall_quality: 0.7
          }
        },
        enhancement_config: {
          ai_insights_enabled: true,
          methodology_alignment_enabled: true,
          content_enhancement_enabled: true,
          variable_optimization_enabled: true,
          structure_optimization_enabled: true,
          enhancement_strategies: []
        },
        quality_config: {
          enable_structure_validation: true,
          enable_content_validation: true,
          enable_methodology_validation: true,
          enable_ai_validation: true,
          quality_gates: [],
          validation_criteria: {}
        },
        metadata: {
          test: true,
          created_at: new Date().toISOString()
        }
      }

      // Act
      const result = await processor.processDocument(request)

      // Assert
      expect(result).toBeDefined()
      expect(result.status.status).toBe('completed')
      expect(result.status.progress).toBe(100)
      expect(result.stages).toHaveLength(6)

      // Verify each stage completed
      const stageTypes = result.stages.map(s => s.stage_type)
      expect(stageTypes).toContain('context_gathering')
      expect(stageTypes).toContain('template_processing')
      expect(stageTypes).toContain('ai_generation')
      expect(stageTypes).toContain('context_injection')
      expect(stageTypes).toContain('quality_assurance')
      expect(stageTypes).toContain('output_formatting')

      // Verify final document exists
      expect(result.final_document).toBeDefined()
      expect(result.final_document.content).toBeDefined()

      // Verify quality report
      expect(result.quality_report).toBeDefined()
      expect(result.quality_report.overall_score).toBeGreaterThanOrEqual(0)
      expect(result.quality_report.overall_score).toBeLessThanOrEqual(1)

      // Verify processing metrics
      expect(result.processing_metrics).toBeDefined()
      expect(result.processing_metrics.total_processing_time).toBeGreaterThan(0)

      console.log('✅ Pipeline Test Results:')
      console.log(`  Status: ${result.status.status}`)
      console.log(`  Progress: ${result.status.progress}%`)
      console.log(`  Stages Completed: ${result.stages.length}/6`)
      console.log(`  Quality Score: ${result.quality_report.overall_score}`)
      console.log(`  Processing Time: ${result.processing_metrics.total_processing_time}ms`)
    }, 300000) // 5 minute timeout

    test('should handle each stage correctly', async () => {
      const request: DocumentProcessingRequest = {
        request_id: `test_stages_${Date.now()}`,
        template_id: testTemplateId,
        project_id: testProjectId,
        user_id: testUserId,
        context_bundle: {},
        processing_config: {
          enable_ai_enhancement: true,
          enable_methodology_alignment: true,
          enable_quality_optimization: true,
          enable_performance_optimization: true,
          max_processing_time: 300000,
          retry_attempts: 3,
          quality_thresholds: {
            structure_quality: 0.6,
            content_quality: 0.6,
            methodology_compliance: 0.6,
            ai_enhancement_quality: 0.6,
            overall_quality: 0.6
          }
        },
        enhancement_config: {
          ai_insights_enabled: true,
          methodology_alignment_enabled: true,
          content_enhancement_enabled: true,
          variable_optimization_enabled: true,
          structure_optimization_enabled: true,
          enhancement_strategies: []
        },
        quality_config: {
          enable_structure_validation: true,
          enable_content_validation: true,
          enable_methodology_validation: true,
          enable_ai_validation: true,
          quality_gates: [],
          validation_criteria: {}
        },
        metadata: {}
      }

      const result = await processor.processDocument(request)

      // Stage 1: Context Gathering
      const stage1 = result.stages.find(s => s.stage_type === 'context_gathering')
      expect(stage1).toBeDefined()
      expect(stage1?.status).toBe('completed')
      expect(stage1?.output).toBeDefined()

      // Stage 2: Template Processing
      const stage2 = result.stages.find(s => s.stage_type === 'template_processing')
      expect(stage2).toBeDefined()
      expect(stage2?.status).toBe('completed')
      expect(stage2?.output).toBeDefined()

      // Stage 3: AI Generation
      const stage3 = result.stages.find(s => s.stage_type === 'ai_generation')
      expect(stage3).toBeDefined()
      expect(stage3?.status).toBe('completed')
      expect(stage3?.output).toBeDefined()

      // Stage 4: Context Injection
      const stage4 = result.stages.find(s => s.stage_type === 'context_injection')
      expect(stage4).toBeDefined()
      expect(stage4?.status).toBe('completed')
      expect(stage4?.output).toBeDefined()

      // Stage 5: Quality Assurance
      const stage5 = result.stages.find(s => s.stage_type === 'quality_assurance')
      expect(stage5).toBeDefined()
      expect(stage5?.status).toBe('completed')
      expect(stage5?.output).toBeDefined()

      // Stage 6: Output Formatting
      const stage6 = result.stages.find(s => s.stage_type === 'output_formatting')
      expect(stage6).toBeDefined()
      expect(stage6?.status).toBe('completed')
      expect(stage6?.output).toBeDefined()

      console.log('\n✅ All 6 Stages Verified:')
      result.stages.forEach(stage => {
        console.log(`  Stage ${stage.stage_type}: ${stage.status} (${stage.execution_time}ms, quality: ${stage.quality_score})`)
      })
    }, 300000)

    test('should generate high-quality markdown content', async () => {
      const request: DocumentProcessingRequest = {
        request_id: `test_quality_${Date.now()}`,
        template_id: testTemplateId,
        project_id: testProjectId,
        user_id: testUserId,
        context_bundle: {
          project_context: {
            project_name: 'Quality Test Project',
            description: 'This is a comprehensive test of quality metrics'
          }
        },
        processing_config: {
          enable_ai_enhancement: true,
          enable_methodology_alignment: true,
          enable_quality_optimization: true,
          enable_performance_optimization: true,
          max_processing_time: 300000,
          retry_attempts: 3,
          quality_thresholds: {
            structure_quality: 0.8,
            content_quality: 0.8,
            methodology_compliance: 0.8,
            ai_enhancement_quality: 0.8,
            overall_quality: 0.8
          }
        },
        enhancement_config: {
          ai_insights_enabled: true,
          methodology_alignment_enabled: true,
          content_enhancement_enabled: true,
          variable_optimization_enabled: true,
          structure_optimization_enabled: true,
          enhancement_strategies: []
        },
        quality_config: {
          enable_structure_validation: true,
          enable_content_validation: true,
          enable_methodology_validation: true,
          enable_ai_validation: true,
          quality_gates: [],
          validation_criteria: {}
        },
        metadata: {}
      }

      const result = await processor.processDocument(request)

      // Verify content is markdown
      expect(result.final_document.content).toBeDefined()
      expect(typeof result.final_document.content).toBe('string')
      
      // Verify markdown structure (should have headings)
      const content = result.final_document.content as string
      expect(content).toMatch(/^#+ /)  // Has markdown headings

      // Verify quality score meets threshold
      expect(result.quality_report.overall_score).toBeGreaterThanOrEqual(0.6)

      console.log('\n✅ Generated Content Preview:')
      console.log(content.substring(0, 500))
      console.log(`\n  Content Length: ${content.length} characters`)
      console.log(`  Quality Score: ${result.quality_report.overall_score}`)
    }, 300000)
  })

  describe('Pipeline Error Handling', () => {
    test('should handle missing template gracefully', async () => {
      const request: DocumentProcessingRequest = {
        request_id: `test_error_${Date.now()}`,
        template_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        project_id: testProjectId,
        user_id: testUserId,
        context_bundle: {},
        processing_config: {
          enable_ai_enhancement: true,
          enable_methodology_alignment: true,
          enable_quality_optimization: true,
          enable_performance_optimization: true,
          max_processing_time: 300000,
          retry_attempts: 3,
          quality_thresholds: {
            structure_quality: 0.7,
            content_quality: 0.7,
            methodology_compliance: 0.7,
            ai_enhancement_quality: 0.7,
            overall_quality: 0.7
          }
        },
        enhancement_config: {
          ai_insights_enabled: true,
          methodology_alignment_enabled: true,
          content_enhancement_enabled: true,
          variable_optimization_enabled: true,
          structure_optimization_enabled: true,
          enhancement_strategies: []
        },
        quality_config: {
          enable_structure_validation: true,
          enable_content_validation: true,
          enable_methodology_validation: true,
          enable_ai_validation: true,
          quality_gates: [],
          validation_criteria: {}
        },
        metadata: {}
      }

      await expect(processor.processDocument(request)).rejects.toThrow()
    }, 30000)
  })

  describe('Pipeline Performance', () => {
    test('should complete pipeline within acceptable time', async () => {
      const startTime = Date.now()

      const request: DocumentProcessingRequest = {
        request_id: `test_perf_${Date.now()}`,
        template_id: testTemplateId,
        project_id: testProjectId,
        user_id: testUserId,
        context_bundle: {},
        processing_config: {
          enable_ai_enhancement: true,
          enable_methodology_alignment: true,
          enable_quality_optimization: false, // Disable for speed
          enable_performance_optimization: true,
          max_processing_time: 300000,
          retry_attempts: 1,
          quality_thresholds: {
            structure_quality: 0.5,
            content_quality: 0.5,
            methodology_compliance: 0.5,
            ai_enhancement_quality: 0.5,
            overall_quality: 0.5
          }
        },
        enhancement_config: {
          ai_insights_enabled: true,
          methodology_alignment_enabled: false,
          content_enhancement_enabled: true,
          variable_optimization_enabled: false,
          structure_optimization_enabled: false,
          enhancement_strategies: []
        },
        quality_config: {
          enable_structure_validation: true,
          enable_content_validation: false,
          enable_methodology_validation: false,
          enable_ai_validation: false,
          quality_gates: [],
          validation_criteria: {}
        },
        metadata: {}
      }

      const result = await processor.processDocument(request)
      const endTime = Date.now()
      const duration = endTime - startTime

      expect(result.status.status).toBe('completed')
      expect(duration).toBeLessThan(60000) // Should complete within 60 seconds

      console.log(`\n⚡ Performance Test Results:`)
      console.log(`  Total Time: ${duration}ms`)
      console.log(`  Target: < 60000ms`)
      console.log(`  Status: ${duration < 60000 ? '✅ PASS' : '❌ FAIL'}`)
    }, 90000)
  })
})

