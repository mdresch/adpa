'use client'
import { useCallback, useState } from 'react'
export function useFileDropzone({ setUploadedFiles }: any) {
    const [isDragging, setIsDragging] = useState(false)
    const handleDragOver = useCallback((e: any) => { e.preventDefault(); setIsDragging(true) }, [])
    const handleDragLeave = useCallback((e: any) => { e.preventDefault(); setIsDragging(false) }, [])
    const handleDrop = useCallback(async (e: any) => { e.preventDefault(); setIsDragging(false); const files = Array.from(e.dataTransfer.files); setUploadedFiles((prev: any) => [...prev, ...files.map((f: any) => ({ file: f, status: 'uploaded' }))]) }, [setUploadedFiles])
    return { isDragging, handleDragOver, handleDragLeave, handleDrop }
}
