import { EventEmitter } from "node:events";

export interface QueueItem {
	endpoint: string;
	payload: any;
	timestamp: number;
	retries?: number;
}

export class BaseQueueManager extends EventEmitter {
	protected queue: QueueItem[] = [];
	protected isProcessing = false;
	protected flushInterval: any = null;
	protected maxRetries = 3;
	protected maxBatchSize = 50;
	protected flushTimeMs = 1000; // 1 second default
	protected processingPromise: Promise<void> | null = null;

	constructor(
		options: {
			flushIntervalMs?: number;
			maxRetries?: number;
			maxBatchSize?: number;
		} = {},
	) {
		super();

		this.flushTimeMs = options.flushIntervalMs || this.flushTimeMs;
		this.maxRetries = options.maxRetries || this.maxRetries;
		this.maxBatchSize = options.maxBatchSize || this.maxBatchSize;
	}

	/**
	 * Add an item to the queue
	 */
	enqueue(item: Omit<QueueItem, "timestamp" | "retries">): void {
		this.queue.push({
			...item,
			timestamp: Date.now(),
			retries: 0,
		});

		// If queue exceeds max size, trigger processing
		if (this.queue.length >= this.maxBatchSize) {
			this.triggerProcessing();
		}
	}

	/**
	 * Trigger processing of the queue
	 */
	protected triggerProcessing(): void {
		if (this.isProcessing || this.queue.length === 0) {
			return;
		}

		this.isProcessing = true;
		this.processingPromise = this.processQueue().finally(() => {
			this.isProcessing = false;
			this.processingPromise = null;
		});
	}

	/**
	 * Process the queue - to be implemented by subclasses
	 */
	protected async processQueue(): Promise<void> {
		throw new Error("Not implemented");
	}

	/**
	 * Flush the queue immediately and wait for completion
	 */
	async flush(): Promise<void> {
		// If already processing, wait for it to complete
		if (this.processingPromise) {
			await this.processingPromise;
		}

		// Process any remaining items
		if (this.queue.length > 0) {
			this.triggerProcessing();
			if (this.processingPromise) {
				await this.processingPromise;
			}
		}
	}

	/**
	 * Stop the queue manager
	 */
	stop(): void {
		if (this.flushInterval) {
			clearInterval(this.flushInterval);
			this.flushInterval = null;
		}
	}
}
