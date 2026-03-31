import { exec } from 'child_process'
import { promisify } from 'util'
import { logger } from '../utils/logger'
import { foundryLocalConnector } from '../modules/ai/foundry-local'

const execPromise = promisify(exec)

export interface LocalAIServiceConfig {
  autoStart: boolean
  ollamaModels: string[]
  foundryModels: string[]
  foundryEndpoint: string
  ollamaEndpoint: string
}

class LocalAIService {
  private config: LocalAIServiceConfig = {
    autoStart: process.env.LOCAL_AI_AUTO_START === 'true',
    ollamaModels: (process.env.OLLAMA_BOOTSTRAP_MODELS || '').split(',').filter(m => !!m),
    foundryModels: (process.env.FOUNDRY_BOOTSTRAP_MODELS || '').split(',').filter(m => !!m),
    foundryEndpoint: process.env.FOUNDRY_LOCAL_ENDPOINT || 'http://localhost:8080',
    ollamaEndpoint: process.env.OLLAMA_ENDPOINT || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434'
  }

  /**
   * Bootstrap local AI services during server startup
   */
  async bootstrap(): Promise<void> {
    if (!this.config.autoStart) {
      logger.info('⏭️  Local AI auto-start is disabled, skipping bootstrap')
      return
    }

    logger.info('🚀 Bootstrapping local AI providers...')

    try {
      await Promise.all([
        this.ensureOllamaService(),
        this.ensureFoundryService()
      ])
      logger.info('✅ Local AI providers bootstrap completed')
    } catch (error) {
      logger.warn('⚠️  Local AI bootstrap encountered errors (continuing anyway):', error)
    }
  }

  /**
   * Ensure Ollama is running and models are loaded
   */
  private async ensureOllamaService(): Promise<void> {
    try {
      // Check if Ollama is responsive
      const response = await fetch(`${this.config.ollamaEndpoint}/api/tags`).catch(() => null)
      
      if (!response || !response.ok) {
        logger.info('⏳ Ollama service not responding, attempting to start...')
        // On Windows, Ollama usually runs as a background tray app, but we can try to trigger it
        exec('ollama serve', (err) => {
          if (err && !err.message.includes('address already in use')) {
            logger.warn('Failed to start Ollama server:', err.message)
          }
        })
        // Wait a bit for it to spin up
        await new Promise(resolve => setTimeout(resolve, 3000))
      }

      // Ensure models are "loaded" (pulled)
      for (const model of this.config.ollamaModels) {
        logger.info(`📦 Ensuring Ollama model loaded: ${model}`)
        exec(`ollama run ${model} ""`, (err) => {
          if (err) logger.warn(`Failed to load Ollama model ${model}:`, err.message)
        })
      }
    } catch (error) {
      logger.warn('Error during Ollama bootstrap:', error)
    }
  }

  /**
   * Ensure Foundry Local is running and models are loaded
   */
  private async ensureFoundryService(): Promise<void> {
    try {
      // Check if Foundry is responsive
      const status = await foundryLocalConnector.checkStatus({ baseURL: this.config.foundryEndpoint })
      
      if (!status.available) {
        logger.info('⏳ Foundry Local service not responding, attempting to start...')
        // foundry model run starts the REST server for that model
        if (this.config.foundryModels.length > 0) {
          const mainModel = this.config.foundryModels[0]
          logger.info(`🚀 Starting Foundry Local with model: ${mainModel}`)
          
          // Use spawn-like behavior via exec without waiting for completion
          exec(`foundry model run ${mainModel}`, (err) => {
            if (err) logger.warn(`Foundry Local process exited:`, err.message)
          })
          
          // Wait for service to become available
          let attempts = 0
          while (attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 2000))
            const check = await foundryLocalConnector.checkStatus({ baseURL: this.config.foundryEndpoint })
            if (check.available) {
              logger.info('✅ Foundry Local service is now online')
              break
            }
            attempts++
          }
        } else {
          logger.warn('⚠️  No Foundry models configured to run on startup')
        }
      } else {
        logger.info('✅ Foundry Local service already running')
      }
    } catch (error) {
      logger.warn('Error during Foundry bootstrap:', error)
    }
  }
}

export const localAIService = new LocalAIService()
