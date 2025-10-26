/**
 * Create Admin Account for Menno Drescher
 * Run: node server/scripts/create-menno-admin.js
 */

require('dotenv').config({ path: 'server/.env' });
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');

// Use the same connection config as the main server
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

const poolConfig = {
  ssl: databaseUrl && (databaseUrl.includes('supabase.co') || databaseUrl.includes('azure') || process.env.DB_SSL === "true")
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
};

// Parse URL to extract connection details
try {
  const dbUrl = new URL(databaseUrl);
  poolConfig.host = dbUrl.hostname;
  poolConfig.port = parseInt(dbUrl.port) || 5432;
  poolConfig.database = dbUrl.pathname.slice(1).split('?')[0];
  poolConfig.user = dbUrl.username;
  poolConfig.password = dbUrl.password;
  console.log(`Connecting to: ${dbUrl.hostname}:${poolConfig.port}/${poolConfig.database}`);
} catch (e) {
  // Fallback to connectionString
  poolConfig.connectionString = databaseUrl;
}

const pool = new Pool(poolConfig);

async function createMennoAdmin() {
  try {
    console.log('🔐 Creating admin account for Menno Drescher...\n');

    const email = 'menno.drescher@gmail.com';
    const password = 'Menno@ADPA2025'; // Temporary password
    const name = 'Menno Drescher';
    const role = 'admin';

    // Check if user exists
    const existing = await pool.query('SELECT id, email FROM users WHERE email = $1', [email]);
    
    if (existing.rows.length > 0) {
      console.log('⚠️  User already exists. Updating to admin with full permissions...\n');
      
      // Update existing user to admin with full permissions
      const passwordHash = await bcrypt.hash(password, 12);
      
      await pool.query(`
        UPDATE users 
        SET 
          password_hash = $1,
          name = $2,
          role = $3,
          permissions = $4::jsonb,
          is_active = true,
          updated_at = NOW()
        WHERE email = $5
      `, [
        passwordHash,
        name,
        role,
        JSON.stringify({
          "admin": true,
          "ai.read": true,
          "ai.generate": true,
          "ai.configure": true,
          "jobs.admin": true,
          "jobs.stats": true,
          "users.create": true,
          "users.read": true,
          "users.update": true,
          "users.delete": true,
          "projects.create": true,
          "projects.read": true,
          "projects.update": true,
          "projects.delete": true,
          "documents.create": true,
          "documents.read": true,
          "documents.update": true,
          "documents.delete": true,
          "templates.create": true,
          "templates.read": true,
          "templates.update": true,
          "templates.delete": true,
          "stakeholders.create": true,
          "stakeholders.read": true,
          "stakeholders.update": true,
          "stakeholders.delete": true,
          "integrations.create": true,
          "integrations.read": true,
          "integrations.update": true,
          "integrations.delete": true,
          "integrations.sync": true,
          "integrations.test": true,
          "integrations.manage": true,
          "security.view": true,
          "security.audit": true,
          "security.manage": true,
          "analytics.system": true,
          "settings.read": true,
          "settings.update": true
        }),
        email
      ]);
      
      console.log('✅ User updated to admin successfully!');
    } else {
      console.log('Creating new admin user...\n');
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);
      
      // Create new user
      const result = await pool.query(`
        INSERT INTO users (
          email, password_hash, name, role, permissions, is_active
        ) VALUES ($1, $2, $3, $4, $5::jsonb, $6)
        RETURNING id, email, name, role
      `, [
        email,
        passwordHash,
        name,
        role,
        JSON.stringify({
          "admin": true,
          "ai.read": true,
          "ai.generate": true,
          "ai.configure": true,
          "jobs.admin": true,
          "jobs.stats": true,
          "users.create": true,
          "users.read": true,
          "users.update": true,
          "users.delete": true,
          "projects.create": true,
          "projects.read": true,
          "projects.update": true,
          "projects.delete": true,
          "documents.create": true,
          "documents.read": true,
          "documents.update": true,
          "documents.delete": true,
          "templates.create": true,
          "templates.read": true,
          "templates.update": true,
          "templates.delete": true,
          "stakeholders.create": true,
          "stakeholders.read": true,
          "stakeholders.update": true,
          "stakeholders.delete": true,
          "integrations.create": true,
          "integrations.read": true,
          "integrations.update": true,
          "integrations.delete": true,
          "integrations.sync": true,
          "integrations.test": true,
          "integrations.manage": true,
          "security.view": true,
          "security.audit": true,
          "security.manage": true,
          "analytics.system": true,
          "settings.read": true,
          "settings.update": true
        }),
        true
      ]);
      
      console.log('✅ Admin account created successfully!');
      console.log('\nUser Details:');
      console.log(`  ID: ${result.rows[0].id}`);
      console.log(`  Email: ${result.rows[0].email}`);
      console.log(`  Name: ${result.rows[0].name}`);
      console.log(`  Role: ${result.rows[0].role}`);
    }

    console.log('\n📧 Login Credentials:');
    console.log('  Email: menno.drescher@gmail.com');
    console.log('  Password: Menno@ADPA2025');
    console.log('\n⚠️  IMPORTANT: Change password after first login!');
    console.log('  Navigate to /settings to update your password\n');

  } catch (error) {
    console.error('❌ Error creating admin account:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
createMennoAdmin()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

