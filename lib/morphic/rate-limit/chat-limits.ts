import { CacheService } from '../../kv';

/**
 * Enforce overall chat limits for authenticated users.
 * Allows 50 chats per hour by default.
 */
export async function checkAndEnforceOverallChatLimit(userId: string) {
    if (!userId) return null;

    const limit = parseInt(process.env.RATE_LIMIT_USER_HOUR || '50', 10);
    const window = 3600; // 1 hour
    const key = `chat:limit:user:${userId}`;

    const allowed = await CacheService.rateLimit(key, limit, window);

    if (!allowed) {
        console.warn(`[RATE-LIMIT] User ${userId} exceeded chat limit (${limit} per hour)`);
        throw new Error('Chat limit exceeded. Please try again in an hour.');
    }

    return null;
}

/**
 * Enforce guest limits based on IP address.
 * Allows 5 chats per hour for guests.
 */
export async function checkAndEnforceGuestLimit(ip: string | null) {
    if (!ip) return null;

    const limit = parseInt(process.env.RATE_LIMIT_GUEST_HOUR || '5', 10);
    const window = 3600; // 1 hour
    const key = `chat:limit:guest:${ip}`;

    const allowed = await CacheService.rateLimit(key, limit, window);

    if (!allowed) {
        console.warn(`[RATE-LIMIT] Guest IP ${ip} exceeded chat limit (${limit} per hour)`);
        throw new Error('Guest chat limit exceeded. Please sign up for more access or try again later.');
    }

    return null;
}
