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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"
import { PageTransition } from "@/components/page-transition"
import { AnimatedLayout, AnimatedGrid, AnimatedGridItem } from "@/components/animated-layout"
import { motion } from "framer-motion"
import {
  Users,
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Crown,
  Key,
  Mail,
  Calendar,
  MoreHorizontal,
  Settings,
  Sparkles,
  Activity,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Role mapping: backend role -> display name
const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Administrator",
  manager: "Project Manager",
  user: "User",
  viewer: "Viewer",
  ccb: "Change Control Board",
}

// Reverse mapping: display name -> backend role
const DISPLAY_TO_ROLE: Record<string, string> = {
  "Administrator": "admin",
  "Project Manager": "manager",
  "User": "user",
  "Viewer": "viewer",
  "Change Control Board": "ccb",
}

interface User {
  id: string
  name: string
  email: string
  role: string
  is_active: boolean
  last_login?: string
  created_at: string
  avatar_url?: string
}

export default function UsersAndRoles() {
  const router = useRouter()
  const { user, isAuthenticated, loading: authLoading } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [editFormData, setEditFormData] = useState<{
    name: string
    email: string
    role: string
    is_active: boolean
  }>({
    name: "",
    email: "",
    role: "user",
    is_active: true,
  })
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createFormData, setCreateFormData] = useState<{
    name: string
    email: string
    role: string
    password: string
    department: string
    notes: string
    sendInvite: boolean
  }>({
    name: "",
    email: "",
    role: "user",
    password: "",
    department: "",
    notes: "",
    sendInvite: false,
  })
  const [creating, setCreating] = useState(false)

  const [roles] = useState([
    {
      id: "1",
      name: "Administrator",
      description: "Full system access with user and system management capabilities",
      permissions: [
        "full_access",
        "user_management",
        "system_config",
        "security_settings",
        "audit_logs",
        "integration_management",
      ],
      userCount: 2,
      color: "from-red-500 to-pink-500",
      icon: Crown,
      isSystem: true,
    },
    {
      id: "2",
      name: "Project Manager",
      description: "Manage projects, teams, and document generation workflows",
      permissions: ["project_access", "document_generation", "team_management", "template_access", "analytics_view"],
      userCount: 8,
      color: "from-blue-500 to-cyan-500",
      icon: Users,
      isSystem: false,
    },
    {
      id: "3",
      name: "Business Analyst",
      description: "Document generation, analysis, and reporting capabilities",
      permissions: ["document_generation", "template_access", "analytics_view", "report_generation"],
      userCount: 15,
      color: "from-purple-500 to-indigo-500",
      icon: Activity,
      isSystem: false,
    },
    {
      id: "4",
      name: "Developer",
      description: "Technical access to templates, integrations, and system configuration",
      permissions: ["template_access", "integration_config", "api_access", "debug_mode"],
      userCount: 6,
      color: "from-emerald-500 to-teal-500",
      icon: Settings,
      isSystem: false,
    },
    {
      id: "5",
      name: "Data Manager",
      description: "Data access, analytics, and reporting with governance oversight",
      permissions: ["data_access", "analytics_view", "report_generation", "data_governance"],
      userCount: 4,
      color: "from-orange-500 to-amber-500",
      icon: Shield,
      isSystem: false,
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [roleFilter, setRoleFilter] = useState("all")

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/auth/login")
      toast.error("Please log in to access this page")
    }
  }, [isAuthenticated, authLoading, router])

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && user && user.role !== "admin") {
      router.push("/")
      toast.error("Access denied: Admin role required")
    }
  }, [user, authLoading, router])

  // Fetch users from API
  useEffect(() => {
    const fetchUsers = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return
      }

      // Don't fetch if not authenticated or not admin
      if (!isAuthenticated || !user || user.role !== "admin") {
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        // Ensure token is set in API client
        const token = localStorage.getItem("auth_token")
        if (token) {
          apiClient.setToken(token)
        } else {
          throw new Error("No authentication token found")
        }
        
        // Request all users with a higher limit (max 100 per backend validation)
        const response = await apiClient.request<{ users: User[]; pagination: any }>("/users?limit=100")
        console.log("[Users] API Response:", response)
        
        // Handle paginated response
        const usersList = response?.users || []
        
        if (!usersList || usersList.length === 0) {
          console.log("[Users] No users found in response")
          setUsers([])
        } else {
          console.log(`[Users] Loaded ${usersList.length} users`)
          setUsers(usersList)
        }
      } catch (err: any) {
        console.error("[Users] Failed to fetch users:", err)
        console.error("[Users] Error details:", {
          message: err?.message,
          status: err?.status,
          response: err?.response,
          stack: err?.stack
        })
        
        // Check for specific error types
        let errorMessage = "Failed to load users. Please try again."
        
        if (err?.status === 403 || err?.response?.status === 403) {
          errorMessage = "Access denied. Admin role required to view users."
        } else if (err?.status === 401 || err?.response?.status === 401) {
          errorMessage = "Authentication required. Please log in."
          // Redirect to login
          router.push("/auth/login")
        } else if (err?.response?.data?.error) {
          errorMessage = err.response.data.error
        } else if (err?.message) {
          errorMessage = err.message
        }
        
        setError(errorMessage)
        toast.error(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    void fetchUsers()
  }, [isAuthenticated, user, authLoading, router])

  // Handle edit user
  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
      is_active: user.is_active ?? true,
    })
    setShowEditDialog(true)
  }

  // Save user changes
  const handleSaveUser = async () => {
    if (!editingUser) return

    // Prevent admins from changing their own role
    if (user && editingUser.id === user.id && user.role === "admin" && editFormData.role !== "admin") {
      toast.error("Cannot change your own role from admin. Please create a separate CCB user account or have another admin make this change.")
      return
    }

    // Prevent admins from deactivating themselves
    if (user && editingUser.id === user.id && user.role === "admin" && !editFormData.is_active) {
      toast.error("Cannot deactivate your own account. Please have another admin make this change.")
      return
    }

    try {
      await apiClient.updateUser(editingUser.id, {
        name: editFormData.name,
        email: editFormData.email,
        role: editFormData.role,
        is_active: editFormData.is_active,
      })

      // Refresh users list
      const response = await apiClient.request<{ users: User[]; pagination: any }>("/users?limit=100")
      setUsers(response?.users || [])

      toast.success("User updated successfully")
      setShowEditDialog(false)
      setEditingUser(null)
    } catch (err: any) {
      console.error("Failed to update user:", err)
      const errorMessage = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to update user"
      toast.error(errorMessage)
    }
  }

  // Toggle user active status
  const handleToggleActive = async (user: User) => {
    try {
      await apiClient.updateUser(user.id, {
        is_active: !user.is_active,
      })

      // Refresh users list
      const response = await apiClient.request<{ users: User[]; pagination: any }>("/users?limit=100")
      setUsers(response?.users || [])

      toast.success(`User ${!user.is_active ? "activated" : "deactivated"} successfully`)
    } catch (err) {
      console.error("Failed to update user status:", err)
      toast.error("Failed to update user status")
    }
  }

  // Create new user
  const handleCreateUser = async () => {
    try {
      setCreating(true)

      // Validate password strength
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
      if (!passwordRegex.test(createFormData.password)) {
        toast.error("Password must contain at least one uppercase letter, one lowercase letter, and one number")
        setCreating(false)
        return
      }

      // Call API to create user
      const response = await apiClient.post("/users", {
        name: createFormData.name,
        email: createFormData.email,
        password: createFormData.password,
        role: createFormData.role,
      })

      // Refresh users list
      const usersResponse = await apiClient.request<{ users: User[]; pagination: any }>("/users?limit=100")
      setUsers(usersResponse?.users || [])

      toast.success(`User ${createFormData.name} created successfully!`)
      
      // Reset form and close dialog
      setCreateFormData({
        name: "",
        email: "",
        role: "user",
        password: "",
        department: "",
        notes: "",
        sendInvite: false,
      })
      setShowCreateDialog(false)

      // TODO: Send invitation email if sendInvite is true
      if (createFormData.sendInvite) {
        console.log("[Users] Invitation email would be sent to:", createFormData.email)
        // Implement email sending logic here if needed
      }
    } catch (err: any) {
      console.error("Failed to create user:", err)
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create user"
      toast.error(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  // Delete user
  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete ${user.name || user.email}?`)) {
      return
    }

    try {
      await apiClient.delete(`/users/${user.id}`)
      
      // Refresh users list
      const response = await apiClient.request<{ users: User[]; pagination: any }>("/users?limit=100")
      setUsers(response?.users || [])

      toast.success("User deleted successfully")
    } catch (err) {
      console.error("Failed to delete user:", err)
      toast.error("Failed to delete user")
    }
  }

  const filteredUsers = users.filter((user) => {
    const displayRole = ROLE_DISPLAY_NAMES[user.role] || user.role
    const matchesSearch =
      (user.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || "").toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" && user.is_active) || (statusFilter === "inactive" && !user.is_active)
    const matchesRole = roleFilter === "all" || displayRole === roleFilter
    return matchesSearch && matchesStatus && matchesRole
  })

  // Get unique roles for filter dropdown
  const availableRoles = Array.from(new Set(users.map(u => ROLE_DISPLAY_NAMES[u.role] || u.role)))

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
      : "bg-gradient-to-r from-slate-500 to-gray-500 text-white"
  }

  const getRoleIcon = (role: string) => {
    const displayRole = ROLE_DISPLAY_NAMES[role] || role
    switch (displayRole) {
      case "Administrator":
        return Crown
      case "Project Manager":
        return Users
      case "Change Control Board":
        return Shield
      case "User":
        return UserCheck
      case "Viewer":
        return UserX
      default:
        return UserCheck
    }
  }

  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.split(" ")
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return name.substring(0, 2).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    )
  }

  // Show access denied if not authenticated or not admin
  if (!isAuthenticated || !user || user.role !== "admin") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-slate-500 dark:text-slate-400">
            {!isAuthenticated 
              ? "Please log in to access this page."
              : "Admin role required to view users."}
          </p>
        </div>
      </div>
    )
  }

  const statsData = [
    {
      title: "Total Users",
      value: users.length.toString(),
      description: `${users.filter((u) => u.status === "active").length} active users`,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
      trend: "+12%",
    },
    {
      title: "Active Sessions",
      value: "23",
      description: "Currently logged in",
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
      trend: "+8%",
    },
    {
      title: "Roles Defined",
      value: roles.length.toString(),
      description: "Custom role configurations",
      icon: Shield,
      color: "text-purple-500",
      bgColor: "bg-purple-50 dark:bg-purple-900/20",
      trend: "+2",
    },
    {
      title: "Security Events",
      value: "3",
      description: "Last 24 hours",
      icon: AlertCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      trend: "-5",
    },
  ]

  return (
    <PageTransition>
      <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <AnimatedLayout className="space-y-8">
              {/* Hero Header */}
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg"
                    >
                      <Users className="h-8 w-8 text-white" />
                    </motion.div>
                    <div>
                      <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                      >
                        Users & Roles
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                        className="text-slate-600 dark:text-slate-300 text-lg"
                      >
                        Manage user accounts, permissions, and role-based access control
                      </motion.p>
                    </div>
                  </div>
                </div>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
                        <Plus className="h-4 w-4 mr-2" />
                        Add User
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                        >
                          <Sparkles className="h-4 w-4 ml-2" />
                        </motion.div>
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Add New User
                        </DialogTitle>
                        <DialogDescription className="text-slate-600 dark:text-slate-300">
                          Create a new user account with appropriate role and permissions.
                        </DialogDescription>
                      </DialogHeader>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleCreateUser()
                        }}
                      >
                        <div className="grid gap-6 py-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="user-name" className="text-sm font-semibold">
                                Full Name *
                              </Label>
                              <Input
                                id="user-name"
                                placeholder="Enter full name"
                                value={createFormData.name}
                                onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                                required
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                            <div>
                              <Label htmlFor="user-email" className="text-sm font-semibold">
                                Email Address *
                              </Label>
                              <Input
                                id="user-email"
                                type="email"
                                placeholder="user@company.com"
                                value={createFormData.email}
                                onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
                                required
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="user-password" className="text-sm font-semibold">
                                Password *
                              </Label>
                              <Input
                                id="user-password"
                                type="password"
                                placeholder="Min 8 characters"
                                value={createFormData.password}
                                onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                                required
                                minLength={8}
                                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                              />
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                Must contain uppercase, lowercase, and number
                              </p>
                            </div>
                            <div>
                              <Label htmlFor="user-role" className="text-sm font-semibold">
                                Role *
                              </Label>
                              <Select
                                value={ROLE_DISPLAY_NAMES[createFormData.role] || createFormData.role}
                                onValueChange={(value) => {
                                  const backendRole = DISPLAY_TO_ROLE[value] || value
                                  setCreateFormData({ ...createFormData, role: backendRole })
                                }}
                              >
                                <SelectTrigger className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500">
                                  <SelectValue placeholder="Select role" />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ROLE_DISPLAY_NAMES).map(([backendRole, displayName]) => (
                                    <SelectItem key={backendRole} value={displayName}>
                                      {displayName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="user-department" className="text-sm font-semibold">
                              Department (Optional)
                            </Label>
                            <Input
                              id="user-department"
                              placeholder="e.g., Engineering, Product"
                              value={createFormData.department}
                              onChange={(e) => setCreateFormData({ ...createFormData, department: e.target.value })}
                              className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div>
                            <Label htmlFor="user-notes" className="text-sm font-semibold">
                              Notes (Optional)
                            </Label>
                            <Textarea
                              id="user-notes"
                              placeholder="Additional notes about the user"
                              value={createFormData.notes}
                              onChange={(e) => setCreateFormData({ ...createFormData, notes: e.target.value })}
                              className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              id="send-invite"
                              checked={createFormData.sendInvite}
                              onCheckedChange={(checked) => setCreateFormData({ ...createFormData, sendInvite: checked })}
                            />
                            <Label htmlFor="send-invite" className="text-sm">
                              Send invitation email to user
                            </Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setShowCreateDialog(false)
                              setCreateFormData({
                                name: "",
                                email: "",
                                role: "user",
                                password: "",
                                department: "",
                                notes: "",
                                sendInvite: false,
                              })
                            }}
                            disabled={creating}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
                            disabled={creating || !createFormData.name || !createFormData.email || !createFormData.password || createFormData.password.length < 8}
                          >
                            {creating ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Creating...
                              </>
                            ) : (
                              "Create User"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                </motion.div>
              </motion.div>

              {/* Stats Cards */}
              <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsData.map((stat, index) => (
                  <AnimatedGridItem key={stat.title}>
                    <Card className="hover-lift glass border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-300">
                          {stat.title}
                        </CardTitle>
                        <motion.div whileHover={{ scale: 1.1, rotate: 5 }} className={`p-2 rounded-lg ${stat.bgColor}`}>
                          <stat.icon className={`h-5 w-5 ${stat.color}`} />
                        </motion.div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 200 }}
                              className="text-3xl font-bold text-slate-800 dark:text-slate-100"
                            >
                              {stat.value}
                            </motion.div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stat.description}</p>
                          </div>
                          <motion.div
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 + 0.5 }}
                            className={`flex items-center space-x-1 ${
                              stat.trend.startsWith("+")
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            <span className="text-sm font-medium">{stat.trend}</span>
                          </motion.div>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedGridItem>
                ))}
              </AnimatedGrid>

              <Tabs defaultValue="users" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                  {/* Search and Filter */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="flex items-center space-x-4"
                  >
                    <div className="relative flex-1 max-w-md group">
                      <motion.div whileHover={{ scale: 1.02 }} className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 transition-colors group-focus-within:text-blue-500" />
                        <Input
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20"
                        />
                      </motion.div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Filter className="h-4 w-4 text-slate-400" />
                      <motion.select
                        whileHover={{ scale: 1.02 }}
                        className="flex h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-blue-500 transition-colors"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </motion.select>
                      <motion.select
                        whileHover={{ scale: 1.02 }}
                        className="flex h-10 rounded-md border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm px-3 py-2 text-sm focus:border-blue-500 transition-colors"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                      >
                        <option value="all">All Roles</option>
                        {availableRoles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </motion.select>
                    </div>
                  </motion.div>

                  {/* Loading State */}
                  {loading && (
                    <div className="text-center py-16">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                      <p className="text-slate-500 dark:text-slate-400">Loading users...</p>
                    </div>
                  )}

                  {/* Error State */}
                  {error && !loading && (
                    <div className="text-center py-16">
                      <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                      <p className="text-red-600 dark:text-red-400">{error}</p>
                      <Button onClick={() => window.location.reload()} className="mt-4">
                        Retry
                      </Button>
                    </div>
                  )}

                  {/* Users List */}
                  {!loading && !error && (
                    <AnimatedGrid className="space-y-4">
                      {filteredUsers.map((user, index) => {
                        const RoleIcon = getRoleIcon(user.role)
                        const displayRole = ROLE_DISPLAY_NAMES[user.role] || user.role
                        const initials = getInitials(user.name || "", user.email)
                        const lastLoginDate = user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"
                        return (
                          <AnimatedGridItem key={user.id}>
                            <Card className="glass border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover-lift group">
                              <CardContent className="p-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-4">
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
                                    >
                                      <span className="text-white font-bold text-lg">{initials}</span>
                                    </motion.div>
                                    <div className="flex-1">
                                      <div className="flex items-center space-x-3 mb-2">
                                        <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-100">
                                          {user.name || user.email}
                                        </h3>
                                        <Badge className={getStatusColor(user.is_active)}>
                                          {user.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                        <Badge variant="outline" className="flex items-center space-x-1">
                                          <RoleIcon className="h-3 w-3" />
                                          <span>{displayRole}</span>
                                        </Badge>
                                      </div>
                                      <div className="flex items-center space-x-6 text-sm text-slate-500 dark:text-slate-400">
                                        <div className="flex items-center space-x-1">
                                          <Mail className="h-3 w-3" />
                                          <span>{user.email}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <Calendar className="h-3 w-3" />
                                          <span>Last login: {lastLoginDate}</span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <Calendar className="h-3 w-3" />
                                          <span>Joined: {new Date(user.created_at).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
                                  >
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-100 dark:hover:bg-slate-700"
                                        >
                                          <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="glass border-0 shadow-xl">
                                        <DropdownMenuItem 
                                          className="hover:bg-slate-50 dark:hover:bg-slate-800"
                                          onClick={() => handleEditUser(user)}
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Edit User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="hover:bg-slate-50 dark:hover:bg-slate-800"
                                          onClick={() => handleToggleActive(user)}
                                        >
                                          {user.is_active ? (
                                            <>
                                              <UserX className="h-4 w-4 mr-2" />
                                              Deactivate
                                            </>
                                          ) : (
                                            <>
                                              <UserCheck className="h-4 w-4 mr-2" />
                                              Activate
                                            </>
                                          )}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                                          onClick={() => handleDeleteUser(user)}
                                        >
                                          <Trash2 className="h-4 w-4 mr-2" />
                                          Delete User
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </motion.div>
                                </div>
                              </CardContent>
                            </Card>
                          </AnimatedGridItem>
                        )
                      })}
                    </AnimatedGrid>
                  )}

                  {filteredUsers.length === 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                      className="text-center py-16"
                    >
                      <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                        className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl inline-block mb-6"
                      >
                        <Users className="h-16 w-16 text-slate-400 mx-auto" />
                      </motion.div>
                      <h3 className="text-2xl font-bold text-slate-700 dark:text-slate-200 mb-2">No users found</h3>
                      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
                        {searchTerm || statusFilter !== "all" || roleFilter !== "all"
                          ? "Try adjusting your search or filter criteria to find what you're looking for"
                          : "Add your first user to get started with user management"}
                      </p>
                    </motion.div>
                  )}
                </TabsContent>

                <TabsContent value="roles" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Role Management</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Configure roles and their associated permissions
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Role
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
                        <DialogHeader>
                          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Create New Role
                          </DialogTitle>
                          <DialogDescription className="text-slate-600 dark:text-slate-300">
                            Define a new role with specific permissions and access levels.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-6 py-4">
                          <div>
                            <Label htmlFor="role-name" className="text-sm font-semibold">
                              Role Name
                            </Label>
                            <Input
                              id="role-name"
                              placeholder="Enter role name"
                              className="mt-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 transition-colors"
                            />
                          </div>
                          <div>
                            <Label htmlFor="role-description" className="text-sm font-semibold">
                              Description
                            </Label>
                            <Textarea
                              id="role-description"
                              placeholder="Describe the role and its responsibilities"
                              className="mt-2 border-slate-200 dark:border-slate-700 focus:border-purple-500 transition-colors"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-semibold mb-3 block">Permissions</Label>
                            <div className="grid grid-cols-2 gap-3">
                              {[
                                "User Management",
                                "Project Access",
                                "Document Generation",
                                "Template Access",
                                "Analytics View",
                                "System Configuration",
                                "Integration Management",
                                "Security Settings",
                              ].map((permission) => (
                                <div key={permission} className="flex items-center space-x-2">
                                  <Switch id={permission.toLowerCase().replace(" ", "-")} />
                                  <Label htmlFor={permission.toLowerCase().replace(" ", "-")} className="text-sm">
                                    {permission}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="submit"
                            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
                          >
                            Create Role
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <AnimatedGrid className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map((role, index) => (
                      <AnimatedGridItem key={role.id}>
                        <Card className="glass border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover-lift group">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className={`p-3 bg-gradient-to-br ${role.color} rounded-xl shadow-lg`}
                              >
                                <role.icon className="h-6 w-6 text-white" />
                              </motion.div>
                              <div className="flex flex-col space-y-2">
                                {role.isSystem && (
                                  <Badge variant="outline" className="text-xs">
                                    System Role
                                  </Badge>
                                )}
                                <Badge variant="secondary">{role.userCount} users</Badge>
                              </div>
                            </div>
                            <CardTitle className="text-xl group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {role.name}
                            </CardTitle>
                            <CardDescription className="line-clamp-2">{role.description}</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Permissions</Label>
                              <div className="flex flex-wrap gap-1">
                                {role.permissions.slice(0, 3).map((permission) => (
                                  <Badge key={permission} variant="outline" className="text-xs">
                                    {permission.replace("_", " ")}
                                  </Badge>
                                ))}
                                {role.permissions.length > 3 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{role.permissions.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex space-x-2 pt-2">
                              <Button size="sm" className="flex-1">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button variant="outline" size="sm" disabled={role.isSystem}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </AnimatedGridItem>
                    ))}
                  </AnimatedGrid>
                </TabsContent>
              </Tabs>
            </AnimatedLayout>
          </main>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[600px] glass border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Edit User
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-300">
              Update user information and role assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div>
              <Label htmlFor="edit-name" className="text-sm font-semibold">
                Name
              </Label>
              <Input
                id="edit-name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="edit-email" className="text-sm font-semibold">
                Email
              </Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <Label htmlFor="edit-role" className="text-sm font-semibold">
                Role
              </Label>
              <Select
                value={ROLE_DISPLAY_NAMES[editFormData.role] || editFormData.role}
                onValueChange={(value) => {
                  const backendRole = DISPLAY_TO_ROLE[value] || value
                  
                  // Warn if admin is trying to change their own role
                  if (user && editingUser && editingUser.id === user.id && user.role === "admin" && backendRole !== "admin") {
                    if (!confirm("⚠️ WARNING: Changing your own role from Admin will remove your admin access!\n\nYou will lose access to:\n- User management\n- System configuration\n- Admin-only features\n\nConsider creating a separate CCB user account instead.\n\nDo you want to continue?")) {
                      return
                    }
                  }
                  
                  setEditFormData({ ...editFormData, role: backendRole })
                }}
                disabled={user && editingUser && editingUser.id === user.id && user.role === "admin"}
              >
                <SelectTrigger className="mt-2 border-slate-200 dark:border-slate-700 focus:border-blue-500 transition-colors">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_DISPLAY_NAMES).map(([backendRole, displayName]) => (
                    <SelectItem key={backendRole} value={displayName}>
                      {displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {user && editingUser && editingUser.id === user.id && user.role === "admin" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ You cannot change your own role from Admin. Create a separate CCB user account instead.
                </p>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-active"
                checked={editFormData.is_active}
                onCheckedChange={(checked) => {
                  // Prevent admins from deactivating themselves
                  if (user && editingUser && editingUser.id === user.id && user.role === "admin" && !checked) {
                    toast.error("Cannot deactivate your own account. Please have another admin make this change.")
                    return
                  }
                  setEditFormData({ ...editFormData, is_active: checked })
                }}
                disabled={user && editingUser && editingUser.id === user.id && user.role === "admin"}
              />
              <Label htmlFor="edit-active" className="text-sm font-semibold">
                Active User
              </Label>
              {user && editingUser && editingUser.id === user.id && user.role === "admin" && (
                <p className="text-xs text-amber-600 dark:text-amber-400 ml-2">
                  ⚠️ Cannot deactivate your own account
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false)
                setEditingUser(null)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveUser}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  )
}
