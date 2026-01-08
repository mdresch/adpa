/**
 * Show Admin Credentials
 * Displays admin user email for login
 */

const db = require('../src/lib/db');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function showAdminCredentials() {
  try {
    const result = await db.query(`
      SELECT email, name, role, created_at
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at ASC
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('❌ No admin user found!\n');
      console.log('Create one with: npm run create-admin\n');
      process.exit(1);
    }

    const admin = result.rows[0];
    
    console.log('\n✅ Admin User Found:\n');
    console.log('=' .repeat(50));
    console.log(`Email:    ${admin.email}`);
    console.log(`Name:     ${admin.name || 'Not set'}`);
    console.log(`Role:     ${admin.role}`);
    console.log(`Created:  ${new Date(admin.created_at).toLocaleDateString()}`);
    console.log('=' .repeat(50));
    console.log('\n🔐 Login Instructions:\n');
    console.log('1. Go to: http://localhost:3000/auth/login');
    console.log(`2. Email: ${admin.email}`);
    console.log('3. Password: (the password you set for this user)');
    console.log('\n4. After login, visit: http://localhost:3000/admin/quality-trends');
    console.log('\n');

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    try { await db.end() } catch (e) {}
  }
}

showAdminCredentials();

