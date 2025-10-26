/**
 * Tests for Azure AI Foundry validation utilities
 */

import {
  validateAzureEndpoint,
  validateAzureDeployment,
  validateAzureApiVersion,
  validateAzureTenantId,
  validateAzureClientId,
  validateAzureApiKey,
  validateAzureClientSecret,
  validateAzureModelName,
  validateAzureConfig
} from '../lib/azure-validation'

describe('Azure Validation Utilities', () => {
  describe('validateAzureEndpoint', () => {
    it('should validate correct Azure endpoints', () => {
      const validEndpoints = [
        'https://my-resource.cognitiveservices.azure.com',
        'https://my-resource.cognitiveservices.azure.com/',
        'https://my-resource.openai.azure.com',
        'https://my-resource.cognitiveservices.azure.us',
        'https://my-resource.cognitiveservices.azure.cn'
      ]

      validEndpoints.forEach(endpoint => {
        const result = validateAzureEndpoint(endpoint)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid Azure endpoints', () => {
      const invalidEndpoints = [
        '',
        'not-a-url',
        'http://my-resource.cognitiveservices.azure.com', // HTTP instead of HTTPS
        'https://my-resource.invalid-domain.com',
        'https://my-resource.cognitiveservices.azure.com/invalid-path'
      ]

      invalidEndpoints.forEach(endpoint => {
        const result = validateAzureEndpoint(endpoint)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureDeployment', () => {
    it('should validate correct deployment names', () => {
      const validDeployments = [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'text-davinci-003',
        'code-davinci-002',
        'embedding-ada-002',
        'dall-e-2'
      ]

      validDeployments.forEach(deployment => {
        const result = validateAzureDeployment(deployment)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid deployment names', () => {
      const invalidDeployments = [
        '',
        'a', // Too short
        'gpt-4-', // Ends with hyphen
        '-gpt-4', // Starts with hyphen
        'gpt 4', // Contains space
        'gpt-4-with-very-long-name-that-exceeds-the-maximum-length-limit-for-azure-deployment-names'
      ]

      invalidDeployments.forEach(deployment => {
        const result = validateAzureDeployment(deployment)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureApiVersion', () => {
    it('should validate correct API versions', () => {
      const validVersions = [
        '2024-12-01-preview',
        '2024-10-01-preview',
        '2024-06-01',
        '2024-02-15-preview'
      ]

      validVersions.forEach(version => {
        const result = validateAzureApiVersion(version)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid API versions', () => {
      const invalidVersions = [
        '',
        'invalid-version',
        '2024-13-01', // Invalid month
        '2023-01-01' // Too old
      ]

      invalidVersions.forEach(version => {
        const result = validateAzureApiVersion(version)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureTenantId', () => {
    it('should validate correct tenant IDs', () => {
      const validTenantIds = [
        '12345678-1234-1234-1234-123456789012',
        '87654321-4321-4321-4321-210987654321',
        '' // Optional field
      ]

      validTenantIds.forEach(tenantId => {
        const result = validateAzureTenantId(tenantId)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid tenant IDs', () => {
      const invalidTenantIds = [
        'invalid-guid',
        '12345678-1234-1234-1234', // Incomplete GUID
        '12345678-1234-1234-1234-123456789012-extra'
      ]

      invalidTenantIds.forEach(tenantId => {
        const result = validateAzureTenantId(tenantId)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureClientId', () => {
    it('should validate correct client IDs', () => {
      const validClientIds = [
        '12345678-1234-1234-1234-123456789012',
        '87654321-4321-4321-4321-210987654321',
        '' // Optional field
      ]

      validClientIds.forEach(clientId => {
        const result = validateAzureClientId(clientId)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid client IDs', () => {
      const invalidClientIds = [
        'invalid-guid',
        '12345678-1234-1234-1234', // Incomplete GUID
        '12345678-1234-1234-1234-123456789012-extra'
      ]

      invalidClientIds.forEach(clientId => {
        const result = validateAzureClientId(clientId)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureApiKey', () => {
    it('should validate correct API keys', () => {
      const validApiKeys = [
        'abcdefghijklmnopqrstuvwxyz123456', // 32 chars
        'a'.repeat(64), // 64 chars
        'ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890+/=' // With special chars
      ]

      validApiKeys.forEach(apiKey => {
        const result = validateAzureApiKey(apiKey)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid API keys', () => {
      const invalidApiKeys = [
        '', // Empty
        'short', // Too short
        'a'.repeat(100), // Too long
        'key with spaces', // Contains spaces
        'key@with#invalid$chars' // Invalid special chars
      ]

      invalidApiKeys.forEach(apiKey => {
        const result = validateAzureApiKey(apiKey)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureClientSecret', () => {
    it('should validate correct client secrets', () => {
      const validSecrets = [
        'a'.repeat(16), // Minimum length
        'a'.repeat(32), // Typical length
        'a'.repeat(100), // Longer secret
        '' // Optional field
      ]

      validSecrets.forEach(secret => {
        const result = validateAzureClientSecret(secret)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid client secrets', () => {
      const invalidSecrets = [
        'short' // Too short
      ]

      invalidSecrets.forEach(secret => {
        const result = validateAzureClientSecret(secret)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureModelName', () => {
    it('should validate correct model names', () => {
      const validModels = [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'text-davinci-003',
        'code-davinci-002',
        'embedding-ada-002',
        'dall-e-2',
        'whisper-1',
        '' // Optional field
      ]

      validModels.forEach(model => {
        const result = validateAzureModelName(model)
        expect(result.isValid).toBe(true)
        expect(result.error).toBeUndefined()
      })
    })

    it('should reject invalid model names', () => {
      const invalidModels = [
        'invalid-model-name',
        'gpt4', // Missing hyphen
        'gpt-4-invalid-format'
      ]

      invalidModels.forEach(model => {
        const result = validateAzureModelName(model)
        expect(result.isValid).toBe(false)
        expect(result.error).toBeDefined()
      })
    })
  })

  describe('validateAzureConfig', () => {
    it('should validate complete API key configuration', () => {
      const config = {
        endpoint: 'https://my-resource.cognitiveservices.azure.com',
        deployment: 'gpt-4',
        apiVersion: '2024-12-01-preview',
        apiKey: 'abcdefghijklmnopqrstuvwxyz123456',
        useApiKey: true,
        useManagedIdentity: false
      }

      const result = validateAzureConfig(config)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate complete managed identity configuration', () => {
      const config = {
        endpoint: 'https://my-resource.cognitiveservices.azure.com',
        deployment: 'gpt-4',
        apiVersion: '2024-12-01-preview',
        tenantId: '12345678-1234-1234-1234-123456789012',
        clientId: '87654321-4321-4321-4321-210987654321',
        useApiKey: false,
        useManagedIdentity: true
      }

      const result = validateAzureConfig(config)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject configuration with both auth methods', () => {
      const config = {
        endpoint: 'https://my-resource.cognitiveservices.azure.com',
        deployment: 'gpt-4',
        useApiKey: true,
        useManagedIdentity: true
      }

      const result = validateAzureConfig(config)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Cannot use both managed identity and API key authentication simultaneously')
    })

    it('should reject configuration with no auth method', () => {
      const config = {
        endpoint: 'https://my-resource.cognitiveservices.azure.com',
        deployment: 'gpt-4',
        useApiKey: false,
        useManagedIdentity: false
      }

      const result = validateAzureConfig(config)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Must select either managed identity or API key authentication')
    })

    it('should reject API key auth without API key', () => {
      const config = {
        endpoint: 'https://my-resource.cognitiveservices.azure.com',
        deployment: 'gpt-4',
        useApiKey: true,
        useManagedIdentity: false
        // No apiKey provided
      }

      const result = validateAzureConfig(config)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('API key is required when using API key authentication')
    })

    it('should provide warnings for mismatched model and deployment names', () => {
      const config = {
        endpoint: 'https://my-resource.cognitiveservices.azure.com',
        deployment: 'gpt-4',
        modelName: 'gpt-3.5-turbo',
        apiKey: 'abcdefghijklmnopqrstuvwxyz123456',
        useApiKey: true,
        useManagedIdentity: false
      }

      const result = validateAzureConfig(config)
      expect(result.isValid).toBe(true)
      expect(result.warnings).toContain('Model name and deployment name should typically match for Azure OpenAI')
    })
  })
})
