/**
 * Drift to Knowledge Base Integration
 * Automatically creates knowledge base entries from positive drift detections
 */

import { knowledgeBaseService } from './service'
import { logger } from '../../utils/logger'
import type {
  CreateKnowledgeBaseEntryRequest,
  EntryType,
  EntryCategory,
  BaselineApproach,
  ImprovedApproach,
  ValueMetrics,
  ReplicationGuide
} from './types'

interface DriftDetection {
  id: string
  project_id: string
  baseline_id?: string
  detection_type: string
  drift_description: string
  drift_impact?: string
  ai_confidence: number
  ai_processing_metadata?: any
}

interface InnovationOpportunity {
  id: string
  project_id: string
  baseline_id?: string
  opportunity_type: string
  title: string
  description: string
  potential_value?: string
  ai_confidence: number
  novelty_score: number
  ai_processing_metadata?: any
}

/**
 * Create a knowledge base entry from a positive drift detection
 */
export async function createKnowledgeBaseFromDrift(
  drift: DriftDetection,
  userId: string,
  additionalData?: {
    baseline_approach?: BaselineApproach
    improved_approach?: Partial<ImprovedApproach>
    value_metrics?: ValueMetrics
    similar_project_ids?: string[]
  }
): Promise<void> {
  try {
    // Map drift detection type to entry type and category
    const { entryType, category } = mapDriftToEntryType(drift.detection_type)
    
    // Extract or generate improved approach details
    const improvedApproach: ImprovedApproach = {
      description: drift.drift_description,
      implementation_details: additionalData?.improved_approach?.implementation_details || 
        'Implementation details to be documented during knowledge base review.',
      tools_used: additionalData?.improved_approach?.tools_used || [],
      techniques: additionalData?.improved_approach?.techniques || []
    }
    
    // Generate replication guide
    const replicationGuide: ReplicationGuide = {
      steps: [
        'Review the drift detection analysis',
        'Identify similar projects or contexts',
        'Adapt the approach to the target project',
        'Document lessons learned during implementation'
      ],
      prerequisites: ['Access to baseline documentation', 'Understanding of project context'],
      resources_needed: ['Project team', 'Technical resources'],
      estimated_effort: 'To be determined based on project complexity',
      risks: ['May require adaptation to different contexts', 'Original results may not be fully replicable']
    }
    
    // Create the knowledge base entry
    const entry: CreateKnowledgeBaseEntryRequest = {
      project_id: drift.project_id,
      baseline_id: drift.baseline_id,
      drift_detection_id: drift.id,
      entry_type: entryType,
      category: category,
      title: `${entryType.replace(/_/g, ' ').toUpperCase()}: ${drift.drift_description.substring(0, 100)}`,
      description: drift.drift_description,
      baseline_approach: additionalData?.baseline_approach,
      improved_approach: improvedApproach,
      value_metrics: additionalData?.value_metrics,
      replication_guide: replicationGuide,
      similar_project_ids: additionalData?.similar_project_ids || [],
      tags: [entryType, category, 'drift-detection'],
      keywords: extractKeywords(drift.drift_description),
      notes: 'Auto-generated from drift detection. Requires review and validation.'
    }
    
    const createdEntry = await knowledgeBaseService.createEntry(entry, userId)
    
    logger.info(`Knowledge base entry created from drift detection: ${createdEntry.id}`, {
      drift_id: drift.id,
      entry_id: createdEntry.id,
      entry_type: entryType
    })
  } catch (error) {
    logger.error('Error creating knowledge base entry from drift:', error)
    throw error
  }
}

/**
 * Create a knowledge base entry from an innovation opportunity
 */
export async function createKnowledgeBaseFromInnovation(
  innovation: InnovationOpportunity,
  userId: string,
  additionalData?: {
    baseline_approach?: BaselineApproach
    improved_approach?: Partial<ImprovedApproach>
    value_metrics?: ValueMetrics
    replication_guide?: Partial<ReplicationGuide>
    similar_project_ids?: string[]
  }
): Promise<void> {
  try {
    // Map innovation type to entry type and category
    const { entryType, category } = mapInnovationToEntryType(innovation.opportunity_type)
    
    // Extract or generate improved approach details
    const improvedApproach: ImprovedApproach = {
      description: innovation.description,
      implementation_details: additionalData?.improved_approach?.implementation_details || 
        innovation.description,
      tools_used: additionalData?.improved_approach?.tools_used || [],
      techniques: additionalData?.improved_approach?.techniques || []
    }
    
    // Generate or use provided replication guide
    const replicationGuide: ReplicationGuide = {
      steps: additionalData?.replication_guide?.steps || [
        'Analyze the innovation opportunity in detail',
        'Assess applicability to target context',
        'Plan implementation approach',
        'Execute and monitor results',
        'Document outcomes and lessons learned'
      ],
      prerequisites: additionalData?.replication_guide?.prerequisites || [
        'Understanding of the innovation',
        'Technical capabilities',
        'Resource availability'
      ],
      resources_needed: additionalData?.replication_guide?.resources_needed || [
        'Technical team',
        'Budget allocation',
        'Time commitment'
      ],
      estimated_effort: additionalData?.replication_guide?.estimated_effort || 
        'To be determined based on project scope',
      risks: additionalData?.replication_guide?.risks || [
        'Innovation may not be applicable in all contexts',
        'May require significant adaptation',
        'Unproven approach with inherent risks'
      ]
    }
    
    // Parse potential value if provided as string
    let valueMetrics: ValueMetrics | undefined = additionalData?.value_metrics
    if (!valueMetrics && innovation.potential_value) {
      // Try to extract numeric values from the potential_value string
      valueMetrics = parseValueFromString(innovation.potential_value)
    }
    
    // Create the knowledge base entry
    const entry: CreateKnowledgeBaseEntryRequest = {
      project_id: innovation.project_id,
      baseline_id: innovation.baseline_id,
      innovation_opportunity_id: innovation.id,
      entry_type: entryType,
      category: category,
      title: innovation.title,
      description: innovation.description,
      baseline_approach: additionalData?.baseline_approach,
      improved_approach: improvedApproach,
      value_metrics: valueMetrics,
      replication_guide: replicationGuide,
      similar_project_ids: additionalData?.similar_project_ids || [],
      tags: [entryType, category, 'innovation', innovation.opportunity_type],
      keywords: extractKeywords(innovation.description),
      notes: 'Auto-generated from innovation opportunity. Requires review and validation.'
    }
    
    const createdEntry = await knowledgeBaseService.createEntry(entry, userId)
    
    logger.info(`Knowledge base entry created from innovation opportunity: ${createdEntry.id}`, {
      innovation_id: innovation.id,
      entry_id: createdEntry.id,
      entry_type: entryType
    })
  } catch (error) {
    logger.error('Error creating knowledge base entry from innovation:', error)
    throw error
  }
}

