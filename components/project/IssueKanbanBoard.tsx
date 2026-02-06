"use client"

import { useState, useMemo } from "react"
import {
    DndContext,
    DragEndEvent,
    DragOverlay,
    DragStartEvent,
    PointerSensor,
    useSensor,
    useSensors,
    closestCorners,
    useDroppable,
    rectIntersection,
    CollisionDetection,
} from "@dnd-kit/core"
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    MoreVertical,
    Edit,
    UserPlus,
    Trash2,
    Eye,
    GripVertical,
    AlertTriangle,
    TrendingUp,
    Sparkles,
    AlertCircle,
    Clock,
    XCircle,
    CheckCircle2,
    CheckCircle
} from "@/components/ui/icons-shim"
import { cn } from "@/lib/utils"
// Ensure Issue type matches what's used in api.ts
import { Issue } from "@/lib/api"
import { format } from "date-fns"

interface IssueKanbanBoardProps {
    issues: Issue[]
    onViewIssue: (issueId: string) => void
    onEditIssue: (issueId: string) => void
    onDeleteIssue: (issueId: string) => void
    onStatusChange: (issueId: string, newStatus: string) => Promise<void>
}

interface KanbanColumnProps {
    id: string
    title: string
    issues: Issue[]
    onViewIssue: (issueId: string) => void
    onEditIssue: (issueId: string) => void
    onDeleteIssue: (issueId: string) => void
}

interface KanbanIssueCardProps {
    issue: Issue
    onViewIssue: (issueId: string) => void
    onEditIssue: (issueId: string) => void
    onDeleteIssue: (issueId: string) => void
}

// Status configuration for Issues
const STATUS_COLUMNS = [
    { id: 'open', title: 'Open', color: 'bg-slate-100 dark:bg-slate-900', icon: AlertCircle },
    { id: 'acknowledged', title: 'Acknowledged', color: 'bg-blue-50 dark:bg-blue-950', icon: Clock },
    { id: 'in_progress', title: 'In Progress', color: 'bg-yellow-50 dark:bg-yellow-950', icon: TrendingUp },
    { id: 'blocked', title: 'Blocked', color: 'bg-red-50 dark:bg-red-950', icon: XCircle },
    { id: 'resolved', title: 'Resolved', color: 'bg-green-50 dark:bg-green-950', icon: CheckCircle2 },
    { id: 'closed', title: 'Closed', color: 'bg-gray-100 dark:bg-gray-900', icon: CheckCircle },
]

const PRIORITY_COLORS = {
    critical: 'border-red-500 text-red-700 dark:text-red-400',
    high: 'border-orange-500 text-orange-700 dark:text-orange-400',
    medium: 'border-yellow-500 text-yellow-700 dark:text-yellow-400',
    low: 'border-blue-500 text-blue-700 dark:text-blue-400',
}

