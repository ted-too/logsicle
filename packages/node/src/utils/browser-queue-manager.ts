import { BaseQueueManager, QueueItem } from "@/utils/queue-manager-base";

export class BrowserQueueManager extends BaseQueueManager {
  private visibilityChangeHandler!: () => void;
  private beforeUnloadHandler!: (event: BeforeUnloadEvent) => void;
  private useBeacon: boolean = true;

  constructor(
    options: {
      flushIntervalMs?: number;
      maxRetries?: number;
      maxBatchSize?: number;
      useBeacon?: boolean;
    } = {}
  ) {
    super(options);

    this.useBeacon = options.useBeacon !== false;
    this.startFlushInterval();
    this.setupPageLifecycleHandlers();
  }

  /**
   * Start the flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.triggerProcessing();
    }, this.flushTimeMs);
  }

  /**
   * Set up page lifecycle handlers
   */
  private setupPageLifecycleHandlers(): void {
    if (typeof document === "undefined") return;

    // Flush when page becomes hidden (user navigates away)
    this.visibilityChangeHandler = () => {
      if (document.visibilityState === "hidden") {
        this.flushSync();
      }
    };

    // Flush before page unloads
    this.beforeUnloadHandler = (_event) => {
      this.flushSync();
    };

    document.addEventListener("visibilitychange", this.visibilityChangeHandler);
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  /**
   * Process the queue
   */
  protected async processQueue(): Promise<void> {
    // Take items from the queue up to maxBatchSize
    const batch = this.queue.splice(0, this.maxBatchSize);

    if (batch.length === 0) {
      return;
    }

    try {
      // Group items by endpoint
      const endpointGroups = this.groupByEndpoint(batch);

      // Process each endpoint group
      await Promise.all(
        Object.entries(endpointGroups).map(([endpoint, items]) =>
          this.processEndpointBatch(endpoint, items)
        )
      );
    } catch (error) {
      console.error("Error processing log queue:", error);

      // Put failed items back in the queue with incremented retry count
      batch.forEach((item) => {
        if ((item.retries || 0) < this.maxRetries) {
          this.queue.push({
            ...item,
            retries: (item.retries || 0) + 1,
          });
        } else {
          this.emit("itemDropped", item);
        }
      });
    }
  }

  /**
   * Synchronously flush the queue using Navigator.sendBeacon if available
   * This is specifically for browser unload events where async operations may not complete
   */
  private flushSync(): void {
    if (this.queue.length === 0) return;

    if (this.useBeacon && navigator.sendBeacon) {
      // Group items by endpoint
      const endpointGroups = this.groupByEndpoint(this.queue);

      // Use sendBeacon for each endpoint group
      Object.entries(endpointGroups).forEach(([endpoint, items]) => {
        try {
          const baseUrl = this.getBaseUrl();
          const url = `${baseUrl}${endpoint}`;

          // For single item endpoints
          if (
            endpoint === "/v1/ingest/app" ||
            endpoint === "/v1/ingest/event"
          ) {
            items.forEach((item) => {
              navigator.sendBeacon(url, JSON.stringify(item.payload));
            });
          }
          // For batch endpoints
          else if (endpoint === "/v1/ingest/batch") {
            navigator.sendBeacon(
              `${baseUrl}/v1/ingest/batch`,
              JSON.stringify({ items: items.map((item) => item.payload) })
            );
          }
        } catch (e) {
          console.error("Error sending beacon:", e);
        }
      });

      // Clear the queue
      this.queue = [];
    }
  }

  /**
   * Get the base URL from the client
   */
  private getBaseUrl(): string {
    // This will be set by the client
    return this.emit("getBaseUrl") as unknown as string;
  }

  /**
   * Group items by endpoint
   */
  private groupByEndpoint(items: QueueItem[]): Record<string, QueueItem[]> {
    return items.reduce(
      (groups, item) => {
        const { endpoint } = item;
        if (!groups[endpoint]) {
          groups[endpoint] = [];
        }
        groups[endpoint].push(item);
        return groups;
      },
      {} as Record<string, QueueItem[]>
    );
  }

  /**
   * Process a batch of items for a specific endpoint
   */
  private async processEndpointBatch(
    endpoint: string,
    items: QueueItem[]
  ): Promise<void> {
    try {
      // Emit event for processing
      this.emit("processBatch", endpoint, items);

      // Wait for the processing to complete
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Batch processing timeout"));
        }, 10000); // 10 second timeout

        this.once("batchProcessed", (processedEndpoint: string) => {
          if (processedEndpoint === endpoint) {
            clearTimeout(timeout);
            resolve();
          }
        });

        this.once("batchFailed", (failedEndpoint: string, error: Error) => {
          if (failedEndpoint === endpoint) {
            clearTimeout(timeout);
            reject(error);
          }
        });
      });
    } catch (error) {
      // Re-throw to be handled by the caller
      throw error;
    }
  }

  /**
   * Stop the queue manager and remove event listeners
   */
  stop(): void {
    super.stop();

    if (typeof document !== "undefined") {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeHandler
      );
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
    }
  }
}
