import { NodeSDK } from '@opentelemetry/sdk-node'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base'

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'adpa-morphic',
    }),
    spanProcessor: new SimpleSpanProcessor(
        new OTLPTraceExporter({
            url: process.env.LANGFUSE_OTLP_ENDPOINT || 'https://cloud.langfuse.com/api/public/otlp/v1/traces',
            headers: {
                Authorization: `Basic ${Buffer.from(
                    `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`
                ).toString('base64')}`,
            },
        })
    ),
    instrumentations: [],
})

sdk.start()
