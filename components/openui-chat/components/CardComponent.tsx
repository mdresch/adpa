/**
 * Card Component
 * Renders data as organized card layout (statuses, highlights, key facts)
 */

"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { Layers } from "lucide-react"

interface CardComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function CardComponent({ props, data }: CardComponentProps) {
  const title = (props.title as string) || "Overview"
  const layout = (props.layout as string) || "grid"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-purple-600" />
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>

      <div className={layout === "grid" ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" : "space-y-3"}>
        {data.map((item, idx) => (
          <Card key={idx} className="border-slate-200 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {typeof item.title === "string" ? item.title : `Item ${idx + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {Object.entries(item).map(([key, value]) => {
                if (key === "title") return null
                return (
                  <div key={key} className="text-sm">
                    <span className="font-semibold text-slate-600">{key}:</span>{" "}
                    <span className="text-slate-700">{renderValue(value)}</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      {data.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          No items to display
        </div>
      )}
    </div>
  )
}

function renderValue(value: OpenUIChatJson): React.ReactNode {
  if (typeof value === "string") {
    return <Badge variant="secondary">{value}</Badge>
  }
  return String(value)
}
