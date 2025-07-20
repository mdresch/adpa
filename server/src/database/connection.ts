import { Pool } from "pg"
import { logger } from "../utils/logger"

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number.parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME || "adpa_db",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "password",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
})

export async function connectDatabase() {
  try {
    const client = await pool.connect()
    await client.query("SELECT NOW()")
    client.release()
    logger.info("Database connection established")
  } catch (error) {
    logger.error("Database connection failed:", error)
    throw error
  }
}

export { pool }
