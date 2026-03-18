import dotenv from "dotenv"
import path from "path"
import { Pool } from "pg"

// Load root .env.development
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') })

async function checkAIKeys() {
    const morphicUrl = process.env.MORPHIC_DATABASE_URL
    const mainUrl = process.env.DATABASE_URL
    
    // Force insecure SSL for development if needed
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"

    console.log("--- MORPHIC DATABASE ---")
    if (morphicUrl) {
        const pool = new Pool({ connectionString: morphicUrl, ssl: false })
        try {
            const result = await pool.query("SELECT id, name, is_enabled, status, CASE WHEN api_key IS NULL OR api_key = '' THEN 'MISSING' ELSE SUBSTR(api_key, 1, 8) || '...' || SUBSTR(api_key, -4) END as key_preview FROM ai_providers")
            console.table(result.rows)
        } catch (e: any) { 
            console.error("Morphic DB Error:", e.message) 
        } finally { 
            await pool.end() 
        }
    }

    console.log("\n--- MAIN DATABASE ---")
    if (mainUrl) {
        const pool = new Pool({ connectionString: mainUrl, ssl: { rejectUnauthorized: false } })
        try {
            const result = await pool.query("SELECT id, name, is_active, CASE WHEN api_key_encrypted IS NULL OR api_key_encrypted = '' THEN 'MISSING' ELSE 'PRESENT' END as key_status FROM ai_providers")
            console.table(result.rows)
        } catch (e: any) { 
            console.error("Main DB Error:", e.message) 
        } finally { 
            await pool.end() 
        }
    }
    
    console.log("\nChecking environment variables for AI keys:")
    const keys = [
        "OPENAI_API_KEY",
        "GOOGLE_AI_API_KEY",
        "GOOGLE_GENERATIVE_AI_API_KEY",
        "ANTHROPIC_API_KEY",
        "GROQ_API_KEY",
        "MISTRAL_API_KEY"
    ]
    
    const envKeys = keys.map(k => ({
        key: k,
        isSet: !!process.env[k],
        length: process.env[k]?.length || 0,
        preview: process.env[k] ? `${process.env[k].substring(0, 5)}...` : "N/A"
    }))
    console.table(envKeys)
}

checkAIKeys().catch(err => console.error("Global Error:", err))
