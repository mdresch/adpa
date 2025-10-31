import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrateToVercel() {
  try {
    console.log('🚀 Starting Vercel Postgres migration...');
    
    // Read the existing schema
    const schemaPath = join(process.cwd(), 'server/src/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Split the schema into individual statements
    const statements = schema
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);
    
    console.log(`Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement separately
    for (let i = 0; i < statements.length; i++) {
      try {
        const statement = statements[i];
        // Skip comments and empty lines
        if (statement.startsWith('--') || statement.length === 0) continue;
        
        // Execute the statement
        await sql.query(statement + ';');
        console.log(`✅ Executed statement ${i + 1}/${statements.length}`);
      } catch (error) {
        console.error(`❌ Error executing statement ${i + 1}:`, error);
        // Continue with the next statement
      }
    }
    
    console.log('✅ Schema migration completed');
    
    // Seed the database with an admin user
    await seedVercelDatabase();
    
    console.log('✅ Data seeding completed');
    console.log('🎉 Vercel Postgres migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

async function seedVercelDatabase() {
  try {
    console.log('🌱 Seeding Vercel Postgres database...');
    
    // Get admin credentials from environment variables
    const adminId = process.env.ADMIN_USER_ID || "3a82e0e8-c54d-4f99-b1d7-e651ce101341";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@adpa.com";
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    
    // Validate that password hash is provided
    if (!adminPasswordHash) {
      console.warn('⚠️  ADMIN_PASSWORD_HASH environment variable not set. Skipping admin user creation.');
      console.warn('⚠️  Please set ADMIN_PASSWORD_HASH with a bcrypt-hashed password.');
      console.warn('⚠️  Example: Generate hash with: bcrypt.hash("yourpassword", 10)');
      return;
    }
    
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES (${adminId}, ${adminEmail}, ${adminPasswordHash}, 'Admin User', 'admin', ${'{"admin": true}'})
      ON CONFLICT (email) DO NOTHING
    `;
    
    console.log('✅ Admin user created or already exists');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateToVercel();
}

export { migrateToVercel };