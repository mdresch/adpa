import Link from 'next/link'
import { Plus } from 'lucide-react'

import { ChatHistory } from '@/components/morphic/chat-history'
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarProvider,
    SidebarTrigger
} from '@/components/morphic/ui/sidebar'
import { Button } from '@/components/ui/button'
import ArtifactRoot from '@/components/morphic/artifact/artifact-root'

export default function AISearchLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <SidebarProvider>
            <Sidebar className="border-r">
                <SidebarHeader className="h-14 flex items-center px-4 border-b">
                    <Link href="/ai-search" className="flex items-center gap-2 font-semibold">
                        <span>Morphic Search</span>
                    </Link>
                    <div className="ml-auto">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/ai-search">
                                <Plus className="h-4 w-4" />
                                <span className="sr-only">New Chat</span>
                            </Link>
                        </Button>
                    </div>
                </SidebarHeader>
                <SidebarContent>
                    <ChatHistory />
                </SidebarContent>
                <SidebarFooter className="p-4">
                    {/* Footer content if needed */}
                </SidebarFooter>
            </Sidebar>
            <ArtifactRoot>
                {children}
            </ArtifactRoot>
        </SidebarProvider>
    )
}
