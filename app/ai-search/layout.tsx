import { SidebarProvider } from '@/components/morphic/ui/sidebar'
import ArtifactRoot from '@/components/morphic/artifact/artifact-root'
import { ChatSidebar } from '@/components/morphic/chat-sidebar'
import { Sidebar as MainSidebar } from '@/components/sidebar'
import { Header } from '@/components/header'

export default function AISearchLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 overflow-hidden">
            {/* Global ADPA Sidebar */}
            <MainSidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Global Header */}
                <Header />

                {/* AI Search Content with Morphic sidebar */}
                <main className="flex-1 overflow-hidden relative flex">
                    <SidebarProvider defaultOpen={false}>
                        <ChatSidebar />
                        <div className="flex-1 flex overflow-hidden relative">
                            <ArtifactRoot>
                                {children}
                            </ArtifactRoot>
                        </div>
                    </SidebarProvider>
                </main>
            </div>
        </div>
    )
}
