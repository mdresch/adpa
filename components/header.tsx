"use client"

import { Search, Settings, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTheme } from "next-themes"
import { NotificationCenter } from "./notification-center"

export function Header() {
  const { theme, setTheme } = useTheme()

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 shadow-sm">
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 transition-colors group-focus-within:text-blue-500" />
          <Input
            placeholder="Search configurations, templates, jobs..."
            className="pl-10 w-80 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 focus:shadow-lg focus:shadow-blue-500/20"
          />
        </div>
      </div>

      <div className="flex items-center space-x-3">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
        >
          {theme === "dark" ? <Sun className="h-4 w-4 text-yellow-500" /> : <Moon className="h-4 w-4 text-slate-600" />}
        </Button>

        {/* Notifications */}
        <NotificationCenter />

        {/* Settings */}
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
