"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/AuthContext"
import { apiClient } from "@/lib/api"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  LayoutDashboard,
  Settings,
  Users,
  FileText,
  Zap,
  LinkIcon,
  BarChart3,
  Shield,
  Activity,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Search,
  Layers,
  LogOut,
  Workflow,
  TrendingUp,
  CheckCircle,
  BookOpen,
  Target,
  Gauge,
  Building2,
  FileDown,
  MessageSquare,
  Brain,
} from "lucide-react"

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: boolean
  adminOnly?: boolean
}

const navigation: NavItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "Resource Capacity", href: "/capacity", icon: Gauge },
  { name: "Approvals", href: "/approvals", icon: CheckCircle, badge: true },
  { name: "Search", href: "/search", icon: Search },
  { name: "AI Providers", href: "/ai-providers", icon: Zap, adminOnly: true },
  { name: "AI Model Settings", href: "/settings/ai-models", icon: Brain, adminOnly: true },
  { name: "Morphic Mission Control", href: "/ai/morphic/settings", icon: Activity, adminOnly: true },
  { name: "AI Analytics", href: "/ai-analytics", icon: TrendingUp },
  { name: "AI Search", href: "/ai-search", icon: MessageSquare },
  { name: "Integrations", href: "/integrations", icon: LinkIcon, adminOnly: true },
  { name: "Templates", href: "/templates", icon: FileText },

  { name: "Template Builder", href: "/templates/builder", icon: Layers, adminOnly: true },
  { name: "PMBOK 6 Processes", href: "/pmbok6", icon: BookOpen },
  { name: "Process Flow Workflow", href: "/process-flow", icon: Workflow, adminOnly: true },
  { name: "Users & Roles", href: "/users", icon: Users, adminOnly: true },
  { name: "Companies", href: "/companies", icon: Building2, adminOnly: true },
  { name: "Job Monitor", href: "/jobs", icon: Activity, adminOnly: true },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Security", href: "/security", icon: Shield, adminOnly: true },
  { name: "System Settings", href: "/settings", icon: Settings, adminOnly: true },
]

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const userInitials =
    user?.name
      ?.split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"

  useEffect(() => {
    if (user) {
      fetchPendingApprovals()
      // Refresh every 30 seconds
      const interval = setInterval(fetchPendingApprovals, 30000)
      return () => clearInterval(interval)
    }
  }, [user])

  const fetchPendingApprovals = async () => {
    try {
      const response = await apiClient.get<any>('/approvals/stats/user')
      // API returns { success: true, stats: {...} } or direct stats object
      const stats = response.stats || response
      setPendingCount(stats?.pending || 0)
    } catch (error) {
      // Silently fail - don't show errors in sidebar
      console.error('Failed to fetch pending approvals:', error)
      setPendingCount(0)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out shadow-xl",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        {!collapsed && (
          <div className="flex items-center space-x-3 animate-fade-in-up">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg animate-pulse-glow">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                ADPA
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">Admin Portal</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4 transition-transform duration-200" />
          ) : (
            <ChevronLeft className="h-4 w-4 transition-transform duration-200" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-6 custom-scrollbar">
        <nav className="space-y-2">
          {navigation
            .filter((item: NavItem) => {
              // Hide admin-only items for non-admin/super-admin users
              // Super admin has all admin privileges
              const isAdminOrSuperAdmin = user?.role === "admin" || user?.role === "super_admin"
              if (item.adminOnly && !isAdminOrSuperAdmin) {
                return false
              }
              return true
            })
            .map((item, index) => {
              const isActive = pathname === item.href
              const showBadge = item.badge && pendingCount > 0
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start transition-all duration-200 hover-lift group relative overflow-hidden",
                      collapsed && "px-2",
                      isActive &&
                      "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-700 shadow-md",
                      !isActive && "hover:bg-slate-100 dark:hover:bg-slate-700 hover:shadow-md",
                    )}
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <item.icon
                      className={cn(
                        "h-5 w-5 transition-all duration-200",
                        isActive && "text-blue-600 dark:text-blue-400",
                        "group-hover:scale-110",
                      )}
                    />
                    {!collapsed && (
                      <span
                        className={cn(
                          "ml-3 transition-all duration-200 flex-1",
                          isActive && "font-semibold text-blue-700 dark:text-blue-300",
                        )}
                      >
                        {item.name}
                      </span>
                    )}
                    {showBadge && !collapsed && (
                      <Badge className="ml-auto bg-red-500 hover:bg-red-600 text-white">
                        {pendingCount}
                      </Badge>
                    )}
                    {showBadge && collapsed && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></div>
                    )}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-pulse" />
                    )}
                  </Button>
                </Link>
              )
            })}
        </nav>
      </ScrollArea>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
        <div className={cn("flex items-center space-x-3 transition-all duration-200", collapsed && "justify-center")}>
          <Avatar className="h-10 w-10 shadow-lg ring-2 ring-white/30 dark:ring-slate-700/50">
            {user?.avatar_url ? (
              <AvatarImage src={user.avatar_url} alt={user?.name || "User"} />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-blue-500 text-white font-semibold text-sm">
              {userInitials === "?" ? <Users className="h-5 w-5" /> : userInitials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-slide-in-right">
              <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">
                {user?.name || "User"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || "user@example.com"}
              </p>
            </div>
          )}
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
