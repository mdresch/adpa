export const displayUrlName = (url: string): string => {
    try {
        const hostname = new URL(url).hostname
        const parts = hostname.split('.')
        return parts.length > 2 ? parts.slice(1, -1).join('.') : parts[0]
    } catch {
        return 'source'
    }
}
