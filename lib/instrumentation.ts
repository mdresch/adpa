import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'

// Only log OpenTelemetry errors (suppress info/warn/debug noise)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

/**
 * OpenTelemetry Instrumentation for adpa-morphic (Next.js frontend)
 * 
 * NOTE: AI generation tracing is handled by the native Langfuse SDK
 * (see lib/morphic/utils/langfuse-client.ts).
 * 
 * SDK-only mode: ENABLE_LANGFUSE_TRACING=false disables OTLP telemetry/reporting
 * while ENABLE_LANGFUSE_NATIVE_SDK=true keeps native Langfuse SDK tracing enabled.
 */

console.log('[Instrumentation] Langfuse SDK-only mode active (OTLP telemetry/reporting disabled)')

