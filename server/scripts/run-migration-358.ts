import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import * as fs from "fs"
import * as path from "path"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function runMigration() {
  try {
    console.log("🔌 Connecting to database...")
    await connectDatabase()
    const pool = getDatabasePool()
    
    if (!pool) {
      throw new Error("Database pool not available")
    }

    const client = await pool.connect()

    try {
      console.log("🚀 Running Migration 358: Add metadata JSONB column to users table")
      console.log("")

      // Check if metadata column already exists
      const checkColumn = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'metadata'
      `)

      if (checkColumn.rows.length > 0) {
        console.log("✅ Metadata column already exists in users table")
        console.log(`   Column type: ${checkColumn.rows[0].data_type}`)
        
        // Check if it's JSONB
        if (checkColumn.rows[0].data_type !== 'jsonb') {
          console.log("⚠️  Warning: metadata column exists but is not JSONB type")
          console.log("   Consider updating the column type manually")
        }
      } else {
        console.log("📝 Metadata column does not exist, will be created")
      }

      // Load and execute migration SQL
      const migrationPath = path.join(__dirname, "../migrations/358_add_metadata_to_users.sql")
      const migrationSQL = fs.readFileSync(migrationPath, "utf-8")

      console.log("📄 Executing migration SQL...")
      await client.query("BEGIN")
      
      try {
        await client.query(migrationSQL)
        await client.query("COMMIT")
        console.log("✅ Migration SQL executed successfully")
      } catch (error: any) {
        await client.query("ROLLBACK")
        throw error
      }

      // Verify the column was created
      const verifyColumn = await client.query(`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'metadata'
      `)

      if (verifyColumn.rows.length > 0) {
        console.log("")
        console.log("✅ Verification: Metadata column exists")
        console.log(`   Type: ${verifyColumn.rows[0].data_type}`)
        console.log(`   Default: ${verifyColumn.rows[0].column_default || 'none'}`)
      } else {
        console.log("")
        console.log("⚠️  Warning: Metadata column not found after migration")
      }

      // Check for index
      const checkIndex = await client.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'users' AND indexname = 'idx_users_metadata'
      `)

      if (checkIndex.rows.length > 0) {
        console.log("✅ GIN index on metadata column exists")
      } else {
        console.log("⚠️  Warning: GIN index on metadata column not found")
      }

      // Count users with metadata
      const userCount = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(metadata) as users_with_metadata,
          COUNT(CASE WHEN metadata = '{}'::jsonb THEN 1 END) as users_with_empty_metadata
        FROM users
      `)

      if (userCount.rows.length > 0) {
        const stats = userCount.rows[0]
        console.log("")
        console.log("📊 User Statistics:")
        console.log(`   Total users: ${stats.total_users}`)
        console.log(`   Users with metadata: ${stats.users_with_metadata}`)
        console.log(`   Users with empty metadata: ${stats.users_with_empty_metadata}`)
      }

      console.log("")
      console.log("✨ Migration 358 completed successfully!")
      console.log("")
      console.log("Next steps:")
      console.log("  1. The metadata column is now available for storing user data")
      console.log("  2. Company names can now be stored in metadata.company_name")
      console.log("  3. Test by updating a user with a company name")
      console.log("")

    } catch (error: any) {
      console.error("❌ Migration failed:", error.message)
      if (error.stack) {
        console.error(error.stack)
      }
      throw error
    } finally {
      client.release()
      await pool.end()
    }
  } catch (error: any) {
    console.error("❌ Migration error:", error)
    process.exit(1)
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

