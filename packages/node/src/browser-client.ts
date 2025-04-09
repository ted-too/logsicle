import { LogsicleClient as BaseClient } from "@/client";
import type { LogsicleConfig } from "@/types";
import { BrowserQueueManager } from "@/utils/browser-queue-manager";
import type { QueueItem } from "@/utils/queue-manager-base";

export class BrowserLogsicleClient extends BaseClient {
	protected queueManager: BrowserQueueManager;

	constructor(config: LogsicleConfig) {
		super(config);

		// Initialize queue manager with config options
		this.queueManager = new BrowserQueueManager({
			flushIntervalMs: config.queueOptions?.flushIntervalMs,
			maxRetries: config.queueOptions?.maxRetries,
			maxBatchSize: config.queueOptions?.maxBatchSize,
			useBeacon: config.browserOptions?.useBeacon,
		});

		// Set up queue processing
		this.queueManager.on("processBatch", this.handleProcessBatch.bind(this));

		// Provide base URL to queue manager for beacon API
		this.queueManager.on("getBaseUrl", () => this.getBaseUrl());

		// Optional: Log dropped items
		this.queueManager.on("itemDropped", (item: QueueItem) => {
			if (config.debug) {
				console.warn("Logsicle: Dropped log item after max retries:", item);
			}
		});
	}

	/**
	 * Handle processing a batch of items
	 */
	private async handleProcessBatch(
		endpoint: string,
		items: QueueItem[],
	): Promise<void> {
		try {
			// For single item endpoints, send items one by one
			if (endpoint === "/v1/ingest/app" || endpoint === "/v1/ingest/event") {
				await Promise.all(
					items.map((item) => this.sendSingleItem(endpoint, item.payload)),
				);
			}
			// For batch endpoints, send all items in one request
			else if (endpoint === "/v1/ingest/batch") {
				await this.sendBatchItems(items.map((item) => item.payload));
			}

			this.queueManager.emit("batchProcessed", endpoint);
		} catch (error) {
			this.queueManager.emit("batchFailed", endpoint, error);
			throw error;
		}
	}

	/**
	 * Queue an item to be sent to the API
	 */
	async sendToApi(endpoint: string, data: any): Promise<void> {
		this.queueManager.enqueue({
			endpoint,
			payload: data,
		});
	}

	/**
	 * Flush the queue and wait for all pending logs to be sent
	 */
	async flush(): Promise<void> {
		return this.queueManager.flush();
	}

	/**
	 * Shutdown the client, flushing any pending logs
	 */
	async shutdown(): Promise<void> {
		await this.flush();
		this.queueManager.stop();
	}
}
