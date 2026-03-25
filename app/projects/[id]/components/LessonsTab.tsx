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

  const handleApprove = async (lesson: LessonItem) => {
    try {
      if (!lesson.id) return
      const resp = await apiClient.put<{ success: boolean }>(`lessons/lessons/${lesson.id}`, {
        status: 'documented'
      })
      if (resp && resp.success) {
        toast.success('Lesson approved')
        void fetchLessons()
      }
    } catch (err) {
      console.error('Failed to approve lesson:', err)
      toast.error('Failed to approve lesson')
    }
  }

  const handleDismiss = async (lesson: LessonItem) => {
    try {
      if (!lesson.id) return
      const resp = await apiClient.delete<{ success: boolean }>(`lessons/lessons/${lesson.id}`)
      if (resp && resp.success) {
        toast.success('Lesson dismissed')
        void fetchLessons()
      }
    } catch (err) {
      console.error('Failed to dismiss lesson:', err)
      toast.error('Failed to dismiss lesson')
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

  const suggestions = items.filter(i => i.status === 'identified')
  const finalized = items.filter(i => i.status !== 'identified')

  return (
    <div className="space-y-6">
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

      {suggestions.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              AI Suggestions for Completion
            </CardTitle>
            <CardDescription>
              We've identified these lessons and accomplishments from your completed project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {suggestions.map((lesson: LessonItem) => (
              <div key={lesson.id} className="flex flex-col gap-3 p-4 rounded-lg bg-background border shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{lesson.title}</h4>
                      <Badge variant={lesson.category === 'accomplishment' ? 'default' : 'outline'}>
                        {lesson.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{lesson.description}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="default" size="sm" onClick={() => handleApprove(lesson)}>Approve</Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(lesson)}>Edit</Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDismiss(lesson)}>Dismiss</Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {finalized.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground border rounded-lg border-dashed">
          {suggestions.length > 0 
            ? "Finalize suggestions or create a new lesson to see it here." 
            : "No lessons have been documented for this project yet."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {finalized.map((lesson: LessonItem) => (
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
                <CardDescription>{new Date(lesson.created_at || '').toLocaleDateString()}</CardDescription>
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
