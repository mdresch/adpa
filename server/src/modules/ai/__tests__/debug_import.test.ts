
import { jest } from '@jest/globals'

// Mock dependencies BEFORE import
jest.mock('openai')
jest.mock('@ai-sdk/openai', () => ({
    createOpenAI: jest.fn()
}))
jest.mock('ai', () => ({
    generateText: jest.fn()
}))
jest.mock('../../database/connection')
jest.mock('../../utils/logger')

describe('Debug Import', () => {
    it('should import openai connector without crashing', async () => {
        const { openaiConnector } = await import('../openai');
        expect(openaiConnector).toBeDefined();
    });
});
