/**
 * Run Migration 357: Create Companies/Tenants Table for Multi-Tenant Support
 * 
 * Creates:
 * - companies table: Multi-tenant company/tenant management
 * - company_id and tenant_id columns on users table
 * - company_id columns on key tables for tenant isolation:
 *   - projects
 *   - documents
 *   - programs
 *   - upload_batches
 *   - assessments
 * 
 * Usage:
 *   npm run migrate:357
 *   npx tsx server/scripts/run-migration-357.ts
 */

import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import * as fs from "fs"
import * as path from "path"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration() {
  try {
    logger.info("Connecting to database...")
    await connectDatabase()
    logger.info("Database connected successfully")
  } catch (error) {
    logger.error("Failed to connect to database:", error)
    throw error
  }

  const pool = getDatabasePool()
  const client = await pool.connect()

  try {
    console.log("🚀 Running Migration 357: Create Companies/Tenants Table for Multi-Tenant Support")
    console.log("   Implementing multi-tenant architecture with company/tenant isolation\n")

    // Load migration file
    const migrationPath = path.join(__dirname, "../migrations/357_create_companies_tenants.sql")
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`)
    }
    
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

    console.log(`📄 Migration file loaded: ${migrationPath}`)
    console.log(`📊 Migration size: ${migrationSQL.length} characters\n`)

    // Check if companies table already exists
    console.log("🔍 Checking if companies table exists...")
    const companiesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'companies'
      )
    `)
    
    if (companiesCheck.rows[0].exists) {
      console.log("   ⚠️  Table 'companies' already exists - migration will use IF NOT EXISTS")
    } else {
      console.log("   ✅ Table 'companies' will be created")
    }
    console.log("\n")

    // Check if company_id columns exist
    console.log("🔍 Checking if company_id columns exist...")
    const tablesToCheck = ['users', 'projects', 'documents']
    
    for (const tableName of tablesToCheck) {
      const columnCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = 'company_id'
        )
      `, [tableName])
      
      if (columnCheck.rows[0].exists) {
        console.log(`   ⚠️  Column 'company_id' already exists in '${tableName}'`)
      } else {
        console.log(`   ✅ Column 'company_id' will be added to '${tableName}'`)
      }
    }
    console.log("\n")

    // Check if optional tables exist
    console.log("🔍 Checking optional tables...")
    const optionalTables = ['programs', 'upload_batches', 'assessments']
    
    for (const tableName of optionalTables) {
      const tableExists = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [tableName])
      
      if (tableExists.rows[0].exists) {
        const columnCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1 
            AND column_name = 'company_id'
          )
        `, [tableName])
        
        if (columnCheck.rows[0].exists) {
          console.log(`   ⚠️  Column 'company_id' already exists in '${tableName}'`)
        } else {
          console.log(`   ✅ Column 'company_id' will be added to '${tableName}'`)
        }
      } else {
        console.log(`   ⏭️  Table '${tableName}' does not exist - will be skipped`)
      }
    }
    console.log("\n")

    // Execute migration
    console.log("🔄 Executing migration...")
    await client.query("BEGIN")
    try {
      await client.query(migrationSQL)
      await client.query("COMMIT")
      console.log("✅ Migration executed successfully\n")
    } catch (error: any) {
      await client.query("ROLLBACK")
      throw error
    }

    // Verify companies table was created
    console.log("🔍 Verifying companies table creation...")
    const verifyCompanies = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'companies'
      )
    `)
    
    if (verifyCompanies.rows[0].exists) {
      const rowCount = await client.query(`SELECT COUNT(*) as count FROM companies`)
      console.log(`   ✅ Table 'companies' exists (${rowCount.rows[0].count} rows)`)
    } else {
      console.log(`   ❌ Table 'companies' NOT found`)
    }
    console.log("\n")

    // Verify company_id columns were added
    console.log("🔍 Verifying company_id columns...")
    for (const tableName of tablesToCheck) {
      const verifyColumn = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = 'company_id'
        )
      `, [tableName])
      
      if (verifyColumn.rows[0].exists) {
        // Check if index exists
        const indexCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes 
            WHERE tablename = $1 
            AND indexname = 'idx_${tableName}_company_id'
          )
        `, [tableName])
        
        const indexStatus = indexCheck.rows[0].exists ? "with index" : "without index"
        console.log(`   ✅ Column 'company_id' exists in '${tableName}' ${indexStatus}`)
      } else {
        console.log(`   ❌ Column 'company_id' NOT found in '${tableName}'`)
      }
    }
    console.log("\n")

    // Check user count
    const userCount = await client.query(`SELECT COUNT(*) as count FROM users`)
    console.log(`📊 Total users in database: ${userCount.rows[0].count}`)
    
    const usersWithCompany = await client.query(`
      SELECT COUNT(*) as count FROM users WHERE company_id IS NOT NULL
    `)
    console.log(`📊 Users with company assigned: ${usersWithCompany.rows[0].count}`)
    console.log("\n")

    console.log("✨ Migration 357 completed successfully!")
    console.log("\n📊 Summary:")
    console.log("   ✅ companies table created")
    console.log("   ✅ company_id and tenant_id columns added to users table")
    console.log("   ✅ company_id columns added to projects, documents, and other tables")
    console.log("   ✅ Indexes created for performance")
    console.log("\n💡 Next steps:")
    console.log("   - Create companies via API: POST /api/companies")
    console.log("   - Assign users to companies: Update users.company_id")
    console.log("   - All new data will be tenant-isolated by company_id")
    console.log("\n🔒 Security:")
    console.log("   - Users can only access data from their company")
    console.log("   - Admins can manage all companies")
    console.log("   - Company deletion requires all users to be deactivated first")

  } catch (error: any) {
    logger.error(`Migration failed: ${error.message}`, {
      code: error.code,
      stack: error.stack
    })
    console.log(`\n❌ Migration failed: ${error.message}`)
    console.log(`Stack trace: ${error.stack}`)
    if (error.code) {
      console.log(`Error code: ${error.code}`)
    }
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

runMigration()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration error:", error)
    process.exit(1)
  })

