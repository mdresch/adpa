import { Dependency } from "../dependencyGraph"
import { pineconeService } from "../../services/pineconeService"
import { logger } from "../../utils/logger"
import { updateDependencyHealth } from "../../routes/health"

export const pineconeDependency: Dependency = {
  name: "Pinecone",
  critical: false,
  timeout: 30000, // init + validate each call describeIndexStats; allow headroom under parallel startup
  init: async () => {
    // PineconeService is a singleton that initializes in its constructor.
    // We just test the connection here.
    const startTime = Date.now()
    try {
      const success = await pineconeService.testConnection()
      const latency = Date.now() - startTime
      if (success) {
        updateDependencyHealth("Pinecone", "healthy", latency)
      } else {
        updateDependencyHealth("Pinecone", "unhealthy", latency, "Connection test failed")
      }
    } catch (err) {
      const latency = Date.now() - startTime
      updateDependencyHealth("Pinecone", "unhealthy", latency, String(err))
      throw err
    }
  },
  validate: async () => {
    const startTime = Date.now()
    try {
      const success = await pineconeService.testConnection()
      const latency = Date.now() - startTime
      if (success) {
        updateDependencyHealth("Pinecone", "healthy", latency)
        return true
      }
      updateDependencyHealth("Pinecone", "unhealthy", latency, "Validation failed")
      return false
    } catch (err) {
      updateDependencyHealth("Pinecone", "unhealthy", 0, String(err))
      return false
    }
  },
}
