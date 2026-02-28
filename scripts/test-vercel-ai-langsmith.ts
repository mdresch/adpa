import 'dotenv/config'
import * as ai from 'ai'
import { createGateway } from '@ai-sdk/gateway'
import { wrapAISDK } from 'langsmith/experimental/vercel'

async function main() {
  const gatewayApiKey =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_AI_GATEWAY_API_KEY ||
    process.env.OPENAI_API_KEY

  if (!gatewayApiKey) {
    throw new Error('Missing AI Gateway key. Set AI_GATEWAY_API_KEY (or VERCEL_AI_GATEWAY_API_KEY).')
  }

  const gateway = createGateway({ apiKey: gatewayApiKey })

  const { generateText, streamText, generateObject, streamObject } = wrapAISDK(ai)
  void streamText
  void generateObject
  void streamObject

  const result = await generateText({
    model: gateway('openai/gpt-4o-mini'),
    prompt: 'Write a vegetarian lasagna recipe for 4 people.',
  })

  console.log(result.text)
}

main().catch((error) => {
  console.error('Vercel AI SDK + LangSmith test failed:', error)
  process.exit(1)
})
