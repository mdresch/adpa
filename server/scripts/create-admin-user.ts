#!/usr/bin/env tsx
/**
 * Create Admin User Script
 * 
 * Creates an admin user for ADPA system configuration
 * 
 * Usage:
 *   npm run create-admin
 *   OR
 *   npx tsx scripts/create-admin-user.ts
 * 
 * Default credentials:
 *   Email: admin@adpa.local
 *   Password: Admin123!
 * 
 * IMPORTANT: Change password after first login!
 */

import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : undefined
})

async function createAdminUser() {
  const email = process.env.ADMIN_EMAIL || 'admin@adpa.local'
  const password = process.env.ADMIN_PASSWORD || 'Admin123!'
  const name = 'System Administrator'

  console.log('🔧 Creating admin user...')
  console.log('📧 Email:', email)
  console.log('🔐 Password:', password)
  console.log('')
  console.log('⚠️  IMPORTANT: Change password after first login!')
  console.log('')

  try {
    // Connect to database
    await pool.connect()
    console.log('✅ Database connected')

    // Hash password
    console.log('🔐 Hashing password...')
    const passwordHash = await bcrypt.hash(password, 10)

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id, email, role FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      console.log('⚠️  User already exists, updating...')
      
      // Update existing user to admin
      await pool.query(
        `UPDATE users 
         SET password_hash = $1, role = 'admin', is_active = true, name = $2
         WHERE email = $3`,
        [passwordHash, name, email]
      )

      console.log('✅ Updated existing user to admin')
      console.log('📧 Email:', email)
      console.log('👤 Role: admin')
    } else {
      console.log('➕ Creating new admin user...')
      
      // Create new admin user
      const userId = uuidv4()
      await pool.query(
        `INSERT INTO users (id, email, password_hash, name, role, is_active, created_at)
         VALUES ($1, $2, $3, $4, 'admin', true, CURRENT_TIMESTAMP)`,
        [userId, email, passwordHash, name]
      )

      console.log('✅ Created new admin user')
      console.log('📧 Email:', email)
      console.log('🆔 ID:', userId)
      console.log('👤 Role: admin')
    }

    console.log('')
    console.log('🎉 SUCCESS! Admin user ready')
    console.log('')
    console.log('📋 Next Steps:')
    console.log('1. Go to http://localhost:3000/login')
    console.log(`2. Login with: ${email} / ${password}`)
    console.log('3. Go to http://localhost:3000/settings')
    console.log('4. Configure AI Gateway API key')
    console.log('5. Change your password!')
    console.log('')

  } catch (error) {
    console.error('❌ Error creating admin user:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

// Run
createAdminUser()

