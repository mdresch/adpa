/**
 * Tabs Component
 * Renders content organized into switchable tabs
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { Tabs as TabsPrimitive, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Layers2 } from "lucide-react"

interface TabsComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function TabsComponent({ props, data }: TabsComponentProps) {
  const title = (props.title as string) || "Sections"
  const tabNames = (props.tabs as string[]) || data.map((_, idx) => `Section ${idx + 1}`)

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Layers2 className="h-5 w-5 text-cyan-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <TabsPrimitive defaultValue={`tab-0`} className="w-full">
            <TabsList className="grid w-full gap-2" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))` }}>
              {tabNames.map((tabName, idx) => (
                <TabsTrigger key={idx} value={`tab-${idx}`} className="text-sm">
                  {tabName}
                </TabsTrigger>
              ))}
            </TabsList>

            {data.map((tabContent, idx) => (
              <TabsContent key={idx} value={`tab-${idx}`} className="mt-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="space-y-3">
                    {Object.entries(tabContent).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-semibold text-slate-700">{key}:</span>{" "}
                        <span className="text-slate-600">{renderTabValue(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            ))}
          </TabsPrimitive>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No tabs to display
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function renderTabValue(value: OpenUIChatJson): React.ReactNode {
  if (typeof value === "string") return value
  if (typeof value === "object" && value !== null) return JSON.stringify(value, null, 2)
  return String(value)
}
