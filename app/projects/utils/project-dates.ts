/** Normalize API date strings to YYYY-MM-DD for <input type="date"> */
export function normalizeProjectDate(d?: string | null): string {
  try {
    if (!d) return ""
    const dt = new Date(d)
    if (isNaN(dt.getTime())) return ""

    const year = dt.getFullYear()
    const month = String(dt.getMonth() + 1).padStart(2, "0")
    const day = String(dt.getDate()).padStart(2, "0")
    return `${year}-${month}-${day}`
  } catch {
    return ""
  }
}
