import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function migrateToVercel() {
  try {
    console.log('🚀 Starting Vercel Postgres migration...');
    
    // Read your existing schema
    const schemaPath = join(process.cwd(), 'server/src/database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Execute schema (Vercel Postgres supports full PostgreSQL)
    await sql.query(schema);
    
    console.log('✅ Schema migration completed');
    
    // Run your existing seed data
    await seedVercelDatabase();
    
    console.log('✅ Data seeding completed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function seedVercelDatabase() {
  // Adapt your existing seed.ts logic here
  // Example:
  const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341";
  
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, permissions)
    VALUES (${adminId}, 'admin@adpa.com', ${'hashed_password'}, 'Admin User', 'admin', ${'{"admin": true}'})
    ON CONFLICT (email) DO NOTHING
  `;
}

// Allow running directly from command line
if (require.main === module) {
  migrateToVercel()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}