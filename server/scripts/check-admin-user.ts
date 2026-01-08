/**
 * Check Admin User Status
 * Verify admin user exists and can access admin features
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

dotenv.config({ path: path.resolve(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkAdminUser() {
  console.log('👤 Admin User Status Check\n');
  console.log('=' .repeat(60));

  try {
    // Check admin users
    await db.initDb()
    const adminResult = await db.query(`
      SELECT id, email, name, role, created_at
      FROM users
      WHERE role = 'admin'
      ORDER BY created_at ASC
    `);

    if (adminResult.rows.length === 0) {
      console.log('❌ No admin users found!\n');
      console.log('💡 Create an admin user:');
      console.log('   npm run create-admin\n');
      process.exit(1);
    }

    console.log(`✅ Found ${adminResult.rows.length} admin user(s):\n`);
    
    adminResult.rows.forEach((user, idx) => {
      console.log(`${idx + 1}. Email: ${user.email}`);
      console.log(`   Name:  ${user.name || 'Not set'}`);
      console.log(`   ID:    ${user.id.substring(0, 8)}...`);
      console.log(`   Role:  ${user.role}`);
      console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}\n`);
    });

    // Show login instructions
    console.log('=' .repeat(60));
    console.log('🔐 To access admin dashboard:\n');
    console.log('1. Login at: http://localhost:3000/auth/login');
    console.log(`2. Use email: ${adminResult.rows[0].email}`);
    console.log('3. Use your password');
    console.log('4. Navigate to: http://localhost:3000/admin/quality-trends\n');

    // Check if backend is running
    console.log('=' .repeat(60));
    console.log('🔌 Checking backend status...\n');
    
    try {
      const response = await fetch('http://localhost:5000/health');
      if (response.ok) {
        console.log('✅ Backend is RUNNING at http://localhost:5000\n');
      } else {
        console.log('⚠️  Backend responded but with error\n');
      }
    } catch (error) {
      console.log('❌ Backend is NOT running!');
      console.log('   Start with: cd server && npm run dev\n');
    }

    // Check if frontend is running
    try {
      const response = await fetch('http://localhost:3000');
      if (response.ok) {
        console.log('✅ Frontend is RUNNING at http://localhost:3000\n');
      } else {
        console.log('⚠️  Frontend responded but with error\n');
      }
    } catch (error) {
      console.log('❌ Frontend is NOT running!');
      console.log('   Start with: pnpm dev\n');
    }

  } catch (error) {
    console.error('❌ Check failed:');
    console.error(error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

checkAdminUser();

