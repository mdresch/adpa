import { getApiBaseUrl } from "./api-url"

/**
 * Guards against SSRF when building fetch targets from strings that may originate from callers.
 * Only same-origin relative paths are allowed (no protocol, no host, no traversal).
 * Use `fetchRelativeApi` / `fetchRitualApi` instead of calling `fetch` with dynamic URLs.
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

/** Fixed Ritual orchestrator routes (no arbitrary path segments). */
const RITUAL_FIXED_PATHS = new Set([
  "/phase0/ingest",
  "/phase0/business-case",
  "/phase0/approve",
  "/rtm/propose-amendment",
  "/rtm/decide-amendment",
  "/rtm/apply-amendment",
  "/ledger/ideation",
  "/ledger/rtm",
])

const RITUAL_RESEARCH_ADVICE_PATH = /^\/rtm\/research-advice\/[A-Za-z0-9._-]+$/

/** Whitelist path suffix under `/api/Ritual` (leading slash required). */
export function assertRitualApiPath(path: string): string {
  const trimmed = path.trim()
  if (!trimmed.startsWith("/")) {
    throw new Error("Ritual path must start with /")
  }
  if (trimmed.includes("://") || trimmed.startsWith("//")) {
    throw new Error("Ritual path must not be an absolute URL")
  }
  if (RITUAL_FIXED_PATHS.has(trimmed)) {
    return trimmed
  }
  if (RITUAL_RESEARCH_ADVICE_PATH.test(trimmed)) {
    return trimmed
  }
  throw new Error("Disallowed ritual API path")
}

function assertOrchestratorOrigin(origin: string): string {
  const trimmed = origin.trim().replace(/\/$/, "")
  if (!/^https?:\/\/[a-zA-Z0-9.-]+(?::\d+)?$/.test(trimmed)) {
    throw new Error("Invalid orchestrator origin")
  }
  return trimmed
}

/** Build a fetchable Ritual URL from a whitelisted path suffix (e.g. `/phase0/ingest`). */
export function resolveRitualRequestUrl(pathSuffix: string): string {
  const safeSuffix = assertRitualApiPath(pathSuffix)
  const explicit = process.env.NEXT_PUBLIC_ORCHESTRATOR_URL?.trim()
  if (explicit) {
    const origin = assertOrchestratorOrigin(explicit)
    return `${origin}/api/Ritual${safeSuffix}`
  }
  const ritualBase = `${getApiBaseUrl()}/Ritual`
  return assertRelativeApiPath(`${ritualBase}${safeSuffix}`)
}

/**
 * `fetch` for same-origin relative API paths only (validated, not user-controlled hosts).
 */
export async function fetchRelativeApi(path: string, init?: RequestInit): Promise<Response> {
  const safeUrl = assertRelativeApiPath(path)
  // codacy-disable-next-line SecurityRisk.SSRF -- path validated by assertRelativeApiPath (relative, no scheme)
  return fetch(safeUrl, init)
}

/**
 * `fetch` for Ritual orchestrator routes (fixed allowlist + research-advice id segment).
 */
export async function fetchRitualApi(pathSuffix: string, init?: RequestInit): Promise<Response> {
  const safeUrl = resolveRitualRequestUrl(pathSuffix)
  if (safeUrl.startsWith("/")) {
    return fetchRelativeApi(safeUrl, init)
  }
  const allowedOrigin = assertOrchestratorOrigin(
    process.env.NEXT_PUBLIC_ORCHESTRATOR_URL?.trim() || ""
  )
  if (!safeUrl.startsWith(`${allowedOrigin}/`)) {
    throw new Error("Ritual URL origin mismatch")
  }
  // codacy-disable-next-line SecurityRisk.SSRF -- URL built only from env origin + assertRitualApiPath allowlist
  return fetch(safeUrl, init)
}
