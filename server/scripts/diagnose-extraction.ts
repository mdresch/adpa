/**
 * Diagnostic script to check why extraction returns 0 entities
 * Run: tsx scripts/diagnose-extraction.ts <projectId>
 */

import dotenv from 'dotenv'
import { connectDatabase, pool } from '../src/database/connection'
import { logger } from '../src/utils/logger'

dotenv.config({ path: '.env' })

async function diagnoseExtraction(projectId: string) {
  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database pool not initialized')
    }
    
    console.log(`\n🔍 Diagnosing extraction for project: ${projectId}\n`)
    
    // 1. Check if project exists
    const projectResult = await pool.query('SELECT id, name FROM projects WHERE id = $1', [projectId])
    if (projectResult.rows.length === 0) {
      console.error('❌ Project not found')
      process.exit(1)
    }
    console.log(`✅ Project found: ${projectResult.rows[0].name}`)
    
    // 2. Check documents
    const documentsResult = await pool.query(`
      SELECT 
        d.id,
        d.title,
        LENGTH(d.content::text) as content_length,
        d.deleted_at,
        d.parent_document_id,
        t.name as template_name
      FROM documents d
      LEFT JOIN templates t ON d.template_id = t.id
      WHERE d.project_id = $1
      ORDER BY d.created_at ASC
    `, [projectId])
    
    console.log(`\n📄 Documents found: ${documentsResult.rows.length}`)
    
    if (documentsResult.rows.length === 0) {
      console.error('❌ No documents found for this project')
      process.exit(1)
    }
    
    // 3. Check valid documents (for extraction)
    const validDocsResult = await pool.query(`
      SELECT 
        d.id,
        d.title,
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
    `, [projectId])
    
    console.log(`\n✅ Valid documents (for extraction): ${validDocsResult.rows.length}`)
    
    if (validDocsResult.rows.length === 0) {
      console.error('❌ No valid documents found (all are deleted, empty, or have parent documents)')
      console.log('\n📋 All documents:')
      documentsResult.rows.forEach((doc, i) => {
        console.log(`  ${i + 1}. ${doc.title}`)
        console.log(`     Content length: ${doc.content_length || 0} chars`)
        console.log(`     Deleted: ${doc.deleted_at ? 'Yes' : 'No'}`)
        console.log(`     Has parent: ${doc.parent_document_id ? 'Yes' : 'No'}`)
        console.log(`     Template: ${doc.template_name || 'None'}`)
      })
      process.exit(1)
    }
    
    // 4. Show document details
    console.log('\n📋 Valid documents:')
    let totalContent = 0
    validDocsResult.rows.forEach((doc, i) => {
      const contentLen = parseInt(doc.content_length) || 0
      totalContent += contentLen
      console.log(`  ${i + 1}. ${doc.title}`)
      console.log(`     Content: ${contentLen.toLocaleString()} characters`)
      console.log(`     Template: ${doc.template_name || 'None'}`)
    })
    
    console.log(`\n📊 Total content: ${totalContent.toLocaleString()} characters`)
    
    // 5. Check AI providers
    const providersResult = await pool.query(`
      SELECT 
        name,
        provider_type,
        is_active,
        configuration->>'apiKey' as has_api_key
      FROM ai_providers
      WHERE is_active = true
      ORDER BY provider_type
    `)
    
    console.log(`\n🤖 Active AI Providers: ${providersResult.rows.length}`)
    providersResult.rows.forEach((provider, i) => {
      console.log(`  ${i + 1}. ${provider.name} (${provider.provider_type})`)
      console.log(`     API Key: ${provider.has_api_key ? '✅ Configured' : '❌ Missing'}`)
    })
    
    if (providersResult.rows.length === 0) {
      console.error('❌ No active AI providers configured')
    }
    
    // 6. Check existing extracted entities
    const entityCounts = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM stakeholders WHERE project_id = $1', [projectId]),
      pool.query('SELECT COUNT(*) as count FROM requirements WHERE project_id = $1', [projectId]),
      pool.query('SELECT COUNT(*) as count FROM risks WHERE project_id = $1', [projectId]),
      pool.query('SELECT COUNT(*) as count FROM milestones WHERE project_id = $1', [projectId]),
    ])
    
    console.log(`\n📊 Existing extracted entities:`)
    console.log(`  Stakeholders: ${entityCounts[0].rows[0].count}`)
    console.log(`  Requirements: ${entityCounts[1].rows[0].count}`)
    console.log(`  Risks: ${entityCounts[2].rows[0].count}`)
    console.log(`  Milestones: ${entityCounts[3].rows[0].count}`)
    
    console.log('\n✅ Diagnosis complete!\n')
    
    if (validDocsResult.rows.length > 0 && providersResult.rows.length > 0) {
      console.log('💡 Ready for extraction. Run extraction job to proceed.')
    } else {
      console.log('⚠️  Issues found - see above for details')
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
    process.exit(1)
  } finally {
    if (pool) {
      await pool.end()
    }
  }
}

const projectId = process.argv[2]

if (!projectId) {
  console.error('Usage: tsx scripts/diagnose-extraction.ts <projectId>')
  process.exit(1)
}

diagnoseExtraction(projectId)

