"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { apiClient } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Globe,
  CheckCircle,
  XCircle,
  MoreHorizontal,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"

interface Company {
  id: string
  name: string
  domain?: string
  metadata?: any
  is_active: boolean
  created_at: string
  updated_at: string
  user_count?: number
  active_user_count?: number
}

export default function CompaniesPage() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [isActiveFilter, setIsActiveFilter] = useState<boolean | undefined>(undefined)
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 })

  const [editFormData, setEditFormData] = useState({
    name: "",
    domain: "",
    is_active: true,
  })

  const [createFormData, setCreateFormData] = useState({
    name: "",
    domain: "",
  })

  // Check authentication and admin role
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      toast.error("Please log in to access this page")
      router.push("/auth/login")
      return
    }

    const isAdminOrSuperAdmin = user?.role === "admin" || user?.role === "super_admin"
    if (!authLoading && user && !isAdminOrSuperAdmin) {
      toast.error("Admin access required")
      router.push("/")
      return
    }
  }, [isAuthenticated, authLoading, user, router])

  // Fetch companies
  useEffect(() => {
    const isAdminOrSuperAdmin = user?.role === "admin" || user?.role === "super_admin"
    if (isAuthenticated && isAdminOrSuperAdmin) {
      fetchCompanies()
    }
  }, [isAuthenticated, user, pagination.page, searchTerm, isActiveFilter])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await apiClient.getCompanies({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm || undefined,
        is_active: isActiveFilter,
      })
      setCompanies(response.companies || [])
      setPagination(prev => ({
        ...prev,
        total: response.pagination?.total || 0,
        pages: response.pagination?.pages || 0,
      }))
    } catch (err: any) {
      console.error("Failed to fetch companies:", err)
      setError(err?.message || "Failed to load companies")
      toast.error(err?.message || "Failed to load companies")
    } finally {
      setLoading(false)
    }
  }

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company)
    setEditFormData({
      name: company.name || "",
      domain: company.domain || "",
      is_active: company.is_active ?? true,
    })
    setShowEditDialog(true)
  }

  const handleSaveCompany = async () => {
    if (!editingCompany) return

    if (!editFormData.name.trim()) {
      toast.error("Company name is required")
      return
    }

    try {
      await apiClient.updateCompany(editingCompany.id, {
        name: editFormData.name,
        domain: editFormData.domain || undefined,
        is_active: editFormData.is_active,
      })

      toast.success("Company updated successfully")
      setShowEditDialog(false)
      setEditingCompany(null)
      fetchCompanies()
    } catch (err: any) {
      console.error("Failed to update company:", err)
      toast.error(err?.message || "Failed to update company")
    }
  }

  const handleCreateCompany = async () => {
    if (!createFormData.name.trim()) {
      toast.error("Company name is required")
      return
    }

    try {
      await apiClient.createCompany({
        name: createFormData.name,
        domain: createFormData.domain || undefined,
      })

      toast.success("Company created successfully")
      setShowCreateDialog(false)
      setCreateFormData({ name: "", domain: "" })
      fetchCompanies()
    } catch (err: any) {
      console.error("Failed to create company:", err)
      toast.error(err?.message || "Failed to create company")
    }
  }

  const handleDeleteCompany = async (company: Company) => {
    if (!confirm(`Are you sure you want to deactivate ${company.name}? This will prevent new users from being assigned to this company, but all existing data will be preserved.`)) {
      return
    }

    try {
      await apiClient.deleteCompany(company.id)
      toast.success("Company deactivated successfully")
      fetchCompanies()
    } catch (err: any) {
      console.error("Failed to deactivate company:", err)
      const errorMessage = err?.response?.data?.message || err?.message || "Failed to deactivate company"
      toast.error(errorMessage)
    }
  }

  if (authLoading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  const isAdminOrSuperAdmin = user?.role === "admin" || user?.role === "super_admin"
  if (!isAdminOrSuperAdmin) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <PageTransition>
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatedLayout>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                      <Building2 className="h-8 w-8 text-blue-600" />
                      Companies
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      Manage companies and tenant organizations
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Company
                  </Button>
                </div>

                {/* Search and Filters */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search companies..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value)
                        setPagination(prev => ({ ...prev, page: 1 }))
                      }}
                      className="pl-10"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Active Only</Label>
                    <Switch
                      checked={isActiveFilter === true}
                      onCheckedChange={(checked: boolean) => {
                        setIsActiveFilter(checked ? true : undefined)
                        setPagination(prev => ({ ...prev, page: 1 }))
                      }}
                    />
                  </div>
                </div>

                {/* Companies List */}
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : error ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <p className="text-destructive">{error}</p>
                      <Button onClick={fetchCompanies} className="mt-4">
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                ) : companies.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">No companies found</p>
                      <Button onClick={() => setShowCreateDialog(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Company
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <AnimatedGrid>
                    {companies.map((company) => (
                      <AnimatedGridItem key={company.id}>
                        <Card className="hover:shadow-lg transition-shadow">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="flex items-center gap-2">
                                  <Building2 className="h-5 w-5 text-blue-600" />
                                  {company.name}
                                </CardTitle>
                                <CardDescription className="mt-2">
                                  {company.domain && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <Globe className="h-4 w-4" />
                                      {company.domain}
                                    </div>
                                  )}
                                </CardDescription>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={company.is_active ? "default" : "secondary"}>
                                  {company.is_active ? (
                                    <>
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Active
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Inactive
                                    </>
                                  )}
                                </Badge>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditCompany(company)}>
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteCompany(company)}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {company.is_active ? "Deactivate" : "Delete"}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4" />
                                {company.active_user_count || 0} active users
                              </div>
                              {company.user_count !== company.active_user_count && (
                                <div className="flex items-center gap-1">
                                  ({company.user_count || 0} total)
                                </div>
                              )}
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Created: {new Date(company.created_at).toLocaleDateString()}
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedGridItem>
                    ))}
                  </AnimatedGrid>
                )}

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-muted-foreground">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} companies
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page >= pagination.pages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedLayout>
          </div>
        </PageTransition>
      </div>

      {/* Create Company Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Create a new company/tenant organization. Users can be assigned to companies for multi-tenant support.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="create-name">Company Name *</Label>
              <Input
                id="create-name"
                value={createFormData.name}
                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                placeholder="Enter company name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="create-domain">Domain (Optional)</Label>
              <Input
                id="create-domain"
                value={createFormData.domain}
                onChange={(e) => setCreateFormData({ ...createFormData, domain: e.target.value })}
                placeholder="example.com"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Company domain for email-based tenant detection
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateCompany}>
              Create Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information and status.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                placeholder="Enter company name"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="edit-domain">Domain (Optional)</Label>
              <Input
                id="edit-domain"
                value={editFormData.domain}
                onChange={(e) => setEditFormData({ ...editFormData, domain: e.target.value })}
                placeholder="example.com"
                className="mt-2"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={editFormData.is_active}
                onCheckedChange={(checked: boolean) => setEditFormData({ ...editFormData, is_active: checked })}
              />
              <Label htmlFor="edit-active">Active Company</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCompany}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

