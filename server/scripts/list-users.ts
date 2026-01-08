const db = require('../src/lib/db');
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function listUsers() {
  try {
    const result = await db.query(`
      SELECT id, email, role, created_at
      FROM users
      ORDER BY created_at ASC
      LIMIT 5
    `);
    
    console.log('\n👥 Users in Database:\n');
    if (result.rows.length === 0) {
      console.log('❌ No users found');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`[${index + 1}] ${user.email}`);
        console.log(`    Role: ${user.role}`);
        console.log(`    ID: ${user.id}`);
        console.log(`    Created: ${user.created_at}`);
        console.log('');
      });
    }
    
    console.log('💡 Use one of these emails to log in at:');
    console.log('   http://localhost:3000/auth/login\n');
    
    try { await db.end() } catch (e) {}
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

listUsers();

