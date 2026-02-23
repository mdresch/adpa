import { AlertCircle } from 'lucide-react'
import { Card } from '@/components/morphic/ui/card'

interface ChatErrorProps {
    error: Error | string | null | undefined
}

export function ChatError({ error }: ChatErrorProps) {
    if (!error) return null

    let errorMessage = error instanceof Error ? error.message : String(error || '')

    try {
        const jsonMatch = typeof errorMessage === 'string' ? errorMessage.match(/\{.*\}/) : null
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0])
            const errorObj = parsed.error || parsed
            if (typeof errorObj === 'object' && errorObj !== null) {
                errorMessage = errorObj.message || errorObj.code || JSON.stringify(errorObj)
            } else if (typeof errorObj === 'string') {
                errorMessage = errorObj
            }
        }
    } catch {
        // If parsing fails, use the original error message
    }

    if (typeof errorMessage !== 'string') {
        errorMessage = JSON.stringify(errorMessage)
    }

    return (
        <Card className="border-destructive bg-destructive/10 p-4">
            <div className="flex items-center gap-3">
                <AlertCircle className="size-5 text-destructive shrink-0" />
                <p className="text-sm text-destructive">{errorMessage}</p>
            </div>
        </Card>
    )
}
