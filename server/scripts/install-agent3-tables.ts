/**
 * Install Agent 3 Tables
 * Directly creates notification_logs and sla_violations tables
 */

const db = require('../src/lib/db');
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function installAgent3Tables() {
  console.log('🎯 Installing Agent 3 Tables\n');
  console.log('=' .repeat(60));

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    await db.query('SELECT 1');
    console.log('✅ Database connected\n');

    // Run notification_logs migration
    console.log('📧 Creating notification_logs table...');
    const notificationSql = fs.readFileSync(
      path.resolve(__dirname, '../migrations/058_add_notification_logs.sql'),
      'utf8'
    );
    await db.query(notificationSql);
    console.log('✅ notification_logs table created\n');

    // Run sla_violations migration
    console.log('🎯 Creating sla_violations table...');
    const slaSql = fs.readFileSync(
      path.resolve(__dirname, '../migrations/059_add_sla_violations.sql'),
      'utf8'
    );
    await db.query(slaSql);
    console.log('✅ sla_violations table created\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...');
    const verifyResult = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('notification_logs', 'sla_violations')
      ORDER BY table_name
    `);

    console.log(`✅ Found ${verifyResult.rows.length} table(s):`);
    verifyResult.rows.forEach(row => {
      console.log(`   ✓ ${row.table_name}`);
    });

    console.log('\n' + '=' .repeat(60));
    console.log('🎉 Agent 3 tables installed successfully!\n');

  } catch (error: any) {
    // If tables already exist, that's OK
    if (error.message?.includes('already exists')) {
      console.log('\n⚠️  Tables already exist (this is OK)');
      console.log('✅ Agent 3 tables are ready to use\n');
    } else {
      console.error('\n❌ Installation failed:');
      console.error(error);
      process.exit(1);
    }
  } finally {
    try { await db.end() } catch (e) {}
  }
}

installAgent3Tables();

