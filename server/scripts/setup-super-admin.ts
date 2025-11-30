import dotenv from "dotenv"
import { getDatabasePool, connectDatabase } from "../src/database/connection"
import { logger } from "../src/utils/logger"

// Load environment variables
if (process.env.NODE_ENV !== "production") {
  dotenv.config()
}

async function setupSuperAdmin() {
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
    console.log("🚀 Setting up Super Admin: Menno Drescher")

    const superAdminEmail = "menno.drescher@gmail.com"
    const superAdminName = "Menno Drescher"
    const superAdminRole = "super_admin"

    // 1. Check if user exists
    const userResult = await client.query(
      "SELECT id, email, name, role FROM users WHERE email = $1",
      [superAdminEmail]
    )

    if (userResult.rows.length === 0) {
      console.error(`❌ User with email ${superAdminEmail} not found.`)
      console.log("\nPlease create the user first, then run this script again.")
      return
    }

    const user = userResult.rows[0]
    console.log(`✅ Found user: ${user.name || user.email} (ID: ${user.id})`)
    console.log(`   Current role: ${user.role}`)

    // 2. Update user to super_admin role
    if (user.role === superAdminRole) {
      console.log(`✅ User is already a ${superAdminRole}. No changes needed.`)
    } else {
      await client.query(
        "UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [superAdminRole, user.id]
      )
      console.log(`✅ Updated user role from '${user.role}' to '${superAdminRole}'`)
    }

    // 3. Update user name if different
    if (user.name !== superAdminName) {
      await client.query(
        "UPDATE users SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2",
        [superAdminName, user.id]
      )
      console.log(`✅ Updated user name to '${superAdminName}'`)
    }

    // 4. Verify super admin permissions
    const updatedUser = await client.query(
      "SELECT id, email, name, role, permissions FROM users WHERE id = $1",
      [user.id]
    )

    const finalUser = updatedUser.rows[0]
    console.log("\n📊 Super Admin Details:")
    console.log(`   ID: ${finalUser.id}`)
    console.log(`   Email: ${finalUser.email}`)
    console.log(`   Name: ${finalUser.name}`)
    console.log(`   Role: ${finalUser.role}`)
    console.log(`   Permissions: ${JSON.stringify(finalUser.permissions || {}, null, 2)}`)

    console.log("\n✨ Super Admin setup complete!")
    console.log("\nSuper Admin Capabilities:")
    console.log("  ✅ All admin permissions")
    console.log("  ✅ Can promote company templates to standard (system-wide)")
    console.log("  ✅ Cross-company template management")
    console.log("  ✅ Full system access")

  } catch (error: any) {
    logger.error("Error during super admin setup:", error)
    throw error
  } finally {
    client.release()
  }
}

setupSuperAdmin()
  .then(() => { console.log("✅ Script completed successfully"); process.exit(0) })
  .catch((error) => { console.error("Script failed:", error); process.exit(1) })

