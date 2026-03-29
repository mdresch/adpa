import { NextRequest, NextResponse } from 'next/server'
import { createStore, listStores, deleteStore, getOrCreateStore } from '@/lib/morphic/services/rag-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/rag/stores - List all File Search stores
 */
export async function GET() {
    try {
        const stores = await listStores()
        return NextResponse.json({ success: true, stores: stores || [] })
    } catch (error: any) {
        console.error('[RAG] Failed to list stores:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to list stores' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/rag/stores - Create a new File Search store or get-or-create default
 * Body: { displayName?: string, tenantId?: string }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { displayName, tenantId } = body

        let store
        if (tenantId) {
            store = await getOrCreateStore(tenantId)
        } else {
            store = await createStore(displayName || undefined)
        }

        return NextResponse.json({ success: true, store })
    } catch (error: any) {
        console.error('[RAG] Failed to create store:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to create store' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/rag/stores - Delete a File Search store
 * Body: { storeName: string }
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json()
        const { storeName } = body

        if (!storeName) {
            return NextResponse.json(
                { success: false, error: 'storeName is required' },
                { status: 400 }
            )
        }

        await deleteStore(storeName)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('[RAG] Failed to delete store:', error)
        return NextResponse.json(
            { success: false, error: error.message || 'Failed to delete store' },
            { status: 500 }
        )
    }
}
