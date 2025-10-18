/**
 * Context Gathering Stage
 * Stage 1: Gathers and analyzes context from various sources
 */

import { logger } from '../../../utils/logger'
import { ContextGatheringStage as EnhancedContextGatheringStage } from '../../contextGathering/contextGatheringStage'
import type { StageInput, StageOutput } from '../types'

export class ContextGatheringStage {
  private enhancedContextGatheringStage: EnhancedContextGatheringStage

  constructor() {
    this.enhancedContextGatheringStage = new EnhancedContextGatheringStage()
  }

  async execute(input: StageInput): Promise<StageOutput> {
    try {
      logger.info('Executing context gathering stage', {
        stageId: input.stage_id,
        requestId: input.metadata?.request_id
      })

      const startTime = Date.now()

      // Extract input data
      const { template_id, project_id, user_id } = input.input_data

      // Use enhanced context gathering stage
      const gatheringRequest = {
        request_id: input.metadata?.request_id || `req_${Date.now()}`,
        template_id,
        project_id,
        user_id,
        document_type: 'project_charter',
        gathering_config: {
          enable_project_analysis: true,
          enable_user_profile_analysis: true,
          enable_document_history_analysis: true,
          enable_external_source_integration: true,
          enable_template_context_analysis: true,
          max_context_age: 24,
          context_quality_threshold: 0.7,
          include_historical_patterns: true,
          include_collaboration_data: true,
          include_performance_metrics: true,
          context_sources: [
            {
              source_id: 'project_database',
              source_type: 'project_database',
              source_name: 'Project Database',
              source_config: {},
              enabled: true,
              priority: 1,
              reliability_score: 0.9,
              last_updated: new Date()
            },
            {
              source_id: 'user_profile',
              source_type: 'user_profile',
              source_name: 'User Profile',
              source_config: {},
              enabled: true,
              priority: 2,
              reliability_score: 0.8,
              last_updated: new Date()
            }
          ],
          analysis_depth: 'deep',
          priority_filters: []
        },
        metadata: {
          pipeline_stage: 'context_gathering',
          execution_context: 'document_generation'
        }
      }

      const gatheringResult = await this.enhancedContextGatheringStage.execute(gatheringRequest)

      const processingTime = Date.now() - startTime

      // 🔍 DEBUG: Log what context was gathered
      logger.info('📊 CONTEXT GATHERING DEBUG', {
        project_id,
        template_id,
        sources_accessed: gatheringResult.gathering_metrics.total_sources_accessed,
        context_data_keys: Object.keys(gatheringResult.context_data || {}),
        context_size_bytes: JSON.stringify(gatheringResult.context_data).length,
        quality_score: gatheringResult.quality_analysis.overall_quality_score,
        has_project_data: !!gatheringResult.context_data?.project,
        has_documents: !!gatheringResult.context_data?.documents,
        document_count: gatheringResult.context_data?.documents?.length || 0
      })

      // 🔍 DEBUG: Log sample of gathered context
      if (gatheringResult.context_data?.documents?.length > 0) {
        logger.info('📄 GATHERED DOCUMENTS SAMPLE', {
          project_id,
          sample_documents: gatheringResult.context_data.documents.slice(0, 3).map(doc => ({
            name: doc.name || 'unnamed',
            content_length: doc.content?.length || 0,
            content_preview: doc.content?.substring(0, 100) || 'no content'
          }))
        })
      } else {
        logger.warn('⚠️ NO DOCUMENTS GATHERED', { project_id })
      }

      // Prepare context bundle for pipeline
      const contextBundle = {
        bundle_id: `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        context_data: gatheringResult.context_data,
        quality_assessment: gatheringResult.quality_analysis,
        metadata: {
          created_at: new Date(),
          sources_count: gatheringResult.gathering_metrics.total_sources_accessed,
          total_size: JSON.stringify(gatheringResult.context_data).length,
          quality_score: gatheringResult.quality_analysis.overall_quality_score
        }
      }

      const output: StageOutput = {
        stage_id: input.stage_id,
        stage_type: input.stage_type,
        output_data: {
          context_bundle: contextBundle,
          context_quality: gatheringResult.quality_analysis,
          sources_used: gatheringResult.context_data.metadata.context_sources_used,
          gathering_time: processingTime,
          context_gaps: gatheringResult.context_gaps,
          recommendations: gatheringResult.recommendations
        },
        quality_score: gatheringResult.quality_analysis.overall_quality_score,
        processing_time: processingTime,
        metadata: {
          stage: 'context_gathering',
          sources_count: gatheringResult.gathering_metrics.total_sources_accessed,
          context_size: JSON.stringify(contextBundle).length,
          context_gaps_identified: gatheringResult.context_gaps.length,
          recommendations_generated: gatheringResult.recommendations.length
        }
      }

      logger.info('Context gathering stage completed successfully', {
        stageId: input.stage_id,
        processingTime,
        qualityScore: output.quality_score,
        sourcesUsed: gatheringResult.gathering_metrics.total_sources_accessed,
        contextGaps: gatheringResult.context_gaps.length
      })

      return output

    } catch (error) {
      logger.error('Context gathering stage failed', {
        stageId: input.stage_id,
        error: error.message
      })
      throw error
    }
  }

}

