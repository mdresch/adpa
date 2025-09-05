const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'adpa',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function resetAdminPassword() {
  console.log('🔑 Resetting admin@adpa.com password to "password"...\n');

  try {
    // Hash the new password
    const newPassword = 'password';
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update the user's password
    const result = await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id, email',
      [passwordHash, 'admin@adpa.com']
    );

    if (result.rows.length > 0) {
      console.log('✅ Password reset successful!');
      console.log(`👤 User: ${result.rows[0].email}`);
      console.log(`🔑 New password: ${newPassword}`);
      console.log('\n🎯 You can now login with:');
      console.log('   📧 Email: admin@adpa.com');
      console.log('   🔑 Password: password');
    } else {
      console.log('❌ User not found!');
    }

  } catch (error) {
    console.error('❌ Error resetting password:', error);
  } finally {
    await pool.end();
  }
}

// Run the password reset
resetAdminPassword().catch(console.error);
