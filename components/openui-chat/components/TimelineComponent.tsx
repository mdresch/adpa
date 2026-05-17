/**
 * Timeline Component
 * Renders sequential events or phases with dates and milestones
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { Clock } from "lucide-react"

interface TimelineComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function TimelineComponent({ props, data }: TimelineComponentProps) {
  const title = (props.title as string) || "Timeline"
  const sortedData = [...data].sort((a, b) => {
    const aDate = new Date(String(a.date || a.startDate || 0)).getTime()
    const bDate = new Date(String(b.date || b.startDate || 0)).getTime()
    return aDate - bDate
  })

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedData.map((item, idx) => (
            <div key={idx} className="flex gap-4">
              {/* Timeline marker */}
              <div className="flex flex-col items-center">
                <div className="h-4 w-4 rounded-full border-2 border-orange-600 bg-white" />
                {idx < sortedData.length - 1 && (
                  <div className="h-12 w-0.5 bg-gradient-to-b from-orange-600 to-slate-200" />
                )}
              </div>

              {/* Event content */}
              <div className="pb-4">
                {item.date && (
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {new Date(String(item.date)).toLocaleDateString()}
                  </div>
                )}
                {item.title && <p className="font-semibold text-slate-900">{item.title}</p>}
                {item.description && <p className="text-sm text-slate-600 mt-1">{item.description}</p>}
              </div>
            </div>
          ))}
        </div>

        {data.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No timeline events to display
          </div>
        )}
      </CardContent>
    </Card>
  )
}
