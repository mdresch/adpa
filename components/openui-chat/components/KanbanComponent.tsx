/**
 * Kanban Component
 * Renders workflow board with draggable columns and cards
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { Layout } from "lucide-react"

interface KanbanComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function KanbanComponent({ props, data }: KanbanComponentProps) {
  const title = (props.title as string) || "Kanban Board"
  const columns = (props.columns as string[]) || ["todo", "in-progress", "done"]

  // Group data by status
  const grouped: Record<string, typeof data> = {}
  for (const col of columns) {
    grouped[col] = data.filter((item) => String(item.status || item.column) === col)
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Layout className="h-5 w-5 text-blue-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(250px, 1fr))` }}>
          {columns.map((column) => (
            <div key={column} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-900 mb-3 capitalize">{column.replace("-", " ")}</h3>
              <div className="space-y-2">
                {(grouped[column] || []).map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
                    {item.title && <p className="font-semibold text-sm text-slate-900">{item.title}</p>}
                    {item.description && <p className="text-xs text-slate-600 mt-1">{item.description}</p>}
                  </div>
                ))}
                {(!grouped[column] || grouped[column].length === 0) && (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-100 p-4 text-center text-xs text-slate-500">
                    No items
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
