"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Bell, Check, X, AlertCircle, Info, ExternalLink, Trash2 } from 'lucide-react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'
import { ScrollArea } from './ui/scroll-area'
import { apiClient } from '@/lib/api'
import { useWebSocket } from '@/contexts/WebSocketContext'
import { toast } from '@/lib/notify'
import { onNotification, NotificationPayload } from '@/lib/notifications'
import Link from 'next/link'

interface Notification {
  id: string
  type: 'success' | 'error' | 'info' | 'warning'
  title: string
  message: string
  timestamp: string
  read: boolean
  actionUrl?: string
  actionLabel?: string
  metadata?: {
    jobId?: string
    documentId?: string
    projectId?: string
    provider?: string
    model?: string
  }
}

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const socket = useWebSocket()
  const liveRef = useRef<HTMLDivElement | null>(null)

  // Load notifications from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('adpa_notifications')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setNotifications(parsed)
        setUnreadCount(parsed.filter((n: Notification) => !n.read).length)
      } catch (e) {
        console.error('Failed to parse notifications:', e)
      }
    }
  }, [])

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem('adpa_notifications', JSON.stringify(notifications))
    setUnreadCount(notifications.filter(n => !n.read).length)
  }, [notifications])

  // Listen for WebSocket notifications
  useEffect(() => {
    if (!socket) return

    // Track recent job notifications to prevent duplicate toasts
    const recentJobNotifications = new Set<string>()
    
    // Listen for generic WebSocket notifications and route to notification center
    // Filter out room join notifications to avoid spam
    socket.on('notification', (data: { message: string; description?: string; title?: string }) => {
      // Comprehensive filter for room join notifications - check all fields and case variations
      const message = data.message?.toLowerCase() || ''
      const title = data.title?.toLowerCase() || ''
      const description = data.description?.toLowerCase() || ''
      const combined = `${message} ${title} ${description}`.toLowerCase()
      
      // Skip room join notifications - they're handled by RoomStatusList component
      if (combined.includes('joined') || 
          combined.includes('realtime rooms') ||
          combined.includes('realtime') ||
          title.includes('realtime rooms') ||
          message.includes('joined room')) {
        return // Don't add to notification center
      }
      addNotification({
        type: 'info',
        title: data.title || 'Notification',
        message: data.message,
        metadata: {}
      })
    })
    
    // Job completion notifications
    socket.on('job:completed', (data) => {
      addNotification({
        type: 'success',
        title: 'Job Completed',
        message: data.message || `Job ${data.jobId} completed successfully`,
        metadata: {
          jobId: data.jobId,
          documentId: data.documentId,
          projectId: data.projectId,
        },
        actionUrl: data.documentId && data.projectId
          ? `/projects/${data.projectId}/documents/${data.documentId}`
          : `/jobs`,
        actionLabel: data.documentId && data.projectId ? 'View Document' : 'View Job'
      })
      
      // Only show toast if we haven't shown it recently for this job (deduplication)
      const notificationKey = `job-completed-${data.jobId}`
      if (!recentJobNotifications.has(notificationKey)) {
        recentJobNotifications.add(notificationKey)
        // Show ephemeral toast but don't re-dispatch into adapter (we already addNotification above)
        toast.success(data.message || 'Job completed!', { suppressAdapter: true })
        // Remove from set after 5 seconds to allow re-notification if needed
        setTimeout(() => recentJobNotifications.delete(notificationKey), 5000)
      }
    })

    // Job failure notifications
    socket.on('job:failed', (data) => {
      addNotification({
        type: 'error',
        title: 'Job Failed',
        message: data.error || `Job ${data.jobId} failed`,
        metadata: { jobId: data.jobId },
        actionUrl: '/jobs',
        actionLabel: 'View Details'
      })
      
      // Only show toast if we haven't shown it recently for this job (deduplication)
      const notificationKey = `job-failed-${data.jobId}`
      if (!recentJobNotifications.has(notificationKey)) {
        recentJobNotifications.add(notificationKey)
        toast.error(data.error || 'Job failed', { suppressAdapter: true })
        // Remove from set after 5 seconds to allow re-notification if needed
        setTimeout(() => recentJobNotifications.delete(notificationKey), 5000)
      }
    })

    // Document generated
    socket.on('document:created', (data) => {
      addNotification({
        type: 'success',
        title: 'Document Generated',
        message: `${data.documentName} has been created`,
        metadata: {
          documentId: data.documentId,
          projectId: data.projectId,
          provider: data.provider,
          model: data.model,
        },
        actionUrl: data.projectId && data.documentId 
          ? `/projects/${data.projectId}/documents/${data.documentId}`
          : undefined,
        actionLabel: data.projectId && data.documentId ? 'View Document' : undefined
      })
    })

    // Baseline approved
    socket.on('baseline:approved', (data) => {
      addNotification({
        type: 'success',
        title: 'Baseline Approved',
        message: `Project baseline has been approved`,
        metadata: { projectId: data.projectId },
        actionUrl: data.projectId ? `/projects/${data.projectId}?tab=baseline` : undefined,
        actionLabel: data.projectId ? 'View Baseline' : undefined
      })
    })

    // Export ready
    socket.on('export:ready', (data) => {
      addNotification({
        type: 'info',
        title: 'Export Ready',
        message: `${data.format.toUpperCase()} export is ready for download`,
        metadata: { documentId: data.documentId },
        actionUrl: data.downloadUrl,
        actionLabel: 'Download'
      })
    })

    // Baseline created
    socket.on('baseline:created', (data) => {
      addNotification({
        type: 'success',
        title: 'Baseline Extracted',
        message: `Baseline created for ${data.projectName || 'project'}`,
        metadata: { projectId: data.projectId },
        actionUrl: data.projectId ? `/projects/${data.projectId}?tab=baseline` : undefined,
        actionLabel: data.projectId ? 'View Baseline' : undefined
      })
      
      // Show toast but don't dispatch a second adapter notification (already added above)
      toast.success('Baseline extraction complete!', { suppressAdapter: true })
    })

    // Baseline drift detected
    socket.on('baseline:drift', (data) => {
      addNotification({
        type: 'warning',
        title: 'Baseline Drift Detected',
        message: `${data.driftCount} deviation(s) detected in project documents`,
        metadata: { projectId: data.projectId },
        actionUrl: data.projectId ? `/projects/${data.projectId}?tab=baseline` : undefined,
        actionLabel: data.projectId ? 'Review Drifts' : undefined
      })
    })

    return () => {
      socket.off('job:completed')
      socket.off('job:failed')
      socket.off('document:created')
      socket.off('baseline:approved')
      socket.off('export:ready')
      socket.off('baseline:created')
      socket.off('baseline:drift')
    }
  }, [socket])

  // Listen for external notifications dispatched via the notifications adapter
  useEffect(() => {
    const off = onNotification((payload: NotificationPayload) => {
      addNotification({
        type: payload.type,
        title: payload.title,
        message: payload.message,
        actionUrl: payload.actionUrl,
        actionLabel: payload.actionLabel,
        metadata: payload.metadata,
      })

      // Announce for screen readers
      if (payload.announce !== false && liveRef.current) {
        liveRef.current.textContent = `${payload.title}: ${payload.message}`
      }

      // Pulse the bell for a short time to draw attention
      setPulse(true)
      window.setTimeout(() => setPulse(false), 3000)
    })

    return off
  }, [])

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      read: false,
    }
    
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Keep last 50
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAll = () => {
    if (confirm('Clear all notifications?')) {
      setNotifications([])
    }
  }

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <Check className="h-4 w-4 text-green-600" />
      case 'error':
        return <X className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'info':
        return <Info className="h-4 w-4 text-blue-600" />
    }
  }

  const getColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {pulse && (
            <span
              aria-hidden
              className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-blue-400/60 animate-ping"
            />
          )}
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      {/* Screen reader live region: updated when a notification arrives */}
      <div ref={liveRef} aria-live="polite" className="sr-only" />
      <DropdownMenuContent align="end" className="w-96 p-0">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Notifications</CardTitle>
                <CardDescription className="text-xs">
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <Button size="sm" variant="ghost" onClick={markAllAsRead} className="h-7 text-xs">
                    Mark all read
                  </Button>
                )}
                {notifications.length > 0 && (
                  <Button size="sm" variant="ghost" onClick={clearAll} className="h-7 text-xs">
                    Clear all
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We'll notify you when jobs complete
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-muted/50 transition-colors ${
                        !notification.read ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg h-fit ${getColor(notification.type)}`}>
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-medium text-sm">{notification.title}</p>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          
                          {/* Metadata */}
                          {notification.metadata && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {notification.metadata.provider && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.metadata.provider}
                                </Badge>
                              )}
                              {notification.metadata.model && (
                                <Badge variant="outline" className="text-xs">
                                  {notification.metadata.model}
                                </Badge>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                            <div className="flex gap-2">
                              {notification.actionUrl && (
                                <Link 
                                  href={notification.actionUrl}
                                  onClick={async (e: React.MouseEvent) => {
                                    markAsRead(notification.id)
                                    setOpen(false)
                                  }}
                                >
                                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                                    {notification.actionLabel || 'View'}
                                    <ExternalLink className="h-3 w-3 ml-1" />
                                  </Button>
                                </Link>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={async (e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  deleteNotification(notification.id)
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

