"use client"

import { Bell, Search, Settings, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "next-themes"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="relative hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 hover:scale-110"
            >
              <Bell className="h-4 w-4" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-red-500 to-pink-500 animate-pulse">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 glass animate-fade-in-up">
            <DropdownMenuLabel className="text-base font-semibold">Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium">AI Provider Failover</p>
                </div>
                <p className="text-xs text-slate-500">OpenAI API switched to Google AI due to rate limits</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium">Document Generation Complete</p>
                </div>
                <p className="text-xs text-slate-500">BABOK Requirements Analysis document ready</p>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <div className="flex flex-col space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium">Integration Health Check</p>
                </div>
                <p className="text-xs text-slate-500">Confluence connection verified successfully</p>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

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
