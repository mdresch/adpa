
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import * as api from '@opentelemetry/api';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from .env in the same directory
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('Testing Langfuse connectivity (Direct OTLP)...');
const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
const secretKey = process.env.LANGFUSE_SECRET_KEY;

console.log('Public Key:', publicKey ? 'Present' : 'MISSING');
console.log('Secret Key:', secretKey ? 'Present' : 'MISSING');

const authHeader = `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`;

const sdk = new NodeSDK({
    resource: new Resource({
        [ATTR_SERVICE_NAME]: 'adpa-trace-debug-direct',
    }),
    spanProcessors: [
        new SimpleSpanProcessor(new ConsoleSpanExporter()),
        new SimpleSpanProcessor(new OTLPTraceExporter({
            url: 'https://cloud.langfuse.com/api/public/otel/v1/traces',
            headers: {
                Authorization: authHeader,
            }
        })),
    ],
});

async function runTest() {
    try {
        console.log('Starting SDK...');
        sdk.start();
        console.log('SDK started successfully.');

        const tracer = api.trace.getTracer('debug-tracer');
        console.log('Creating test span...');

        await tracer.startActiveSpan('langfuse-smoke-test-direct', async (span) => {
            span.setAttribute('debug', true);
            span.setAttribute('direct', true);
            console.log('Span created, waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            console.log('Ending span...');
            span.end();
        });

        console.log('Shutting down SDK (flushing traces)...');
        await sdk.shutdown();
        console.log('SDK shut down successfully.');
        console.log('Test complete. Please check Langfuse dashboard for "langfuse-smoke-test-direct" trace.');
    } catch (error) {
        console.error('Test failed with error:');
        console.error(error);
    }
}

runTest();
