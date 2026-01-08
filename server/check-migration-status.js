require('dotenv').config();
const dbModule = require('./src/lib/db')
const db = dbModule.default || dbModule
const db = require('./src/lib/db');

// SSL configuration - use proper SSL settings for production
const getSSLConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    // In production, use proper SSL configuration
    // Only disable certificate validation if explicitly configured (not recommended)
    if (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'false') {
      console.warn('⚠️  WARNING: SSL certificate validation is disabled. This is not recommended for production.');
      return { rejectUnauthorized: false };
    }
    // Default: use SSL with proper certificate validation
    return { rejectUnauthorized: true };
  }
  return false;
};

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: getSSLConfig()
});

async function checkMigrationStatus() {
  try {
    console.log('Checking migration status...');
    
    // Check if documents table has the new columns
    const documentsResult = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND column_name IN ('inferred_primary_domain', 'inferred_secondary_domains', 'entity_counts')
      ORDER BY column_name
    `);
    
    console.log('Documents table columns:', documentsResult.rows);
    
    // Check if template_entity_profile table exists
    const templateTableResult = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'template_entity_profile'
    `);
    
    console.log('Template entity profile table exists:', templateTableResult.rows.length > 0);
    
    // Check if views exist
    const viewsResult = await db.query(`
      SELECT table_name 
      FROM information_schema.views 
      WHERE table_name IN ('document_entity_counts', 'aggregated_template_entity_view')
      ORDER BY table_name
    `);
    
    console.log('Views exist:', viewsResult.rows);
    
    await db.end();
    
    const hasDocumentColumns = documentsResult.rows.length === 3;
    const hasTemplateTable = templateTableResult.rows.length > 0;
    const hasViews = viewsResult.rows.length === 2;
    
    if (hasDocumentColumns && hasTemplateTable && hasViews) {
      console.log('✅ Migration appears to be applied successfully');
      return true;
    } else {
      console.log('❌ Migration not fully applied');
      return false;
    }
    
  } catch (error) {
    console.error('Error checking migration status:', error.message);
    await db.end();
    return false;
  }
}

status();
async function status() {
    try {
        await db.initDb()
        const res = await db.query('SELECT migration_number, migration_name, executed_at FROM schema_migrations ORDER BY migration_number DESC LIMIT 20');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await db.end();
    }
}

status();
});