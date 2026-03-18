import dotenv from "dotenv"
import path from "path"
import { generateText } from "ai"

// Load root .env.development
dotenv.config({ path: path.resolve(process.cwd(), '.env.development') })

async function testProviders() {
    const { refreshRegistry, registry } = await import('./lib/morphic/utils/registry')
    await refreshRegistry()

    const providersToTest = [
        { id: 'google', model: 'google:gemini-1.5-flash' },
        { id: 'openai', model: 'openai:gpt-4o-mini' },
        { id: 'mistral', model: 'mistral:mistral-small-latest' },
        { id: 'deepseek', model: 'deepseek:deepseek-chat' }
    ]

    for (const p of providersToTest) {
        console.log(`\n--- Testing Provider: ${p.id} (${p.model}) ---`)
        try {
            const model = registry.languageModel(p.model as any)
            const { text } = await generateText({
                model,
                prompt: "Say 'Hello'",
                maxTokens: 5
            })
            console.log(`✅ SUCCESS: ${text.trim()}`)
        } catch (err: any) {
            console.error(`❌ FAILED: ${err.message}`)
            if (err.stack && process.env.NODE_ENV === 'development') {
                // console.error(err.stack)
            }
        }
    }
}

testProviders().catch(console.error)
