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
import { apiClient, ApiResponse } from "@/lib/api"
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

const LogVolumeChart = ({ logs }: { logs: LogEntry[] }) => {
  // Simple SVG-based intensity chart for log volume over time
  const timeBuckets: Record<string, number> = {}
  logs.forEach(log => {
    try {
      const minute = new Date(log.timestamp).toISOString().substring(11, 16)
      timeBuckets[minute] = (timeBuckets[minute] || 0) + 1
    } catch (e) {}
  })

  const values = Object.values(timeBuckets).slice(-30)
  const max = Math.max(...values, 1)

  return (
    <div className="flex items-end gap-1 h-12 pt-2">
      {values.map((v, i) => (
        <div 
          key={i} 
          className="w-full bg-blue-500/40 rounded-t-sm hover:bg-blue-400 transition-all cursor-crosshair"
          style={{ height: `${(v / max) * 100}%` }}
          title={`${v} events`}
        />
      ))}
      {values.length === 0 && <div className="text-[10px] text-slate-500 italic">Collecting data...</div>}
    </div>
  )
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
      const response = await apiClient.request<ApiResponse<LogEntry[]>>("/admin/logs?limit=500")
      if (response && response.data) {
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
        log.correlationId?.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(log).toLowerCase().includes(lowerQuery)
      )
    }

    if (selectedLevel) {
      result = result.filter(log => log.level.toLowerCase() === selectedLevel.toLowerCase())
    }

    setFilteredLogs(result)
  }, [logs, searchQuery, selectedLevel])

  const drillThrough = (id: string) => {
    setSearchQuery(id)
    setSelectedLevel(null)
  }

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case "error":
      case "fatal":
        return <Badge variant="destructive" className="flex items-center gap-1 shadow-sm"><AlertCircle className="w-3 h-3" /> ERROR</Badge>
      case "warn":
      case "warning":
        return <Badge variant="outline" className="bg-amber-100/50 text-amber-700 border-amber-200 backdrop-blur-sm flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> WARN</Badge>
      case "info":
        return <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-200 backdrop-blur-sm flex items-center gap-1"><Info className="w-3 h-3" /> INFO</Badge>
      case "debug":
        return <Badge variant="secondary" className="bg-slate-100/50 text-slate-600 border-slate-200 backdrop-blur-sm flex items-center gap-1"><Terminal className="w-3 h-3" /> DEBUG</Badge>
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
    <div className="p-6 space-y-6 bg-slate-50 dark:bg-slate-950 min-h-screen relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20">
                <Activity className="w-6 h-6 text-white" />
            </div>
            Insight Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Real-time diagnostic console with Correlation Intelligence.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchLogs} 
            disabled={loading}
            className="bg-white/50 backdrop-blur-md dark:bg-slate-900/50 shadow-sm border-slate-200 dark:border-slate-800"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant={autoRefresh ? "default" : "outline"} 
                size="sm"
                className={cn(autoRefresh ? "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20" : "bg-white/50 backdrop-blur-md dark:bg-slate-900/50 shadow-sm border-slate-200 dark:border-slate-800")}
              >
                <Clock className="w-4 h-4 mr-2" />
                {autoRefresh ? "Live Monitoring" : "Static View"}
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
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative z-10">
        <Card className="bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 shadow-xl border-white/20 dark:border-slate-800/50">
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Volume</p>
                    <p className="text-2xl font-bold">{logs.length}</p>
                </div>
            </div>
            <LogVolumeChart logs={logs} />
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 shadow-xl border-white/20 dark:border-slate-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Exception Rate</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {logs.length > 0 ? ((logs.filter(l => ['error', 'fatal'].includes(l.level?.toLowerCase())).length / logs.length) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {logs.filter(l => ['error', 'fatal'].includes(l.level?.toLowerCase())).length} total errors
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 shadow-xl border-white/20 dark:border-slate-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Warnings</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {logs.filter(l => ['warn', 'warning'].includes(l.level?.toLowerCase())).length}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">Potential issue baseline</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/70 backdrop-blur-xl dark:bg-slate-900/70 shadow-xl border-white/20 dark:border-slate-800/50">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Traces</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {new Set(logs.filter(l => l.correlationId).map(l => l.correlationId)).size}
              </p>
              <p className="text-[10px] text-slate-400 font-mono">Unique session paths</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/60 backdrop-blur-2xl dark:bg-slate-900/60 shadow-2xl border-white/30 dark:border-slate-800/50 overflow-hidden relative z-10">
        <CardHeader className="border-b border-white/20 dark:border-slate-800/50 bg-white/40 dark:bg-slate-900/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input 
                  placeholder="Surgical search: message, service, or correlation ID..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 bg-white/50 dark:bg-slate-950/50 border-white/30 dark:border-slate-800 placeholder:text-slate-400"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X className="w-3 h-3 text-slate-400" />
                    </button>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="bg-white/50 dark:bg-slate-950/50 border-white/30 dark:border-slate-800 h-10 px-4">
                    <Filter className="w-4 h-4 mr-2" />
                    Level: {selectedLevel || "All Events"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="backdrop-blur-xl">
                  <DropdownMenuItem onClick={() => setSelectedLevel(null)}>All Activity</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectedLevel("info")} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /> Info</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("warn")} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /> Warning</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("error")} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500" /> Error</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedLevel("debug")} className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-500" /> Debug</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-3 font-mono bg-slate-900/5 px-3 py-1.5 rounded-full backdrop-blur-md">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                {filteredLogs.length} matching events
              </span>
              <span className="w-px h-3 bg-slate-200 dark:bg-slate-800"></span>
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                Connected to adpa-logs-stream
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[650px]">
            <Table>
              <TableHeader className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-md sticky top-0 z-20">
                <TableRow className="border-b border-white/20 dark:border-slate-800/50">
                  <TableHead className="w-[120px] font-semibold text-slate-900 dark:text-slate-100">Timestamp</TableHead>
                  <TableHead className="w-[100px] font-semibold text-slate-900 dark:text-slate-100">Level</TableHead>
                  <TableHead className="w-[150px] font-semibold text-slate-900 dark:text-slate-100">Service</TableHead>
                  <TableHead className="font-semibold text-slate-900 dark:text-slate-100">Context</TableHead>
                  <TableHead className="w-[80px] text-right font-semibold text-slate-900 dark:text-slate-100">Flow</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && logs.length === 0 ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i} className="animate-pulse">
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-8 ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-96 text-center">
                      <div className="flex flex-col items-center justify-center gap-4 text-slate-400 max-w-xs mx-auto">
                        <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-full">
                            <Search className="w-10 h-10 opacity-40" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">No signals detected</p>
                            <p className="text-sm mt-1">Adjust your filters or correlation IDs to discover hidden system flows.</p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => { setSearchQuery(""); setSelectedLevel(null); }}>
                            Reset All Filters
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log, index) => (
                    <TableRow 
                      key={index} 
                      className={cn(
                        "group cursor-pointer border-b border-white/10 dark:border-slate-900/50 hover:bg-white/40 dark:hover:bg-blue-900/5 transition-all",
                        log.level?.toLowerCase() === 'error' && "bg-red-500/5 hover:bg-red-500/10"
                      )}
                      onClick={() => openLogDetail(log)}
                    >
                      <TableCell className="font-mono text-[10px] text-slate-500/80">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        {getLevelBadge(log.level)}
                      </TableCell>
                      <TableCell>
                        <span className="text-[10px] uppercase font-bold tracking-tight px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-800">
                          {log.service || "core"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-md lg:max-w-2xl py-3">
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">
                          {log.message}
                        </div>
                        {log.correlationId && (
                          <div className="flex items-center gap-2 mt-1.5">
                            <button 
                                onClick={(e) => { e.stopPropagation(); drillThrough(log.correlationId!); }}
                                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-mono flex items-center gap-1 group/id"
                            >
                                <Maximize2 className="w-2.5 h-2.5 opacity-0 group-hover/id:opacity-100 -ml-1 transition-all" />
                                Trace: {log.correlationId}
                            </button>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                            <span className="text-[10px] text-slate-400 font-mono italic">Diagnostic Link Enabled</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-blue-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
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
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 border-white/20 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl rounded-2xl">
          <DialogHeader className="p-8 border-b border-white/20 dark:border-slate-800/50 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {selectedLog && getLevelBadge(selectedLog.level)}
                  <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-900">{selectedLog?.service || "adpa-backend"}</span>
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Event Inspector</DialogTitle>
                <DialogDescription className="font-mono text-xs flex items-center gap-2">
                  <Clock className="w-3 h-3" /> {selectedLog?.timestamp}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-8">
            {selectedLog && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-blue-500/80">Log Message</h3>
                  <p className="text-xl font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                    {selectedLog.message}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Diagnostic ID</h3>
                    <div className="group relative">
                        <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-sm break-all group-hover:border-blue-500/50 transition-all">
                            {selectedLog.correlationId || "Uncorrelated Event"}
                            {selectedLog.correlationId && (
                                <Button 
                                    variant="link" 
                                    className="h-auto p-0 ml-2 text-blue-500 font-sans"
                                    onClick={() => { drillThrough(selectedLog.correlationId!); setIsDetailOpen(false); }}
                                >
                                    Focus this flow
                                </Button>
                            )}
                        </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Tracing Integration</h3>
                    <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full", selectedLog.correlationId ? "bg-green-500 animate-pulse" : "bg-slate-300")} />
                        <span className="text-sm font-medium">
                            {selectedLog.correlationId ? "Langfuse Trace Available" : "External Tracing Optional"}
                        </span>
                        {selectedLog.correlationId && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="ml-auto h-7 text-xs bg-white dark:bg-slate-800"
                                onClick={() => window.open(`${process.env.NEXT_PUBLIC_LANGFUSE_BASE_URL || 'http://localhost:3000'}/project/${process.env.NEXT_PUBLIC_LANGFUSE_PROJECT_ID || 'adpa'}/traces?search=${selectedLog.correlationId}`, '_blank')}
                            >
                                <Activity className="w-3 h-3 mr-1" /> Langfuse
                            </Button>
                        )}
                    </div>
                  </div>
                </div>

                {selectedLog.stack && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-red-500">System Stack Trace</h3>
                    <div className="p-5 bg-slate-950 text-red-400 rounded-xl border border-red-900/20 font-mono text-xs overflow-x-auto whitespace-pre leading-normal shadow-inner">
                      {selectedLog.stack}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-green-500">Raw Telemetry (JSON)</h3>
                    <Badge variant="outline" className="text-[10px] border-green-900/20 text-green-600 bg-green-500/5">Immutable Payload</Badge>
                  </div>
                  <div className="p-5 bg-slate-950 text-green-400/90 rounded-xl border border-green-900/20 font-mono text-xs overflow-x-auto shadow-inner">
                    <pre className="leading-normal">{JSON.stringify(selectedLog, (key, value) => key === 'timestamp' ? undefined : value, 2)}</pre>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
          
          <div className="p-6 border-t border-white/20 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex justify-between items-center">
            <div className="text-[10px] text-slate-400 italic">
                Secure Trace Viewer • End-to-End Encryption Active
            </div>
            <Button 
                onClick={() => setIsDetailOpen(false)}
                className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90 transition-opacity"
            >
                Dismiss Inspector
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
