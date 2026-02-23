import { Langfuse } from 'langfuse';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function run() {
    const langfuse = new Langfuse({
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL
    });

    console.log("Initializing Langfuse Native Trace...");

    const trace = langfuse.trace({
        name: "onboarding-completion-trace",
        userId: "adpa-developer",
        tags: ["onboarding"]
    });

    trace.generation({
        name: "test-completion-generation",
        model: "test-model",
        input: "Hello Langfuse! Did you get this?",
        output: "Yes, onboarding should be complete."
    });

    console.log("Flushing to Langfuse...");
    await langfuse.flushAsync();
    console.log("Successfully flushed native trace!");
}

run().catch(console.error);
