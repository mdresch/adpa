export const dynamic = 'force-dynamic'

import { Chat } from '@/components/morphic/chat'

export default function AISearchPage() {
    return (
        <div className="flex flex-col flex-1 h-full overflow-hidden bg-background">
            <Chat enableRagContextPanel />
        </div>
    )
}
