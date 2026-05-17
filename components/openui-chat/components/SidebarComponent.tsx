"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { LayoutPanelLeft } from "lucide-react"

interface SidebarComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function SidebarComponent({ props, data }: SidebarComponentProps) {
  const title = (props.title as string) || "Filtered View"
  const [activeFilter, setActiveFilter] = useState<string | null>(null)

  // data items represent categories/filters: { label, count?, items?: [...] }
  const filters = data.map((item) => ({
    label: (item.label || item.category || item.title || item.name) as string,
    count: item.count as number | undefined,
    items: (item.items as Array<Record<string, OpenUIChatJson>>) || [],
    badge: item.badge as string | undefined,
  }))

  const active = activeFilter
    ? filters.find((f) => f.label === activeFilter)
    : filters[0]

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2 pb-3">
        <CardTitle className="flex items-center gap-2">
          <LayoutPanelLeft className="h-5 w-5 text-slate-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="flex min-h-[300px]">
          {/* Sidebar panel */}
          <div className="w-44 flex-shrink-0 border-r border-slate-200 bg-slate-50">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {filters.map((filter, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveFilter(filter.label)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                      active?.label === filter.label
                        ? "bg-slate-900 text-white"
                        : "text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <span className="truncate">{filter.label}</span>
                    {filter.count !== undefined && (
                      <Badge
                        variant="secondary"
                        className={`ml-2 text-xs ${
                          active?.label === filter.label
                            ? "bg-white/20 text-white"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {filter.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4">
            {active ? (
              <div>
                <p className="mb-3 text-sm font-semibold text-slate-700">{active.label}</p>
                <Separator className="mb-3" />
                {active.items.length > 0 ? (
                  <ul className="space-y-2">
                    {active.items.map((item, idx) => (
                      <li key={idx} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        {typeof item === "string"
                          ? item
                          : (item.title || item.name || item.label || JSON.stringify(item)) as string}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400 italic">No items in this category</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">Select a category</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
