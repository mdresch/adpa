/**
 * OpenTelemetry Tracing Configuration
 * 
 * Configures distributed tracing for the ADPA backend using OpenTelemetry.
 * Exports traces to AI Toolkit's OTLP endpoint for visualization.
 * 
 * IMPORTANT: This file must be imported BEFORE any other imports in server.ts
 */

import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '../.env') })

import { NodeSDK } from '@opentelemetry/sdk-node'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { BatchSpanProcessor, SimpleSpanProcessor, ConsoleSpanExporter, SpanProcessor, Span } from '@opentelemetry/sdk-trace-base'
import { asyncLocalStorage } from './infrastructure/logger'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

// Only log OpenTelemetry errors (suppress info/warn/debug noise)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

const DEFAULT_LANGFUSE_OTLP_ENDPOINT = 'https://cloud.langfuse.com/api/public/otel/v1/traces'

/**
 * Custom SpanProcessor to inject correlationId from AsyncLocalStorage into all spans.
 */
class CorrelationIdProcessor implements SpanProcessor {
  onStart(span: Span): void {
    const correlationId = asyncLocalStorage.getStore()
    if (correlationId) {
      span.setAttribute('correlationId', correlationId)
    }
  }
  onEnd(): void {}
  forceFlush(): Promise<void> { return Promise.resolve() }
  shutdown(): Promise<void> { return Promise.resolve() }
}

// Configuration
const ENABLE_LANGFUSE_OTLP = process.env.ENABLE_LANGFUSE_TRACING === 'true'
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY
const LANGFUSE_BASE_URL = process.env.LANGFUSE_BASE_URL
const LANGFUSE_OTLP_AUTH_HEADER = process.env.LANGFUSE_OTLP_AUTH_HEADER

export function buildLangfuseOtlpEndpoint(options: {
  langfuseOtlpEndpoint?: string
  langfuseBaseUrl?: string
}): string {
  if (options.langfuseOtlpEndpoint) {
    return options.langfuseOtlpEndpoint
  }

  if (options.langfuseBaseUrl) {
    const normalizedBaseUrl = options.langfuseBaseUrl.replace(/\/+$/, '')
    return `${normalizedBaseUrl}/api/public/otel/v1/traces`
  }

  return DEFAULT_LANGFUSE_OTLP_ENDPOINT
}

export function buildLangfuseOtlpAuthHeader(options: {
  otlpAuthHeader?: string
  publicKey?: string
  secretKey?: string
}): string | undefined {
  if (options.otlpAuthHeader) {
    return options.otlpAuthHeader
  }

  if (options.publicKey && options.secretKey) {
    return `Basic ${Buffer.from(`${options.publicKey}:${options.secretKey}`).toString('base64')}`
  }

  return undefined
}

