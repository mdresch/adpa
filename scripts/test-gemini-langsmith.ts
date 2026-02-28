import 'dotenv/config'
import { GoogleGenAI } from '@google/genai'
import * as wrappers from 'langsmith/wrappers'

async function main() {
  const geminiClient = new GoogleGenAI({})

  const client = wrappers.wrapSDK(geminiClient, {
    tracing_extra: {
      tags: ['gemini', 'typescript'],
      metadata: {
        integration: 'google-genai',
      },
    },
  }) as GoogleGenAI

  const response = await client.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: 'Explain quantum computing in simple terms.',
  })

  console.log(response.text)
}

main().catch((error) => {
  console.error('Gemini + LangSmith test failed:', error)
  process.exit(1)
})
