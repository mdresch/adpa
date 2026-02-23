import { NextRequest, NextResponse } from 'next/server'

import { loadChat, deleteChat } from '@/lib/morphic/actions/chat'

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const chat = await loadChat(id)

    if (!chat) {
        return new NextResponse('Chat not found', { status: 404 })
    }

    return NextResponse.json(chat)
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params
    const result = await deleteChat(id)

    if (!result.success) {
        return new NextResponse(result.error || 'Failed to delete chat', {
            status: 500
        })
    }

    return NextResponse.json(result)
}
