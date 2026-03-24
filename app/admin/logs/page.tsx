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
  Activity,
  Sparkles
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { apiClient, ApiResponse } from "@/lib/api"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { VisualTrace } from "./components/VisualTrace"

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
      result = result.filter(log => String(log.level || '').toLowerCase() === String(selectedLevel || '').toLowerCase())
    }

    setFilteredLogs(result)
  }, [logs, searchQuery, selectedLevel])

  const [correlationSummary, setCorrelationSummary] = useState<any>(null)
  const [isCorrelationDialogOpen, setIsCorrelationDialogOpen] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [isCorrelationLoading, setIsCorrelationLoading] = useState(false)

  const drillThrough = async (id: string) => {
    setFocusId(id)
    setIsCorrelationDialogOpen(true)
    setIsCorrelationLoading(true)
    setCorrelationSummary(null)
    
    try {
      const response = await apiClient.get<any>(`/admin/logs/correlation/${id}`)
      if (response.success) {
        setCorrelationSummary(response.data)
      }
    } catch (err) {
      console.error("Failed to fetch correlation summary", err)
    } finally {
      setIsCorrelationLoading(false)
    }
  }

  const getLevelBadge = (level: any) => {
    const levelStr = String(level || '').toLowerCase();
    switch (levelStr) {
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
                {logs.length > 0 ? ((logs.filter(l => ['error', 'fatal'].includes(String(l.level || '').toLowerCase())).length / logs.length) * 100).toFixed(1) : 0}%
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                {logs.filter(l => ['error', 'fatal'].includes(String(l.level || '').toLowerCase())).length} total errors
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
                {logs.filter(l => ['warn', 'warning'].includes(String(l.level || '').toLowerCase())).length}
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
                  <TableHead className="w-[180px] font-semibold text-slate-900 dark:text-slate-100">Correlation</TableHead>
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
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-24"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div></TableCell>
                      <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-8 ml-auto"></div></TableCell>
                    </TableRow>
                  ))
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-96 text-center">
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
                        String(log.level || '').toLowerCase() === 'error' && "bg-red-500/5 hover:bg-red-500/10"
                      )}
                      onClick={() => openLogDetail(log)}
                    >
                      <TableCell className="font-mono text-[10px] text-slate-500/80">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell>
                        {log.correlationId ? (
                            <button 
                                onClick={(e) => { e.stopPropagation(); drillThrough(log.correlationId!); }}
                                className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-colors font-mono flex items-center gap-1 group/id border border-blue-500/20"
                            >
                                <Maximize2 className="w-2.5 h-2.5 opacity-40 group-hover/id:opacity-100 transition-opacity" />
                                <span className="truncate max-w-[120px]">{log.correlationId}</span>
                            </button>
                        ) : (
                            <span className="text-[10px] text-slate-300 italic">-</span>
                        )}
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

      {/* Correlation Intelligence Diagnostic Dialog */}
      <Dialog open={isCorrelationDialogOpen} onOpenChange={setIsCorrelationDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 border-blue-500/30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl shadow-2xl rounded-2xl">
          <DialogHeader className="p-8 border-b border-blue-500/20 bg-blue-500/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none -mr-32 -mt-32" />
            <div className="flex items-center justify-between relative z-10">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase tracking-widest">
                  <Activity className="w-4 h-4" />
                  Flow Correlation Intelligence
                </div>
                <DialogTitle className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 italic flex items-center gap-3">
                  Diagnostic Trace <span className="text-blue-500 not-italic">#{focusId?.substring(0, 8)}</span>
                </DialogTitle>
                <DialogDescription className="font-mono text-xs text-slate-500 flex items-center gap-2">
                  <Database className="w-3 h-3" /> Full ID: {focusId}
                </DialogDescription>
              </div>
              <div className="hidden md:block">
                <Badge variant="outline" className="px-3 py-1 bg-blue-500/10 border-blue-500/20 text-blue-600 font-mono text-[10px]">
                    Surgical Root Cause Analysis Active
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="overview" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-8 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
              <TabsList className="bg-transparent h-14 p-0 gap-8">
                <TabsTrigger value="overview" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-14 font-bold text-xs uppercase tracking-wider">Overview</TabsTrigger>
                <TabsTrigger value="visual" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-14 font-bold text-xs uppercase tracking-wider text-purple-500 flex items-center gap-2"><Sparkles className="w-3 h-3" /> Visual Trace</TabsTrigger>
                <TabsTrigger value="logs" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-14 font-bold text-xs uppercase tracking-wider">Timeline Logs ({correlationSummary?.logs?.length || 0})</TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-14 font-bold text-xs uppercase tracking-wider">Notifications ({ (correlationSummary?.notifications?.length || 0) + (correlationSummary?.email_notifications?.length || 0) })</TabsTrigger>
                <TabsTrigger value="failures" className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-blue-600 border-b-2 border-transparent data-[state=active]:border-blue-600 rounded-none h-14 font-bold text-xs uppercase tracking-wider text-red-500">Failures ({correlationSummary?.extraction_failures?.length || 0})</TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 p-8">
              {isCorrelationLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-slate-500 font-medium">Reconstructing system flow from telemetry...</p>
                </div>
              ) : !correlationSummary ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 italic">
                  No correlation data found for this ID.
                </div>
              ) : (
                <>
                  <TabsContent value="overview" className="mt-0 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card className="bg-blue-500/5 border-blue-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-[10px] uppercase text-blue-500 font-bold tracking-widest">Total Events</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{correlationSummary.logs.length}</div>
                        </CardContent>
                      </Card>
                      <Card className={cn("bg-red-500/5 border-red-500/10", correlationSummary.extraction_failures.length > 0 ? "bg-red-500/5 border-red-500/20" : "opacity-50")}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-[10px] uppercase text-red-500 font-bold tracking-widest">Critical Failures</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">{correlationSummary.extraction_failures.length}</div>
                        </CardContent>
                      </Card>
                      <Card className="bg-purple-500/5 border-purple-500/10">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-[10px] uppercase text-purple-500 font-bold tracking-widest">Notifications</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-3xl font-black text-slate-900 dark:text-slate-100">
                            {correlationSummary.notifications.length + correlationSummary.email_notifications.length}
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {correlationSummary.extraction_failures.length > 0 && (
                      <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle className="font-bold">System extraction failed in this flow</AlertTitle>
                        <AlertDescription className="text-xs">
                          Identified {correlationSummary.extraction_failures.length} blocking issues. See Failures tab for technical details.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Workflow Summary</h3>
                        <div className="relative pl-8 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                           {Array.from(new Set(correlationSummary.logs.map((l: any) => l.service || 'unknown'))).map((service: any, idx) => (
                             <div key={idx} className="relative">
                               <div className="absolute -left-[28px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-950 z-10" />
                               <div className="font-bold text-xs uppercase text-slate-900 dark:text-slate-100">{service}</div>
                               <div className="text-xs text-slate-500 mt-0.5">
                                 {correlationSummary.logs.filter((l:any) => (l.service || 'unknown') === service).length} operations performed
                               </div>
                             </div>
                           ))}
                        </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="visual" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          Interactive Request Flow
                        </h3>
                        <Badge variant="outline" className="text-[10px] bg-blue-500/5 text-blue-600 border-blue-500/10">
                          Live Telemetry Reconstruction
                        </Badge>
                      </div>
                      <VisualTrace data={correlationSummary} correlationId={focusId!} />
                      <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                          This visualization is dynamically generated by correlating 
                          system logs, database notification entries, and extraction recovery logs 
                          using the unique flow identifier. Nodes represent system state transitions, 
                          while edges represent event propagation.
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="logs" className="mt-0">
                    <div className="space-y-2">
                    {correlationSummary.logs.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-[10px] hover:border-blue-500/30 transition-colors bg-white/50 dark:bg-slate-900/50">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-blue-500 font-bold">[{formatTimestamp(log.timestamp)}]</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                            log.level === 'error' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                          )}>{log.level}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 break-words">{log.message}</div>
                        {log.service && <div className="mt-1 text-slate-400 italic">via {log.service}</div>}
                      </div>
                    ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="notifications" className="mt-0 space-y-4">
                    <Accordion type="single" collapsible className="w-full">
                      {correlationSummary.email_notifications.map((notif: any, idx: number) => (
                        <AccordionItem key={`email-${idx}`} value={`email-${idx}`} className="border-b-white/10">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3 text-left">
                              <div className="p-2 rounded bg-purple-500/10 text-purple-600">
                                <Info className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-bold">Email: {notif.subject}</div>
                                <div className="text-[10px] text-slate-400">Sent to {notif.recipient_roles?.join(', ') || 'N/A'}</div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                             <pre className="text-[10px] overflow-x-auto">{JSON.stringify(notif, null, 2)}</pre>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                      {correlationSummary.notifications.map((notif: any, idx: number) => (
                        <AccordionItem key={`notif-${idx}`} value={`notif-${idx}`} className="border-b-white/10">
                          <AccordionTrigger className="hover:no-underline py-4">
                            <div className="flex items-center gap-3 text-left">
                              <div className="p-2 rounded bg-blue-500/10 text-blue-600">
                                <Activity className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-sm font-bold">System: {notif.type}</div>
                                <div className="text-[10px] text-slate-400">Targets: {notif.recipient_emails?.join(', ')}</div>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                             <pre className="text-[10px] overflow-x-auto">{JSON.stringify(notif, null, 2)}</pre>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </TabsContent>

                  <TabsContent value="failures" className="mt-0 space-y-4">
                    {correlationSummary.extraction_failures.map((fail: any, idx: number) => (
                      <div key={idx} className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-red-600 uppercase tracking-tight">Failure in {fail.entity_type}</h4>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{fail.error_message}</p>
                          </div>
                          <Badge variant="destructive" className="bg-red-600 uppercase text-[10px]">Critical Block</Badge>
                        </div>
                        
                        {fail.stack_trace && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stack Origin</p>
                            <div className="p-4 bg-slate-950 text-red-400 rounded-xl font-mono text-[10px] whitespace-pre overflow-x-auto leading-normal">
                               {JSON.stringify(fail.stack_trace, null, 2)}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold uppercase text-slate-400 tracking-widest">AI Provider</span>
                                <div className="text-xs font-mono">{fail.ai_provider || 'Direct DB'}</div>
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] font-bold uppercase text-slate-400 tracking-widest">Model</span>
                                <div className="text-xs font-mono">{fail.ai_model || 'N/A'}</div>
                            </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>
                </>
              )}
            </ScrollArea>
          </Tabs>

          <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl flex justify-between items-center rounded-b-2xl">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" className="text-slate-500 text-xs" onClick={() => setIsCorrelationDialogOpen(false)}>
                    Close Intelligence
                </Button>
                <div className="w-px h-4 bg-slate-200 dark:bg-slate-800" />
                <Button variant="link" size="sm" className="text-blue-500 text-xs p-0 h-auto" onClick={() => { setSearchQuery(focusId!); setIsCorrelationDialogOpen(false); }}>
                    Search Raw Logs For This ID
                </Button>
            </div>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20" onClick={() => setIsCorrelationDialogOpen(false)}>
                Verified Case
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
