"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ArrowLeft,
  Eye,
  FileText,
  Loader2,
  Sparkles,
  Wand2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { getProjectDocumentViewPath } from "@/lib/documents/document-routes"

export type DocumentPageMode = "view" | "source" | "report"

export interface DocumentSummary {
  id: string
  name: string
  template_name?: string
  status: string
}

const MODE_CONFIG: Record<
  DocumentPageMode,
  { icon: LucideIcon; title: string; badge: string; iconClassName?: string }
> = {
  view: { icon: Eye, title: "Document View", badge: "Editor" },
  source: { icon: FileText, title: "Source Markdown", badge: "Plain text" },
  report: {
    icon: Sparkles,
    title: "Document Report",
    badge: "Live",
    iconClassName: "text-indigo-600",
  },
}

interface DocumentPageToolbarProps {
  projectId: string
  mode: DocumentPageMode
  documents: DocumentSummary[]
  docsLoading: boolean
  selectedDocId: string
  onDocChange: (docId: string) => void
  docSelectorDisabled?: boolean
  className?: string
  children?: React.ReactNode
}

export function DocumentPageToolbar({
  projectId,
  mode,
  documents,
  docsLoading,
  selectedDocId,
  onDocChange,
  docSelectorDisabled = false,
  className = "",
  children,
}: DocumentPageToolbarProps) {
  const router = useRouter()
  const config = MODE_CONFIG[mode]
  const ModeIcon = config.icon

  return (
    <div
      className={`flex shrink-0 flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden ${className}`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 gap-1.5 text-xs text-slate-500 hover:text-slate-900"
          onClick={() => router.push(`/projects/${projectId}/documents`)}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Documents
        </Button>
        <div className="h-4 w-px shrink-0 bg-slate-200" />
        <div className="flex shrink-0 items-center gap-2">
          <ModeIcon className={`h-5 w-5 ${config.iconClassName ?? "text-slate-600"}`} />
          <span className="font-semibold text-slate-900">{config.title}</span>
          <Badge
            variant="secondary"
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
          >
            {config.badge}
          </Badge>
        </div>
        <div className="h-4 w-px shrink-0 bg-slate-200" />
        {docsLoading ? (
          <div className="flex h-8 w-[240px] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading…
          </div>
        ) : documents.length === 0 ? (
          <div className="flex h-8 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-xs text-amber-600">
            No documents in this project
          </div>
        ) : (
          <Select
            value={selectedDocId}
            onValueChange={onDocChange}
            disabled={docSelectorDisabled}
          >
            <SelectTrigger className="h-8 w-[280px] border-slate-200 bg-slate-50 text-xs">
              <SelectValue placeholder="Select a document…" />
            </SelectTrigger>
            <SelectContent>
              {documents.map((d) => (
                <SelectItem key={d.id} value={d.id} className="text-xs">
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {selectedDocId ? (
          <>
            {mode !== "view" ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() =>
                  router.push(getProjectDocumentViewPath(projectId, selectedDocId))
                }
              >
                <Eye className="h-3.5 w-3.5" />
                View
              </Button>
            ) : null}
            {mode !== "source" ? (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs"
                onClick={() =>
                  router.push(`/projects/${projectId}/documents/source?docId=${selectedDocId}`)
                }
              >
                <FileText className="h-3.5 w-3.5" />
                Source
              </Button>
            ) : null}
            {mode !== "report" ? (
              <Button
                variant="outline"
                size="sm"
                className={`h-8 gap-1.5 text-xs ${
                  mode === "source"
                    ? "border-indigo-200 text-indigo-600"
                    : ""
                }`}
                onClick={() =>
                  router.push(`/projects/${projectId}/documents/ui?docId=${selectedDocId}`)
                }
              >
                <Wand2 className="h-3.5 w-3.5" />
                Report
              </Button>
            ) : null}
          </>
        ) : null}
        {children}
      </div>
    </div>
  )
}
