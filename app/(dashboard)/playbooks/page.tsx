"use client"

import React, { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
    Plus, 
    Edit, 
    Trash2, 
    Play, 
    Settings, 
    Search, 
    Filter,
    MoreVertical,
    Copy,
    Eye,
    Users,
    Clock,
    Target,
    Zap,
    TrendingUp,
    AlertCircle
} from "@/components/ui/icons-shim"
import { apiClient, Playbook, PlaybookScenario, PlaybookStep, PlaybookExecution } from "@/lib/api"
import { toast } from "@/lib/notify"
import { format, differenceInDays } from "date-fns"
import { SYSTEM_USER_GUID } from "@/server/src/constants/playbook"

interface PlaybookWithStats {
    id: string
    project_id: string
    title: string
    description?: string
    category: 'risk' | 'incident' | 'escalation' | 'resolution'
    trigger_type: 'auto' | 'manual' | 'threshold'
    applicable_risk_categories?: string[]
    applicable_severity_levels?: string[]
    applicable_priority_levels?: string[]
    is_active: boolean
    created_by?: string
    created_at: string
    updated_at: string
    version: number
    previous_version_id?: string
    // Stats
    executions_count?: number
    success_rate?: number
    avg_duration?: number
    last_execution?: string
    scenarios_count?: number
    steps_count?: number
    // Joined data
    scenarios?: any[]
    steps?: any[]
}

