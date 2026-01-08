// JS shim to allow plain `node` scripts to require the TypeScript DB wrapper.
// It will register ts-node if available and then load the .ts implementation.
let mod
try {
  // Require the TypeScript implementation directly to avoid resolving this shim (.js)
  mod = require('./db.ts')
} catch (e) {
  try {
    require('ts-node/register')
    try { require('tsconfig-paths/register') } catch (e) {}
    mod = require('./db.ts')
  } catch (e2) {
    // Could not load TypeScript implementation; fall back to JS Pool implementation below
    mod = null
  }
}

// Normalize CommonJS/ESM/TS default export shapes
const normalized = (function(m){
  if (!m) return m
  if (typeof m.query === 'function') return m
  if (m.default && typeof m.default.query === 'function') return m.default
  // Fallback: if default exists and has initDb/query, use it
  if (m.default && (typeof m.default.initDb === 'function' || typeof m.default.query === 'function')) return m.default
  return m
})(mod)

module.exports = normalized

// If normalization failed (no query function available), provide a lightweight JS fallback
if (!normalized || typeof normalized.query !== 'function') {
  const { Pool } = require('pg')
  let pool = null

  async function initDb() {
    if (pool) return
    const conn = process.env.DATABASE_URL || process.env.POSTGRES_URL
    if (!conn) throw new Error('DATABASE_URL not set')
    pool = new Pool({ connectionString: conn })
  }

  async function query(text, params) {
    await initDb()
    return pool.query(text, params)
  }

  function getPool() {
    if (!pool) throw new Error('Database not initialized')
    return pool
  }

  async function end() {
    if (!pool) return
    try { await pool.end() } catch (e) {}
    pool = null
  }

  module.exports = { initDb, query, getPool, end }
}
