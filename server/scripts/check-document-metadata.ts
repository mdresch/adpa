/**
 * Diagnostic script to check document generation_metadata
 * Usage: ts-node -r tsconfig-paths/register scripts/check-document-metadata.ts <documentId>
 */

import { pool } from '../src/database/connection'

async function checkDocumentMetadata(documentId: string) {
  try {
    const result = await pool.query(
      `SELECT 
        id, 
        name, 
        project_id,
        generation_metadata,
        pg_typeof(generation_metadata) as metadata_type
      FROM documents 
      WHERE id = $1`,
      [documentId]
    )

    if (result.rows.length === 0) {
      console.error(`❌ Document ${documentId} not found`)
      return
    }

    const doc = result.rows[0]
    console.log('\n📄 Document Info:')
    console.log(`  ID: ${doc.id}`)
    console.log(`  Name: ${doc.name}`)
    console.log(`  Project ID: ${doc.project_id}`)
    console.log(`  Metadata Type: ${doc.metadata_type}`)
    console.log(`  Has generation_metadata: ${!!doc.generation_metadata}`)

    if (doc.generation_metadata) {
      let metadata = doc.generation_metadata
      
      // Parse if it's a string
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata)
          console.log('  ✅ Parsed JSON string')
        } catch (e) {
          console.error('  ❌ Failed to parse JSON:', e)
          return
        }
      }

      console.log('\n📊 Generation Metadata Structure:')
      console.log(`  Keys: ${Object.keys(metadata).join(', ')}`)
      console.log(`  Has source_documents: ${!!metadata.source_documents}`)
      console.log(`  source_documents type: ${typeof metadata.source_documents}`)
      console.log(`  source_documents is array: ${Array.isArray(metadata.source_documents)}`)

      if (Array.isArray(metadata.source_documents)) {
        console.log(`  source_documents count: ${metadata.source_documents.length}`)
        
        if (metadata.source_documents.length > 0) {
          console.log('\n📚 Source Documents:')
          metadata.source_documents.forEach((doc: any, idx: number) => {
            console.log(`  [${idx + 1}] ${doc.id || 'NO ID'}`)
            console.log(`      Title: ${doc.title || doc.name || 'N/A'}`)
            console.log(`      Type: ${doc.type || 'N/A'}`)
            console.log(`      Is Project Context: ${doc.is_project_context || false}`)
            console.log(`      ID starts with project_context: ${doc.id?.startsWith('project_context:') || false}`)
          })
        } else {
          console.log('  ⚠️  source_documents array is EMPTY')
        }
      } else if (metadata.source_documents) {
        console.log('  ⚠️  source_documents exists but is NOT an array:', typeof metadata.source_documents)
      } else {
        console.log('  ❌ source_documents is MISSING')
      }

      if (metadata.context_stats) {
        console.log('\n📈 Context Stats:')
        console.log(`  Project context used: ${metadata.context_stats.project_context_used || false}`)
        console.log(`  Documents used: ${metadata.context_stats.documents_used || 0}`)
        console.log(`  Total documents: ${metadata.context_stats.total_documents || 0}`)
      } else {
        console.log('\n⚠️  context_stats is MISSING')
      }

      // Full metadata dump
      console.log('\n🔍 Full Metadata (first 2000 chars):')
      console.log(JSON.stringify(metadata, null, 2).substring(0, 2000))
    } else {
      console.log('  ❌ generation_metadata is NULL or MISSING')
    }

  } catch (error) {
    console.error('Error checking document:', error)
  } finally {
    await pool.end()
  }
}

// Get document ID from command line
const documentId = process.argv[2]

if (!documentId) {
  console.error('Usage: ts-node scripts/check-document-metadata.ts <documentId>')
  console.error('Example: ts-node scripts/check-document-metadata.ts d1834d40-2bc9-489f-a951-55e34d7bf114')
  process.exit(1)
}

checkDocumentMetadata(documentId).catch(console.error)
