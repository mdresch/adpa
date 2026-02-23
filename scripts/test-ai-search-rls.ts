
import { config } from 'dotenv'
import path from 'path'

// Load environment variables *before* any other imports
// We use path.resolve to find .env files relative to the project root
const projectRoot = process.cwd()
config({ path: path.resolve(projectRoot, '.env') })
config({ path: path.resolve(projectRoot, '.env.local') })

async function test() {
    console.log('🧪 Testing createChatStreamResponse with RLS...')

    try {
        // Dynamic imports ensure env vars are loaded before these modules are evaluated
        const { createChatStreamResponse } = await import('@/lib/morphic/streaming/create-chat-stream-response')

        // Mock model
        const mockModel = {
            id: 'gemini-2.5-flash',
            name: 'Gemini 2.5 Flash',
            providerId: 'google',
            modelId: 'gemini-2.5-flash',
            isEnabled: true
        }

        console.log('Calling createChatStreamResponse...')
        const response = await createChatStreamResponse({
            chatId: 'test-chat-id-' + Date.now(),
            userId: 'test-user-id', // Should trigger RLS context setting
            messages: [{ role: 'user', content: 'Hello, testing RLS' }],
            model: mockModel as any,
            messageId: 'test-message-id-' + Date.now(),
            trigger: undefined,
            isNewChat: true,
            searchMode: 'quick',
            modelType: 'speed',
            knowledgeEnabled: false,
            // Mock AbortSignal
            abortSignal: new AbortController().signal
        })

        console.log('✅ Response received. Status:', response.status)

        if (!response.body) {
            console.error('❌ Response has no body')
            return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        console.log('Reading stream...')
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const text = decoder.decode(value)
            console.log('Chunk:', text.substring(0, 50) + (text.length > 50 ? '...' : ''))
        }
        console.log('✅ Stream finished successfully')

    } catch (error) {
        console.error('❌ Error during test:', error)
    }
}

test()
