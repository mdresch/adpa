import { assertRelativeApiPath, fetchRelativeApi } from "@/lib/safe-http-path"

/** Status codes returned when Next.js cannot reach BACKEND_URL (proxy failure). */
const RETRYABLE_STATUS = new Set([502, 503, 504])

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"))
      return
    }
    const timer = setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
      },
      { once: true }
    )
  })
}

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  const message = error instanceof Error ? error.message : String(error)
  return /failed to fetch|network|ECONNREFUSED|fetch failed/i.test(message)
}

export type FetchBackendJsonOptions = {
  /** Default 12 attempts × 2s ≈ 24s — covers slow Supabase + dependency startup */
  maxAttempts?: number
  delayMs?: number
  signal?: AbortSignal
}

/**
 * Fetch a JSON API route via the Next.js proxy with retries while the Express backend boots.
 */
export async function fetchBackendJson<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit,
  options?: FetchBackendJsonOptions
): Promise<{ response: Response; data: T }> {
  const safeUrl = assertRelativeApiPath(url)
  const maxAttempts = options?.maxAttempts ?? 12
  const delayMs = options?.delayMs ?? 2000
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }

    try {
      const response = await fetchRelativeApi(safeUrl, { ...init, signal: options?.signal })
      let data: T
      try {
        data = (await response.json()) as T
      } catch {
        data = {} as T
      }

      if (response.ok) {
        return { response, data }
      }

      if (!RETRYABLE_STATUS.has(response.status)) {
        const message =
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error?: string }).error)
            : `Request failed (${response.status})`
        throw new Error(message)
      }

      lastError = new Error(
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error?: string }).error)
          : `API temporarily unavailable (${response.status})`
      )
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error
      }
      lastError = error
      if (!isNetworkError(error) && error instanceof Error) {
        throw error
      }
    }

    if (attempt < maxAttempts) {
      await sleep(delayMs, options?.signal)
    }
  }

  if (isNetworkError(lastError)) {
    throw new Error(
      "Backend API is not reachable yet. Ensure `cd server && pnpm dev` is running on port 5000, then use Refresh threads."
    )
  }

  throw lastError instanceof Error ? lastError : new Error("Backend API request failed")
}
