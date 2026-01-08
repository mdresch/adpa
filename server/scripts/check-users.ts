import dotenv from 'dotenv';
dotenv.config();

const dbModule = require('../src/lib/db')
const db = dbModule.default || dbModule

// Force SSL config for Supabase
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function checkUsers() {
  try {
    await db.initDb()
    const users = await db.query(`
      SELECT id, email, name, role, created_at
      FROM users 
      ORDER BY 
        CASE role 
          WHEN 'admin' THEN 1
          ELSE 2
        END,
        created_at ASC
    `);

    console.log('\n👥 USERS IN DATABASE:\n');
    
    users.rows.forEach(u => {
      const icon = u.role === 'admin' ? '👑 ADMIN' : '👤';
      console.log(`${icon} ${u.email}`);
      console.log(`   Role: ${u.role}`);
      console.log(`   Name: ${u.name || 'N/A'}`);
      console.log(`   ID: ${u.id}`);
      console.log(`   Created: ${u.created_at}`);
      console.log('');
    });

    await db.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();

