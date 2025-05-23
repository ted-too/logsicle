import { EventEmitter } from "node:events";
import { Worker } from "node:worker_threads";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { LogsicleConfig, ResourceData } from "@/types";

// Interface for messages sent to the worker
interface WorkerMessage {
  type: "enqueue" | "flush" | "stop" | "configure";
  payload?: any;
}

// Interface for messages received from the worker
interface WorkerResponse {
  type: "ready" | "flushed" | "error" | "itemDropped" | "batchProcessed";
  payload?: any;
}

interface NodeQueueManagerOptions {
  config: LogsicleConfig;
  workerUrl: string;
}

export class NodeQueueManager extends EventEmitter {
  private worker: Worker | null = null;
  private isInitialized = false;
  private pendingFlushResolvers: Array<() => void> = [];
  private config: LogsicleConfig;
  private workerUrl: string;

  constructor(options: NodeQueueManagerOptions) {
    super();

    this.config = options.config;
    this.workerUrl = options.workerUrl;

    this.initializeWorker();
  }

  private initializeWorker(): void {
    try {
      // Get the absolute path to the worker file
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const workerPath = join(__dirname, this.workerUrl);

      this.worker = new Worker(workerPath);

      this.worker.on("message", (response: WorkerResponse) => {
        switch (response.type) {
          case "ready":
            this.isInitialized = true;
            this.configureWorker();
            break;

          case "flushed":
            // Resolve any pending flush promises
            for (const resolve of this.pendingFlushResolvers) {
              resolve();
            }
            this.pendingFlushResolvers = [];
            break;

          case "error":
            this.emit("error", response.payload);
            break;

          case "itemDropped":
            this.emit("itemDropped", response.payload);
            break;

          case "batchProcessed":
            this.emit("batchProcessed", response.payload);
            break;
        }
      });

      this.worker.on("error", (error) => {
        console.error("[Logsicle] Worker thread error:", error);
        this.emit("error", error);
      });
    } catch (error) {
      console.error("[Logsicle] Failed to initialize worker thread:", error);
    }
  }

  private configureWorker(): void {
    if (!this.worker || !this.isInitialized) return;

    this.worker.postMessage({
      type: "configure",
      payload: {
        config: this.config,
      },
    } as WorkerMessage);
  }

  /**
   * Add an item to the queue
   */
  enqueue(item: ResourceData): void {
    if (!this.worker || !this.isInitialized) {
      // If worker isn't ready, try to initialize it again
      if (!this.worker) {
        this.initializeWorker();
      }

      if (this.config.debug) {
        console.warn(
          "[Logsicle] Worker is not initialized. Item could not be enqueued."
        );
      }
      return;
    }

    this.worker.postMessage({
      type: "enqueue",
      payload: item,
    } as WorkerMessage);
  }

  /**
   * Flush the queue and wait for completion
   */
  async flush(): Promise<void> {
    if (!this.worker || !this.isInitialized) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.pendingFlushResolvers.push(resolve);

      this.worker?.postMessage({
        type: "flush",
      } as WorkerMessage);
    });
  }

  /**
   * Stop the worker
   */
  stop(): void {
    if (!this.worker) return;

    this.worker.postMessage({
      type: "stop",
    } as WorkerMessage);

    // Terminate the worker
    this.worker.terminate();
    this.worker = null;
    this.isInitialized = false;
  }
}
