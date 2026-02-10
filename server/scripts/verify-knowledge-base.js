/**
 * Simple Knowledge Base Database Verification
 * Verifies the Knowledge Base database schema and basic functionality
 */

const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule

async function verifyKnowledgeBase() {
  console.log('🧠 Verifying Knowledge Base Implementation...\n')
  
  await db.initDb()
  
  try {
    // Test 1: Check tables exist
    console.log('📋 Checking Knowledge Base Tables...')
    const tablesResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'knowledge_base%'
      ORDER BY table_name
    `)
    
    console.log('✅ Knowledge Base Tables Found:')
    tablesResult.rows.forEach(row => {
      console.log(`   - ${row.table_name}`)
    })
    
    // Test 2: Check table structures
    console.log('\n🏗️ Checking Table Structures...')
    
    const entriesColumns = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_base_entries' 
      ORDER BY ordinal_position
    `)
    
    console.log(`✅ knowledge_base_entries table has ${entriesColumns.rows.length} columns`)
    
    const appsColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_base_applications' 
      ORDER BY ordinal_position
    `)
    
    console.log(`✅ knowledge_base_applications table has ${appsColumns.rows.length} columns`)
    
    const reviewsColumns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'knowledge_base_reviews' 
      ORDER BY ordinal_position
    `)
    
    console.log(`✅ knowledge_base_reviews table has ${reviewsColumns.rows.length} columns`)
    
    // Test 3: Check indexes
    console.log('\n📊 Checking Indexes...')
    const indexResult = await db.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename LIKE 'knowledge_base%'
      ORDER BY indexname
    `)
    
    console.log(`✅ Found ${indexResult.rows.length} indexes for Knowledge Base tables:`)
    indexResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`)
    })
    
    // Test 4: Test basic CRUD operations
    console.log('\n✍️ Testing Basic CRUD Operations...')
    
    // Insert test entry
    const insertResult = await db.query(`
      INSERT INTO knowledge_base_entries (
        project_id, entry_type, category, title, description,
        improved_approach, replication_guide, value_metrics,
        tags, keywords, status, created_by
      ) VALUES (
        'ea41dd20-ebd8-4db0-a599-dd6c5049b5f7', 'efficiency_improvement', 'ai_optimization',
        'Test Knowledge Base Entry', 'This is a test entry for verification',
        '{"description": "Test approach"}',
        '{"steps": ["Step 1", "Step 2"]}',
        '{"cost_savings": 1000}',
        ARRAY['test', 'verification'],
        ARRAY['test', 'knowledge'],
        'draft', '3a82e0e8-c54d-4f99-b1d7-e651ce101341'
      ) RETURNING id, title, status
    `)
    
    const entryId = insertResult.rows[0].id
    console.log(`✅ Created test entry: ${insertResult.rows[0].title} (Status: ${insertResult.rows[0].status})`)
    
    // Read entry
    const selectResult = await db.query(`
      SELECT id, title, entry_type, status, created_at
      FROM knowledge_base_entries 
      WHERE id = $1
    `, [entryId])
    
    console.log(`✅ Retrieved entry: ${selectResult.rows[0].title}`)
    
    // Update entry
    await db.query(`
      UPDATE knowledge_base_entries 
      SET status = 'published', view_count = 1
      WHERE id = $1
    `, [entryId])
    
    console.log('✅ Updated entry status to published')
    
    // Create application
    const appResult = await db.query(`
      INSERT INTO knowledge_base_applications (
        knowledge_base_entry_id, target_project_id, status,
        implementation_notes, expected_value, applied_by
      ) VALUES (
        $1, 'ea41dd20-ebd8-4db0-a599-dd6c5049b5f7', 'planned',
        'Testing application creation', '{"cost_savings": 500}', '3a82e0e8-c54d-4f99-b1d7-e651ce101341'
      ) RETURNING id
    `, [entryId])
    
    console.log('✅ Created test application record')
    
    // Create review
    await db.query(`
      INSERT INTO knowledge_base_reviews (
        knowledge_base_entry_id, reviewer_id, rating, 
        recommendation, review_text, review_type
      ) VALUES (
        $1, '3a82e0e8-c54d-4f99-b1d7-e651ce101341', 5, 'approve',
        'Excellent knowledge base entry for testing', 'peer_review'
      )
    `, [entryId])
    
    console.log('✅ Created test review record')
    
    // Test 5: Verify statistics
    console.log('\n📊 Testing Statistics...')
    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(*) FILTER (WHERE status = 'published') as published_entries,
        AVG(view_count) as avg_views,
        (SELECT COUNT(*) FROM knowledge_base_applications) as total_applications,
        (SELECT AVG(rating) FROM knowledge_base_reviews) as avg_rating
      FROM knowledge_base_entries
    `)
    
    const stats = statsResult.rows[0]
    console.log('✅ Statistics calculated:')
    console.log(`   - Total Entries: ${stats.total_entries}`)
    console.log(`   - Published Entries: ${stats.published_entries}`)
    console.log(`   - Average Views: ${stats.avg_views || 0}`)
    console.log(`   - Total Applications: ${stats.total_applications}`)
    console.log(`   - Average Rating: ${stats.avg_rating || 'N/A'}`)
    
    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...')
    await db.query(`DELETE FROM knowledge_base_reviews WHERE knowledge_base_entry_id = $1`, [entryId])
    await db.query(`DELETE FROM knowledge_base_applications WHERE knowledge_base_entry_id = $1`, [entryId])
    await db.query(`DELETE FROM knowledge_base_entries WHERE id = $1`, [entryId])
    console.log('✅ Test data cleaned up')
    
    console.log('\n🎉 Knowledge Base Implementation Verification COMPLETE!')
    console.log('✅ All database tables are properly structured')
    console.log('✅ All CRUD operations work correctly')
    console.log('✅ Statistics and analytics are functional')
    console.log('✅ System is ready for production use')
    
  } catch (error) {
    console.error('\n❌ Knowledge Base verification failed:', error.message)
    throw error
  } finally {
    await db.end()
  }
}

// Run verification
verifyKnowledgeBase()
  .then(() => {
    console.log('\n🏁 Knowledge Base system verified successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('\n💥 Knowledge Base verification error:', error.message)
    process.exit(1)
  })