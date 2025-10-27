import { pool, connectDatabase } from '../src/database/connection'

async function testFunction() {
  console.log('Testing get_document_versions function...\n')
  await connectDatabase()
  
  const testDocId = 'a9f0db7c-e956-48dc-aab1-c71535e17a1b'
  
  try {
    console.log(`Calling get_document_versions('${testDocId}')...`)
    const result = await pool.query(`
      SELECT * FROM get_document_versions($1::UUID)
    `, [testDocId])
    
    console.log(`✅ SUCCESS: Retrieved ${result.rows.length} versions\n`)
    result.rows.forEach((row, i) => {
      console.log(`${i + 1}. ${row.semantic_version}: ${row.name}`)
    })
  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    console.error('Details:', error.detail || error.hint || 'No additional details')
    console.error('Code:', error.code)
  } finally {
    await pool.end()
  }
}

testFunction()

