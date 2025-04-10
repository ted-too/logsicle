import type { ItemDroppedPayload, LogsicleConfig, ResourceData } from "@/types";
import { NodeQueueManager } from "./queue-manager";

export class NodeLogsicleClient {
	protected queueManager: NodeQueueManager;
	protected config: LogsicleConfig;

	constructor(config: LogsicleConfig) {
		this.config = config;

		this.queueManager = new NodeQueueManager({
			config,
			workerUrl: "./server-worker.js",
		});

		this.queueManager.on("error", (error) => {
			if (config.debug) {
				console.error("Logsicle queue error:", error);
			}
		});

		this.queueManager.on("batchProcessed", () => {
			if (config.debug) {
				console.debug("Logsicle batch processed successfully");
			}
		});

		this.queueManager.on(
			"itemDropped",
			({ type, reason }: ItemDroppedPayload) => {
				const realReason = reason ?? "max-retries";
				if (config.debug) {
					console.warn(
						`Logsicle: Dropped ${type} log item due to ${realReason.replace("-", " ")}`,
					);
				}
			},
		);
	}

	/**
	 * Add an item to the queue
	 */
	enqueue(data: ResourceData): void {
		this.queueManager.enqueue(data);
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

	/**
	 * Get the config
	 */
	getConfig(): LogsicleConfig {
		return this.config;
	}
}
