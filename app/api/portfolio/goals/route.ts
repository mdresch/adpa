import { NextResponse } from "next/server"
import { getAuthenticatedUser, forbiddenResponse, unauthorizedResponse } from "@/lib/auth-utils"
import { connectDatabase, pool } from "@/server/src/database/connection"
import { logger } from "@/server/src/utils/logger"

const GOAL_STATUSES = new Set(["active", "achieved", "deferred", "cancelled"])

type KeyResultInput = {
  description?: string
  target_value?: number | null
  unit?: string | null
  due_date?: string | null
}

type PostBody = {
  title?: string
  description?: string | null
  category?: string | null
  target_date?: string | null
  priority?: number
  owner_id?: string | null
  key_results?: KeyResultInput[]
}

export async function GET(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()

  await connectDatabase()

  try {
    const { searchParams } = new URL(req.url)
    const status = (searchParams.get("status") || "active").toLowerCase()

    if (!GOAL_STATUSES.has(status)) {
      return NextResponse.json({ error: "invalid status filter" }, { status: 400 })
    }

    const result = await pool.query(
      `
      SELECT
        sg.*,
        u.email AS owner_email,
        (SELECT COUNT(*)::int FROM public.project_strategic_goals WHERE goal_id = sg.id) AS project_count,
        (SELECT COUNT(*)::int FROM public.strategic_key_results WHERE goal_id = sg.id) AS key_result_count
      FROM public.strategic_goals sg
      LEFT JOIN public.users u ON sg.owner_id = u.id
      WHERE sg.status = $1
      ORDER BY sg.priority DESC NULLS LAST, sg.title ASC
      `,
      [status]
    )

    return NextResponse.json(result.rows)
  } catch (error) {
    logger.error("GET /api/portfolio/goals failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const user = await getAuthenticatedUser(req)
  if (!user) return unauthorizedResponse()
  if (!(user.role === "admin" || user.role === "super_admin")) return forbiddenResponse()

  await connectDatabase()

  const body = (await req.json()) as PostBody
  const title = body.title?.trim()
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 })
  }

  const priority = typeof body.priority === "number" && Number.isFinite(body.priority) ? body.priority : 0
  const ownerId = body.owner_id ?? user.id

  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const goalResult = await client.query(
      `
      INSERT INTO public.strategic_goals (
        title, description, category, target_date, priority, owner_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
      `,
      [
        title,
        body.description ?? null,
        body.category ?? null,
        body.target_date || null,
        priority,
        ownerId,
      ]
    )

    const goalId = goalResult.rows[0].id as string
    const keyResults = Array.isArray(body.key_results) ? body.key_results : []

    for (const kr of keyResults) {
      const desc = kr.description?.trim()
      if (!desc) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "each key result requires description" }, { status: 400 })
      }
      const targetVal =
        kr.target_value === null || kr.target_value === undefined ? null : Number(kr.target_value)
      if (targetVal !== null && !Number.isFinite(targetVal)) {
        await client.query("ROLLBACK")
        return NextResponse.json({ error: "invalid target_value on key result" }, { status: 400 })
      }

      await client.query(
        `
        INSERT INTO public.strategic_key_results (
          goal_id, description, target_value, unit, due_date
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [goalId, desc, targetVal, kr.unit ?? null, kr.due_date || null]
      )
    }

    await client.query("COMMIT")
    return NextResponse.json(goalResult.rows[0], { status: 201 })
  } catch (error: unknown) {
    try {
      await client.query("ROLLBACK")
    } catch {
      /* ignore */
    }
    const code = (error as { code?: string })?.code
    if (code === "23505") {
      return NextResponse.json({ error: "a goal with this title may already exist" }, { status: 409 })
    }
    logger.error("POST /api/portfolio/goals failed", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  } finally {
    client.release()
  }
}
