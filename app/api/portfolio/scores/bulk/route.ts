import { NextResponse } from "next/server"
import { getAuthenticatedUser, unauthorizedResponse } from "@/lib/auth-utils"
import { connectDatabase, pool } from "@/server/src/database/connection"
import { refreshPortfolioRankings } from "@/server/src/database/refresh-portfolio-rankings"
import { logger } from "@/server/src/utils/logger"

type BulkScoreItem = {
  criterion_id: string
  score: number
  rationale?: string | null
}

type BulkScoreBody = {
  project_id?: string
  scores?: BulkScoreItem[]
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  const client = await pool.connect()
  try {
    const body = (await req.json()) as BulkScoreBody
    const projectId = body.project_id
    const scores = body.scores

    if (!projectId || !Array.isArray(scores) || scores.length === 0) {
      return NextResponse.json({ error: "project_id and scores[] are required" }, { status: 400 })
    }

    await client.query("BEGIN")

    for (const item of scores) {
      if (!item?.criterion_id || typeof item.score !== "number") {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "each score must include criterion_id and score" }, { status: 400 })
      }

      // Validate score range
      const criterion = await client.query(
        `SELECT min_score, max_score FROM public.portfolio_criteria WHERE id = $1 AND is_active = true`,
        [item.criterion_id]
      )
      if (criterion.rows.length === 0) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: `criterion not found: ${item.criterion_id}` }, { status: 404 })
      }

      const minScore = Number(criterion.rows[0].min_score)
      const maxScore = Number(criterion.rows[0].max_score)
      if (!Number.isFinite(item.score) || item.score < minScore || item.score > maxScore) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "Score out of valid range" }, { status: 400 })
      }

      await client.query(
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
        `,
        [projectId, item.criterion_id, item.score, item.rationale ?? null, user.id]
      )
    }

    await client.query("COMMIT")

    try {
      await refreshPortfolioRankings()
    } catch (e) {
      logger.error("refresh_portfolio_rankings failed after bulk score upsert", e)
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    try {
      await client.query("ROLLBACK")
    } catch {
      // ignore
    }
    logger.error("POST /api/portfolio/scores/bulk failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    client.release()
  }
}

