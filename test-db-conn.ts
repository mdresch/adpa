import dotenv from "dotenv"
import path from "path"
import { Pool } from "pg"

dotenv.config({ path: path.resolve(__dirname, "server/.env") })

const DATABASE_URL = process.env.DATABASE_URL
const DB_SSL = process.env.DB_SSL

console.log("DATABASE_URL:", DATABASE_URL ? DATABASE_URL.substring(0, 50) + "..." : "undefined")
console.log("DB_SSL:", DB_SSL)

const isTrustedPoolingProvider = (target?: string) =>
  !!target && (target.includes("supabase.co") || target.includes("supabase.com") || target.includes("azure"))

const target = DATABASE_URL || ""
const trusted = isTrustedPoolingProvider(target)
console.log("Is trusted provider:", trusted)

const sslConfig = trusted ? { rejectUnauthorized: false } : (DB_SSL === "true" ? { rejectUnauthorized: true } : false)
console.log("SSL Config:", JSON.stringify(sslConfig))

async function test() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: sslConfig,
  })

  try {
    console.log("Attempting to connect...")
    const client = await pool.connect()
    console.log("Connected!")
    const res = await client.query("SELECT NOW()")
    console.log("Query result:", res.rows[0])
    client.release()
  } catch (err) {
    console.error("Connection failed:", err)
  } finally {
    await pool.end()
  }
}

test()