export default function PlaybooksPage() {
    const [playbooks, setPlaybooks] = useState<PlaybookWithStats[]>([])
    const [loading, setLoading] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [filterCategory, setFilterCategory] = useState<string>("")
    const [filterStatus, setFilterStatus] = useState<string>("")
    const [filterProject, setFilterProject] = useState<string>("")
    const [showCreateDialog, setShowCreateDialog] = useState(false)
    const [showEditDialog, setShowEditDialog] = useState(false)
    const [selectedPlaybook, setSelectedPlaybook] = useState<PlaybookWithStats | null>(null)
    const [executions, setExecutions] = useState<PlaybookExecution[]>([])
    const [showExecutionsDialog, setShowExecutionsDialog] = useState(false)
    const [activeTab, setActiveTab] = useState("playbooks")

    // Form state for create/edit
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "risk" as 'risk' | 'incident' | 'escalation' | 'resolution',
        trigger_type: "manual" as 'auto' | 'manual' | 'threshold',
        applicable_risk_categories: [] as string[],
        applicable_severity_levels: [] as string[],
        applicable_priority_levels: [] as string[],
        is_active: true
    })

    useEffect(() => {
        fetchPlaybooks()
    }, [])

    const fetchPlaybooks = async () => {
        try {
            setLoading(true)
            const params: any = {}
            if (filterCategory) params.category = filterCategory
            if (filterStatus) params.is_active = filterStatus === "active"
            if (filterProject) params.project_id = filterProject
            if (searchTerm) params.search = searchTerm

            const response = await apiClient.getPlaybooks(params)
            setPlaybooks(response.playbooks || [])
        } catch (error) {
            toast.error("Failed to fetch playbooks")
        } finally {
            setLoading(false)
        }
    }

    const fetchExecutions = async (playbookId: string) => {
        try {
            const response = await apiClient.getPlaybookExecutions({})
            if (response && response.executions) {
                setExecutions(response.executions.filter(e => e.playbook_id === playbookId))
            } else {
                setExecutions([])
            }
        } catch (error) {
            console.error("Failed to fetch executions:", error)
            setExecutions([])
            // Don't show toast for this error as it's not critical
        }
    }

    const handleCreatePlaybook = async () => {
        try {
            const response = await apiClient.createPlaybook(formData)
            toast.success("Playbook created successfully")
            setShowCreateDialog(false)
            resetForm()
            fetchPlaybooks()
        } catch (error: any) {
            toast.error(error.message || "Failed to create playbook")
        }
    }

    const handleUpdatePlaybook = async () => {
        if (!selectedPlaybook) return

        try {
            const response = await apiClient.updatePlaybook(selectedPlaybook.id, formData)
            toast.success("Playbook updated successfully")
            setShowEditDialog(false)
            setSelectedPlaybook(null)
            resetForm()
            fetchPlaybooks()
        } catch (error: any) {
            toast.error(error.message || "Failed to update playbook")
        }
    }

    const handleDeletePlaybook = async (playbookId: string) => {
        if (!confirm("Are you sure you want to delete this playbook? This action cannot be undone.")) {
            return
        }

        try {
            await apiClient.post(`/playbooks/${playbookId}/delete`)
            toast.success("Playbook deleted successfully")
            fetchPlaybooks()
        } catch (error: any) {
            toast.error(error.message || "Failed to delete playbook")
        }
    }

    const handleExecutePlaybook = async (playbookId: string) => {
        try {
            const response = await apiClient.executePlaybook(playbookId, {
                triggered_by_type: 'manual',
                triggered_by_id: SYSTEM_USER_GUID,
                trigger_type: 'manual',
                trigger_reason: 'Manual execution from management interface'
            })
            toast.success("Playbook execution started")
            fetchPlaybooks()
        } catch (error: any) {
            toast.error(error.message || "Failed to execute playbook")
        }
    }

    const handleViewExecutions = (playbook: PlaybookWithStats) => {
        setSelectedPlaybook(playbook)
        fetchExecutions(playbook.id)
        setShowExecutionsDialog(true)
    }

    const resetForm = () => {
        setFormData({
            title: "",
            description: "",
            category: "risk",
            trigger_type: "manual",
            applicable_risk_categories: [],
            applicable_severity_levels: [],
            applicable_priority_levels: [],
            is_active: true
        })
    }

    const openEditDialog = (playbook: PlaybookWithStats) => {
        setSelectedPlaybook(playbook)
        setFormData({
            title: playbook.title,
            description: playbook.description || "",
            category: playbook.category,
            trigger_type: playbook.trigger_type,
            applicable_risk_categories: playbook.applicable_risk_categories || [],
            applicable_severity_levels: playbook.applicable_severity_levels || [],
            applicable_priority_levels: playbook.applicable_priority_levels || [],
            is_active: playbook.is_active
        })
        setShowEditDialog(true)
    }

    const filteredPlaybooks = playbooks.filter(playbook => {
        const matchesSearch = !searchTerm || 
            playbook.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (playbook.description && playbook.description.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCategory = !filterCategory || playbook.category === filterCategory
        const matchesStatus = !filterStatus || 
            (filterStatus === "active" && playbook.is_active) ||
            (filterStatus === "inactive" && !playbook.is_active)
        return matchesSearch && matchesCategory && matchesStatus
    })

    return (
        <div className="flex-1 space-y-6 p-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Playbook Management</h1>
                    <p className="text-muted-foreground">
                        Create and manage operational playbooks for issue resolution
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Playbook
                </Button>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="playbooks">Playbooks</TabsTrigger>
                    <TabsTrigger value="executions">Executions</TabsTrigger>
                    <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="playbooks" className="space-y-4">
                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Filters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <Label htmlFor="search">Search</Label>
                                    <Input
                                        id="search"
                                        placeholder="Search playbooks..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="category">Category</Label>
                                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All categories</SelectItem>
                                            <SelectItem value="risk">Risk</SelectItem>
                                            <SelectItem value="incident">Incident</SelectItem>
                                            <SelectItem value="escalation">Escalation</SelectItem>
                                            <SelectItem value="resolution">Resolution</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="status">Status</Label>
                                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="All status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All status</SelectItem>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="project">Project</Label>
                                    <Input
                                        id="project"
                                        placeholder="Filter by project ID..."
                                        value={filterProject}
                                        onChange={(e) => setFilterProject(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Playbooks Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Playbooks ({filteredPlaybooks.length})</CardTitle>
                            <CardDescription>
                                Manage operational playbooks for automated issue resolution
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : filteredPlaybooks.length === 0 ? (
                                <div className="text-center py-8">
                                    <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                    <h3 className="text-lg font-medium">No playbooks found</h3>
                                    <p className="text-muted-foreground">
                                        {searchTerm || filterCategory || filterStatus || filterProject
                                            ? "No playbooks match your current filters."
                                            : "Get started by creating your first playbook."}
                                    </p>
                                    {!searchTerm && !filterCategory && !filterStatus && !filterProject && (
                                        <Button onClick={() => setShowCreateDialog(true)}>
                                            <Plus className="h-4 w-4 mr-2" />
                                            Create Playbook
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Title</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Executions</TableHead>
                                            <TableHead>Success Rate</TableHead>
                                            <TableHead>Last Used</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPlaybooks.map((playbook) => (
                                            <TableRow key={playbook.id}>
                                                <TableCell className="font-medium">{playbook.title}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {playbook.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {playbook.trigger_type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={playbook.is_active ? "default" : "secondary"}>
                                                        {playbook.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {playbook.executions_count || 0}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {playbook.success_rate 
                                                            ? `${Math.round(playbook.success_rate)}%`
                                                            : "N/A"
                                                        }
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-muted-foreground">
                                                        {playbook.last_execution
                                                            ? format(new Date(playbook.last_execution), "MMM d, yyyy")
                                                            : "Never"
                                                        }
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleViewExecutions(playbook)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => openEditDialog(playbook)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleExecutePlaybook(playbook.id)}
                                                            disabled={!playbook.is_active}
                                                        >
                                                            <Play className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeletePlaybook(playbook.id)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="executions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Executions</CardTitle>
                            <CardDescription>
                                Track playbook execution progress and performance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium">Execution tracking coming soon</h3>
                                <p className="text-muted-foreground">
                                    Detailed execution analytics will be available in Phase 3.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="analytics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Playbook Analytics</CardTitle>
                            <CardDescription>
                                Performance metrics and insights
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-8">
                                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium">Analytics dashboard coming soon</h3>
                                <p className="text-muted-foreground">
                                    Comprehensive analytics will be available in Phase 3.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Auto-Assignment Settings</CardTitle>
                            <CardDescription>
                                Configure automatic playbook assignment rules
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="auto-assign" className="text-base font-medium">
                                            Enable Auto-Assignment
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Automatically assign playbooks to new issues based on confidence scores
                                        </p>
                                    </div>
                                    <Switch id="auto-assign" defaultChecked={true} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confidence-threshold">
                                        Confidence Threshold: <span className="text-muted-foreground ml-2">75%</span>
                                    </Label>
                                    <Slider
                                        id="confidence-threshold"
                                        defaultValue={[75]}
                                        max={100}
                                        step={5}
                                        marks={[
                                            { value: 50, label: "50%" },
                                            { value: 75, label: "75%" },
                                            { value: 90, label: "90%" }
                                        ]}
                                        className="w-full"
                                    />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="require-approval" className="text-base font-medium">
                                            Require Approval
                                        </Label>
                                        <p className="text-sm text-muted-foreground">
                                            Review auto-assignments before execution
                                        </p>
                                    </div>
                                    <Switch id="require-approval" defaultChecked={false} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Playbook Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create New Playbook</DialogTitle>
                        <DialogDescription>
                            Define a structured playbook for issue resolution
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title *</Label>
                                <Input
                                    id="title"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter playbook title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category *</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="risk">Risk</SelectItem>
                                        <SelectItem value="incident">Incident</SelectItem>
                                        <SelectItem value="escalation">Escalation</SelectItem>
                                        <SelectItem value="resolution">Resolution</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe when and how this playbook should be used"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="trigger-type">Trigger Type</Label>
                                <Select
                                    value={formData.trigger_type}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value as any }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="threshold">Threshold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="risk-categories">Risk Categories</Label>
                                <Input
                                    id="risk-categories"
                                    value={formData.applicable_risk_categories.join(", ")}
                                    onChange={(e) => setFormData(prev => ({ ...prev, applicable_risk_categories: e.target.value.split(", ").filter(Boolean) }))}
                                    placeholder="e.g., technical, resource, schedule"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="severity-levels">Severity Levels</Label>
                                <Input
                                    id="severity-levels"
                                    value={formData.applicable_severity_levels.join(", ")}
                                    onChange={(e) => setFormData(prev => ({ ...prev, applicable_severity_levels: e.target.value.split(", ").filter(Boolean) }))}
                                    placeholder="e.g., high, medium, low"
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is-active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            />
                            <Label htmlFor="is-active">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreatePlaybook}>
                            Create Playbook
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Playbook Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Playbook</DialogTitle>
                        <DialogDescription>
                            Update playbook configuration
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-title">Title *</Label>
                                <Input
                                    id="edit-title"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Enter playbook title"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-category">Category *</Label>
                                <Select
                                    value={formData.category}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value as any }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="risk">Risk</SelectItem>
                                        <SelectItem value="incident">Incident</SelectItem>
                                        <SelectItem value="escalation">Escalation</SelectItem>
                                        <SelectItem value="resolution">Resolution</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Describe when and how this playbook should be used"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-trigger-type">Trigger Type</Label>
                                <Select
                                    value={formData.trigger_type}
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, trigger_type: value as any }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="manual">Manual</SelectItem>
                                        <SelectItem value="auto">Auto</SelectItem>
                                        <SelectItem value="threshold">Threshold</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-risk-categories">Risk Categories</Label>
                                <Input
                                    id="edit-risk-categories"
                                    value={formData.applicable_risk_categories.join(", ")}
                                    onChange={(e) => setFormData(prev => ({ ...prev, applicable_risk_categories: e.target.value.split(", ").filter(Boolean) }))}
                                    placeholder="e.g., technical, resource, schedule"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="edit-severity-levels">Severity Levels</Label>
                                <Input
                                    id="edit-severity-levels"
                                    value={formData.applicable_severity_levels.join(", ")}
                                    onChange={(e) => setFormData(prev => ({ ...prev, applicable_severity_levels: e.target.value.split(", ").filter(Boolean) }))}
                                    placeholder="e.g., high, medium, low"
                                />
                            </div>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="edit-is-active"
                                checked={formData.is_active}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                            />
                            <Label htmlFor="edit-is-active">Active</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdatePlaybook}>
                            Update Playbook
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Executions Dialog */}
            <Dialog open={showExecutionsDialog} onOpenChange={setShowExecutionsDialog}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedPlaybook?.title} - Execution History
                        </DialogTitle>
                        <DialogDescription>
                            Track all executions and their progress
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {executions.length === 0 ? (
                            <div className="text-center py-8">
                                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium">No executions yet</h3>
                                <p className="text-muted-foreground">
                                    This playbook hasn't been executed yet.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {executions.map((execution) => (
                                    <div key={execution.id} className="p-3 border rounded-lg">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant={
                                                    execution.status === 'completed' ? 'secondary' :
                                                    execution.status === 'in_progress' ? 'default' : 'destructive'
                                                }>
                                                    {execution.status.replace('_', ' ').toUpperCase()}
                                                </Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    Started: {format(new Date(execution.started_at), 'MMM d, HH:mm')}
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Progress: {execution.completed_steps}/{execution.total_steps} steps
                                            </div>
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                            Trigger: {execution.trigger_type} by {execution.triggered_by_type}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowExecutionsDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
