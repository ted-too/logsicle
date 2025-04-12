/**
 * Base worker implementation for processing log queues
 * This contains all the shared logic between browser and Node.js environments
 */

import type {
  BatchResponse,
  ItemDroppedPayload,
  LogsicleConfig,
  ResourceData,
} from "@/types";
import { createFetchClient } from "@/shared/fetch-client";

export interface WorkerMessage {
  type: "enqueue" | "flush" | "stop" | "configure";
  payload?: any;
}

export interface QueueItem {
  id: string;
  data: ResourceData;
  retries: number;
  addedAt: number;
}

export abstract class BaseQueueWorker {
  // Map of type to queue items
  protected queue = new Map<string, QueueItem[]>();
  protected isProcessing = false;
  protected flushIntervalId: ReturnType<typeof setInterval> | null = null;
  protected config = {} as LogsicleConfig;
  protected fetch: ReturnType<typeof createFetchClient> | null = null;

  constructor() {
    this.setupMessageHandler();
    // Signal that the worker is ready
    this.sendMessage("ready");
  }

  // Abstract methods that must be implemented by platform-specific workers
  protected abstract sendMessage(type: string, payload?: any): void;
  protected abstract generatePayloadHash(payload: any): Promise<string>;
  protected abstract setupMessageHandler(): void;

  protected handleMessage(message: WorkerMessage): void {
    switch (message.type) {
      case "configure":
        this.configure(message.payload);
        break;

      case "enqueue":
        // Handle async enqueue
        this.enqueue(message.payload).catch((error) => {
          this.sendMessage("error", error);
        });
        break;

      case "flush":
        this.flush();
        break;

      case "stop":
        this.stop();
        break;
    }
  }

  protected configure(options: { config: LogsicleConfig }): void {
    // Update configuration
    this.config = options.config;

    // Initialize fetch client
    this.fetch = createFetchClient(this.config);

    // Clear any existing interval
    if (this.flushIntervalId !== null) {
      clearInterval(this.flushIntervalId);
    }

    // Set up new flush interval
    this.flushIntervalId = setInterval(() => {
      this.flush();
    }, this.config.queueOptions?.flushIntervalMs ?? 1000);
  }

  protected pushToQueue(item: QueueItem): void {
    const type = item.data.type;
    if (!this.queue.has(type)) {
      this.queue.set(type, []);
    }
    this.queue.get(type)?.push(item);
  }

  protected async enqueue(item: ResourceData): Promise<void> {
    const queueItem = {
      id: await this.generatePayloadHash(item.payload),
      data: item,
      retries: 0,
      addedAt: Date.now(),
    };

    this.pushToQueue(queueItem);
  }

  protected async flush(): Promise<void> {
    const totalItems = Array.from(this.queue.values()).reduce(
      (sum, items) => sum + items.length,
      0
    );

    if (this.isProcessing || totalItems === 0 || !this.fetch) {
      // Already processing, nothing to process, or not configured
      this.sendMessage("flushed");
      return;
    }

    this.isProcessing = true;

    try {
      // Process each type's queue in parallel
      const batchSize = this.config.queueOptions?.maxBatchSize ?? 50;
      const processingPromises: Promise<void>[] = [];

      // Process each type's queue
      for (const [type, items] of this.queue.entries()) {
        // Take items up to batch size
        const itemsToProcess = items.slice(0, batchSize);
        // Remove processed items from original array
        items.splice(0, batchSize);

        // Update the queue map with remaining items
        if (items.length === 0) {
          this.queue.delete(type);
        } else {
          this.queue.set(type, items);
        }

        // Process this type's batch
        processingPromises.push(this.processBatch(itemsToProcess));
      }

      // Wait for all batches to complete
      await Promise.all(processingPromises);

      this.sendMessage("batchProcessed");
    } catch (error) {
      this.sendMessage("error", error);
    } finally {
      this.isProcessing = false;
      this.sendMessage("flushed");
    }
  }

  protected checkNotMaxRetries(item: QueueItem): boolean {
    return item.retries <= (this.config.queueOptions?.maxRetries ?? 3);
  }

  protected handleApiError(
    items: QueueItem[],
    error: {
      message?: string | undefined;
      status: number;
      statusText: string;
    }
  ): void {
    if (this.config.debug) {
      console.error(
        "[Logsicle] Error processing batch",
        items.map((item) => item.data.payload),
        error
      );
    }

    // Handle each failed item in the batch
    for (const item of items) {
      item.retries++;

      if (error.status === 400) {
        // Bad request - drop immediately
        this.sendMessage("itemDropped", {
          type: item.data.type,
          reason: "bad-request",
          id: item.id,
        } as ItemDroppedPayload);
        continue;
      }

      if (this.checkNotMaxRetries(item)) {
        // Put back in queue for retry
        this.pushToQueue(item);
        continue;
      }

      // Max retries exceeded
      this.sendMessage("itemDropped", {
        type: item.data.type,
        reason: "max-retries",
        id: item.id,
      } as ItemDroppedPayload);
    }
  }

  protected handleBatchFailed(
    failedItems: (QueueItem & { code: number; message: string })[]
  ): void {
    if (this.config.debug) {
      console.error("[Logsicle] Error processing batch", failedItems);
    }
    for (const [index, item] of failedItems.entries()) {
      item.retries++;

      const failedItem = failedItems[index];
      if (!failedItem) continue;

      if (failedItem.code === 400) {
        this.sendMessage("itemDropped", {
          type: item.data.type,
          reason: "bad-request",
          id: item.id,
        } as ItemDroppedPayload);
        continue;
      }

      if (this.checkNotMaxRetries(item)) {
        this.pushToQueue(item);
        continue;
      }

      // Max retries exceeded
      this.sendMessage("itemDropped", {
        type: item.data.type,
        reason: "max-retries",
        id: item.id,
      } as ItemDroppedPayload);
    }
  }

  protected async processBatch(items: QueueItem[]): Promise<void> {
    if (items.length === 0 || !this.fetch) return;

    if (items.length === 1) {
      const payload = items[0].data.payload;
      const { error } = await this.fetch(`/${items[0].data.type}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (error) return this.handleApiError(items, error);

      return;
    }

    // Handle batch request
    const { data, error } = await this.fetch<BatchResponse>(
      `/${items[0].data.type}/batch`,
      {
        method: "POST",
        body: JSON.stringify({
          project_id: this.config.projectId,
          data: items.map((item) => ({
            id: item.id,
            data: item.data.payload,
          })),
        }),
      }
    );

    if (error) return this.handleApiError(items, error);

    if (data && data.failed !== null) {
      const failedItems = items
        .filter((item) => data.failed?.some((failed) => failed.id === item.id))
        .map((item) => {
          const failed = data.failed?.find((failed) => failed.id === item.id);
          if (!failed) return null;

          return {
            ...item,
            code: failed.code,
            message: failed.message,
          };
        })
        .filter((item) => item !== null);
      this.handleBatchFailed(failedItems);
    }

    return;
  }

  protected stop(): void {
    if (this.flushIntervalId !== null) {
      clearInterval(this.flushIntervalId);
      this.flushIntervalId = null;
    }

    // Final flush before stopping
    this.flush();
  }
}
