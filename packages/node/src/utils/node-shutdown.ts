import { LogsicleClient } from "@/client";

let isShuttingDown = false;
const clients: LogsicleClient[] = [];

/**
 * Register a client for graceful shutdown
 */
export function registerClient(client: LogsicleClient): void {
  clients.push(client);
}

/**
 * Unregister a client
 */
export function unregisterClient(client: LogsicleClient): void {
  const index = clients.indexOf(client);
  if (index !== -1) {
    clients.splice(index, 1);
  }
}

/**
 * Flush all registered clients
 */
async function flushAll(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  try {
    await Promise.all(clients.map((client) => client.flush()));
  } catch (error) {
    console.error("Error flushing Logsicle clients:", error);
  }
}

// Register shutdown handlers for Node.js
process.on("exit", () => {
  // On exit, we can only run synchronous code, so we can't properly flush
  // This is why we need the other handlers below
  if (!isShuttingDown) {
    console.warn(
      "Logsicle: Process exiting without proper shutdown. Some logs may be lost."
    );
  }
});

// Handle SIGINT (Ctrl+C)
process.on("SIGINT", async () => {
  console.log("Logsicle: Gracefully shutting down...");
  await flushAll();
  process.exit(0);
});

// Handle SIGTERM (kill)
process.on("SIGTERM", async () => {
  console.log("Logsicle: Gracefully shutting down...");
  await flushAll();
  process.exit(0);
});

// Handle uncaught exceptions
process.on("uncaughtException", async (error) => {
  console.error("Logsicle: Uncaught exception, shutting down...", error);
  await flushAll();
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", async (reason) => {
  console.error("Logsicle: Unhandled rejection, shutting down...", reason);
  await flushAll();
  process.exit(1);
});

/**
 * Manually flush all clients and shutdown
 * Useful for programmatic shutdown or in environments where process signals aren't available
 */
export async function shutdownAll(): Promise<void> {
  await flushAll();
}

/**
 * Install a handler for graceful shutdown in Express/Connect applications
 */
export function installExpressShutdownHandler(server: any): void {
  if (!server || typeof server.close !== "function") {
    throw new Error(
      "Invalid server instance provided to installExpressShutdownHandler"
    );
  }

  const originalClose = server.close.bind(server);

  server.close = async function (callback?: (err?: Error) => void) {
    try {
      // Flush all logs before closing the server
      await flushAll();

      // Call the original close method
      originalClose((err?: Error) => {
        if (callback) {
          callback(err);
        }
      });
    } catch (error) {
      console.error("Error during server shutdown:", error);
      if (callback) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    }
  };
}

/**
 * Install a handler for graceful shutdown in HTTP/HTTPS server
 */
export function installHttpShutdownHandler(server: any): void {
  if (!server || typeof server.close !== "function") {
    throw new Error(
      "Invalid server instance provided to installHttpShutdownHandler"
    );
  }

  const originalClose = server.close.bind(server);

  server.close = function (callback?: (err?: Error) => void) {
    // Flush all logs before closing the server
    flushAll()
      .then(() => {
        // Call the original close method
        originalClose(callback);
      })
      .catch((error) => {
        console.error("Error during server shutdown:", error);
        if (callback) {
          callback(error instanceof Error ? error : new Error(String(error)));
        } else {
          originalClose();
        }
      });
  };
}
