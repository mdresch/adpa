"use client"

import { useState, useEffect, useCallback } from 'react'
import LessonDialog, { LessonItem } from './LessonDialog'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from '@/lib/notify'
import { Badge } from '@/components/ui/badge'

interface LessonsTabProps {
  projectId: string
}

export default function LessonsTab({ projectId }: LessonsTabProps) {
  const [items, setItems] = useState<LessonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<LessonItem | null>(null)

  const fetchLessons = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch lessons from the correct API endpoint
      const resp = await apiClient.get<{ success: boolean; data: LessonItem[] }>(`lessons/projects/${projectId}/lessons`)

      if (resp && resp.success) {
        setItems(resp.data || [])
      } else {
        setItems([])
        throw new Error('Failed to fetch lessons')
      }
    } catch (err: unknown) {
      console.error('Failed to load lessons:', err)
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      toast.error(`Failed to load lessons: ${errorMessage}`)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    void fetchLessons()
  }, [fetchLessons])

  const handleCreate = () => {
    setSelectedLesson(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (lesson: LessonItem) => {
    setSelectedLesson(lesson)
    setIsDialogOpen(true)
  }

  const handleSave = (lesson: LessonItem) => {
    // Refresh the list after saving
    fetchLessons()
  }

  if (loading) {
    return <div className="py-8 text-center">Loading lessons…</div>
  }

  if (error) {
    return (
      <div className="py-8 text-center text-destructive">Unable to load lessons: {error}</div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Lessons Learned</h2>
          <p className="text-sm text-muted-foreground">A log of valuable experiences from this project.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleCreate} size="sm">
            Create Lesson
          </Button>
          <Button onClick={() => void fetchLessons()} size="sm" variant="outline">Refresh</Button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">No lessons have been documented for this project yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((lesson: LessonItem) => (
            <Card key={lesson.id} className="border">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{lesson.title}</CardTitle>
                    <div className="flex gap-2">
                      <Badge variant="outline">{lesson.status}</Badge>
                      {lesson.phase && <Badge variant="secondary" className="text-xs">{lesson.phase}</Badge>}
                    </div>
                  </div>
                  <Badge variant={lesson.positive_or_negative ? 'default' : 'destructive'}>
                    {lesson.positive_or_negative ? 'Positive' : 'Negative'}
                  </Badge>
                </div>
                <CardDescription>{new Date(lesson.created_at).toLocaleDateString()}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{lesson.description}</p>
                <div className="flex items-center justify-between mt-auto pt-4 border-t">
                  <div className="flex gap-2">
                    <Badge variant="secondary">{lesson.category}</Badge>
                    <Badge variant={lesson.severity === 'critical' ? 'destructive' : 'outline'}>
                      {lesson.severity}
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(lesson)}>Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LessonDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSave}
        projectId={projectId}
        lesson={selectedLesson}
      />
    </div>
  )
}
