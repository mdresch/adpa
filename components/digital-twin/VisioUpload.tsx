import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useDigitalTwin } from '@/hooks/use-digital-twin'
import { Label } from '@/components/ui/label'

interface VisioUploadProps {
    projectId: string
    onUploadComplete?: () => void
}

export function VisioUpload({ projectId, onUploadComplete }: VisioUploadProps) {
    const { uploadVisio, uploading } = useDigitalTwin()
    const [file, setFile] = useState<File | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
        }
    }

    const handleUpload = async () => {
        if (!file || !projectId) return
        await uploadVisio(projectId, file)
        setFile(null)
        if (onUploadComplete) onUploadComplete()
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Import Visio Diagram</CardTitle>
                <CardDescription>
                    Upload a .vsdx file to pre-stage Digital Twin assets.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-4">
                    <div className="grid w-full items-center gap-1.5">
                        <Label htmlFor="visio-file">Visio File (.vsdx)</Label>
                        <Input
                            id="visio-file"
                            type="file"
                            accept=".vsdx"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button
                            onClick={handleUpload}
                            disabled={!file || uploading}
                        >
                            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {uploading ? 'Importing...' : 'Import Assets'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
