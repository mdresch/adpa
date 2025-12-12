"use client"

import React, { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
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
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedCard } from "@/components/animated-layout"
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
} from "@/components/ui/icons-shim"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { format } from "date-fns"
import { debounce } from "lodash"

export default function DocumentLibraryPage() {
    const router = useRouter()
    const { user, hasPermission } = useAuth()

    // State
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)

    // Filters state
    const [search, setSearch] = useState("")
    const [status, setStatus] = useState("all")
    const [framework, setFramework] = useState("all")
    const [page, setPage] = useState(1)
    const limit = 10

    // Fetch documents
    const fetchDocuments = useCallback(async () => {
        try {
            setLoading(true)
            const params: any = {
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
        } catch (error) {
            console.error("Failed to fetch documents:", error)
            toast.error("Failed to load documents")
        } finally {
            setLoading(false)
        }
    }, [page, search, status, framework])

    // Initial load and filter changes
    useEffect(() => {
        fetchDocuments()
    }, [fetchDocuments])

    // Debounced search handler
    const handleSearch = debounce((value: string) => {
        setSearch(value)
        setPage(1) // Reset to first page on search
    }, 500)

    // Handlers
    const handleStatusChange = (value: string) => {
        setStatus(value)
        setPage(1)
    }

    const handleFrameworkChange = (value: string) => {
        setFramework(value)
        setPage(1)
    }

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirm("Are you sure you want to delete this document?")) return

        try {
            await apiClient.deleteDocument(id)
            toast.success("Document deleted")
            fetchDocuments() // Refresh list
        } catch (error) {
            console.error("Failed to delete document:", error)
            toast.error("Failed to delete document")
        }
    }

    const handleExportPdf = async (id: string, name: string) => {
        try {
            toast.info("Exporting PDF...")
            const blob = await apiClient.exportDocumentPdf(id)

            // Ensure the blob has the correct PDF MIME type
            const pdfBlob = new Blob([blob], { type: 'application/pdf' })

            const url = window.URL.createObjectURL(pdfBlob)
            const a = document.createElement('a')
            a.href = url
            a.download = `${name.replace(/[^a-z0-9]/gi, '_')}.pdf`
            a.style.display = 'none'
            document.body.appendChild(a)
            a.click()

            // Delay cleanup to ensure download starts
            setTimeout(() => {
                window.URL.revokeObjectURL(url)
                document.body.removeChild(a)
            }, 100)

            toast.success("PDF exported successfully")
        } catch (error: any) {
            console.error("Failed to export PDF:", error)
            toast.error(error?.message || "Failed to export PDF")
        }
    }

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case "published": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
            case "reviewed": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
            case "draft": return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100"
            case "archived": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
            default: return "bg-gray-100 text-gray-800"
        }
    }

    return (
        <PageTransition>
            <div className="flex h-screen bg-background">
                <Sidebar />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header />
                    <main className="flex-1 overflow-y-auto p-6">
                        <AnimatedLayout>
                            <div className="flex flex-col space-y-6">

                                {/* Header Section */}
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h1 className="text-3xl font-bold tracking-tight">Document Library</h1>
                                        <p className="text-muted-foreground mt-1">
                                            Manage and organize all your project documents in one place
                                        </p>
                                    </div>
                                    <Button onClick={() => router.push("/documents/new")}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        New Document
                                    </Button>
                                </div>

                                {/* Filters Section */}
                                <AnimatedCard>
                                    <div className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between bg-card rounded-lg border shadow-sm">
                                        <div className="flex items-center gap-2 flex-1 w-full">
                                            <div className="relative flex-1">
                                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search documents..."
                                                    className="pl-9"
                                                    onChange={(e) => handleSearch(e.target.value)}
                                                />
                                            </div>

                                            <Select value={status} onValueChange={handleStatusChange}>
                                                <SelectTrigger className="w-[180px]">
                                                    <Filter className="mr-2 h-4 w-4" />
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

                                            <Select value={framework} onValueChange={handleFrameworkChange}>
                                                <SelectTrigger className="w-[180px]">
                                                    <FileText className="mr-2 h-4 w-4" />
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

                                            <Button variant="ghost" size="icon" onClick={() => fetchDocuments()}>
                                                <RefreshCw className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </AnimatedCard>

                                {/* Documents Table */}
                                <AnimatedCard delay={0.1}>
                                    <div className="rounded-md border bg-card shadow-sm">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Document Name</TableHead>
                                                    <TableHead>Project</TableHead>
                                                    <TableHead>Framework</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Last Updated</TableHead>
                                                    <TableHead className="text-right">Actions</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {loading ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-24 text-center">
                                                            Loading documents...
                                                        </TableCell>
                                                    </TableRow>
                                                ) : documents.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={6} className="h-64 text-center text-muted-foreground">
                                                            No documents found. Try adjusting your filters or create a new document.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    documents.map((doc) => (
                                                        <TableRow
                                                            key={doc.id}
                                                            className="cursor-pointer hover:bg-muted/50"
                                                            onClick={() => router.push(`/documents/${doc.id}/view`)}
                                                        >
                                                            <TableCell className="font-medium">
                                                                <div className="flex items-center gap-2">
                                                                    <FileText className="h-4 w-4 text-blue-500" />
                                                                    {doc.name}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell>{doc.project_name || "Unassigned"}</TableCell>
                                                            <TableCell>
                                                                {doc.framework && (
                                                                    <Badge variant="outline">{doc.framework}</Badge>
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge className={getStatusColor(doc.status)}>
                                                                    {doc.status || "Draft"}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                {doc.updated_at ? format(new Date(doc.updated_at), "MMM d, yyyy") : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                                                                    <DropdownMenu>
                                                                        <DropdownMenuTrigger asChild>
                                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                                <MoreVertical className="h-4 w-4" />
                                                                            </Button>
                                                                        </DropdownMenuTrigger>
                                                                        <DropdownMenuContent align="end">
                                                                            <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/view`)}>
                                                                                <Eye className="mr-2 h-4 w-4" /> View
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => router.push(`/documents/${doc.id}/collaborate`)}>
                                                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem onClick={() => handleExportPdf(doc.id, doc.name)}>
                                                                                <Download className="mr-2 h-4 w-4" /> Export PDF
                                                                            </DropdownMenuItem>
                                                                            <DropdownMenuItem className="text-red-600" onClick={(e) => handleDelete(doc.id, e as any)}>
                                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                                            </DropdownMenuItem>
                                                                        </DropdownMenuContent>
                                                                    </DropdownMenu>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    {/* Pagination */}
                                    <div className="flex items-center justify-between p-4 border-t bg-card rounded-b-lg">
                                        <p className="text-sm text-muted-foreground">
                                            Showing {documents.length} of {total} documents
                                        </p>
                                        <div className="flex items-center space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1 || loading}
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                                Previous
                                            </Button>
                                            <span className="text-sm">
                                                Page {page} of {totalPages}
                                            </span>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                                disabled={page === totalPages || loading}
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </AnimatedCard>
                            </div>
                        </AnimatedLayout>
                    </main>
                </div>
            </div>
        </PageTransition>
    )
}
