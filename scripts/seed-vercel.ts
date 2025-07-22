import { sql } from '@vercel/postgres';

export async function seedVercelDatabase() {
  try {
    console.log('🌱 Starting Vercel Postgres seeding...');
    
    // Seed users
    await seedUsers();
    
    // Seed projects
    await seedProjects();
    
    // Seed other tables as needed
    
    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

async function seedUsers() {
  console.log('Seeding users...');
  
  // Create admin user
  const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341";
  await sql`
    INSERT INTO users (id, email, password_hash, name, role, permissions)
    VALUES (${adminId}, 'admin@adpa.com', ${'$2a$10$eDIJO.O5/VrNWb7JXZys6uRwj6TJV3sVQ5XA.tUY6J.vtVsGjH.fS'}, 'Admin User', 'admin', ${'{"admin": true}'})
    ON CONFLICT (email) DO NOTHING
  `;
  
  // Create regular users
  await sql`
    INSERT INTO users (email, password_hash, name, role, permissions)
    VALUES 
      ('user1@example.com', ${'$2a$10$eDIJO.O5/VrNWb7JXZys6uRwj6TJV3sVQ5XA.tUY6J.vtVsGjH.fS'}, 'User One', 'user', ${'{"read": true}'})
    ON CONFLICT (email) DO NOTHING
  `;
  
  console.log('✅ Users seeded');
}

async function seedProjects() {
  console.log('Seeding projects...');
  
  const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341";
  
  await sql`
    INSERT INTO projects (name, description, framework, owner_id, created_by)
    VALUES 
      ('Demo Project', 'A demonstration project', 'ADPA', ${adminId}, ${adminId}),
      ('Test Project', 'A test project', 'ADPA', ${adminId}, ${adminId})
    ON CONFLICT (name, owner_id) DO NOTHING
  `;
  
  console.log('✅ Projects seeded');
}

// Allow running directly from command line
if (require.main === module) {
  seedVercelDatabase()
    .then(() => {
      console.log('Seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}