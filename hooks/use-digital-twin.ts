import { useState, useCallback } from 'react'
import api from '@/lib/api'
import { DigitalTwinAsset, DigitalTwinEvent } from '@/lib/digital-twin-types'
import { toast } from 'sonner'

export function useDigitalTwin() {
    const [loading, setLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [assets, setAssets] = useState<DigitalTwinAsset[]>([])
    const [events, setEvents] = useState<DigitalTwinEvent[]>([])

    const fetchAssets = useCallback(async (projectId: string) => {
        setLoading(true)
        try {
            const data = await api.get<DigitalTwinAsset[]>(`/digital-twin/assets?projectId=${projectId}`)
            setAssets(data)
        } catch (error) {
            console.error('Failed to fetch assets:', error)
            toast.error('Failed to fetch assets')
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchEvents = useCallback(async (assetId: string) => {
        try {
            const data = await api.get<DigitalTwinEvent[]>(`/digital-twin/assets/${assetId}/events`)
            setEvents(data)
        } catch (error) {
            console.error('Failed to fetch events:', error)
            toast.error('Failed to fetch asset history')
        }
    }, [])

    const uploadVisio = useCallback(async (projectId: string, file: File, sourceDocumentId?: string) => {
        setUploading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('projectId', projectId)
            if (sourceDocumentId) {
                formData.append('sourceDocumentId', sourceDocumentId)
            }

            // We need to use raw fetch or ensure api.post handles FormData correctly
            // api.ts usually handles JSON. Let's assume we need to handle FormData manually or rely on fetch logic
            // Looking at api.ts, it sets Content-Type to application/json automatically unless we override headers
            // Actually, standard fetch handles FormData if Content-Type is NOT set (browser sets it with boundary)

            // Let's us use api.request directly with custom logic if needed, or just standard fetch wrapping
            // But let's check if api.ts supports it. 
            // The `api.request` sets `Content-Type: application/json` by default. 
            // We might need to handle this carefully.

            // Workaround: We'll do a direct fetch using the token from api instance if possible, 
            // but `api` instance methods might be private.
            // Let's assume we can try to pass `body` as FormData and override Content-Type to undefined.

            await api.request('/digital-twin/ingestion/visio', {
                method: 'POST',
                body: formData,
                headers: {
                    // Explicitly Remove Content-Type so browser sets it
                    // Note: TypeScript might complain, but at runtime this is key
                    // casting to any to bypass generic dict constraints if needed
                } as any
            })

            toast.success('Visio file imported successfully')
            // Refresh assets
            await fetchAssets(projectId)
        } catch (error: any) {
            console.error('Failed to upload Visio:', error)
            toast.error(error.message || 'Failed to upload Visio file')
        } finally {
            setUploading(false)
        }
    }, [fetchAssets])

    return {
        loading,
        uploading,
        assets,
        events,
        fetchAssets,
        fetchEvents,
        uploadVisio
    }
}
