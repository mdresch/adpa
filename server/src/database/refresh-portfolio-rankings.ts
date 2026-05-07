import { getDatabasePool } from "./connection"

/**
 * Refreshes the `public.portfolio_rankings` materialized view.
 *
 * Intended usage:
 * - Admin-only maintenance operations
 * - After bulk score updates
 *
 * Note: `REFRESH MATERIALIZED VIEW CONCURRENTLY` has restrictions and may
 * fall back to a non-concurrent refresh depending on execution context.
 */
export async function refreshPortfolioRankings(): Promise<void> {
  const pool = getDatabasePool()
  await pool.query("select public.refresh_portfolio_rankings();")
}

