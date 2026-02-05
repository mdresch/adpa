/**
 * Appwrite Persistence for Core Entities
 * 
 * Provides save functions for core entities to Appwrite database
 * Parallel to existing Supabase persistence
 */

import { logger } from '../../../utils/logger'
import type { PersistenceResult } from '../base/Persistence'

// Appwrite configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1'
const APPWRITE_PROJECT_ID = '66c35ae90013006e3f71'
const APPWRITE_API_KEY = 'standard_7e662eed5b5bb098603a9cd28a8b926dd1a577d4de28920fc53925bf83ccd681894c773cb9b5dc34edc8dae32946e697f6bd4e6e11a8225ea53803331c061bb9a1125978cbd9b7414efbc7dc8a3a927f08bad73451505f30f46f47e2325b1105dd956ebe77324a9843a97711d800e259911e5003506e4d3ef21dd3f0efdf5929'

/**
 * Make HTTP request to Appwrite API
 */
async function makeAppwriteRequest(path: string, method: string = 'GET', data: any = null): Promise<any> {
    const url = `${APPWRITE_ENDPOINT}${path}`
    
    const response = await fetch(url, {
        method,
        headers: {
            'X-Appwrite-Project': APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': APPWRITE_API_KEY,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: data ? JSON.stringify(data) : null
    })

    if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
    }

    return response.json()
}

/**
 * Map stakeholder entity to Appwrite document format
 */
function mapStakeholderToAppwrite(stakeholder: any, projectId: string, userId: string): any {
    return {
        name: stakeholder.name || 'Unnamed Stakeholder',
        role: stakeholder.role || 'Stakeholder',
        organization: stakeholder.organization || '',
        influence: stakeholder.influence_level || 'medium',
        interest: stakeholder.interest_level || 'medium',
        contact_info: stakeholder.email || '',
        expectations: stakeholder.expectations || '',
        project_id: projectId,
        // Location tracking
        source_document_id: stakeholder.source_document_id || null,
        source_text_start: stakeholder.source_text_start || null,
        source_text_end: stakeholder.source_text_end || null,
        source_line_start: stakeholder.source_line_start || null,
        source_line_end: stakeholder.source_line_end || null,
        source_context: stakeholder.source_context || '',
        source_snippet: stakeholder.source_snippet || '',
        entity_markdown_tag: stakeholder.entity_markdown_tag || 'h5',
        // Metadata
        confidence_score: stakeholder.confidence_score || 0.8,
        extracted_at: new Date().toISOString()
    }
}

/**
 * Save stakeholders to Appwrite
 */
export async function saveStakeholdersToAppwrite(
    projectId: string,
    userId: string,
    stakeholders: any[]
): Promise<PersistenceResult> {
    if (stakeholders.length === 0) {
        logger.info('[APPWRITE] No stakeholders to save, skipping')
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        logger.info(`[APPWRITE] Saving ${stakeholders.length} stakeholders to Appwrite`)

        let savedCount = 0
        let failedCount = 0

        for (const stakeholder of stakeholders) {
            try {
                const document = mapStakeholderToAppwrite(stakeholder, projectId, userId)
                
                await makeAppwriteRequest(
                    `/databases/main/collections/core_stakeholders/documents`,
                    'POST',
                    document
                )
                
                savedCount++
                logger.debug(`[APPWRITE] Saved stakeholder: ${stakeholder.name}`)
                
            } catch (error) {
                failedCount++
                logger.error(`[APPWRITE] Failed to save stakeholder: ${error.message}`)
            }
        }

        logger.info(`[APPWRITE] Stakeholders save complete: ${savedCount} saved, ${failedCount} failed`)
        
        return {
            saved: savedCount,
            skipped: 0,
            failed: failedCount
        }

    } catch (error) {
        logger.error('[APPWRITE] Error saving stakeholders:', error)
        return {
            saved: 0,
            skipped: 0,
            failed: stakeholders.length,
            error: error.message
        }
    }
}

/**
 * Map requirement entity to Appwrite document format
 */
