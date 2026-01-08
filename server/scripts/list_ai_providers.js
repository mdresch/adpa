const db = require('../src/lib/db.js')
async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set in the environment')
    process.exit(1)
  }

  try {
    await db.initDb()
    const res = await db.query('SELECT * FROM ai_providers ORDER BY created_at')
    console.log('ai_providers rows:', JSON.stringify(res.rows, null, 2))
  } catch (err) {
    console.error('Query failed:', err && err.message ? err.message : err)
    process.exitCode = 2
  } finally {
    try { await db.end() } catch (e) {}
  }
}

main()
.catch(err => {
  console.error('Unexpected error:', err)
  process.exit(3)
})
