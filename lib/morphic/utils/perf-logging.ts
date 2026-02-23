/**
 * Simple performance logging utility
 */

export function perfLog(message: string): void {
    if (process.env.NEXT_PUBLIC_ENABLE_PERF_LOGGING === 'true') {
        console.log(`[PERF] ${message}`)
    }
}

export function perfTime(message: string, start: number): void {
    if (process.env.NEXT_PUBLIC_ENABLE_PERF_LOGGING === 'true') {
        const end = performance.now()
        const duration = (end - start).toFixed(2)
        console.log(`[PERF:TIME] ${message} - ${duration}ms`)
    }
}