function KanbanIssueCard({
    issue,
    onViewIssue,
    onEditIssue,
    onDeleteIssue,
}: KanbanIssueCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: issue.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    const getInitials = (name: string | undefined): string => {
        if (!name) return '??'
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2)
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn("touch-none", isDragging && "z-50")}
        >
            <Card
                className={cn(
                    "mb-3 hover:shadow-md transition-shadow cursor-pointer",
                    isDragging && "shadow-lg ring-2 ring-primary"
                )}
                onClick={() => onViewIssue(issue.id)}
            >
                <CardHeader className="pb-2 p-3">
                    <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                            <button
                                {...attributes}
                                {...listeners}
                                className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
                                onClick={async (e: React.MouseEvent) => e.stopPropagation()}
                            >
                                <GripVertical className="h-4 w-4" />
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "text-[10px] px-1 py-0 h-5",
                                            PRIORITY_COLORS[issue.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.medium
                                            // Cast to keyof or fallback
                                        )}
                                    >
                                        {issue.priority}
                                    </Badge>
                                    {issue.category && (
                                        <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                            {issue.category}
                                        </Badge>
                                    )}
                                </div>
                                <h3 className="font-semibold text-sm mb-1 line-clamp-2">
                                    {issue.title}
                                </h3>
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={async (e: React.MouseEvent) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={async (e: React.MouseEvent) => { e.stopPropagation(); onViewIssue(issue.id); }}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={async (e: React.MouseEvent) => { e.stopPropagation(); onEditIssue(issue.id); }}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Issue
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={async (e: React.MouseEvent) => { e.stopPropagation(); onDeleteIssue(issue.id); }}
                                    className="text-destructive"
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Issue
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </CardHeader>
                <CardContent className="pt-0 p-3 space-y-2">
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1">
                        {issue.related_risk_id && (
                            <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200">
                                <AlertTriangle className="h-2 w-2 mr-1" />
                                From Risk
                            </Badge>
                        )}
                        {issue.playbook_execution_id && (
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                <Sparkles className="h-2 w-2 mr-1" />
                                Auto-resolving
                            </Badge>
                        )}
                    </div>

                    {/* Description Snippet */}
                    {issue.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {issue.description}
                        </p>
                    )}

                    {/* Footer: Assignee & Date */}
                    <div className="flex items-center justify-between pt-2 border-t mt-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            {issue.assigned_to_name ? (
                                <>
                                    <Avatar className="h-5 w-5 flex-shrink-0">
                                        <AvatarFallback className="text-[9px]">
                                            {getInitials(issue.assigned_to_name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                        {issue.assigned_to_name}
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs text-muted-foreground italic">Unassigned</span>
                            )}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                            {format(new Date(issue.date_raised), 'MMM dd')}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function KanbanColumn({
    id,
    title,
    issues,
    onViewIssue,
    onEditIssue,
    onDeleteIssue,
}: KanbanColumnProps) {
    const columnConfig = STATUS_COLUMNS.find(col => col.id === id) || STATUS_COLUMNS[0]
    const issueIds = issues.map(i => i.id)

    const { setNodeRef, isOver } = useDroppable({
        id,
    })

    return (
        <div
            ref={setNodeRef}
            className={cn(
                "flex flex-col h-full min-w-[280px] max-w-[320px]",
                isOver && "ring-2 ring-primary ring-offset-2 rounded-lg"
            )}
        >
            <Card className="flex-1 flex flex-col bg-muted/20 border-none shadow-none">
                <CardHeader className={cn("pb-3 rounded-t-lg border border-b-0", columnConfig.color)}>
                    <CardTitle className="text-sm font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {columnConfig.icon && <columnConfig.icon className="h-4 w-4" />}
                            <span>{title}</span>
                        </div>
                        <Badge variant="secondary" className="ml-2 bg-background/50">
                            {issues.length}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-2 min-h-[200px] border border-t-0 rounded-b-lg component-bg">
                    <SortableContext items={issueIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-0">
                            {issues.map((issue) => (
                                <KanbanIssueCard
                                    key={issue.id}
                                    issue={issue}
                                    onViewIssue={onViewIssue}
                                    onEditIssue={onEditIssue}
                                    onDeleteIssue={onDeleteIssue}
                                />
                            ))}
                            {/* Drop zone indicator */}
                            {issues.length > 0 && isOver && (
                                <div className="mt-2 h-2 bg-primary/20 rounded border-2 border-dashed border-primary/50" />
                            )}
                            {issues.length === 0 && (
                                <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg border-muted-foreground/20 m-1">
                                    Drop issues here
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </CardContent>
            </Card>
        </div>
    )
}

export function IssueKanbanBoard({
    issues,
    onViewIssue,
    onEditIssue,
    onDeleteIssue,
    onStatusChange,
}: IssueKanbanBoardProps) {
    const [activeIssue, setActiveIssue] = useState<Issue | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    )

    // Group issues by status
    const issuesByStatus = useMemo(() => {
        const grouped: Record<string, Issue[]> = {}

        STATUS_COLUMNS.forEach(col => {
            grouped[col.id] = []
        })

        issues.forEach(issue => {
            const status = issue.status || 'open'
            // Find matching column
            const columnId = STATUS_COLUMNS.find(col => col.id === status)?.id || 'open'

            if (!grouped[columnId]) {
                grouped[columnId] = []
            }
            grouped[columnId].push(issue)
        })

        return grouped
    }, [issues])

    // Custom collision detection
    const collisionDetection: CollisionDetection = (args) => {
        const columnIds = new Set(STATUS_COLUMNS.map(col => col.id))
        const collisions = rectIntersection(args)
        const columnCollisions = collisions.filter(collision =>
            columnIds.has(collision.id as string)
        )

        if (columnCollisions.length > 0) {
            return columnCollisions
        }

        return collisions
    }

    const handleDragStart = (event: DragStartEvent) => {
        const issue = issues.find(i => i.id === event.active.id)
        setActiveIssue(issue || null)
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        setActiveIssue(null)
        const { active, over } = event

        if (!over) return

        const issueId = active.id as string
        let newStatus = over.id as string

        // Find issue
        const issue = issues.find(i => i.id === issueId)
        if (!issue) return

        // If over.id is an issue ID (not a column ID), find which column that issue belongs to
        // Simplified: Check if over.id matches one of our column IDs. If not, maybe it's an item in a column.
        // The previous logic in TaskKanban looked up the target task's status.
        const isColumn = STATUS_COLUMNS.some(col => col.id === newStatus)
        if (!isColumn) {
            // Find the issue we dropped onto
            const targetIssue = issues.find(i => i.id === newStatus)
            if (targetIssue) {
                newStatus = targetIssue.status
            } else {
                return // Unknown drop target
            }
        }

        const currentStatus = issue.status || 'open'

        // Only update if status changed
        if (currentStatus === newStatus) return

        // Limit check
        const isValidStatus = STATUS_COLUMNS.some(col => col.id === newStatus)
        if (!isValidStatus) return

        try {
            if (onStatusChange) {
                await onStatusChange(issueId, newStatus)
            }
        } catch (error) {
            console.error('Failed to update issue status:', error)
        }
    }

    if (issues.length === 0) {
        return (
            <div className="text-center py-12">
                <p className="text-muted-foreground">No issues found matching your filters.</p>
            </div>
        )
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={collisionDetection}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4 h-full min-h-[500px]">
                {STATUS_COLUMNS.map((column) => (
                    <KanbanColumn
                        key={column.id}
                        id={column.id}
                        title={column.title}
                        issues={issuesByStatus[column.id] || []}
                        onViewIssue={onViewIssue}
                        onEditIssue={onEditIssue}
                        onDeleteIssue={onDeleteIssue}
                    />
                ))}
            </div>
            <DragOverlay>
                {activeIssue ? (
                    <Card className="w-[280px] opacity-90 rotate-3 shadow-xl">
                        <CardHeader className="pb-2 p-3">
                            <div className="flex items-center gap-2">
                                <Badge variant="outline">{activeIssue.priority}</Badge>
                                <h3 className="font-semibold text-sm line-clamp-1">{activeIssue.title}</h3>
                            </div>
                        </CardHeader>
                    </Card>
                ) : null}
            </DragOverlay>
        </DndContext>
    )
}
