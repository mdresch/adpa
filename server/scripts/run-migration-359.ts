/**
 * Run Migration 359: Add updated_at to morphic_chats
 * Using 'postgres' library to match MorphicRepository
 */

import dotenv from "dotenv"
import * as fs from "fs"
import * as path from "path"
import postgres from "postgres"

// Load environment variables
const envPath = path.resolve(__dirname, "../../.env")
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
} else {
  dotenv.config()
}

async function runMigration() {
  let connectionString = process.env.MORPHIC_DATABASE_URL;
  if (!connectionString) {
      console.error("❌ MORPHIC_DATABASE_URL not set");
      process.exit(1);
  }

  if (!connectionString.includes("sslmode=")) {
      connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=require";
  }

  const sslConfig =
    process.env.DATABASE_SSL_DISABLED === 'true' || 
    process.env.DB_SSL === 'false' || 
    process.env.MORPHIC_DB_SSL === 'false'
        ? false
        : { rejectUnauthorized: false };

  const sql = postgres(connectionString, {
    ssl: sslConfig,
    prepare: false,
    connect_timeout: 30
  });

  try {
    console.log("🚀 Running Migration 359: Add updated_at to morphic_chats\n")

    // Check if column already exists
    const columnCheck = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'morphic_chats' AND column_name = 'updated_at'
    `;

    if (columnCheck.length > 0) {
      console.log("   ⚠️  Column 'updated_at' already exists in 'morphic_chats'")
      return
    }

    // Execute migration
    const migrationPath = path.join(__dirname, "../migrations/359_add_morphic_chats_updated_at.sql")
    const migrationSQL = fs.readFileSync(migrationPath, "utf-8")
    
    console.log("🔄 Executing migration...")
    await sql.begin(async (sql) => {
      // postgres.js doesn't support multiple statements in one tagged template easily if they are not separated or if it's a single string.
      // But we can execute the whole string if it's one statement or use sql.unsafe.
      await sql.unsafe(migrationSQL);
    });
    
    console.log("✅ Migration executed successfully\n")

  } catch (error: any) {
    console.error("\n❌ Migration failed:", error.message)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

runMigration()
