import { NextResponse } from "next/server"
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-utils"
import { connectDatabase, pool } from "@/server/src/database/connection"
import { refreshPortfolioRankings } from "@/server/src/database/refresh-portfolio-rankings"
import { logger } from "@/server/src/utils/logger"

type PostScoreBody = {
  project_id?: string
  criterion_id?: string
  score?: number
  rationale?: string | null
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("project_id")
    if (!projectId) return NextResponse.json({ error: "project_id is required" }, { status: 400 })

    const result = await pool.query(
      `
      SELECT
        ps.*,
        pc.name as criterion_name,
        pc.weight,
        u.email as scored_by_email
      FROM public.portfolio_scores ps
      JOIN public.portfolio_criteria pc ON ps.criterion_id = pc.id
      LEFT JOIN public.users u ON ps.scored_by = u.id
      WHERE ps.project_id = $1
      ORDER BY pc.name ASC
      `,
      [projectId]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    logger.error("GET /api/portfolio/scores failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const body = (await req.json()) as PostScoreBody
    const projectId = body.project_id
    const criterionId = body.criterion_id
    const score = body.score

    if (!projectId || !criterionId || typeof score !== "number") {
      return NextResponse.json(
        { error: "project_id, criterion_id, and score are required" },
        { status: 400 }
      )
    }

    // Validate score range against criterion
    const criterion = await pool.query(
      `SELECT min_score, max_score FROM public.portfolio_criteria WHERE id = $1 AND is_active = true`,
      [criterionId]
    )

    if (criterion.rows.length === 0) {
      return NextResponse.json({ error: "criterion not found or inactive" }, { status: 404 })
    }

    const minScore = Number(criterion.rows[0].min_score)
    const maxScore = Number(criterion.rows[0].max_score)

    if (!Number.isFinite(score) || score < minScore || score > maxScore) {
      return NextResponse.json({ error: "Score out of valid range" }, { status: 400 })
    }

    const result = await pool.query(
      `
      INSERT INTO public.portfolio_scores (project_id, criterion_id, score, rationale, scored_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (project_id, criterion_id)
      DO UPDATE SET
        score = EXCLUDED.score,
        rationale = EXCLUDED.rationale,
        scored_by = EXCLUDED.scored_by,
        scored_at = now(),
        updated_at = now()
      RETURNING *
      `,
      [projectId, criterionId, score, body.rationale ?? null, user.id]
    )

    try {
      await refreshPortfolioRankings()
    } catch (e) {
      logger.error("refresh_portfolio_rankings failed after score upsert", e)
    }

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error) {
    logger.error("POST /api/portfolio/scores failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

