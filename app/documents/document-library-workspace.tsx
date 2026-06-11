"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { format } from "date-fns"
import { debounce } from "lodash"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AnimatedCard } from "@/components/animated-layout"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  FileText,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Download,
  Trash2,
  Plus,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Layers,
  CheckCircle,
  FileCheck,
  Edit3,
  Archive,
} from "@/components/ui/icons-shim"

import { apiClient, Document } from "@/lib/api"
import { toast } from "@/lib/notify"

type StatusFilter = "all" | "draft" | "reviewed" | "published" | "archived"
type FrameworkFilter = "all" | "PMBOK7" | "PRINCE2" | "Agile" | "General"

const SKELETON_ROW_COUNT = 5

type DocumentStatusCounts = {
  published: number
  reviewed: number
  draft: number
  archived: number
}

const TABLE_CROSSFADE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2, ease: "easeOut" as const },
}

export default function DocumentLibraryWorkspace() {
  const router = useRouter()

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [fleetStatusCounts, setFleetStatusCounts] = useState<DocumentStatusCounts | null>(null)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<StatusFilter>("all")
  const [framework, setFramework] = useState<FrameworkFilter>("all")
  const [page, setPage] = useState(1)
  const limit = 10

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      const params = {
        page,
        limit,
        search: search || undefined,
        status: status !== "all" ? status : undefined,
        framework: framework !== "all" ? framework : undefined,
      }

      const response = await apiClient.getDocuments(params)
      setDocuments(response.documents || [])

      if (response.pagination) {
        setTotal(response.pagination.total)
        setTotalPages(response.pagination.pages)
      }

      if (response.meta?.counts) {
        setFleetStatusCounts(response.meta.counts)
      } else {
        setFleetStatusCounts(null)
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error)
      toast.error("Failed to load compliance documents")
    } finally {
      setLoading(false)
    }
  }, [page, search, status, framework])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleSearch = useMemo(
    () =>
      debounce((value: string) => {
        setSearch(value)
        setPage(1)
      }, 400),
    []
  )

  useEffect(() => {
    return () => handleSearch.cancel()
  }, [handleSearch])

  const docStats = useMemo(() => {
    const pagePublished = documents.filter((d) => d.status?.toLowerCase() === "published").length
    const pageReviewed = documents.filter((d) => {
      const s = d.status?.toLowerCase()
      return s === "reviewed" || s === "review"
    }).length
    const pageDrafts = documents.filter(
      (d) => d.status?.toLowerCase() === "draft" || !d.status
    ).length
    const pageArchived = documents.filter((d) => d.status?.toLowerCase() === "archived").length

    return {
      published: fleetStatusCounts?.published ?? pagePublished,
      reviewed: fleetStatusCounts?.reviewed ?? pageReviewed,
      drafts: fleetStatusCounts?.draft ?? pageDrafts,
      archived: fleetStatusCounts?.archived ?? pageArchived,
    }
  }, [documents, fleetStatusCounts])

  const tableViewKey = loading
    ? "loading"
    : documents.length === 0
      ? `empty-${status}-${framework}-${search}`
      : `data-${page}-${status}-${framework}-${search}`

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to permanently delete this asset?")) return

    try {
      await apiClient.deleteDocument(id)
      toast.success("Document purged successfully")
      fetchDocuments()
    } catch (error) {
      console.error("Deletion failed:", error)
      toast.error("Asset teardown execution failed")
    }
  }

  const handleExportPdf = async (id: string, name: string) => {
    try {
      toast.info("Compiling high-integrity PDF layout...")
      const blob = await apiClient.exportDocumentPdf(id)
      const pdfBlob = new Blob([blob], { type: "application/pdf" })

      const url = window.URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${name.replace(/[^a-z0-9]/gi, "_")}.pdf`
      a.style.display = "none"
      document.body.appendChild(a)
      a.click()

      setTimeout(() => {
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
      }, 150)

      toast.success("PDF exported successfully")
    } catch (error) {
      console.error("PDF generation failed:", error)
      toast.error("PDF transformation pipeline error")
    }
  }

  const getStatusVariant = (docStatus: string) => {
    switch (docStatus?.toLowerCase()) {
      case "published":
        return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20"
      case "reviewed":
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
      case "draft":
        return "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20"
      case "archived":
        return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
      default:
        return "bg-slate-100 text-slate-700"
    }
  }

  const renderTableBody = () => {
    if (loading) {
      return [...Array(SKELETON_ROW_COUNT)].map((_, idx) => (
        <TableRow
          key={`doc-skel-${idx}`}
          className="h-16 animate-pulse border-b border-slate-100 dark:border-slate-800/40"
        >
          <TableCell>
            <div
              className="h-5 w-2/3 rounded-md bg-slate-200 dark:bg-slate-800"
              style={{ animationDelay: `${idx * 45}ms` }}
            />
          </TableCell>
          <TableCell>
            <div className="h-5 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800/50" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-20 rounded-full bg-slate-100 dark:bg-slate-800/50" />
          </TableCell>
          <TableCell>
            <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-24 rounded-md bg-slate-100 dark:bg-slate-800/50" />
          </TableCell>
          <TableCell className="px-6 text-right">
            <div className="ml-auto h-8 w-8 rounded-md bg-slate-100 dark:bg-slate-800/50" />
          </TableCell>
        </TableRow>
      ))
    }

    if (documents.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="h-64 text-center">
            <div className="flex flex-col items-center justify-center space-y-2 text-slate-400">
              <FileText className="h-10 w-10 stroke-[1.25] text-slate-300" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                No alignment artifacts detected
              </p>
              <p className="max-w-xs text-xs text-slate-400">
                Modify active filters or instantiate a new structure record.
              </p>
            </div>
          </TableCell>
        </TableRow>
      )
    }

    return documents.map((doc) => (
      <TableRow
        key={doc.id}
        className="group cursor-pointer border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/50 dark:border-slate-800/60 dark:hover:bg-slate-800/20"
        onClick={() => router.push(`/documents/${doc.id}/view`)}
      >
        <TableCell className="font-semibold text-slate-900 dark:text-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-600 transition-transform group-hover:scale-105">
              <FileText className="h-4 w-4" />
            </div>
            <span className="transition-colors group-hover:text-primary">{doc.name}</span>
          </div>
        </TableCell>
        <TableCell className="font-medium text-slate-500 dark:text-slate-400">
          {doc.project_name || "Unassigned"}
        </TableCell>
        <TableCell>
          {doc.framework ? (
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50/50 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              {doc.framework}
            </Badge>
          ) : (
            <span className="text-slate-300 dark:text-slate-700">—</span>
          )}
        </TableCell>
        <TableCell>
          <Badge
            className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-none ${getStatusVariant(doc.status)}`}
          >
            {doc.status || "Draft"}
          </Badge>
        </TableCell>
        <TableCell className="text-sm font-medium text-slate-400 dark:text-slate-500">
          {doc.updated_at ? format(new Date(doc.updated_at), "MMM d, yyyy") : "—"}
        </TableCell>
        <TableCell className="px-6 text-right" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-slate-100 focus:ring-0 dark:hover:bg-slate-800"
              >
                <MoreVertical className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/view`)}>
                <Eye className="mr-2 h-4 w-4 text-slate-400" /> View Record
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/collaborate`)}>
                <Edit className="mr-2 h-4 w-4 text-slate-400" /> Edit Parameter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportPdf(doc.id, doc.name)}>
                <Download className="mr-2 h-4 w-4 text-slate-400" /> Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                className="font-medium text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                onClick={(e) => handleDelete(doc.id, e)}
              >
                <Trash2 className="mr-2 h-4 w-4 text-red-400" /> Purge Asset
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    ))
  }

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Document Library
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Audit, group, and track project lifecycle frameworks and governance logs.
          </p>
        </div>
        <Button
          onClick={() => router.push("/documents/new")}
          className="bg-primary text-white shadow-md shadow-primary/10 transition-transform hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-4 w-4" /> New Document
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Inventory
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">{total}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/30">
            <CheckCircle className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Published Active
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {docStats.published}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <div className="rounded-lg bg-blue-50 p-2 text-blue-600 dark:bg-blue-950/30">
            <FileCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Under Review
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {docStats.reviewed}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <div className="rounded-lg bg-amber-50 p-2 text-amber-600 dark:bg-amber-950/30">
            <Edit3 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Work Drafts
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {docStats.drafts}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800/80 dark:bg-slate-900">
          <div className="rounded-lg bg-slate-100 p-2 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            <Archive className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Retired Assets
            </div>
            <div className="text-lg font-extrabold text-slate-900 dark:text-white">
              {docStats.archived}
            </div>
          </div>
        </div>
      </div>

      <AnimatedCard>
        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:flex-row md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Filter assets across workspace ledger..."
              className="h-10 bg-slate-50/50 pl-9 focus-visible:ring-primary/20 dark:bg-slate-950/50"
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={status}
              onValueChange={(v) => {
                setStatus(v as StatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-10 w-[160px] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <Filter className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={framework}
              onValueChange={(v) => {
                setFramework(v as FrameworkFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="h-10 w-[180px] border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
                <FileText className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Framework" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Frameworks</SelectItem>
                <SelectItem value="PMBOK7">PMBOK 7</SelectItem>
                <SelectItem value="PRINCE2">PRINCE2</SelectItem>
                <SelectItem value="Agile">Agile</SelectItem>
                <SelectItem value="General">General</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 border-slate-200 text-slate-500 hover:text-slate-900 dark:border-slate-800"
              onClick={fetchDocuments}
              title="Refresh Ledger Cache"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
            </Button>
          </div>
        </div>
      </AnimatedCard>

      <AnimatePresence mode="wait">
        <motion.div
          key={tableViewKey}
          className="min-h-[460px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
          {...TABLE_CROSSFADE}
        >
          <Table>
            <TableHeader className="select-none bg-slate-50/75 dark:bg-slate-800/40">
              <TableRow className="border-b border-slate-200 dark:border-slate-800">
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">
                  Document Parameter
                </TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">
                  Project Context
                </TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">
                  Methodology Framework
                </TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">
                  Status State
                </TableHead>
                <TableHead className="font-bold text-slate-700 dark:text-slate-300">
                  Last Baseline Sync
                </TableHead>
                <TableHead className="px-6 text-right font-bold text-slate-700 dark:text-slate-300">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderTableBody()}</TableBody>
          </Table>
        </motion.div>
      </AnimatePresence>

      <div className="flex select-none items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Showing {documents.length} of {total} Records
        </p>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-9 border-slate-200 px-3 text-xs font-bold dark:border-slate-800"
          >
            <ChevronLeft className="mr-1 h-3.5 w-3.5" /> Previous
          </Button>
          <span className="min-w-[60px] text-center text-xs font-extrabold text-slate-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="h-9 border-slate-200 px-3 text-xs font-bold dark:border-slate-800"
          >
            Next <ChevronRight className="ml-1 h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
