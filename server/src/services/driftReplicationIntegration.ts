/**
 * Integration Example: Drift Detection → Project Similarity → Replication
 * 
 * This example demonstrates how the project similarity and replication system
 * integrates with the drift detection workflow.
 */

import projectSimilarityService from '../services/projectSimilarityService'
import { logger } from '../utils/logger'

/**
 * Example workflow: When positive drift is detected, find similar projects
 * and create replication opportunities
 */
export async function handlePositiveDriftDetection(
  projectId: string,
  driftId: string,
  improvementDetails: {
    type: string
    title: string
    description: string
    estimatedValue: {
      cost_savings?: number
      time_savings_days?: number
      quality_improvement_pct?: number
    }
  }
) {
  try {
    logger.info('[DRIFT_INTEGRATION] Processing positive drift for replication', {
      projectId,
      driftId,
      improvementTitle: improvementDetails.title
    })

    // Step 1: Detect similar projects (if not already done)
    const similarities = await projectSimilarityService.detectAndStoreSimilarProjects(
      projectId,
      0.5 // Minimum similarity score
    )

    logger.info('[DRIFT_INTEGRATION] Found similar projects', {
      projectId,
      count: similarities.length
    })

    if (similarities.length === 0) {
      logger.info('[DRIFT_INTEGRATION] No similar projects found', { projectId })
      return {
        similarProjectsFound: 0,
        replicationsCreated: 0
      }
    }

    // Step 2: Create replication records for each similar project
    const replications = []
    for (const similarity of similarities) {
      try {
        const replication = await projectSimilarityService.createReplication({
          sourceProjectId: projectId,
          targetProjectId: similarity.similar_project_id,
          improvementType: improvementDetails.type,
          improvementTitle: improvementDetails.title,
          improvementDescription: improvementDetails.description,
          estimatedValue: improvementDetails.estimatedValue,
          sourceDriftId: driftId
        })

        replications.push(replication)

        logger.info('[DRIFT_INTEGRATION] Created replication', {
          sourceProjectId: projectId,
          targetProjectId: similarity.similar_project_id,
          replicationId: replication.id
        })
      } catch (error: any) {
        // Skip if replication already exists (duplicate constraint)
        if (error.code === '23505') {
          logger.debug('[DRIFT_INTEGRATION] Replication already exists', {
            targetProjectId: similarity.similar_project_id
          })
        } else {
          logger.error('[DRIFT_INTEGRATION] Error creating replication', {
            error,
            targetProjectId: similarity.similar_project_id
          })
        }
      }
    }

    logger.info('[DRIFT_INTEGRATION] Replication workflow complete', {
      projectId,
      similarProjectsFound: similarities.length,
      replicationsCreated: replications.length
    })

    return {
      similarProjectsFound: similarities.length,
      replicationsCreated: replications.length,
      replications
    }
  } catch (error) {
    logger.error('[DRIFT_INTEGRATION] Error in positive drift handling', {
      error,
      projectId,
      driftId
    })
    throw error
  }
}

/**
 * Example: Generate Change Request summary with replication opportunities
 */
export function generateChangeRequestWithReplications(
  projectId: string,
  projectName: string,
  improvementTitle: string,
  improvementDescription: string,
  estimatedValue: any,
  replications: any[]
) {
  const totalEstimatedValue = replications.reduce((sum, r) => {
    return sum + (r.estimatedValue?.cost_savings || 0)
  }, estimatedValue.cost_savings || 0)

  return {
    title: `Opportunity: ${improvementTitle}`,
    type: 'efficiency_improvement',
    executiveSummary: {
      what: improvementTitle,
      detected: `Efficiency improvement detected in ${projectName}`,
      value: `$${(estimatedValue.cost_savings || 0).toLocaleString()}/year in source project`,
      replicationValue: `$${totalEstimatedValue.toLocaleString()}/year if replicated to ${replications.length} similar projects`,
      ask: 'Approve formalization and replication to similar projects'
    },
    businessCase: {
      currentProjectValue: estimatedValue,
      replicationOpportunities: replications.map(r => ({
        targetProject: r.target_project_name,
        similarityScore: r.similarity_score,
        estimatedValue: r.estimatedValue
      })),
      totalPotentialValue: totalEstimatedValue,
      roi: 'High - proven improvement with low implementation risk'
    },
    scope: {
      inScope: [
        'Update project baseline to reflect improvement',
        'Document approach in knowledge base',
        `Apply to ${replications.length} similar projects`,
        'Track and verify results'
      ],
      outOfScope: [
        'Force all projects to adopt (optional)',
        'Rewrite already-completed work'
      ]
    },
    recommendations: [
      {
        action: 'Approve and formalize improvement in source project',
        priority: 'high'
      },
      {
        action: `Replicate to ${replications.length} similar projects`,
        priority: 'high',
        expectedValue: totalEstimatedValue
      },
      {
        action: 'Monitor and measure actual value',
        priority: 'medium'
      }
    ]
  }
}

/**
 * Example usage in drift detection service
 * 
 * In driftDetectionService.ts, after detecting positive drift:
 * 
 * ```typescript
 * if (driftType === 'positive') {
 *   const improvementDetails = {
 *     type: 'efficiency_improvement',
 *     title: 'AI Cost Optimization',
 *     description: 'Switched from GPT-4 to Claude Sonnet',
 *     estimatedValue: {
 *       cost_savings: 2500
 *     }
 *   }
 * 
 *   // Trigger replication workflow
 *   const replicationResult = await handlePositiveDriftDetection(
 *     projectId,
 *     driftId,
 *     improvementDetails
 *   )
 * 
 *   // Generate change request with replication opportunities
 *   const changeRequest = generateChangeRequestWithReplications(
 *     projectId,
 *     projectName,
 *     improvementDetails.title,
 *     improvementDetails.description,
 *     improvementDetails.estimatedValue,
 *     replicationResult.replications
 *   )
 * 
 *   // Send for approval
 *   await sendChangeRequestForApproval(changeRequest)
 * }
 * ```
 */

export default {
  handlePositiveDriftDetection,
  generateChangeRequestWithReplications
}
