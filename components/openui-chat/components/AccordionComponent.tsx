/**
 * Accordion Component
 * Renders expandable/collapsible content sections
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import {
  Accordion as AccordionPrimitive,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ChevronDown } from "lucide-react"

interface AccordionComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function AccordionComponent({ props, data }: AccordionComponentProps) {
  const title = (props.title as string) || "Details"

  // Transform data: each item should have 'title' (trigger) and other fields (content)
  const items = data.map((item, idx) => ({
    id: `item-${idx}`,
    title: (item.title as string) || (item.question as string) || `Section ${idx + 1}`,
    content: Object.entries(item)
      .filter(([key]) => key !== "title" && key !== "question")
      .reduce((acc, [key, val]) => {
        acc[key] = val
        return acc
      }, {} as Record<string, OpenUIChatJson>),
  }))

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <ChevronDown className="h-5 w-5 text-teal-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length > 0 ? (
          <AccordionPrimitive type="single" collapsible className="w-full">
            {items.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <AccordionTrigger className="text-sm font-semibold text-slate-900 hover:text-teal-700">
                  {item.title}
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pt-2 text-sm text-slate-700">
                    {Object.entries(item.content).length > 0 ? (
                      Object.entries(item.content).map(([key, value]) => (
                        <div key={key}>
                          <span className="font-semibold text-slate-700">{key}:</span>{" "}
                          <span className="text-slate-600">{renderAccordionValue(value)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 italic">No additional details</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </AccordionPrimitive>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No accordion items to display
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function renderAccordionValue(value: OpenUIChatJson): React.ReactNode {
  if (typeof value === "string") return value
  if (typeof value === "number") return value.toLocaleString()
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (Array.isArray(value)) {
    return (
      <ul className="mt-1 list-inside list-disc space-y-1">
        {value.map((item, idx) => (
          <li key={idx}>{String(item)}</li>
        ))}
      </ul>
    )
  }
  if (typeof value === "object" && value !== null) {
    return <pre className="overflow-x-auto rounded bg-slate-100 p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
  }
  return String(value)
}
