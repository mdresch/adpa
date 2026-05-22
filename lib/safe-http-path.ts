/**
 * Guards against SSRF when building fetch targets from strings that may originate from callers.
 * Only same-origin relative paths are allowed (no protocol, no host, no traversal).
 */

export function assertRelativeApiPath(path: string): string {
  const p = path.trim()
  if (!p.startsWith("/") || p.startsWith("//")) {
    throw new Error("Request path must be a same-origin relative path")
  }
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(p)) {
    throw new Error("Request path must not contain a protocol")
  }
  if (p.includes("..")) {
    throw new Error("Request path must not contain parent path segments")
  }
  return p
}

/** Single URL path segment (ids, slugs) — blocks injection into ritual/API paths. */
export function assertSafePathSegment(segment: string, label = "path segment"): string {
  const s = segment.trim()
  if (!s || !/^[A-Za-z0-9._-]+$/.test(s)) {
    throw new Error(`Invalid ${label}`)
  }
  return s
}
