/**
 * Test Script: Full Extraction Verification
 * 
 * Tests the extraction and saving of all 39 entities to verify content quality and schema alignment.
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/verify-all-extractions.ts <projectId> [entityType]
 */

import dotenv from 'dotenv'
import { connectDatabase, pool } from '../src/database/connection'
import { extractSingleEntityType, saveSingleEntityType } from '../src/services/extraction/ExtractionOrchestrator'
import { initializeRegistry, extractionRegistry } from '../src/services/extraction/ExtractionRegistry'
import { logger } from '../src/utils/logger'

dotenv.config({ path: '.env' })

async function runVerification(projectId: string, targetEntity?: string) {
    try {
        console.log('\n🧪 Starting Full Extraction Verification\n')
        await connectDatabase()

        // Initialize Registry
        console.log('🔄 Initializing Extraction Registry...')
        await initializeRegistry()
        console.log('✅ Registry initialized\n')

        // Get test user
        const userResult = await pool!.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        if (userResult.rows.length === 0) {
            throw new Error('No admin user found for testing')
        }
        const userId = userResult.rows[0].id

        // Determine entities to test
        const allEntities = [
            // Phase 1
            'governance_decisions', 'approval_workflows', 'steering_committees', 'change_control_boards', 'policy_compliance',
            'scope_baseline', 'wbs_nodes', 'scope_change_requests', 'requirements_traceability', 'scope_verification',
            // Phase 2
            'schedule_baseline', 'schedule_activities', 'critical_path', 'schedule_variances', 'schedule_forecasts',
            'budget_baseline', 'cost_estimates', 'funding_tranches', 'financial_variances', 'procurement_costs',
            // Phase 3
            'resource_plans', 'roles_and_responsibilities', 'team_availability', 'labor_rates', 'project_org_chart',
            'risk_appetite', 'risk_checklists', 'probability_impact_matrix', 'issue_log', 'lessons_learned',
            // Phase 4
            'stakeholder_engagements', 'communication_logs', 'action_items', 'meeting_minutes',
            'project_charter_details', 'business_case_details', 'benefit_realization_plan',
            'general_change_requests', 'project_team_evaluations'
        ]

        const entitiesToTest = targetEntity ? [targetEntity] : allEntities

        console.log(`📋 Testing ${entitiesToTest.length} entities for project ${projectId}\n`)

        for (const entityType of entitiesToTest) {
            if (!extractionRegistry.hasEntity(entityType)) {
                console.warn(`⚠️  Skip: ${entityType} is not registered`)
                continue
            }

            console.log(`\n▶️  [${entityType}] Extracting...`)
            const startTime = Date.now()

            try {
                const entities = await extractSingleEntityType(
                    projectId,
                    userId,
                    entityType,
                    {
                        aiProvider: process.env.AI_PROVIDER || 'openai',
                        aiModel: process.env.AI_MODEL || 'gpt-4o'
                    }
                )
                const duration = Date.now() - startTime

                console.log(`✅ Extracted ${entities.length} entities in ${duration}ms`)

                if (entities.length > 0) {
                    console.log('💾 Saving to database...')
                    const saveResult = await saveSingleEntityType(
                        projectId,
                        userId,
                        entityType,
                        entities
                    )
                    console.log(`✅ Saved successfully (${saveResult.saved} new records)`)
                } else {
                    console.log('ℹ️  No entities found to save')
                }
            } catch (err: any) {
                console.error(`❌ Failed: ${err.message}`)
            }
        }

        console.log('\n✨ Verification run complete!')
        process.exit(0)
    } catch (error: any) {
        console.error('\n❌ Fatal Error:', error.message)
        process.exit(1)
    }
}

const projectId = process.argv[2]
const targetEntity = process.argv[3]

if (!projectId) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/verify-all-extractions.ts <projectId> [entityType]')
    process.exit(1)
}

runVerification(projectId, targetEntity)
