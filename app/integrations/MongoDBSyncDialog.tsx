"use client"

import { useState, useEffect, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { Database } from "@/components/ui/icons-shim"
import { toast } from "sonner"

interface Project {
    id: string
    name: string
    // other fields...
}

interface MongoDBSyncDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    projects: Project[]
    integrationId: string | null
    onSyncComplete?: () => void
}

interface SyncStatus {
    total: number
    synced: number
    skipped: number
    errors: number
    status: 'idle' | 'syncing' | 'completed' | 'error'
    currentDocumentId?: string
}

export function MongoDBSyncDialog({
    open,
    onOpenChange,
    projects,
    integrationId,
    onSyncComplete
}: MongoDBSyncDialogProps) {
    const [projectId, setProjectId] = useState<string>("")
    const [syncStatus, setSyncStatus] = useState<SyncStatus>({
        total: 0,
        synced: 0,
        skipped: 0,
        errors: 0,
        status: 'idle'
    })
    const [polling, setPolling] = useState(false)

    // Use a ref to track if component is mounted to avoid state updates after unmount
    const isMounted = useRef(true)

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    // Poll for status
    useEffect(() => {
        let interval: NodeJS.Timeout

        if (polling && integrationId) {
            const checkStatus = async () => {
                try {
                    const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
                    if (!token) return

                    const response = await fetch(`/api/integrations/${integrationId}/sync/status`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })

                    if (!response.ok) return

                    const data = await response.json()

                    if (isMounted.current) {
                        setSyncStatus(prev => ({
                            ...prev,
                            ...data,
                            // Map DB status to UI status if needed
                            status: data.status === 'connected' ? 'idle' : data.status
                        }))

                        if (data.status === 'completed' || data.status === 'error') {
                            setPolling(false)
                            if (data.status === 'completed' && onSyncComplete) {
                                onSyncComplete()
                            }
                        }
                    }
                } catch (error) {
                    console.error("Failed to poll sync status:", error)
                }
            }

            // Check immediately
            checkStatus()
            // Then poll
            interval = setInterval(checkStatus, 2000)
        }

        return () => clearInterval(interval)
    }, [polling, integrationId, onSyncComplete])

    const handleStartSync = async () => {
        if (!integrationId || !projectId) return

        try {
            setSyncStatus({
                total: 0,
                synced: 0,
                skipped: 0,
                errors: 0,
                status: 'syncing'
            })
            setPolling(true)

            const token = localStorage.getItem('auth_token') || localStorage.getItem('token')
            const bodyProjectId = projectId === "all" ? null : projectId

            const response = await fetch(`/api/integrations/${integrationId}/sync`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ projectId: bodyProjectId })
            })

            if (!response.ok) {
                throw new Error("Failed to start sync")
            }

            const data = await response.json()
            if (!data.success) {
                throw new Error(data.message || "Sync failed to start")
            }

            toast.success("Sync started")
        } catch (error) {
            console.error("Sync start error:", error)
            toast.error("Failed to start sync")
            setPolling(false)
            setSyncStatus(prev => ({ ...prev, status: 'error' }))
        }
    }

    const progressPercentage = syncStatus.total > 0
        ? Math.round(((syncStatus.synced + syncStatus.skipped + syncStatus.errors) / syncStatus.total) * 100)
        : 0

    return (
        <Dialog open={open} onOpenChange={(val) => {
            // Prevent closing while syncing unless strictly necessary?
            // For now allow closing, polling will stop but background process continues.
            if (!val) setPolling(false)
            onOpenChange(val)
        }}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Sync to MongoDB</DialogTitle>
                    <DialogDescription>
                        Select a project to synchronize its documents to the MongoDB Vector Store.
                        This process may take some time depending on the number of documents.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="project" className="text-sm font-medium">
                            Project source
                        </label>
                        <Select
                            value={projectId}
                            onValueChange={setProjectId}
                            disabled={syncStatus.status === 'syncing'}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select a project..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Projects
                                </SelectItem>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {syncStatus.status !== 'idle' && (
                        <div className="space-y-4 border rounded-md p-4 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    {syncStatus.status === 'syncing' && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                                    {syncStatus.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                                    {syncStatus.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                                    Status: <span className="capitalize">{syncStatus.status}</span>
                                </span>
                                <span className="text-sm text-muted-foreground">
                                    {progressPercentage}%
                                </span>
                            </div>

                            <Progress value={progressPercentage} className="h-2" />

                            <div className="grid grid-cols-3 gap-2 text-center text-sm">
                                <div className="bg-background rounded p-2 border">
                                    <div className="font-semibold">{syncStatus.synced}</div>
                                    <div className="text-muted-foreground text-xs">Synced</div>
                                </div>
                                <div className="bg-background rounded p-2 border">
                                    <div className="font-semibold text-yellow-600">{syncStatus.skipped}</div>
                                    <div className="text-muted-foreground text-xs">Skipped</div>
                                </div>
                                <div className="bg-background rounded p-2 border">
                                    <div className="font-semibold text-red-600">{syncStatus.errors}</div>
                                    <div className="text-muted-foreground text-xs">Errors</div>
                                </div>
                            </div>

                            {syncStatus.status === 'syncing' && (
                                <p className="text-xs text-muted-foreground text-center animate-pulse">
                                    Processing documents...
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button
                        onClick={handleStartSync}
                        disabled={!projectId || syncStatus.status === 'syncing'}
                        className="gap-2"
                    >
                        <Database className="h-4 w-4" />
                        {syncStatus.status === 'syncing' ? 'Syncing...' : 'Start Sync'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
