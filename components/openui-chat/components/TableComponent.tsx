/**
 * Table Component
 * Renders structured data as an interactive data table
 */

"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OpenUIChatJson } from "@/lib/openui/library"

interface TableComponentProps {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
}

export function TableComponent({ props, data }: TableComponentProps) {
  const [sortBy, setSortBy] = useState<string | null>(null)
  const [sortDesc, setSortDesc] = useState(false)

  const title = (props.title as string) || "Data Table"
  const subtitle = (props.subtitle as string) || ""
  const columns = (props.columns as string[]) || (data.length > 0 ? Object.keys(data[0]) : [])

  // Sort data
  let sortedData = [...data]
  if (sortBy && data.length > 0) {
    sortedData.sort((a, b) => {
      const aVal = a[sortBy]
      const bVal = b[sortBy]

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDesc ? bVal - aVal : aVal - bVal
      }

      const aStr = String(aVal || "")
      const bStr = String(bVal || "")
      return sortDesc ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr)
    })
  }

  const handleSort = (col: string) => {
    if (sortBy === col) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(col)
      setSortDesc(false)
    }
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-lg">
      <CardHeader className="space-y-2">
        <CardTitle>{title}</CardTitle>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="cursor-pointer px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      {col}
                      {sortBy === col && (sortDesc ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  {columns.map((col) => {
                    const value = row[col]
                    return (
                      <td key={`${idx}-${col}`} className="px-4 py-3 text-slate-700">
                        {renderCellValue(value)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            No data to display
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Render individual cell values with smart formatting
 */
function renderCellValue(value: OpenUIChatJson): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-slate-400">—</span>
  }

  if (typeof value === "boolean") {
    return (
      <Badge className={value ? "bg-green-100 text-green-900" : "bg-red-100 text-red-900"}>
        {value ? "Yes" : "No"}
      </Badge>
    )
  }

  if (typeof value === "number") {
    return <span className="font-mono">{value.toLocaleString()}</span>
  }

  if (typeof value === "string") {
    // Check if it's a color indicator
    if (value.toLowerCase() === "high" || value.toLowerCase() === "critical") {
      return <Badge className="bg-red-100 text-red-900">{value}</Badge>
    }
    if (value.toLowerCase() === "medium" || value.toLowerCase() === "warning") {
      return <Badge className="bg-yellow-100 text-yellow-900">{value}</Badge>
    }
    if (value.toLowerCase() === "low" || value.toLowerCase() === "success") {
      return <Badge className="bg-green-100 text-green-900">{value}</Badge>
    }

    return <span className="line-clamp-2">{value}</span>
  }

  if (Array.isArray(value)) {
    return (
      <div className="space-y-1">
        {value.map((item, idx) => (
          <div key={idx} className="text-sm">
            {renderCellValue(item)}
          </div>
        ))}
      </div>
    )
  }

  return <span>{JSON.stringify(value)}</span>
}
