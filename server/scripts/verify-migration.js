const { Pool } = require('pg');
const path = require('path');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function verifyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Verifying migration...\n');
    
    // Check if program_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'projects' AND column_name = 'program_id'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('✅ Column "program_id" exists in projects table');
      console.log('   Type:', columnCheck.rows[0].data_type);
      console.log('   Nullable:', columnCheck.rows[0].is_nullable);
    } else {
      console.log('❌ Column "program_id" NOT found in projects table');
    }
    
    // Check if index exists
    const indexCheck = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'projects' AND indexname = 'idx_projects_program_id'
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('✅ Index "idx_projects_program_id" exists');
    } else {
      console.log('❌ Index "idx_projects_program_id" NOT found');
    }
    
    // Count projects by program assignment
    const statsQuery = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE program_id IS NOT NULL) as assigned_projects,
        COUNT(*) FILTER (WHERE program_id IS NULL) as unassigned_projects,
        COUNT(*) as total_projects
      FROM projects
    `);
    
    console.log('\n📊 Project Statistics:');
    console.log('   Total projects:', statsQuery.rows[0].total_projects);
    console.log('   Assigned to programs:', statsQuery.rows[0].assigned_projects);
    console.log('   Unassigned (standalone):', statsQuery.rows[0].unassigned_projects);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyMigration();

