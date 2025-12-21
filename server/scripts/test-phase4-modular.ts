/**
 * Test Script: Phase 4 Extraction Verification (Modular)
 * 
 * Tests the extraction and saving of Phase 4 entities using the new ExtractionOrchestrator
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/test-phase4-modular.ts <projectId>
 */

import dotenv from 'dotenv'
import { connectDatabase, pool } from '../src/database/connection'
import { extractSingleEntityType, saveSingleEntityType } from '../src/services/extraction/ExtractionOrchestrator'
import { initializeRegistry } from '../src/services/extraction/ExtractionRegistry'
import { logger } from '../src/utils/logger'

dotenv.config({ path: '.env' })

async function testPhase4Modular(projectId: string) {
    try {
        console.log('\n🧪 Testing Phase 4 Extraction: Stakeholder Ops & Strategy (Modular System)\n')
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

        // Test Entities (Phase 4)
        const entitiesToTest = [
            'business_case_details',
            'benefit_realization_plan',
            'action_items'
        ]

        for (const entityType of entitiesToTest) {
            console.log(`\n▶️  Testing extraction for: ${entityType}...`)

            const startTime = Date.now()
            const entities = await extractSingleEntityType(
                projectId,
                userId,
                entityType,
                {
                    aiProvider: process.env.AI_PROVIDER || 'groq',
                    aiModel: process.env.AI_MODEL
                }
            )
            const duration = Date.now() - startTime

            console.log(`✅ Extracted ${entities.length} entities in ${duration}ms`)

            if (entities.length > 0) {
                console.log('💾 Saving to database...')
                await saveSingleEntityType(
                    projectId,
                    userId,
                    entityType,
                    entities
                )
                console.log('✅ Saved successfully')
            }
        }

        console.log('\n✨ Phase 4 verification complete!')
        process.exit(0)
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message)
        console.error(error.stack)
        process.exit(1)
    }
}

const projectId = process.argv[2]
if (!projectId) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/test-phase4-modular.ts <projectId>')
    process.exit(1)
}

testPhase4Modular(projectId)
