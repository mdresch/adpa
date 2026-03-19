"use client"

import { useState, useEffect } from "react"
import { 
  Search, 
  RefreshCw, 
  Filter, 
  ChevronDown, 
  ChevronRight, 
  Info, 
  AlertCircle, 
  AlertTriangle, 
  Terminal,
  Clock,
  Database,
  Server,
  Cpu,
  Download,
  Trash2,
  Maximize2,
  X,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { apiClient } from "@/lib/api"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface LogEntry {
  level: string
  message: string
  timestamp: string
  service?: string
  correlationId?: string
  stack?: string
  raw?: boolean
  [key: string]: any
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const response = await apiClient.request("/admin/logs?limit=500")
      if (response && response.success) {
        setLogs(response.data)
      }
    } catch (error) {
      console.error("Failed to fetch logs:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [autoRefresh])

  useEffect(() => {
    let result = [...logs]
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase()
      result = result.filter(log => 
        log.message?.toLowerCase().includes(lowerQuery) || 
        log.service?.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(log).toLowerCase().includes(lowerQuery)
      )
    }

    if (selectedLevel) {
      result = result.filter(log => log.level.toLowerCase() === selectedLevel.toLowerCase())
    }

    setFilteredLogs(result)
  }, [logs, searchQuery, selectedLevel])

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
      case "fatal":
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> ERROR</Badge>
      case "warn":
      case "warning":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 flex items-center gap-1 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-900"><AlertTriangle className="w-3 h-3" /> WARN</Badge>
      case "info":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900"><Info className="w-3 h-3" /> INFO</Badge>
      case "debug":
        return <Badge variant="secondary" className="flex items-center gap-1"><Terminal className="w-3 h-3" /> DEBUG</Badge>
      default:
        return <Badge variant="outline">{level.toUpperCase()}</Badge>
    }
  }

  const formatTimestamp = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "HH:mm:ss.SSS")
    } catch (e) {
      return timestamp
    }
  }

  const openLogDetail = (log: LogEntry) => {
    setSelectedLog(log)
    setIsDetailOpen(true)
  }

  return (
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Terminal className="w-8 h-8 text-blue-500" />
            System Console Logs
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Real-time monitoring and analysis of system-wide events and errors.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLogs} 
            disabled={loading}
            className="bg-white dark:bg-slate-900 shadow-sm"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={autoRefresh ? "default" : "outline"} 
                size="sm"
                className={cn(autoRefresh && "bg-green-600 hover:bg-green-700")}
              >
                <Clock className="w-4 h-4 mr-2" />
                {autoRefresh ? "Auto-refresh: On" : "Auto-refresh: Off"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuCheckboxItem 
                checked={autoRefresh} 
                onCheckedChange={setAutoRefresh}
              >
                Enable Auto-refresh (5s)
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" className="bg-white dark:bg-slate-900 shadow-sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Events</p>
              <p className="text-2xl font-bold">{logs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Errors</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {logs.filter(l => ['error', 'fatal'].includes(l.level?.toLowerCase())).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Warnings</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {logs.filter(l => ['warn', 'warning'].includes(l.level?.toLowerCase())).length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Service Status</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">Healthy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white dark:bg-slate-900 shadow-lg border-slate-200 dark:border-slate-800 overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Filter by message, service, or JSON content..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white dark:bg-slate-950">
                    <Filter className="w-4 h-4 mr-2" />
                    Level: {selectedLevel || "All"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedLevel(null)}>All Levels</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedLevel("info")}>Info</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("warn")}>Warning</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("error")}>Error</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("debug")}>Debug</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              Streaming from logs/combined.log
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[600px]">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10">
                <TableRow>
                  <TableHead className="w-[120px]">Timestamp</TableHead>
                  <TableHead className="w-[100px]">Level</TableHead>
                  <TableHead className="w-[150px]">Service</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5} className="h-16 text-center">
                        <div className="flex items-center justify-center gap-2 text-slate-400">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading logs...
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                        <Search className="w-8 h-8 opacity-20" />
                        <p>No logs found matching your filters</p>
                        <Button variant="link" onClick={() => { setSearchQuery(""); setSelectedLevel(null); }}>Clear all filters</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, index) => (
                    <TableRow 
                      key={index} 
                      className={cn(
                        "group cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                        log.level?.toLowerCase() === 'error' && "bg-red-50/30 dark:bg-red-900/5"
                      )}
                      onClick={() => openLogDetail(log)}
                    >
                      <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        {getLevelBadge(log.level)}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {log.service || "system"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md lg:max-w-xl">
                        <div className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                          {log.message}
                        </div>
                        {log.correlationId && (
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            ID: {log.correlationId}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
          <DialogHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-3">
                {selectedLog && getLevelBadge(selectedLog.level)}
                <DialogTitle className="text-xl">Log Event Details</DialogTitle>
              </div>
            </div>
            <DialogDescription className="mt-2 font-mono text-xs">
              Timestamp: {selectedLog?.timestamp}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6">
            {selectedLog && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Message</h3>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-lg font-medium">
                    {selectedLog.message}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Service</h3>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-sm">
                      {selectedLog.service || "adpa-backend"}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Correlation ID</h3>
                    <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 font-mono text-sm">
                      {selectedLog.correlationId || "N/A"}
                    </div>
                  </div>
                </div>

                {selectedLog.stack && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Stack Trace</h3>
                    <div className="p-4 bg-slate-950 text-red-400 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto whitespace-pre">
                      {selectedLog.stack}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Full Context (JSON)</h3>
                  <div className="p-4 bg-slate-950 text-green-400 rounded-lg border border-slate-800 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(selectedLog, null, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-end">
            <Button onClick={() => setIsDetailOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
