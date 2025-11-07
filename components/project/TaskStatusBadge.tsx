"use client"

import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, XCircle, PlayCircle, Ban } from "lucide-react"

interface TaskStatusBadgeProps {
  status: 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled'
}

const statusConfig = {
  planned: {
    label: 'Planned',
    variant: 'secondary' as const,
    icon: Clock,
    className: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'default' as const,
    icon: PlayCircle,
    className: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  },
  completed: {
    label: 'Completed',
    variant: 'default' as const,
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 hover:bg-green-200',
  },
  blocked: {
    label: 'Blocked',
    variant: 'destructive' as const,
    icon: Ban,
    className: 'bg-red-100 text-red-700 hover:bg-red-200',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'secondary' as const,
    icon: XCircle,
    className: 'bg-gray-100 text-gray-500 hover:bg-gray-200',
  },
}

export function TaskStatusBadge({ status }: TaskStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <Badge variant={config.variant} className={config.className}>
      <Icon className="mr-1 h-3 w-3" />
      {config.label}
    </Badge>
  )
}

