"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { useAuth } from "@/contexts/AuthContext"
import { Plus, Search, Edit, Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { apiClient } from "@/lib/api"

interface Portfolio {
  id: string
  program_id?: string
  portfolio_name: string
  description?: string
  owner_id?: string
  portfolio_lead?: string
  status: 'active' | 'archived' | 'paused'
  budget?: number
  budget_currency?: string
  start_date?: string
  end_date?: string
  last_risk_review_at?: string
  next_risk_review_due?: string
  risk_review_notes?: string
  created_at: string
  updated_at: string
  program_name?: string
  owner_name?: string
  lead_name?: string
  risk_count?: number
}

export default function PortfoliosPage() {
  const router = useRouter()
  const { isAuthenticated, loading: authLoading } = useAuth()
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null)
  
  const [formData, setFormData] = useState({
    portfolio_name: "",
    description: "",
    status: "active" as 'active' | 'archived' | 'paused',
    budget: "",
    budget_currency: "USD",
    start_date: "",
    end_date: "",
    last_risk_review_at: "",
    next_risk_review_due: "",
    risk_review_notes: "",
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchPortfolios()
    }
  }, [isAuthenticated, statusFilter])

  const fetchPortfolios = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      
      const data = await apiClient.get<{ success: boolean; data: Portfolio[] }>(`/portfolios?${params.toString()}`)
      
      if (data.success) {
        setPortfolios(data.data)
      } else {
        toast.error("Failed to fetch portfolios")
      }
    } catch (error) {
      console.error("Error fetching portfolios:", error)
      toast.error("Failed to fetch portfolios")
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePortfolio = async () => {
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        last_risk_review_at: formData.last_risk_review_at || null,
        next_risk_review_due: formData.next_risk_review_due || null,
      }

      const data = await apiClient.post<{ success: boolean; data?: Portfolio; error?: string }>("/portfolios", payload)

      if (data.success) {
        toast.success("Portfolio created successfully")
        setIsCreateDialogOpen(false)
        resetForm()
        fetchPortfolios()
      } else {
        toast.error(data.error || "Failed to create portfolio")
      }
    } catch (error) {
      console.error("Error creating portfolio:", error)
      toast.error("Failed to create portfolio")
    }
  }

  const handleUpdatePortfolio = async () => {
    if (!editingPortfolio) return

    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        last_risk_review_at: formData.last_risk_review_at || null,
        next_risk_review_due: formData.next_risk_review_due || null,
      }

      const data = await apiClient.put<{ success: boolean; data?: Portfolio; error?: string }>(`/portfolios/${editingPortfolio.id}`, payload)

      if (data.success) {
        toast.success("Portfolio updated successfully")
        setEditingPortfolio(null)
        resetForm()
        fetchPortfolios()
      } else {
        toast.error(data.error || "Failed to update portfolio")
      }
    } catch (error) {
      console.error("Error updating portfolio:", error)
      toast.error("Failed to update portfolio")
    }
  }

  const handleDeletePortfolio = async (id: string) => {
    if (!confirm("Are you sure you want to archive this portfolio?")) return

    try {
      const data = await apiClient.delete<{ success: boolean; error?: string }>(`/portfolios/${id}`)

      if (data.success) {
        toast.success("Portfolio archived successfully")
        fetchPortfolios()
      } else {
        toast.error(data.error || "Failed to archive portfolio")
      }
    } catch (error) {
      console.error("Error deleting portfolio:", error)
      toast.error("Failed to archive portfolio")
    }
  }

  const openEditDialog = (portfolio: Portfolio) => {
    setEditingPortfolio(portfolio)
    setFormData({
      portfolio_name: portfolio.portfolio_name,
      description: portfolio.description || "",
      status: portfolio.status,
      budget: portfolio.budget?.toString() || "",
      budget_currency: portfolio.budget_currency || "USD",
      start_date: portfolio.start_date || "",
      end_date: portfolio.end_date || "",
      last_risk_review_at: portfolio.last_risk_review_at || "",
      next_risk_review_due: portfolio.next_risk_review_due || "",
      risk_review_notes: portfolio.risk_review_notes || "",
    })
  }

  const resetForm = () => {
    setFormData({
      portfolio_name: "",
      description: "",
      status: "active",
      budget: "",
      budget_currency: "USD",
      start_date: "",
      end_date: "",
      last_risk_review_at: "",
      next_risk_review_due: "",
      risk_review_notes: "",
    })
  }

  const filteredPortfolios = portfolios.filter(p =>
    p.portfolio_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default'
      case 'paused': return 'secondary'
      case 'archived': return 'outline'
      default: return 'default'
    }
  }

  if (authLoading || loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="flex-1 p-8">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading portfolios...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Portfolio Management</h1>
                <p className="text-gray-600 mt-1">
                  Manage your organizational portfolios and track monthly risk reviews
                </p>
              </div>
              <Dialog open={isCreateDialogOpen || !!editingPortfolio} onOpenChange={(open: boolean) => {
                if (!open) {
                  setIsCreateDialogOpen(false)
                  setEditingPortfolio(null)
                  resetForm()
                }
              }}>
                <DialogTrigger asChild>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Portfolio
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingPortfolio ? "Edit Portfolio" : "Create New Portfolio"}</DialogTitle>
                    <DialogDescription>
                      {editingPortfolio ? "Update portfolio details and risk review information" : "Add a new portfolio to track programs and projects"}
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="portfolio_name">Portfolio Name *</Label>
                      <Input
                        id="portfolio_name"
                        value={formData.portfolio_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, portfolio_name: e.target.value })}
                        placeholder="Enter portfolio name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter portfolio description"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value: 'active' | 'archived' | 'paused') => 
                            setFormData({ ...formData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="paused">Paused</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="budget_currency">Currency</Label>
                        <Select
                          value={formData.budget_currency}
                          onValueChange={(value: string) => setFormData({ ...formData, budget_currency: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="GBP">GBP</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="budget">Budget</Label>
                      <Input
                        id="budget"
                        type="number"
                        value={formData.budget}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, budget: e.target.value })}
                        placeholder="Enter budget amount"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, start_date: e.target.value })}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, end_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-4">
                      <h3 className="text-sm font-semibold mb-3">Monthly Risk Review Tracking</h3>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="last_risk_review_at">Last Review Date</Label>
                          <Input
                            id="last_risk_review_at"
                            type="date"
                            value={formData.last_risk_review_at}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, last_risk_review_at: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="next_risk_review_due">Next Review Due</Label>
                          <Input
                            id="next_risk_review_due"
                            type="date"
                            value={formData.next_risk_review_due}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, next_risk_review_due: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mt-4">
                        <Label htmlFor="risk_review_notes">Review Notes</Label>
                        <Textarea
                          id="risk_review_notes"
                          value={formData.risk_review_notes}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, risk_review_notes: e.target.value })}
                          placeholder="Enter notes from the last risk review"
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsCreateDialogOpen(false)
                        setEditingPortfolio(null)
                        resetForm()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={editingPortfolio ? handleUpdatePortfolio : handleCreatePortfolio}
                      disabled={!formData.portfolio_name}
                    >
                      {editingPortfolio ? "Update" : "Create"} Portfolio
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search portfolios..."
                      value={searchQuery}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Portfolios Table */}
            <Card>
              <CardHeader>
                <CardTitle>Portfolios</CardTitle>
                <CardDescription>
                  {filteredPortfolios.length} portfolio{filteredPortfolios.length !== 1 ? 's' : ''} found
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Timeline</TableHead>
                      <TableHead>Risks</TableHead>
                      <TableHead>Last Review</TableHead>
                      <TableHead>Next Review</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPortfolios.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No portfolios found. Create your first portfolio to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPortfolios.map((portfolio) => (
                        <TableRow key={portfolio.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{portfolio.portfolio_name}</div>
                              {portfolio.description && (
                                <div className="text-sm text-gray-500 truncate max-w-xs">
                                  {portfolio.description}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(portfolio.status)}>
                              {portfolio.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {portfolio.budget ? (
                              <span>
                                {portfolio.budget_currency || 'USD'} {portfolio.budget.toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {portfolio.start_date && portfolio.end_date ? (
                              <div className="text-sm">
                                <div>{new Date(portfolio.start_date).toLocaleDateString()}</div>
                                <div className="text-gray-500">to {new Date(portfolio.end_date).toLocaleDateString()}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {portfolio.risk_count && portfolio.risk_count > 0 ? (
                              <Badge variant="outline" className="gap-1">
                                <TriangleAlert className="h-3 w-3" />
                                {portfolio.risk_count}
                              </Badge>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {portfolio.last_risk_review_at ? (
                              <span className="text-sm">
                                {new Date(portfolio.last_risk_review_at).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {portfolio.next_risk_review_due ? (
                              <span className="text-sm">
                                {new Date(portfolio.next_risk_review_due).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(portfolio)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeletePortfolio(portfolio.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

