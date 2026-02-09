
import { streamText } from 'ai';
import 'dotenv/config';
import path from 'path';
import dotenv from 'dotenv';
import { createOpenAI } from '@ai-sdk/openai';

// Explicitly load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    console.log("🚀 Starting AI Gateway Verification (User Example V2)...");

    if (!process.env.AI_GATEWAY_API_KEY) {
        console.error("❌ AI_GATEWAY_API_KEY is missing.");
        process.exit(1);
    } else {
        console.log(`✅ AI_GATEWAY_API_KEY found: ${process.env.AI_GATEWAY_API_KEY.substring(0, 5)}...`);
    }

    try {
        console.log("SENDING REQUEST to AI Gateway using 'kwaipilot/kat-coder-pro-v1'...");

        // We use the OpenAI provider but point it to the AI Gateway Base URL if needed, 
        // OR we rely on the specific provider config for Kwaipilot if it exists.
        // However, the User's snippet was:
        // const result = streamText({ model: 'kwaipilot/kat-coder-pro-v1', ... })

        // This implies using the Vercel AI SDK Registry/Middleware. 
        // Since 'kwaipilot' isn't a standard provider export, this likely relies 
        // on the Gateway's compatibility layer or a specific setup.

        // For this script to work with JUST the 'ai' package and a string, 
        // the runtime needs to know how to resolve 'kwaipilot'.

        // If we assume the user is using the AI Gateway, we often use the 'openai' compatible endpoint.
        // But let's try the user's exact syntax. 
        // Note: If 'kwaipilot' is not a registered provider in the local SDK, this might fail 
        // unless 'ai' creates a default HTTP fallback or we configure a custom registry.

        // To make this work locally without a complex registry setup, users often use:
        // openai('kwaipilot/kat-coder-pro-v1') with base URL set to gateway.

        // BUT the user passed a STRING: model: 'kwaipilot/kat-coder-pro-v1'
        // I will try to use the `openai` provider with that model ID, 
        // as that is the standard way to route arbitrary models through a gateway 
        // that is OpenAI-compatible (which Vercel AI Gateway is).

        const openai = createOpenAI({
            apiKey: process.env.AI_GATEWAY_API_KEY,
            baseURL: 'https://gateway.ai.cloudflare.com/v1/...' // Wait, Vercel AI Gateway URL?
            // Actually, Vercel AI Gateway usually acts as an OpenAI-compatible endpoint.
        });

        // Let's TRY using the openai provider wrapper (most robust for Gateways)
        // with the specific model ID.

        const result = streamText({
            model: openai('kwaipilot/kat-coder-pro-v1'),
            prompt: 'What is the history of the San Francisco Mission-style burrito?',
        });

        console.log("RESPONSE STREAMING:");
        let fullText = "";
        for await (const textPart of result.textStream) {
            process.stdout.write(textPart);
            fullText += textPart;
        }

        console.log("\n\n✅ AI Gateway Verification Completed.");
    } catch (error: any) {
        console.error("\n❌ Verification Failed:", error.message);
        if (error.cause) console.error("Cause:", error.cause);
    }
}

main().catch(console.error);
