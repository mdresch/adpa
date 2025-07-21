const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'adpa',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function fixAdminPermissions() {
  console.log('🔧 Fixing admin user permissions...\n');

  try {
    // Get current admin user
    const adminResult = await pool.query(
      'SELECT id, email, permissions FROM users WHERE email = $1',
      ['admin@adpa.com']
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found. Please run the database seed first.');
      return;
    }

    const admin = adminResult.rows[0];
    console.log(`📋 Current admin user: ${admin.email}`);
    console.log(`🔑 Current permissions:`, Object.keys(admin.permissions || {}));

    // Updated permissions with integrations.manage
    const updatedPermissions = {
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
      "integrations.manage": true,  // Added this permission
      "integrations.test": true,
      "integrations.sync": true,
      "jobs.stats": true,
      "jobs.admin": true,
    };

    // Update admin user permissions
    await pool.query(
      'UPDATE users SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
      [JSON.stringify(updatedPermissions), 'admin@adpa.com']
    );

    console.log('\n✅ Admin permissions updated successfully!');
    console.log('🔑 New permissions:', Object.keys(updatedPermissions));
    console.log('\n📝 Changes made:');
    console.log('   ✅ Added: integrations.manage');
    console.log('\n🎯 You can now access:');
    console.log('   - Integrations page: http://localhost:3000/integrations');
    console.log('   - Confluence integration: http://localhost:3000/integrations/confluence');
    console.log('\n💡 Login with: admin@adpa.com / admin123');

  } catch (error) {
    console.error('❌ Error updating admin permissions:', error);
  } finally {
    await pool.end();
  }
}

// Run the fix
if (require.main === module) {
  fixAdminPermissions()
    .then(() => {
      console.log('\n🎉 Permission fix completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Permission fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAdminPermissions };
