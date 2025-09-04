const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'adpa',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function checkAndFixAdminPermissions() {
  console.log('🔍 Checking admin@adpa.com permissions...\n');

  try {
    // Get current admin user
    const adminResult = await pool.query(
      'SELECT id, email, role, permissions, is_active FROM users WHERE email = $1',
      ['admin@adpa.com']
    );

    if (adminResult.rows.length === 0) {
      console.log('❌ Admin user not found. Creating admin user...');
      
      const bcrypt = require('bcrypt');
      const { v4: uuidv4 } = require('uuid');
      
      const adminId = uuidv4();
      const adminPassword = await bcrypt.hash('admin123', 10);
      
      const fullPermissions = {
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
        "integrations.test": true,
        "integrations.sync": true,
        "integrations.manage": true,
        "jobs.stats": true,
        "jobs.admin": true,
      };

      await pool.query(`
        INSERT INTO users (id, email, password_hash, name, role, permissions, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        adminId,
        "admin@adpa.com",
        adminPassword,
        "System Administrator",
        "admin",
        JSON.stringify(fullPermissions),
        true
      ]);

      console.log('✅ Admin user created successfully!');
      console.log('📧 Email: admin@adpa.com');
      console.log('🔑 Password: admin123');
      console.log('🎯 Role: admin');
      console.log('✅ All permissions granted including integrations');
      
    } else {
      const admin = adminResult.rows[0];
      console.log('👤 Admin user found:');
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   🎯 Role: ${admin.role}`);
      console.log(`   ✅ Active: ${admin.is_active}`);
      
      const currentPermissions = admin.permissions || {};
      console.log('\n🔑 Current permissions:');
      
      const requiredIntegrationPermissions = [
        'integrations.create',
        'integrations.update', 
        'integrations.delete',
        'integrations.test',
        'integrations.sync',
        'integrations.manage'
      ];
      
      let missingPermissions = [];
      
      requiredIntegrationPermissions.forEach(perm => {
        const hasPermission = currentPermissions[perm] === true;
        console.log(`   ${hasPermission ? '✅' : '❌'} ${perm}: ${hasPermission}`);
        if (!hasPermission) {
          missingPermissions.push(perm);
        }
      });
      
      if (missingPermissions.length > 0) {
        console.log(`\n⚠️  Missing ${missingPermissions.length} integration permissions!`);
        console.log('🔧 Fixing permissions...');
        
        // Add missing permissions
        const updatedPermissions = { ...currentPermissions };
        missingPermissions.forEach(perm => {
          updatedPermissions[perm] = true;
        });
        
        await pool.query(
          'UPDATE users SET permissions = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2',
          [JSON.stringify(updatedPermissions), 'admin@adpa.com']
        );
        
        console.log('✅ Permissions updated successfully!');
        console.log('🎯 Added permissions:', missingPermissions.join(', '));
        
      } else {
        console.log('\n✅ All integration permissions are present!');
      }
    }
    
    console.log('\n🚀 Ready to test SharePoint integration!');
    console.log('📝 Login credentials:');
    console.log('   📧 Email: admin@adpa.com');
    console.log('   🔑 Password: admin123');
    console.log('\n🔗 Access integrations at: http://localhost:3000/integrations');
    
  } catch (error) {
    console.error('❌ Error checking admin permissions:', error);
  } finally {
    await pool.end();
  }
}

// Run the check
checkAndFixAdminPermissions().catch(console.error);
