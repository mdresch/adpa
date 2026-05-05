import { CacheService } from '../../kv';
import type { SearchMode } from '../types/search';
import type { ModelType } from '../types/model-type';

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

/**
 * Enforce per-model-type limits for authenticated users.
 * Quality-tier models (e.g. Gemini 2.5 Pro, Claude Opus) are more expensive
 * and have a lower default hourly cap than speed-tier models.
 */
export async function checkAndEnforceModelTypeLimit(userId: string, modelType: ModelType) {
    if (!userId) return null;

    // Quality models default to 20/hr; speed models share the overall 50/hr bucket
    if (modelType !== 'quality') return null;

    const limit = parseInt(process.env.RATE_LIMIT_QUALITY_HOUR || '20', 10);
    const window = 3600;
    const key = `chat:limit:quality:${userId}`;

    const allowed = await CacheService.rateLimit(key, limit, window);

    if (!allowed) {
        console.warn(`[RATE-LIMIT] User ${userId} exceeded quality-model limit (${limit} per hour)`);
        throw new Error('Quality model limit exceeded. Switch to speed mode or try again in an hour.');
    }

    return null;
}

/**
 * Enforce Deep Research mode limits for authenticated users.
 * Deep Research is computationally expensive (up to 100 LLM steps + parallel
 * web searches) so it has a separate, lower cap.
 */
export async function checkAndEnforceDeepResearchLimit(userId: string) {
    if (!userId) return null;

    const limit = parseInt(process.env.RATE_LIMIT_DEEP_RESEARCH_HOUR || '5', 10);
    const window = 3600;
    const key = `chat:limit:deep:${userId}`;

    const allowed = await CacheService.rateLimit(key, limit, window);

    if (!allowed) {
        console.warn(`[RATE-LIMIT] User ${userId} exceeded deep-research limit (${limit} per hour)`);
        throw new Error('Deep Research limit exceeded. Please try again in an hour or switch to Adaptive mode.');
    }

    return null;
}

/**
 * Enforce burst protection: allows at most N requests per minute per user.
 * This prevents rapid-fire submissions that bypass the hourly buckets.
 */
export async function checkAndEnforceBurstLimit(userId: string) {
    if (!userId) return null;

    const limit = parseInt(process.env.RATE_LIMIT_BURST_MINUTE || '5', 10);
    const window = 60; // 1 minute
    const key = `chat:limit:burst:${userId}`;

    const allowed = await CacheService.rateLimit(key, limit, window);

    if (!allowed) {
        console.warn(`[RATE-LIMIT] User ${userId} triggered burst protection`);
        throw new Error('Too many requests. Please wait a moment before sending another message.');
    }

    return null;
}

/**
 * Convenience function that enforces all applicable rate limits for a given
 * user, search mode, and model type in a single call.
 */
export async function checkAndEnforceAllLimits({
    userId,
    ip,
    searchMode,
    modelType
}: {
    userId?: string
    ip?: string | null
    searchMode?: SearchMode
    modelType?: ModelType
}) {
    if (userId) {
        await checkAndEnforceBurstLimit(userId);
        await checkAndEnforceOverallChatLimit(userId);
        if (modelType) {
            await checkAndEnforceModelTypeLimit(userId, modelType);
        }
        if (searchMode === 'deep') {
            await checkAndEnforceDeepResearchLimit(userId);
        }
    } else if (ip) {
        await checkAndEnforceGuestLimit(ip);
    }
}
