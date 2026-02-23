import { NodeSDK } from '@opentelemetry/sdk-node'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'

// Enable diagnostic logging
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

console.log('[Instrumentation] Initializing OpenTelemetry SDK for adpa-morphic...')

const ENABLE_LANGFUSE = process.env.ENABLE_LANGFUSE_TRACING === 'true'

if (!ENABLE_LANGFUSE) {
    console.log('[Instrumentation] Langfuse tracing is disabled via ENABLE_LANGFUSE_TRACING.')
} else if (!process.env.LANGFUSE_PUBLIC_KEY || !process.env.LANGFUSE_SECRET_KEY) {
    console.warn('[Instrumentation] Langfuse API keys are missing. Telemetry is disabled.')
} else {
    console.log('[Instrumentation] Langfuse telemetry enabled.')
    const authHeader = `Basic ${Buffer.from(`${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`).toString('base64')}`

    const endpoint = process.env.LANGFUSE_OTLP_ENDPOINT || 'https://cloud.langfuse.com/api/public/otlp/v1/traces'
    console.log(`[Instrumentation] 📡 Routing frontend traces to: ${endpoint}`)
    console.log(`[Instrumentation]    Public Key: ${process.env.LANGFUSE_PUBLIC_KEY?.substring(0, 6)}...`)

    const spanProcessors = [
        new SimpleSpanProcessor(new OTLPTraceExporter({
            url: endpoint,
            headers: {
                Authorization: authHeader,
            }
        }))
    ]

    // Local spans visibility
    if (process.env.NODE_ENV === 'development' || process.env.DEBUG_TRACING === 'true') {
        console.log('[Instrumentation]    ConsoleSpanExporter enabled for local debugging')
        spanProcessors.push(new SimpleSpanProcessor(new ConsoleSpanExporter()))
    }

    const sdk = new NodeSDK({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: 'adpa-morphic',
        }),
        spanProcessors,
        instrumentations: [
            getNodeAutoInstrumentations({
                // Customize instrumentations as needed
                '@opentelemetry/instrumentation-fs': {
                    enabled: false,
                },
            }),
        ],
    })

    sdk.start()
    console.log('[Instrumentation] OpenTelemetry SDK started successfully.')
}
