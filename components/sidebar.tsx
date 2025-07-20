"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderOpen },
  { name: "AI Providers", href: "/ai-providers", icon: Zap },
  { name: "Integrations", href: "/integrations", icon: LinkIcon },
  { name: "Templates", href: "/templates", icon: FileText },
  { name: "Users & Roles", href: "/users", icon: Users },
  { name: "Job Monitor", href: "/jobs", icon: Activity },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Security", href: "/security", icon: Shield },
  { name: "System Settings", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 border-r border-slate-200 dark:border-slate-700 transition-all duration-300 ease-in-out shadow-xl",
        collapsed ? "w-16" : "w-64",
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
          {navigation.map((item, index) => {
            const isActive = pathname === item.href
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
                        "ml-3 transition-all duration-200",
                        isActive && "font-semibold text-blue-700 dark:text-blue-300",
                      )}
                    >
                      {item.name}
                    </span>
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
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
            <Users className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-slide-in-right">
              <p className="text-sm font-semibold truncate text-slate-700 dark:text-slate-200">Admin User</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">admin@company.com</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
