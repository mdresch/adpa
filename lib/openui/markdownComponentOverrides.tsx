"use client"

import type { ReactNode } from "react"
import { defineComponent } from "@openuidev/react-lang"
import {
  CardHeader as CardHeaderUI,
  IconButton,
  ScrollableTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@openuidev/react-ui"
import { openuiLibrary } from "@openuidev/react-ui/genui-lib"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"
import { z } from "zod/v4"

import { InlineMarkdown } from "@/components/openui-chat/InlineMarkdown"
import { MarkdownRenderer } from "@/components/documents/MarkdownRenderer"
import { normalizeMarkdownContent, plainHeaderText } from "@/lib/openui/normalizeMarkdown"

const ColDef = openuiLibrary.components.Col

const DEFAULT_PAGE_SIZE = 10

function asArray(data: unknown): unknown[] {
  return Array.isArray(data) ? data : []
}

function renderTableCell(cell: unknown, renderNode: (node: unknown) => ReactNode) {
  if (typeof cell === "object" && cell !== null) {
    return renderNode(cell)
  }
  const text = String(cell ?? "")
  return <InlineMarkdown content={text} className="genui-report-prose text-sm" />
}

export const TextContentDef = defineComponent({
  name: "TextContent",
  props: z.object({
    text: z.string(),
    size: z
      .enum(["small", "default", "large", "small-heavy", "large-heavy"])
      .optional(),
  }),
  description:
    'Text block. Supports markdown. Optional size: "small" | "default" | "large" | "small-heavy" | "large-heavy".',
  component: ({ props }) => {
    const size = props.size ?? "default"
    const heavy = size === "small-heavy" || size === "large-heavy"
    const large = size === "large" || size === "large-heavy"
    const small = size === "small" || size === "small-heavy"

    const className = [
      "openui-markdown-renderer genui-report-prose max-w-none",
      large ? "text-base" : small ? "text-xs" : "text-sm",
      heavy ? "font-medium" : "",
    ]
      .filter(Boolean)
      .join(" ")

    return (
      <MarkdownRenderer
        content={normalizeMarkdownContent(props.text ?? "")}
        className={className}
      />
    )
  },
})

export const CardHeaderDef = defineComponent({
  name: "CardHeader",
  props: z.object({
    title: z.string().optional(),
    subtitle: z.string().optional(),
  }),
  description:
    "Header with optional title and subtitle (plain text only — use title=\"...\" and optional subtitle=\"...\")",
  component: ({ props }) => {
    const titleRaw = typeof props.title === "string" ? props.title : undefined
    const subtitleRaw = typeof props.subtitle === "string" ? props.subtitle : undefined
    const title = titleRaw ? plainHeaderText(titleRaw) : undefined
    const subtitle = subtitleRaw ? plainHeaderText(subtitleRaw) : undefined
    return (
      <CardHeaderUI
        title={title || undefined}
        subtitle={subtitle || undefined}
      />
    )
  },
})

export const TableDef = defineComponent({
  name: "Table",
  props: z.object({ columns: z.array(ColDef.ref) }),
  description: "Data table — column-oriented. Each Col holds its own data array.",
  component: ({ props, renderNode }) => {
    const [currentPage, setCurrentPage] = useState(0)
    const columns = props.columns ?? []
    if (!columns.length) return null

    const colDefs = columns
      .filter((c) => c != null && c.props)
      .map((c) => ({
        label: c.props?.label ?? "",
        data: asArray(c.props?.data ?? []),
      }))
    if (!colDefs.length) return null

    const rowCount = Math.max(...colDefs.map((c) => c.data.length), 0)
    const totalPages = Math.ceil(rowCount / DEFAULT_PAGE_SIZE)
    const safePage = Math.min(currentPage, Math.max(0, totalPages - 1))
    const startRow = safePage * DEFAULT_PAGE_SIZE
    const visibleRowCount = Math.min(startRow + DEFAULT_PAGE_SIZE, rowCount) - startRow

    return (
      <div>
        <ScrollableTable>
          <TableHeader>
            <TableRow>
              {colDefs.map((c, i) => (
                <TableHead key={i}>
                  <InlineMarkdown content={c.label} className="text-sm font-semibold" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: visibleRowCount }, (_, i) => {
              const ri = startRow + i
              return (
                <TableRow key={ri}>
                  {colDefs.map((col, ci) => (
                    <TableCell key={ci}>
                      {renderTableCell(col.data[ri], renderNode)}
                    </TableCell>
                  ))}
                </TableRow>
              )
            })}
          </TableBody>
        </ScrollableTable>
        {totalPages > 1 ? (
          <div className="flex items-center justify-end gap-2 pt-2">
            <IconButton
              aria-label="Previous page"
              size="small"
              variant="secondary"
              icon={<ChevronLeft size={16} />}
              disabled={safePage === 0}
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
            />
            <span className="genui-report-muted text-[13px]">
              {safePage + 1} / {totalPages}
            </span>
            <IconButton
              aria-label="Next page"
              size="small"
              variant="secondary"
              icon={<ChevronRight size={16} />}
              disabled={safePage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
            />
          </div>
        ) : null}
      </div>
    )
  },
})

/** Replace stock GenUI components that render markdown source as plain text. */
export const MARKDOWN_OVERRIDE_NAMES = ["TextContent", "CardHeader", "Table"] as const

export const MARKDOWN_COMPONENT_OVERRIDES = [TextContentDef, CardHeaderDef, TableDef]
