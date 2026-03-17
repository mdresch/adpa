async function testApi() {
    console.log('Testing /api/morphic/chat...')
    try {
        const response = await fetch('http://localhost:3005/api/morphic/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: {
                    id: 'test-msg',
                    role: 'user',
                    parts: [{ type: 'text', text: 'Hello' }],
                    createdAt: new Date()
                },
                messages: [],
                chatId: 'test-chat-' + Date.now(),
                model: {
                    id: 'gemini-1.5-pro-002',
                    providerId: 'google'
                },
                searchMode: 'adaptive',
                modelType: 'quality',
                isNewChat: true
            })
        })

        console.log('Status:', response.status)
        console.log('Status Text:', response.statusText)
        const body = await response.text()
        console.log('Response Body:', body)
    } catch (err: any) {
        console.error('Fetch failed:', err.message)
    }
}

testApi()
