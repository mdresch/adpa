import { NextResponse } from "next/server"
import { getAuthenticatedUser, forbiddenResponse, unauthorizedResponse } from "@/lib/auth-utils"
// Removed: This route imported backend-only code and cannot run in the Next.js API context.
// Please POST directly to the backend Express API for strategic alignment.

const CONTRIBUTION_LEVELS = new Set(["critical", "high", "medium", "low"])

type PostBody = {
  project_id?: string
  goal_id?: string
  contribution_level?: string
  alignment_score?: number | null
  notes?: string | null
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("project_id")
    const goalId = searchParams.get("goal_id")

    if (!projectId && !goalId) {
      return NextResponse.json({ error: "project_id or goal_id is required" }, { status: 400 })
    }
    if (projectId && !isUuid(projectId)) {
      return NextResponse.json({ error: "invalid project_id" }, { status: 400 })
    }
    if (goalId && !isUuid(goalId)) {
      return NextResponse.json({ error: "invalid goal_id" }, { status: 400 })
    }

    let query = `
      SELECT
        psg.*,
        sg.title AS goal_title,
        sg.category AS goal_category,
        sg.priority AS goal_priority,
        p.name AS project_name
      FROM public.project_strategic_goals psg
      JOIN public.strategic_goals sg ON psg.goal_id = sg.id
      JOIN public.projects p ON psg.project_id = p.id
      WHERE 1=1
    `
    const params: string[] = []
    if (projectId) {
      params.push(projectId)
      query += ` AND psg.project_id = $${params.length}`
    }
    if (goalId) {
      params.push(goalId)
      query += ` AND psg.goal_id = $${params.length}`
    }
    query += ` ORDER BY sg.priority DESC NULLS LAST, sg.title ASC`

    const result = await pool.query(query, params)
    return NextResponse.json(result.rows)
  } catch (error) {
    logger.error("GET /api/portfolio/strategic-alignment failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const body = (await req.json()) as PostBody
    const projectId = body.project_id
    const goalId = body.goal_id
    const contributionLevel = (body.contribution_level || "medium").toLowerCase()
    const alignmentScore =
      body.alignment_score === null || body.alignment_score === undefined
        ? null
        : Number(body.alignment_score)
    const notes = body.notes ?? null

    if (!projectId || !goalId) {
      return NextResponse.json({ error: "project_id and goal_id are required" }, { status: 400 })
    }
    if (!isUuid(projectId) || !isUuid(goalId)) {
      return NextResponse.json({ error: "invalid id format" }, { status: 400 })
    }
    if (!CONTRIBUTION_LEVELS.has(contributionLevel)) {
      return NextResponse.json(
        { error: "contribution_level must be critical, high, medium, or low" },
        { status: 400 }
      )
    }
    if (alignmentScore !== null && (!Number.isFinite(alignmentScore) || alignmentScore < 0 || alignmentScore > 1)) {
      return NextResponse.json({ error: "alignment_score must be between 0 and 1" }, { status: 400 })
    }

    const allowed = await userHasProjectAccess(pool, user, projectId)
    if (!allowed) return forbiddenResponse()

    const result = await pool.query(
      `
      INSERT INTO public.project_strategic_goals (
        project_id, goal_id, contribution_level, alignment_score, notes
      )
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (project_id, goal_id)
      DO UPDATE SET
        contribution_level = EXCLUDED.contribution_level,
        alignment_score = EXCLUDED.alignment_score,
        notes = EXCLUDED.notes,
        updated_at = now()
      RETURNING *
      `,
      [projectId, goalId, contributionLevel, alignmentScore, notes]
    )

    return NextResponse.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code
    if (code === "23503") {
      return NextResponse.json({ error: "project or goal not found" }, { status: 400 })
    }
    logger.error("POST /api/portfolio/strategic-alignment failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get("project_id")
    const goalId = searchParams.get("goal_id")

    if (!projectId || !goalId) {
      return NextResponse.json({ error: "project_id and goal_id are required" }, { status: 400 })
    }
    if (!isUuid(projectId) || !isUuid(goalId)) {
      return NextResponse.json({ error: "invalid id format" }, { status: 400 })
    }

    const allowed = await userHasProjectAccess(pool, user, projectId)
    if (!allowed) return forbiddenResponse()

    const del = await pool.query(
      `DELETE FROM public.project_strategic_goals WHERE project_id = $1 AND goal_id = $2`,
      [projectId, goalId]
    )

    if (del.rowCount === 0) {
      return NextResponse.json({ error: "link not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error("DELETE /api/portfolio/strategic-alignment failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
