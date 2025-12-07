"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, XCircle, PlayCircle, Ban, Calendar, PauseCircle } from "lucide-react"

interface TaskStatusBadgeProps {
  status?: string | null
}

const statusConfig: Record<string, {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  icon: React.ComponentType<{ className?: string }>
  className: string
}> = {
  planned: {
    label: 'Planned',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  scheduled: {
    label: 'Scheduled',
    variant: 'default',
    icon: Calendar,
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  },
  'in-progress': {
    label: 'In Progress',
    variant: 'default',
    icon: PlayCircle,
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'default',
    icon: PlayCircle,
    className: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
  },
  'on-hold': {
    label: 'On Hold',
    variant: 'secondary',
    icon: PauseCircle,
    className: 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  },
  completed: {
    label: 'Completed',
    variant: 'default',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 hover:bg-green-200',
  },
  blocked: {
    label: 'Blocked',
    variant: 'destructive',
    icon: Ban,
    className: 'bg-red-100 text-red-700 hover:bg-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'secondary',
    icon: XCircle,
    className: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
  },
}

// Default config for unknown statuses
const defaultConfig = {
  label: 'Unknown',
  variant: 'secondary' as const,
  icon: Clock,
  className: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  // Normalize status (handle both 'in-progress' and 'in_progress')
  const normalizedStatus = status === 'in_progress' ? 'in-progress' : status || 'planned'
  const config = statusConfig[normalizedStatus] || defaultConfig
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}

