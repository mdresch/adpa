/**
 * Proxy route for AI streaming.
 * This route takes a messages array and proxies it to the backend Express server
 * for centralized AI management and streaming.
 */
export async function POST(req: Request) {
    const { messages, provider, model, temperature, max_tokens } = await req.json();

    // Proxy to backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';
    const response = await fetch(`${backendUrl}/api/ai-providers/generate-stream`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages,
            provider,
            model,
            temperature,
            max_tokens
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Streaming request failed' }));
        return new Response(JSON.stringify(errorData), {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // Return the streaming response directly
    return new Response(response.body, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
