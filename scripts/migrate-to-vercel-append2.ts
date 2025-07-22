/**
 * Seed Vercel database with initial data
 */
async function seedVercelDatabase() {
  try {
    logger.info('Seeding Vercel database with initial data...');
    
    // Create admin user with fixed UUID
    const adminId = "3a82e0e8-c54d-4f99-b1d7-e651ce101341";
    const adminPassword = await bcrypt.hash("admin123", 12);
    
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES (${adminId}, 'admin@adpa.com', ${adminPassword}, 'System Administrator', 'admin', ${JSON.stringify({
        "users.create": true,
        "users.update": true,
        "users.delete": true,
        "projects.create": true,
        "projects.update": true,
        "projects.delete": true,
        "documents.create": true,
        "documents.update": true,
        "documents.delete": true,
        "templates.create": true,
        "templates.update": true,
        "templates.delete": true,
        "ai.generate": true,
        "ai.configure": true,
        "analytics.system": true,
        "security.view": true,
        "security.manage": true,
        "security.audit": true,
        "integrations.create": true,
        "integrations.update": true,
        "integrations.delete": true,
        "integrations.view": true,
        "integrations.manage": true,
        "integrations.test": true,
        "integrations.sync": true,
        "jobs.stats": true,
        "jobs.admin": true,
      })})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `;
    
    // Create demo user with fixed UUID
    const userId = "b1f3d2c4-e5a6-4b7c-8d9e-f0a1b2c3d4e5";
    const userPassword = await bcrypt.hash("demo123", 12);
    
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES (${userId}, 'demo@adpa.com', ${userPassword}, 'Demo User', 'user', ${JSON.stringify({
        "projects.create": true,
        "projects.update": true,
        "documents.create": true,
        "documents.update": true,
        "templates.create": true,
        "templates.update": true,
        "ai.generate": true,
      })})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `;
    
    // Create test user with fixed UUID (for testing integrations)
    const testUserId = "672e6d7b-0655-48eb-b33c-9eb8bcc6f9b8";
    const testPassword = await bcrypt.hash("password123", 12);
    
    await sql`
      INSERT INTO users (id, email, password_hash, name, role, permissions)
      VALUES (${testUserId}, 'test@example.com', ${testPassword}, 'Test User', 'admin', ${JSON.stringify({
        "jobs.admin": true,
        "jobs.stats": true,
        "ai.generate": true,
        "ai.configure": true,
        "users.create": true,
        "users.delete": true,
        "users.update": true,
        "security.view": true,
        "security.audit": true,
        "projects.create": true,
        "projects.delete": true,
        "projects.update": true,
        "security.manage": true,
        "analytics.system": true,
        "documents.create": true,
        "documents.delete": true,
        "documents.update": true,
        "templates.create": true,
        "templates.delete": true,
        "templates.update": true,
        "integrations.read": true,
        "integrations.sync": true,
        "integrations.test": true,
        "integrations.create": true,
        "integrations.delete": true,
        "integrations.manage": true,
        "integrations.update": true
      })})
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions
    `;
    
    logger.success('Database seeding completed');
    logger.info('Demo accounts created:');
    logger.info('  Admin: admin@adpa.com / admin123');
    logger.info('  User:  demo@adpa.com / demo123');
    logger.info('  Test:  test@example.com / password123');
    
  } catch (error) {
    logger.error('Seeding failed:', error);
    throw error;
  }
}