/**
 * Dynamic Component Renderer
 * Renders OpenUI Lang streams via @openuidev/react-lang <Renderer>,
 * with a legacy JSON payload fallback for older thread messages.
 */

"use client"

import { Renderer, type Library } from "@openuidev/react-lang"
import { Sparkles, Telescope } from "lucide-react"

import { MarkdownRenderer } from "@/components/documents/MarkdownRenderer"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { adpaLibrary } from "@/lib/openui/adpaLibrary"
import type { ComponentPayload, OpenUIChatJson } from "@/lib/openui/library"
import {
  extractOpenUILangText,
  isLegacyComponentPayload,
  looksLikeOpenUILang,
} from "@/lib/openui/library"

import { TableComponent } from "./components/TableComponent"
import { ChartComponent } from "./components/ChartComponent"
import { FormComponent } from "./components/FormComponent"
import { CardComponent } from "./components/CardComponent"
import { TimelineComponent } from "./components/TimelineComponent"
import { KanbanComponent } from "./components/KanbanComponent"
import { BulletsComponent } from "./components/BulletsComponent"
import { TabsComponent } from "./components/TabsComponent"
import { AccordionComponent } from "./components/AccordionComponent"
import { CarouselComponent } from "./components/CarouselComponent"
import { AlertComponent } from "./components/AlertComponent"
import { StepsComponent } from "./components/StepsComponent"
import { BreadcrumbComponent } from "./components/BreadcrumbComponent"
import { SidebarComponent } from "./components/SidebarComponent"
import { ComparisonComponent } from "./components/ComparisonComponent"
import { CalendarComponent } from "./components/CalendarComponent"
import { TeamComponent } from "./components/TeamComponent"

export interface DynamicComponentRendererProps {
  /** Accumulated OpenUI Lang text from the LLM stream */
  response?: string | null
  /** @deprecated Legacy JSON component payload from pre–react-lang threads */
  payload?: ComponentPayload | OpenUIChatJson
  isStreaming?: boolean
  /** Defaults to ADPA library; pass openuiLibrary from @openuidev/react-ui/genui-lib for GenUI workspace */
  library?: Library
}

export function DynamicComponentRenderer({
  response,
  payload,
  isStreaming = false,
  library = adpaLibrary,
}: DynamicComponentRendererProps) {
  const raw =
    response ??
    (typeof payload === "string" && looksLikeOpenUILang(payload) ? payload : null)

  const langText = raw ? extractOpenUILangText(raw) : null

  const trimmed = langText?.trim() ?? ""
  const hasRoot = /^root\s*=/m.test(trimmed)

  if (isStreaming && trimmed && !hasRoot) {
    return (
      <Card className="border-indigo-100 bg-indigo-50/50 shadow-sm">
        <CardContent className="py-8 text-center text-sm text-indigo-700">
          Generating visualization…
        </CardContent>
      </Card>
    )
  }

  if (hasRoot) {
    return (
      <Renderer
        library={library}
        response={trimmed}
        isStreaming={isStreaming}
        onError={(errors) => {
          if (errors.length > 0) {
            console.warn("[OpenUI Renderer]", errors)
          }
        }}
      />
    )
  }

  if (payload && isLegacyComponentPayload(payload)) {
    return <LegacyComponentRenderer payload={payload} />
  }

  return <FallbackRenderer content={payload ?? response} />
}

/** Legacy JSON dispatch for messages stored before OpenUI Lang migration */
function LegacyComponentRenderer({ payload }: { payload: ComponentPayload }) {
  const record = payload as Record<string, OpenUIChatJson>
  const componentType = (record.component || "") as string
  const props = (record.props || {}) as Record<string, OpenUIChatJson>
  const data = (record.data || []) as Array<Record<string, OpenUIChatJson>>
  const metadata = (record.metadata || {}) as Record<string, OpenUIChatJson>

  switch (componentType) {
    case "Table":
      return <TableComponent props={props} data={data} />
    case "Chart":
      return <ChartComponent props={props} data={data} />
    case "Form":
      return <FormComponent props={props} schema={record.schema as any} />
    case "Card":
      return <CardComponent props={props} data={data} />
    case "Timeline":
      return <TimelineComponent props={props} data={data} />
    case "Kanban":
      return <KanbanComponent props={props} data={data} />
    case "Bullets":
      return <BulletsComponent props={props} data={data} />
    case "Tabs":
      return <TabsComponent props={props} data={data} />
    case "Accordion":
      return <AccordionComponent props={props} data={data} />
    case "Carousel":
      return <CarouselComponent props={props} data={data} />
    case "Alert":
      return <AlertComponent props={props} data={data} />
    case "Steps":
      return <StepsComponent props={props} data={data} />
    case "Breadcrumb":
      return <BreadcrumbComponent props={props} data={data} />
    case "Sidebar":
      return <SidebarComponent props={props} data={data} />
    case "Comparison":
      return <ComparisonComponent props={props} data={data} />
    case "Calendar":
      return <CalendarComponent props={props} data={data} />
    case "Team":
      return <TeamComponent props={props} data={data} />
    default:
      return <TextFallbackRenderer props={props} data={data} metadata={metadata} />
  }
}

function FallbackRenderer({ content }: { content: OpenUIChatJson | string | null | undefined }) {
  return (
    <Card className="border-slate-200 bg-white/90 shadow-sm">
      <CardContent className="pt-6 text-sm text-slate-600">
        {typeof content === "string" ? content : JSON.stringify(content, null, 2)}
      </CardContent>
    </Card>
  )
}

function TextFallbackRenderer({
  props,
  data,
  metadata,
}: {
  props: Record<string, OpenUIChatJson>
  data: Array<Record<string, OpenUIChatJson>>
  metadata: Record<string, OpenUIChatJson>
}) {
  const title = (props.title as string) || undefined
  const supportingEvidence = (metadata.supportingEvidence as number) || 0

  const bodyContent =
    (props.content as string) ||
    (props.text as string) ||
    (props.body as string) ||
    (props.markdown as string) ||
    (props.synopsis as string) ||
    (props.description as string) ||
    (typeof metadata.synopsis === "string" ? metadata.synopsis : null) ||
    (data.length > 0
      ? data
          .map(
            (item) =>
              (item.content as string) ||
              (item.text as string) ||
              (item.body as string) ||
              ""
          )
          .filter(Boolean)
          .join("\n\n")
      : null)

  return (
    <Card className="overflow-hidden border-emerald-200 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.18),_rgba(255,255,255,0.92)_45%)] shadow-lg shadow-emerald-100/60">
      <CardHeader className="space-y-3 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="bg-slate-950 text-white hover:bg-slate-950">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Response
          </Badge>
          {supportingEvidence > 0 && (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-900">
              <Telescope className="mr-1 h-3.5 w-3.5" />
              {supportingEvidence} sources
            </Badge>
          )}
        </div>
        {title && <CardTitle className="text-2xl text-slate-950">{title}</CardTitle>}
      </CardHeader>
      <CardContent>
        {bodyContent ? (
          <MarkdownRenderer
            content={bodyContent}
            className="prose prose-slate prose-sm max-w-none
              prose-headings:font-semibold prose-headings:text-slate-900
              prose-p:text-slate-700 prose-p:leading-7
              prose-strong:text-slate-900
              prose-em:text-slate-700
              prose-li:text-slate-700
              prose-ul:my-2 prose-ol:my-2
              prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-slate-800
              prose-blockquote:border-l-emerald-500 prose-blockquote:text-slate-600"
          />
        ) : (
          <p className="text-sm italic text-slate-400">No content available.</p>
        )}
      </CardContent>
    </Card>
  )
}
