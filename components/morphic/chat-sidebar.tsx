'use client'

import * as React from 'react'
import { type ChangeEvent } from 'react'
import Link from 'next/link'
import { Plus, Search, Settings } from 'lucide-react'

import { ChatHistory } from '@/components/morphic/chat-history'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarTrigger,
} from '@/components/morphic/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function ChatSidebar() {
    const [searchQuery, setSearchQuery] = React.useState('')

    return (
        <Sidebar className="border-r h-full">
            <SidebarHeader className="h-14 justify-center px-4 border-b">
                <div className="flex flex-row items-center gap-2">
                    <SidebarTrigger className="-ml-2 opacity-70 hover:opacity-100 transition-opacity" />
                    <div className="flex-1 flex items-center relative">
                        <Search className="h-3.5 w-3.5 absolute left-2.5 text-muted-foreground" />
                        <Input
                            placeholder="Search history..."
                            value={searchQuery}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                            className="h-8 pl-8 pr-2 w-full bg-background shadow-sm border-muted/50"
                        />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-1" asChild>
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
            <SidebarFooter className="p-3 border-t">
                <div className="flex items-center justify-end">
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                        <Link href="/ai/morphic/settings" aria-label="Morphic Mission Control">
                            <Settings className="h-4 w-4" />
                            <span className="sr-only">Morphic Mission Control</span>
                        </Link>
                    </Button>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
