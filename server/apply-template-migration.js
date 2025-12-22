const fs = require('fs');
const path = require('path');

// Simple database connection using environment variables
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function applyMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Applying Template Purpose Analytics Migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'src/database/migrations/add_template_purpose_analytics.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Check current state
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'documents'
        AND column_name IN ('inferred_primary_domain', 'inferred_secondary_domains', 'entity_counts')
      ORDER BY column_name;
    `);
    
    console.log('\n📊 Current documents columns (before migration):');
    if (columnCheck.rows.length === 0) {
      console.log('   No inferred_* or entity_counts columns found on documents (expected for first run).');
    } else {
      columnCheck.rows.forEach((row) => {
        console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
      });
    }
    
    // Apply migration
    console.log('\n📄 Executing migration SQL...');
    await client.query(migrationSql);
    console.log('✅ Migration SQL executed successfully');
    
    // Verify results
    const verifyDocs = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'documents'
        AND column_name IN ('inferred_primary_domain', 'inferred_secondary_domains', 'entity_counts')
      ORDER BY column_name;
    `);
    
    console.log('\n✅ Verification: documents.inferred_* and entity_counts');
    verifyDocs.rows.forEach((row) => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default || 'none'})`);
    });
    
    // Check template_entity_profile table
    const templateProfileCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'template_entity_profile'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n✅ Verification: template_entity_profile schema');
    if (templateProfileCheck.rows.length === 0) {
      console.log('   WARNING: template_entity_profile table not found.');
    } else {
      templateProfileCheck.rows.forEach((row) => {
        console.log(`   ${row.column_name}: ${row.data_type}`);
      });
    }
    
    // Check helper views
    const viewCheck = await client.query(`
      SELECT table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('document_entity_counts', 'aggregated_template_entity_view')
      ORDER BY table_name;
    `);
    
    console.log('\n✅ Verification: helper views');
    if (viewCheck.rows.length === 0) {
      console.log('   WARNING: helper views not found.');
    } else {
      viewCheck.rows.forEach((row) => {
        console.log(`   ${row.table_name}: ${row.table_type}`);
      });
    }
    
    console.log('\n✨ Migration completed successfully!');
    console.log('Next steps:');
    console.log('  - Run a project extraction to populate documents.entity_counts and inferred_*_domain.');
    console.log('  - Optionally call TemplateAnalyticsService.updateTemplateEntityProfile or the rebuild endpoint.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration()
  .then(() => {
    console.log('\n🎉 Migration process completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration process failed:', error);
    process.exit(1);
  });