/**
 * Map drift detection type to knowledge base entry type and category
 */
function mapDriftToEntryType(driftType: string): { entryType: EntryType; category: EntryCategory } {
  const mapping: Record<string, { entryType: EntryType; category: EntryCategory }> = {
    'scope_drift': { entryType: 'process_improvement', category: 'scope_management' },
    'technical_drift': { entryType: 'technology_innovation', category: 'technical_approach' },
    'timeline_drift': { entryType: 'timeline_acceleration', category: 'timeline_management' },
    'cost_drift': { entryType: 'cost_reduction', category: 'cost_management' },
    'resource_drift': { entryType: 'efficiency_improvement', category: 'resource_management' },
    'success_criteria_drift': { entryType: 'quality_improvement', category: 'quality_management' }
  }
  
  return mapping[driftType] || { entryType: 'lessons_learned', category: 'other' }
}

/**
 * Map innovation opportunity type to knowledge base entry type and category
 */
function mapInnovationToEntryType(innovationType: string): { entryType: EntryType; category: EntryCategory } {
  const mapping: Record<string, { entryType: EntryType; category: EntryCategory }> = {
    'patent_opportunity': { entryType: 'innovation', category: 'technical_approach' },
    'process_improvement': { entryType: 'process_improvement', category: 'other' },
    'technology_innovation': { entryType: 'technology_innovation', category: 'technical_approach' },
    'methodology_advancement': { entryType: 'methodology_advancement', category: 'other' },
    'efficiency_gain': { entryType: 'efficiency_improvement', category: 'resource_management' },
    'cost_reduction': { entryType: 'cost_reduction', category: 'cost_management' }
  }
  
  return mapping[innovationType] || { entryType: 'innovation', category: 'other' }
}

/**
 * Extract keywords from text for search
 */
function extractKeywords(text: string): string[] {
  // Simple keyword extraction - can be enhanced with NLP
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3)
  
  // Remove duplicates and common words
  const commonWords = ['this', 'that', 'with', 'from', 'have', 'been', 'were', 'will', 'would', 'could', 'should']
  const keywords = [...new Set(words)].filter(word => !commonWords.includes(word))
  
  return keywords.slice(0, 20) // Limit to top 20 keywords
}

/**
 * Parse value metrics from a string description
 */
function parseValueFromString(valueString: string): ValueMetrics | undefined {
  const metrics: ValueMetrics = {}
  
  // Try to extract cost savings (e.g., "$50K", "$50,000", "50000")
  const costMatch = valueString.match(/\$?([\d,]+)(?:K|k)?\s*(?:savings?|saved?|reduction?)/i)
  if (costMatch) {
    let amount = parseFloat(costMatch[1].replace(/,/g, ''))
    if (valueString.toLowerCase().includes('k')) {
      amount *= 1000
    }
    metrics.cost_savings = amount
  }
  
  // Try to extract time saved (e.g., "5 days", "2 weeks", "3 months")
  const timeMatch = valueString.match(/([\d.]+)\s*(day|week|month|hour)s?/i)
  if (timeMatch) {
    let time = parseFloat(timeMatch[1])
    const unit = timeMatch[2].toLowerCase()
    
    // Convert to hours
    if (unit === 'day') time *= 8
    else if (unit === 'week') time *= 40
    else if (unit === 'month') time *= 160
    
    metrics.time_saved = time
  }
  
  // Try to extract percentage improvements
  const percentMatch = valueString.match(/([\d.]+)%\s*(?:improvement|increase|gain)/i)
  if (percentMatch) {
    metrics.efficiency_gain = parseFloat(percentMatch[1])
  }
  
  return Object.keys(metrics).length > 0 ? metrics : undefined
}
