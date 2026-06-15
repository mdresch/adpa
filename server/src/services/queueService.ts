import { shouldRunWorkers } from "../utils/processRole";
import { logger } from "../utils/logger";

// Re-export all client properties and functions
export * from "./queue/queueClient";

// If the current process role enables workers, dynamically import and register handlers.
if (shouldRunWorkers()) {
  logger.info("[QUEUE] Process role allows workers. Registering queue consumers...");
  import("./queue/registerWorkers")
    .then(({ registerWorkers }) => {
      return registerWorkers();
    })
    .catch((err) => {
      logger.error(err, "[QUEUE] Failed to register worker consumers on file load");
    });
} else {
  logger.info("[QUEUE] Process role skips background worker consumer registrations on this instance.");
}
