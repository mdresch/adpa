import { Dependency } from "../dependencyGraph"
import { pineconeService } from "../../services/pineconeService"
import { logger } from "../../utils/logger"

export const pineconeDependency: Dependency = {
  name: "Pinecone",
  critical: false,
  timeout: 10000,
  init: async () => {
    // PineconeService is a singleton that initializes in its constructor.
    // We just test the connection here.
    const success = await pineconeService.testConnection()
    if (!success) {
      logger.warn("Pinecone connection test failed during initialization")
    }
  },
  validate: async () => {
    return await pineconeService.testConnection()
  },
}
