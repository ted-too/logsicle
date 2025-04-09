import { LogsicleClient as BaseClient } from "@/client";
import type { LogsicleConfig } from "@/types";
import { NodeQueueManager } from "@/utils/node-queue-manager";
import { registerClient, unregisterClient } from "@/utils/node-shutdown";
import type { QueueItem } from "@/utils/queue-manager-base";

export class NodeLogsicleClient extends BaseClient {
	protected queueManager: NodeQueueManager;

	constructor(config: LogsicleConfig) {
		super(config);

		// Initialize queue manager with config options
		this.queueManager = new NodeQueueManager({
			flushIntervalMs: config.queueOptions?.flushIntervalMs,
			maxRetries: config.queueOptions?.maxRetries,
			maxBatchSize: config.queueOptions?.maxBatchSize,
		});

		// Set up queue processing
		this.queueManager.on("processBatch", this.handleProcessBatch.bind(this));

		// Optional: Log dropped items
		this.queueManager.on("itemDropped", (item: QueueItem) => {
			if (config.debug) {
				console.warn("Logsicle: Dropped log item after max retries:", item);
			}
		});

		// Register for graceful shutdown
		registerClient(this);
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
	 * Shutdown the client, flushing any pending logs and unregistering from shutdown manager
	 */
	async shutdown(): Promise<void> {
		await this.flush();
		this.queueManager.stop();
		unregisterClient(this);
	}
}
