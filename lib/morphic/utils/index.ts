import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { type AIModel } from '@/lib/morphic/types/models'

// Function to generate a UUID
export function generateUUID(): string {
    // Generate UUIDv4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0,
            v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Sanitizes a URL by replacing spaces with '%20'
 * @param url - The URL to sanitize
 * @returns The sanitized URL
 */
export function sanitizeUrl(url: string): string {
    return url.replace(/\s+/g, '%20')
}

export function createModelId(model: AIModel): string {
    return `${model.providerId}:${model.id}`
}

export function getDefaultModelId(models: AIModel[]): string {
    if (!models.length) {
        throw new Error('No models available')
    }
    return createModelId(models[0])
}

export const fetcher = async (url: string) => {
    const res = await fetch(url)

    if (!res.ok) {
        const error = new Error('An error occurred while fetching the data.')
        // Attach extra info to the error object.
        try {
            // @ts-ignore
            error.info = await res.json()
        } catch (e) {
            // ignore
        }
        // @ts-ignore
        error.status = res.status
        throw error
    }

    return res.json()
}
