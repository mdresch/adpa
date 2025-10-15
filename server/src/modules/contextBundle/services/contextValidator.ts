/**
 * Context Validator Service
 * Validates context bundles for quality, completeness, and consistency
 */

import { logger } from '../../../utils/logger'
import type {
  ContextBundle,
  ValidationResult,
  ValidationError,
  ValidationWarning
} from '../types'

export class ContextValidator {
  async validate(bundle: ContextBundle): Promise<ValidationResult> {
    try {
      logger.debug('Starting context bundle validation', { bundleId: bundle.id })

      const validationErrors: ValidationError[] = []
      const validationWarnings: ValidationWarning[] = []

      // Validate bundle structure
      this.validateBundleStructure(bundle, validationErrors, validationWarnings)

      // Validate sources
      this.validateSources(bundle.sources, validationErrors, validationWarnings)

      // Validate aggregated context
      this.validateAggregatedContext(bundle.aggregated_context, validationErrors, validationWarnings)

      // Validate organization strategy
      this.validateOrganizationStrategy(bundle.organization_strategy, validationErrors, validationWarnings)

      // Validate metadata
      this.validateMetadata(bundle.metadata, validationErrors, validationWarnings)

      // Calculate quality score
      const qualityScore = this.calculateQualityScore(validationErrors, validationWarnings)

      const validationResult: ValidationResult = {
        bundle_id: bundle.id,
        validated_at: new Date(),
        is_valid: validationErrors.length === 0,
        validation_errors: validationErrors,
        validation_warnings: validationWarnings,
        quality_score: qualityScore
      }

      logger.info('Context bundle validation completed', {
        bundleId: bundle.id,
        isValid: validationResult.is_valid,
        errorsCount: validationErrors.length,
        warningsCount: validationWarnings.length,
        qualityScore
      })

      return validationResult

    } catch (error) {
      logger.error('Failed to validate context bundle', {
        bundleId: bundle.id,
        error: error.message
      })
      throw error
    }
  }

  private validateBundleStructure(bundle: ContextBundle, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate required fields
    if (!bundle.id) {
      errors.push({
        field: 'id',
        message: 'Bundle ID is required',
        severity: 'error'
      })
    }

    if (!bundle.name) {
      errors.push({
        field: 'name',
        message: 'Bundle name is required',
        severity: 'error'
      })
    }

    if (!bundle.bundle_type) {
      errors.push({
        field: 'bundle_type',
        message: 'Bundle type is required',
        severity: 'error'
      })
    }

    if (!bundle.priority) {
      errors.push({
        field: 'priority',
        message: 'Priority is required',
        severity: 'error'
      })
    }

    // Validate optional fields
    if (bundle.description && bundle.description.length > 1000) {
      warnings.push({
        field: 'description',
        message: 'Description is very long and may affect performance',
        suggestion: 'Consider shortening the description to under 1000 characters'
      })
    }

    // Validate dates
    if (bundle.expires_at && bundle.expires_at <= new Date()) {
      warnings.push({
        field: 'expires_at',
        message: 'Bundle has already expired',
        suggestion: 'Consider updating the expiration date or removing it'
      })
    }

    if (bundle.created_at && bundle.updated_at && bundle.updated_at < bundle.created_at) {
      errors.push({
        field: 'updated_at',
        message: 'Updated date cannot be before created date',
        severity: 'error'
      })
    }
  }

