const { Pool } = require('pg');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

async function resetDatabase() {
  console.log('⚠️  WARNING: This will completely WIPE the database!');
  
  if (process.env.DB_HOST?.includes('supabase.co') || process.env.DATABASE_URL?.includes('supabase.co')) {
    console.log('🚨 PRODUCTION/REMOTE DATABASE DETECTED!');
    console.log('   Aborting reset to prevent accidental data loss.');
    console.log('   If you REALLY want to reset Supabase, run the SQL manually in the Dashboard.');
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'postgres'
  });

  const client = await pool.connect();
  
  try {
    console.log('🧨 Wiping public schema...');
    await client.query('DROP SCHEMA public CASCADE');
    await client.query('CREATE SCHEMA public');
    await client.query('GRANT ALL ON SCHEMA public TO postgres');
    await client.query('GRANT ALL ON SCHEMA public TO public');
    console.log('✅ Schema wiped clean.');

    console.log('\n🚀 Re-provisioning from baseline...');
    // We can call our new apply-baseline script
    execSync('node scripts/apply-baseline.js --init', { stdio: 'inherit' });

    console.log('\n🌱 Running seeds...');
    execSync('npm run seed', { stdio: 'inherit' });

    console.log('\n✨ Database reset and seeded successfully.');

  } catch (err) {
    console.error('❌ Reset failed:');
    console.error(err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDatabase();
