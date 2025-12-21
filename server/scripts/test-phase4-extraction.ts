/**
 * Test Script: Phase 4 Extraction Verification
 * 
 * Tests the extraction and saving of Phase 4 entities
 * 
 * Usage:
 *   npx ts-node -r tsconfig-paths/register scripts/test-phase4-extraction.ts <projectId>
 */

import dotenv from 'dotenv'
import { connectDatabase, pool } from '../src/database/connection'
import { projectDataExtractionService } from '../src/services/projectDataExtractionService'
import { logger } from '../src/utils/logger'

dotenv.config({ path: '.env' })

async function testPhase4(projectId: string) {
    try {
        console.log('\n🧪 Testing Phase 4 Extraction: Stakeholder Ops & Strategy\n')
        await connectDatabase()

        // Get test user
        const userResult = await pool!.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        const userId = userResult.rows[0].id

        // Test Entities
        const entitiesToTest = [
            'business_case_details',
            'benefit_realization_plan',
            'action_items'
        ]

        for (const entityType of entitiesToTest) {
            console.log(`\n▶️  Testing extraction for: ${entityType}...`)

            const startTime = Date.now()
            const results = await projectDataExtractionService.extractSingleEntityType(
                projectId,
                userId,
                entityType,
                {
                    aiProvider: process.env.AI_PROVIDER || 'groq',
                    aiModel: process.env.AI_MODEL
                }
            )
            const duration = Date.now() - startTime

            console.log(`✅ Extracted ${results.length} entities in ${duration}ms`)

            if (results.length > 0) {
                console.log('💾 Saving to database...')
                await projectDataExtractionService.saveSingleEntityType(
                    projectId,
                    userId,
                    entityType,
                    results
                )
                console.log('✅ Saved successfully')
            }
        }

        console.log('\n✨ Phase 4 verification complete!')
        process.exit(0)
    } catch (error: any) {
        console.error('\n❌ Test failed:', error.message)
        process.exit(1)
    }
}

const projectId = process.argv[2]
if (!projectId) {
    console.error('Usage: npx ts-node -r tsconfig-paths/register scripts/test-phase4-extraction.ts <projectId>')
    process.exit(1)
}

testPhase4(projectId)
