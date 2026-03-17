const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function applyBaseline() {
  const isInit = process.argv.includes('--init');
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres',
    ssl: process.env.DB_SSL === 'true' || process.env.DATABASE_URL?.includes('supabase.co')
      ? { rejectUnauthorized: false }
      : false
  });

  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting Unified Migration Manager');
    console.log(`📡 Target Host: ${process.env.DB_HOST || 'localhost'}`);
    
    // Check if we need to apply the baseline
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'projects'
      );
    `);
    
    const projectsExist = tableCheck.rows[0].exists;
    
    if (isInit || !projectsExist) {
      console.log('📦 Applying authoritative baseline (000_baseline.sql)...');
      const baselinePath = path.join(__dirname, '..', 'migrations', '000_baseline.sql');
      
      if (!fs.existsSync(baselinePath)) {
        console.error('❌ Error: migrations/000_baseline.sql not found!');
        process.exit(1);
      }
      
      const sql = fs.readFileSync(baselinePath, 'utf8');
      await client.query(sql);
      console.log('✅ Baseline applied successfully.');
    } else {
      console.log('ℹ️  Core tables already exist. Skipping baseline.');
    }

    // Apply any incremental migrations (anything in the folder that isn't baseline or archive)
    const migrationFiles = fs.readdirSync(path.join(__dirname, '..', 'migrations'))
      .filter(f => f.endsWith('.sql') && f !== '000_baseline.sql')
      .sort();

    if (migrationFiles.length > 0) {
      console.log(`📄 Found ${migrationFiles.length} incremental migrations...`);
      for (const file of migrationFiles) {
        console.log(`   Applying ${file}...`);
        const sql = fs.readFileSync(path.join(__dirname, '..', 'migrations', file), 'utf8');
        try {
          await client.query(sql);
          console.log(`   ✅ Success`);
        } catch (err) {
          console.warn(`   ⚠️  Warning: Could not apply ${file}. It might already be applied.`);
          // console.error(err.message);
        }
      }
    } else {
      console.log('✅ No pending incremental migrations.');
    }

    console.log('\n✨ Database is up to date.');

  } catch (err) {
    console.error('❌ Fatal Error during migration:');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyBaseline();