  private validateSources(sources: any[], errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate sources array
    if (!sources || sources.length === 0) {
      warnings.push({
        field: 'sources',
        message: 'No sources provided for context bundle',
        suggestion: 'Consider adding at least one source to provide meaningful context'
      })
      return
    }

    // Validate each source
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]
      this.validateSource(source, i, errors, warnings)
    }

    // Validate source uniqueness
    const sourceIds = new Set()
    const duplicateSources = new Set()

    for (const source of sources) {
      if (sourceIds.has(source.id)) {
        duplicateSources.add(source.id)
      }
      sourceIds.add(source.id)
    }

    if (duplicateSources.size > 0) {
      errors.push({
        field: 'sources',
        message: `Duplicate source IDs found: ${Array.from(duplicateSources).join(', ')}`,
        severity: 'error'
      })
    }
  }

  private validateSource(source: any, index: number, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const fieldPrefix = `sources[${index}]`

    // Validate required source fields
    if (!source.id) {
      errors.push({
        field: `${fieldPrefix}.id`,
        message: 'Source ID is required',
        severity: 'error'
      })
    }

    if (!source.name) {
      errors.push({
        field: `${fieldPrefix}.name`,
        message: 'Source name is required',
        severity: 'error'
      })
    }

    if (!source.type) {
      errors.push({
        field: `${fieldPrefix}.type`,
        message: 'Source type is required',
        severity: 'error'
      })
    }

    if (!source.source_id) {
      errors.push({
        field: `${fieldPrefix}.source_id`,
        message: 'Source ID is required',
        severity: 'error'
      })
    }

    // Validate source weight
    if (source.weight !== undefined) {
      if (typeof source.weight !== 'number' || source.weight < 0 || source.weight > 1) {
        errors.push({
          field: `${fieldPrefix}.weight`,
          message: 'Source weight must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }

    // Validate source priority
    if (source.priority && !['low', 'medium', 'high', 'critical'].includes(source.priority)) {
      errors.push({
        field: `${fieldPrefix}.priority`,
        message: 'Source priority must be one of: low, medium, high, critical',
        severity: 'error'
      })
    }

    // Validate source freshness
    if (source.freshness) {
      this.validateSourceFreshness(source.freshness, `${fieldPrefix}.freshness`, errors, warnings)
    }

    // Validate source metadata
    if (source.metadata) {
      this.validateSourceMetadata(source.metadata, `${fieldPrefix}.metadata`, errors, warnings)
    }
  }

  private validateSourceFreshness(freshness: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (freshness.freshness_score !== undefined) {
      if (typeof freshness.freshness_score !== 'number' || freshness.freshness_score < 0 || freshness.freshness_score > 1) {
        errors.push({
          field: `${fieldPrefix}.freshness_score`,
          message: 'Freshness score must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }

    if (freshness.update_frequency && !['real_time', 'hourly', 'daily', 'weekly', 'monthly', 'manual'].includes(freshness.update_frequency)) {
      errors.push({
        field: `${fieldPrefix}.update_frequency`,
        message: 'Update frequency must be one of: real_time, hourly, daily, weekly, monthly, manual',
        severity: 'error'
      })
    }
  }

  private validateSourceMetadata(metadata: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (metadata.quality_score !== undefined) {
      if (typeof metadata.quality_score !== 'number' || metadata.quality_score < 0 || metadata.quality_score > 1) {
        errors.push({
          field: `${fieldPrefix}.quality_score`,
          message: 'Quality score must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }

    if (metadata.reliability_score !== undefined) {
      if (typeof metadata.reliability_score !== 'number' || metadata.reliability_score < 0 || metadata.reliability_score > 1) {
        errors.push({
          field: `${fieldPrefix}.reliability_score`,
          message: 'Reliability score must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }

    if (metadata.validation_status && !['valid', 'invalid', 'pending'].includes(metadata.validation_status)) {
      errors.push({
        field: `${fieldPrefix}.validation_status`,
        message: 'Validation status must be one of: valid, invalid, pending',
        severity: 'error'
      })
    }
  }

  private validateAggregatedContext(context: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!context) {
      warnings.push({
        field: 'aggregated_context',
        message: 'No aggregated context provided',
        suggestion: 'Consider processing the bundle to generate aggregated context'
      })
      return
    }

    // Validate structured data
    if (context.structured_data) {
      this.validateStructuredData(context.structured_data, 'aggregated_context.structured_data', errors, warnings)
    }

    // Validate unstructured data
    if (context.unstructured_data) {
      this.validateUnstructuredData(context.unstructured_data, 'aggregated_context.unstructured_data', errors, warnings)
    }

    // Validate semantic data
    if (context.semantic_data) {
      this.validateSemanticData(context.semantic_data, 'aggregated_context.semantic_data', errors, warnings)
    }

    // Validate temporal data
    if (context.temporal_data) {
      this.validateTemporalData(context.temporal_data, 'aggregated_context.temporal_data', errors, warnings)
    }

    // Validate quality metrics
    if (context.quality_metrics) {
      this.validateQualityMetrics(context.quality_metrics, 'aggregated_context.quality_metrics', errors, warnings)
    }

    // Validate relevance scores
    if (context.relevance_scores) {
      this.validateRelevanceScores(context.relevance_scores, 'aggregated_context.relevance_scores', errors, warnings)
    }

    // Validate confidence scores
    if (context.confidence_scores) {
      this.validateConfidenceScores(context.confidence_scores, 'aggregated_context.confidence_scores', errors, warnings)
    }
  }

  private validateStructuredData(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate project info
    if (data.project_info) {
      this.validateProjectInfo(data.project_info, `${fieldPrefix}.project_info`, errors, warnings)
    }

    // Validate user info
    if (data.user_info) {
      this.validateUserInfo(data.user_info, `${fieldPrefix}.user_info`, errors, warnings)
    }

    // Validate document info
    if (data.document_info) {
      this.validateDocumentInfo(data.document_info, `${fieldPrefix}.document_info`, errors, warnings)
    }

    // Validate template info
    if (data.template_info) {
      this.validateTemplateInfo(data.template_info, `${fieldPrefix}.template_info`, errors, warnings)
    }

    // Validate framework info
    if (data.framework_info) {
      this.validateFrameworkInfo(data.framework_info, `${fieldPrefix}.framework_info`, errors, warnings)
    }

    // Validate arrays
    if (data.stakeholder_data && !Array.isArray(data.stakeholder_data)) {
      errors.push({
        field: `${fieldPrefix}.stakeholder_data`,
        message: 'Stakeholder data must be an array',
        severity: 'error'
      })
    }

    if (data.requirement_data && !Array.isArray(data.requirement_data)) {
      errors.push({
        field: `${fieldPrefix}.requirement_data`,
        message: 'Requirement data must be an array',
        severity: 'error'
      })
    }

    if (data.risk_data && !Array.isArray(data.risk_data)) {
      errors.push({
        field: `${fieldPrefix}.risk_data`,
        message: 'Risk data must be an array',
        severity: 'error'
      })
    }

    if (data.constraint_data && !Array.isArray(data.constraint_data)) {
      errors.push({
        field: `${fieldPrefix}.constraint_data`,
        message: 'Constraint data must be an array',
        severity: 'error'
      })
    }
  }

  private validateUnstructuredData(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate text content
    if (data.text_content && typeof data.text_content !== 'string') {
      errors.push({
        field: `${fieldPrefix}.text_content`,
        message: 'Text content must be a string',
        severity: 'error'
      })
    }

    // Validate markdown content
    if (data.markdown_content && typeof data.markdown_content !== 'string') {
      errors.push({
        field: `${fieldPrefix}.markdown_content`,
        message: 'Markdown content must be a string',
        severity: 'error'
      })
    }

    // Validate HTML content
    if (data.html_content && typeof data.html_content !== 'string') {
      errors.push({
        field: `${fieldPrefix}.html_content`,
        message: 'HTML content must be a string',
        severity: 'error'
      })
    }

    // Validate arrays
    if (data.extracted_insights && !Array.isArray(data.extracted_insights)) {
      errors.push({
        field: `${fieldPrefix}.extracted_insights`,
        message: 'Extracted insights must be an array',
        severity: 'error'
      })
    }

    if (data.key_phrases && !Array.isArray(data.key_phrases)) {
      errors.push({
        field: `${fieldPrefix}.key_phrases`,
        message: 'Key phrases must be an array',
        severity: 'error'
      })
    }

    if (data.topics && !Array.isArray(data.topics)) {
      errors.push({
        field: `${fieldPrefix}.topics`,
        message: 'Topics must be an array',
        severity: 'error'
      })
    }

    // Validate sentiment
    if (data.sentiment) {
      this.validateSentiment(data.sentiment, `${fieldPrefix}.sentiment`, errors, warnings)
    }

    // Validate language
    if (data.language && typeof data.language !== 'string') {
      errors.push({
        field: `${fieldPrefix}.language`,
        message: 'Language must be a string',
        severity: 'error'
      })
    }
  }

  private validateSemanticData(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate embeddings
    if (data.embeddings && !Array.isArray(data.embeddings)) {
      errors.push({
        field: `${fieldPrefix}.embeddings`,
        message: 'Embeddings must be an array',
        severity: 'error'
      })
    }

    // Validate semantic similarity
    if (data.semantic_similarity !== undefined) {
      if (typeof data.semantic_similarity !== 'number' || data.semantic_similarity < 0 || data.semantic_similarity > 1) {
        errors.push({
          field: `${fieldPrefix}.semantic_similarity`,
          message: 'Semantic similarity must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }

    // Validate topic modeling
    if (data.topic_modeling) {
      this.validateTopicModeling(data.topic_modeling, `${fieldPrefix}.topic_modeling`, errors, warnings)
    }

    // Validate entity extraction
    if (data.entity_extraction) {
      this.validateEntityExtraction(data.entity_extraction, `${fieldPrefix}.entity_extraction`, errors, warnings)
    }

    // Validate relationship mapping
    if (data.relationship_mapping) {
      this.validateRelationshipMapping(data.relationship_mapping, `${fieldPrefix}.relationship_mapping`, errors, warnings)
    }

    // Validate concept graph
    if (data.concept_graph) {
      this.validateConceptGraph(data.concept_graph, `${fieldPrefix}.concept_graph`, errors, warnings)
    }

    // Validate knowledge graph
    if (data.knowledge_graph) {
      this.validateKnowledgeGraph(data.knowledge_graph, `${fieldPrefix}.knowledge_graph`, errors, warnings)
    }
  }

  private validateTemporalData(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate arrays
    if (data.creation_timeline && !Array.isArray(data.creation_timeline)) {
      errors.push({
        field: `${fieldPrefix}.creation_timeline`,
        message: 'Creation timeline must be an array',
        severity: 'error'
      })
    }

    if (data.modification_timeline && !Array.isArray(data.modification_timeline)) {
      errors.push({
        field: `${fieldPrefix}.modification_timeline`,
        message: 'Modification timeline must be an array',
        severity: 'error'
      })
    }

    if (data.usage_timeline && !Array.isArray(data.usage_timeline)) {
      errors.push({
        field: `${fieldPrefix}.usage_timeline`,
        message: 'Usage timeline must be an array',
        severity: 'error'
      })
    }

    if (data.trend_data && !Array.isArray(data.trend_data)) {
      errors.push({
        field: `${fieldPrefix}.trend_data`,
        message: 'Trend data must be an array',
        severity: 'error'
      })
    }

    if (data.seasonal_patterns && !Array.isArray(data.seasonal_patterns)) {
      errors.push({
        field: `${fieldPrefix}.seasonal_patterns`,
        message: 'Seasonal patterns must be an array',
        severity: 'error'
      })
    }

    // Validate temporal relevance
    if (data.temporal_relevance !== undefined) {
      if (typeof data.temporal_relevance !== 'number' || data.temporal_relevance < 0 || data.temporal_relevance > 1) {
        errors.push({
          field: `${fieldPrefix}.temporal_relevance`,
          message: 'Temporal relevance must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }
  }

  private validateQualityMetrics(metrics: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const scoreFields = [
      'completeness_score', 'accuracy_score', 'relevance_score', 'freshness_score',
      'consistency_score', 'reliability_score', 'overall_quality_score'
    ]

    for (const field of scoreFields) {
      if (metrics[field] !== undefined) {
        if (typeof metrics[field] !== 'number' || metrics[field] < 0 || metrics[field] > 1) {
          errors.push({
            field: `${fieldPrefix}.${field}`,
            message: `${field} must be a number between 0 and 1`,
            severity: 'error'
          })
        }
      }
    }
  }

  private validateRelevanceScores(scores: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const scoreFields = [
      'semantic_relevance', 'temporal_relevance', 'user_relevance',
      'project_relevance', 'framework_relevance', 'overall_relevance'
    ]

    for (const field of scoreFields) {
      if (scores[field] !== undefined) {
        if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 1) {
          errors.push({
            field: `${fieldPrefix}.${field}`,
            message: `${field} must be a number between 0 and 1`,
            severity: 'error'
          })
        }
      }
    }
  }

  private validateConfidenceScores(scores: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    const scoreFields = [
      'data_confidence', 'source_confidence', 'aggregation_confidence',
      'semantic_confidence', 'temporal_confidence', 'overall_confidence'
    ]

    for (const field of scoreFields) {
      if (scores[field] !== undefined) {
        if (typeof scores[field] !== 'number' || scores[field] < 0 || scores[field] > 1) {
          errors.push({
            field: `${fieldPrefix}.${field}`,
            message: `${field} must be a number between 0 and 1`,
            severity: 'error'
          })
        }
      }
    }
  }

  private validateOrganizationStrategy(strategy: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!strategy) {
      warnings.push({
        field: 'organization_strategy',
        message: 'No organization strategy provided',
        suggestion: 'Consider defining an organization strategy to structure the context effectively'
      })
      return
    }

    // Validate strategy type
    if (strategy.strategy_type && !['hierarchical', 'chronological', 'semantic', 'priority_based', 'relevance_based', 'custom'].includes(strategy.strategy_type)) {
      errors.push({
        field: 'organization_strategy.strategy_type',
        message: 'Strategy type must be one of: hierarchical, chronological, semantic, priority_based, relevance_based, custom',
        severity: 'error'
      })
    }

    // Validate grouping criteria
    if (strategy.grouping_criteria && !Array.isArray(strategy.grouping_criteria)) {
      errors.push({
        field: 'organization_strategy.grouping_criteria',
        message: 'Grouping criteria must be an array',
        severity: 'error'
      })
    }

    // Validate sorting criteria
    if (strategy.sorting_criteria && !Array.isArray(strategy.sorting_criteria)) {
      errors.push({
        field: 'organization_strategy.sorting_criteria',
        message: 'Sorting criteria must be an array',
        severity: 'error'
      })
    }

    // Validate filtering criteria
    if (strategy.filtering_criteria && !Array.isArray(strategy.filtering_criteria)) {
      errors.push({
        field: 'organization_strategy.filtering_criteria',
        message: 'Filtering criteria must be an array',
        severity: 'error'
      })
    }
  }

  private validateMetadata(metadata: any, errors: ValidationError[], warnings: ValidationWarning[]): void {
    if (!metadata) {
      warnings.push({
        field: 'metadata',
        message: 'No metadata provided',
        suggestion: 'Consider adding metadata to provide additional context and tracking information'
      })
      return
    }

    // Validate version
    if (metadata.version && typeof metadata.version !== 'string') {
      errors.push({
        field: 'metadata.version',
        message: 'Version must be a string',
        severity: 'error'
      })
    }

    // Validate schema version
    if (metadata.schema_version && typeof metadata.schema_version !== 'string') {
      errors.push({
        field: 'metadata.schema_version',
        message: 'Schema version must be a string',
        severity: 'error'
      })
    }

    // Validate created by
    if (metadata.created_by && typeof metadata.created_by !== 'string') {
      errors.push({
        field: 'metadata.created_by',
        message: 'Created by must be a string',
        severity: 'error'
      })
    }

    // Validate arrays
    if (metadata.tags && !Array.isArray(metadata.tags)) {
      errors.push({
        field: 'metadata.tags',
        message: 'Tags must be an array',
        severity: 'error'
      })
    }

    if (metadata.categories && !Array.isArray(metadata.categories)) {
      errors.push({
        field: 'metadata.categories',
        message: 'Categories must be an array',
        severity: 'error'
      })
    }
  }

  // Helper validation methods for specific data types
  private validateProjectInfo(info: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate project ID
    if (info.project_id && typeof info.project_id !== 'string') {
      errors.push({
        field: `${fieldPrefix}.project_id`,
        message: 'Project ID must be a string',
        severity: 'error'
      })
    }

    // Validate project name
    if (info.project_name && typeof info.project_name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.project_name`,
        message: 'Project name must be a string',
        severity: 'error'
      })
    }
  }

  private validateUserInfo(info: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate user ID
    if (info.user_id && typeof info.user_id !== 'string') {
      errors.push({
        field: `${fieldPrefix}.user_id`,
        message: 'User ID must be a string',
        severity: 'error'
      })
    }

    // Validate username
    if (info.username && typeof info.username !== 'string') {
      errors.push({
        field: `${fieldPrefix}.username`,
        message: 'Username must be a string',
        severity: 'error'
      })
    }
  }

  private validateDocumentInfo(info: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate document ID
    if (info.document_id && typeof info.document_id !== 'string') {
      errors.push({
        field: `${fieldPrefix}.document_id`,
        message: 'Document ID must be a string',
        severity: 'error'
      })
    }

    // Validate document name
    if (info.document_name && typeof info.document_name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.document_name`,
        message: 'Document name must be a string',
        severity: 'error'
      })
    }
  }

  private validateTemplateInfo(info: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate template ID
    if (info.template_id && typeof info.template_id !== 'string') {
      errors.push({
        field: `${fieldPrefix}.template_id`,
        message: 'Template ID must be a string',
        severity: 'error'
      })
    }

    // Validate template name
    if (info.template_name && typeof info.template_name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.template_name`,
        message: 'Template name must be a string',
        severity: 'error'
      })
    }
  }

  private validateFrameworkInfo(info: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate framework name
    if (info.framework_name && typeof info.framework_name !== 'string') {
      errors.push({
        field: `${fieldPrefix}.framework_name`,
        message: 'Framework name must be a string',
        severity: 'error'
      })
    }

    // Validate framework version
    if (info.framework_version && typeof info.framework_version !== 'string') {
      errors.push({
        field: `${fieldPrefix}.framework_version`,
        message: 'Framework version must be a string',
        severity: 'error'
      })
    }
  }

  private validateSentiment(sentiment: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate overall sentiment
    if (sentiment.overall_sentiment && !['positive', 'negative', 'neutral'].includes(sentiment.overall_sentiment)) {
      errors.push({
        field: `${fieldPrefix}.overall_sentiment`,
        message: 'Overall sentiment must be one of: positive, negative, neutral',
        severity: 'error'
      })
    }

    // Validate sentiment score
    if (sentiment.sentiment_score !== undefined) {
      if (typeof sentiment.sentiment_score !== 'number' || sentiment.sentiment_score < -1 || sentiment.sentiment_score > 1) {
        errors.push({
          field: `${fieldPrefix}.sentiment_score`,
          message: 'Sentiment score must be a number between -1 and 1',
          severity: 'error'
        })
      }
    }

    // Validate confidence
    if (sentiment.confidence !== undefined) {
      if (typeof sentiment.confidence !== 'number' || sentiment.confidence < 0 || sentiment.confidence > 1) {
        errors.push({
          field: `${fieldPrefix}.confidence`,
          message: 'Confidence must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }
  }

  private validateTopicModeling(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate topics array
    if (data.topics && !Array.isArray(data.topics)) {
      errors.push({
        field: `${fieldPrefix}.topics`,
        message: 'Topics must be an array',
        severity: 'error'
      })
    }

    // Validate topic distribution
    if (data.topic_distribution && !Array.isArray(data.topic_distribution)) {
      errors.push({
        field: `${fieldPrefix}.topic_distribution`,
        message: 'Topic distribution must be an array',
        severity: 'error'
      })
    }

    // Validate topic coherence
    if (data.topic_coherence !== undefined) {
      if (typeof data.topic_coherence !== 'number' || data.topic_coherence < 0 || data.topic_coherence > 1) {
        errors.push({
          field: `${fieldPrefix}.topic_coherence`,
          message: 'Topic coherence must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }
  }

  private validateEntityExtraction(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate entities array
    if (data.entities && !Array.isArray(data.entities)) {
      errors.push({
        field: `${fieldPrefix}.entities`,
        message: 'Entities must be an array',
        severity: 'error'
      })
    }

    // Validate entity relationships
    if (data.entity_relationships && !Array.isArray(data.entity_relationships)) {
      errors.push({
        field: `${fieldPrefix}.entity_relationships`,
        message: 'Entity relationships must be an array',
        severity: 'error'
      })
    }

    // Validate entity coverage
    if (data.entity_coverage !== undefined) {
      if (typeof data.entity_coverage !== 'number' || data.entity_coverage < 0 || data.entity_coverage > 1) {
        errors.push({
          field: `${fieldPrefix}.entity_coverage`,
          message: 'Entity coverage must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }
  }

  private validateRelationshipMapping(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate relationships array
    if (data.relationships && !Array.isArray(data.relationships)) {
      errors.push({
        field: `${fieldPrefix}.relationships`,
        message: 'Relationships must be an array',
        severity: 'error'
      })
    }

    // Validate relationship strength
    if (data.relationship_strength !== undefined) {
      if (typeof data.relationship_strength !== 'number' || data.relationship_strength < 0 || data.relationship_strength > 1) {
        errors.push({
          field: `${fieldPrefix}.relationship_strength`,
          message: 'Relationship strength must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }
  }

  private validateConceptGraph(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate concepts array
    if (data.concepts && !Array.isArray(data.concepts)) {
      errors.push({
        field: `${fieldPrefix}.concepts`,
        message: 'Concepts must be an array',
        severity: 'error'
      })
    }

    // Validate concept relationships
    if (data.concept_relationships && !Array.isArray(data.concept_relationships)) {
      errors.push({
        field: `${fieldPrefix}.concept_relationships`,
        message: 'Concept relationships must be an array',
        severity: 'error'
      })
    }

    // Validate graph density
    if (data.graph_density !== undefined) {
      if (typeof data.graph_density !== 'number' || data.graph_density < 0 || data.graph_density > 1) {
        errors.push({
          field: `${fieldPrefix}.graph_density`,
          message: 'Graph density must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }
  }

  private validateKnowledgeGraph(data: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate nodes array
    if (data.nodes && !Array.isArray(data.nodes)) {
      errors.push({
        field: `${fieldPrefix}.nodes`,
        message: 'Nodes must be an array',
        severity: 'error'
      })
    }

    // Validate edges array
    if (data.edges && !Array.isArray(data.edges)) {
      errors.push({
        field: `${fieldPrefix}.edges`,
        message: 'Edges must be an array',
        severity: 'error'
      })
    }

    // Validate graph metrics
    if (data.graph_metrics) {
      this.validateGraphMetrics(data.graph_metrics, `${fieldPrefix}.graph_metrics`, errors, warnings)
    }
  }

  private validateGraphMetrics(metrics: any, fieldPrefix: string, errors: ValidationError[], warnings: ValidationWarning[]): void {
    // Validate node count
    if (metrics.node_count !== undefined) {
      if (typeof metrics.node_count !== 'number' || metrics.node_count < 0) {
        errors.push({
          field: `${fieldPrefix}.node_count`,
          message: 'Node count must be a non-negative number',
          severity: 'error'
        })
      }
    }

    // Validate edge count
    if (metrics.edge_count !== undefined) {
      if (typeof metrics.edge_count !== 'number' || metrics.edge_count < 0) {
        errors.push({
          field: `${fieldPrefix}.edge_count`,
          message: 'Edge count must be a non-negative number',
          severity: 'error'
        })
      }
    }

    // Validate density
    if (metrics.density !== undefined) {
      if (typeof metrics.density !== 'number' || metrics.density < 0 || metrics.density > 1) {
        errors.push({
          field: `${fieldPrefix}.density`,
          message: 'Density must be a number between 0 and 1',
          severity: 'error'
        })
      }
    }
  }

  private calculateQualityScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
    // Calculate quality score based on errors and warnings
    const errorCount = errors.length
    const warningCount = warnings.length
    
    // Base score starts at 1.0
    let qualityScore = 1.0
    
    // Deduct points for errors (more severe)
    qualityScore -= errorCount * 0.1
    
    // Deduct points for warnings (less severe)
    qualityScore -= warningCount * 0.05
    
    // Ensure score is between 0 and 1
    return Math.max(0, Math.min(1, qualityScore))
  }
}
