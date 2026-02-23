export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        console.log('[Instrumentation] Registering instrumentation hook...')
        await import('./lib/instrumentation')
    }
}
