import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface VisioDownloadButtonProps {
    projectId: string
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
    size?: "default" | "sm" | "lg" | "icon"
}

export function VisioDownloadButton({ projectId, variant = "outline", size = "sm" }: VisioDownloadButtonProps) {
    const [downloading, setDownloading] = useState(false)

    const handleDownload = async () => {
        if (!projectId) return
        setDownloading(true)
        try {
            const token = localStorage.getItem('auth_token')
            const response = await fetch(`/api/digital-twin/export/visio?projectId=${projectId}`, {
                method: 'GET',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            })

            if (!response.ok) {
                const err = await response.json().catch(() => ({}))
                throw new Error(err.error || 'Download failed')
            }

            // Create blob and download link
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `digital-twin-${projectId}.vsdx`
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)

            toast.success('Visio diagram downloaded successfully')
        } catch (error: any) {
            console.error('Failed to download Visio:', error)
            toast.error(error.message || 'Failed to download Diagram')
        } finally {
            setDownloading(false)
        }
    }

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleDownload}
            disabled={downloading}
        >
            {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Download className="mr-2 h-4 w-4" />
            )}
            {downloading ? 'Generating...' : 'Export Visio'}
        </Button>
    )
}
