"use client"

import { useState, useEffect, useCallback } from "react"
import { apiClient } from "@/lib/api"

interface UseApiOptions {
  dependencies?: unknown[]
  enabled?: boolean
}

interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Type-safe API hook for fetching data from the backend
 * @param endpoint - The API endpoint to call
 * @param options - Options for the hook including dependencies and enabled state
 * @returns Object with data, loading, error states and refetch function
 */
export function useApi<T>(
  endpoint: string,
  options?: UseApiOptions,
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await apiClient.get<T>(endpoint)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  useEffect(() => {
    if (options?.enabled === false) {
      setLoading(false)
      return
    }

    fetchData()
  }, options?.dependencies || [fetchData])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  return { data, loading, error, refetch }
}
