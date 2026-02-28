/**
 * OpenTelemetry Tracing Configuration
 * 
 * Configures distributed tracing for the ADPA backend using OpenTelemetry.
 * Exports traces to AI Toolkit's OTLP endpoint for visualization.
 * 
 * IMPORTANT: This file must be imported BEFORE any other imports in server.ts
 */

import dotenv from 'dotenv'
dotenv.config()

import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { BatchSpanProcessor, SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

// Only log OpenTelemetry errors (suppress info/warn/debug noise)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR)

// Configuration
const ENABLE_LANGFUSE_OTLP = process.env.ENABLE_LANGFUSE_TRACING === 'true'
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY

const OTLP_ENDPOINT = ENABLE_LANGFUSE_OTLP
  ? (process.env.LANGFUSE_OTLP_ENDPOINT || 'https://cloud.langfuse.com/api/public/otel/v1/traces')
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
    const spanProcessors = []
    if (ENABLE_LANGFUSE_OTLP) {
      if (!LANGFUSE_PUBLIC_KEY || !LANGFUSE_SECRET_KEY) {
        console.warn('⚠️ Langfuse credentials missing, skipping tracing')
      } else {
        const maskedKey = `${LANGFUSE_PUBLIC_KEY.substring(0, 6)}...`
        console.log(`[Tracing] 📡 Configuring Langfuse OTLP export:`)
        console.log(`[Tracing]    Endpoint: ${OTLP_ENDPOINT}`)
        console.log(`[Tracing]    Public Key: ${maskedKey}`)

        const authHeader = `Basic ${Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString('base64')}`

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
    const resource = new Resource({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      'deployment.environment': NODE_ENV,
    })

    // Initialize the SDK with auto-instrumentation
    sdk = new NodeSDK({
      serviceName: SERVICE_NAME,
      resource,
      spanProcessors,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Customize instrumentations as needed
          '@opentelemetry/instrumentation-http': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          '@opentelemetry/instrumentation-pg': {
            enabled: true, // PostgreSQL instrumentation
          },
          '@opentelemetry/instrumentation-redis': {
            enabled: true, // Redis instrumentation
          },
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable file system to reduce noise
          },
        }),
      ],
    })

    // Start the SDK
    sdk.start()

    console.log(`📊 OpenTelemetry tracing initialized`)
    console.log(`   Service: ${SERVICE_NAME} v${SERVICE_VERSION}`)
    console.log(`   Endpoint: ${OTLP_ENDPOINT} ${ENABLE_LANGFUSE_OTLP ? '(Langfuse)' : '(Local/Native)'}`)
    if (ENABLE_LANGFUSE_OTLP) {
      console.log(`   Status: 🚀 Exporting to Langfuse Cloud`)
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
initTracing()
