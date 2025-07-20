"use client"

import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api"

export function useApi<T>(
  endpoint: string,
  options?: {
    dependencies?: any[]
    enabled?: boolean
  },
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (options?.enabled === false) return

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await (apiClient as any).request(endpoint)
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, options?.dependencies || [])

  const refetch = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await (apiClient as any).request(endpoint)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, refetch }
}