function mapRequirementToAppwrite(requirement: any, projectId: string, userId: string): any {
    return {
        title: requirement.title || 'Untitled Requirement',
        description: requirement.description || '',
        type: requirement.type || 'functional',
        priority: requirement.priority || 'medium',
        status: requirement.status || 'pending',
        acceptance_criteria: requirement.acceptance_criteria || '',
        project_id: projectId,
        // Location tracking
        source_document_id: requirement.source_document_id || null,
        source_text_start: requirement.source_text_start || null,
        source_text_end: requirement.source_text_end || null,
        source_line_start: requirement.source_line_start || null,
        source_line_end: requirement.source_line_end || null,
        source_context: requirement.source_context || '',
        source_snippet: requirement.source_snippet || '',
        entity_markdown_tag: requirement.entity_markdown_tag || 'h5',
        // Metadata
        confidence_score: requirement.confidence_score || 0.8,
        extracted_at: new Date().toISOString()
    }
}

/**
 * Save requirements to Appwrite
 */
export async function saveRequirementsToAppwrite(
    projectId: string,
    userId: string,
    requirements: any[]
): Promise<PersistenceResult> {
    if (requirements.length === 0) {
        logger.info('[APPWRITE] No requirements to save, skipping')
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        logger.info(`[APPWRITE] Saving ${requirements.length} requirements to Appwrite`)

        let savedCount = 0
        let failedCount = 0

        for (const requirement of requirements) {
            try {
                const document = mapRequirementToAppwrite(requirement, projectId, userId)
                
                await makeAppwriteRequest(
                    `/databases/main/collections/core_requirements/documents`,
                    'POST',
                    document
                )
                
                savedCount++
                logger.debug(`[APPWRITE] Saved requirement: ${requirement.title}`)
                
            } catch (error) {
                failedCount++
                logger.error(`[APPWRITE] Failed to save requirement: ${error.message}`)
            }
        }

        logger.info(`[APPWRITE] Requirements save complete: ${savedCount} saved, ${failedCount} failed`)
        
        return {
            saved: savedCount,
            skipped: 0,
            failed: failedCount
        }

    } catch (error) {
        logger.error('[APPWRITE] Error saving requirements:', error)
        return {
            saved: 0,
            skipped: 0,
            failed: requirements.length,
            error: error.message
        }
    }
}

/**
 * Map risk entity to Appwrite document format
 */
function mapRiskToAppwrite(risk: any, projectId: string, userId: string): any {
    return {
        title: risk.title || 'Untitled Risk',
        description: risk.description || '',
        category: risk.category || '',
        probability: risk.probability || 'medium',
        impact: risk.impact || 'medium',
        mitigation_strategy: risk.mitigation_strategy || '',
        status: risk.status || 'open',
        project_id: projectId,
        // Location tracking
        source_document_id: risk.source_document_id || null,
        source_text_start: risk.source_text_start || null,
        source_text_end: risk.source_text_end || null,
        source_line_start: risk.source_line_start || null,
        source_line_end: risk.source_line_end || null,
        source_context: risk.source_context || '',
        source_snippet: risk.source_snippet || '',
        entity_markdown_tag: risk.entity_markdown_tag || 'h5',
        // Metadata
        confidence_score: risk.confidence_score || 0.8,
        extracted_at: new Date().toISOString()
    }
}

/**
 * Save risks to Appwrite
 */
export async function saveRisksToAppwrite(
    projectId: string,
    userId: string,
    risks: any[]
): Promise<PersistenceResult> {
    if (risks.length === 0) {
        logger.info('[APPWRITE] No risks to save, skipping')
        return { saved: 0, skipped: 0, failed: 0 }
    }

    try {
        logger.info(`[APPWRITE] Saving ${risks.length} risks to Appwrite`)

        let savedCount = 0
        let failedCount = 0

        for (const risk of risks) {
            try {
                const document = mapRiskToAppwrite(risk, projectId, userId)
                
                await makeAppwriteRequest(
                    `/databases/main/collections/core_risks/documents`,
                    'POST',
                    document
                )
                
                savedCount++
                logger.debug(`[APPWRITE] Saved risk: ${risk.title}`)
                
            } catch (error) {
                failedCount++
                logger.error(`[APPWRITE] Failed to save risk: ${error.message}`)
            }
        }

        logger.info(`[APPWRITE] Risks save complete: ${savedCount} saved, ${failedCount} failed`)
        
        return {
            saved: savedCount,
            skipped: 0,
            failed: failedCount
        }

    } catch (error) {
        logger.error('[APPWRITE] Error saving risks:', error)
        return {
            saved: 0,
            skipped: 0,
            failed: risks.length,
            error: error.message
        }
    }
}