const OTLP_ENDPOINT = ENABLE_LANGFUSE_OTLP
  ? buildLangfuseOtlpEndpoint({
      langfuseOtlpEndpoint: process.env.LANGFUSE_OTLP_ENDPOINT,
      langfuseBaseUrl: LANGFUSE_BASE_URL,
    })
  : (process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces')

const SERVICE_NAME = process.env.SERVICE_NAME || 'adpa-backend'
const SERVICE_VERSION = process.env.npm_package_version || process.env.SERVICE_VERSION || '1.0.0'
const NODE_ENV = process.env.NODE_ENV || 'development'
const TRACING_ENABLED = process.env.TRACING_ENABLED !== 'false'

let sdk: NodeSDK | null = null

/**
 * Check if Langfuse tracing is enabled
 */
export function isTracingEnabled(): boolean {
  return process.env.ENABLE_LANGFUSE_TRACING === 'true'
}

/**
 * Check if native Langfuse SDK tracing is enabled.
 * Useful when OTLP tracing should remain enabled but native ingestion should be disabled.
 */
export function isNativeLangfuseEnabled(): boolean {
  return process.env.ENABLE_LANGFUSE_NATIVE_SDK !== 'false'
}

/**
 * Initialize OpenTelemetry tracing
 */
export function initTracing(): void {
  if (!TRACING_ENABLED) {
    console.log('📊 Tracing is disabled (set TRACING_ENABLED=true to enable)')
    return
  }

  if (!ENABLE_LANGFUSE_OTLP) {
    console.log('📊 OpenTelemetry OTLP tracing is disabled (native Langfuse SDK tracing remains available)')
    return
  }

  try {
    // Create span processors
    const spanProcessors: SpanProcessor[] = [new CorrelationIdProcessor()]
    if (ENABLE_LANGFUSE_OTLP) {
      const authHeader = buildLangfuseOtlpAuthHeader({
        otlpAuthHeader: LANGFUSE_OTLP_AUTH_HEADER,
        publicKey: LANGFUSE_PUBLIC_KEY,
        secretKey: LANGFUSE_SECRET_KEY,
      })

      if (!authHeader) {
        console.warn('⚠️ Langfuse OTLP auth missing, skipping tracing export')
      } else {
        const maskedKey = LANGFUSE_PUBLIC_KEY ? `${LANGFUSE_PUBLIC_KEY.substring(0, 6)}...` : 'override-header'
        console.log(`[Tracing] 📡 Configuring Langfuse OTLP export:`)
        console.log(`[Tracing]    Endpoint: ${OTLP_ENDPOINT}`)
        console.log(`[Tracing]    Public Key: ${maskedKey}`)

        // Use BatchSpanProcessor for OTLP to improve efficiency and reduce concurrency errors
        // (SimpleSpanProcessor sends spans immediately, which can hit limits during high load)
        spanProcessors.push(new BatchSpanProcessor(new OTLPTraceExporter({
          url: OTLP_ENDPOINT,
          headers: {
            Authorization: authHeader,
          },
          timeoutMillis: parseInt(process.env.OTLP_TIMEOUT || '10000'),
        }), {
          // Periodically export spans
          scheduledDelayMillis: parseInt(process.env.OTLP_SCHEDULED_DELAY || '5000'),
          // Maximum batch size (reduce network calls)
          maxExportBatchSize: parseInt(process.env.OTLP_MAX_BATCH_SIZE || '512'),
          // Buffer size
          maxQueueSize: parseInt(process.env.OTLP_MAX_QUEUE_SIZE || '2048'),
        }))

        // ConsoleSpanExporter disabled to reduce noise — enable with DEBUG_TRACING=true
        if (process.env.DEBUG_TRACING === 'true') {
          console.log('[Tracing]    ConsoleSpanExporter enabled for local debugging')
          spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()))
        }
      }
    }

    // Create resource with service information
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      'deployment.environment': NODE_ENV,
    })

    // Initialize the SDK with NO auto-instrumentation to reduce noise
    // Only manual traces (like AI provider calls) will be exported
    sdk = new NodeSDK({
      serviceName: SERVICE_NAME,
      resource,
      spanProcessors,
      instrumentations: [], // Disabled general system telemetry
    })

    // Start the SDK
    sdk.start()

    console.log(`📊 OpenTelemetry tracing initialized`)
    console.log(`   Service: ${SERVICE_NAME} v${SERVICE_VERSION}`)
    console.log(`   Endpoint: ${OTLP_ENDPOINT} ${ENABLE_LANGFUSE_OTLP ? '(Langfuse)' : '(Local/Native)'}`)
    if (ENABLE_LANGFUSE_OTLP) {
      const target = OTLP_ENDPOINT.includes('localhost') ? 'Local' : 'Cloud'
      console.log(`   Status: 🚀 Exporting to Langfuse ${target}`)
    }

    // Graceful shutdown
    process.on('SIGTERM', () => {
      sdk?.shutdown()
        .then(() => console.log('📊 Tracing terminated'))
        .catch((error) => console.error('Error terminating tracing', error))
    })

  } catch (error) {
    console.error('Failed to initialize tracing:', error)
  }
}

/**
 * Shutdown tracing gracefully
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    await sdk.shutdown()
    console.log('📊 Tracing shutdown complete')
  }
}

// Auto-initialize if this module is imported
if (process.env.NODE_ENV !== 'test') {
  initTracing()
}
