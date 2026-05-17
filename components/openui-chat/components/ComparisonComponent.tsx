"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { OpenUIChatJson } from "@/lib/openui/library"
import { ArrowLeftRight, Minus, Plus } from "lucide-react"

interface ComparisonComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function ComparisonComponent({ props, data }: ComparisonComponentProps) {
  const title = (props.title as string) || "Comparison"

  // data: each item is one "column" being compared.
  // Each column has a name and a set of attributes.
  const columns = data.map((item) => ({
    name: (item.name || item.title || item.label || "Option") as string,
    highlighted: (item.highlighted || item.recommended) as boolean | undefined,
    attributes: Object.entries(item).filter(
      ([k]) => !["name", "title", "label", "highlighted", "recommended"].includes(k)
    ),
  }))

  // Collect all unique attribute keys across all columns
  const allKeys = Array.from(
    new Set(columns.flatMap((col) => col.attributes.map(([k]) => k)))
  )

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-violet-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {columns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 w-32">
                    Feature
                  </th>
                  {columns.map((col, idx) => (
                    <th key={idx} className="px-3 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className={`font-bold ${
                            col.highlighted ? "text-violet-700" : "text-slate-800"
                          }`}
                        >
                          {col.name}
                        </span>
                        {col.highlighted && (
                          <Badge className="bg-violet-600 text-white text-xs px-2 py-0.5">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allKeys.map((key, rowIdx) => (
                  <tr
                    key={key}
                    className={`border-b border-slate-100 ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="py-3 pr-4 text-xs font-medium capitalize text-slate-500">
                      {key.replace(/_/g, " ")}
                    </td>
                    {columns.map((col, colIdx) => {
                      const attr = col.attributes.find(([k]) => k === key)
                      const value = attr ? attr[1] : null
                      return (
                        <td
                          key={colIdx}
                          className={`px-3 py-3 text-center ${
                            col.highlighted ? "bg-violet-50/40" : ""
                          }`}
                        >
                          {renderComparisonValue(value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No comparison data provided
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function renderComparisonValue(value: OpenUIChatJson): React.ReactNode {
  if (value === null || value === undefined) {
    return <Minus className="mx-auto h-4 w-4 text-slate-300" />
  }
  if (typeof value === "boolean") {
    return value ? (
      <Plus className="mx-auto h-4 w-4 text-emerald-600" />
    ) : (
      <Minus className="mx-auto h-4 w-4 text-red-400" />
    )
  }
  if (typeof value === "number") {
    return <span className="font-mono font-semibold">{value.toLocaleString()}</span>
  }
  if (typeof value === "string") {
    // Colour-coded ratings
    const lower = value.toLowerCase()
    if (["yes", "included", "supported", "high", "✓"].includes(lower))
      return <Badge className="bg-emerald-100 text-emerald-800 text-xs">{value}</Badge>
    if (["no", "not included", "unsupported", "low", "✗"].includes(lower))
      return <Badge className="bg-red-100 text-red-800 text-xs">{value}</Badge>
    if (["partial", "limited", "medium"].includes(lower))
      return <Badge className="bg-yellow-100 text-yellow-800 text-xs">{value}</Badge>
    return <span>{value}</span>
  }
  return <span className="text-xs text-slate-400">{JSON.stringify(value)}</span>
}
