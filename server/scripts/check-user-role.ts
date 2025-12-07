/**
 * Check User Role and Permissions
 */

import dotenv from 'dotenv'
import path from 'path'
import { connectDatabase, pool } from '../src/database/connection'

dotenv.config({ path: path.join(__dirname, '../.env') })

async function checkUserRole(email: string) {
  console.log(`🔍 Checking role for: ${email}\n`)

  try {
    await connectDatabase()
    
    if (!pool) {
      throw new Error('Database connection pool not available')
    }

    const result = await pool.query(
      'SELECT id, email, role, permissions, is_active, created_at FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      console.log(`❌ User not found: ${email}`)
      return
    }

    const user = result.rows[0]
    
    console.log('='.repeat(80))
    console.log('USER INFORMATION')
    console.log('='.repeat(80))
    console.log(`ID: ${user.id}`)
    console.log(`Email: ${user.email}`)
    console.log(`Role: ${user.role || 'not set'}`)
    console.log(`Active: ${user.is_active ? '✅ Yes' : '❌ No'}`)
    console.log(`Created: ${user.created_at}`)
    console.log(`Permissions: ${JSON.stringify(user.permissions || {}, null, 2)}`)
    
    const userRole = (user.role || '').toLowerCase()
    const isSuperAdmin = userRole === 'super_admin'
    const isAdmin = userRole === 'admin'
    const isAdminOrSuperAdmin = isAdmin || isSuperAdmin
    
    console.log('\n' + '='.repeat(80))
    console.log('PERMISSION ANALYSIS')
    console.log('='.repeat(80))
    console.log(`Is Super Admin: ${isSuperAdmin ? '✅ Yes' : '❌ No'}`)
    console.log(`Is Admin: ${isAdmin ? '✅ Yes' : '❌ No'}`)
    console.log(`Is Admin or Super Admin: ${isAdminOrSuperAdmin ? '✅ Yes' : '❌ No'}`)
    
    // Check job-related permissions
    const permissions = user.permissions || {}
    const hasJobsAdmin = permissions['jobs.admin'] === true
    const hasJobsManage = permissions['jobs.manage'] === true
    const hasJobsStats = permissions['jobs.stats'] === true
    
    console.log('\n' + '='.repeat(80))
    console.log('JOB MONITOR ACCESS')
    console.log('='.repeat(80))
    console.log(`Has jobs.admin permission: ${hasJobsAdmin ? '✅ Yes' : '❌ No'}`)
    console.log(`Has jobs.manage permission: ${hasJobsManage ? '✅ Yes' : '❌ No'}`)
    console.log(`Has jobs.stats permission: ${hasJobsStats ? '✅ Yes' : '❌ No'}`)
    
    // According to requirePermission middleware, super_admin and admin have all permissions
    const canViewAllJobs = isAdminOrSuperAdmin || hasJobsAdmin
    const canManageJobs = isAdminOrSuperAdmin || hasJobsManage
    const canViewStats = isAdminOrSuperAdmin || hasJobsStats
    
    console.log('\n' + '='.repeat(80))
    console.log('ACCESS SUMMARY')
    console.log('='.repeat(80))
    console.log(`Can view all jobs (all users): ${canViewAllJobs ? '✅ Yes' : '❌ No'}`)
    console.log(`Can manage jobs (cancel, retry, cleanup): ${canManageJobs ? '✅ Yes' : '❌ No'}`)
    console.log(`Can view job statistics: ${canViewStats ? '✅ Yes' : '❌ No'}`)
    
    if (canViewAllJobs) {
      console.log('\n✅ This user CAN see all job monitor details for every user')
      console.log('   They can access:')
      console.log('   - GET /api/jobs/admin/all (all jobs)')
      console.log('   - GET /api/jobs/diagnostics/pending (diagnostics)')
      console.log('   - POST /api/jobs/diagnostics/fix-pending (fix pending jobs)')
    } else {
      console.log('\n❌ This user CANNOT see all job monitor details')
      console.log('   They can only see:')
      console.log('   - GET /api/jobs (their own jobs only)')
      console.log('\n   To grant access, either:')
      console.log('   1. Set role to "admin" or "super_admin"')
      console.log('   2. Grant "jobs.admin" permission')
    }

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await pool.end()
    process.exit(0)
  }
}

const email = process.argv[2] || 'menno.drescher@gmail.com'
checkUserRole(email)

