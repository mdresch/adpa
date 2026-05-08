import type { AuthenticatedUser } from "@/lib/auth-utils"
import type { Pool } from "pg"

function normalizeTeamMembers(raw: unknown): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === "string" && v.length > 0)
  }
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string" && v.length > 0)
      }
    } catch {
      return raw
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v.length > 0)
    }
  }
  return []
}

/**
 * Returns true if the user may manage project-scoped records (owner, team member, admin).
 */
export async function userHasProjectAccess(
  pool: Pool,
  user: AuthenticatedUser,
  projectId: string
): Promise<boolean> {
  if (user.role === "admin" || user.role === "super_admin") return true

  const r = await pool.query<{ owner_id: string | null; team_members: unknown }>(
    "SELECT owner_id, team_members FROM public.projects WHERE id = $1",
    [projectId]
  )
  if (r.rows.length === 0) return false

  const row = r.rows[0]
  if (row.owner_id === user.id) return true

  const team = normalizeTeamMembers(row.team_members)
  return new Set(team).has(user.id)
}
