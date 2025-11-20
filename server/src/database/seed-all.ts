import { logger } from "../utils/logger"
import { runMigrations } from "./migrate"
import { seedDatabase } from "./seed"
import { seedAdpaDocuments } from "./seed-adpa-documents"
import { seedSkillsAndCompetencies } from "./seed-skills-competencies"

async function seedAll() {
  try {
    logger.info("🚀 Starting complete database setup...")

    // Step 1: Run migrations
    logger.info("📋 Step 1: Running database migrations...")
    await runMigrations()
    logger.info("✅ Migrations completed")

    // Step 2: Seed basic data (users, permissions, etc.)
    logger.info("👥 Step 2: Seeding basic database data...")
    await seedDatabase()
    logger.info("✅ Basic seeding completed")

    // Step 3: Seed Skills and Competencies
    logger.info("🛠️ Step 3: Seeding skills and competencies...")
    await seedSkillsAndCompetencies()
    logger.info("✅ Skills and competencies seeding completed")

    // Step 4: Seed ADPA project documents
    logger.info("📚 Step 4: Seeding ADPA project documents...")
    await seedAdpaDocuments()
    logger.info("✅ ADPA documents seeding completed")

    logger.info("🎉 Complete database setup finished successfully!")
    logger.info("📊 Your ADPA system is now ready with:")
    logger.info("   - ✅ Database schema (migrations)")
    logger.info("   - ✅ Users and permissions")
    logger.info("   - ✅ Skills and competencies catalog")
    logger.info("   - ✅ ADPA project with 126+ documents")
    logger.info("   - ✅ Ready for Confluence integration testing")

  } catch (error) {
    logger.error("❌ Database setup failed:", error)
    throw error
  }
}

// Run if called directly
if (require.main === module) {
  seedAll()
    .then(() => {
      logger.info("🎯 All seeding operations completed successfully")
      process.exit(0)
    })
    .catch((error) => {
      logger.error("💥 Seeding failed:", error)
      process.exit(1)
    })
}

export { seedAll }
