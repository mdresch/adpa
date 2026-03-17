const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  const adminHash = await bcrypt.hash('admin123', 12);
  const demoHash = await bcrypt.hash('demo123', 12);
  const perms = JSON.stringify({ 'users.create': true });

  // Add unique constraint if not exists
  await pool.query(
    'ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)'
  ).catch(() => {}); // Ignore if already exists

  // Clear existing test users
  await pool.query("DELETE FROM users WHERE email IN ('admin@adpa.com', 'demo@adpa.com')").catch(() => {});

  await pool.query(
    'INSERT INTO users (id, email, password_hash, name, role, permissions) VALUES ($1, $2, $3, $4, $5, $6)',
    ['3a82e0e8-c54d-4f99-b1d7-e651ce101341', 'admin@adpa.com', adminHash, 'System Administrator', 'admin', perms]
  );
  
  await pool.query(
    'INSERT INTO users (id, email, password_hash, name, role, permissions) VALUES ($1, $2, $3, $4, $5, $6)',
    ['b1f3d2c4-e5a6-4b7c-8d9e-f0a1b2c3d4e5', 'demo@adpa.com', demoHash, 'Demo User', 'user', '{}']
  );
  
  console.log('Users seeded successfully');
  const users = await pool.query('SELECT id, email, name, role FROM users');
  console.log(users.rows);
  await pool.end();
}

seed();
