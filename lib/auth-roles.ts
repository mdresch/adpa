/**
 * Normalize user role strings from DB / Firebase for comparisons.
 * Handles casing, spaces, and hyphenated variants (e.g. "Super Admin", "super-admin").
 */
export function normalizeAppRole(role: string | null | undefined): string {
  if (role == null) return ""
  return String(role)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
}

/** Roles that may access admin-only navigation (UI); API still enforces authorization. */
export function isPrivilegedAppRole(role: string | null | undefined): boolean {
  const r = normalizeAppRole(role)
  return r === "admin" || r === "super_admin" || r === "superadmin"
}
