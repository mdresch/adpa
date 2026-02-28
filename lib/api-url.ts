/**
 * Utility for constructing API URLs consistently across the application
 * Handles NEXT_PUBLIC_API_URL with or without /api suffix and trailing slashes
 */

/**
 * Get the base API URL with /api suffix
 * @returns Full API base URL (e.g., "https://example.com/api")
 */
export function getApiBaseUrl(): string {
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
  // Remove trailing slashes and /api if present, then add /api once
  const cleanUrl = rawApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
  return `${cleanUrl}/api`
}

/**
 * Get the WebSocket URL (without /api suffix)
 * @returns WebSocket base URL (e.g., "https://example.com")
 */
export function getWsUrl(): string {
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
  // Remove trailing slashes and /api if present
  return rawApiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '')
}

/**
 * Construct a full API URL for a given endpoint
 * @param endpoint - API endpoint (e.g., "/documents", "/auth/login")
 * @returns Full API URL (e.g., "https://example.com/api/documents")
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl()
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${baseUrl}${cleanEndpoint}`
}

