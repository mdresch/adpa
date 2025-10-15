export function getInitials(input?: string | { name?: string } | null) {
  try {
    if (!input) return "?"
    const name = typeof input === "string" ? input : input.name || ""
    if (!name) return "?"

    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return "?"
    if (parts.length === 1) {
      // Single word name: return first two characters uppercased
      return parts[0].slice(0, 2).toUpperCase()
    }
    // Use first char of first and last parts
    const first = parts[0][0] || ''
    const last = parts[parts.length - 1][0] || ''
    return (first + last).toUpperCase()
  } catch (err) {
    return "?"
  }
}
