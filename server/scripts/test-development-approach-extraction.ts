/**
 * Test Script: Development Approach Extraction (TASK-90)
 * 
 * Tests the extraction and saving of development_approach metadata
 * 
 * Usage:
 *   tsx scripts/test-development-approach-extraction.ts <projectId>
 *   tsx scripts/test-development-approach-extraction.ts <projectId> <userId>
 */

import dotenv from 'dotenv'
import { connectDatabase, pool } from '../src/database/connection'
import { projectDataExtractionService } from '../src/services/projectDataExtractionService'
import { logger } from '../src/utils/logger'

dotenv.config({ path: '.env' })

async function testDevelopmentApproachExtraction(projectId: string, userId?: string) {
  try {
    console.log('\n🧪 Testing Development Approach Extraction (TASK-90)\n')
    console.log('=' .repeat(70))
    
    // Connect to database
    console.log('\n1️⃣  Connecting to database...')
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database pool not initialized')
    }
    console.log('✅ Database connected\n')
    
    // Check if project exists
    console.log('2️⃣  Verifying project...')
    const projectResult = await pool.query(
      'SELECT id, name FROM projects WHERE id = $1',
      [projectId]
    )
    
    if (projectResult.rows.length === 0) {
      console.error('❌ Project not found:', projectId)
      process.exit(1)
    }
    
    const projectName = projectResult.rows[0].name
    console.log(`✅ Project found: ${projectName} (${projectId})\n`)
    
    // Get or create test user
    let testUserId = userId
    if (!testUserId) {
      console.log('3️⃣  Getting or creating test user...')
      const userResult = await pool.query(
        `SELECT id FROM users WHERE role = 'admin' LIMIT 1`
      )
      
      if (userResult.rows.length > 0) {
        testUserId = userResult.rows[0].id
        console.log(`✅ Using existing admin user: ${testUserId}\n`)
      } else {
        // Create a test user
        const newUserResult = await pool.query(
          `INSERT INTO users (id, email, password_hash, name, role)
           VALUES (gen_random_uuid(), $1, $2, $3, $4)
           RETURNING id`,
          ['test-dev-approach@example.com', 'hash', 'Test User', 'admin']
        )
        testUserId = newUserResult.rows[0].id
        console.log(`✅ Created test user: ${testUserId}\n`)
      }
    }
    
    // Get project documents
    console.log('4️⃣  Fetching project documents...')
    const documentsResult = await pool.query(
      `SELECT 
        d.id,
        d.title,
        d.name,
        d.content,
        LENGTH(d.content::text) as content_length,
        t.name as template_name
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1
        AND d.deleted_at IS NULL
        AND d.content IS NOT NULL
        AND d.content != ''
        AND d.parent_document_id IS NULL
      ORDER BY d.created_at ASC
      LIMIT 10`,
      [projectId]
    )
    
    if (documentsResult.rows.length === 0) {
      console.error('❌ No valid documents found for extraction')
      console.log('\n💡 Documents must:')
      console.log('   - Not be deleted')
      console.log('   - Have non-empty content')
      console.log('   - Not be child documents (parent_document_id IS NULL)')
      process.exit(1)
    }
    
    console.log(`✅ Found ${documentsResult.rows.length} valid document(s):`)
    documentsResult.rows.forEach((doc, i) => {
      const contentLen = parseInt(doc.content_length) || 0
      console.log(`   ${i + 1}. ${doc.title || doc.name} (${contentLen.toLocaleString()} chars)`)
    })
    console.log()
    
    // Prepare documents for extraction
    const documents = documentsResult.rows.map(doc => ({
      id: doc.id,
      title: doc.title || doc.name || 'Untitled',
      content: doc.content,
      template_name: doc.template_name
    }))
    
    // Check existing development_approach record
    console.log('5️⃣  Checking existing development_approach record...')
    const existingResult = await pool.query(
      `SELECT 
        approach, 
        methodology, 
        justification,
        uncertainty_level,
        requirements_stability,
        delivery_cadence,
        created_at,
        updated_at
      FROM development_approach
      WHERE project_id = $1`,
      [projectId]
    )
    
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0]
      console.log('⚠️  Existing record found:')
      console.log(`   Approach: ${existing.approach}`)
      console.log(`   Methodology: ${existing.methodology || 'N/A'}`)
      console.log(`   Created: ${existing.created_at}`)
      console.log(`   Updated: ${existing.updated_at}`)
      console.log('\n💡 This will be updated (UPSERT) by the extraction\n')
    } else {
      console.log('✅ No existing record - will create new one\n')
    }
    
    // Perform extraction
    console.log('6️⃣  Extracting development approach...')
    console.log('   This may take 10-30 seconds depending on AI provider...\n')
    
    const startTime = Date.now()
    
    const extractedApproaches = await projectDataExtractionService.extractSingleEntityType(
      projectId,
      testUserId,
      'development_approaches',
      {
        aiProvider: process.env.AI_PROVIDER || 'openai',
        aiModel: process.env.AI_MODEL,
        documentIds: documents.map(d => d.id)
      }
    )
    
    const extractionTime = Date.now() - startTime
    
    console.log(`✅ Extraction completed in ${extractionTime}ms\n`)
    
    if (extractedApproaches.length === 0) {
      console.log('⚠️  No development approach extracted')
      console.log('   This could mean:')
      console.log('   - No methodology information found in documents')
      console.log('   - AI provider returned empty response')
      console.log('   - Extraction failed (check logs)')
      console.log('\n💡 Check the AI service logs for more details\n')
    } else {
      console.log(`✅ Extracted ${extractedApproaches.length} development approach(es)\n`)
      
      // Display extracted data
      console.log('7️⃣  Extracted Data:\n')
      console.log('=' .repeat(70))
      
      extractedApproaches.forEach((approach, index) => {
        console.log(`\n📋 Development Approach ${index + 1}:`)
        console.log(`   Approach: ${approach.approach}`)
        console.log(`   Methodology: ${approach.methodology || approach.framework || 'N/A'}`)
        console.log(`   Justification: ${(approach.justification || approach.tailoring_decisions_text || 'N/A').substring(0, 200)}...`)
        console.log(`   Uncertainty Level: ${approach.uncertainty_level || 'N/A'}`)
        console.log(`   Requirements Stability: ${approach.requirements_stability || 'N/A'}`)
        console.log(`   Delivery Cadence: ${approach.delivery_cadence || 'N/A'}`)
        console.log(`   Team Experience: ${approach.team_experience_level || 'N/A'}`)
        console.log(`   Organizational Maturity: ${approach.organizational_maturity || 'N/A'}`)
        console.log(`   Regulatory Constraints: ${approach.regulatory_constraints ? 'Yes' : 'No'}`)
        console.log(`   Life Cycle Phases: ${Array.isArray(approach.life_cycle_phases) ? approach.life_cycle_phases.length : 0} phase(s)`)
        if (approach.iteration_length) {
          console.log(`   Iteration Length: ${approach.iteration_length} ${approach.iteration_unit || 'days'}`)
        }
        console.log(`   Governance Approach: ${approach.governance_approach || 'N/A'}`)
        if (Array.isArray(approach.tailoring_decisions) && approach.tailoring_decisions.length > 0) {
          console.log(`   Tailoring Decisions: ${approach.tailoring_decisions.length} decision(s)`)
        }
      })
      
      console.log('\n' + '=' .repeat(70))
      
      // Save to database
      console.log('\n8️⃣  Saving to database...')
      const saveStartTime = Date.now()
      
      await projectDataExtractionService.saveSingleEntityType(
        projectId,
        testUserId,
        'development_approaches',
        extractedApproaches
      )
      
      const saveTime = Date.now() - saveStartTime
      console.log(`✅ Saved to database in ${saveTime}ms\n`)
      
      // Verify saved data
      console.log('9️⃣  Verifying saved data...')
      const savedResult = await pool.query(
        `SELECT 
          id,
          approach,
          methodology,
          LEFT(justification, 200) as justification_preview,
          uncertainty_level,
          requirements_stability,
          delivery_cadence,
          organizational_maturity,
          team_experience_level,
          regulatory_constraints,
          life_cycle_phases,
          iteration_length,
          iteration_unit,
          governance_approach,
          review_gates,
          tailoring_decisions,
          created_at,
          updated_at
        FROM development_approach
        WHERE project_id = $1`,
        [projectId]
      )
      
      if (savedResult.rows.length === 0) {
        console.error('❌ No record found in database after save!')
        console.log('   Check logs for save errors')
      } else {
        const saved = savedResult.rows[0]
        console.log('✅ Record verified in database:\n')
        console.log('=' .repeat(70))
        console.log(`   ID: ${saved.id}`)
        console.log(`   Approach: ${saved.approach}`)
        console.log(`   Methodology: ${saved.methodology || 'N/A'}`)
        console.log(`   Justification: ${saved.justification_preview}...`)
        console.log(`   Uncertainty Level: ${saved.uncertainty_level || 'N/A'}`)
        console.log(`   Requirements Stability: ${saved.requirements_stability || 'N/A'}`)
        console.log(`   Delivery Cadence: ${saved.delivery_cadence || 'N/A'}`)
        console.log(`   Team Experience: ${saved.team_experience_level || 'N/A'}`)
        console.log(`   Organizational Maturity: ${saved.organizational_maturity || 'N/A'}`)
        console.log(`   Regulatory Constraints: ${saved.regulatory_constraints ? 'Yes' : 'No'}`)
        
        if (saved.life_cycle_phases) {
          const phases = Array.isArray(saved.life_cycle_phases) 
            ? saved.life_cycle_phases 
            : JSON.parse(saved.life_cycle_phases || '[]')
          console.log(`   Life Cycle Phases: ${phases.length} phase(s)`)
          if (phases.length > 0) {
            phases.slice(0, 5).forEach((phase: string, i: number) => {
              console.log(`      ${i + 1}. ${phase}`)
            })
            if (phases.length > 5) {
              console.log(`      ... and ${phases.length - 5} more`)
            }
          }
        }
        
        if (saved.iteration_length) {
          console.log(`   Iteration Length: ${saved.iteration_length} ${saved.iteration_unit || 'days'}`)
        }
        
        console.log(`   Governance Approach: ${saved.governance_approach || 'N/A'}`)
        
        if (saved.review_gates) {
          const gates = Array.isArray(saved.review_gates)
            ? saved.review_gates
            : JSON.parse(saved.review_gates || '[]')
          if (gates.length > 0) {
            console.log(`   Review Gates: ${gates.length} gate(s)`)
            gates.slice(0, 3).forEach((gate: string, i: number) => {
              console.log(`      ${i + 1}. ${gate}`)
            })
            if (gates.length > 3) {
              console.log(`      ... and ${gates.length - 3} more`)
            }
          }
        }
        
        if (saved.tailoring_decisions) {
          const decisions = Array.isArray(saved.tailoring_decisions)
            ? saved.tailoring_decisions
            : JSON.parse(saved.tailoring_decisions || '[]')
          if (decisions.length > 0) {
            console.log(`   Tailoring Decisions: ${decisions.length} decision(s)`)
            decisions.slice(0, 2).forEach((decision: any, i: number) => {
              console.log(`      ${i + 1}. ${decision.area || 'N/A'}: ${decision.justification?.substring(0, 100) || 'N/A'}...`)
            })
            if (decisions.length > 2) {
              console.log(`      ... and ${decisions.length - 2} more`)
            }
          }
        }
        
        console.log(`   Created: ${saved.created_at}`)
        console.log(`   Updated: ${saved.updated_at}`)
        console.log('=' .repeat(70))
      }
    }
    
    // Summary
    console.log('\n📊 Test Summary:')
    console.log('=' .repeat(70))
    console.log(`   Project: ${projectName}`)
    console.log(`   Documents Analyzed: ${documents.length}`)
    console.log(`   Approaches Extracted: ${extractedApproaches.length}`)
    console.log(`   Extraction Time: ${extractionTime}ms`)
    console.log(`   Database Record: ${existingResult.rows.length > 0 ? 'Updated (UPSERT)' : 'Created'}`)
    console.log('=' .repeat(70))
    
    console.log('\n✅ Test completed successfully!\n')
    
    // Don't close pool - let it stay open
    process.exit(0)
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
    console.error('\nStack trace:', error.stack)
    logger.error('Development approach extraction test failed:', error)
    process.exit(1)
  }
}

// Get command line arguments
const projectId = process.argv[2]
const userId = process.argv[3]

if (!projectId) {
  console.error('\n❌ Usage: tsx scripts/test-development-approach-extraction.ts <projectId> [userId]')
  console.error('\nExample:')
  console.error('   tsx scripts/test-development-approach-extraction.ts b9a459aa-fe43-4107-a905-204ef435c645')
  console.error('   tsx scripts/test-development-approach-extraction.ts b9a459aa-fe43-4107-a905-204ef435c645 <userId>\n')
  process.exit(1)
}

testDevelopmentApproachExtraction(projectId, userId)

