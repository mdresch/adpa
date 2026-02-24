'use client'

import * as React from 'react'
import Link from 'next/link'
import { Plus, Search } from 'lucide-react'

import { ChatHistory } from '@/components/morphic/chat-history'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from '@/components/morphic/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ChatSidebar() {
    const [searchQuery, setSearchQuery] = React.useState('')

    return (
        <Sidebar className="border-r h-full">
            <SidebarHeader className="h-14 flex items-center px-4 border-b">
                <div className="flex-1 flex items-center gap-2 relative">
                    <Search className="h-4 w-4 absolute left-2 text-muted-foreground" />
                    <Input
                        placeholder="Search history..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8 pl-8 pr-2 w-full bg-background shadow-sm"
                    />
                </div>
                <div className="ml-2">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/ai-search">
                            <Plus className="h-4 w-4" />
                            <span className="sr-only">New Chat</span>
                        </Link>
                    </Button>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <ChatHistory searchQuery={searchQuery} />
            </SidebarContent>
            <SidebarFooter className="p-4">
                {/* Footer content if needed */}
            </SidebarFooter>
        </Sidebar>
    )
}
