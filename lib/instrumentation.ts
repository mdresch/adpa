import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'

// Only log OpenTelemetry errors (suppress info/warn/debug noise)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

/**
 * OpenTelemetry Instrumentation for adpa-morphic (Next.js frontend)
 * 
 * NOTE: AI generation tracing is handled by the native Langfuse SDK
 * (see lib/morphic/utils/langfuse-client.ts). The OTLP exporter has been
 * disabled because Langfuse's OTLP endpoint returns 404 for auto-instrumented
 * HTTP/fetch spans, flooding the console with errors.
 * 
 * To re-enable OTLP export for a different collector (e.g. Jaeger, Grafana),
 * set OTLP_ENDPOINT in .env and uncomment the SDK initialization below.
 */

console.log('[Instrumentation] Native Langfuse SDK is used for AI tracing (OTLP auto-instrumentation disabled)')

