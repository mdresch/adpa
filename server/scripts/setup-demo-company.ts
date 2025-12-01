import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"
import { v4 as uuidv4 } from "uuid"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function setupDemoCompany() {
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
    console.log("🚀 Setting up Demo Company and assigning Demo User")

    // 1. Find or create Demo Company
    let demoCompanyResult = await client.query(
      "SELECT id, name FROM companies WHERE name ILIKE '%demo%' LIMIT 1"
    )

    let demoCompanyId: string

    if (demoCompanyResult.rows.length > 0) {
      demoCompanyId = demoCompanyResult.rows[0].id
      console.log(`✅ Found existing Demo Company: ${demoCompanyResult.rows[0].name} (ID: ${demoCompanyId})`)
    } else {
      // Create Demo Company
      demoCompanyId = uuidv4()
      await client.query(
        `INSERT INTO companies (id, name, domain, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [demoCompanyId, "Demo Company", "demo.example.com", true]
      )
      console.log(`✅ Created Demo Company (ID: ${demoCompanyId})`)
    }

    // 2. Find Demo User
    const demoUserResult = await client.query(
      "SELECT id, email, name, company_id FROM users WHERE email ILIKE '%demo%' OR name ILIKE '%demo%' LIMIT 1"
    )

    if (demoUserResult.rows.length === 0) {
      console.log("⚠️  No Demo User found. Please create a user with 'demo' in the email or name first.")
      console.log("   Example: demo@example.com or Demo User")
      return
    }

    const demoUser = demoUserResult.rows[0]
    console.log(`✅ Found Demo User: ${demoUser.name} (${demoUser.email})`)

    // 3. Check if user is already assigned to a company
    if (demoUser.company_id) {
      if (demoUser.company_id === demoCompanyId) {
        console.log(`✅ Demo User is already assigned to Demo Company`)
        return
      } else {
        // Get the current company name
        const currentCompanyResult = await client.query(
          "SELECT name FROM companies WHERE id = $1",
          [demoUser.company_id]
        )
        const currentCompanyName = currentCompanyResult.rows[0]?.name || "Unknown Company"
        console.log(`⚠️  Demo User is currently assigned to: ${currentCompanyName}`)
        console.log(`   Updating to Demo Company...`)
      }
    }

    // 4. Assign Demo User to Demo Company
    await client.query(
      "UPDATE users SET company_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
      [demoCompanyId, demoUser.id]
    )

    console.log(`✅ Successfully assigned Demo User to Demo Company`)
    console.log(`\n📊 Summary:`)
    console.log(`   Company: Demo Company (${demoCompanyId})`)
    console.log(`   User: ${demoUser.name} (${demoUser.email})`)
    console.log(`   Status: ✅ Assigned`)

    // 5. Show company statistics
    const userCountResult = await client.query(
      "SELECT COUNT(*) as count FROM users WHERE company_id = $1 AND is_active = true",
      [demoCompanyId]
    )
    const activeUserCount = parseInt(userCountResult.rows[0].count)

    console.log(`\n📈 Demo Company Statistics:`)
    console.log(`   Active Users: ${activeUserCount}`)

    console.log("\n✨ Setup complete!")

  } catch (error: any) {
    logger.error("Setup error:", error)
    throw error
  } finally {
    client.release()
  }
}

setupDemoCompany()
  .then(() => {
    console.log("\n✅ Script completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error)
    process.exit(1)
  })

