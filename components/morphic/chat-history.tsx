'use client'

import * as React from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { MoreHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import useSWR from 'swr'

import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem
} from '@/components/morphic/ui/sidebar'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Chat } from '@/lib/morphic/db/schema'
import { fetcher } from '@/lib/morphic/utils'

export function ChatHistory({ searchQuery = '' }: { searchQuery?: string }) {
    const { id } = useParams()
    const pathname = usePathname()
    const [deleteId, setDeleteId] = React.useState<string | null>(null)
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false)

    // Fetch chats using SWR for caching and automatic revalidation
    const { data, mutate } = useSWR<{ chats: Chat[] }>(
        '/api/morphic/chats',
        fetcher,
        {
            fallbackData: { chats: [] }
        }
    )

    // Listen for history updates
    React.useEffect(() => {
        const handleHistoryUpdate = () => {
            mutate()
        }
        window.addEventListener('chat-history-updated', handleHistoryUpdate)
        return () => {
            window.removeEventListener('chat-history-updated', handleHistoryUpdate)
        }
    }, [mutate])

    const filteredChats = React.useMemo(() => {
        if (!data?.chats) return []
        if (!searchQuery.trim()) return data.chats

        const query = searchQuery.toLowerCase().trim()
        return data.chats.filter((chat) =>
            chat.title.toLowerCase().includes(query)
        )
    }, [data?.chats, searchQuery])

    const handleDelete = async (chatId: string) => {
        try {
            const response = await fetch(`/api/morphic/chat/${chatId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Failed to delete chat')
            }

            mutate()
            toast.success('Chat deleted')

            // If we deleted the current chat, redirect to main page is handled by parent/layout
            // or we just let user stay on 404 page? Better to redirect.
            // For now, we assume user navigates away manually or we implement redirect logic.
        } catch (error) {
            toast.error('Failed to delete chat')
            console.error(error)
        } finally {
            setShowDeleteDialog(false)
            setDeleteId(null)
        }
    }

    if (!filteredChats.length) {
        return (
            <SidebarGroup>
                <SidebarGroupContent>
                    <div className="px-2 text-sm text-muted-foreground text-center py-4">
                        {searchQuery ? 'No matching chats found' : 'No history yet'}
                    </div>
                </SidebarGroupContent>
            </SidebarGroup>
        )
    }

    return (
        <>
            <SidebarGroup>
                <SidebarGroupContent>
                    <SidebarMenu>
                        {filteredChats.map((chat: Chat) => (
                            <SidebarMenuItem key={chat.id}>
                                <SidebarMenuButton
                                    asChild
                                    isActive={
                                        pathname === `/ai-search/${chat.id}` ||
                                        (pathname === '/ai-search' && !id && false) // Logic for active state
                                    }
                                >
                                    <Link href={`/ai-search/${chat.id}`}>
                                        <span className="truncate">{chat.title}</span>
                                    </Link>
                                </SidebarMenuButton>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <SidebarMenuAction showOnHover>
                                            <MoreHorizontal />
                                            <span className="sr-only">More</span>
                                        </SidebarMenuAction>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        className="w-48"
                                        side="right"
                                        align="start"
                                    >
                                        <DropdownMenuItem
                                            className="cursor-pointer text-destructive focus:text-destructive"
                                            onSelect={() => {
                                                setDeleteId(chat.id)
                                                setShowDeleteDialog(true)
                                            }}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </SidebarMenuItem>
                        ))}
                    </SidebarMenu>
                </SidebarGroupContent>
            </SidebarGroup>
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete your chat history.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteId && handleDelete(deleteId)}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
