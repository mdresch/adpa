**DB Singleton & Usage**

- **Location:** `server/src/lib/db.ts`
- **Purpose:** Centralize Postgres `Pool` usage, provide a `query()` wrapper with retry/backoff, and exported helpers: `initDb()`, `query()`, `getPool()`, `end()`.
- **How to use in runtime code:**
  - Import the default: `import db from '../lib/db'`
  - Ensure initialization during app startup: `await db.initDb()` (the app's existing startup should call `connectDatabase` via `server/src/database/connection.ts` already).
  - Use `await db.query(sql, params)` instead of constructing a local `Pool`.
- **Scripts / CLI:** For one-off scripts, call `await db.initDb()` before queries and `await db.end()` when finished.
- **Benefits:**
  - Single place to manage connection options (timeouts, ssl, pool sizing).
  - Retries and exponential backoff for transient DB failures.
  - Circuit-breaker behavior remains implemented in `server/src/database/connection.ts`.

If you need me to apply the refactor across additional files beyond the core runtime routes and seed script I updated, tell me `ApplyAll` and I'll run a codemod across `server/**`.
