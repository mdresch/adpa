
import { NodeSDK } from '@opentelemetry/sdk-node';
import { LangfuseSpanProcessor } from '@langfuse/otel';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import * as api from '@opentelemetry/api';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env from server/.env
dotenv.config({ path: path.resolve(__dirname, 'server/.env') });

console.log('Testing Langfuse connectivity...');
console.log('Public Key:', process.env.LANGFUSE_PUBLIC_KEY ? 'Present' : 'MISSING');
console.log('Secret Key:', process.env.LANGFUSE_SECRET_KEY ? 'Present' : 'MISSING');
console.log('Base URL:', process.env.LANGFUSE_BASE_URL || 'Default (US)');

const sdk = new NodeSDK({
    resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: 'adpa-trace-debug',
    }),
    spanProcessor: new LangfuseSpanProcessor(),
});

async function runTest() {
    try {
        console.log('Starting SDK...');
        sdk.start();

        const tracer = api.trace.getTracer('debug-tracer');
        console.log('Creating test span...');

        await tracer.startActiveSpan('langfuse-smoke-test', async (span) => {
            span.setAttribute('debug', true);
            span.setAttribute('timestamp', new Date().toISOString());
            console.log('Span created, waiting 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            span.end();
        });

        console.log('Shutting down SDK (flushing traces)...');
        await sdk.shutdown();
        console.log('Test complete. Please check Langfuse dashboard for "langfuse-smoke-test" trace.');
    } catch (error) {
        console.error('Test failed:', error);
    }
}

runTest();
