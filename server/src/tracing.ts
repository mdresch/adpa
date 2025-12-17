/**
 * OpenTelemetry Tracing Configuration
 * 
 * Configures distributed tracing for the ADPA backend using OpenTelemetry.
 * Exports traces to AI Toolkit's OTLP endpoint for visualization.
 * 
 * IMPORTANT: This file must be imported BEFORE any other imports in server.ts
 */

import { NodeSDK, resources } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'

// Configuration
const OTLP_ENDPOINT = process.env.OTLP_ENDPOINT || 'http://localhost:4318/v1/traces'
const SERVICE_NAME = process.env.SERVICE_NAME || 'adpa-backend'
const SERVICE_VERSION = process.env.npm_package_version || '2.0.0'
const TRACING_ENABLED = process.env.TRACING_ENABLED !== 'false'

let sdk: NodeSDK | null = null

/**
 * Initialize OpenTelemetry tracing
 */
export function initTracing(): void {
  if (!TRACING_ENABLED) {
    console.log('📊 Tracing is disabled (set TRACING_ENABLED=true to enable)')
    return
  }

  try {
    // Create OTLP exporter for AI Toolkit
    const traceExporter = new OTLPTraceExporter({
      url: OTLP_ENDPOINT,
    })

    // Create resource with service information
    const resource = resources.resourceFromAttributes({
      [ATTR_SERVICE_NAME]: SERVICE_NAME,
      [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
      'deployment.environment': process.env.NODE_ENV || 'development',
    })

    // Initialize the SDK with auto-instrumentation
    sdk = new NodeSDK({
      serviceName: SERVICE_NAME,
      resource,
      traceExporter,
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
    console.log(`   OTLP Endpoint: ${OTLP_ENDPOINT}`)

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
