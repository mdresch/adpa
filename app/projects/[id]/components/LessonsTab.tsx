"use client"

import React, { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/lib/notify'

interface LessonsTabProps {
  projectId: string
}

interface LessonItem {
  knowledge_entry_id?: string
  id?: string
  title: string
  reasoning?: string
  description?: string
  entry_type?: string
  type?: string
  source_project_name?: string
}

export default function LessonsTab({ projectId }: LessonsTabProps) {
  const [items, setItems] = useState<LessonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Knowledge-base recommendations are scoped to the project
      // Suppress not-found logs for this call — if recommendations don't exist yet for a project
      const resp = await apiClient.get<{ success: boolean; data: any[] }>(`/knowledge-base/recommendations/${projectId}`, { suppressNotFoundError: true })

      if (!resp || !resp.success) {
        setItems([])
        return
      }

      // Filter for recommendations that look like lessons learned
      const lessons = (resp.data || []).filter((e: any) => {
        const type = String(e.entry_type || e.type || '')
        const title = String(e.title || '')
        return type.toLowerCase().includes('lesson') || title.toLowerCase().includes('lesson')
      })

      setItems(lessons)
    } catch (err: unknown) {
      // If the server returns 404 (no recommendations for this project yet), treat it as 'no items' (not an error)
      const status = (err as any)?.status
      if (status === 404) {
        setItems([])
        setError(null)
        setLoading(false)
        return
      }
      console.error('Failed to load lessons:', err)
      setItems([])
      setError(err instanceof Error ? err.message : 'Failed to load lessons')
      toast.error('Failed to load lessons')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchLessons()
  }, [fetchLessons])

  const handleApply = async (entryId: string) => {
    try {
      const response = await apiClient.post(`/knowledge-base/applications`, {
        entry_id: entryId,
        project_id: projectId,
      })

      if (response && response.success) {
        toast.success('Applied lesson to project')
      } else {
        throw new Error('Failed to apply')
      }
    } catch (err: unknown) {
      console.error('Apply failed', err)
      toast.error('Failed to apply lesson')
    }
  }

  if (loading) {
    return <div className="py-8 text-center">Loading lessons…</div>
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">Unable to load lessons: {error}</div>
    )
  }

  if (!items || items.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No lessons learned recommendations available for this project.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lessons learned</h2>
          <p className="text-sm text-muted-foreground">Actionable recommendations extracted for this project</p>
        </div>
        <div>
          <Button onClick={() => void fetchLessons()} size="sm" variant="outline">Refresh</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {items.map((entry: any) => (
          <Card key={entry.knowledge_entry_id || entry.id} className="border">
            <CardHeader>
              <CardTitle>{entry.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-sm text-muted-foreground">{entry.reasoning || entry.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {entry.source_project_name ? (<span>From: {entry.source_project_name}</span>) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => void handleApply(entry.knowledge_entry_id || entry.id)}>
                    Apply
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
