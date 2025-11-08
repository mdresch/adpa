/**
 * Check Migration Status
 * View which migrations have been executed
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function checkMigrations() {
  console.log('📊 Migration Status Check\n');
  console.log('=' .repeat(70));

  try {
    // Check if schema_migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      ) as exists
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('⚠️  schema_migrations table does not exist');
      console.log('   Run "npm run migrate" to initialize migration tracking\n');
      return;
    }

    // Get executed migrations
    const executedResult = await pool.query(`
      SELECT migration_number, migration_name, executed_at
      FROM schema_migrations
      ORDER BY migration_number DESC
    `);

    // Get available migration files
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const availableFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => {
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        return match ? { number: parseInt(match[1]), filename: file } : null;
      })
      .filter(f => f !== null)
      .sort((a, b) => a!.number - b!.number);

    const executedNumbers = new Set(executedResult.rows.map(r => r.migration_number));
    const pendingMigrations = availableFiles.filter(f => !executedNumbers.has(f!.number));

    console.log('\n📈 Migration Statistics:\n');
    console.log(`   Total migration files:  ${availableFiles.length}`);
    console.log(`   ✅ Executed:            ${executedResult.rows.length}`);
    console.log(`   ⏳ Pending:             ${pendingMigrations.length}`);

    // Show last 10 executed migrations
    console.log('\n\n📜 Last 10 Executed Migrations:\n');
    executedResult.rows.slice(0, 10).forEach(row => {
      console.log(`   ✅ ${String(row.migration_number).padStart(3, '0')} - ${row.migration_name}`);
      console.log(`      Executed: ${new Date(row.executed_at).toLocaleString()}`);
    });

    // Show pending migrations
    if (pendingMigrations.length > 0) {
      console.log('\n\n⏳ Pending Migrations:\n');
      pendingMigrations.forEach(migration => {
        console.log(`   ⏳ ${String(migration!.number).padStart(3, '0')} - ${migration!.filename}`);
      });
      console.log('\n💡 Run "npm run migrate" to execute pending migrations');
    } else {
      console.log('\n\n✅ All migrations are up to date!');
    }

    // Check for Agent 3 specific migrations
    console.log('\n\n🎯 Agent 3 Migrations Status:\n');
    const agent3Migrations = [
      { number: 58, name: 'notification_logs table' },
      { number: 59, name: 'sla_violations table' }
    ];

    agent3Migrations.forEach(migration => {
      const executed = executedNumbers.has(migration.number);
      const icon = executed ? '✅' : '⏳';
      const status = executed ? 'EXECUTED' : 'PENDING';
      console.log(`   ${icon} Migration ${String(migration.number).padStart(3, '0')}: ${migration.name} - ${status}`);
    });

    // Verify tables exist
    console.log('\n\n🗄️  Table Verification:\n');
    const tables = ['notification_logs', 'sla_violations'];
    
    for (const table of tables) {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        ) as exists
      `, [table]);

      const icon = tableExists.rows[0].exists ? '✅' : '❌';
      const status = tableExists.rows[0].exists ? 'EXISTS' : 'MISSING';
      console.log(`   ${icon} ${table.padEnd(25)} - ${status}`);
    }

    console.log('\n' + '=' .repeat(70));

  } catch (error) {
    console.error('\n❌ Error checking migrations:');
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkMigrations();

