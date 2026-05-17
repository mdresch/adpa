/**
 * Bullets Component
 * Renders content as bullet points, checklists, or outline lists
 */

"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { CheckCircle2, Circle, List } from "lucide-react"
import { useState } from "react"

interface BulletsComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function BulletsComponent({ props, data }: BulletsComponentProps) {
  const title = (props.title as string) || "Key Points"
  const style = (props.style as string) || "bullets" // "bullets", "checklist", "numbered"
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())

  const items =
    data.length > 0
      ? data.map((item) => ({
          text: typeof item.text === "string" ? item.text : typeof item.title === "string" ? item.title : String(item),
          icon: item.icon as string | undefined,
          level: (item.level as number) || 0,
        }))
      : extractBulletPoints(props.content as string)

  const handleToggle = (idx: number) => {
    const newChecked = new Set(checkedItems)
    if (newChecked.has(idx)) {
      newChecked.delete(idx)
    } else {
      newChecked.add(idx)
    }
    setCheckedItems(newChecked)
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <List className="h-5 w-5 text-indigo-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3"
              style={{ marginLeft: `${item.level * 1.5}rem` }}
            >
              {style === "checklist" ? (
                <button
                  onClick={() => handleToggle(idx)}
                  className="mt-0.5 flex-shrink-0"
                  aria-label={`Toggle item ${idx + 1}`}
                >
                  {checkedItems.has(idx) ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-400" />
                  )}
                </button>
              ) : style === "numbered" ? (
                <span className="flex-shrink-0 font-semibold text-slate-600">{idx + 1}.</span>
              ) : (
                <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-600" />
              )}
              <span
                className={`text-sm leading-relaxed ${
                  style === "checklist" && checkedItems.has(idx) ? "line-through text-slate-400" : "text-slate-700"
                }`}
              >
                {item.text}
              </span>
            </li>
          ))}
        </ul>

        {items.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
            No bullet points to display
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Helper: Extract bullet points from text content
 */
function extractBulletPoints(
  content: string
): Array<{ text: string; icon?: string; level: number }> {
  if (!content || typeof content !== "string") {
    return []
  }

  return content
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const trimmed = line.trim()
      const leadingSpaces = line.search(/\S/)
      const level = Math.max(0, Math.floor(leadingSpaces / 2))
      const text = trimmed.replace(/^[-•*]\s*/, "")

      return { text, level }
    })
}
