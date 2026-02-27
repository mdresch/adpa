import { generateText } from 'ai'
import { getModel } from './lib/morphic/utils/registry'

async function test() {
    const modelId = "ollama:mistral-large-3:675b-cloud"
    console.log(`Testing full generateText with model: ${modelId}`)
    try {
        const result = await generateText({
            model: getModel(modelId),
            prompt: "Hello world",
        })
        console.log(result.text)
    } catch (e) {
        console.error("SDK Error:", e)
    }
}
test()
