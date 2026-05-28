import { getApiBaseUrl, getApiUrl } from "./api-url"

/**
 * Guards against SSRF when building fetch targets from strings that may originate from callers.
 * Only same-origin relative paths are allowed (no protocol, no host, no traversal).
 * Use `fetchRelativeApi` / `fetchRitualApi` instead of calling `fetch` with dynamic URLs.
 */

/** After structural checks, path must match this allowlist before any HTTP client use. */
const RELATIVE_API_PATH_RE = /^\/api\/[A-Za-z0-9._/-]+$/
const RELATIVE_API_QUERY_RE = /^\?[A-Za-z0-9._~%=&+,-]*$/

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
  const [pathname, search, extra] = p.split("?")
  if (extra !== undefined || !RELATIVE_API_PATH_RE.test(pathname)) {
    throw new Error("Request path must be under /api/ with safe characters only")
  }
  if (search !== undefined && !RELATIVE_API_QUERY_RE.test(`?${search}`)) {
    throw new Error("Request path must be under /api/ with safe characters only")
  }
  return p
}

/**
 * Resolve a validated relative API path to the fetch target (browser: same-origin path;
 * server: URL built only from NEXT_PUBLIC_API_URL, never from caller-supplied hosts).
 */
export function resolveRelativeApiFetchTarget(path: string): string {
  const safePath = assertRelativeApiPath(path)
  const apiBase = getApiBaseUrl()
  if (apiBase === "/api" || apiBase.startsWith("/")) {
    return safePath
  }
  const suffix = safePath.startsWith("/api") ? safePath.slice(4) : safePath
  const endpoint = suffix.startsWith("/") ? suffix : `/${suffix}`
  return getApiUrl(endpoint)
}

function assertFetchOriginMatchesConfig(url: string): void {
  const configured = getApiBaseUrl()
  if (!configured.startsWith("http")) return
  const allowedOrigin = new URL(configured.replace(/\/api\/?$/, "") || configured).origin
  const actualOrigin = new URL(url).origin
  if (actualOrigin !== allowedOrigin) {
    throw new Error("API URL origin mismatch")
  }
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
  const requestTarget = resolveRelativeApiFetchTarget(path)
  if (!requestTarget.startsWith("/")) {
    assertFetchOriginMatchesConfig(requestTarget)
  }
  return fetch(requestTarget, init) // codacy-disable-line SecurityRisk -- allowlisted /api path via resolveRelativeApiFetchTarget
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
  return fetch(safeUrl, init) // codacy-disable-line SecurityRisk -- env origin + assertRitualApiPath allowlist
}
