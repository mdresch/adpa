import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Registering instrumentation hook...')
    await import('./sentry.server.config');
    await import('./lib/instrumentation');
  }

  if (process.env.NEXT_RUNTIME === 'edge' && process.env.NODE_ENV === 'production') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = Sentry.captureRequestError;
