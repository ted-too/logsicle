import { BaseQueueManager, type QueueItem } from "@/utils/queue-manager-base";

export class NodeQueueManager extends BaseQueueManager {
	constructor(
		options: {
			flushIntervalMs?: number;
			maxRetries?: number;
			maxBatchSize?: number;
		} = {},
	) {
		super(options);
		this.startFlushInterval();
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

		// Make sure the interval doesn't prevent the process from exiting
		if (this.flushInterval.unref) {
			this.flushInterval.unref();
		}
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
					this.processEndpointBatch(endpoint, items),
				),
			);
		} catch (error) {
			console.error("Error processing log queue:", error);

			// Put failed items back in the queue with incremented retry count
			for (const item of batch) {
				if ((item.retries || 0) < this.maxRetries) {
					this.queue.push({
						...item,
						retries: (item.retries || 0) + 1,
					});
				} else {
					this.emit("itemDropped", item);
				}
			}
		}
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
			{} as Record<string, QueueItem[]>,
		);
	}

	/**
	 * Process a batch of items for a specific endpoint
	 */
	private async processEndpointBatch(
		endpoint: string,
		items: QueueItem[],
	): Promise<void> {
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
	}
}
