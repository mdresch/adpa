import { NextResponse } from "next/server"
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-utils"

// Removed: This route imported backend-only code and cannot run in the Next.js API context.
// Please POST directly to the backend Express API for portfolio rankings.

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()


  // Removed: connectDatabase call as it is no longer needed.

  try {
    const { searchParams } = new URL(req.url)
    const limit = Math.max(1, Math.min(200, parseInt(searchParams.get("limit") || "50", 10)))
    const offset = Math.max(0, parseInt(searchParams.get("offset") || "0", 10))

    const totalResult = await pool.query(`SELECT COUNT(*)::int as total FROM public.portfolio_rankings`)
    const total = totalResult.rows[0]?.total ?? 0

    const rankings = await pool.query(
      `
      SELECT
        pr.*,
        p.status,
        p.start_date,
        p.end_date,
        p.budget
      FROM public.portfolio_rankings pr
      JOIN public.projects p ON pr.project_id = p.id
      ORDER BY pr.rank ASC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    )

    return NextResponse.json({
      rankings: rankings.rows,
      total,
      limit,
      offset,
    })
  } catch (error) {
    logger.error("GET /api/portfolio/rankings failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

