import { notFound } from 'next/navigation'
import { Chat } from '@/components/morphic/chat'
import { loadChat } from '@/lib/morphic/actions/chat'

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const chat = await loadChat(id)

    if (!chat) {
        notFound()
    }

    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
            <Chat
                id={chat.id}
                savedMessages={chat.messages}
            />
        </div>
    )
}
