export async function trackChatEvent(event: any) {
    // ADPA analytics placeholder
}

export function calculateConversationTurn(messages: any[]) {
    return messages.filter(m => m.role === 'user').length
}
