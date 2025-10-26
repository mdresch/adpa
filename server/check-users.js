require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT id, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5')
  .then(res => {
    console.log('\n🔍 Existing users in database:');
    if (res.rows.length === 0) {
      console.log('  ❌ No users found. You need to register first!');
      console.log('  👉 Go to: http://localhost:3000/auth/register');
    } else {
      res.rows.forEach(u => {
        console.log(`  ✅ ${u.email} (${u.role}) - Created: ${u.created_at.toISOString().split('T')[0]}`);
      });
      console.log(`\n  Total: ${res.rows.length} user(s)`);
    }
    pool.end();
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    pool.end();
  });

