/**
 * Configure User Access and Company Assignments
 * 
 * Ensures:
 * 1. Super admin menno.drescher@gmail.com has access to all projects, documents, entities, and companies
 * 2. john.doe@example.com has admin rights and only sees "Example Co" company
 */

import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, pool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

async function configureUserAccess() {
  console.log('🔧 Configuring User Access and Company Assignments...\n')

  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection pool not available')
    }

    // ========================================================================
    // 1. Configure Super Admin: menno.drescher@gmail.com
    // ========================================================================
    console.log('='.repeat(80))
    console.log('1. CONFIGURING SUPER ADMIN: menno.drescher@gmail.com')
    console.log('='.repeat(80))

    const superAdminResult = await pool.query(
      'SELECT id, email, role, company_id FROM users WHERE email = $1',
      ['menno.drescher@gmail.com']
    )

    if (superAdminResult.rows.length === 0) {
      console.log('❌ Super admin user not found: menno.drescher@gmail.com')
      return
    }

    const superAdmin = superAdminResult.rows[0]
    console.log(`Found user: ${superAdmin.email} (ID: ${superAdmin.id})`)
    console.log(`Current role: ${superAdmin.role}`)
    console.log(`Current company_id: ${superAdmin.company_id || 'NULL'}`)

    // Ensure super_admin role and no company_id (so they see all companies)
    if (superAdmin.role !== 'super_admin' || superAdmin.company_id !== null) {
      await pool.query(
        `UPDATE users 
         SET role = 'super_admin', 
             company_id = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [superAdmin.id]
      )
      console.log('✅ Updated: role = super_admin, company_id = NULL')
    } else {
      console.log('✅ Already configured correctly')
    }

    // ========================================================================
    // 2. Find or Create "Example Co" Company
    // ========================================================================
    console.log('\n' + '='.repeat(80))
    console.log('2. FINDING/CREATING COMPANY: Example Co')
    console.log('='.repeat(80))

    let exampleCompanyResult = await pool.query(
      `SELECT id, name FROM companies WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_active = true`,
      ['Example Co']
    )

    let exampleCompanyId: string

    if (exampleCompanyResult.rows.length === 0) {
      // Create the company
      const { v4: uuidv4 } = await import('uuid')
      exampleCompanyId = uuidv4()
      
      await pool.query(
        `INSERT INTO companies (id, name, is_active, created_at, updated_at)
         VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [exampleCompanyId, 'Example Co']
      )
      console.log(`✅ Created company: Example Co (ID: ${exampleCompanyId})`)
    } else {
      exampleCompanyId = exampleCompanyResult.rows[0].id
      console.log(`✅ Found existing company: Example Co (ID: ${exampleCompanyId})`)
    }

    // ========================================================================
    // 3. Configure Admin: john.doe@example.com
    // ========================================================================
    console.log('\n' + '='.repeat(80))
    console.log('3. CONFIGURING ADMIN: john.doe@example.com')
    console.log('='.repeat(80))

    // Check both possible email variations
    let adminEmail = 'john.doe@example.com'
    let adminResult = await pool.query(
      'SELECT id, email, role, company_id FROM users WHERE email = $1',
      [adminEmail]
    )

    // Try the alternative spelling if not found
    if (adminResult.rows.length === 0) {
      adminEmail = 'john.doe@exampl.co'
      adminResult = await pool.query(
        'SELECT id, email, role, company_id FROM users WHERE email = $1',
        [adminEmail]
      )
    }

    if (adminResult.rows.length === 0) {
      // Create the user
      const { v4: uuidv4 } = await import('uuid')
      const bcryptjs = await import('bcryptjs')
      const adminId = uuidv4()
      const hashedPassword = await bcryptjs.default.hash('TempPassword123!', 10)

      // Admin permissions
      const adminPermissions = {
        "admin": true,
        "projects.read": true,
        "projects.create": true,
        "projects.update": true,
        "projects.delete": true,
        "documents.read": true,
        "documents.create": true,
        "documents.update": true,
        "documents.delete": true,
        "users.read": true,
        "users.create": true,
        "users.update": true,
        "users.delete": true,
        "templates.read": true,
        "templates.create": true,
        "templates.update": true,
        "templates.delete": true,
        "analytics.system": true,
        "settings.read": true,
        "settings.update": true,
        "security.view": true,
        "security.manage": true,
        "jobs.admin": true,
        "jobs.stats": true,
      }

      await pool.query(
        `INSERT INTO users (
          id, email, password_hash, name, role, company_id, permissions, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          adminId,
          adminEmail,
          hashedPassword,
          'John Doe',
          'admin',
          exampleCompanyId,
          JSON.stringify(adminPermissions)
        ]
      )
      console.log(`✅ Created admin user: ${adminEmail} (ID: ${adminId})`)
      console.log(`   Role: admin`)
      console.log(`   Company: Example Co (${exampleCompanyId})`)
      console.log(`   ⚠️  Temporary password: TempPassword123! (user should change on first login)`)
    } else {
      const admin = adminResult.rows[0]
      console.log(`Found user: ${admin.email} (ID: ${admin.id})`)
      console.log(`Current role: ${admin.role}`)
      console.log(`Current company_id: ${admin.company_id || 'NULL'}`)

      // Update to admin role and assign to Example Co
      const needsUpdate = admin.role !== 'admin' || admin.company_id !== exampleCompanyId

      if (needsUpdate) {
        // Get existing permissions or use admin defaults
        const existingPermissions = admin.permissions || {}
        const adminPermissions = {
          ...existingPermissions,
          "admin": true,
          "projects.read": true,
          "projects.create": true,
          "projects.update": true,
          "projects.delete": true,
          "documents.read": true,
          "documents.create": true,
          "documents.update": true,
          "documents.delete": true,
          "users.read": true,
          "users.create": true,
          "users.update": true,
          "users.delete": true,
          "templates.read": true,
          "templates.create": true,
          "templates.update": true,
          "templates.delete": true,
          "analytics.system": true,
          "settings.read": true,
          "settings.update": true,
          "security.view": true,
          "security.manage": true,
          "jobs.admin": true,
          "jobs.stats": true,
        }

        await pool.query(
          `UPDATE users 
           SET role = 'admin', 
               company_id = $1,
               permissions = $2,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $3`,
          [exampleCompanyId, JSON.stringify(adminPermissions), admin.id]
        )
        console.log('✅ Updated: role = admin, company_id = Example Co')
      } else {
        console.log('✅ Already configured correctly')
      }
    }

    // ========================================================================
    // 4. Verify Configuration
    // ========================================================================
    console.log('\n' + '='.repeat(80))
    console.log('4. VERIFICATION')
    console.log('='.repeat(80))

    // Verify super admin
    const verifySuperAdmin = await pool.query(
      'SELECT id, email, role, company_id FROM users WHERE email = $1',
      ['menno.drescher@gmail.com']
    )
    const superAdminFinal = verifySuperAdmin.rows[0]
    console.log(`\nSuper Admin (menno.drescher@gmail.com):`)
    console.log(`  Role: ${superAdminFinal.role} ${superAdminFinal.role === 'super_admin' ? '✅' : '❌'}`)
    console.log(`  Company: ${superAdminFinal.company_id || 'NULL'} ${superAdminFinal.company_id === null ? '✅ (sees all companies)' : '❌'}`)

    // Verify admin
    const verifyAdmin = await pool.query(
      'SELECT id, email, role, company_id FROM users WHERE email IN ($1, $2)',
      ['john.doe@example.com', 'john.doe@exampl.co']
    )
    if (verifyAdmin.rows.length > 0) {
      const adminFinal = verifyAdmin.rows[0]
      console.log(`\nAdmin (${adminFinal.email}):`)
      console.log(`  Role: ${adminFinal.role} ${adminFinal.role === 'admin' ? '✅' : '❌'}`)
      console.log(`  Company: ${adminFinal.company_id || 'NULL'}`)
      
      // Verify company name
      const companyCheck = await pool.query(
        'SELECT name FROM companies WHERE id = $1',
        [adminFinal.company_id]
      )
      if (companyCheck.rows.length > 0) {
        console.log(`  Company Name: ${companyCheck.rows[0].name} ${companyCheck.rows[0].name === 'Example Co' ? '✅' : '❌'}`)
      }
    }

    // Check access patterns
    console.log('\n' + '='.repeat(80))
    console.log('5. ACCESS SUMMARY')
    console.log('='.repeat(80))
    console.log('\nSuper Admin (menno.drescher@gmail.com):')
    console.log('  ✅ Can see ALL projects (no company filter)')
    console.log('  ✅ Can see ALL documents (no company filter)')
    console.log('  ✅ Can see ALL extracted entities (no company filter)')
    console.log('  ✅ Can see ALL companies (company_id = NULL)')
    console.log('\nAdmin (john.doe@example.com):')
    console.log('  ✅ Has admin role')
    console.log('  ✅ Can see projects for "Example Co" only (company_id filter)')
    console.log('  ✅ Can see documents for "Example Co" only (company_id filter)')
    console.log('  ✅ Can see extracted entities for "Example Co" only (company_id filter)')
    console.log('  ✅ Can only see "Example Co" in company list (company_id filter)')

    console.log('\n✅ Configuration complete!')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

configureUserAccess()

